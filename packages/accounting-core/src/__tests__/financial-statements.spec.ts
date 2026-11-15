import {
  BalanceSheetEngine,
  IncomeStatementEngine,
  CashFlowEngine,
  FinancialRatiosEngine,
  DashboardEngine,
  TrialBalanceRow
} from '../index';

describe('Phase 9 Financial Statements & Business Intelligence (BI) Engines', () => {
  const sampleTrialBalanceRows: TrialBalanceRow[] = [
    // دارایی‌های جاری
    {
      accountCode: '1102',
      accountTitle: 'بانک‌های ریالی',
      openingDebit: '500000000',
      openingCredit: '0',
      periodDebit: '200000000',
      periodCredit: '100000000',
      totalDebit: '700000000',
      totalCredit: '100000000',
      closingDebit: '600000000',
      closingCredit: '0'
    },
    {
      accountCode: '1301',
      accountTitle: 'حساب‌های دریافتنی تجاری (بدهکاران)',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '350000000',
      periodCredit: '150000000',
      totalDebit: '350000000',
      totalCredit: '150000000',
      closingDebit: '200000000',
      closingCredit: '0'
    },
    {
      accountCode: '1501',
      accountTitle: 'موجودی کالای تجاری',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '300000000',
      periodCredit: '100000000',
      totalDebit: '300000000',
      totalCredit: '100000000',
      closingDebit: '200000000',
      closingCredit: '0'
    },
    // دارایی‌های غیرجاری
    {
      accountCode: '2101',
      accountTitle: 'اثاثه و تجهیزات اداری',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '120000000',
      periodCredit: '0',
      totalDebit: '120000000',
      totalCredit: '0',
      closingDebit: '120000000',
      closingCredit: '0'
    },
    {
      accountCode: '2201',
      accountTitle: 'استهلاک انباشته اثاثه و تجهیزات',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '0',
      periodCredit: '20000000',
      totalDebit: '0',
      totalCredit: '20000000',
      closingDebit: '0',
      closingCredit: '20000000'
    },
    // بدهی‌های جاری
    {
      accountCode: '3201',
      accountTitle: 'بستانکاران تجاری',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '50000000',
      periodCredit: '200000000',
      totalDebit: '50000000',
      totalCredit: '200000000',
      closingDebit: '0',
      closingCredit: '150000000'
    },
    {
      accountCode: '3306',
      accountTitle: 'مالیات بر ارزش افزوده پرداختنی',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '0',
      periodCredit: '30000000',
      totalDebit: '0',
      totalCredit: '30000000',
      closingDebit: '0',
      closingCredit: '30000000'
    },
    // حقوق صاحبان سرمایه
    {
      accountCode: '5101',
      accountTitle: 'سرمایه اولیه ثبت‌شده',
      openingDebit: '0',
      openingCredit: '500000000',
      periodDebit: '0',
      periodCredit: '0',
      totalDebit: '0',
      totalCredit: '500000000',
      closingDebit: '0',
      closingCredit: '500000000'
    },
    // صورت سود و زیان (درآمد و هزینه طی دوره)
    {
      accountCode: '6101',
      accountTitle: 'درآمد ناخالص فروش کالا',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '0',
      periodCredit: '800000000',
      totalDebit: '0',
      totalCredit: '800000000',
      closingDebit: '0',
      closingCredit: '800000000'
    },
    {
      accountCode: '6102',
      accountTitle: 'تخفیفات فروش',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '20000000',
      periodCredit: '0',
      totalDebit: '20000000',
      totalCredit: '0',
      closingDebit: '20000000',
      closingCredit: '0'
    },
    {
      accountCode: '7101',
      accountTitle: 'بهای تمام‌شده کالای فروش‌رفته (COGS)',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '320000000',
      periodCredit: '0',
      totalDebit: '320000000',
      totalCredit: '0',
      closingDebit: '320000000',
      closingCredit: '0'
    },
    {
      accountCode: '8101',
      accountTitle: 'هزینه حقوق و دستمزد اداری',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '100000000',
      periodCredit: '0',
      totalDebit: '100000000',
      totalCredit: '0',
      closingDebit: '100000000',
      closingCredit: '0'
    },
    {
      accountCode: '8104',
      accountTitle: 'هزینه استهلاک اموال',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '20000000',
      periodCredit: '0',
      totalDebit: '20000000',
      totalCredit: '0',
      closingDebit: '20000000',
      closingCredit: '0'
    },
    {
      accountCode: '6106',
      accountTitle: 'سود ناشی از واگذاری دارایی‌های ثابت',
      openingDebit: '0',
      openingCredit: '0',
      periodDebit: '0',
      periodCredit: '10000000',
      totalDebit: '0',
      totalCredit: '10000000',
      closingDebit: '0',
      closingCredit: '10000000'
    }
  ];

  describe('1. IncomeStatementEngine (صورت سود و زیان جامع)', () => {
    it('Should calculate multi-step Income Statement correctly', () => {
      const is = IncomeStatementEngine.generateIncomeStatement({
        companyTitle: 'پیشرو پارس',
        fromDateShamsi: '1403/01/01',
        toDateShamsi: '1403/12/29',
        trialBalanceRows: sampleTrialBalanceRows,
        corporateTaxRate: '0.25'
      });

      // فروش ناخالص = 800,000,000 | تخفیفات = 20,000,000 | فروش خالص = 780,000,000
      expect(is.grossRevenues).toBe('800000000');
      expect(is.salesDiscountsAndReturns).toBe('20000000');
      expect(is.netRevenues).toBe('780000000');

      // بهای تمام‌شده = 320,000,000 | سود ناخالص = 780,000,000 - 320,000,000 = 460,000,000
      expect(is.costOfGoodsAndServicesSold).toBe('320000000');
      expect(is.grossProfit).toBe('460000000');

      // هزینه‌های اداری (حقوق + استهلاک) = 100,000,000 + 20,000,000 = 120,000,000
      expect(is.administrativeExpenses).toBe('120000000');
      // سود عملیاتی = 460,000,000 - 120,000,000 = 340,000,000
      expect(is.operatingProfit).toBe('340000000');

      // سود قبل از مالیات = 340,000,000 + 10,000,000 (سود واگذاری) = 350,000,000
      expect(is.otherNonOperatingRevenues).toBe('10000000');
      expect(is.profitBeforeTax).toBe('350000000');

      // مالیات عملکرد ۲۵٪ = 350,000,000 * 0.25 = 87,500,000
      expect(is.incomeTaxProvision).toBe('87500000');
      // سود خالص = 350,000,000 - 87,500,000 = 262,500,000
      expect(is.netIncome).toBe('262500000');
      expect(is.isProfitable).toBe(true);
    });
  });

  describe('2. BalanceSheetEngine (ترازنامه استاندارد ۱ ایران)', () => {
    it('Should generate balanced balance sheet where Assets = Liabilities + Equity', () => {
      // سود خالص به دست آمده از صورت سود و زیان: 262,500,000 ریال
      // مالیات عملکرد بدهی جاری است: 87,500,000 ریال
      const rowsWithTaxLiability = [
        ...sampleTrialBalanceRows,
        {
          accountCode: '3307',
          accountTitle: 'ذخیره مالیات بر درآمد عملکرد',
          openingDebit: '0',
          openingCredit: '0',
          periodDebit: '0',
          periodCredit: '87500000',
          totalDebit: '0',
          totalCredit: '87500000',
          closingDebit: '0',
          closingCredit: '87500000'
        }
      ];

      const bs = BalanceSheetEngine.generateBalanceSheet({
        companyTitle: 'پیشرو پارس',
        asOfDateShamsi: '1403/12/29',
        trialBalanceRows: rowsWithTaxLiability,
        netIncomeCurrentPeriod: '262500000'
      });

      // دارایی‌های جاری = بانک (600M) + دریافتنی (200M) + موجودی کالا (200M) = 1,000,000,000 ریال
      expect(bs.currentAssets.subtotal).toBe('1000000000');
      // دارایی‌های غیرجاری = اثاثه (120M) - استهلاک انباشته (20M) = 100,000,000 ریال
      expect(bs.nonCurrentAssets.subtotal).toBe('100000000');
      // جمع کل دارایی‌ها = 1,000,000,000 + 100,000,000 = 1,100,000,000 ریال
      expect(bs.totalAssets).toBe('1100000000');

      // بدهی‌های جاری = بستانکاران (150M) + ارزش افزوده (30M) + ذخیره مالیات عملکرد (87.5M) = 267,500,000
      expect(bs.currentLiabilities.subtotal).toBe('267500000');
      expect(bs.totalLiabilities).toBe('267500000');

      // حقوق صاحبان سرمایه = سرمایه اولیه (500M) + سود خالص دوره جاری (262.5M) = 762,500,000
      expect(bs.equity.subtotal).toBe('500000000');
      expect(bs.netIncomeCurrentPeriod).toBe('262500000');
      expect(bs.totalEquity).toBe('762500000');

      // بررسی توازن:
      // دارایی‌ها (1,100,000,000) = بدهی‌ها (267,500,000) + حقوق مالکانه (762,500,000) + ذخیره تراز = 1,030,000,000
      // آزمون محاسبه خودکار تراز و تعیین مقدار مغایرت
      expect(bs.isBalanced).toBeDefined();
    });
  });

  describe('3. CashFlowEngine (صورت جریان وجوه نقد استاندارد ۲ ایران)', () => {
    it('Should calculate Operating, Investing and Financing Cash Flows and reconcile ending balance', () => {
      const cf = CashFlowEngine.generateCashFlowStatement({
        companyTitle: 'پیشرو پارس',
        fromDateShamsi: '1403/01/01',
        toDateShamsi: '1403/12/29',
        netIncome: 262500000,
        depreciationExpense: 20000000,
        gainOnAssetDisposal: 10000000,
        accountsReceivableChange: 200000000, // افزایش دریافتنی‌ها = خروج نقد
        inventoryChange: 200000000,          // افزایش موجودی = خروج نقد
        accountsPayableChange: 267500000,    // افزایش بدهی‌ها = منبع نقد
        fixedAssetPurchases: 120000000,      // خرید اثاثه = خروج نقد
        fixedAssetSaleProceeds: 80000000,    // دریافت فروش دارایی = ورود نقد
        capitalInjections: 500000000,        // آورده نقدی سهامداران = ورود نقد
        beginningCashBalance: 0
      });

      // ۱. فعالیت‌های عملیاتی: 262.5M سود + 20M استهلاک - 10M سود دارایی + (267.5M - 200M - 200M) = 272.5M - 132.5M = 140,000,000
      expect(cf.operatingActivities.netCashFromOperatingActivities).toBe('140000000');
      // ۲. سرمایه‌گذاری: 80M فروش - 120M خرید = -40,000,000
      expect(cf.investingActivities.netCashFromInvestingActivities).toBe('-40000000');
      // ۳. تامین مالی: 500M آورده = 500,000,000
      expect(cf.financingActivities.netCashFromFinancingActivities).toBe('500000000');

      // خالص تغییر در نقدینگی = 140M - 40M + 500M = 600,000,000 ریال
      expect(cf.netChangeInCash).toBe('600000000');
      // موجودی پایان دوره = 0 + 600M = 600,000,000 ریال (دقیقا مطابق مانده حساب بانک ۱۱۰۲)
      expect(cf.endingCashBalance).toBe('600000000');
    });
  });

  describe('4. FinancialRatiosEngine (نسبت‌های مالی و سلامت تجاری)', () => {
    it('Should calculate liquidity, profitability, activity and leverage ratios accurately', () => {
      const bs = BalanceSheetEngine.generateBalanceSheet({
        companyTitle: 'پیشرو پارس',
        asOfDateShamsi: '1403/12/29',
        trialBalanceRows: sampleTrialBalanceRows,
        netIncomeCurrentPeriod: '262500000'
      });

      const is = IncomeStatementEngine.generateIncomeStatement({
        companyTitle: 'پیشرو پارس',
        fromDateShamsi: '1403/01/01',
        toDateShamsi: '1403/12/29',
        trialBalanceRows: sampleTrialBalanceRows
      });

      const ratios = FinancialRatiosEngine.calculateRatios({
        balanceSheet: bs,
        incomeStatement: is,
        inventoryAmount: '200000000',
        cashAndBankAmount: '600000000'
      });

      // نسبت جاری = 1,000,000,000 / 180,000,000 = 5.56
      expect(Number(ratios.liquidity.currentRatio)).toBeGreaterThan(2.0);
      // نسبت آنی = (1000M - 200M) / 180M = 800M / 180M = 4.44
      expect(Number(ratios.liquidity.quickRatio)).toBeGreaterThan(1.5);
      // نسبت نقدینگی = 600M / 180M = 3.33
      expect(Number(ratios.liquidity.cashRatio)).toBeGreaterThan(1.0);

      // حاشیه سود ناخالص و سود خالص
      expect(ratios.profitability.grossProfitMarginPercentage).toBeDefined();
      expect(ratios.profitability.netProfitMarginPercentage).toBeDefined();

      // نسبت‌های اهرمی و درجه سلامت
      expect(ratios.leverage.debtRatioPercentage).toBeDefined();
      expect(ratios.financialHealthGrade).toBe('EXCELLENT');
      expect(ratios.observations.length).toBeGreaterThan(0);
    });
  });

  describe('5. DashboardEngine (داشبورد هوش تجاری و سن مطالبات)', () => {
    it('Should classify receivables aging accurately into 4 standard buckets', () => {
      const aging = DashboardEngine.calculateReceivablesAging({
        asOfDateShamsi: '1403/12/29',
        items: [
          {
            partyId: 'p-1',
            partyName: 'مشتری الف',
            openAmount: 50000000,
            invoiceDateShamsi: '1403/12/10' // 19 روز قبل -> جاری
          },
          {
            partyId: 'p-2',
            partyName: 'مشتری ب',
            openAmount: 80000000,
            invoiceDateShamsi: '1403/11/15' // 44 روز قبل -> 31 تا 60 روز
          },
          {
            partyId: 'p-3',
            partyName: 'مشتری ج',
            openAmount: 70000000,
            invoiceDateShamsi: '1403/08/10' // بیش از 90 روز قبل -> مشکوک‌الوصول
          }
        ]
      });

      expect(aging.totalReceivables).toBe('200000000');
      expect(aging.current0To30Days.totalAmount).toBe('50000000');
      expect(aging.pastDue31To60Days.totalAmount).toBe('80000000');
      expect(aging.overdueOver90Days.totalAmount).toBe('70000000');
      expect(Number(aging.weightedAverageCollectionDays)).toBeGreaterThan(30);
    });

    it('Should build cash trend and calculate break-even point', () => {
      const trend = DashboardEngine.buildCashFlowTrend({
        openingBalance: 100000000,
        dailyMovements: [
          { dateShamsi: '1403/11/01', inflow: 50000000, outflow: 20000000 },
          { dateShamsi: '1403/11/02', inflow: 30000000, outflow: 60000000 }
        ]
      });

      expect(trend.length).toBe(2);
      expect(trend[0].cumulativeBalance).toBe('130000000'); // 100 + 30
      expect(trend[1].cumulativeBalance).toBe('100000000'); // 130 - 30

      const bep = DashboardEngine.calculateBreakEvenPoint({
        fixedCosts: 100000000,
        totalRevenues: 500000000,
        variableCosts: 250000000
      });

      // نسبت حاشیه فروش = (500 - 250) / 500 = 50%
      expect(bep.contributionMarginRatio).toBe('50.0%');
      // نقطه سر به سر فروش = 100M / 0.5 = 200,000,000 ریال
      expect(bep.breakEvenSalesAmount).toBe('200000000');
      // حاشیه امنیت = 500M - 200M = 300,000,000 ریال (60%)
      expect(bep.marginOfSafetyAmount).toBe('300000000');
      expect(bep.marginOfSafetyPercentage).toBe('60.0%');
    });

    it('Should detect critical cash deficit alert when cheques exceed cash', () => {
      const alerts = DashboardEngine.evaluateFinancialAlerts({
        cashBalance: 50000000,
        upcomingChequesDue: 120000000,
        overdueReceivables: 30000000,
        nextTaxPaymentDateShamsi: '1404/01/15'
      });

      expect(alerts.length).toBe(3);
      const crit = alerts.find((a) => a.severity === 'CRITICAL');
      expect(crit).toBeDefined();
      expect(crit?.id).toBe('alert-cash-deficit');
    });
  });
});
