import {
  DepreciationEngine,
  AssetPostingEngine,
  AssetCategory,
  DepreciationMethod
} from '../assets';
import Decimal from 'decimal.js';

describe('Fixed Assets & Depreciation Engine (دارایی‌های ثابت و استهلاک ماده ۱۴۹)', () => {
  it('۱. محاسبه استهلاک خط مستقیم بر مبنای عمر مفید (سال)', () => {
    // سرور اداری به ارزش ۲۴۰ میلیون ریال با عمر مفید ۴ سال (۴۸ ماه)
    const result = DepreciationEngine.calculatePeriodicDepreciation({
      asset: {
        assetCode: 'AST-101',
        title: 'سرور اداری HP ProLiant',
        category: AssetCategory.FURNITURE_OFFICE,
        purchaseDateShamsi: '1403/01/01',
        historicalCost: '240000000',
        salvageValue: '0',
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
        usefulLifeYears: 4
      },
      previousAccumulatedDepreciation: '0',
      monthsCount: 1,
      periodDateShamsi: '1403/01/31'
    });

    // استهلاک یک ماه = 240,000,000 / 48 = 5,000,000 ریال
    expect(result.periodDepreciationAmount).toBe('5000000');
    expect(result.accumulatedDepreciationAfter).toBe('5000000');
    expect(result.closingBookValue).toBe('235000000');
    expect(result.isFullyDepreciated).toBe(false);
  });

  it('۲. محاسبه استهلاک خط مستقیم بر مبنای نرخ درصدی سالانه با ارزش اسقاط', () => {
    // دستگاه خودرو اداری به بهای ۵۰۰ میلیون ریال با ۱۰٪ ارزش اسقاط (۵۰ میلیون) و نرخ سالانه ۲۰٪
    const result = DepreciationEngine.calculatePeriodicDepreciation({
      asset: {
        assetCode: 'VEH-01',
        title: 'وانت پراید پخش',
        category: AssetCategory.VEHICLES,
        purchaseDateShamsi: '1403/01/01',
        historicalCost: '500000000',
        salvageValue: '50000000',
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
        annualRatePercentage: '20'
      },
      previousAccumulatedDepreciation: '0',
      monthsCount: 1,
      periodDateShamsi: '1403/01/31'
    });

    // مبنای استهلاک = 450,000,000 * 20% = 90,000,000 سالانه / 12 = 7,500,000 ماهانه
    expect(result.periodDepreciationAmount).toBe('7500000');
    expect(result.accumulatedDepreciationAfter).toBe('7500000');
    expect(result.closingBookValue).toBe('492500000');
  });

  it('۳. عدم کسر استهلاک مازاد بر ارزش اسقاط پس از استهلاک کامل', () => {
    // دارایی که تنها ۱ میلیون ریال تا ارزش اسقاط فاصله دارد
    const result = DepreciationEngine.calculatePeriodicDepreciation({
      asset: {
        assetCode: 'AST-102',
        title: 'رایانه رومیزی قدیمی',
        category: AssetCategory.FURNITURE_OFFICE,
        purchaseDateShamsi: '1399/01/01',
        historicalCost: '100000000',
        salvageValue: '5000000',
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
        annualRatePercentage: '25'
      },
      previousAccumulatedDepreciation: '94000000', // مانده ارزش دفتری ۶ میلیون است
      monthsCount: 1,
      periodDateShamsi: '1403/01/31'
    });

    // استهلاک عادی ۲ میلیون می‌شد، اما فقط ۱ میلیون تا رسیدن به ارزش اسقاط (۵ میلیون) مجاز است
    expect(result.periodDepreciationAmount).toBe('1000000');
    expect(result.accumulatedDepreciationAfter).toBe('95000000');
    expect(result.closingBookValue).toBe('5000000');
    expect(result.isFullyDepreciated).toBe(true);
  });

  it('۴. محاسبه سود ناشی از واگذاری و فروش دارایی ثابت', () => {
    // بهای تمام‌شده ۱۰۰ میلیون، استهلاک انباشته ۶۰ میلیون (ارزش دفتری ۴۰ میلیون)، فروش به مبلغ ۵۵ میلیون (۱۵ میلیون سود)
    const disposal = DepreciationEngine.calculateDisposal({
      assetId: 'ast-01',
      assetCode: 'AST-103',
      disposalDateShamsi: '1403/08/15',
      historicalCost: '100000000',
      accumulatedDepreciation: '60000000',
      salePrice: '55000000'
    });

    expect(disposal.bookValueAtDisposal).toBe('40000000');
    expect(disposal.isGain).toBe(true);
    expect(disposal.gainOrLossAmount).toBe('15000000');

    // سند حسابداری واگذاری
    const lines = AssetPostingEngine.buildDisposalLines({
      disposalResult: disposal,
      category: AssetCategory.FURNITURE_OFFICE
    });

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const l of lines) {
      totalDebit = totalDebit.plus(l.debit);
      totalCredit = totalCredit.plus(l.credit);
    }
    // تراز ۱۰۰٪
    expect(totalDebit.toFixed(0)).toBe(totalCredit.toFixed(0));

    const creditGain = lines.find((l) => l.subsidiaryAccountId === 'sub-6106');
    expect(creditGain).toBeDefined();
    expect(creditGain?.credit).toBe('15000000');
  });

  it('۵. محاسبه زیان ناشی از واگذاری و فروش دارایی ثابت', () => {
    // بهای تمام‌شده ۱۰۰ میلیون، استهلاک انباشته ۵۰ میلیون (ارزش دفتری ۵۰ میلیون)، فروش به مبلغ ۳۵ میلیون (۱۵ میلیون زیان)
    const disposal = DepreciationEngine.calculateDisposal({
      assetId: 'ast-02',
      assetCode: 'AST-104',
      disposalDateShamsi: '1403/08/20',
      historicalCost: '100000000',
      accumulatedDepreciation: '50000000',
      salePrice: '35000000'
    });

    expect(disposal.bookValueAtDisposal).toBe('50000000');
    expect(disposal.isGain).toBe(false);
    expect(disposal.gainOrLossAmount).toBe('15000000');

    // سند حسابداری واگذاری
    const lines = AssetPostingEngine.buildDisposalLines({
      disposalResult: disposal,
      category: AssetCategory.FURNITURE_OFFICE
    });

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const l of lines) {
      totalDebit = totalDebit.plus(l.debit);
      totalCredit = totalCredit.plus(l.credit);
    }
    expect(totalDebit.toFixed(0)).toBe(totalCredit.toFixed(0));

    const debitLoss = lines.find((l) => l.subsidiaryAccountId === 'sub-8110');
    expect(debitLoss).toBeDefined();
    expect(debitLoss?.debit).toBe('15000000');
  });
});
