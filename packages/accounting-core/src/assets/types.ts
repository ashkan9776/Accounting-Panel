import Decimal from 'decimal.js';

export enum AssetCategory {
  FURNITURE_OFFICE = 'FURNITURE_OFFICE',       // اثاثه و تجهیزات اداری و کامپیوتری
  VEHICLES = 'VEHICLES',                       // وسایط نقلیه
  MACHINERY_TECHNICAL = 'MACHINERY_TECHNICAL'  // ماشین‌آلات و تجهیزات فنی و تولیدی
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',         // روش خط مستقیم (ماده ۱۴۹ ق.م.م)
  DECLINING_BALANCE = 'DECLINING_BALANCE' // روش مانده نزولی
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',           // در حال بهره‌برداری
  DEPRECIATED = 'DEPRECIATED', // مستهلک‌شده کامل
  SOLD = 'SOLD',               // واگذار شده / فروخته شده
  SCRAPPED = 'SCRAPPED'        // اسقاط شده و از مدار خارج
}

export interface FixedAssetDefinition {
  id?: string;
  assetCode: string;               // کد پلاک اموال
  title: string;                   // نام و شرح دارایی
  category: AssetCategory;         // طبقه دارایی ثابت
  purchaseDateShamsi: string;      // تاریخ تحصیل شمسی
  historicalCost: string | number; // بهای تمام‌شده تاریخی خرید دارایی
  salvageValue?: string | number;  // ارزش اسقاط برآوردی (معمولاً صفر یا ۱۰٪)
  depreciationMethod: DepreciationMethod; // روش محاسبه استهلاک
  annualRatePercentage?: string | number; // نرخ استهلاک سالانه (درصد)
  usefulLifeYears?: number;               // عمر مفید بر حسب سال
  costCenterDimensionId?: string;         // مرکز هزینه مرتبط
  keeperPartyId?: string;                 // پرسنل تحویل‌گیرنده / امین اموال
  location?: string;                      // محل استقرار
}

export interface PeriodicDepreciationResult {
  assetId: string;
  assetCode: string;
  periodDateShamsi: string;
  monthsCount: number;
  openingBookValue: string;
  periodDepreciationAmount: string;
  accumulatedDepreciationAfter: string;
  closingBookValue: string;
  isFullyDepreciated: boolean;
}

export interface AssetDisposalResult {
  assetId: string;
  assetCode: string;
  disposalDateShamsi: string;
  historicalCost: string;
  accumulatedDepreciation: string;
  bookValueAtDisposal: string;
  salePrice: string;
  gainOrLossAmount: string; // قدر مطلق سود یا زیان
  isGain: boolean;          // true = سود، false = زیان
}
