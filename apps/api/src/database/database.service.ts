import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: sqlite3.Database;
  private dbPath: string;
  private transactionQueue: Promise<void> = Promise.resolve();

  constructor() {
    const storageDir = path.resolve(process.cwd(), 'storage');
    this.dbPath = process.env.DATABASE_PATH || path.join(storageDir, 'accounting.db');
    const targetDir = path.dirname(this.dbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  async onModuleInit() {
    await this.connect();
    await this.initSchema();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err);
        this.db.exec(
          `PRAGMA foreign_keys = ON;
           PRAGMA journal_mode = WAL;
           PRAGMA busy_timeout = 5000;`,
          (pragmaErr) => {
            if (pragmaErr) return reject(pragmaErr);
            resolve();
          }
        );
      });
    });
  }

  private close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      this.db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  public async initSchema(): Promise<void> {
    const schemaFile = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const sql = fs.readFileSync(schemaFile, 'utf8');
      await this.exec(sql);
    }
  }

  public exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  public query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve((rows as T[]) || []);
      });
    });
  }

  public queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve((row as T) || null);
      });
    });
  }

  public run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * قفل ترتیبی (Mutex Queue) جهت جلوگیری از تداخل تراکنش‌های همزمان در SQLite
   */
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

  public async transaction<T>(fn: (db: DatabaseService) => Promise<T>): Promise<T> {
    const release = await this.acquireTransactionLock();
    try {
      await this.run('BEGIN IMMEDIATE TRANSACTION');
      try {
        const result = await fn(this);
        await this.run('COMMIT');
        return result;
      } catch (error) {
        try {
          await this.run('ROLLBACK');
        } catch {
          // در صورتی که تراکنش قبلاً رول‌بک شده باشد خطا نادیده گرفته می‌شود
        }
        throw error;
      }
    } finally {
      release();
    }
  }
}
