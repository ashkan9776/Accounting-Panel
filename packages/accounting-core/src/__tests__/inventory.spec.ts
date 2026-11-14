import {
  ValuationEngine,
  InventoryPostingEngine,
  ValuationMethod,
  StockLedgerState,
  JournalEngine,
  STANDARD_IRANIAN_SUBSIDIARIES
} from '../index';

describe('Inventory & Valuation Core Engine', () => {
  describe('Landed Cost Allocation (تسهیم هزینه‌های جانبی)', () => {
    it('should allocate freight proportionately based on purchase value', () => {
      // دو قلم کالا: کالای A به ارزش ۱,۰۰۰,۰۰۰ و کالای B به ارزش ۳,۰۰۰,۰۰۰ (مجموع ۴,۰۰۰,۰۰۰)
      // کل کرایه حمل: ۴۰۰,۰۰۰ ریال
      // سهم کالا A: ۲۵٪ از ۴۰۰,۰۰۰ = ۱۰۰,۰۰۰ ریال
      // سهم کالا B: ۷۵٪ از ۴۰۰,۰۰۰ = ۳۰۰,۰۰۰ ریال
      const results = ValuationEngine.allocateLandedCosts(
        [
          { productId: 'prod-A', quantity: '10', purchaseAmount: '1000000' },
          { productId: 'prod-B', quantity: '20', purchaseAmount: '3000000' }
        ],
        '400000'
      );

      expect(results).toHaveLength(2);
      expect(results[0].productId).toBe('prod-A');
      expect(results[0].originalUnitCost).toBe('100000');
      expect(results[0].allocatedFreightPerUnit).toBe('10000');
      expect(results[0].finalLandedUnitCost).toBe('110000');
      expect(results[0].totalLandedCost).toBe('1100000');

      expect(results[1].productId).toBe('prod-B');
      expect(results[1].originalUnitCost).toBe('150000');
      expect(results[1].allocatedFreightPerUnit).toBe('15000');
      expect(results[1].finalLandedUnitCost).toBe('165000');
      expect(results[1].totalLandedCost).toBe('3300000');
    });

    it('should return original cost when freight is zero', () => {
      const results = ValuationEngine.allocateLandedCosts(
        [{ productId: 'prod-A', quantity: '10', purchaseAmount: '1000000' }],
        '0'
      );
      expect(results[0].finalLandedUnitCost).toBe('100000');
      expect(results[0].totalLandedCost).toBe('1000000');
    });
  });

  describe('Moving Average Valuation (میانگین موزون متحرک)', () => {
    it('should calculate rolling moving average on receipt and issue correctly', () => {
      const state0: StockLedgerState = {
        productId: 'prod-1',
        warehouseId: 'wh-main',
        currentQuantity: '0',
        averageCost: '0',
        totalValue: '0',
        fifoLayers: []
      };

      // خرید اول: ۱۰۰ عدد با نرخ ۱۰,۰۰۰ ریال
      const step1 = ValuationEngine.processReceipt(
        state0,
        '100',
        '10000',
        ValuationMethod.MOVING_AVERAGE,
        '1403/01/10',
        'layer-1'
      );
      expect(step1.newQuantity).toBe('100');
      expect(step1.newAverageCost).toBe('10000');
      expect(step1.newTotalValue).toBe('1000000');

      // خرید دوم: ۱۰۰ عدد با نرخ ۱۲,۰۰۰ ریال
      // میانگین جدید = (۱,۰۰۰,۰۰۰ + ۱,۲۰۰,۰۰۰) / ۲۰۰ = ۱۱,۰۰۰ ریال
      const state1: StockLedgerState = {
        productId: 'prod-1',
        warehouseId: 'wh-main',
        currentQuantity: step1.newQuantity,
        averageCost: step1.newAverageCost,
        totalValue: step1.newTotalValue,
        fifoLayers: step1.updatedFifoLayers
      };

      const step2 = ValuationEngine.processReceipt(
        state1,
        '100',
        '12000',
        ValuationMethod.MOVING_AVERAGE,
        '1403/01/15',
        'layer-2'
      );
      expect(step2.newQuantity).toBe('200');
      expect(step2.newAverageCost).toBe('11000');
      expect(step2.newTotalValue).toBe('2200000');

      // خروج از انبار (فروش): ۵۰ عدد با نرخ میانگین ۱۱,۰۰۰ ریال
      // COGS = ۵۰ * ۱۱,۰۰۰ = ۵۵۰,۰۰۰ ریال
      // مانده: ۱۵۰ عدد با بهای ۱,۶۵۰,۰۰۰ ریال
      const state2: StockLedgerState = {
        productId: 'prod-1',
        warehouseId: 'wh-main',
        currentQuantity: step2.newQuantity,
        averageCost: step2.newAverageCost,
        totalValue: step2.newTotalValue,
        fifoLayers: step2.updatedFifoLayers
      };

      const step3 = ValuationEngine.processIssue(
        state2,
        '50',
        ValuationMethod.MOVING_AVERAGE
      );
      expect(step3.cogs.consumedQuantity).toBe('50');
      expect(step3.cogs.totalCogsAmount).toBe('550000');
      expect(step3.cogs.unitCost).toBe('11000');
      expect(step3.newQuantity).toBe('150');
      expect(step3.newAverageCost).toBe('11000');
      expect(step3.newTotalValue).toBe('1650000');
    });
  });

  describe('FIFO Valuation (اولین صادره از اولین وارده)', () => {
    it('should consume layers sequentially and calculate exact COGS', () => {
      const state0: StockLedgerState = {
        productId: 'prod-fifo',
        warehouseId: 'wh-main',
        currentQuantity: '0',
        averageCost: '0',
        totalValue: '0',
        fifoLayers: []
      };

      // لایه اول: ۱۰۰ عدد با نرخ ۱۰,۰۰۰ ریال
      const rec1 = ValuationEngine.processReceipt(
        state0,
        '100',
        '10000',
        ValuationMethod.FIFO,
        '1403/01/01',
        'fifo-l1'
      );

      // لایه دوم: ۱۰۰ عدد با نرخ ۱۲,۰۰۰ ریال
      const state1: StockLedgerState = {
        productId: 'prod-fifo',
        warehouseId: 'wh-main',
        currentQuantity: rec1.newQuantity,
        averageCost: rec1.newAverageCost,
        totalValue: rec1.newTotalValue,
        fifoLayers: rec1.updatedFifoLayers
      };

      const rec2 = ValuationEngine.processReceipt(
        state1,
        '100',
        '12000',
        ValuationMethod.FIFO,
        '1403/01/05',
        'fifo-l2'
      );

      expect(rec2.updatedFifoLayers).toHaveLength(2);
      expect(rec2.newQuantity).toBe('200');

      // خروج ۱۵۰ عدد:
      // ۱۰۰ عدد از لایه اول @ ۱۰,۰۰۰ = ۱,۰۰۰,۰۰۰
      // ۵۰ عدد از لایه دوم @ ۱۲,۰۰۰ = ۶۰۰,۰۰۰
      // مجموع بهای تمام شده = ۱,۶۰۰,۰۰۰
      const state2: StockLedgerState = {
        productId: 'prod-fifo',
        warehouseId: 'wh-main',
        currentQuantity: rec2.newQuantity,
        averageCost: rec2.newAverageCost,
        totalValue: rec2.newTotalValue,
        fifoLayers: rec2.updatedFifoLayers
      };

      const issue = ValuationEngine.processIssue(
        state2,
        '150',
        ValuationMethod.FIFO
      );

      expect(issue.cogs.consumedQuantity).toBe('150');
      expect(issue.cogs.totalCogsAmount).toBe('1600000');
      expect(issue.newQuantity).toBe('50');
      expect(issue.updatedFifoLayers).toHaveLength(1);
      expect(issue.updatedFifoLayers[0].layerId).toBe('fifo-l2');
      expect(issue.updatedFifoLayers[0].remainingQuantity).toBe('50');
      expect(issue.newTotalValue).toBe('600000');
    });
  });

  describe('Inventory Discrepancy Calculation (مغایرت انبارگردانی)', () => {
    it('should detect deficit correctly', () => {
      const res = ValuationEngine.calculateInventoryDiscrepancy('100', '95', '10000');
      expect(res.discrepancyQuantity).toBe('-5');
      expect(res.isDeficit).toBe(true);
      expect(res.isSurplus).toBe(false);
      expect(res.totalDiscrepancyValue).toBe('50000');
    });

    it('should detect surplus correctly', () => {
      const res = ValuationEngine.calculateInventoryDiscrepancy('100', '108', '10000');
      expect(res.discrepancyQuantity).toBe('8');
      expect(res.isDeficit).toBe(false);
      expect(res.isSurplus).toBe(true);
      expect(res.totalDiscrepancyValue).toBe('80000');
    });
  });

  describe('InventoryPostingEngine (اسناد دوبل حسابداری)', () => {
    it('should create balanced purchase invoice journal lines with freight and VAT', () => {
      const lines = InventoryPostingEngine.buildPurchaseInvoiceLines({
        supplierPartyDimensionId: 'party-supp-1',
        inventoryAmount: '10000000', // ۱۰ میلیون خرید کالا
        freightAmount: '500000',    // ۵۰۰ هزار کرایه حمل
        freightPayeePartyDimensionId: 'party-freight-1', // باربری جداگانه
        vatAmount: '1000000',       // ۱ میلیون مالیات ارزش افزوده
        invoiceNumber: 'PINV-101'
      });

      expect(lines).toHaveLength(4);
      // موجودی کالا (۱۰.۵ میلیون)
      expect(lines[0].subsidiaryAccountId).toBe('sub-1501');
      expect(lines[0].debit).toBe('10500000');
      // اعتبار ارزش افزوده خرید (۱ میلیون)
      expect(lines[1].subsidiaryAccountId).toBe('sub-1403');
      expect(lines[1].debit).toBe('1000000');
      // تامین کننده (۱۱ میلیون: ۱۰ میلیون کالا + ۱ میلیون ارزش افزوده)
      expect(lines[2].subsidiaryAccountId).toBe('sub-3201');
      expect(lines[2].credit).toBe('11000000');
      expect(lines[2].floatingDimension1Id).toBe('party-supp-1');
      // باربری (۵۰۰ هزار)
      expect(lines[3].subsidiaryAccountId).toBe('sub-3201');
      expect(lines[3].credit).toBe('500000');
      expect(lines[3].floatingDimension1Id).toBe('party-freight-1');

      // اعتبارسنجی تراز و قواعد اسناد دوبل
      const validation = JournalEngine.validateLines(lines);
      expect(validation.totalDebit.toFixed(0)).toBe('11500000');
      expect(validation.totalCredit.toFixed(0)).toBe('11500000');
    });

    it('should create balanced sales invoice journal lines with discount and VAT', () => {
      const lines = InventoryPostingEngine.buildSalesInvoiceLines({
        customerPartyDimensionId: 'party-cust-1',
        grossSalesAmount: '10000000', // ۱۰ میلیون ناخالص
        discountAmount: '500000',    // ۵۰۰ هزار تخفیف
        vatAmount: '950000',         // ۹۵۰ هزار ارزش افزوده (۱۰٪ بر ۹.۵ میلیون خالص)
        invoiceNumber: 'SINV-201'
      });

      expect(lines).toHaveLength(4);
      // بدهکاران تجاری: ۱۰,۴۵۰,۰۰۰
      expect(lines[0].subsidiaryAccountId).toBe('sub-1301');
      expect(lines[0].debit).toBe('10450000');
      // تخفیف فروش: ۵۰۰,۰۰۰
      expect(lines[1].subsidiaryAccountId).toBe('sub-6201');
      expect(lines[1].debit).toBe('500000');
      // درآمد فروش: ۱۰,۰۰۰,۰۰۰
      expect(lines[2].subsidiaryAccountId).toBe('sub-6101');
      expect(lines[2].credit).toBe('10000000');
      // ارزش افزوده فروش: ۹۵۰,۰۰۰
      expect(lines[3].subsidiaryAccountId).toBe('sub-3306');
      expect(lines[3].credit).toBe('950000');

      const validation = JournalEngine.validateLines(lines);
      expect(validation.totalDebit.toFixed(0)).toBe('10950000');
      expect(validation.totalCredit.toFixed(0)).toBe('10950000');
    });

    it('should create balanced COGS journal lines', () => {
      const lines = InventoryPostingEngine.buildCogsLines({
        cogsAmount: '6500000',
        documentNumber: 'SINV-201'
      });

      expect(lines).toHaveLength(2);
      expect(lines[0].subsidiaryAccountId).toBe('sub-7101');
      expect(lines[0].debit).toBe('6500000');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1501');
      expect(lines[1].credit).toBe('6500000');

      const validation = JournalEngine.validateLines(lines);
      expect(validation.totalDebit.toFixed(0)).toBe('6500000');
      expect(validation.totalCredit.toFixed(0)).toBe('6500000');
    });

    it('should create balanced sales return lines and inventory restock lines', () => {
      const res = InventoryPostingEngine.buildSalesReturnLines({
        customerPartyDimensionId: 'party-cust-1',
        returnedSalesAmount: '2000000',
        returnedVatAmount: '200000',
        returnedCogsAmount: '1300000',
        documentNumber: 'RET-01'
      });

      const finVal = JournalEngine.validateLines(res.financialLines);
      expect(finVal.totalDebit.toFixed(0)).toBe('2200000');
      expect(finVal.totalCredit.toFixed(0)).toBe('2200000');

      const invVal = JournalEngine.validateLines(res.inventoryLines);
      expect(invVal.totalDebit.toFixed(0)).toBe('1300000');
      expect(invVal.totalCredit.toFixed(0)).toBe('1300000');
    });

    it('should create balanced inventory discrepancy adjustment lines for deficit and surplus', () => {
      // تست کسری انبار
      const deficitLines = InventoryPostingEngine.buildInventoryCountAdjustmentLines({
        isDeficit: true,
        discrepancyValue: '250000',
        countNumber: 'COUNT-1403-01'
      });
      const defVal = JournalEngine.validateLines(deficitLines);
      expect(defVal.totalDebit.toFixed(0)).toBe('250000');
      expect(deficitLines[0].subsidiaryAccountId).toBe('sub-8108'); // هزینه کسری انبار
      expect(deficitLines[1].subsidiaryAccountId).toBe('sub-1501'); // موجودی کالا

      // تست فزونی انبار
      const surplusLines = InventoryPostingEngine.buildInventoryCountAdjustmentLines({
        isDeficit: false,
        discrepancyValue: '180000',
        countNumber: 'COUNT-1403-01'
      });
      const surVal = JournalEngine.validateLines(surplusLines);
      expect(surVal.totalDebit.toFixed(0)).toBe('180000');
      expect(surplusLines[0].subsidiaryAccountId).toBe('sub-1501'); // موجودی کالا
      expect(surplusLines[1].subsidiaryAccountId).toBe('sub-6105'); // درآمد فزونی انبار
    });
  });
});
