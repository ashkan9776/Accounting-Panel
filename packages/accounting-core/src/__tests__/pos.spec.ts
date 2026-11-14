import {
  BarcodeScaleParser,
  PosPostingEngine,
  JournalEngine
} from '../index';

describe('POS & Retail Store Core Engine (ماژول فروشگاهی و صندوق POS)', () => {
  describe('BarcodeScaleParser (بارکدخوان و ترازوی دیجیتال وزنی)', () => {
    it('should parse weight-based EAN-13 digital scale barcode correctly', () => {
      // بارکد ترازویی: پیشوند ۲۱، کد کالای 00105 (مثلاً گوشت یا میوه)، وزن ۱۵۰۰ گرم (۱.۵ کیلوگرم)
      const barcode = '2100105015003';
      const parsed = BarcodeScaleParser.parse(barcode);

      expect(parsed.isWeightBarcode).toBe(true);
      expect(parsed.productCode).toBe('00105');
      expect(parsed.weightGrams).toBe(1500);
      expect(parsed.weightKg).toBe('1.500');

      // محاسبه قیمت با نرخ ۲۰۰,۰۰۰ ریال به ازای هر کیلو
      const calculated = BarcodeScaleParser.calculateScaleItemPrice(parsed.weightKg!, '200000');
      expect(calculated.totalPrice).toBe('300000');
      expect(calculated.weightKgFormatted).toBe('1.500');
    });

    it('should identify normal non-scale barcode as standard product', () => {
      const barcode = '6921234567890';
      const parsed = BarcodeScaleParser.parse(barcode);

      expect(parsed.isWeightBarcode).toBe(false);
      expect(parsed.productCode).toBe('6921234567890');
    });
  });

  describe('PosPostingEngine (سند دوبل تجمیعی روزانه / پایان شیفت)', () => {
    it('should create balanced daily consolidated shift journal entry with cash, card, discount, and VAT', () => {
      // فروش شیفت:
      // ناخالص فروش: ۱۰,۰۰۰,۰۰۰ ریال
      // تخفیف: ۱,۰۰۰,۰۰۰ ریال (خالص فروش مشمول مالیات: ۹,۰۰۰,۰۰۰ ریال)
      // ارزش افزوده ۱۰٪: ۹۰۰,۰۰۰ ریال
      // کل مبلغ قابل دریافت: ۹,۹۰۰,۰۰۰ ریال (۴,۰۰۰,۰۰۰ ریال نقد در صندوق + ۵,۹۰۰,۰۰۰ ریال کارتخوان)
      const lines = PosPostingEngine.buildConsolidatedShiftLines({
        shiftNumber: 'SHIFT-1403-101',
        dateShamsi: '1403/11/20',
        cashDeskDimensionId: 'dim-cash-1',
        posTerminalDimensionId: 'dim-pos-1',
        totalCashSales: '4000000',
        totalPosCardSales: '5900000',
        totalDiscount: '1000000',
        totalGrossSales: '10000000',
        totalVat: '900000'
      });

      expect(lines).toHaveLength(5);
      // ۱. بدهکار صندوق: ۴ میلیون
      expect(lines[0].subsidiaryAccountId).toBe('sub-1101');
      expect(lines[0].debit).toBe('4000000');
      // ۲. بدهکار وجوه در راه کارتخوان: ۵.۹ میلیون
      expect(lines[1].subsidiaryAccountId).toBe('sub-1104');
      expect(lines[1].debit).toBe('5900000');
      // ۳. بدهکار تخفیفات نقدی: ۱ میلیون
      expect(lines[2].subsidiaryAccountId).toBe('sub-6201');
      expect(lines[2].debit).toBe('1000000');
      // ۴. بستانکار درآمد فروش: ۱۰ میلیون
      expect(lines[3].subsidiaryAccountId).toBe('sub-6101');
      expect(lines[3].credit).toBe('10000000');
      // ۵. بستانکار ارزش افزوده فروش: ۹۰۰ هزار
      expect(lines[4].subsidiaryAccountId).toBe('sub-3306');
      expect(lines[4].credit).toBe('900000');

      // اعتبارسنجی توازن ریاضی سند با موتور دوطرفه حسابداری
      const validation = JournalEngine.validateLines(lines);
      expect(validation.totalDebit.toFixed(0)).toBe('10900000');
      expect(validation.totalCredit.toFixed(0)).toBe('10900000');
    });

    it('should create balanced consolidated COGS journal entry for the shift', () => {
      const cogsLines = PosPostingEngine.buildConsolidatedCogsLines(
        'SHIFT-1403-101',
        '1403/11/20',
        '6500000'
      );

      expect(cogsLines).toHaveLength(2);
      expect(cogsLines[0].subsidiaryAccountId).toBe('sub-7101'); // بدهکار بهای تمام شده
      expect(cogsLines[0].debit).toBe('6500000');
      expect(cogsLines[1].subsidiaryAccountId).toBe('sub-1501'); // بستانکار موجودی کالا
      expect(cogsLines[1].credit).toBe('6500000');

      const validation = JournalEngine.validateLines(cogsLines);
      expect(validation.totalDebit.toFixed(0)).toBe('6500000');
      expect(validation.totalCredit.toFixed(0)).toBe('6500000');
    });

    it('should create balanced cash deficit and surplus discrepancy lines', () => {
      // حالت اول: کسری نقد صندوق (شمارش واقعی کمتر از انتظار دفتری: -۱۰۰,۰۰۰ ریال)
      const deficitLines = PosPostingEngine.buildCashDiscrepancyLines(
        'SHIFT-1403-101',
        '1403/11/20',
        'dim-cash-1',
        '-100000'
      );
      expect(deficitLines).toHaveLength(2);
      expect(deficitLines[0].subsidiaryAccountId).toBe('sub-8108'); // بدهکار هزینه کسری صندوق
      expect(deficitLines[0].debit).toBe('100000');
      expect(deficitLines[1].subsidiaryAccountId).toBe('sub-1101'); // بستانکار صندوق
      expect(deficitLines[1].credit).toBe('100000');

      const defVal = JournalEngine.validateLines(deficitLines);
      expect(defVal.totalDebit.toFixed(0)).toBe('100000');
      expect(defVal.totalCredit.toFixed(0)).toBe('100000');

      // حالت دوم: فزونی نقد صندوق (شمارش واقعی بیشتر از انتظار دفتری: +۵۰,۰۰۰ ریال)
      const surplusLines = PosPostingEngine.buildCashDiscrepancyLines(
        'SHIFT-1403-101',
        '1403/11/20',
        'dim-cash-1',
        '50000'
      );
      expect(surplusLines).toHaveLength(2);
      expect(surplusLines[0].subsidiaryAccountId).toBe('sub-1101'); // بدهکار صندوق
      expect(surplusLines[0].debit).toBe('50000');
      expect(surplusLines[1].subsidiaryAccountId).toBe('sub-6105'); // بستانکار سایر درآمدها
      expect(surplusLines[1].credit).toBe('50000');

      const surVal = JournalEngine.validateLines(surplusLines);
      expect(surVal.totalDebit.toFixed(0)).toBe('50000');
      expect(surVal.totalCredit.toFixed(0)).toBe('50000');
    });
  });
});
