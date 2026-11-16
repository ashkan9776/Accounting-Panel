import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class WorkCentersService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. ایجاد مرکز کاری تولید
  async createWorkCenter(
    tenantId: string,
    companyId: string,
    data: {
      id?: string;
      code: string;
      name: string;
      department?: string;
      capacityHoursPerDay?: string | number;
      laborHourlyRate?: string | number;
      overheadHourlyRate?: string | number;
    }
  ) {
    if (!data.code || !data.name) {
      throw new BadRequestException('کد و نام مرکز کاری الزامی است.');
    }

    const id = data.id || randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO manufacturing_work_centers (
        id, tenant_id, company_id, code, name, department,
        capacity_hours_per_day, labor_hourly_rate, overhead_hourly_rate, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)`,
      [
        id,
        tenantId,
        companyId,
        data.code,
        data.name,
        data.department || null,
        data.capacityHoursPerDay ? data.capacityHoursPerDay.toString() : '8',
        data.laborHourlyRate ? data.laborHourlyRate.toString() : '0',
        data.overheadHourlyRate ? data.overheadHourlyRate.toString() : '0',
        now
      ]
    );

    return this.getWorkCenter(tenantId, companyId, id);
  }

  // ۲. استعلام لیست مراکز کاری
  async listWorkCenters(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT * FROM manufacturing_work_centers
       WHERE tenant_id = ? AND company_id = ? AND is_active = true
       ORDER BY code ASC`,
      [tenantId, companyId]
    );
  }

  // ۳. استعلام جزئیات یک مرکز کاری
  async getWorkCenter(tenantId: string, companyId: string, id: string) {
    const center = await this.db.queryOne(
      `SELECT * FROM manufacturing_work_centers
       WHERE tenant_id = ? AND company_id = ? AND id = ?`,
      [tenantId, companyId, id]
    );
    if (!center) {
      throw new NotFoundException(`مرکز کاری تولید با شناسه ${id} یافت نشد.`);
    }
    return center;
  }

  // ۴. به‌روزرسانی نرخ‌های ساعتی و مشخصات مرکز کاری
  async updateWorkCenter(
    tenantId: string,
    companyId: string,
    id: string,
    data: {
      name?: string;
      department?: string;
      capacityHoursPerDay?: string | number;
      laborHourlyRate?: string | number;
      overheadHourlyRate?: string | number;
      isActive?: boolean;
    }
  ) {
    await this.getWorkCenter(tenantId, companyId, id);

    const fields: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.department !== undefined) {
      fields.push('department = ?');
      params.push(data.department);
    }
    if (data.capacityHoursPerDay !== undefined) {
      fields.push('capacity_hours_per_day = ?');
      params.push(data.capacityHoursPerDay.toString());
    }
    if (data.laborHourlyRate !== undefined) {
      fields.push('labor_hourly_rate = ?');
      params.push(data.laborHourlyRate.toString());
    }
    if (data.overheadHourlyRate !== undefined) {
      fields.push('overhead_hourly_rate = ?');
      params.push(data.overheadHourlyRate.toString());
    }
    if (data.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    if (fields.length > 0) {
      params.push(id, tenantId, companyId);
      await this.db.run(
        `UPDATE manufacturing_work_centers SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ? AND company_id = ?`,
        params
      );
    }

    return this.getWorkCenter(tenantId, companyId, id);
  }
}
