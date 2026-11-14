import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService
  ) {}

  async login(mobile: string, password: string, tenantId: string = 'tenant-pishro') {
    if (!mobile || !password) {
      throw new BadRequestException('شماره موبایل و کلمه عبور الزامی است.');
    }

    const user = await this.db.queryOne(
      'SELECT * FROM users WHERE mobile = ? AND tenant_id = ?',
      [mobile.trim(), tenantId]
    );

    if (!user) {
      throw new UnauthorizedException('شماره موبایل یا کلمه عبور اشتباه است.');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('حساب کاربری شما غیرفعال شده است.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('شماره موبایل یا کلمه عبور اشتباه است.');
    }

    const roles = await this.db.query(
      `SELECT r.code, r.title FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [user.id]
    );

    const payload = {
      sub: user.id,
      tenantId: user.tenant_id,
      mobile: user.mobile,
      isSuperAdmin: Boolean(user.is_super_admin)
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
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
