import Decimal from 'decimal.js';
import { WeightBarcodeParsedResult } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class BarcodeScaleParser {
  /**
   * پارس بارکدهای استاندارد وزنی EAN-13 ترازوی دیجیتال فروشگاهی (پند، رادین، محک، دیجی)
   * ساختار مرسوم ایران:
   * [۲ رقم پیشوند ۲۱ یا ۲۲] + [۵ رقم کد کالا] + [۵ رقم وزن به گرم یا مبلغ] + [۱ رقم چکسام EAN]
   */
  public static parse(barcode: string): WeightBarcodeParsedResult {
    const clean = (barcode || '').trim();

    // بررسی آیا بارکد ۱۳ رقمی وزنی ترازویی است یا خیر
    if (/^2[12]\d{11}$/.test(clean)) {
      const prefix = clean.substring(0, 2);
      const productCode = clean.substring(2, 7);
      const valuePart = clean.substring(7, 12);
      const numValue = parseInt(valuePart, 10);

      if (prefix === '21') {
        // بارکد وزنی: ۵ رقم بر حسب گرم
        const weightGrams = numValue;
        const weightKg = new Decimal(weightGrams).dividedBy(1000).toFixed(3);

        return {
          isWeightBarcode: true,
          productCode,
          weightGrams,
          weightKg
        };
      } else {
        // بارکد مبتنی بر مبلغ: ۵ رقم بر حسب هزار ریال / تومان
        const priceRials = new Decimal(numValue).times(10000).toFixed(0);
        return {
          isWeightBarcode: true,
          productCode,
          priceRials
        };
      }
    }

    // بارکد معمولی کالا (فاقد وزن تعبیه‌شده)
    return {
      isWeightBarcode: false,
      productCode: clean
    };
  }

  /**
   * محاسبه کل مبلغ کالای وزنی بر اساس وزن ترازویی و قیمت هر کیلوگرم
   */
  public static calculateScaleItemPrice(
    weightKg: string | number,
    unitPricePerKg: string | number
  ): {
    totalPrice: string;
    weightKgFormatted: string;
  } {
    const w = new Decimal(weightKg);
    const p = new Decimal(unitPricePerKg);
    const total = w.times(p).round();

    return {
      totalPrice: total.toFixed(0),
      weightKgFormatted: w.toFixed(3)
    };
  }
}
