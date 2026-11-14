import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    const storageDir = path.resolve(process.cwd(), 'storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbPath = process.env.DATABASE_PATH || path.join(storageDir, 'accounting.db');
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
        this.db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
          if (pragmaErr) return reject(pragmaErr);
          resolve();
        });
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

  public async transaction<T>(fn: (db: DatabaseService) => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await fn(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }
}
