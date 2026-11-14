import Decimal from 'decimal.js';
import { PartyAgingReport } from './types';
import { parseShamsiString, shamsiToGregorian } from '../localization/shamsi';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface OpenInvoiceItem {
  partyId: string;
  partyName: string;
  invoiceId: string;
  invoiceNumber: string;
  dueDateShamsi: string;
  remainingAmount: string | number; // مبلغ مانده پرداخت نشده فاکتور
}

export class PartyAgingEngine {
  /**
   * محاسبه سن مطالبات / بدهی‌ها (Aging Analysis)
   */
  public static calculateAging(
    currentDateShamsi: string,
    openInvoices: OpenInvoiceItem[]
  ): PartyAgingReport[] {
    const curr = parseShamsiString(currentDateShamsi);
    const currG = shamsiToGregorian(curr.year, curr.month, curr.day);
    const currDate = new Date(Date.UTC(currG.year, currG.month - 1, currG.day));

    const partyMap = new Map<
      string,
      {
        partyName: string;
        d0_30: Decimal;
        d31_60: Decimal;
        d61_90: Decimal;
        d90_plus: Decimal;
        total: Decimal;
      }
    >();

    for (const inv of openInvoices) {
      const invD = parseShamsiString(inv.dueDateShamsi);
      const invG = shamsiToGregorian(invD.year, invD.month, invD.day);
      const invDueDate = new Date(Date.UTC(invG.year, invG.month - 1, invG.day));

      const diffTime = currDate.getTime() - invDueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const amount = new Decimal(inv.remainingAmount);

      const entry = partyMap.get(inv.partyId) || {
        partyName: inv.partyName,
        d0_30: new Decimal(0),
        d31_60: new Decimal(0),
        d61_90: new Decimal(0),
        d90_plus: new Decimal(0),
        total: new Decimal(0)
      };

      entry.total = entry.total.plus(amount);

      if (diffDays <= 30) {
        entry.d0_30 = entry.d0_30.plus(amount);
      } else if (diffDays <= 60) {
        entry.d31_60 = entry.d31_60.plus(amount);
      } else if (diffDays <= 90) {
        entry.d61_90 = entry.d61_90.plus(amount);
      } else {
        entry.d90_plus = entry.d90_plus.plus(amount);
      }

      partyMap.set(inv.partyId, entry);
    }

    const reports: PartyAgingReport[] = [];
    for (const [partyId, data] of partyMap.entries()) {
      reports.push({
        partyId,
        partyName: data.partyName,
        totalReceivable: data.total.toFixed(0),
        buckets: {
          days0To30: data.d0_30.toFixed(0),
          days31To60: data.d31_60.toFixed(0),
          days61To90: data.d61_90.toFixed(0),
          daysOver90: data.d90_plus.toFixed(0)
        }
      });
    }

    return reports;
  }
}
