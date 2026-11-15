import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import {
  DepreciationEngine,
  AssetPostingEngine,
  AssetCategory,
  DepreciationMethod,
  AssetStatus,
  JournalEntryType
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class FixedAssetsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService
  ) {}

  // ۱. ثبت و تحصیل دارایی ثابت جدید و صدور خودکار سند خرید دارایی
  async createAsset(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      assetCode: string;
      title: string;
      category: AssetCategory;
      purchaseDateShamsi: string;
      historicalCost: string | number;
      salvageValue?: string | number;
      depreciationMethod: DepreciationMethod;
      annualRatePercentage?: string | number;
      usefulLifeYears?: number;
      costCenterDimensionId?: string;
      keeperPartyId?: string;
      location?: string;
      creditSubsidiaryId?: string;
      creditFloatingDimensionId?: string;
    }
  ) {
    if (!data.assetCode || !data.title || !data.category || !data.historicalCost || !data.purchaseDateShamsi) {
      throw new BadRequestException('پلاک اموال، عنوان، طبقه دارایی، بهای تمام‌شده و تاریخ خرید الزامی است.');
    }

    const id = `ast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cost = new Decimal(data.historicalCost);
    const salvage = new Decimal(data.salvageValue || 0);
    const now = new Date().toISOString();

    // صدور سند خرید و تحصیل دارایی ثابت
    const journalLines = AssetPostingEngine.buildAcquisitionLines({
      assetCode: data.assetCode,
      assetTitle: data.title,
      category: data.category,
      purchaseDateShamsi: data.purchaseDateShamsi,
      cost: cost.toFixed(0),
      creditSubsidiaryId: data.creditSubsidiaryId || 'sub-1102',
      creditFloatingDimensionId: data.creditFloatingDimensionId,
      costCenterDimensionId: data.costCenterDimensionId
    });

    let journalEntry: any = null;
    if (journalLines.length > 0) {
      journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
        entryDateShamsi: data.purchaseDateShamsi,
        entryType: JournalEntryType.NORMAL,
        description: `سند تحصیل و ورود دارایی ثابت پلاک ${data.assetCode} (${data.title})`,
        sourceModule: 'FIXED_ASSETS',
        sourceDocumentId: id,
        lines: journalLines
      });
    }

    await this.db.run(
      `INSERT INTO fixed_assets (
        id, tenant_id, company_id, branch_id, asset_code, title, category,
        purchase_date_shamsi, historical_cost, salvage_value, depreciation_method,
        annual_rate_percentage, useful_life_years, accumulated_depreciation, book_value,
        status, cost_center_dimension_id, keeper_party_id, location,
        acquisition_journal_entry_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', ?, 'ACTIVE', ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        companyId,
        branchId,
        data.assetCode,
        data.title,
        data.category,
        data.purchaseDateShamsi,
        cost.toFixed(0),
        salvage.toFixed(0),
        data.depreciationMethod,
        data.annualRatePercentage ? data.annualRatePercentage.toString() : null,
        data.usefulLifeYears || null,
        cost.toFixed(0),
        data.costCenterDimensionId || null,
        data.keeperPartyId || null,
        data.location || null,
        journalEntry?.id || null,
        now
      ]
    );

    const asset = await this.getAsset(tenantId, companyId, id);
    return {
      asset,
      journalEntry
    };
  }

  // ۲. استعلام جزئیات کامل دارایی ثابت و سوابق استهلاک
  async getAsset(tenantId: string, companyId: string, id: string) {
    const asset = await this.db.queryOne(
      `SELECT * FROM fixed_assets WHERE tenant_id = ? AND company_id = ? AND id = ?`,
      [tenantId, companyId, id]
    );
    if (!asset) {
      throw new NotFoundException(`دارایی ثابت با شناسه ${id} یافت نشد.`);
    }

    const records = await this.db.query(
      `SELECT * FROM fixed_asset_depreciation_records
       WHERE asset_id = ?
       ORDER BY period_date_shamsi ASC`,
      [id]
    );

    return { ...asset, records };
  }

  // ۳. استعلام لیست دارایی‌های ثابت شرکت
  async listAssets(tenantId: string, companyId: string, filters?: { category?: string; status?: string }) {
    let sql = `SELECT * FROM fixed_assets WHERE tenant_id = ? AND company_id = ?`;
    const params: any[] = [tenantId, companyId];

    if (filters?.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY asset_code ASC';

    return this.db.query(sql, params);
  }

  // ۴. محاسبه و صدور سند استهلاک ماهانه/دوره‌ای دارایی‌های ثابت
  async calculateAndPostDepreciation(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      periodTitle: string;
      periodDateShamsi: string;
      monthsCount?: number;
      assetIds?: string[];
      costCenterDimensionId?: string;
    }
  ) {
    const months = data.monthsCount || 1;
    let assetsToDepreciate = [];

    if (data.assetIds && data.assetIds.length > 0) {
      for (const aid of data.assetIds) {
        const a = await this.getAsset(tenantId, companyId, aid);
        assetsToDepreciate.push(a);
      }
    } else {
      assetsToDepreciate = await this.listAssets(tenantId, companyId, { status: AssetStatus.ACTIVE });
    }

    if (assetsToDepreciate.length === 0) {
      throw new BadRequestException('هیچ دارایی فعالی برای محاسبه استهلاک یافت نشد.');
    }

    const depreciationItems: any[] = [];
    const now = new Date().toISOString();

    for (const ast of assetsToDepreciate) {
      const depResult = DepreciationEngine.calculatePeriodicDepreciation({
        asset: {
          id: ast.id,
          assetCode: ast.asset_code,
          title: ast.title,
          category: ast.category as AssetCategory,
          purchaseDateShamsi: ast.purchase_date_shamsi,
          historicalCost: ast.historical_cost,
          salvageValue: ast.salvage_value,
          depreciationMethod: ast.depreciation_method as DepreciationMethod,
          annualRatePercentage: ast.annual_rate_percentage,
          usefulLifeYears: ast.useful_life_years
        },
        previousAccumulatedDepreciation: ast.accumulated_depreciation,
        monthsCount: months,
        periodDateShamsi: data.periodDateShamsi
      });

      if (new Decimal(depResult.periodDepreciationAmount).greaterThan(0)) {
        const recordId = `dep-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await this.db.run(
          `INSERT INTO fixed_asset_depreciation_records (
            id, asset_id, period_date_shamsi, months_count, opening_book_value,
            depreciation_amount, accumulated_depreciation_after, closing_book_value, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recordId,
            ast.id,
            data.periodDateShamsi,
            months,
            depResult.openingBookValue,
            depResult.periodDepreciationAmount,
            depResult.accumulatedDepreciationAfter,
            depResult.closingBookValue,
            now
          ]
        );

        await this.db.run(
          `UPDATE fixed_assets SET
            accumulated_depreciation = ?,
            book_value = ?,
            status = ?
           WHERE id = ?`,
          [
            depResult.accumulatedDepreciationAfter,
            depResult.closingBookValue,
            depResult.isFullyDepreciated ? AssetStatus.DEPRECIATED : AssetStatus.ACTIVE,
            ast.id
          ]
        );

        depreciationItems.push({
          assetCode: ast.asset_code,
          assetTitle: ast.title,
          category: ast.category as AssetCategory,
          depreciationAmount: depResult.periodDepreciationAmount,
          costCenterDimensionId: ast.cost_center_dimension_id || data.costCenterDimensionId || 'dim-cc-mgmt'
        });
      }
    }

    // صدور سند دوبل استهلاک
    const journalLines = AssetPostingEngine.buildDepreciationLines({
      periodTitle: data.periodTitle,
      dateShamsi: data.periodDateShamsi,
      items: depreciationItems
    });

    let journalEntry: any = null;
    if (journalLines.length > 0) {
      journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
        entryDateShamsi: data.periodDateShamsi,
        entryType: JournalEntryType.NORMAL,
        description: `سند استهلاک دارایی‌های ثابت - ${data.periodTitle}`,
        sourceModule: 'FIXED_ASSETS',
        lines: journalLines
      });
    }

    return {
      periodTitle: data.periodTitle,
      depreciatedCount: depreciationItems.length,
      depreciatedAssetsCount: depreciationItems.length,
      totalDepreciationAmount: depreciationItems.reduce((acc, it) => acc.plus(it.depreciationAmount), new Decimal(0)).toFixed(0),
      items: depreciationItems,
      journalEntry
    };
  }

  // ۵. ثبت واگذاری، فروش یا اسقاط دارایی ثابت با شناسایی سود یا زیان
  async disposeAsset(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    assetId: string,
    data: {
      disposalDateShamsi: string;
      salePrice: string | number;
      paymentReceivableSubsidiaryId?: string;
      paymentFloatingDimensionId?: string;
      costCenterDimensionId?: string;
    }
  ) {
    const asset = await this.getAsset(tenantId, companyId, assetId);
    if (asset.status === AssetStatus.SOLD || asset.status === AssetStatus.SCRAPPED) {
      throw new BadRequestException('دارایی قبلاً واگذار شده یا اسقاط گردیده است.');
    }

    const disposalResult = DepreciationEngine.calculateDisposal({
      assetId,
      assetCode: asset.asset_code,
      disposalDateShamsi: data.disposalDateShamsi,
      historicalCost: asset.historical_cost,
      accumulatedDepreciation: asset.accumulated_depreciation,
      salePrice: data.salePrice
    });

    const journalLines = AssetPostingEngine.buildDisposalLines({
      disposalResult,
      category: asset.category as AssetCategory,
      paymentReceivableSubsidiaryId: data.paymentReceivableSubsidiaryId || 'sub-1102',
      paymentFloatingDimensionId: data.paymentFloatingDimensionId,
      costCenterDimensionId: data.costCenterDimensionId || asset.cost_center_dimension_id
    });

    const journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
      entryDateShamsi: data.disposalDateShamsi,
      entryType: JournalEntryType.NORMAL,
      description: `سند واگذاری و فروش دارایی ثابت پلاک ${asset.asset_code} (${asset.title})`,
      sourceModule: 'FIXED_ASSETS',
      sourceDocumentId: assetId,
      lines: journalLines
    });

    await this.db.run(
      `UPDATE fixed_assets SET
        status = ?,
        disposal_journal_entry_id = ?,
        disposal_date_shamsi = ?,
        disposal_sale_price = ?,
        disposal_gain_or_loss = ?,
        book_value = '0'
       WHERE id = ?`,
      [
        new Decimal(data.salePrice).isZero() ? AssetStatus.SCRAPPED : AssetStatus.SOLD,
        journalEntry.id,
        data.disposalDateShamsi,
        disposalResult.salePrice,
        disposalResult.gainOrLossAmount,
        assetId
      ]
    );

    return {
      assetId,
      assetCode: asset.asset_code,
      disposalResult,
      journalEntry
    };
  }
}
