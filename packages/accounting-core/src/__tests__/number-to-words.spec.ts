import {
  numberToPersianWords,
  amountToPersianWords,
  formatThousands,
  toPersianDigits
} from '../localization/number-to-words';

describe('Number to Persian Words Engine', () => {
  it('should convert single and double digit numbers to Persian words', () => {
    expect(numberToPersianWords(0)).toBe('صفر');
    expect(numberToPersianWords(5)).toBe('پنج');
    expect(numberToPersianWords(13)).toBe('سیزده');
    expect(numberToPersianWords(85)).toBe('هشتاد و پنج');
  });

  it('should convert hundreds, thousands and millions', () => {
    expect(numberToPersianWords(100)).toBe('صد');
    expect(numberToPersianWords(1000)).toBe('یک هزار');
    expect(numberToPersianWords(1000000)).toBe('یک میلیون');
    expect(numberToPersianWords(10500000)).toBe('ده میلیون و پانصد هزار');
  });

  it('should format monetary amounts with Rial or Toman unit', () => {
    expect(amountToPersianWords(10000000, 'RIAL')).toBe('ده میلیون ریال');
    expect(amountToPersianWords(500000, 'TOMAN')).toBe('پانصد هزار تومان');
    expect(amountToPersianWords(0, 'RIAL')).toBe('صفر ریال');
  });

  it('should format numbers with thousands separator', () => {
    expect(formatThousands(10000000)).toBe('10,000,000');
    expect(formatThousands('1250000.50')).toBe('1,250,000.50');
  });

  it('should convert latin digits to Persian digits', () => {
    expect(toPersianDigits('1403/08/24')).toBe('۱۴۰۳/۰۸/۲۴');
    expect(toPersianDigits(1234567890)).toBe('۱۲۳۴۵۶۷۸۹۰');
  });
});
