import { ChequePostingEngine } from '../treasury/cheque-posting-engine';
import { MockSayadAdapter } from '../treasury/sayad-adapter';
import { PartyAgingEngine } from '../treasury/party-aging';
import { JournalEngine } from '../journal/journal-engine';
import { SayadColor } from '../treasury/types';

describe('Treasury & Cheque Posting Engine (خزانه‌داری، چک صیاد و سن بدهی)', () => {
  const sayadAdapter = new MockSayadAdapter();

  describe('Receivable & Payable Cheque Lifecycle Posting', () => {
    const ctx = {
      amount: '50000000',
      chequeSerialNumber: 'CHQ-1403-9821',
      sayadId: '1234567890123456',
      drawerPartyDimensionId: 'dim-cust-1',
      payeePartyDimensionId: 'dim-supp-1',
      bankDimensionId: 'dim-bank-1'
    };

    it('Step 1: Receipt lines should be balanced (Debit 1201 / Credit 1301)', () => {
      const lines = ChequePostingEngine.buildReceivableReceiptLines(ctx);
      const res = JournalEngine.validateLines(lines);
      expect(res.totalDebit.toFixed(0)).toBe('50000000');
      expect(res.totalCredit.toFixed(0)).toBe('50000000');
      expect(lines[0].subsidiaryAccountId).toBe('sub-1201');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1301');
    });

    it('Step 2: Deposit to bank lines should be balanced (Debit 1202 / Credit 1201)', () => {
      const lines = ChequePostingEngine.buildDepositToBankLines(ctx);
      const res = JournalEngine.validateLines(lines);
      expect(res.totalDebit.toFixed(0)).toBe('50000000');
      expect(res.totalCredit.toFixed(0)).toBe('50000000');
      expect(lines[0].subsidiaryAccountId).toBe('sub-1202');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1201');
    });

    it('Step 3: Clear receivable lines should be balanced (Debit 1103 / Credit 1202)', () => {
      const lines = ChequePostingEngine.buildClearReceivableLines(ctx);
      const res = JournalEngine.validateLines(lines);
      expect(res.totalDebit.toFixed(0)).toBe('50000000');
      expect(res.totalCredit.toFixed(0)).toBe('50000000');
      expect(lines[0].subsidiaryAccountId).toBe('sub-1103');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1202');
    });

    it('Step 4: Bounce lines should be balanced (Debit 1203 / Credit 1202)', () => {
      const lines = ChequePostingEngine.buildBounceReceivableLines(ctx);
      const res = JournalEngine.validateLines(lines);
      expect(res.totalDebit.toFixed(0)).toBe('50000000');
      expect(res.totalCredit.toFixed(0)).toBe('50000000');
      expect(lines[0].subsidiaryAccountId).toBe('sub-1203');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1202');
    });

    it('Step 5: Transfer out (خرج چک) lines should be balanced (Debit 3201 / Credit 1201)', () => {
      const lines = ChequePostingEngine.buildTransferOutLines(ctx);
      const res = JournalEngine.validateLines(lines);
      expect(res.totalDebit.toFixed(0)).toBe('50000000');
      expect(res.totalCredit.toFixed(0)).toBe('50000000');
      expect(lines[0].subsidiaryAccountId).toBe('sub-3201');
      expect(lines[1].subsidiaryAccountId).toBe('sub-1201');
    });

    it('Step 6: Issue and clear payable cheques (Debit 3201 / Credit 3101 -> Debit 3101 / Credit 1103)', () => {
      const issueLines = ChequePostingEngine.buildIssuePayableLines(ctx);
      const issueRes = JournalEngine.validateLines(issueLines);
      expect(issueRes.totalDebit.toFixed(0)).toBe('50000000');

      const clearLines = ChequePostingEngine.buildClearPayableLines(ctx);
      const clearRes = JournalEngine.validateLines(clearLines);
      expect(clearRes.totalDebit.toFixed(0)).toBe('50000000');
    });

    it('Step 7: Guarantee cheques should use off-balance sheet group 9 accounts', () => {
      const guaranteeLines = ChequePostingEngine.buildGuaranteeLines(ctx);
      const res = JournalEngine.validateLines(guaranteeLines);
      expect(res.totalDebit.toFixed(0)).toBe('50000000');
      expect(guaranteeLines[0].subsidiaryAccountId).toBe('sub-9101');
      expect(guaranteeLines[1].subsidiaryAccountId).toBe('sub-9102');
    });
  });

  describe('Sayad Cheque Adapter (سامانه صیاد و پیچک)', () => {
    it('should validate 16-digit sayad ID format and reject invalid IDs', async () => {
      const invalid = await sayadAdapter.inquireCheque('12345');
      expect(invalid.isValid).toBe(false);

      const valid = await sayadAdapter.inquireCheque('1234567890123456');
      expect(valid.isValid).toBe(true);
      expect(valid.color).toBe(SayadColor.WHITE);
      expect(valid.isBounced).toBe(false);
    });

    it('should identify high-risk bounced drawer color codes', async () => {
      const redCheque = await sayadAdapter.inquireCheque('1234567890123495');
      expect(redCheque.color).toBe(SayadColor.RED);
      expect(redCheque.isBounced).toBe(true);
    });

    it('should register, confirm, and transfer sayad cheques in Pichak', async () => {
      const reg = await sayadAdapter.registerCheque({
        sayadId: '1234567890123456',
        amount: '50000000',
        dueDateShamsi: '1403/11/30',
        payeeNationalId: '0084575948'
      });
      expect(reg.success).toBe(true);
      expect(reg.trackingNumber).toBeDefined();

      const conf = await sayadAdapter.confirmCheque('1234567890123456', '0084575948');
      expect(conf.success).toBe(true);

      const trans = await sayadAdapter.transferCheque('1234567890123456', '0084575948', '10100000006');
      expect(trans.success).toBe(true);
    });
  });

  describe('Party Aging Engine (تحلیل سن بدهی و مطالبات)', () => {
    it('should group open invoices into 0-30, 31-60, 61-90 and 90+ buckets', () => {
      // تاریخ مرجع: ۱۴۰۳/۰۸/۲۴
      const invoices = [
        { partyId: 'p1', partyName: 'مشتری الف', invoiceId: 'inv-1', invoiceNumber: '101', dueDateShamsi: '1403/08/10', remainingAmount: 10000000 }, // 14 days ago (0-30)
        { partyId: 'p1', partyName: 'مشتری الف', invoiceId: 'inv-2', invoiceNumber: '102', dueDateShamsi: '1403/07/10', remainingAmount: 20000000 }, // ~44 days ago (31-60)
        { partyId: 'p1', partyName: 'مشتری الف', invoiceId: 'inv-3', invoiceNumber: '103', dueDateShamsi: '1403/06/10', remainingAmount: 30000000 }, // ~74 days ago (61-90)
        { partyId: 'p1', partyName: 'مشتری الف', invoiceId: 'inv-4', invoiceNumber: '104', dueDateShamsi: '1403/04/10', remainingAmount: 40000000 }  // >90 days
      ];

      const res = PartyAgingEngine.calculateAging('1403/08/24', invoices);
      expect(res.length).toBe(1);
      const p1 = res[0];
      expect(p1.partyName).toBe('مشتری الف');
      expect(p1.totalReceivable).toBe('100000000');
      expect(p1.buckets.days0To30).toBe('10000000');
      expect(p1.buckets.days31To60).toBe('20000000');
      expect(p1.buckets.days61To90).toBe('30000000');
      expect(p1.buckets.daysOver90).toBe('40000000');
    });
  });
});
