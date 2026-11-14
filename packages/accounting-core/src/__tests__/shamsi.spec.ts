import {
  gregorianToShamsi,
  shamsiToGregorian,
  formatToShamsiString,
  shamsiStringToDate,
  isShamsiLeapYear,
  getShamsiMonthDays
} from '../localization/shamsi';

describe('Shamsi Calendar Engine', () => {
  it('should correctly identify leap years in Persian calendar', () => {
    expect(isShamsiLeapYear(1399)).toBe(true);
    expect(isShamsiLeapYear(1403)).toBe(true);
    expect(isShamsiLeapYear(1402)).toBe(false);
    expect(isShamsiLeapYear(1404)).toBe(false);
  });

  it('should return correct month days for first and second 6 months and Esfand in leap years', () => {
    expect(getShamsiMonthDays(1403, 1)).toBe(31);
    expect(getShamsiMonthDays(1403, 6)).toBe(31);
    expect(getShamsiMonthDays(1403, 7)).toBe(30);
    expect(getShamsiMonthDays(1403, 11)).toBe(30);
    // سال ۱۴۰۳ کبیسه است، اسفند ۳۰ روز
    expect(getShamsiMonthDays(1403, 12)).toBe(30);
    // سال ۱۴۰۲ عادی است، اسفند ۲۹ روز
    expect(getShamsiMonthDays(1402, 12)).toBe(29);
  });

  it('should convert known dates accurately between Gregorian and Shamsi', () => {
    // 2024-03-20 is 1403/01/01
    const s1 = gregorianToShamsi(2024, 3, 20);
    expect(s1).toEqual({ year: 1403, month: 1, day: 1 });

    const g1 = shamsiToGregorian(1403, 1, 1);
    expect(g1).toEqual({ year: 2024, month: 3, day: 20 });

    // 2024-11-14 is 1403/08/24
    const s2 = gregorianToShamsi(2024, 11, 14);
    expect(s2).toEqual({ year: 1403, month: 8, day: 24 });

    const g2 = shamsiToGregorian(1403, 8, 24);
    expect(g2).toEqual({ year: 2024, month: 11, day: 14 });
  });

  it('should format and parse shamsi date strings', () => {
    const d = new Date(Date.UTC(2024, 10, 14)); // month index 10 is November
    expect(formatToShamsiString(d)).toBe('1403/08/24');

    const parsed = shamsiStringToDate('1403/08/24');
    expect(parsed.getUTCFullYear()).toBe(2024);
    expect(parsed.getUTCMonth()).toBe(10);
    expect(parsed.getUTCDate()).toBe(14);
  });
});
