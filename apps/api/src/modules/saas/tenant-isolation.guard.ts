import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return true;
      }
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userTenantId = user?.tenant_id || user?.tenantId;

    if (!user || !userTenantId) {
      throw new ForbiddenException('اطلاعات احراز هویت سازمان (مستاجر) در درخواست موجود نیست.');
    }

    // بررسی تطابق tenantId در هدر، کوئری یا پارامترهای روت در صورت ارسال صریح
    const requestedTenantId =
      request.headers['x-tenant-id'] ||
      request.params?.tenantId ||
      request.query?.tenantId ||
      request.body?.tenantId;

    if (requestedTenantId && requestedTenantId !== userTenantId) {
      throw new ForbiddenException(
        'دسترسی غیرمجاز به داده‌های سازمان دیگر (نقض تفکیک امنیتی چندمستاجری Multi-tenancy)',
      );
    }

    if (request.tenantContext) {
      request.tenantContext.tenantId = userTenantId;
    }

    return true;
  }
}
