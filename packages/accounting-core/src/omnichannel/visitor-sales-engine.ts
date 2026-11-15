import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface CustomerCreditStatus {
  partyId: string;
  partyName: string;
  creditLimit: string;
  currentOpenBalance: string;
  newOrderAmount: string;
  isCreditApproved: boolean;
  remainingCredit: string;
  hasOverdueInvoices: boolean;
  overdueDays?: number;
  rejectionReason?: string;
}

export interface GeofenceValidationResult {
  distanceMeters: number;
  allowedRadiusMeters: number;
  isWithinGeofence: boolean;
}

export class VisitorSalesEngine {
  /**
   * کنترل سقف اعتبار و مطالبات معوق مشتری جهت ثبت سفارش توسط بازاریاب/ویزیتور
   */
  public static validateCustomerCredit(params: {
    partyId: string;
    partyName: string;
    creditLimit: string | number;
    currentOpenBalance: string | number;
    newOrderAmount: string | number;
    hasOverdueInvoices?: boolean;
    overdueDays?: number;
  }): CustomerCreditStatus {
    const limit = new Decimal(params.creditLimit || 0);
    const current = new Decimal(params.currentOpenBalance || 0);
    const order = new Decimal(params.newOrderAmount || 0);

    const projectedTotal = current.plus(order);
    const remaining = limit.minus(current);

    if (params.hasOverdueInvoices && (params.overdueDays || 0) > 30) {
      return {
        partyId: params.partyId,
        partyName: params.partyName,
        creditLimit: limit.toFixed(0),
        currentOpenBalance: current.toFixed(0),
        newOrderAmount: order.toFixed(0),
        isCreditApproved: false,
        remainingCredit: remaining.toFixed(0),
        hasOverdueInvoices: true,
        overdueDays: params.overdueDays,
        rejectionReason: `مشتری دارای فاکتور معوق با تاخیر ${params.overdueDays} روزه است و امکان ثبت سفارش نسیه ندارد.`
      };
    }

    if (limit.greaterThan(0) && projectedTotal.greaterThan(limit)) {
      const excess = projectedTotal.minus(limit);
      return {
        partyId: params.partyId,
        partyName: params.partyName,
        creditLimit: limit.toFixed(0),
        currentOpenBalance: current.toFixed(0),
        newOrderAmount: order.toFixed(0),
        isCreditApproved: false,
        remainingCredit: remaining.toFixed(0),
        hasOverdueInvoices: false,
        rejectionReason: `مبلغ سفارش جدید سقف اعتبار مشتری را به میزان ${excess.toFixed(0)} ریال نقض می‌کند.`
      };
    }

    return {
      partyId: params.partyId,
      partyName: params.partyName,
      creditLimit: limit.toFixed(0),
      currentOpenBalance: current.toFixed(0),
      newOrderAmount: order.toFixed(0),
      isCreditApproved: true,
      remainingCredit: remaining.minus(order).toFixed(0),
      hasOverdueInvoices: false
    };
  }

  /**
   * محاسبه فاصله جغرافیایی و اعتبارسنجی حضور فیزیکی ویزیتور در محدوده فروشگاه (Geofencing)
   * با استفاده از فرمول Haversine
   */
  public static validateGeofence(
    visitorLat: number,
    visitorLon: number,
    targetLat: number,
    targetLon: number,
    allowedRadiusMeters: number = 200
  ): GeofenceValidationResult {
    const R = 6371e3; // شعاع کره زمین به متر
    const phi1 = (visitorLat * Math.PI) / 180;
    const phi2 = (targetLat * Math.PI) / 180;
    const deltaPhi = ((targetLat - visitorLat) * Math.PI) / 180;
    const deltaLambda = ((targetLon - visitorLon) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(R * c);

    return {
      distanceMeters,
      allowedRadiusMeters,
      isWithinGeofence: distanceMeters <= allowedRadiusMeters
    };
  }
}
