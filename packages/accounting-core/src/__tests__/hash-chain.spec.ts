import { AuditHashChain, AuditLogEntry } from '../audit/hash-chain';

describe('Audit Hash Chain (زنجیره تغییرناپذیر ممیزی)', () => {
  it('should create valid chained log entries and verify chain integrity', () => {
    const logs: AuditLogEntry[] = [];

    // رکورد ۱ (Genesis)
    const log1 = AuditHashChain.createLogEntry(
      'log-1',
      'tenant-1',
      'user-1',
      'INSERT',
      'journal_entries',
      'entry-101',
      { totalDebit: '10000000', description: 'ثبت سند افتتاحیه' }
    );
    logs.push(log1);

    // رکورد ۲
    const log2 = AuditHashChain.createLogEntry(
      'log-2',
      'tenant-1',
      'user-2',
      'FINALIZE',
      'journal_entries',
      'entry-101',
      { status: 'FINALIZED', permanentNumber: 1 },
      log1.currentHash
    );
    logs.push(log2);

    // رکورد ۳
    const log3 = AuditHashChain.createLogEntry(
      'log-3',
      'tenant-1',
      'user-1',
      'INSERT',
      'journal_entries',
      'entry-102',
      { totalDebit: '5000000', description: 'ثبت فروش' },
      log2.currentHash
    );
    logs.push(log3);

    const verification = AuditHashChain.verifyChain(logs);
    expect(verification.isValid).toBe(true);
  });

  it('should detect when an audit record payload is tampered with', () => {
    const log1 = AuditHashChain.createLogEntry(
      'log-1',
      'tenant-1',
      'user-1',
      'INSERT',
      'journal_entries',
      'entry-101',
      { totalDebit: '10000000' }
    );

    const log2 = AuditHashChain.createLogEntry(
      'log-2',
      'tenant-1',
      'user-2',
      'UPDATE',
      'journal_entries',
      'entry-101',
      { totalDebit: '12000000' },
      log1.currentHash
    );

    const logs = [log1, log2];

    // دستکاری غیرمجاز مستقیم در دیتابیس روی رکورد ۱
    log1.payload.totalDebit = '99999999';

    const verification = AuditHashChain.verifyChain(logs);
    expect(verification.isValid).toBe(false);
    expect(verification.brokenAtRecordId).toBe('log-1');
    expect(verification.reason).toContain('دستکاری شده است');
  });

  it('should detect when a record is deleted or replaced in the chain', () => {
    const log1 = AuditHashChain.createLogEntry(
      'log-1',
      'tenant-1',
      'user-1',
      'INSERT',
      'table_a',
      'rec-1',
      { a: 1 }
    );

    const log2 = AuditHashChain.createLogEntry(
      'log-2',
      'tenant-1',
      'user-1',
      'INSERT',
      'table_a',
      'rec-2',
      { a: 2 },
      log1.currentHash
    );

    const log3 = AuditHashChain.createLogEntry(
      'log-3',
      'tenant-1',
      'user-1',
      'INSERT',
      'table_a',
      'rec-3',
      { a: 3 },
      log2.currentHash
    );

    // حذف رکورد وسطی (log2)
    const brokenLogs = [log1, log3];
    const verification = AuditHashChain.verifyChain(brokenLogs);
    expect(verification.isValid).toBe(false);
    expect(verification.brokenAtRecordId).toBe('log-3');
    expect(verification.reason).toContain('گسست در زنجیره هش');
  });
});
