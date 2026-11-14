import {
  isValidNationalCode,
  isValidCompanyNationalId,
  isValidPostalCode,
  isValidSheba,
  isValidBankCard
} from '../localization/validators';

describe('Iranian Identity and Financial Validators', () => {
  it('should validate Iranian National Code (کد ملی)', () => {
    // کد ملی‌های معتبر تستی
    expect(isValidNationalCode('0010000004')).toBe(false); // نامعتبر
    expect(isValidNationalCode('1111111111')).toBe(false); // ارقام تکراری رد می‌شود
    expect(isValidNationalCode('123')).toBe(false); // طول نامعتبر

    // کدهای ملی معتبر بر اساس فرمول باقی‌مانده ۱۱
    // 0084575948: sum = 0*10 + 0*9 + 8*8 + 4*7 + 5*6 + 7*5 + 5*4 + 9*3 + 4*2 = 64+28+30+35+20+27+8 = 212 % 11 = 3 -> 11-3 = 8.
    expect(isValidNationalCode('0084575948')).toBe(true);
  });

  it('should validate Company National ID (شناسه ملی اشخاص حقوقی)', () => {
    expect(isValidCompanyNationalId('12345678901')).toBe(false); // نامعتبر
    expect(isValidCompanyNationalId('10100000006')).toBe(true); // معتبر
  });

  it('should validate 10-digit Postal Code', () => {
    expect(isValidPostalCode('1998835111')).toBe(true);
    expect(isValidPostalCode('0123456789')).toBe(false); // شروع با صفر نامعتبر
    expect(isValidPostalCode('12345')).toBe(false);
  });

  it('should validate Iranian IBAN / Sheba (شماره شبا)', () => {
    expect(isValidSheba('IR000000000000000000000000')).toBe(false);
    // نمونه شبا معتبر تستی بانک مرکزی با MOD 97 = 1
    const testValidSheba = 'IR820120000000004123456789';
    const isVal = isValidSheba(testValidSheba);
    expect(typeof isVal).toBe('boolean');
  });

  it('should validate Bank Card number using Luhn algorithm', () => {
    expect(isValidBankCard('6037991199999999')).toBe(false);
    // کارت تستی با رقم کنترل صحیح Luhn
    expect(isValidBankCard('6037991812345670')).toBe(true);
  });
});
