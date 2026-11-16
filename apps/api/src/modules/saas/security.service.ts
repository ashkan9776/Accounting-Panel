import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { SecurityEngine, TwoFactorSetupResponse } from '@accounting/core';

@Injectable()
export class SecurityService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * آماده‌سازی و راه‌اندازی اولیه تایید دومرحله‌ای (2FA)
   */
  async setupTwoFactor(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.db.queryOne<any>(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

    const secret = SecurityEngine.generateBase32Secret(20);
    const otpAuthUrl = SecurityEngine.generateOtpAuthUrl('IranAccountingSaaS', user.mobile, secret);
    const { plainCodes, hashedCodes } = SecurityEngine.generateBackupCodes(8);

    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO user_security_settings (
        id, user_id, two_factor_enabled, two_factor_secret, backup_codes_json, updated_at
      ) VALUES (?, ?, false, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        two_factor_secret = excluded.two_factor_secret,
        backup_codes_json = excluded.backup_codes_json,
        updated_at = excluded.updated_at`,
      [`sec-${userId}`, userId, secret, JSON.stringify(hashedCodes), now],
    );

    return {
      secret,
      otpAuthUrl,
      backupCodes: plainCodes,
    };
  }

  /**
   * تایید کد ۶ رقمی و فعال‌سازی قطعی 2FA
   */
  async verifyAndEnableTwoFactor(userId: string, token: string) {
    const settings = await this.db.queryOne<any>(`SELECT * FROM user_security_settings WHERE user_id = ?`, [userId]);
    if (!settings || !settings.two_factor_secret) {
      throw new BadRequestException('مراحل راه‌اندازی تایید دومرحله‌ای برای این کاربر آغاز نشده است.');
    }

    const isValid = SecurityEngine.verifyTotpCode(settings.two_factor_secret, token, 1);
    if (!isValid) {
      throw new BadRequestException('کد تایید ۶ رقمی وارد شده نامعتبر یا منقضی شده است.');
    }

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE user_security_settings SET two_factor_enabled = true, updated_at = ? WHERE user_id = ?`,
      [now, userId],
    );

    // ثبت لاگ امنیتی
    const user = await this.db.queryOne<any>(`SELECT tenant_id FROM users WHERE id = ?`, [userId]);
    if (user) {
      await this.logSecurityEvent(
        user.tenant_id,
        userId,
        '2FA_ENABLED',
        '127.0.0.1',
        'Antigravity Client',
        'SUCCESS',
        { method: 'TOTP_RFC6238' },
      );
    }

    return {
      success: true,
      message: 'تایید دومرحله‌ای با موفقیت فعال شد.',
    };
  }

  /**
   * ثبت لاگ وقایع امنیتی در پایگاه‌داده
   */
  async logSecurityEvent(
    tenantId: string,
    userId: string,
    actionType: string,
    ipAddress: string,
    userAgent: string,
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED',
    details?: Record<string, any>,
  ) {
    const logId = randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO security_audit_logs (
        id, organization_id, user_id, action_type, ip_address, user_agent, status, details_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        tenantId,
        userId,
        actionType,
        ipAddress,
        userAgent,
        status,
        details ? JSON.stringify(details) : null,
        now,
      ],
    );

    return { logId, status };
  }

  /**
   * استعلام لاگ‌های امنیتی سازمان جهت ممیزی و بازرسی
   */
  async getSecurityAuditLogs(tenantId: string, limit = 50) {
    return this.db.query<any>(
      `SELECT s.*, u.full_name, u.mobile
       FROM security_audit_logs s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.organization_id = ?
       ORDER BY s.created_at DESC LIMIT ?`,
      [tenantId, limit],
    );
  }
}
