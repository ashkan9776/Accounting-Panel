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
    // استخراج تنانت و شناسه شرکت از هدرهای احراز هویت
    const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-pishro';
    const companyId = req.headers['x-company-id'] as string;
    const branchId = req.headers['x-branch-id'] as string;
    const fiscalYearId = req.headers['x-fiscal-year-id'] as string;

    req.tenantContext = {
      tenantId,
      companyId: companyId || (tenantId === 'tenant-pishro' ? 'comp-pishro-1' : ''),
      branchId: branchId || (tenantId === 'tenant-pishro' ? 'branch-central-1' : undefined),
      fiscalYearId: fiscalYearId || (tenantId === 'tenant-pishro' ? 'fy-1403' : undefined)
    };

    next();
  }
}
