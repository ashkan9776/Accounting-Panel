import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TenancyService {
  constructor(private readonly db: DatabaseService) {}

  async getCompany(tenantId: string, companyId: string) {
    return this.db.queryOne(
      'SELECT * FROM companies WHERE tenant_id = ? AND id = ?',
      [tenantId, companyId]
    );
  }

  async getBranches(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM branches WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
  }

  async getFiscalYears(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM fiscal_years WHERE tenant_id = ? AND company_id = ? ORDER BY start_date_shamsi DESC',
      [tenantId, companyId]
    );
  }

  async getFiscalPeriods(tenantId: string, fiscalYearId: string) {
    return this.db.query(
      'SELECT * FROM fiscal_periods WHERE tenant_id = ? AND fiscal_year_id = ? ORDER BY period_number ASC',
      [tenantId, fiscalYearId]
    );
  }
}
