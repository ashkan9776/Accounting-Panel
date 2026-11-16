import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { AccountMappingService } from '../accounting/account-mapping.service';
import { EmployeesService } from './employees.service';
import {
  PayrollEngine,
  PayrollPostingEngine,
  SocialSecurityEngine,
  ContractType,
  DeductionType,
  JournalEntryType
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class PayrollService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
    private readonly employeesService: EmployeesService,
    private readonly accountMapping: AccountMappingService
  ) {}

  // ۱. تعریف دوره حقوق و دستمزد ماهانه
  async createPeriod(
    tenantId: string,
    companyId: string,
    branchId: string,
    data: {
      title: string;
      yearShamsi: string;
      monthNumber: number;
      startDateShamsi: string;
      endDateShamsi: string;
    }
  ) {
    if (!data.title || !data.yearShamsi || !data.monthNumber) {
      throw new BadRequestException('عنوان دوره، سال شمسی و شماره ماه الزامی است.');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO payroll_periods (
        id, tenant_id, company_id, branch_id, title, year_shamsi, month_number,
        start_date_shamsi, end_date_shamsi, status, total_gross_pay, total_deductions,
        total_net_pay, total_employer_insurance, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', '0', '0', '0', '0', ?)`,
      [
        id,
        tenantId,
        companyId,
        branchId,
        data.title,
        data.yearShamsi,
        data.monthNumber,
        data.startDateShamsi,
        data.endDateShamsi,
        now
      ]
    );

    return this.getPeriod(tenantId, companyId, id);
  }

  // ۲. استعلام جزئیات دوره و فیش‌های حقوقی
  async getPeriod(tenantId: string, companyId: string, id: string) {
    const period = await this.db.queryOne(
      `SELECT * FROM payroll_periods WHERE tenant_id = ? AND company_id = ? AND id = ?`,
      [tenantId, companyId, id]
    );
    if (!period) {
      throw new NotFoundException(`دوره حقوق و دستمزد با شناسه ${id} یافت نشد.`);
    }

    const slips = await this.db.query(
      `SELECT s.*, e.first_name, e.last_name, e.personnel_code, e.national_id, e.bank_sheba_number
       FROM payroll_slips s
       JOIN payroll_employees e ON s.employee_id = e.id
       WHERE s.period_id = ?
       ORDER BY e.personnel_code ASC`,
      [id]
    );

    return { ...period, slips };
  }

  // ۳. استعلام لیست دوره‌های حقوق
  async listPeriods(tenantId: string, companyId: string, yearShamsi?: string) {
    let sql = `SELECT * FROM payroll_periods WHERE tenant_id = ? AND company_id = ?`;
    const params: any[] = [tenantId, companyId];
    if (yearShamsi) {
      sql += ' AND year_shamsi = ?';
      params.push(yearShamsi);
    }
    sql += ' ORDER BY year_shamsi DESC, month_number DESC';
    return this.db.query(sql, params);
  }

  // ۴. محاسبه کارکرد، حقوق، بیمه، مالیات و صدور فیش‌های حقوقی دوره
  async calculatePeriodSlips(
    tenantId: string,
    companyId: string,
    periodId: string,
    data?: {
      timecards?: Array<{
        employeeId: string;
        workedDays?: number;
        overtimeHours?: number;
        advanceDeduction?: string | number;
        loanDeduction?: string | number;
      }>;
    }
  ) {
    const period = await this.getPeriod(tenantId, companyId, periodId);
    if (period.status === 'APPROVED' || period.status === 'PAID') {
      throw new BadRequestException('امکان محاسبه مجدد برای دوره‌های تاییدشده یا پرداخت‌شده وجود ندارد.');
    }

    // پاکسازی فیش‌های قبلی دوره
    await this.db.run(`DELETE FROM payroll_slips WHERE period_id = ?`, [periodId]);

    // دریافت لیست پرسنل فعال
    const employees = await this.employeesService.listEmployees(tenantId, companyId, { isActive: true });
    if (!employees || employees.length === 0) {
      throw new BadRequestException('هیچ پرسنل فعالی در شرکت تعریف نشده است.');
    }

    const timecardsMap = new Map<string, any>();
    if (data?.timecards) {
      for (const t of data.timecards) {
        timecardsMap.set(t.employeeId, t);
      }
    }

    let totalGross = new Decimal(0);
    let totalDeductions = new Decimal(0);
    let totalNet = new Decimal(0);
    let totalEmployerIns = new Decimal(0);
    const now = new Date().toISOString();

    for (const emp of employees) {
      const fullEmp = await this.employeesService.getEmployee(tenantId, companyId, emp.id);
      const contract = fullEmp.activeContract;
      if (!contract) continue;

      const tcInput = timecardsMap.get(emp.id);
      const workedDays = tcInput?.workedDays !== undefined ? tcInput.workedDays : 30;
      const overtimeHours = tcInput?.overtimeHours || 0;

      const addDeductions: any[] = [];
      if (tcInput?.advanceDeduction) {
        addDeductions.push({
          type: DeductionType.SALARY_ADVANCE,
          amount: tcInput.advanceDeduction
        });
      }
      if (tcInput?.loanDeduction) {
        addDeductions.push({
          type: DeductionType.LOAN_INSTALLMENT,
          amount: tcInput.loanDeduction
        });
      }

      // محاسبه به کمک موتور حقوق و دستمزد هسته
      const breakdown = PayrollEngine.calculateMonthlyPayroll({
        contract: {
          employeeId: emp.id,
          contractType: contract.contract_type as ContractType,
          monthlyBaseSalary: contract.monthly_base_salary,
          monthlyHousingAllowance: contract.monthly_housing_allowance,
          monthlyGroceryAllowance: contract.monthly_grocery_allowance,
          monthlySeniorityBonus: contract.monthly_seniority_bonus,
          childCount: contract.child_count,
          monthlyChildAllowancePerChild: contract.monthly_child_allowance_per_child
        },
        timecard: {
          workedDays,
          overtimeHours
        },
        additionalDeductions: addDeductions
      });

      const slipId = `slip-${periodId}-${emp.personnel_code}`;

      await this.db.run(
        `INSERT INTO payroll_slips (
          id, period_id, employee_id, worked_days, overtime_hours,
          base_pay, housing_pay, grocery_pay, child_pay, seniority_pay,
          overtime_pay, bonus_pay, gross_pay, insured_wage,
          employee_insurance, employer_insurance, unemployment_insurance, income_tax,
          salary_advance_deduction, loan_installment_deduction, other_deductions,
          total_deductions, net_payable, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slipId,
          periodId,
          emp.id,
          workedDays,
          overtimeHours.toString(),
          breakdown.basePay,
          breakdown.housingPay,
          breakdown.groceryPay,
          breakdown.childPay,
          breakdown.seniorityPay,
          breakdown.overtimePay,
          breakdown.bonusPay,
          breakdown.grossPay,
          breakdown.insuredGrossWage,
          breakdown.employeeInsuranceShare,
          breakdown.employerInsuranceShare,
          breakdown.employerUnemploymentShare,
          breakdown.incomeTax,
          breakdown.salaryAdvanceDeduction,
          breakdown.loanInstallmentDeduction,
          breakdown.otherDeductions,
          breakdown.totalEmployeeDeductions,
          breakdown.netPayableSalary,
          now
        ]
      );

      totalGross = totalGross.plus(breakdown.grossPay);
      totalDeductions = totalDeductions.plus(breakdown.totalEmployeeDeductions);
      totalNet = totalNet.plus(breakdown.netPayableSalary);
      totalEmployerIns = totalEmployerIns.plus(breakdown.totalEmployerInsuranceContribution);
    }

    await this.db.run(
      `UPDATE payroll_periods SET
        total_gross_pay = ?,
        total_deductions = ?,
        total_net_pay = ?,
        total_employer_insurance = ?,
        status = 'CALCULATED'
       WHERE id = ?`,
      [totalGross.toFixed(0), totalDeductions.toFixed(0), totalNet.toFixed(0), totalEmployerIns.toFixed(0), periodId]
    );

    return this.getPeriod(tenantId, companyId, periodId);
  }

  // ۵. تایید و صدور سند دوبل شناسایی هزینه حقوق و دستمزد
  async approveAndPostPayroll(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    periodId: string,
    data: {
      dateShamsi: string;
      costCenterDimensionId?: string;
    }
  ) {
    const period = await this.getPeriod(tenantId, companyId, periodId);
    if (!period.slips || period.slips.length === 0) {
      throw new BadRequestException('ابتدا باید فیش‌های حقوقی دوره محاسبه شوند.');
    }

    const slipsToPost = [];
    for (const s of period.slips) {
      const fullEmp = await this.employeesService.getEmployee(tenantId, companyId, s.employee_id);
      slipsToPost.push({
        slip: {
          employeeId: s.employee_id,
          contractType: ContractType.PERMANENT,
          basePay: s.base_pay,
          housingPay: s.housing_pay,
          groceryPay: s.grocery_pay,
          childPay: s.child_pay,
          seniorityPay: s.seniority_pay,
          overtimePay: s.overtime_pay,
          holidayWorkPay: '0',
          nightShiftPay: '0',
          missionPay: '0',
          bonusPay: s.bonus_pay,
          grossPay: s.gross_pay,
          insuredGrossWage: s.insured_wage,
          taxableGrossWage: s.gross_pay,
          employeeInsuranceShare: s.employee_insurance,
          employerInsuranceShare: s.employer_insurance,
          employerUnemploymentShare: s.unemployment_insurance,
          totalEmployerInsuranceContribution: new Decimal(s.employer_insurance).plus(s.unemployment_insurance).toFixed(0),
          totalInsuranceContribution: new Decimal(s.employee_insurance).plus(s.employer_insurance).plus(s.unemployment_insurance).toFixed(0),
          incomeTax: s.income_tax,
          salaryAdvanceDeduction: s.salary_advance_deduction,
          loanInstallmentDeduction: s.loan_installment_deduction,
          absenceDeduction: '0',
          otherDeductions: s.other_deductions,
          totalEmployeeDeductions: s.total_deductions,
          netPayableSalary: s.net_payable
        },
        employeePartyDimensionId: fullEmp.floating_dimension_id,
        costCenterDimensionId: data.costCenterDimensionId || 'dim-cc-mgmt'
      });
    }

    const salaryExpenseId = await this.accountMapping.getAccount(tenantId, companyId, 'SALARY_EXPENSE', 'sub-8101');
    const employerInsuranceExpenseId = await this.accountMapping.getAccount(tenantId, companyId, 'INSURANCE_EXPENSE', 'sub-8102');
    const insurancePayableId = await this.accountMapping.getAccount(tenantId, companyId, 'INSURANCE_PAYABLE', 'sub-3304');
    const taxPayableId = await this.accountMapping.getAccount(tenantId, companyId, 'TAX_PAYABLE', 'sub-3305');
    const salaryPayableId = await this.accountMapping.getAccount(tenantId, companyId, 'SALARY_PAYABLE', 'sub-3303');

    const journalLines = PayrollPostingEngine.buildMonthlyPayrollLines({
      periodTitle: period.title,
      dateShamsi: data.dateShamsi,
      costCenterDimensionId: data.costCenterDimensionId,
      slips: slipsToPost,
      accountOverrides: {
        salaryExpenseId,
        employerInsuranceExpenseId,
        insurancePayableId,
        taxPayableId,
        salaryPayableId
      }
    });

    const journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
      entryDateShamsi: data.dateShamsi,
      entryType: JournalEntryType.NORMAL,
      description: `سند شناسایی هزینه حقوق و دستمزد پرسنل - ${period.title}`,
      sourceModule: 'PAYROLL',
      sourceDocumentId: periodId,
      lines: journalLines
    });

    await this.db.run(
      `UPDATE payroll_periods SET status = 'APPROVED', journal_entry_id = ? WHERE id = ?`,
      [journalEntry.id, periodId]
    );

    return {
      periodId,
      title: period.title,
      status: 'APPROVED',
      journalEntry
    };
  }

  // ۶. پرداخت گروهی حقوق از طریق بانک (پایا) و تولید فایل شبا
  async paySalariesViaBank(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    periodId: string,
    data: {
      dateShamsi: string;
      bankFloatingDimensionId?: string;
    }
  ) {
    const period = await this.getPeriod(tenantId, companyId, periodId);
    if (period.status !== 'APPROVED') {
      throw new BadRequestException('تنها دوره‌های حقوق تاییدشده قابل واریز بانکی هستند.');
    }

    const totalNetPay = new Decimal(period.total_net_pay);
    const paymentSlips = [];
    for (const s of period.slips) {
      const fullEmp = await this.employeesService.getEmployee(tenantId, companyId, s.employee_id);
      paymentSlips.push({
        employeePartyDimensionId: fullEmp.floating_dimension_id || 'dim-cust-1',
        netPayableAmount: s.net_payable
      });
    }

    const bankAccountId = await this.accountMapping.getAccount(tenantId, companyId, 'BANK', 'sub-1102');
    const salaryPayableId = await this.accountMapping.getAccount(tenantId, companyId, 'SALARY_PAYABLE', 'sub-3303');

    const journalLines = PayrollPostingEngine.buildSalaryPaymentLines({
      periodTitle: period.title,
      dateShamsi: data.dateShamsi,
      totalPaidAmount: totalNetPay.toFixed(0),
      bankAccountSubsidiaryId: bankAccountId,
      bankFloatingDimensionId: data.bankFloatingDimensionId,
      salaryPayableAccountId: salaryPayableId,
      slips: paymentSlips
    });

    const journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
      entryDateShamsi: data.dateShamsi,
      entryType: JournalEntryType.NORMAL,
      description: `سند پرداخت و واریز پایا حقوق پرسنل - ${period.title}`,
      sourceModule: 'PAYROLL',
      sourceDocumentId: periodId,
      lines: journalLines
    });

    // تولید فایل پایا شبا
    const batchData = period.slips.map((s: any) => ({
      employeeId: s.employee_id,
      employeeName: `${s.first_name} ${s.last_name}`,
      nationalId: s.national_id,
      shebaNumber: s.bank_sheba_number,
      netPayableAmount: s.net_payable,
      periodTitle: period.title
    }));

    const paymentBatch = PayrollEngine.generateBankPaymentBatch(batchData);

    await this.db.run(
      `UPDATE payroll_periods SET status = 'PAID', payment_journal_entry_id = ? WHERE id = ?`,
      [journalEntry.id, periodId]
    );

    return {
      periodId,
      title: period.title,
      status: 'PAID',
      totalPaidAmount: totalNetPay.toFixed(0),
      paymentBatch,
      journalEntry
    };
  }

  // ۷. تولید فایل دیسکت بیمه تامین اجتماعی
  async generateTaminDiskette(tenantId: string, companyId: string, periodId: string) {
    const period = await this.getPeriod(tenantId, companyId, periodId);
    const company = await this.db.queryOne(`SELECT * FROM companies WHERE id = ?`, [companyId]);

    const workerLines: string[] = [];

    for (const s of period.slips) {
      const fullEmp = await this.employeesService.getEmployee(tenantId, companyId, s.employee_id);
      const contract = fullEmp.activeContract;

      const record = SocialSecurityEngine.generateTaminWorkerRecord({
        workshopCode: company?.economic_code || '1234567890',
        nationalId: s.national_id,
        insuranceNumber: fullEmp.insurance_number || '11223344',
        firstName: s.first_name,
        lastName: s.last_name,
        fatherName: fullEmp.father_name || 'نامشخص',
        birthDateShamsi: fullEmp.birth_date_shamsi || '1370/01/01',
        identityCardNumber: s.national_id,
        jobTitle: fullEmp.job_title,
        jobCode: '01001',
        workingDays: s.worked_days,
        dailyWage: contract ? new Decimal(contract.monthly_base_salary).dividedBy(30).round().toFixed(0) : '0',
        monthlyWage: s.base_pay,
        benefitWage: new Decimal(s.housing_pay).plus(s.grocery_pay).toFixed(0),
        totalInsuredWage: s.insured_wage,
        employeeShare: s.employee_insurance,
        employerShare: new Decimal(s.employer_insurance).plus(s.unemployment_insurance).toFixed(0)
      });

      workerLines.push(record);
    }

    return {
      periodId,
      title: period.title,
      workersCount: workerLines.length,
      dskworContent: workerLines.join('\n')
    };
  }
}
