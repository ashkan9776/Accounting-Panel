import Decimal from 'decimal.js';
import {
  BomEngine,
  CostingEngine,
  ManufacturingPostingEngine,
  BomItemType,
  VarianceType
} from '../manufacturing';

describe('Manufacturing & Cost Accounting Core Domain Tests (فاز ۷)', () => {
  describe('۱. BomEngine (فرمول ساخت چندسطحی و محاسبات استاندارد)', () => {
    const sampleBom = {
      productId: 'prod-smart-pos',
      title: 'فرمول ساخت دستگاه کارتخوان هوشمند لمسی پیشرو مدل POS-Smart-X1',
      version: '1.0',
      yieldQuantity: 1,
      items: [
        {
          productId: 'comp-mainboard',
          itemType: BomItemType.SEMI_FINISHED,
          quantityPerUnit: 1,
          scrapPercentage: 0
        },
        {
          productId: 'comp-lcd',
          itemType: BomItemType.RAW_MATERIAL,
          quantityPerUnit: 1,
          scrapPercentage: 2 // ۲ درصد ضایعات شکست و تلورانس خط مونتاژ
        },
        {
          productId: 'comp-printer',
          itemType: BomItemType.RAW_MATERIAL,
          quantityPerUnit: 1,
          scrapPercentage: 0
        },
        {
          productId: 'comp-case',
          itemType: BomItemType.RAW_MATERIAL,
          quantityPerUnit: 1,
          scrapPercentage: 1 // ۱ درصد ضایعات تزریق و مونتاژ بدنه
        }
      ]
    };

    const priceMap = {
      'comp-mainboard': '12000000', // ۱۲ میلیون ریال
      'comp-lcd': '8000000',        // ۸ میلیون ریال
      'comp-printer': '4500000',    // ۴.۵ میلیون ریال
      'comp-case': '1500000'        // ۱.۵ میلیون ریال
    };

    const sampleRoutings = [
      {
        operationNumber: 10,
        title: 'مونتاژ بردهای الکترونیکی و ماژول پرینتر',
        workCenterId: 'wc-assembly',
        setupTimeHours: 1.0,
        runTimeHoursPerUnit: 0.5,
        laborRatePerHour: 500000,   // ۵۰۰ هزار ریال هر نفر-ساعت
        machineRatePerHour: 200000  // ۲۰۰ هزار ریال هر ساعت ماشین‌آلات
      },
      {
        operationNumber: 20,
        title: 'تست نرم‌افزاری، کنترل کیفیت نهایی و بسته‌بندی',
        workCenterId: 'wc-qc-packaging',
        setupTimeHours: 0.5,
        runTimeHoursPerUnit: 0.2,
        laborRatePerHour: 600000,
        machineRatePerHour: 100000
      }
    ];

    it('Should explode BOM and calculate material requirements with scrap allowance for a production batch of 10 units', () => {
      const requirements = BomEngine.calculateMaterialRequirements(sampleBom, 10, priceMap);
      expect(requirements).toHaveLength(4);

      // ۱. برد اصلی: ۱۰ عدد * ۱ = ۱۰ عدد (۱۲۰ میلیون ریال)
      const mb = requirements.find((r) => r.productId === 'comp-mainboard');
      expect(mb?.requiredQuantity).toBe('10.000');
      expect(mb?.totalCost).toBe('120000000');

      // ۲. ال‌سی‌دی با ۲٪ ضایعات: ۱۰ * ۱.۰۲ = ۱۰.۲ عدد -> ۱۰.۲ * ۸,۰۰۰,۰۰۰ = ۸۱,۶۰۰,۰۰۰ ریال
      const lcd = requirements.find((r) => r.productId === 'comp-lcd');
      expect(lcd?.requiredQuantity).toBe('10.200');
      expect(lcd?.totalCost).toBe('81600000');

      // ۳. ماژول پرینتر: ۱۰ عدد -> ۴۵ میلیون ریال
      const prn = requirements.find((r) => r.productId === 'comp-printer');
      expect(prn?.requiredQuantity).toBe('10.000');
      expect(prn?.totalCost).toBe('45000000');

      // ۴. بدنه با ۱٪ ضایعات: ۱۰ * ۱.۰۱ = ۱۰.۱ عدد -> ۱۰.۱ * ۱,۵۰۰,۰۰۰ = ۱۵,۱۵۰,۰۰۰ ریال
      const cs = requirements.find((r) => r.productId === 'comp-case');
      expect(cs?.requiredQuantity).toBe('10.100');
      expect(cs?.totalCost).toBe('15150000');
    });

    it('Should calculate standard labor hours, machine hours, and absorption cost from Routing operations', () => {
      // برای بچ ۱۰ تایی:
      // عملیات ۱۰: Setup 1.0 + (0.5 * 10) = 6.0 ساعت
      //   دستمزد: 6 * 500,000 = 3,000,000 ریال
      //   سربار: 6 * 200,000 = 1,200,000 ریال
      // عملیات ۲۰: Setup 0.5 + (0.2 * 10) = 2.5 ساعت
      //   دستمزد: 2.5 * 600,000 = 1,500,000 ریال
      //   سربار: 2.5 * 100,000 = 250,000 ریال
      // مجموع دستمزد مستقیم = ۴,۵۰۰,۰۰۰ ریال
      // مجموع سربار ساخت = ۱,۴۵۰,۰۰۰ ریال
      const res = BomEngine.calculateStandardLaborAndOverhead(sampleRoutings, 10);
      expect(res.totalLaborHours).toBe('8.50');
      expect(res.totalLaborCost).toBe('4500000');
      expect(res.totalMachineHours).toBe('8.50');
      expect(res.totalOverheadCost).toBe('1450000');
    });

    it('Should calculate standard cost sheet per unit of finished product', () => {
      const stdCost = BomEngine.calculateStandardCost(sampleBom, sampleRoutings, priceMap);
      expect(Number(stdCost.unitStandardMaterialCost)).toBeGreaterThan(25000000);
      expect(Number(stdCost.unitStandardLaborCost)).toBeGreaterThan(500000);
      expect(Number(stdCost.unitTotalStandardCost)).toBeGreaterThan(26000000);
    });
  });

  describe('۲. CostingEngine (بهای تمام‌شده واقعی و تحلیل انحرافات)', () => {
    it('Should calculate actual job order cost and unit production cost', () => {
      // برای بچ ۱۰ تایی کارتخوان:
      // مواد واقعی: ۲۶۱,۷۵۰,۰۰۰ ریال
      // دستمزد واقعی: ۴,۵۰۰,۰۰۰ ریال
      // سربار جذب‌شده: ۱,۴۵۰,۰۰۰ ریال
      // ضایعات عادی مجاز: ۳۰۰,۰۰۰ ریال
      // جمع کل بهای تمام‌شده تولید = ۲۶۸,۰۰۰,۰۰۰ ریال
      // بهای تمام‌شده واحد هر دستگاه = ۲۶,۸۰۰,۰۰۰ ریال
      const breakdown = CostingEngine.calculateActualJobCost({
        directMaterialsCost: '261750000',
        directLaborCost: '4500000',
        appliedOverheadCost: '1450000',
        normalScrapCost: '300000',
        completedQuantity: '10'
      });

      expect(breakdown.totalProductionCost).toBe('268000000');
      expect(breakdown.unitProductionCost).toBe('26800000');
      expect(breakdown.completedQuantity).toBe('10');
    });

    it('Should analyze cost variances and classify them as FAVORABLE or UNFAVORABLE', () => {
      // هزینه استاندارد: مواد ۲۶۰ میلیون، دستمزد ۵ میلیون، سربار ۱.۵ میلیون
      // هزینه واقعی: مواد ۲۶۵ میلیون (۵ میلیون اضافه مصرف مواد - نامساعد)، دستمزد ۴.۵ میلیون (۰.۵ میلیون صرفه‌جویی زمان - مساعد)، سربار ۱.۵ میلیون (منطبق)
      // انحراف خالص = +۵,۰۰۰,۰۰۰ - ۵۰۰,۰۰۰ = +۴,۵۰۰,۰۰۰ ریال (نامساعد)
      const varRes = CostingEngine.analyzeCostVariances({
        materialStandardCost: '260000000',
        materialActualCost: '265000000',
        laborStandardCost: '5000000',
        laborActualCost: '4500000',
        overheadStandardCost: '1500000',
        overheadActualCost: '1500000'
      });

      expect(varRes.materialUsageVariance).toBe('5000000');
      expect(varRes.materialVarianceType).toBe(VarianceType.UNFAVORABLE);

      expect(varRes.laborVariance).toBe('-500000');
      expect(varRes.laborVarianceType).toBe(VarianceType.FAVORABLE);

      expect(varRes.overheadVariance).toBe('0');
      expect(varRes.overheadVarianceType).toBe(VarianceType.NONE);

      expect(varRes.totalNetVariance).toBe('4500000');
      expect(varRes.netVarianceType).toBe(VarianceType.UNFAVORABLE);
    });
  });

  describe('۳. ManufacturingPostingEngine (اسناد دوبل حسابداری تولید و بهای تمام‌شده)', () => {
    it('Should build balanced Material Issue to WIP journal lines (Debit 1503 / Credit 1502)', () => {
      const lines = ManufacturingPostingEngine.buildMaterialIssueLines({
        productionOrderNumber: 'WO-1403-001',
        dateShamsi: '1403/11/16',
        totalMaterialCost: '261750000',
        costCenterDimensionId: 'dim-cc-1'
      });

      expect(lines).toHaveLength(2);
      expect(lines[0].subsidiaryAccountId).toBe('sub-1503'); // کالای در جریان ساخت
      expect(lines[0].debit).toBe('261750000');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1502'); // موجودی مواد اولیه
      expect(lines[1].credit).toBe('261750000');
    });

    it('Should build balanced Labor and Overhead Absorption lines (Debit 1503 / Credit 7102 & 7103)', () => {
      const lines = ManufacturingPostingEngine.buildLaborAndOverheadAbsorptionLines({
        productionOrderNumber: 'WO-1403-001',
        dateShamsi: '1403/11/16',
        directLaborCost: '4500000',
        appliedOverheadCost: '1450000',
        costCenterDimensionId: 'dim-cc-1'
      });

      expect(lines).toHaveLength(3);
      // بدهکار در جریان ساخت = ۴,۵۰۰,۰۰۰ + ۱,۴۵۰,۰۰۰ = ۵,۹۵۰,۰۰۰ ریال
      expect(lines[0].subsidiaryAccountId).toBe('sub-1503');
      expect(lines[0].debit).toBe('5950000');

      // بستانکار دستمزد جذب شده
      expect(lines[1].subsidiaryAccountId).toBe('sub-7102');
      expect(lines[1].credit).toBe('4500000');

      // بستانکار سربار جذب شده
      expect(lines[2].subsidiaryAccountId).toBe('sub-7103');
      expect(lines[2].credit).toBe('1450000');

      const sumDebit = new Decimal(lines[0].debit);
      const sumCredit = new Decimal(lines[1].credit).plus(new Decimal(lines[2].credit));
      expect(sumDebit.toFixed(0)).toBe(sumCredit.toFixed(0));
    });

    it('Should build balanced Finished Goods Receipt lines (Debit 1504 / Credit 1503)', () => {
      const lines = ManufacturingPostingEngine.buildFinishedGoodsReceiptLines({
        productionOrderNumber: 'WO-1403-001',
        dateShamsi: '1403/11/16',
        productTitle: 'دستگاه کارتخوان هوشمند پیشرو',
        completedQuantity: '10',
        totalFinishedGoodCost: '267700000',
        costCenterDimensionId: 'dim-cc-1'
      });

      expect(lines).toHaveLength(2);
      expect(lines[0].subsidiaryAccountId).toBe('sub-1504'); // موجودی محصولات ساخته شده
      expect(lines[0].debit).toBe('267700000');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1503'); // کالای در جریان ساخت
      expect(lines[1].credit).toBe('267700000');
    });

    it('Should build balanced Abnormal Scrap lines (Debit 8108 / Credit 1503)', () => {
      const lines = ManufacturingPostingEngine.buildAbnormalScrapLines({
        productionOrderNumber: 'WO-1403-001',
        dateShamsi: '1403/11/16',
        scrapAmount: '1200000',
        reason: 'نوسان شدید ولتاژ برق و سوختن بردها در حین تست',
        costCenterDimensionId: 'dim-cc-1'
      });

      expect(lines).toHaveLength(2);
      expect(lines[0].subsidiaryAccountId).toBe('sub-8108'); // هزینه کسری و ضایعات
      expect(lines[0].debit).toBe('1200000');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1503'); // کالای در جریان ساخت
      expect(lines[1].credit).toBe('1200000');
    });

    it('Should build balanced Cost Variance Recognition lines (Debit 7104 / Credit 1503 for unfavorable)', () => {
      const lines = ManufacturingPostingEngine.buildCostVarianceLines({
        productionOrderNumber: 'WO-1403-001',
        dateShamsi: '1403/11/16',
        varianceAmount: '4500000', // انحراف نامساعد
        costCenterDimensionId: 'dim-cc-1'
      });

      expect(lines).toHaveLength(2);
      expect(lines[0].subsidiaryAccountId).toBe('sub-7104');
      expect(lines[0].debit).toBe('4500000');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1503');
      expect(lines[1].credit).toBe('4500000');
    });
  });
});
