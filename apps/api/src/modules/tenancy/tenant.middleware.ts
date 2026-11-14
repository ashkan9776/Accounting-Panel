import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenantId: string;
  companyId: string;
  branchId?: string;
  fiscalYearId?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // استخراج تنانت از هدر یا مقدار پیش‌فرض
    const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-pishro';
    const companyId = (req.headers['x-company-id'] as string) || 'comp-pishro-1';
    const branchId = (req.headers['x-branch-id'] as string) || 'branch-central-1';
    const fiscalYearId = (req.headers['x-fiscal-year-id'] as string) || 'fy-1403';

    req.tenantContext = {
      tenantId,
      companyId,
      branchId,
      fiscalYearId
    };

    next();
  }
}
