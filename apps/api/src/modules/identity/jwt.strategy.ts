import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../database/database.service';

export const JWT_SECRET = process.env.JWT_SECRET || 'iranian-accounting-secret-key-2024';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET
    });
  }

  async validate(payload: { sub: string; tenantId: string; mobile: string }) {
    const user = await this.db.queryOne(
      'SELECT id, tenant_id, mobile, email, full_name, is_super_admin, is_active FROM users WHERE id = ? AND tenant_id = ?',
      [payload.sub, payload.tenantId]
    );

    if (!user || !user.is_active) {
      throw new UnauthorizedException('کاربر نامعتبر است یا حساب کاربری غیرفعال شده است.');
    }

    // واکشی نقش‌ها و دسترسی‌های کاربر
    const roles = await this.db.query(
      `SELECT r.code FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [user.id]
    );

    const permissions = await this.db.query(
      `SELECT DISTINCT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = ?`,
      [user.id]
    );

    return {
      ...user,
      tenantId: user.tenant_id,
      roles: roles.map((r: any) => r.code),
      permissions: permissions.map((p: any) => p.code),
    };
  }
}
