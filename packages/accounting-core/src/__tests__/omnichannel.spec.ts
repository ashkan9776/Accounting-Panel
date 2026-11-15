import Decimal from 'decimal.js';
import {
  ECommerceEngine,
  HardwareDriverEngine,
  VisitorSalesEngine,
  AttendanceLogType
} from '../omnichannel';

describe('Phase 10 Omnichannel, E-Commerce & Hardware Interop Engines', () => {
  describe('1. ECommerceEngine (موتور قیمت‌گذاری و اسناد فروش آنلاین)', () => {
    it('Should calculate online order pricing with VAT, discounts and shipping fee', () => {
      const items = [
        {
          productId: 'prod-smartpos-1',
          productTitle: 'پایانه فروشگاهی هوشمند',
          quantity: 2,
          unitPrice: '10000000', // ۲۰,۰۰۰,۰۰۰ ریال ناخالص
          discountAmount: '1000000', // ۱,۰۰۰,۰۰۰ ریال تخفیف ردیف
          vatRate: '0.10', // ۱۰٪ مالیات بر ارزش افزوده
          unitCogs: '7000000' // ۱۴,۰۰۰,۰۰۰ ریال بهای تمام‌شده
        },
        {
          productId: 'prod-roll-1',
          productTitle: 'رول حرارتی ۸۰ میلی‌متری',
          quantity: 10,
          unitPrice: '500000', // ۵,۰۰۰,۰۰۰ ریال
          discountAmount: '0',
          vatRate: '0.10',
          unitCogs: '300000' // ۳,۰۰۰,۰۰۰ ریال
        }
      ];

      const res = ECommerceEngine.calculatePricing(items, '1500000', '500000'); // ۱,۵۰۰,۰۰۰ حمل، ۵۰۰,۰۰۰ کوپن

      // جمع ناخالص کالاها: ۲۰,۰۰۰,۰۰۰ + ۵,۰۰۰,۰۰۰ = ۲۵,۰۰۰,۰۰۰
      expect(res.summary.totalGoodsAmount).toBe('25000000');
      // مجموع تخفیف: ۱,۰۰۰,۰۰۰ + ۵۰۰,۰۰۰ = ۱,۵۰۰,۰۰۰
      expect(res.summary.totalDiscount).toBe('1500000');
      // خالص کالاها: ۲۵,۰۰۰,۰۰۰ - ۱,۵۰۰,۰۰۰ = ۲۳,۵۰۰,۰۰۰
      expect(res.summary.netGoodsAmount).toBe('23500000');
      // مالیات بر ارزش افزوده اقلام:
      // سطر ۱: (۲۰,۰۰۰,۰۰۰ - ۱,۰۰۰,۰۰۰) * ۰.۱۰ = ۱,۹۰۰,۰۰۰
      // سطر ۲: ۵,۰۰۰,۰۰۰ * ۰.۱۰ = ۵۰۰,۰۰۰ -> مجموع: ۲,۴۰۰,۰۰۰
      expect(res.summary.totalVat).toBe('2400000');
      expect(res.summary.shippingFee).toBe('1500000');
      // مبلغ کل پرداختی: ۲۳,۵۰۰,۰۰۰ + ۲,۴۰۰,۰۰۰ + ۱,۵۰۰,۰۰۰ = ۲۷,۴۰۰,۰۰۰
      expect(res.summary.grandTotal).toBe('27400000');
      // بهای تمام‌شده: ۱۴,۰۰۰,۰۰۰ + ۳,۰۰۰,۰۰۰ = ۱۷,۰۰۰,۰۰۰
      expect(res.summary.totalCogs).toBe('17000000');
    });

    it('Should generate balanced double-entry lines for online order receipt & sales', () => {
      const pricing = {
        totalGoodsAmount: '20000000',
        totalDiscount: '1000000',
        netGoodsAmount: '19000000',
        totalVat: '1900000',
        shippingFee: '1000000',
        grandTotal: '21900000',
        totalCogs: '12000000'
      };

      const lines = ECommerceEngine.buildOnlineOrderPostingLines({
        orderNumber: 'ORD-1403-1001',
        pricing,
        gatewaySubsidiaryId: 'sub-1104',
        gatewayDimensionId: 'dim-gw-saman',
        costCenterDimensionId: 'dim-cc-online',
        warehouseDimensionId: 'wh-central'
      });

      let sumDebits = new Decimal(0);
      let sumCredits = new Decimal(0);
      for (const l of lines) {
        sumDebits = sumDebits.plus(l.debit);
        sumCredits = sumCredits.plus(l.credit);
      }

      // تراز کامل سند دوبل
      expect(sumDebits.toFixed(0)).toBe(sumCredits.toFixed(0));
      // بدهکار وجوه در راه (۲۱,۹۰۰,۰۰۰) + تخفیف (۱,۰۰۰,۰۰۰) + بهای تمام‌شده (۱۲,۰۰۰,۰۰۰) = ۳۴,۹۰۰,۰۰۰
      expect(sumDebits.toFixed(0)).toBe('34900000');
    });

    it('Should generate balanced gateway settlement lines with bank deposit and Shaparak fee', () => {
      const lines = ECommerceEngine.buildGatewaySettlementLines({
        orderNumber: 'ORD-1403-1001',
        settledAmount: '21900000',
        gatewayFee: '40000',
        bankSubsidiaryId: 'sub-1103',
        bankDimensionId: 'dim-bank-tejarat',
        gatewaySubsidiaryId: 'sub-1104',
        gatewayDimensionId: 'dim-gw-saman'
      });

      let sumDebits = new Decimal(0);
      let sumCredits = new Decimal(0);
      for (const l of lines) {
        sumDebits = sumDebits.plus(l.debit);
        sumCredits = sumCredits.plus(l.credit);
      }

      expect(sumDebits.toFixed(0)).toBe(sumCredits.toFixed(0));
      expect(sumDebits.toFixed(0)).toBe('21900000');
      // واریزی خالص به بانک: ۲۱,۹۰۰,۰۰۰ - ۴۰,۰۰۰ = ۲۱,۸۶۰,۰۰۰
      const bankLine = lines.find((l) => l.subsidiaryAccountId === 'sub-1103');
      expect(bankLine?.debit).toBe('21860000');
    });
  });

  describe('2. HardwareDriverEngine (درایور پرینتر حرارتی، کارتخوان، ترازو و حضور و غیاب)', () => {
    it('Should generate raw ESC/POS binary receipt with QR code and cash drawer kick', () => {
      const receiptBuf = HardwareDriverEngine.generateEscPosReceipt({
        companyName: 'شرکت تجارت الکترونیک پیشرو پارس',
        branchTitle: 'شعبه مرکزی آنلاین',
        orderNumber: 'ORD-1403-1001',
        dateShamsi: '1403/12/29 15:45',
        customerName: 'آقای علیرضا حسینی',
        items: [
          {
            title: 'پایانه فروشگاهی هوشمند',
            qty: 1,
            unitPrice: '10,000,000',
            totalPrice: '10,000,000'
          }
        ],
        subtotal: '10,000,000',
        discount: '500,000',
        vat: '950,000',
        shippingFee: '500,000',
        grandTotal: '10,950,000',
        qrPayload: 'https://pay.pishro.ir/invoice/ORD-1403-1001',
        openCashDrawer: true
      });

      expect(Buffer.isBuffer(receiptBuf)).toBe(true);
      expect(receiptBuf.length).toBeGreaterThan(100);

      // بررسی وجود فرامین ESC @ (0x1B 0x40) در ابتدای بافر
      expect(receiptBuf[0]).toBe(0x1b);
      expect(receiptBuf[1]).toBe(0x40);

      // بررسی وجود فرمان باز کردن کشوی پول (ESC p 0 25 250)
      expect(receiptBuf[2]).toBe(0x1b);
      expect(receiptBuf[3]).toBe(0x70);

      // بررسی وجود برش کاغذ (GS V 66 0) در انتهای بافر
      expect(receiptBuf[receiptBuf.length - 4]).toBe(0x1d);
      expect(receiptBuf[receiptBuf.length - 3]).toBe(0x56);
      expect(receiptBuf[receiptBuf.length - 2]).toBe(0x42);
      expect(receiptBuf[receiptBuf.length - 1]).toBe(0x00);
    });

    it('Should build PC-POS sale request packet with LRC check and parse bank response', () => {
      const req = HardwareDriverEngine.buildPcPosSaleRequest({
        terminalId: 'POS-01',
        amount: '25000000',
        orderId: 'ORD-1001'
      });

      expect(req.commandHex).toBeDefined();
      expect(req.packetBuffer[0]).toBe(0x02); // STX

      // تست پارس کردن پاسخ موفق بانکی
      const rawPosResponse = '\x0200|POS-01|000025000000|748291038472|654321|603799******1234|1403/12/29 16:00:00\x03\x15';
      const parsed = HardwareDriverEngine.parsePcPosResponse(rawPosResponse);

      expect(parsed.isSuccess).toBe(true);
      expect(parsed.responseCode).toBe('00');
      expect(parsed.amount).toBe('25000000');
      expect(parsed.rrn).toBe('748291038472');
      expect(parsed.traceNumber).toBe('654321');
      expect(parsed.cardPanMasked).toBe('603799******1234');
    });

    it('Should parse digital scale output correctly', () => {
      const reading = HardwareDriverEngine.parseScaleReading('ST,GS,+002.350KG');
      expect(reading.isStable).toBe(true);
      expect(reading.netWeightGrams).toBe(2350);

      const unstable = HardwareDriverEngine.parseScaleReading('US,GS,+000.000KG');
      expect(unstable.isStable).toBe(false);
    });

    it('Should process attendance logs and calculate overtime and undertime', () => {
      const logs = [
        {
          employeeId: 'emp-rezaei-1',
          terminalId: 'term-biometric-1',
          dateShamsi: '1403/12/29',
          timeString: '08:00:00',
          type: AttendanceLogType.CLOCK_IN
        },
        {
          employeeId: 'emp-rezaei-1',
          terminalId: 'term-biometric-1',
          dateShamsi: '1403/12/29',
          timeString: '18:30:00', // ۱۰.۵ ساعت حضور (۶۳۰ دقیقه)
          type: AttendanceLogType.CLOCK_OUT
        }
      ];

      const summary = HardwareDriverEngine.processDailyAttendance(
        'emp-rezaei-1',
        '1403/12/29',
        logs,
        480 // شیفت استاندارد ۸ ساعته
      );

      expect(summary.totalPresentMinutes).toBe(630);
      expect(summary.standardWorkMinutes).toBe(480);
      expect(summary.overtimeMinutes).toBe(150); // ۲.۵ ساعت اضافه‌کاری
      expect(summary.undertimeMinutes).toBe(0);
    });
  });

  describe('3. VisitorSalesEngine (موتور فروش ویزیتوری، سقف اعتبار و ژئوفنسینگ GPS)', () => {
    it('Should approve order within customer credit limit', () => {
      const res = VisitorSalesEngine.validateCustomerCredit({
        partyId: 'party-customer-1',
        partyName: 'فروشگاه آذرخش',
        creditLimit: '50000000',
        currentOpenBalance: '20000000',
        newOrderAmount: '15000000'
      });

      expect(res.isCreditApproved).toBe(true);
      expect(res.remainingCredit).toBe('15000000');
    });

    it('Should reject order exceeding credit limit or with overdue debt', () => {
      const resExcess = VisitorSalesEngine.validateCustomerCredit({
        partyId: 'party-customer-1',
        partyName: 'فروشگاه آذرخش',
        creditLimit: '50000000',
        currentOpenBalance: '40000000',
        newOrderAmount: '15000000'
      });

      expect(resExcess.isCreditApproved).toBe(false);
      expect(resExcess.rejectionReason).toContain('سقف اعتبار');

      const resOverdue = VisitorSalesEngine.validateCustomerCredit({
        partyId: 'party-customer-2',
        partyName: 'سوپرمارکت بهار',
        creditLimit: '50000000',
        currentOpenBalance: '10000000',
        newOrderAmount: '5000000',
        hasOverdueInvoices: true,
        overdueDays: 45
      });

      expect(resOverdue.isCreditApproved).toBe(false);
      expect(resOverdue.rejectionReason).toContain('فاکتور معوق');
    });

    it('Should accurately calculate Geofence distance between visitor and store', () => {
      // مختصات میدان ونک تهران: 35.7575, 51.4100
      const storeLat = 35.7575;
      const storeLon = 51.4100;

      // موقعیت ویزیتور در ۵۰ متری فروشگاه
      const visitorNearbyLat = 35.7578;
      const visitorNearbyLon = 51.4102;

      const nearRes = VisitorSalesEngine.validateGeofence(visitorNearbyLat, visitorNearbyLon, storeLat, storeLon, 150);
      expect(nearRes.isWithinGeofence).toBe(true);
      expect(nearRes.distanceMeters).toBeLessThan(150);

      // موقعیت ویزیتور در ۱ کیلومتری (میدان تجریش)
      const visitorFarLat = 35.8050;
      const visitorFarLon = 51.4310;

      const farRes = VisitorSalesEngine.validateGeofence(visitorFarLat, visitorFarLon, storeLat, storeLon, 150);
      expect(farRes.isWithinGeofence).toBe(false);
      expect(farRes.distanceMeters).toBeGreaterThan(1000);
    });
  });
});
