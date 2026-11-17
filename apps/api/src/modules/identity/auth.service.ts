import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { SecurityEngine } from '@accounting/core';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService
  ) {}

  private async logSecurityEvent(
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
        ipAddress || '127.0.0.1',
        userAgent || 'Antigravity Client',
        status,
        details ? JSON.stringify(details) : null,
        now,
      ],
    );
  }

  async login(
    mobile: string,
    password: string,
    tenantId?: string,
    twoFactorCode?: string,
    clientIp?: string,
    userAgent?: string,
  ) {
    if (!mobile || !password) {
      throw new BadRequestException('شماره موبایل و کلمه عبور الزامی است.');
    }

    let user: any = null;
    if (tenantId && tenantId !== 'tenant-pishro') {
      user = await this.db.queryOne(
        'SELECT * FROM users WHERE mobile = ? AND tenant_id = ?',
        [mobile.trim(), tenantId]
      );
    } else {
      // جستجوی چندتنانتی: در صورت وجود کاربر با موبایل یکسان در چند تنانت، تطبیق با کلمه عبور
      const candidates = await this.db.query(
        'SELECT * FROM users WHERE mobile = ? ORDER BY created_at DESC',
        [mobile.trim()]
      );
      if (candidates.length === 1) {
        user = candidates[0];
      } else if (candidates.length > 1) {
        for (const cand of candidates) {
          if (await bcrypt.compare(password, cand.password_hash)) {
            user = cand;
            break;
          }
        }
        if (!user) user = candidates[0];
      }
    }

    if (!user) {
      throw new UnauthorizedException('شماره موبایل یا کلمه عبور اشتباه است.');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('حساب کاربری شما غیرفعال شده است.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await this.logSecurityEvent(
        user.tenant_id,
        user.id,
        'FAILED_LOGIN',
        clientIp || '127.0.0.1',
        userAgent || 'Unknown',
        'FAILED',
        { reason: 'Wrong password' }
      );
      throw new UnauthorizedException('شماره موبایل یا کلمه عبور اشتباه است.');
    }

    // بررسی فعال بودن تایید دومرحله‌ای (2FA)
    const secSettings = await this.db.queryOne<any>(
      'SELECT two_factor_enabled, two_factor_secret, backup_codes_json FROM user_security_settings WHERE user_id = ?',
      [user.id]
    );

    if (secSettings && Boolean(secSettings.two_factor_enabled)) {
      if (!twoFactorCode) {
        return {
          requiresTwoFactor: true,
          userId: user.id,
          message: 'کد تایید دو مرحله‌ای (TOTP یا کد پشتیبان) الزامی است.'
        };
      }

      let isValid2FA = SecurityEngine.verifyTotpCode(secSettings.two_factor_secret, twoFactorCode.trim(), 1);
      if (!isValid2FA && secSettings.backup_codes_json) {
        try {
          const backupHashes: string[] = JSON.parse(secSettings.backup_codes_json);
          const inputHash = crypto.createHash('sha256').update(twoFactorCode.trim().toUpperCase()).digest('hex');
          const idx = backupHashes.indexOf(inputHash);
          if (idx !== -1) {
            isValid2FA = true;
            backupHashes.splice(idx, 1);
            await this.db.run(
              'UPDATE user_security_settings SET backup_codes_json = ? WHERE user_id = ?',
              [JSON.stringify(backupHashes), user.id]
            );
          }
        } catch {}
      }

      if (!isValid2FA) {
        await this.logSecurityEvent(
          user.tenant_id,
          user.id,
          'FAILED_2FA',
          clientIp || '127.0.0.1',
          userAgent || 'Unknown',
          'FAILED',
          { reason: 'Invalid or expired 2FA code' }
        );
        throw new UnauthorizedException('کد تایید دو مرحله‌ای وارد شده نامعتبر یا منقضی است.');
      }
    }

    // ثبت لاگ ورود موفق
    await this.logSecurityEvent(
      user.tenant_id,
      user.id,
      'LOGIN',
      clientIp || '127.0.0.1',
      userAgent || 'Unknown',
      'SUCCESS'
    );

    const roles = await this.db.query(
      `SELECT r.code, r.title FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [user.id]
    );

    // واکشی شرکت، شعبه پیش‌فرض و سال مالی فعال کاربر
    const company = await this.db.queryOne<any>(
      'SELECT id, legal_name, trade_name FROM companies WHERE tenant_id = ? ORDER BY created_at ASC LIMIT 1',
      [user.tenant_id]
    );
    const companyId = company?.id || null;
    const companyName = company?.legal_name || company?.trade_name || null;

    let branchId: string | null = null;
    if (companyId) {
      const branch = await this.db.queryOne<any>(
        'SELECT id FROM branches WHERE tenant_id = ? AND company_id = ? ORDER BY is_central DESC, created_at ASC LIMIT 1',
        [user.tenant_id, companyId]
      );
      branchId = branch?.id || null;
    }

    let fiscalYearId: string | null = null;
    if (companyId) {
      const fy = await this.db.queryOne<any>(
        'SELECT id FROM fiscal_years WHERE tenant_id = ? AND company_id = ? AND is_closed = false ORDER BY start_date_shamsi DESC LIMIT 1',
        [user.tenant_id, companyId]
      );
      fiscalYearId = fy?.id || null;
    }

    const payload = {
      sub: user.id,
      tenantId: user.tenant_id,
      companyId,
      branchId,
      fiscalYearId,
      mobile: user.mobile,
      isSuperAdmin: Boolean(user.is_super_admin)
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        companyId,
        companyName,
        branchId,
        fiscalYearId,
        mobile: user.mobile,
        email: user.email,
        fullName: user.full_name,
        isSuperAdmin: Boolean(user.is_super_admin),
        roles: roles.map((r: any) => r.code)
      }
    };
  }

  async getProfile(userId: string, tenantId: string) {
    const user = await this.db.queryOne(
      'SELECT id, tenant_id, mobile, email, full_name, is_super_admin, is_active, created_at FROM users WHERE id = ? AND tenant_id = ?',
      [userId, tenantId]
    );
    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد.');
    }

    const roles = await this.db.query(
      `SELECT r.code, r.title FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [user.id]
    );

    return {
      ...user,
      isSuperAdmin: Boolean(user.is_super_admin),
      roles: roles.map((r: any) => r.code)
    };
  }
}
