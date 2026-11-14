import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditHashChain, AuditLogEntry } from '@accounting/core';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async listLogs(tenantId: string, limit: number = 50, offset: number = 0) {
    const rows = await this.db.query(
      `SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [tenantId, limit, offset]
    );

    return rows.map((r: any) => ({
      ...r,
      payload: JSON.parse(r.payload_json)
    }));
  }

  async verifyChain(tenantId: string) {
    const rows = await this.db.query(
      `SELECT rowid, * FROM audit_logs WHERE tenant_id = ? ORDER BY rowid ASC`,
      [tenantId]
    );

    const logEntries: AuditLogEntry[] = rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      userId: r.user_id,
      action: r.action,
      tableName: r.table_name,
      recordId: r.record_id,
      timestamp: r.timestamp,
      previousHash: r.previous_hash,
      currentHash: r.current_hash,
      payload: JSON.parse(r.payload_json),
      ipAddress: r.ip_address
    }));

    const result = AuditHashChain.verifyChain(logEntries);
    return {
      totalRecords: logEntries.length,
      ...result
    };
  }
}
