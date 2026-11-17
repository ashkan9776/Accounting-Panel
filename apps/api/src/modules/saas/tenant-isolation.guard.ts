import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(
    private reflector?: Reflector,
    private db?: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    let companyId = request.headers['x-company-id'] || request.params?.companyId || request.query?.companyId || request.body?.companyId;
    let branchId = request.headers['x-branch-id'];
    let fiscalYearId = request.headers['x-fiscal-year-id'];

    if (this.db) {
      if (companyId) {
        const comp = await this.db.queryOne('SELECT id FROM companies WHERE id = ? AND tenant_id = ?', [companyId, userTenantId]);
        if (!comp) {
          throw new ForbiddenException('شرکت انتخابی متعلق به سازمان شما نیست.');
        }
      } else {
        const defComp = await this.db.queryOne<any>('SELECT id FROM companies WHERE tenant_id = ? ORDER BY created_at ASC LIMIT 1', [userTenantId]);
        companyId = defComp?.id || (userTenantId === 'tenant-pishro' ? 'comp-pishro-1' : null);
      }

      if (branchId) {
        const br = await this.db.queryOne('SELECT id FROM branches WHERE id = ? AND tenant_id = ?', [branchId, userTenantId]);
        if (!br) {
          throw new ForbiddenException('شعبه انتخابی متعلق به سازمان شما نیست.');
        }
      } else if (companyId) {
        const defBr = await this.db.queryOne<any>('SELECT id FROM branches WHERE tenant_id = ? AND company_id = ? ORDER BY is_central DESC, created_at ASC LIMIT 1', [userTenantId, companyId]);
        branchId = defBr?.id || (userTenantId === 'tenant-pishro' ? 'branch-central-1' : null);
      }

      if (fiscalYearId) {
        const fy = await this.db.queryOne('SELECT id FROM fiscal_years WHERE id = ? AND tenant_id = ?', [fiscalYearId, userTenantId]);
        if (!fy) {
          throw new ForbiddenException('سال مالی انتخابی متعلق به سازمان شما نیست.');
        }
      } else if (companyId) {
        const defFy = await this.db.queryOne<any>('SELECT id FROM fiscal_years WHERE tenant_id = ? AND company_id = ? AND is_closed = false ORDER BY start_date_shamsi DESC LIMIT 1', [userTenantId, companyId]);
        fiscalYearId = defFy?.id || (userTenantId === 'tenant-pishro' ? 'fy-1403' : null);
      }
    }

    if (!request.tenantContext) {
      request.tenantContext = {};
    }
    request.tenantContext.tenantId = userTenantId;
    request.tenantContext.companyId = companyId;
    request.tenantContext.branchId = branchId;
    request.tenantContext.fiscalYearId = fiscalYearId;

    return true;
  }
}
