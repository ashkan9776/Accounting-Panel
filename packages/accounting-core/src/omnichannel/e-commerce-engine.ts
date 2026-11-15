import Decimal from 'decimal.js';
import {
  OnlineOrderItemInput,
  OnlineOrderPricingSummary,
  OnlineOrderPostingParams
} from './types';
import { JournalLineInput } from '../journal/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class ECommerceEngine {
  /**
   * محاسبه دقیق مبالغ، تخفیف، ارزش افزوده، کرایه حمل و بهای تمام‌شده اقلام سفارش آنلاین
   */
  public static calculatePricing(
    items: OnlineOrderItemInput[],
    shippingFee: string | number = 0,
    orderCouponDiscount: string | number = 0
  ): {
    itemsBreakdown: Array<OnlineOrderItemInput & {
      lineGross: string;
      lineDiscount: string;
      lineNet: string;
      lineVat: string;
      lineTotal: string;
      lineCogs: string;
    }>;
    summary: OnlineOrderPricingSummary;
  } {
    let sumGoodsAmount = new Decimal(0);
    let sumLineDiscounts = new Decimal(0);
    let sumVat = new Decimal(0);
    let sumCogs = new Decimal(0);

    const breakdown = items.map((item) => {
      const qty = new Decimal(item.quantity);
      const unitP = new Decimal(item.unitPrice);
      const disc = new Decimal(item.discountAmount || 0);
      const gross = qty.times(unitP);
      const net = gross.minus(disc);
      const vatRate = new Decimal(item.vatRate !== undefined ? item.vatRate : 0.1);
      const vat = net.times(vatRate).round();
      const total = net.plus(vat);
      const unitC = new Decimal(item.unitCogs || 0);
      const lineCogs = qty.times(unitC);

      sumGoodsAmount = sumGoodsAmount.plus(gross);
      sumLineDiscounts = sumLineDiscounts.plus(disc);
      sumVat = sumVat.plus(vat);
      sumCogs = sumCogs.plus(lineCogs);

      return {
        ...item,
        lineGross: gross.toFixed(0),
        lineDiscount: disc.toFixed(0),
        lineNet: net.toFixed(0),
        lineVat: vat.toFixed(0),
        lineTotal: total.toFixed(0),
        lineCogs: lineCogs.toFixed(0)
      };
    });

    const coupon = new Decimal(orderCouponDiscount || 0);
    const totalDiscount = sumLineDiscounts.plus(coupon);
    const netGoods = sumGoodsAmount.minus(totalDiscount);
    const shipping = new Decimal(shippingFee || 0);
    const grandTotal = netGoods.plus(sumVat).plus(shipping);

    return {
      itemsBreakdown: breakdown,
      summary: {
        totalGoodsAmount: sumGoodsAmount.toFixed(0),
        totalDiscount: totalDiscount.toFixed(0),
        netGoodsAmount: netGoods.toFixed(0),
        totalVat: sumVat.toFixed(0),
        shippingFee: shipping.toFixed(0),
        grandTotal: grandTotal.toFixed(0),
        totalCogs: sumCogs.toFixed(0)
      }
    };
  }

  /**
   * تولید سطور سند دوبل شناسایی سفارش پرداخت‌شده فروشگاه آنلاین
   */
  public static buildOnlineOrderPostingLines(params: OnlineOrderPostingParams): JournalLineInput[] {
    const lines: JournalLineInput[] = [];
    const p = params.pricing;

    // ۱. بدهکار: وجوه در راه درگاه پرداخت اینترنتی (۱۱۰۴)
    lines.push({
      subsidiaryAccountId: params.gatewaySubsidiaryId || 'sub-1104',
      floatingDimension1Id: params.gatewayDimensionId,
      debit: p.grandTotal,
      credit: '0',
      description: `دریافت اینترنتی وجه سفارش آنلاین شماره ${params.orderNumber}`,
      currencyCode: 'IRR',
      currencyRate: '1'
    });

    // ۲. در صورت وجود تخفیف: بدهکار تخفیفات فروش (۶۲۰۲)
    const disc = new Decimal(p.totalDiscount);
    if (disc.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-6202',
        floatingDimension2Id: params.costCenterDimensionId,
        debit: disc.toFixed(0),
        credit: '0',
        description: `تخفیف سفارش آنلاین شماره ${params.orderNumber}`,
        currencyCode: 'IRR',
        currencyRate: '1'
      });
    }

    // ۳. بستانکار: درآمد فروش ناخالص کالا (۶۱۰۱)
    lines.push({
      subsidiaryAccountId: 'sub-6101',
      floatingDimension2Id: params.costCenterDimensionId,
      debit: '0',
      credit: p.totalGoodsAmount,
      description: `فروش آنلاین کالا عطف به سفارش ${params.orderNumber}`,
      currencyCode: 'IRR',
      currencyRate: '1'
    });

    // ۴. بستانکار: مالیات بر ارزش افزوده فروش (۳۳۰۶)
    const vat = new Decimal(p.totalVat);
    if (vat.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-3306',
        debit: '0',
        credit: vat.toFixed(0),
        description: `مالیات ارزش افزوده سفارش آنلاین شماره ${params.orderNumber}`,
        currencyCode: 'IRR',
        currencyRate: '1'
      });
    }

    // ۵. بستانکار: کرایه حمل و بسته‌بندی دریافتی (۶۱۰۵)
    const ship = new Decimal(p.shippingFee);
    if (ship.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-6105',
        floatingDimension2Id: params.costCenterDimensionId,
        debit: '0',
        credit: ship.toFixed(0),
        description: `هزینه حمل سفارش آنلاین شماره ${params.orderNumber}`,
        currencyCode: 'IRR',
        currencyRate: '1'
      });
    }

    // ۶. بهای تمام‌شده و خروج از انبار: بدهکار ۷۱۰۱ و بستانکار ۱۵۰۱
    const cogs = new Decimal(p.totalCogs);
    if (cogs.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-7101',
        floatingDimension2Id: params.costCenterDimensionId,
        debit: cogs.toFixed(0),
        credit: '0',
        description: `بهای تمام شده کالای فروش آنلاین سفارش ${params.orderNumber}`,
        currencyCode: 'IRR',
        currencyRate: '1'
      });

      lines.push({
        subsidiaryAccountId: 'sub-1501',
        floatingDimension1Id: params.warehouseDimensionId,
        debit: '0',
        credit: cogs.toFixed(0),
        description: `خروج کالای فروش رفته آنلاین سفارش ${params.orderNumber} از انبار`,
        currencyCode: 'IRR',
        currencyRate: '1'
      });
    }

    return lines;
  }

  /**
   * تولید سند تسویه درگاه اینترنتی با حساب بانکی شرکت (واریز شاپرک به بانک)
   */
  public static buildGatewaySettlementLines(params: {
    orderNumber: string;
    settledAmount: string | number; // مبلغ واریزشده
    gatewayFee: string | number; // کارمزد شاپرک
    bankSubsidiaryId?: string; // sub-1103
    bankDimensionId?: string;
    gatewaySubsidiaryId?: string; // sub-1104
    gatewayDimensionId?: string;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const total = new Decimal(params.settledAmount);
    const fee = new Decimal(params.gatewayFee || 0);
    const netDeposit = total.minus(fee);

    const lines: JournalLineInput[] = [];

    // بدهکار: موجودی بانک شرکت (۱۱۰۳)
    lines.push({
      subsidiaryAccountId: params.bankSubsidiaryId || 'sub-1103',
      floatingDimension1Id: params.bankDimensionId,
      debit: netDeposit.toFixed(0),
      credit: '0',
      description: `واریز شاپرک بابت تسویه سفارش آنلاین ${params.orderNumber}`,
      currencyCode: 'IRR',
      currencyRate: '1'
    });

    // در صورت وجود کارمزد: بدهکار هزینه مالی و بانکی (۸۱۰۵)
    if (fee.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-8105',
        floatingDimension2Id: params.costCenterDimensionId,
        debit: fee.toFixed(0),
        credit: '0',
        description: `کارمزد درگاه اینترنتی شاپرک سفارش ${params.orderNumber}`,
        currencyCode: 'IRR',
        currencyRate: '1'
      });
    }

    // بستانکار: وجوه در راه درگاه اینترنتی (۱۱۰۴) جهت صفر کردن مانده
    lines.push({
      subsidiaryAccountId: params.gatewaySubsidiaryId || 'sub-1104',
      floatingDimension1Id: params.gatewayDimensionId,
      debit: '0',
      credit: total.toFixed(0),
      description: `تسویه حساب وجوه در راه درگاه عطف به سفارش ${params.orderNumber}`,
      currencyCode: 'IRR',
      currencyRate: '1'
    });

    return lines;
  }
}
