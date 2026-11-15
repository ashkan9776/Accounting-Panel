import {
  EscPosReceiptOptions,
  PcPosRequestPayload,
  PcPosResponsePayload,
  ScaleReadingResult,
  RawAttendanceLogItem,
  EmployeeDailyAttendanceSummary,
  AttendanceLogType
} from './types';

export class HardwareDriverEngine {
  /**
   * تولید بایت‌های خام پروتکل ESC/POS برای پرینترهای حرارتی ۸۰ میلی‌متری
   */
  public static generateEscPosReceipt(options: EscPosReceiptOptions): Buffer {
    const bytes: number[] = [];

    // ۱. مقداردهی اولیه پرینتر (ESC @)
    bytes.push(0x1b, 0x40);

    // باز کردن کشوی پول در صورت درخواست (ESC p 0 25 250)
    if (options.openCashDrawer) {
      bytes.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    }

    // ۲. تراز وسط برای سربرگ (ESC a 1)
    bytes.push(0x1b, 0x61, 0x01);

    // فونت بزرگ و بولد برای نام شرکت (GS ! 0x11, ESC E 1)
    bytes.push(0x1d, 0x21, 0x11);
    bytes.push(0x1b, 0x45, 0x01);
    this.appendUtf8(bytes, `${options.companyName}\n`);

    // فونت معمولی برای شعبه و اطلاعات فاکتور
    bytes.push(0x1d, 0x21, 0x00);
    bytes.push(0x1b, 0x45, 0x00);
    if (options.branchTitle) {
      this.appendUtf8(bytes, `شعبه: ${options.branchTitle}\n`);
    }
    this.appendUtf8(bytes, `شماره سفارش: ${options.orderNumber}\n`);
    this.appendUtf8(bytes, `تاریخ: ${options.dateShamsi}\n`);
    if (options.customerName) {
      this.appendUtf8(bytes, `مشتری: ${options.customerName}\n`);
    }

    this.appendUtf8(bytes, '------------------------------------------------\n');

    // ۳. تراز راست برای جدول اقلام
    bytes.push(0x1b, 0x61, 0x02);
    this.appendUtf8(bytes, 'نام کالا                     تعداد   مبلغ کل\n');
    this.appendUtf8(bytes, '------------------------------------------------\n');

    for (const item of options.items) {
      const line = `${item.title.padEnd(25, ' ')} ${String(item.qty).padStart(4, ' ')} ${item.totalPrice.padStart(15, ' ')}\n`;
      this.appendUtf8(bytes, line);
    }

    this.appendUtf8(bytes, '------------------------------------------------\n');

    // ۴. خلاصه مبالغ
    this.appendUtf8(bytes, `جمع کالاها:            ${options.subtotal} ریال\n`);
    if (options.discount && options.discount !== '0') {
      this.appendUtf8(bytes, `تخفیف:                 ${options.discount} ریال\n`);
    }
    if (options.vat && options.vat !== '0') {
      this.appendUtf8(bytes, `مالیات ارزش افزوده:    ${options.vat} ریال\n`);
    }
    if (options.shippingFee && options.shippingFee !== '0') {
      this.appendUtf8(bytes, `هزینه حمل و ارسال:     ${options.shippingFee} ریال\n`);
    }

    // ۵. مبلغ کل نهایی با فونت بولد
    bytes.push(0x1b, 0x45, 0x01);
    this.appendUtf8(bytes, `مبلغ قابل پرداخت:      ${options.grandTotal} ریال\n`);
    bytes.push(0x1b, 0x45, 0x00);

    this.appendUtf8(bytes, '================================================\n');

    // ۶. پیام پانوشت و بارکد دو بعدی
    bytes.push(0x1b, 0x61, 0x01); // وسط‌چین
    if (options.footerNote) {
      this.appendUtf8(bytes, `${options.footerNote}\n`);
    } else {
      this.appendUtf8(bytes, 'از خرید و اعتماد شما سپاسگزاریم\n');
    }

    // بارکد دو بعدی QR (در صورت وجود payload)
    if (options.qrPayload) {
      this.appendQrCode(bytes, options.qrPayload);
    }

    // تغذیه چند خط و برش کاغذ (GS V 66 0)
    this.appendUtf8(bytes, '\n\n\n');
    bytes.push(0x1d, 0x56, 0x42, 0x00);

    return Buffer.from(bytes);
  }

  private static appendUtf8(target: number[], text: string) {
    const buf = Buffer.from(text, 'utf8');
    for (const b of buf) {
      target.push(b);
    }
  }

  private static appendQrCode(target: number[], text: string) {
    const textBytes = Buffer.from(text, 'utf8');
    const len = textBytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    // ۱. تنظیم اندازه مدل QR (GS ( k 4 0 49 65 50 0)
    target.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // ۲. تنظیم اندازه ماژول QR (GS ( k 3 0 49 67 6)
    target.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06);
    // ۳. تنظیم تصحیح خطا سطح M (GS ( k 3 0 49 69 49)
    target.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    // ۴. ذخیره داده در بافر
    target.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (const b of textBytes) target.push(b);
    // ۵. چاپ بارکد QR ذخیره‌شده (GS ( k 3 0 49 81 48)
    target.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
  }

  /**
   * تولید پکت درخواست تراکنش خرید برای دستگاه PC-POS بانکی ایران
   */
  public static buildPcPosSaleRequest(payload: PcPosRequestPayload): {
    commandHex: string;
    packetBuffer: Buffer;
  } {
    // فرمت استاندارد پروتکل LAN/Serial کارتخوان‌های ایران (STX + CMD + Data + ETX + LRC)
    const STX = 0x02;
    const ETX = 0x03;
    const cmdSale = '00'; // تراکنش خرید عادی

    const amountFormatted = payload.amount.padStart(12, '0');
    const orderFormatted = payload.orderId.padEnd(20, ' ');
    const dataString = `${cmdSale}|${payload.terminalId}|${amountFormatted}|${orderFormatted}|${payload.additionalData || ''}`;

    const dataBuffer = Buffer.from(dataString, 'ascii');
    const bytes: number[] = [STX];
    for (const b of dataBuffer) bytes.push(b);
    bytes.push(ETX);

    // محاسبه LRC (Longitudinal Redundancy Check)
    let lrc = 0;
    for (let i = 1; i < bytes.length; i++) {
      lrc ^= bytes[i];
    }
    bytes.push(lrc);

    const buf = Buffer.from(bytes);
    return {
      commandHex: buf.toString('hex'),
      packetBuffer: buf
    };
  }

  /**
   * پارس کردن پاسخ دریافتی از دستگاه PC-POS
   */
  public static parsePcPosResponse(rawResponse: string | Buffer): PcPosResponsePayload {
    const str = Buffer.isBuffer(rawResponse) ? rawResponse.toString('ascii') : rawResponse;
    const cleanStr = str.replace(/[\x02\x03]/g, '').trim();
    const parts = cleanStr.split('|');

    // فرمت خروجی: RESPONSE_CODE|TERMINAL_ID|AMOUNT|RRN|TRACE|CARD_PAN|DATETIME|ERROR_MSG
    const respCode = parts[0] || '99';
    const isSuccess = respCode === '00';

    return {
      isSuccess,
      responseCode: respCode,
      terminalId: parts[1] || 'POS-DEFAULT',
      amount: parts[2] ? String(parseInt(parts[2], 10)) : '0',
      rrn: parts[3] || '999999999999',
      traceNumber: parts[4] || '123456',
      cardPanMasked: parts[5] || '603799******1234',
      transactionDateTimeShamsi: parts[6] || '1403/12/29 14:30:00',
      errorMessage: isSuccess ? undefined : (parts[7] || 'خطای تراکنش کارتخوان')
    };
  }

  /**
   * پارس رشته وزن ترازوی دیجیتال (استاندارد NCI / Toledo)
   */
  public static parseScaleReading(rawString: string): ScaleReadingResult {
    // نمونه فرمت: "ST,GS,+001.250kg" یا "US,GS,+000.000kg"
    const cleaned = rawString.trim().toUpperCase();
    const isStable = cleaned.startsWith('ST');

    let netGrams = 0;
    const match = cleaned.match(/([+-]?\d+(\.\d+)?)\s*(KG|G)?/);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = match[3] || 'KG';
      netGrams = unit === 'KG' ? Math.round(val * 1000) : Math.round(val);
    }

    return {
      isStable,
      netWeightGrams: Math.max(0, netGrams),
      tareWeightGrams: 0,
      rawString
    };
  }

  /**
   * پردازش لاگ‌های تردد دستگاه حضور و غیاب و محاسبه کارکرد و اضافه‌کاری پرسنل
   */
  public static processDailyAttendance(
    employeeId: string,
    dateShamsi: string,
    logs: RawAttendanceLogItem[],
    standardDailyMinutes: number = 480 // ۸ ساعت
  ): EmployeeDailyAttendanceSummary {
    const employeeLogs = logs
      .filter((l) => l.employeeId === employeeId && l.dateShamsi === dateShamsi)
      .sort((a, b) => a.timeString.localeCompare(b.timeString));

    if (employeeLogs.length === 0) {
      return {
        employeeId,
        dateShamsi,
        totalPresentMinutes: 0,
        standardWorkMinutes: standardDailyMinutes,
        overtimeMinutes: 0,
        undertimeMinutes: standardDailyMinutes
      };
    }

    const firstIn = employeeLogs.find((l) => l.type === AttendanceLogType.CLOCK_IN);
    const lastOut = [...employeeLogs].reverse().find((l) => l.type === AttendanceLogType.CLOCK_OUT);

    let totalMinutes = 0;
    if (firstIn && lastOut) {
      const inParts = firstIn.timeString.split(':').map(Number);
      const outParts = lastOut.timeString.split(':').map(Number);

      const inTotalMin = inParts[0] * 60 + inParts[1];
      const outTotalMin = outParts[0] * 60 + outParts[1];

      if (outTotalMin > inTotalMin) {
        totalMinutes = outTotalMin - inTotalMin;
      }
    }

    const overtime = Math.max(0, totalMinutes - standardDailyMinutes);
    const undertime = Math.max(0, standardDailyMinutes - totalMinutes);

    return {
      employeeId,
      dateShamsi,
      firstClockIn: firstIn?.timeString,
      lastClockOut: lastOut?.timeString,
      totalPresentMinutes: totalMinutes,
      standardWorkMinutes: standardDailyMinutes,
      overtimeMinutes: overtime,
      undertimeMinutes: undertime
    };
  }
}
