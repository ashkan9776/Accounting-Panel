import * as crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'FINALIZE' | 'REVERSE';
  tableName: string;
  recordId: string;
  timestamp: string; // ISO string
  previousHash: string;
  currentHash: string;
  payload: any;
  ipAddress?: string;
}

export class AuditHashChain {
  public static GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * محاسبه هش رمزنگاری‌شده سطر جدید لاگ ممیزی
   */
  public static calculateHash(
    previousHash: string,
    timestamp: string,
    tenantId: string,
    action: string,
    tableName: string,
    recordId: string,
    payload: any
  ): string {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const data = `${previousHash}|${timestamp}|${tenantId}|${action}|${tableName}|${recordId}|${payloadStr}`;
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * ساخت رکورد جدید در زنجیره لاگ‌ها
   */
  public static createLogEntry(
    id: string,
    tenantId: string,
    userId: string,
    action: AuditLogEntry['action'],
    tableName: string,
    recordId: string,
    payload: any,
    previousHash: string = AuditHashChain.GENESIS_HASH,
    ipAddress?: string
  ): AuditLogEntry {
    const timestamp = new Date().toISOString();
    const currentHash = this.calculateHash(previousHash, timestamp, tenantId, action, tableName, recordId, payload);

    return {
      id,
      tenantId,
      userId,
      action,
      tableName,
      recordId,
      timestamp,
      previousHash,
      currentHash,
      payload,
      ipAddress
    };
  }

  /**
   * بررسی صحت زنجیره ممیزی و کشف هرگونه دستکاری یا تغییر داده در پایگاه‌داده
   */
  public static verifyChain(logs: AuditLogEntry[]): { isValid: boolean; brokenAtRecordId?: string; reason?: string } {
    if (!logs || logs.length === 0) return { isValid: true };

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];

      // بررسی زنجیره به هش سطر قبلی
      if (i === 0) {
        if (current.previousHash !== AuditHashChain.GENESIS_HASH) {
          return {
            isValid: false,
            brokenAtRecordId: current.id,
            reason: 'هش رکورد ابتدایی (Genesis) با مقدار معتبر تطابق ندارد.'
          };
        }
      } else {
        const prev = logs[i - 1];
        if (current.previousHash !== prev.currentHash) {
          return {
            isValid: false,
            brokenAtRecordId: current.id,
            reason: `گسست در زنجیره هش: هش قبلی این سطر با هش سطر قبلی تطابق ندارد. دستکاری احتمالی دیتابیس در سطر ${current.id}`
          };
        }
      }

      // محاسبه مجدد هش و بررسی عدم تغییر فیلدها
      const recalculated = this.calculateHash(
        current.previousHash,
        current.timestamp,
        current.tenantId,
        current.action,
        current.tableName,
        current.recordId,
        current.payload
      );

      if (recalculated !== current.currentHash) {
        return {
          isValid: false,
          brokenAtRecordId: current.id,
          reason: `محتوای رکورد ${current.id} پس از ثبت دستکاری شده است (عدم تطابق هش محاسباتی).`
        };
      }
    }

    return { isValid: true };
  }
}
