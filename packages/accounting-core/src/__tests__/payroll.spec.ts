import {
  PayrollEngine,
  PayrollTaxEngine,
  SocialSecurityEngine,
  PayrollPostingEngine,
  ContractType,
  DeductionType
} from '../payroll';
import Decimal from 'decimal.js';

describe('Payroll & HR Engine (حقوق و دستمزد و بیمه و مالیات)', () => {
  it('۱. محاسبه مالیات بر درآمد حقوق پلکانی (ماده ۸۴ ق.م.م سال ۱۴۰۳)', () => {
    // درآمد کمتر از ۱۲۰ میلیون ریال معاف است
    const exemptTax = PayrollTaxEngine.calculateIncomeTax('100000000');
    expect(exemptTax.totalTax).toBe('0');

    // درآمد ۱۴۰ میلیون ریال: ۱۲۰ میلیون معاف + ۲۰ میلیون در پله ۱۰٪ = ۲,۰۰۰,۰۰۰ ریال
    const tax140 = PayrollTaxEngine.calculateIncomeTax('140000000');
    expect(tax140.totalTax).toBe('2000000');

    // درآمد ۲۰۰ میلیون ریال: ۱۲۰ میلیون معاف + ۴۵ میلیون در پله ۱۰٪ (۴.۵ م) + ۳۵ میلیون در پله ۱۵٪ (۵.۲۵ م) = ۹,۷۵۰,۰۰۰ ریال
    const tax200 = PayrollTaxEngine.calculateIncomeTax('200000000');
    expect(tax200.totalTax).toBe('9750000');

    // محاسبه معافیت ۲ هفتم بیمه سهم کارگر
    const twoSevenths = PayrollTaxEngine.calculateSocialSecurityTaxExemption('7000000');
    expect(twoSevenths).toBe('2000000');
  });

  it('۲. محاسبه سهم‌های بیمه تامین اجتماعی (۷٪ کارگر، ۲۰٪ کارفرما، ۳٪ بیکاری)', () => {
    const ssq = SocialSecurityEngine.calculateContributions('100000000');
    expect(ssq.effectiveInsuredWage).toBe('100000000');
    expect(ssq.employeeShare).toBe('7000000');      // ۷٪
    expect(ssq.employerShare).toBe('20000000');     // ۲۰٪
    expect(ssq.unemploymentShare).toBe('3000000');  // ۳٪
    expect(ssq.totalEmployerShare).toBe('23000000'); // ۲۳٪
    expect(ssq.totalContribution).toBe('30000000');  // ۳۰٪
    expect(ssq.hasExceededCeiling).toBe(false);

    // بررسی اعمال سقف بیمه ماهانه (۵۰۷,۰۳۶,۹۶۰ ریال)
    const ssqCeiling = SocialSecurityEngine.calculateContributions('600000000');
    expect(ssqCeiling.hasExceededCeiling).toBe(true);
    expect(ssqCeiling.effectiveInsuredWage).toBe('507036960');
  });

  it('۳. محاسبه کامل فیش حقوقی کارمند با اضافه‌کاری، بن، مسکن و حق اولاد', () => {
    const breakdown = PayrollEngine.calculateMonthlyPayroll({
      contract: {
        employeeId: 'emp-001',
        contractType: ContractType.TEMPORARY,
        monthlyBaseSalary: '150000000', // ۱۵ میلیون تومان
        monthlyHousingAllowance: '9000000', // ۹۰۰ هزار تومان مسکن
        monthlyGroceryAllowance: '14000000', // ۱.۴ میلیون تومان بن
        monthlySeniorityBonus: '2100000', // ۲۱۰ هزار تومان سنوات
        childCount: 2,
        monthlyChildAllowancePerChild: '7166184' // حق اولاد برای ۲ فرزند
      },
      timecard: {
        workedDays: 30,
        overtimeHours: 20 // ۲۰ ساعت اضافه‌کاری
      },
      additionalDeductions: [
        { type: DeductionType.SALARY_ADVANCE, amount: '10000000', description: 'مساعده دریافتی وسط ماه' },
        { type: DeductionType.LOAN_INSTALLMENT, amount: '5000000', description: 'قسط وام قرض‌الحسنه' }
      ]
    });

    expect(Number(breakdown.basePay)).toBe(150000000);
    expect(Number(breakdown.housingPay)).toBe(9000000);
    expect(Number(breakdown.groceryPay)).toBe(14000000);
    expect(Number(breakdown.childPay)).toBe(14332368); // 2 * 7166184

    // نرخ ساعتی: 150000000 / 220 = 681818.18 * 1.4 = 954545.45 * 20 = 19090909
    expect(Number(breakdown.overtimePay)).toBeGreaterThan(19000000);

    expect(Number(breakdown.grossPay)).toBeGreaterThan(200000000);
    expect(Number(breakdown.employeeInsuranceShare)).toBeGreaterThan(12000000);
    expect(Number(breakdown.salaryAdvanceDeduction)).toBe(10000000);
    expect(Number(breakdown.loanInstallmentDeduction)).toBe(5000000);
    expect(Number(breakdown.netPayableSalary)).toBeGreaterThan(150000000);
  });

  it('۴. صدور سند دوبل شناسایی هزینه حقوق ماهانه و تطابق کامل تراز بدهکار و بستانکار', () => {
    const slip1 = PayrollEngine.calculateMonthlyPayroll({
      contract: {
        employeeId: 'emp-001',
        contractType: ContractType.PERMANENT,
        monthlyBaseSalary: '180000000',
        monthlyHousingAllowance: '9000000',
        monthlyGroceryAllowance: '14000000'
      },
      timecard: { workedDays: 30 },
      additionalDeductions: [
        { type: DeductionType.SALARY_ADVANCE, amount: '20000000' }
      ]
    });

    const lines = PayrollPostingEngine.buildMonthlyPayrollLines({
      periodTitle: 'حقوق بهمن ماه ۱۴۰۳',
      dateShamsi: '1403/11/30',
      slips: [
        {
          slip: slip1,
          employeePartyDimensionId: 'dim-emp-1',
          costCenterDimensionId: 'dim-cc-mgmt'
        }
      ]
    });

    expect(lines.length).toBeGreaterThanOrEqual(5);

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const l of lines) {
      totalDebit = totalDebit.plus(l.debit);
      totalCredit = totalCredit.plus(l.credit);
    }

    // تراز ۱۰۰٪ ریاضی
    expect(totalDebit.toFixed(0)).toBe(totalCredit.toFixed(0));

    // بررسی وجود حساب‌های استاندارد
    const debitSalaryExp = lines.find((l) => l.subsidiaryAccountId === 'sub-8101');
    const debitEmployerIns = lines.find((l) => l.subsidiaryAccountId === 'sub-8102');
    const creditTaminIns = lines.find((l) => l.subsidiaryAccountId === 'sub-3304');
    const creditTax = lines.find((l) => l.subsidiaryAccountId === 'sub-3305');
    const creditAdvance = lines.find((l) => l.subsidiaryAccountId === 'sub-1404');
    const creditNetSalary = lines.find((l) => l.subsidiaryAccountId === 'sub-3303');

    expect(debitSalaryExp).toBeDefined();
    expect(debitEmployerIns).toBeDefined();
    expect(creditTaminIns).toBeDefined();
    expect(creditTax).toBeDefined();
    expect(creditAdvance).toBeDefined();
    expect(creditNetSalary).toBeDefined();
  });

  it('۵. صدور سند پرداخت گروهی حقوق از طریق بانک (پایا) و تولید فایل شبا', () => {
    const paymentLines = PayrollPostingEngine.buildSalaryPaymentLines({
      periodTitle: 'بهمن ۱۴۰۳',
      dateShamsi: '1403/11/30',
      totalPaidAmount: '165000000',
      bankFloatingDimensionId: 'dim-bank-mellat'
    });

    expect(paymentLines.length).toBe(2);
    expect(paymentLines[0].subsidiaryAccountId).toBe('sub-3303'); // بدهکار حقوق پرداختنی
    expect(paymentLines[0].debit).toBe('165000000');
    expect(paymentLines[1].subsidiaryAccountId).toBe('sub-1102'); // بستانکار بانک
    expect(paymentLines[1].credit).toBe('165000000');

    // تولید بچ پرداخت پایا بانکی
    const batch = PayrollEngine.generateBankPaymentBatch([
      {
        employeeId: 'emp-001',
        employeeName: 'مهندس احمدی',
        nationalId: '0012345678',
        shebaNumber: 'IR120120000000001234567890',
        netPayableAmount: '165000000',
        periodTitle: 'بهمن ۱۴۰۳'
      }
    ]);

    expect(batch.totalRecords).toBe(1);
    expect(batch.totalAmount).toBe('165000000');
    expect(batch.csvContent).toContain('IR120120000000001234567890');
  });
});
