import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export function normalizePlaceholders(sql: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let paramIndex = 1;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (inLineComment) {
      result += char;
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      result += char;
      if (char === '*' && nextChar === '/') {
        result += nextChar;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (inSingleQuote) {
      result += char;
      if (char === "'") {
        if (nextChar === "'") {
          result += nextChar;
          i++;
        } else {
          inSingleQuote = false;
        }
      }
      continue;
    }

    if (inDoubleQuote) {
      result += char;
      if (char === '"') {
        if (nextChar === '"') {
          result += nextChar;
          i++;
        } else {
          inDoubleQuote = false;
        }
      }
      continue;
    }

    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      result += '--';
      i++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      result += '/*';
      i++;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      result += char;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = true;
      result += char;
      continue;
    }

    if (char === '?') {
      result += `$${paramIndex++}`;
      continue;
    }

    result += char;
  }

  return result;
}

let sharedPgliteInstance: any = null;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool | any;
  private isEmbedded = false;
  private transactionQueue: Promise<void> = Promise.resolve();

  constructor() {}

  async onModuleInit() {
    await this.connect();
    await this.initSchema();
  }

  async onModuleDestroy() {
    await this.close();
  }

  public async connect(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl && !databaseUrl.startsWith('memory:')) {
      const poolConfig = {
        connectionString: databaseUrl,
        max: process.env.PG_POOL_MAX ? parseInt(process.env.PG_POOL_MAX, 10) : 20,
        ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
      };
      this.pool = new Pool(poolConfig);
      // اعتبارسنجی اولیه اتصال
      const client = await this.pool.connect();
      client.release();
    } else {
      // استفاده از موتور داخلی PostgreSQL (PGlite) در محیط تست یا عدم تعریف DATABASE_URL
      const { PGlite } = await import('@electric-sql/pglite');
      if (!sharedPgliteInstance) {
        sharedPgliteInstance = new PGlite();
      }
      const pglite = sharedPgliteInstance;
      this.isEmbedded = true;

      this.pool = {
        rawPglite: pglite,
        query: async (text: string, params?: any[]) => {
          const res = await pglite.query(text, params);
          return {
            rows: res.rows || [],
            rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
          };
        },
        connect: async () => {
          return {
            query: async (text: string, params?: any[]) => {
              const res = await pglite.query(text, params);
              return {
                rows: res.rows || [],
                rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
              };
            },
            release: () => {},
          };
        },
        exec: async (text: string) => {
          await pglite.exec(text);
        },
        end: async () => {
          // در حالت embedded برای باز نماندن در هر کامپوننت نباید بسته شود
        },
      };
    }
  }

  public async close(): Promise<void> {
    if (!this.isEmbedded && this.pool && typeof this.pool.end === 'function') {
      await this.pool.end();
    }
    if (this.isEmbedded && sharedPgliteInstance) {
      try {
        await sharedPgliteInstance.close();
      } catch {}
      sharedPgliteInstance = null;
    }
  }

  public async initSchema(): Promise<void> {
    const schemaFile = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const sql = fs.readFileSync(schemaFile, 'utf8');
      await this.exec(sql);
    }
  }

  public async exec(sql: string): Promise<void> {
    if (!this.pool) throw new Error('Database connection not established.');
    if (this.isEmbedded && this.pool.exec) {
      await this.pool.exec(sql);
    } else {
      await this.pool.query(sql);
    }
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool) throw new Error('Database connection not established.');
    const normalized = normalizePlaceholders(sql);
    try {
      const res = await this.pool.query(normalized, params);
      return (res.rows as T[]) || [];
    } catch (err: any) {
      console.error('[DB Query Error]', err.message, '\nSQL:', normalized, '\nParams:', params);
      throw err;
    }
  }

  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes: number; rows?: any[] }> {
    if (!this.pool) throw new Error('Database connection not established.');
    const normalized = normalizePlaceholders(sql);
    try {
      const res = await this.pool.query(normalized, params);
      const changes = res.rowCount ?? 0;
      return { changes, rows: res.rows };
    } catch (err: any) {
      console.error('[DB Run Error]', err.message, '\nSQL:', normalized, '\nParams:', params);
      throw err;
    }
  }

  private async acquireTransactionLock(): Promise<() => void> {
    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const previousLock = this.transactionQueue;
    this.transactionQueue = previousLock.then(() => currentLock);
    await previousLock;
    return releaseLock!;
  }

  public async transaction<T>(fn: (tx: DatabaseService) => Promise<T>, tenantId?: string): Promise<T> {
    if (!this.pool) throw new Error('Database connection not established.');

    // در حالت embedded یا برای جلوگیری از تداخل داخلی قفل صف همزمان استفاده می‌شود
    const releaseMutex = this.isEmbedded ? await this.acquireTransactionLock() : () => {};

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (tenantId) {
        await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
      }

      const txWrapper: DatabaseService = {
        query: async <U = any>(sql: string, params: any[] = []): Promise<U[]> => {
          const normalized = normalizePlaceholders(sql);
          try {
            const res = await client.query(normalized, params);
            return (res.rows as U[]) || [];
          } catch (err: any) {
            console.error('[DB Tx Query Error]', err.message, '\nSQL:', normalized, '\nParams:', params);
            throw err;
          }
        },
        queryOne: async <U = any>(sql: string, params: any[] = []): Promise<U | null> => {
          const normalized = normalizePlaceholders(sql);
          try {
            const res = await client.query(normalized, params);
            return res.rows && res.rows.length > 0 ? (res.rows[0] as U) : null;
          } catch (err: any) {
            console.error('[DB Tx QueryOne Error]', err.message, '\nSQL:', normalized, '\nParams:', params);
            throw err;
          }
        },
        run: async (sql: string, params: any[] = []): Promise<{ lastID?: number; changes: number; rows?: any[] }> => {
          const normalized = normalizePlaceholders(sql);
          try {
            const res = await client.query(normalized, params);
            const changes = res.rowCount ?? 0;
            return { changes, rows: res.rows };
          } catch (err: any) {
            console.error('[DB Tx Run Error]', err.message, '\nSQL:', normalized, '\nParams:', params);
            throw err;
          }
        },
        exec: async (sql: string): Promise<void> => {
          await client.query(sql);
        },
        transaction: async <U>(nestedFn: (nestedTx: DatabaseService) => Promise<U>): Promise<U> => {
          return nestedFn(txWrapper);
        },
      } as any;

      const result = await fn(txWrapper);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // نادیده گرفتن خطای رول‌بک در صورتی که اتصال قطع شده باشد
      }
      throw error;
    } finally {
      client.release();
      releaseMutex();
    }
  }
}
