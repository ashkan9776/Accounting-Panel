import {
  STANDARD_SAAS_PLANS,
  SaaSSubscriptionEngine,
  TenantOnboardingEngine,
  DataMigrationEngine,
  SecurityEngine,
  TenantSubscriptionRecord,
  TenantUsageMetrics,
} from '../saas';

describe('SaaS Multi-tenancy, Subscription, Migration and Security Core Tests', () => {
  describe('SaaS Subscription & Plan Quota Engine', () => {
    it('should define standard SaaS plans conforming to Iranian business tiers', () => {
      expect(STANDARD_SAAS_PLANS.length).toBeGreaterThanOrEqual(4);
      const proPlan = STANDARD_SAAS_PLANS.find((p) => p.code === 'PRO');
      expect(proPlan).toBeDefined();
      expect(proPlan?.maxMonthlyTransactions).toBe(15000);
      expect(proPlan?.hasApiAccess).toBe(true);
      expect(proPlan?.allowedModules).toContain('MANUFACTURING');
      expect(proPlan?.allowedModules).toContain('RESTAURANT');
    });

    it('should correctly evaluate active subscription, trial and grace periods', () => {
      const now = new Date();
      const inFuture = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const subActive: TenantSubscriptionRecord = {
        id: 'sub-1',
        organizationId: 'org-1',
        planId: 'plan-pro',
        status: 'ACTIVE',
        startedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: inFuture,
        autoRenew: true,
        billingCycle: 'MONTHLY',
      };

      const resActive = SaaSSubscriptionEngine.evaluateSubscriptionStatus(subActive, now);
      expect(resActive.status).toBe('ACTIVE');
      expect(resActive.daysRemaining).toBe(10);
      expect(resActive.isInGracePeriod).toBe(false);

      // تست دوره تنفس (Grace Period): منقضی شده ولی کمتر از ۵ روز گذشته
      const past2Days = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const subGrace: TenantSubscriptionRecord = {
        ...subActive,
        expiresAt: past2Days,
      };
      const resGrace = SaaSSubscriptionEngine.evaluateSubscriptionStatus(subGrace, now, 5);
      expect(resGrace.status).toBe('GRACE_PERIOD');
      expect(resGrace.isInGracePeriod).toBe(true);

      // تست انقضای کامل
      const past10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const subExpired: TenantSubscriptionRecord = {
        ...subActive,
        expiresAt: past10Days,
      };
      const resExpired = SaaSSubscriptionEngine.evaluateSubscriptionStatus(subExpired, now, 5);
      expect(resExpired.status).toBe('EXPIRED');
      expect(resExpired.isInGracePeriod).toBe(false);
    });

    it('should enforce quotas for transactions, users, storage, modules and API access', () => {
      const starterPlan = STANDARD_SAAS_PLANS.find((p) => p.code === 'STARTER')!;
      const metrics: TenantUsageMetrics = {
        organizationId: 'org-starter',
        periodMonth: '1403-12',
        currentTransactions: 1999,
        currentUsers: 5,
        currentStorageMb: 500,
        lastUpdatedAt: new Date().toISOString(),
      };

      // تراکنش اول مجاز است (می‌رسد به ۲۰۰۰)
      const qTxAllowed = SaaSSubscriptionEngine.checkQuota(starterPlan, metrics, 'TRANSACTIONS', { incrementBy: 1 });
      expect(qTxAllowed.isAllowed).toBe(true);

      // ۲ تراکنش بیشتر سقف را رد می‌کند
      const qTxExceeded = SaaSSubscriptionEngine.checkQuota(starterPlan, metrics, 'TRANSACTIONS', { incrementBy: 2 });
      expect(qTxExceeded.isAllowed).toBe(false);
      expect(qTxExceeded.reason).toContain('سقف تراکنش ماهانه');

      // تست اضافه کردن کاربر ششم (سقف ۵ کاربر)
      const qUserExceeded = SaaSSubscriptionEngine.checkQuota(starterPlan, metrics, 'USERS', { incrementBy: 1 });
      expect(qUserExceeded.isAllowed).toBe(false);

      // تست دسترسی به ماژول تولید (در پلن پایه نیست)
      const qModBlocked = SaaSSubscriptionEngine.checkQuota(starterPlan, metrics, 'MODULE', { moduleCode: 'MANUFACTURING' });
      expect(qModBlocked.isAllowed).toBe(false);

      // تست دسترسی به API (در پلن پایه غیرفعال است)
      const qApiBlocked = SaaSSubscriptionEngine.checkQuota(starterPlan, metrics, 'API_ACCESS');
      expect(qApiBlocked.isAllowed).toBe(false);
    });

    it('should accurately calculate prorated upgrade costs with 28-digit precision', () => {
      const starterPlan = STANDARD_SAAS_PLANS.find((p) => p.code === 'STARTER')!;
      const proPlan = STANDARD_SAAS_PLANS.find((p) => p.code === 'PRO')!;

      const now = new Date('2026-03-15T00:00:00Z');
      const started = new Date('2026-03-01T00:00:00Z');
      const expires = new Date('2026-03-31T00:00:00Z'); // دوره ۳۰ روزه

      const subscription: TenantSubscriptionRecord = {
        id: 'sub-prorate',
        organizationId: 'org-test',
        planId: starterPlan.id,
        status: 'ACTIVE',
        startedAt: started.toISOString(),
        expiresAt: expires.toISOString(),
        autoRenew: true,
        billingCycle: 'MONTHLY',
      };

      // در روز ۱۵، دقیقا ۱۶ روز از ۳۰ روز باقیمانده است
      const upgrade = SaaSSubscriptionEngine.calculateProratedUpgrade(starterPlan, proPlan, subscription, now);
      expect(upgrade.remainingDays).toBe(16);
      expect(upgrade.daysInCycle).toBe(30);

      // محاسبه بهای روزانه:
      // پلن پایه: 4,500,000 / 30 = 150,000
      // پلن پرو: 12,000,000 / 30 = 400,000
      // مابه‌التفاوت روزانه: 250,000
      // مبلغ ۱۶ روز: 16 * 250,000 = 4,000,000 ریال
      expect(upgrade.netPayableAmount).toBe('4000000');
    });
  });

  describe('Tenant Onboarding & Industry Coding Engine', () => {
    it('should validate legal national IDs and individual national codes correctly', () => {
      // کد ملی معتبر حقیقی
      const validIndividual = TenantOnboardingEngine.validateNationalIdentifier('0012345678');
      expect(validIndividual.type).toBe('INDIVIDUAL');

      // شناسه ملی حقوقی معتبر (۱۱ رقمی)
      const validLegal = TenantOnboardingEngine.validateNationalIdentifier('10100123456');
      expect(validLegal.type).toBe('LEGAL');

      // ورودی نامعتبر
      const invalid = TenantOnboardingEngine.validateNationalIdentifier('12345');
      expect(invalid.isValid).toBe(false);
    });

    it('should generate industry-specific Chart of Accounts for manufacturing and contracting', () => {
      const mfgAccounts = TenantOnboardingEngine.generateIndustryAccounts('MANUFACTURING');
      // باید حساب‌های بهای تمام شده، مواد اولیه و کالای در جریان ساخت داشته باشد
      expect(mfgAccounts.some((a) => a.code === '1504')).toBe(true); // مواد اولیه
      expect(mfgAccounts.some((a) => a.code === '1505')).toBe(true); // در جریان ساخت
      expect(mfgAccounts.some((a) => a.code === '7201')).toBe(true); // بهای تمام شده ساخت

      const contractingAccounts = TenantOnboardingEngine.generateIndustryAccounts('CONTRACTING');
      expect(contractingAccounts.some((a) => a.code === '1601')).toBe(true); // پیمان در جریان
      expect(contractingAccounts.some((a) => a.code === '1402')).toBe(true); // حسن انجام کار
      expect(contractingAccounts.some((a) => a.code === '6104')).toBe(true); // درآمد پیمانکاری
    });

    it('should provision trial subscription on new tenant registration', () => {
      const trial = TenantOnboardingEngine.createTrialSubscription('org-new-1', new Date('2026-03-01'), 14);
      expect(trial.status).toBe('TRIAL');
      expect(trial.planId).toBe('plan-free-trial');
      expect(new Date(trial.expiresAt).getTime() - new Date(trial.startedAt).getTime()).toBe(14 * 24 * 3600 * 1000);
    });
  });

  describe('Data Migration Engine (Sepidar / Rahkaran / Excel)', () => {
    it('should validate and parse account coding migration rows', () => {
      const rawAccounts = [
        { code: '1101', name: 'صندوق مرکزی ریالی', nature: 'بدهکار' },
        { code: '1102', name: 'تنخواه‌گردان دفتر مرکزی', nature: 'بدهکار' },
        { code: '4101', name: 'سرمایه اولیه سهامداران', nature: 'بستانکار' },
      ];

      const res = DataMigrationEngine.validateAccountsMigration('SEPIDAR', rawAccounts);
      expect(res.isValid).toBe(true);
      expect(res.validRows).toBe(3);
      expect(res.parsedData[0].code).toBe('1101');
      expect(res.parsedData[0].nature).toBe('DEBIT');
    });

    it('should reject invalid or duplicate account codes in migration', () => {
      const rawAccounts = [
        { code: '1101', name: 'صندوق اول' },
        { code: '1101', name: 'صندوق تکراری' }, // تکراری
        { code: '99', name: 'معین نامعتبر دو رقمی', type: 'SUBSIDIARY' }, // معین باید ۴ رقم باشد
      ];

      const res = DataMigrationEngine.validateAccountsMigration('CUSTOM_EXCEL', rawAccounts);
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate parties and reject negative credit limit or invalid national IDs', () => {
      const rawParties = [
        { name: 'شرکت پتروشیمی پویا', nationalId: '10100123456', creditLimit: '500000000' },
        { name: 'شخص با سقف منفی', creditLimit: '-100000' },
        { name: '', nationalId: '0012345678' }, // طرف‌حساب بدون نام
      ];

      const res = DataMigrationEngine.validatePartiesMigration('SEPIDAR', rawParties);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.field === 'creditLimit')).toBe(true);
      expect(res.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should strictly validate opening balance sheet and verify debits equal credits', () => {
      const balancedOpeningRows = [
        { subsidiaryCode: '1101', debit: '150000000', credit: '0', description: 'موجودی نقد صندوق' },
        { subsidiaryCode: '1103', debit: '350000000', credit: '0', description: 'موجودی حساب جاری بانک ملت' },
        { subsidiaryCode: '1501', debit: '500000000', credit: '0', description: 'موجودی کالای انبار' },
        { subsidiaryCode: '4101', debit: '0', credit: '1000000000', description: 'سرمایه ثبتی شرکا' },
      ];

      const resBalanced = DataMigrationEngine.validateOpeningBalances('RAHKARAN', balancedOpeningRows);
      expect(resBalanced.isValid).toBe(true);
      expect(resBalanced.balanceCheck?.isBalanced).toBe(true);
      expect(resBalanced.balanceCheck?.totalDebit).toBe('1000000000');
      expect(resBalanced.balanceCheck?.totalCredit).toBe('1000000000');
      expect(resBalanced.balanceCheck?.difference).toBe('0');

      // تست سند نامتعادل با اختلاف ۵۰,۰۰۰ ریال
      const unbalancedRows = [
        { subsidiaryCode: '1101', debit: '100000000', credit: '0' },
        { subsidiaryCode: '4101', debit: '0', credit: '100050000' },
      ];

      const resUnbalanced = DataMigrationEngine.validateOpeningBalances('CUSTOM_EXCEL', unbalancedRows);
      expect(resUnbalanced.isValid).toBe(false);
      expect(resUnbalanced.balanceCheck?.isBalanced).toBe(false);
      expect(resUnbalanced.balanceCheck?.difference).toBe('-50000');
      expect(resUnbalanced.errors[0].message).toContain('سند افتتاحیه تراز نیست');
    });
  });

  describe('Security & 2FA Engine (RFC 6238 TOTP)', () => {
    it('should generate valid Base32 secret and standard otpauth URL', () => {
      const secret = SecurityEngine.generateBase32Secret(20);
      expect(secret).toHaveLength(20);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);

      const otpUrl = SecurityEngine.generateOtpAuthUrl('IranAccountingSaaS', '09121112233', secret);
      expect(otpUrl).toContain('otpauth://totp/');
      expect(otpUrl).toContain(`secret=${secret}`);
      expect(otpUrl).toContain('digits=6');
    });

    it('should generate and verify 6-digit TOTP tokens accurately within time window', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const now = Date.now();
      const currentStep = Math.floor(Math.floor(now / 1000) / 30);
      const code = SecurityEngine.generateTotpForStep(secret, currentStep);

      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);

      // تایید توکن تولید شده
      const isVerified = SecurityEngine.verifyTotpCode(secret, code, 1, now);
      expect(isVerified).toBe(true);

      // رد توکن نامعتبر
      const isInvalid = SecurityEngine.verifyTotpCode(secret, '000000', 1, now);
      expect(isInvalid).toBe(false);
    });

    it('should generate one-time backup recovery codes with secure SHA-256 hashes', () => {
      const { plainCodes, hashedCodes } = SecurityEngine.generateBackupCodes(8);
      expect(plainCodes).toHaveLength(8);
      expect(hashedCodes).toHaveLength(8);
      expect(plainCodes[0]).toHaveLength(8);
      expect(hashedCodes[0]).toHaveLength(64); // SHA-256 hex string
    });

    it('should evaluate password strength conforming to AFTA security standards', () => {
      // رمز عبور قوی
      const strong = SecurityEngine.validatePasswordStrength('Hesabdar@2026!Sec');
      expect(strong.isValid).toBe(true);
      expect(strong.score).toBe(100);

      // رمز عبور ضعیف
      const weak = SecurityEngine.validatePasswordStrength('123456');
      expect(weak.isValid).toBe(false);
      expect(weak.errors.length).toBeGreaterThan(0);
    });
  });
});
