import { JournalLineInput } from '../journal/types';

export interface ChequePostingContext {
  amount: string | number;
  chequeSerialNumber: string;
  sayadId?: string;
  drawerPartyDimensionId: string;
  payeePartyDimensionId?: string;
  bankDimensionId?: string;
  cashDeskDimensionId?: string;
  pettyCustodianDimensionId?: string;
  descriptionSuffix?: string;
}

export class ChequePostingEngine {
  /**
   * ۱. سند دریافت چک از مشتری (تسویه حساب بدهکاران)
   */
  public static buildReceivableReceiptLines(ctx: ChequePostingContext): JournalLineInput[] {
    const desc = `دریافت چک صیادی شماره ${ctx.chequeSerialNumber}${ctx.sayadId ? ` (صیاد: ${ctx.sayadId})` : ''}${ctx.descriptionSuffix ? ` - ${ctx.descriptionSuffix}` : ''}`;
    return [
      {
        subsidiaryAccountId: 'sub-1201', // اسناد دریافتنی نزد صندوق
        floatingDimension1Id: ctx.drawerPartyDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1301', // بدهکاران تجاری
        floatingDimension1Id: ctx.drawerPartyDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۲. سند واگذاری چک به بانک جهت وصول (خواباندن چک به حساب)
   */
  public static buildDepositToBankLines(ctx: ChequePostingContext): JournalLineInput[] {
    if (!ctx.bankDimensionId) {
      throw new Error('برای واگذاری چک به بانک، مشخص کردن حساب بانکی الزامی است.');
    }
    const desc = `واگذاری چک شماره ${ctx.chequeSerialNumber} به بانک جهت وصول`;
    return [
      {
        subsidiaryAccountId: 'sub-1202', // اسناد دریافتنی در جریان وصول
        floatingDimension1Id: ctx.bankDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1201', // اسناد دریافتنی نزد صندوق
        floatingDimension1Id: ctx.drawerPartyDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۳. سند وصول چک توسط بانک و واریز به حساب شرکت
   */
  public static buildClearReceivableLines(ctx: ChequePostingContext): JournalLineInput[] {
    if (!ctx.bankDimensionId) {
      throw new Error('برای ثبت وصول چک، مشخص کردن حساب بانکی الزامی است.');
    }
    const desc = `وصول چک صیادی شماره ${ctx.chequeSerialNumber} و واریز به حساب بانکی`;
    return [
      {
        subsidiaryAccountId: 'sub-1103', // موجودی نزد بانک‌ها
        floatingDimension1Id: ctx.bankDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1202', // اسناد در جریان وصول
        floatingDimension1Id: ctx.bankDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۴. سند برگشت خوردن چک دریافتی
   */
  public static buildBounceReceivableLines(ctx: ChequePostingContext): JournalLineInput[] {
    if (!ctx.bankDimensionId) {
      throw new Error('برای ثبت برگشت چک، حساب بانکی وصول‌کننده الزامی است.');
    }
    const desc = `برگشت چک صیادی شماره ${ctx.chequeSerialNumber} به علت عدم موجودی`;
    return [
      {
        subsidiaryAccountId: 'sub-1203', // اسناد دریافتنی برگشتی
        floatingDimension1Id: ctx.drawerPartyDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1202', // اسناد در جریان وصول
        floatingDimension1Id: ctx.bankDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۵. سند خرج چک (انتقال چک مشتری به بستانکاران/تامین‌کننده)
   */
  public static buildTransferOutLines(ctx: ChequePostingContext): JournalLineInput[] {
    if (!ctx.payeePartyDimensionId) {
      throw new Error('برای خرج چک، مشخص کردن تامین‌کننده گیرنده الزامی است.');
    }
    const desc = `خرج چک دریافتی شماره ${ctx.chequeSerialNumber} و انتقال به بستانکار تجاری`;
    return [
      {
        subsidiaryAccountId: 'sub-3201', // بستانکاران تجاری
        floatingDimension1Id: ctx.payeePartyDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1201', // اسناد نزد صندوق
        floatingDimension1Id: ctx.drawerPartyDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۶. سند صدور چک پرداختی عهده بانک شرکت به تامین‌کننده
   */
  public static buildIssuePayableLines(ctx: ChequePostingContext): JournalLineInput[] {
    if (!ctx.payeePartyDimensionId || !ctx.bankDimensionId) {
      throw new Error('برای صدور چک پرداختی، مشخص کردن ذینفع و بانک صادرکننده الزامی است.');
    }
    const desc = `صدور چک پرداختی شماره ${ctx.chequeSerialNumber} عهده بانک در وجه بستانکار`;
    return [
      {
        subsidiaryAccountId: 'sub-3201', // بستانکاران تجاری
        floatingDimension1Id: ctx.payeePartyDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-3101', // اسناد پرداختنی تجاری عهده بانک‌ها
        floatingDimension1Id: ctx.bankDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۷. سند پاس شدن چک پرداختی شرکت توسط بانک
   */
  public static buildClearPayableLines(ctx: ChequePostingContext): JournalLineInput[] {
    if (!ctx.bankDimensionId) {
      throw new Error('مشخص کردن حساب بانکی الزامی است.');
    }
    const desc = `پاس شدن چک پرداختی شماره ${ctx.chequeSerialNumber} و کسر از حساب بانک`;
    return [
      {
        subsidiaryAccountId: 'sub-3101', // اسناد پرداختنی عهده بانک‌ها
        floatingDimension1Id: ctx.bankDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1103', // موجودی نزد بانک‌ها
        floatingDimension1Id: ctx.bankDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۸. سند دریافت چک ضمانتی حسن انجام کار (حساب‌های انتظامی گروه ۹)
   */
  public static buildGuaranteeLines(ctx: ChequePostingContext): JournalLineInput[] {
    const desc = `دریافت چک ضمانتی حسن انجام کار به شماره ${ctx.chequeSerialNumber}`;
    return [
      {
        subsidiaryAccountId: 'sub-9101', // حساب‌های انتظامی به نفع شرکت
        floatingDimension1Id: ctx.drawerPartyDimensionId,
        debit: ctx.amount,
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-9102', // طرف حساب‌های انتظامی به نفع شرکت
        floatingDimension1Id: ctx.drawerPartyDimensionId,
        debit: 0,
        credit: ctx.amount,
        description: desc
      }
    ];
  }

  /**
   * ۹. سند انتقال وجه بین حساب‌ها (مثلا بانک به صندوق)
   */
  public static buildMoneyTransferLines(
    sourceSubsidiaryId: string,
    sourceDimensionId: string,
    destSubsidiaryId: string,
    destDimensionId: string,
    amount: string | number,
    description: string
  ): JournalLineInput[] {
    return [
      {
        subsidiaryAccountId: destSubsidiaryId,
        floatingDimension1Id: destDimensionId,
        debit: amount,
        credit: 0,
        description: `انتقال وجه وارده: ${description}`
      },
      {
        subsidiaryAccountId: sourceSubsidiaryId,
        floatingDimension1Id: sourceDimensionId,
        debit: 0,
        credit: amount,
        description: `انتقال وجه صادره: ${description}`
      }
    ];
  }
}
