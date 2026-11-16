import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { FloatingDimensionType } from '@accounting/core';

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly db: DatabaseService) {}

  async getGroups(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM account_groups WHERE tenant_id = ? AND company_id = ? ORDER BY code ASC',
      [tenantId, companyId]
    );
  }

  async getHeads(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM account_heads WHERE tenant_id = ? AND company_id = ? ORDER BY code ASC',
      [tenantId, companyId]
    );
  }

  async getSubsidiaries(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM account_subsidiaries WHERE tenant_id = ? AND company_id = ? ORDER BY code ASC',
      [tenantId, companyId]
    );
  }

  async getFloatingDimensions(tenantId: string, companyId: string, dimensionType?: FloatingDimensionType) {
    let sql = 'SELECT * FROM floating_dimensions WHERE tenant_id = ? AND company_id = ?';
    const params: any[] = [tenantId, companyId];
    if (dimensionType) {
      sql += ' AND dimension_type = ?';
      params.push(dimensionType);
    }
    sql += ' ORDER BY code ASC';
    return this.db.query(sql, params);
  }

  async createFloatingDimension(
    tenantId: string,
    companyId: string,
    dimensionType: FloatingDimensionType,
    code: string,
    title: string,
    referenceId?: string
  ) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO floating_dimensions (id, tenant_id, company_id, dimension_type, code, title, reference_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, tenantId, companyId, dimensionType, code, title, referenceId || null, now]
    );
    return { id, code, title, dimensionType };
  }

  async getFullChartTree(tenantId: string, companyId: string) {
    const [groups, heads, subsidiaries] = await Promise.all([
      this.getGroups(tenantId, companyId),
      this.getHeads(tenantId, companyId),
      this.getSubsidiaries(tenantId, companyId)
    ]);

    const subByHead = new Map<string, any[]>();
    for (const sub of subsidiaries) {
      const list = subByHead.get(sub.head_id) || [];
      list.push(sub);
      subByHead.set(sub.head_id, list);
    }

    const headByGroup = new Map<string, any[]>();
    for (const h of heads) {
      const subs = subByHead.get(h.id) || [];
      const list = headByGroup.get(h.group_id) || [];
      list.push({ ...h, subsidiaries: subs });
      headByGroup.set(h.group_id, list);
    }

    return groups.map((g: any) => ({
      ...g,
      heads: headByGroup.get(g.id) || []
    }));
  }
}
