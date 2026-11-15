import { Injectable, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import {
  DataMigrationSource,
  DataMigrationEngine,
  JournalEntryType,
} from '@accounting/core';

@Injectable()
export class MigrationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
  ) {}

  /**
   * ایمپورت و اعتبارسنجی کدینگ حساب‌ها
   */
  async importAccounts(
    tenantId: string,
    companyId: string,
    source: DataMigrationSource,
    rows: any[],
    userId?: string,
  ) {
    const validation = DataMigrationEngine.validateAccountsMigration(source, rows);
    const batchId = `mig-acc-${Date.now()}`;
    const now = new Date().toISOString();

    if (!validation.isValid) {
      await this.db.run(
        `INSERT INTO data_migration_batches (
          id, organization_id, source_system, entity_type, file_name, total_rows,
          imported_rows, failed_rows, status, error_log_json, created_by, created_at
        ) VALUES (?, ?, ?, 'ACCOUNTS', 'accounts_migration.xlsx', ?, 0, ?, 'FAILED', ?, ?, ?)`,
        [batchId, tenantId, source, rows.length, validation.invalidRows, JSON.stringify(validation.errors), userId || null, now],
      );
      throw new BadRequestException({
        message: 'خطا در اعتبارسنجی ساختار کدینگ حساب‌ها',
        errors: validation.errors,
      });
    }

    let insertedCount = 0;
    for (const acc of validation.parsedData) {
      if (acc.type === 'SUBSIDIARY') {
        const subId = `sub-mig-${acc.code}`;
        const headId = `head-${acc.parentCode || acc.code.substring(0, 2)}`;
        await this.db.run(
          `INSERT OR REPLACE INTO account_subsidiaries (
            id, tenant_id, company_id, head_id, code, title, nature,
            requires_floating_dimension_1, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
          [subId, tenantId, companyId, headId, acc.code, acc.name, acc.nature],
        );
        insertedCount++;
      }
    }

    await this.db.run(
      `INSERT INTO data_migration_batches (
        id, organization_id, source_system, entity_type, file_name, total_rows,
        imported_rows, failed_rows, status, created_by, created_at
      ) VALUES (?, ?, ?, 'ACCOUNTS', 'accounts_migration.xlsx', ?, ?, 0, 'COMPLETED', ?, ?)`,
      [batchId, tenantId, source, rows.length, insertedCount, userId || null, now],
    );

    return {
      batchId,
      source,
      totalRows: rows.length,
      importedRows: insertedCount,
      status: 'COMPLETED',
    };
  }

  /**
   * ایمپورت و اعتبارسنجی طرف‌حساب‌ها (مشتریان و تامین‌کنندگان) و ایجاد اتوماتیک تفصیلی
   */
  async importParties(
    tenantId: string,
    companyId: string,
    source: DataMigrationSource,
    rows: any[],
    userId?: string,
  ) {
    const validation = DataMigrationEngine.validatePartiesMigration(source, rows);
    const batchId = `mig-parties-${Date.now()}`;
    const now = new Date().toISOString();

    if (!validation.isValid) {
      await this.db.run(
        `INSERT INTO data_migration_batches (
          id, organization_id, source_system, entity_type, file_name, total_rows,
          imported_rows, failed_rows, status, error_log_json, created_by, created_at
        ) VALUES (?, ?, ?, 'PARTIES', 'parties_migration.xlsx', ?, 0, ?, 'FAILED', ?, ?, ?)`,
        [batchId, tenantId, source, rows.length, validation.invalidRows, JSON.stringify(validation.errors), userId || null, now],
      );
      throw new BadRequestException({
        message: 'خطا در اعتبارسنجی اطلاعات طرف‌حساب‌ها',
        errors: validation.errors,
      });
    }

    let insertedCount = 0;
    for (const p of validation.parsedData) {
      const partyId = `party-mig-${Date.now()}-${insertedCount}`;
      const dimId = `dim-mig-${Date.now()}-${insertedCount}`;
      const dbPartyType = p.partyType === 'LEGAL' ? 'LEGAL_ENTITY' : 'INDIVIDUAL_IRANIAN';

      // ۱. ایجاد بعد تفصیلی (Floating Dimension)
      await this.db.run(
        `INSERT OR REPLACE INTO floating_dimensions (
          id, tenant_id, company_id, dimension_type, code, title, reference_id, is_active, created_at
        ) VALUES (?, ?, ?, 'PARTY', ?, ?, ?, 1, ?)`,
        [dimId, tenantId, companyId, p.code, p.name, partyId, now],
      );

      // ۲. ثبت در parties با لینک به تفصیلی
      await this.db.run(
        `INSERT OR REPLACE INTO parties (
          id, tenant_id, company_id, party_type, name, national_id,
          economic_code, mobile, phone, address, credit_limit, is_customer, is_supplier,
          floating_dimension_id, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 1, ?)`,
        [
          partyId,
          tenantId,
          companyId,
          dbPartyType,
          p.name,
          p.nationalId || null,
          p.economicCode || null,
          p.mobile || null,
          p.phone || null,
          p.address || null,
          p.creditLimit || '0',
          dimId,
          now,
        ],
      );

      insertedCount++;
    }

    await this.db.run(
      `INSERT INTO data_migration_batches (
        id, organization_id, source_system, entity_type, file_name, total_rows,
        imported_rows, failed_rows, status, created_by, created_at
      ) VALUES (?, ?, ?, 'PARTIES', 'parties_migration.xlsx', ?, ?, 0, 'COMPLETED', ?, ?)`,
      [batchId, tenantId, source, rows.length, insertedCount, userId || null, now],
    );

    return {
      batchId,
      source,
      totalRows: rows.length,
      importedRows: insertedCount,
      status: 'COMPLETED',
    };
  }

  /**
   * ایمپورت و اعتبارسنجی کالاها و خدمات
   */
  async importProducts(
    tenantId: string,
    companyId: string,
    source: DataMigrationSource,
    rows: any[],
    userId?: string,
  ) {
    const validation = DataMigrationEngine.validateProductsMigration(source, rows);
    const batchId = `mig-prod-${Date.now()}`;
    const now = new Date().toISOString();

    if (!validation.isValid) {
      await this.db.run(
        `INSERT INTO data_migration_batches (
          id, organization_id, source_system, entity_type, file_name, total_rows,
          imported_rows, failed_rows, status, error_log_json, created_by, created_at
        ) VALUES (?, ?, ?, 'PRODUCTS', 'products_migration.xlsx', ?, 0, ?, 'FAILED', ?, ?, ?)`,
        [batchId, tenantId, source, rows.length, validation.invalidRows, JSON.stringify(validation.errors), userId || null, now],
      );
      throw new BadRequestException({
        message: 'خطا در اعتبارسنجی اقلام کالا و خدمات',
        errors: validation.errors,
      });
    }

    // استعلام یا انتخاب واحد سنجش پیش‌فرض
    const unitRow = await this.db.queryOne<any>(
      `SELECT id FROM product_units WHERE tenant_id = ? LIMIT 1`,
      [tenantId],
    );
    const unitId = unitRow?.id || 'unit-piece';

    let insertedCount = 0;
    for (const prod of validation.parsedData) {
      const prodId = `prod-mig-${Date.now()}-${insertedCount}`;
      await this.db.run(
        `INSERT OR REPLACE INTO products (
          id, tenant_id, company_id, unit_id, code, name, type, barcode,
          vat_rate, sell_price, purchase_price, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          prodId,
          tenantId,
          companyId,
          unitId,
          prod.code,
          prod.name,
          prod.isService ? 'SERVICE' : 'GOODS',
          prod.barcode || null,
          prod.vatRate || '0.10',
          prod.sellPrice,
          prod.buyPrice,
          now,
        ],
      );
      insertedCount++;
    }

    await this.db.run(
      `INSERT INTO data_migration_batches (
        id, organization_id, source_system, entity_type, file_name, total_rows,
        imported_rows, failed_rows, status, created_by, created_at
      ) VALUES (?, ?, ?, 'PRODUCTS', 'products_migration.xlsx', ?, ?, 0, 'COMPLETED', ?, ?)`,
      [batchId, tenantId, source, rows.length, insertedCount, userId || null, now],
    );

    return {
      batchId,
      source,
      totalRows: rows.length,
      importedRows: insertedCount,
      status: 'COMPLETED',
    };
  }

  /**
   * اعتبارسنجی تراز بودن و صدور سند افتتاحیه حسابداری
   */
  async importOpeningBalance(
    tenantId: string,
    companyId: string,
    fiscalYearId: string,
    source: DataMigrationSource,
    rows: any[],
    userId?: string,
  ) {
    // ۱. اعتبارسنجی دقیق تراز بودن سند افتتاحیه با دقت اعشاری ۲۸ رقمی
    const validation = DataMigrationEngine.validateOpeningBalances(source, rows);
    const batchId = `mig-opn-${Date.now()}`;
    const now = new Date().toISOString();

    if (!validation.isValid) {
      await this.db.run(
        `INSERT INTO data_migration_batches (
          id, organization_id, source_system, entity_type, file_name, total_rows,
          imported_rows, failed_rows, status, error_log_json, created_by, created_at
        ) VALUES (?, ?, ?, 'OPENING_BALANCES', 'opening_balance.xlsx', ?, 0, ?, 'FAILED', ?, ?, ?)`,
        [batchId, tenantId, source, rows.length, validation.invalidRows, JSON.stringify(validation.errors), userId || null, now],
      );
      throw new BadRequestException({
        message: 'خطا در اعتبارسنجی سند افتتاحیه (سند تراز نیست یا داده‌ها نامعتبرند)',
        balanceCheck: validation.balanceCheck,
        errors: validation.errors,
      });
    }

    // استخراج شعبه پیش‌فرض
    const branch = await this.db.queryOne<any>(
      `SELECT id FROM branches WHERE tenant_id = ? AND company_id = ? LIMIT 1`,
      [tenantId, companyId],
    );
    const branchId = branch?.id || 'branch-central-1';

    // تبدیل خطوط اعتبارسنجی‌شده به ساختار خطوط سند حسابداری
    const lines: any[] = [];
    let rowNum = 1;

    for (const item of validation.parsedData) {
      let subId = `sub-${item.subsidiaryCode}`;
      const existingSub = await this.db.queryOne<any>(
        `SELECT id FROM account_subsidiaries WHERE tenant_id = ? AND code = ? LIMIT 1`,
        [tenantId, item.subsidiaryCode],
      );
      if (existingSub) {
        subId = existingSub.id;
      }

      lines.push({
        subsidiaryAccountId: subId,
        floatingDimension1Id: item.dimensionCode || undefined,
        debit: item.debit,
        credit: item.credit,
        description: item.description || `انتقال مانده افتتاحیه از ${source}`,
      });
      rowNum++;
    }

    // صدور رسمی سند از طریق JournalEntriesService جهت تضمین ثبت در لاگ ممیزی و زنجیره هش
    const entryResult = await this.journalService.createEntry(
      tenantId,
      companyId,
      branchId,
      fiscalYearId,
      userId || 'user-admin-1',
      {
        entryDateShamsi: '1404/01/01',
        entryType: JournalEntryType.OPENING,
        description: `سند افتتاحیه دوره جدید منتقل‌شده از ${source}`,
        sourceModule: 'MIGRATION_ENGINE',
        lines,
      },
    );

    // ثبت در تاریخچه دسته‌های مهاجرت
    await this.db.run(
      `INSERT INTO data_migration_batches (
        id, organization_id, source_system, entity_type, file_name, total_rows,
        imported_rows, failed_rows, status, created_by, created_at
      ) VALUES (?, ?, ?, 'OPENING_BALANCES', 'opening_balance.xlsx', ?, ?, 0, 'COMPLETED', ?, ?)`,
      [batchId, tenantId, source, rows.length, validation.parsedData.length, userId || null, now],
    );

    return {
      batchId,
      journalEntryId: entryResult.id,
      sequenceNumber: entryResult.sequenceNumber,
      totalDebit: entryResult.totalDebit,
      totalCredit: entryResult.totalCredit,
      status: 'COMPLETED',
    };
  }
}
