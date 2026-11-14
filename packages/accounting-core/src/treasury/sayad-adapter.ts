import {
  ISayadChequeAdapter,
  SayadInquiryResult,
  SayadColor
} from './types';

export class MockSayadAdapter implements ISayadChequeAdapter {
  private registeredCheques = new Map<string, any>();

  public async inquireCheque(sayadId: string): Promise<SayadInquiryResult> {
    const cleanId = sayadId.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cleanId)) {
      return {
        sayadId: cleanId,
        isValid: false,
        drawerNationalId: '',
        drawerName: '',
        amount: '0',
        dueDateShamsi: '',
        bankName: '',
        color: SayadColor.RED,
        isBounced: false,
        message: 'شناسه صیاد نامعتبر است (باید دقیقاً ۱۶ رقم باشد).'
      };
    }

    // شبیه‌سازی وضعیت اعتباری صادرکننده بر اساس دو رقم آخر
    const lastDigits = parseInt(cleanId.slice(-2), 10);
    let color = SayadColor.WHITE;
    let isBounced = false;

    if (lastDigits >= 90) {
      color = SayadColor.RED;
      isBounced = true;
    } else if (lastDigits >= 80) {
      color = SayadColor.BROWN;
      isBounced = true;
    } else if (lastDigits >= 70) {
      color = SayadColor.ORANGE;
    } else if (lastDigits >= 60) {
      color = SayadColor.YELLOW;
    }

    return {
      sayadId: cleanId,
      isValid: true,
      drawerNationalId: '0084575948',
      drawerName: 'صادرکننده صیاد نمونه',
      amount: '50000000',
      dueDateShamsi: '1403/10/30',
      bankName: 'بانک سامان',
      color,
      isBounced,
      message: `استعلام موفق سامانه صیاد بانک مرکزی. وضعیت اعتباری: ${color}`
    };
  }

  public async registerCheque(data: {
    sayadId: string;
    amount: string;
    dueDateShamsi: string;
    payeeNationalId: string;
    description?: string;
  }): Promise<{ success: boolean; trackingNumber: string; message: string }> {
    const cleanId = data.sayadId.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cleanId)) {
      throw new Error('شناسه صیاد باید ۱۶ رقم باشد.');
    }

    const trackingNumber = `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.registeredCheques.set(cleanId, {
      ...data,
      trackingNumber,
      status: 'REGISTERED'
    });

    return {
      success: true,
      trackingNumber,
      message: 'چک صیادی با موفقیت در سامانه پیچک بانک مرکزی ثبت گردید.'
    };
  }

  public async confirmCheque(sayadId: string, receiverNationalId: string): Promise<{ success: boolean; message: string }> {
    const cleanId = sayadId.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cleanId)) {
      throw new Error('شناسه صیاد نامعتبر است.');
    }

    return {
      success: true,
      message: `چک صیادی ${cleanId} توسط ذینفع با کدملی ${receiverNationalId} در سامانه تایید شد.`
    };
  }

  public async transferCheque(
    sayadId: string,
    currentHolderNationalId: string,
    newReceiverNationalId: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanId = sayadId.replace(/\s+/g, '');
    return {
      success: true,
      message: `چک صیادی ${cleanId} با موفقیت به ذینفع جدید با کدملی ${newReceiverNationalId} انتقال یافت.`
    };
  }
}
