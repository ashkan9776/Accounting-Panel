import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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

    return true;
  }
}
