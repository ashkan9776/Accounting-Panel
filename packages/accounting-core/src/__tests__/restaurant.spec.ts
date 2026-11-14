import Decimal from 'decimal.js';
import {
  RecipeEngine,
  RestaurantPostingEngine,
  MenuEngineeringCategory
} from '../restaurant';

describe('Restaurant & Cafe Core Domain Engine Tests (فاز ۶)', () => {
  describe('۱. RecipeEngine (فرمول ساخت غذا و تحلیل Food Cost)', () => {
    it('Should calculate recipe raw material cost including preparation waste (Scrap Factor)', () => {
      // فرمول پیتزا پپرونی مخصوص:
      // ۱. خمیر آماده: ۲۰۰ گرم به نرخ ۴۰۰ ریال هر گرم (بدون ضایعات) = ۸۰,۰۰۰ ریال
      // ۲. پنیر موزارلا: ۱۰۰ گرم به نرخ ۱,۵۰۰ ریال هر گرم با ۳٪ ضایعات = ۱۰۳ گرم * ۱۵۰۰ = ۱۵۴,۵۰۰ ریال
      // ۳. پپرونی مرغوب: ۸۰ گرم به نرخ ۳,۰۰۰ ریال هر گرم با ۰٪ ضایعات = ۲۴۰,۰۰۰ ریال
      // ۴. سس مخصوص: ۳۰ گرم به نرخ ۶۰۰ ریال با ۵٪ ضایعات ظرف = ۳۱.۵ گرم * ۶۰۰ = ۱۸,۹۰۰ ریال
      // جمع بهای تمام شده مواد اولیه = ۸۰,۰۰۰ + ۱۵۴,۵۰۰ + ۲۴۰,۰۰۰ + ۱۸,۹۰۰ = ۴۹۳,۴۰۰ ریال
      const ingredients = [
        { unitCost: 400, quantity: 200, wastePercentage: 0 },
        { unitCost: 1500, quantity: 100, wastePercentage: 3 },
        { unitCost: 3000, quantity: 80, wastePercentage: 0 },
        { unitCost: 600, quantity: 30, wastePercentage: 5 }
      ];

      const cost = RecipeEngine.calculateRecipeCost(ingredients);
      expect(cost).toBe('493400');
    });

    it('Should classify menu items according to Menu Engineering Matrix (Star, Plowhorse, Puzzle, Dog)', () => {
      // ۱. آیتم پرفروش با سود بالا (Star): فروش ۱,۸۰۰,۰۰۰ ریال، بهای مواد ۴۹۳,۴۰۰ ریال (حاشیه سود ۷۲.۶٪)
      const star = RecipeEngine.analyzeFoodCost(1800000, 493400, true);
      expect(star.category).toBe(MenuEngineeringCategory.STAR);
      expect(Number(star.foodCostPercentage)).toBeLessThan(30);
      expect(Number(star.grossMarginPercentage)).toBeGreaterThan(70);

      // ۲. آیتم پرفروش با سود پایین (Plowhorse): فروش ۱,۰۰۰,۰۰۰ ریال، بهای مواد ۵۵۰,۰۰۰ ریال (حاشیه سود ۴۵٪)
      const plowhorse = RecipeEngine.analyzeFoodCost(1000000, 550000, true);
      expect(plowhorse.category).toBe(MenuEngineeringCategory.PLOWHORSE);

      // ۳. آیتم کم‌فروش با سود بالا (Puzzle): فروش ۲,۵۰۰,۰۰۰ ریال، بهای مواد ۵۰۰,۰۰۰ ریال (حاشیه سود ۸۰٪)
      const puzzle = RecipeEngine.analyzeFoodCost(2500000, 500000, false);
      expect(puzzle.category).toBe(MenuEngineeringCategory.PUZZLE);

      // ۴. آیتم کم‌فروش با سود پایین (Dog): فروش ۸۰۰,۰۰۰ ریال، بهای مواد ۵۰۰,۰۰۰ ریال (حاشیه سود ۳۷.۵٪)
      const dog = RecipeEngine.analyzeFoodCost(800000, 500000, false);
      expect(dog.category).toBe(MenuEngineeringCategory.DOG);
    });

    it('Should calculate scaled deduction quantities for kitchen inventory dispatch', () => {
      const recipe = {
        menuProductId: 'prod-pizza-pep',
        yieldQuantity: 1,
        ingredients: [
          { rawProductId: 'raw-cheese', quantity: 100, wastePercentage: 5 }, // ۱۰۵ گرم برای ۱ پیتزا
          { rawProductId: 'raw-dough', quantity: 200, wastePercentage: 0 }  // ۲۰۰ گرم برای ۱ پیتزا
        ]
      };

      // سفارش ۳ عدد پیتزا
      const deductions = RecipeEngine.calculateDeductionQuantities(recipe, 3);
      expect(deductions).toHaveLength(2);

      const cheese = deductions.find((d) => d.rawProductId === 'raw-cheese');
      expect(cheese).toBeDefined();
      // ۳ * ۱۰۵ گرم = ۳۱۵ گرم
      expect(cheese?.quantityToDeduct).toBe('315.000');

      const dough = deductions.find((d) => d.rawProductId === 'raw-dough');
      expect(dough).toBeDefined();
      // ۳ * ۲۰۰ گرم = ۶۰۰ گرم
      expect(dough?.quantityToDeduct).toBe('600.000');
    });
  });

  describe('۲. RestaurantPostingEngine (اسناد دوبل حسابداری رستوران)', () => {
    it('Should generate balanced sales order journal lines with service charge and VAT', () => {
      // سفارش سالن: ۲ پیتزا به مبلغ ۳,۶۰۰,۰۰۰ ریال
      // تخفیف افتتاحیه: ۲۰۰,۰۰۰ ریال -> خالص فروش: ۳,۴۰۰,۰۰۰ ریال
      // حق سرویس سالن ۵٪: ۱۷۰,۰۰۰ ریال
      // مالیات بر ارزش افزوده ۱۰٪: (۳,۴۰۰,۰۰۰ + ۱۷۰,۰۰۰) * ۱۰٪ = ۳۵۷,۰۰۰ ریال
      // جمع کل قابل پرداخت = ۳,۴۰۰,۰۰۰ + ۱۷۰,۰۰۰ + ۳۵۷,۰۰۰ = ۳,۹۲۷,۰۰۰ ریال
      // تسویه ترکیبی: ۹۲۷,۰۰۰ ریال نقد و ۳,۰۰۰,۰۰۰ ریال کارتخوان
      const lines = RestaurantPostingEngine.buildSalesOrderLines({
        orderNumber: 'REST-1403-001',
        dateShamsi: '1403/11/15',
        channel: 'DINE_IN',
        tableNumber: 'T-04',
        settlementMethod: 'MIXED',
        cashDeskDimensionId: 'dim-cash-1',
        posTerminalDimensionId: 'dim-pos-1',
        costCenterDimensionId: 'dim-cc-2',
        netFoodSalesAmount: '3400000',
        discountAmount: '200000',
        serviceChargeAmount: '170000',
        vatAmount: '357000',
        cashPaidAmount: '927000',
        cardPaidAmount: '3000000'
      });

      let totalDebit = new Decimal(0);
      let totalCredit = new Decimal(0);
      for (const line of lines) {
        totalDebit = totalDebit.plus(new Decimal(line.debit || 0));
        totalCredit = totalCredit.plus(new Decimal(line.credit || 0));
      }

      // بدهکار: ۹۲۷,۰۰۰ نقد + ۳,۰۰۰,۰۰۰ پوز + ۲۰۰,۰۰۰ تخفیف = ۴,۱۲۷,۰۰۰ ریال
      // بستانکار: ۳,۶۰۰,۰۰۰ ناخالص غذا + ۱۷۰,۰۰۰ سرویس + ۳۵۷,۰۰۰ ارزش افزوده = ۴,۱۲۷,۰۰۰ ریال
      expect(totalDebit.toFixed(0)).toBe(totalCredit.toFixed(0));
      expect(totalDebit.toFixed(0)).toBe('4127000');
    });

    it('Should generate balanced Food Cost journal lines (Debit 7101 / Credit 1502)', () => {
      const lines = RestaurantPostingEngine.buildFoodCostLines(
        'REST-1403-001',
        '1403/11/15',
        '986800', // بهای مواد ۲ پرس پیتزا
        'dim-cc-2'
      );

      expect(lines).toHaveLength(2);
      expect(lines[0].subsidiaryAccountId).toBe('sub-7101');
      expect(lines[0].debit).toBe('986800');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1502');
      expect(lines[1].credit).toBe('986800');
    });

    it('Should generate balanced Food Waste & Spoilage journal lines (Debit 8108 / Credit 1502)', () => {
      const lines = RestaurantPostingEngine.buildFoodWasteLines(
        'WST-1403-01',
        '1403/11/15',
        '350000',
        'فساد سس دست‌ساز به دلیل قطعی برق سردخانه',
        'dim-cc-2'
      );

      expect(lines).toHaveLength(2);
      expect(lines[0].subsidiaryAccountId).toBe('sub-8108');
      expect(lines[0].debit).toBe('350000');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1502');
      expect(lines[1].credit).toBe('350000');
    });
  });
});
