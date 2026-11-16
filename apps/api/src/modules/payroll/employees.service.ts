import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { ContractType } from '@accounting/core';

@Injectable()
export class EmployeesService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. ایجاد پرونده پرسنلی به همراه حکم کارگزینی اولیه
  async createEmployee(
    tenantId: string,
    companyId: string,
    data: {
      personnelCode: string;
      nationalId: string;
      firstName: string;
      lastName: string;
      fatherName?: string;
      birthDateShamsi?: string;
      hireDateShamsi: string;
      insuranceNumber?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankShebaNumber: string;
      department?: string;
      jobTitle: string;
      contract: {
        contractType: ContractType;
        startDateShamsi: string;
        endDateShamsi?: string;
        monthlyBaseSalary: string | number;
        monthlyHousingAllowance: string | number;
        monthlyGroceryAllowance: string | number;
        monthlySeniorityBonus?: string | number;
        childCount?: number;
        monthlyChildAllowancePerChild?: string | number;
      };
    }
  ) {
    if (!data.personnelCode || !data.nationalId || !data.firstName || !data.lastName || !data.bankShebaNumber) {
      throw new BadRequestException('کد پرسنلی، کد ملی، نام، نام خانوادگی و شماره شبا الزامی است.');
    }

    const employeeId = randomUUID();
    const partyId = randomUUID();
    const contractId = randomUUID();
    const now = new Date().toISOString();

    // ایجاد رکورد شخص در جدول parties
    await this.db.run(
      `INSERT INTO parties (
        id, tenant_id, company_id, party_type, name, first_name, last_name,
        national_id, is_customer, is_supplier, is_employee, floating_dimension_id, is_active, created_at
      ) VALUES (?, ?, ?, 'INDIVIDUAL_IRANIAN', ?, ?, ?, ?, 0, 0, 1, 'dim-cust-1', 1, ?)`,
      [
        partyId,
        tenantId,
        companyId,
        `${data.firstName} ${data.lastName}`,
        data.firstName,
        data.lastName,
        data.nationalId,
        now
      ]
    );

    // ایجاد پرونده پرسنلی
    await this.db.run(
      `INSERT INTO payroll_employees (
        id, tenant_id, company_id, party_id, personnel_code, national_id,
        first_name, last_name, father_name, birth_date_shamsi, hire_date_shamsi,
        insurance_number, bank_name, bank_account_number, bank_sheba_number,
        department, job_title, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        employeeId,
        tenantId,
        companyId,
        partyId,
        data.personnelCode,
        data.nationalId,
        data.firstName,
        data.lastName,
        data.fatherName || null,
        data.birthDateShamsi || null,
        data.hireDateShamsi,
        data.insuranceNumber || null,
        data.bankName || null,
        data.bankAccountNumber || null,
        data.bankShebaNumber,
        data.department || null,
        data.jobTitle,
        now
      ]
    );

    // ثبت حکم کارگزینی
    const c = data.contract;
    await this.db.run(
      `INSERT INTO payroll_contracts (
        id, tenant_id, company_id, employee_id, contract_type,
        start_date_shamsi, end_date_shamsi, monthly_base_salary,
        monthly_housing_allowance, monthly_grocery_allowance, monthly_seniority_bonus,
        child_count, monthly_child_allowance_per_child, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        contractId,
        tenantId,
        companyId,
        employeeId,
        c.contractType || ContractType.PERMANENT,
        c.startDateShamsi,
        c.endDateShamsi || null,
        c.monthlyBaseSalary.toString(),
        c.monthlyHousingAllowance.toString(),
        c.monthlyGroceryAllowance.toString(),
        c.monthlySeniorityBonus ? c.monthlySeniorityBonus.toString() : '0',
        c.childCount || 0,
        c.monthlyChildAllowancePerChild ? c.monthlyChildAllowancePerChild.toString() : '0',
        now
      ]
    );

    return this.getEmployee(tenantId, companyId, employeeId);
  }

  // ۲. استعلام جزئیات پرونده پرسنلی و حکم فعال
  async getEmployee(tenantId: string, companyId: string, id: string) {
    const employee = await this.db.queryOne(
      `SELECT e.*, p.floating_dimension_id
       FROM payroll_employees e
       JOIN parties p ON e.party_id = p.id
       WHERE e.tenant_id = ? AND e.company_id = ? AND e.id = ?`,
      [tenantId, companyId, id]
    );
    if (!employee) {
      throw new NotFoundException(`پرسنل با شناسه ${id} یافت نشد.`);
    }

    const contracts = await this.db.query(
      `SELECT * FROM payroll_contracts
       WHERE employee_id = ? AND tenant_id = ? AND company_id = ?
       ORDER BY start_date_shamsi DESC`,
      [id, tenantId, companyId]
    );

    const activeContract = contracts.find((c: any) => c.is_active === 1) || contracts[0] || null;

    return { ...employee, activeContract, contracts };
  }

  // ۳. استعلام لیست پرسنل شرکت
  async listEmployees(tenantId: string, companyId: string, filters?: { department?: string; isActive?: boolean }) {
    let sql = `
      SELECT e.*, c.monthly_base_salary, c.contract_type
      FROM payroll_employees e
      LEFT JOIN payroll_contracts c ON c.employee_id = e.id AND c.is_active = 1
      WHERE e.tenant_id = ? AND e.company_id = ?
    `;
    const params: any[] = [tenantId, companyId];

    if (filters?.department) {
      sql += ' AND e.department = ?';
      params.push(filters.department);
    }
    if (filters?.isActive !== undefined) {
      sql += ' AND e.is_active = ?';
      params.push(filters.isActive ? 1 : 0);
    }

    sql += ' ORDER BY e.personnel_code ASC';
    return this.db.query(sql, params);
  }
}
