import { VersionedRulesEngine, DEFAULT_IRANIAN_RULES_1403 } from '../rules/rules-engine';

describe('Versioned Rules Engine (قوانین نسخه‌دار مالیاتی و دولتی)', () => {
  let engine: VersionedRulesEngine;

  beforeEach(() => {
    engine = new VersionedRulesEngine(DEFAULT_IRANIAN_RULES_1403);
  });

  describe('VAT Calculations (ارزش افزوده)', () => {
    it('should calculate 10% standard VAT for general goods in 1403', () => {
      // فروش ۱۰,۰۰۰,۰۰۰ ریال با ۱,۰۰۰,۰۰۰ ریال تخفیف -> خالص ۹,۰۰۰,۰۰۰ ریال
      // مالیات ۱۰٪ = ۹۰۰,۰۰۰ ریال
      const res = engine.calculateVat(10000000, 1000000, 'GENERAL_ITEM_01', '1403/05/15');
      expect(res.netTaxableAmount).toBe('9000000');
      expect(res.vatRatePercent).toBe(10);
      expect(res.vatAmount).toBe('900000');
      expect(res.totalWithVat).toBe('9900000');
      expect(res.isExempt).toBe(false);
      expect(res.explanationTrace).toContain('بند (ر) تبصره ۶ قانون بودجه سال ۱۴۰۳');
    });

    it('should treat basic foods and medicine as exempt from VAT', () => {
      const res = engine.calculateVat(5000000, 0, 'EXEMPT_BREAD', '1403/06/01');
      expect(res.vatRatePercent).toBe(0);
      expect(res.vatAmount).toBe('0');
      expect(res.isExempt).toBe(true);
      expect(res.totalWithVat).toBe('5000000');
    });

    it('should apply VAT strictly to wage and profit for gold jewelry (تبصره ۲ ماده ۲۶)', () => {
      // ارزش طلای خام: ۴۰,۰۰۰,۰۰۰ ریال (معاف)
      // اجرت و سود: ۷,۰۸۰,۰۰۰ ریال (مشمول ۱۰٪)
      // مالیات ۱۰٪ از ۷,۰۸۰,۰۰۰ = ۷۰۸,۰۰۰ ریال
      // جمع فاکتور = ۴۰,۰۰۰,۰۰۰ + ۷,۰۸۰,۰۰۰ + ۷۰۸,۰۰۰ = ۴۷,۷۸۸,۰۰۰ ریال
      const res = engine.calculateVat(
        47080000,
        0,
        'GOLD_NECKLACE_18K',
        '1403/07/20',
        true,
        { rawGoldValue: 40000000, wageAndProfitValue: 7080000 }
      );

      expect(res.netTaxableAmount).toBe('7080000');
      expect(res.vatRatePercent).toBe(10);
      expect(res.vatAmount).toBe('708000');
      expect(res.totalWithVat).toBe('47788000');
      expect(res.legalReference).toContain('تبصره ۲ ماده ۲۶');
    });
  });

  describe('Payroll Tax Calculations (مالیات حقوق ماده ۸۴)', () => {
    it('should calculate zero tax for income within monthly exemption ceiling (120M Rials)', () => {
      const res = engine.calculatePayrollTax(115000000, '1403/04/30');
      expect(res.totalTax).toBe('0');
      expect(res.effectiveRatePercent).toBe('0.00');
    });

    it('should calculate progressive tax for income exceeding 120M Rials', () => {
      // حقوق ناخالص مشمول: ۲۰۰,۰۰۰,۰۰۰ ریال
      // پله اول: ۰ تا ۱۲۰,۰۰۰,۰۰۰ = ۰ ریال مالیات
      // پله دوم (۱۰٪): ۱۲۰,۰۰۰,۰۰۰ تا ۱۶۵,۰۰۰,۰۰۰ (ظرفیت ۴۵,۰۰۰,۰۰۰) -> ۱۰٪ = ۴,۵۰۰,۰۰۰ ریال
      // پله سوم (۱۵٪): مازاد بر ۱۶۵,۰۰۰,۰۰۰ تا ۲۰۰,۰۰۰,۰۰۰ (مقدار ۳۵,۰۰۰,۰۰۰) -> ۱۵٪ = ۵,۲۵۰,۰۰۰ ریال
      // جمع کل مالیات = ۴,۵۰۰,۰۰۰ + ۵,۲۵۰,۰۰۰ = ۹,۷۵۰,۰۰۰ ریال
      const res = engine.calculatePayrollTax(200000000, '1403/08/30');
      expect(res.totalTax).toBe('9750000');
      expect(res.bracketsUsed.length).toBe(3);
      expect(res.bracketsUsed[0].taxAmount).toBe('0');
      expect(res.bracketsUsed[1].taxAmount).toBe('4500000');
      expect(res.bracketsUsed[2].taxAmount).toBe('5250000');
    });
  });

  describe('Social Security Insurance (حق بیمه تامین اجتماعی)', () => {
    it('should calculate 7% employee and 23% employer shares', () => {
      // دستمزد مشمول بیمه: ۱۰۰,۰۰۰,۰۰۰ ریال
      // سهم کارگر ۷٪ = ۷,۰۰۰,۰۰۰ ریال
      // سهم کارفرما ۲۰٪ = ۲۰,۰۰۰,۰۰۰ ریال
      // بیمه بیکاری ۳٪ = ۳,۰۰۰,۰۰۰ ریال
      // جمع کارفرما = ۲۳,۰۰۰,۰۰۰ ریال
      // کل واریزی به تامین اجتماعی = ۳۰,۰۰۰,۰۰۰ ریال
      const res = engine.calculateSocialSecurity(100000000, '1403/05/01');
      expect(res.employeeShare).toBe('7000000');
      expect(res.employerShare).toBe('20000000');
      expect(res.unemploymentShare).toBe('3000000');
      expect(res.totalEmployerCost).toBe('23000000');
      expect(res.totalPayableToOrganization).toBe('30000000');
    });
  });
});
