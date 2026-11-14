import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { InventoryService } from './inventory.service';
import { ProductType, ValuationMethod } from '@accounting/core';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ۱. دسته‌بندی‌ها
  @Get('categories')
  async listCategories(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const categories = await this.inventoryService.listCategories(ctx.tenantId, ctx.companyId);
    return { success: true, data: categories };
  }

  @Post('categories')
  async createCategory(@Req() req: Request, @Body() body: { code: string; title: string; parentId?: string }) {
    const ctx = req.tenantContext!;
    const category = await this.inventoryService.createCategory(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: category };
  }

  // ۲. واحدهای سنجش و تبدیل
  @Get('units')
  async listUnits(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const units = await this.inventoryService.listUnits(ctx.tenantId, ctx.companyId);
    return { success: true, data: units };
  }

  @Post('units')
  async createUnit(
    @Req() req: Request,
    @Body() body: { code: string; title: string; symbol?: string; isReference?: boolean }
  ) {
    const ctx = req.tenantContext!;
    const unit = await this.inventoryService.createUnit(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: unit };
  }

  @Post('units/conversions')
  async createConversion(
    @Req() req: Request,
    @Body() body: { fromUnitId: string; toUnitId: string; conversionRate: string | number }
  ) {
    const ctx = req.tenantContext!;
    const conv = await this.inventoryService.createConversion(ctx.tenantId, body);
    return { success: true, data: conv };
  }

  // ۳. انبارها
  @Get('warehouses')
  async listWarehouses(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const warehouses = await this.inventoryService.listWarehouses(ctx.tenantId, ctx.companyId);
    return { success: true, data: warehouses };
  }

  @Post('warehouses')
  async createWarehouse(
    @Req() req: Request,
    @Body() body: { code: string; name: string; address?: string; phone?: string; keeperName?: string }
  ) {
    const ctx = req.tenantContext!;
    const warehouse = await this.inventoryService.createWarehouse(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      body
    );
    return { success: true, data: warehouse };
  }

  // ۴. کالاها و خدمات
  @Get('products')
  async listProducts(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const products = await this.inventoryService.listProducts(ctx.tenantId, ctx.companyId);
    return { success: true, data: products };
  }

  @Get('products/:id')
  async getProduct(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const product = await this.inventoryService.getProduct(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: product };
  }

  @Post('products')
  async createProduct(
    @Req() req: Request,
    @Body()
    body: {
      categoryId?: string;
      unitId: string;
      code: string;
      name: string;
      type: ProductType;
      barcode?: string;
      taxExempt?: boolean;
      vatRate?: string | number;
      valuationMethod?: ValuationMethod;
      minStockAlert?: string | number;
      maxStockAlert?: string | number;
      sellPrice?: string | number;
      purchasePrice?: string | number;
    }
  ) {
    const ctx = req.tenantContext!;
    const product = await this.inventoryService.createProduct(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: product };
  }

  // ۵. کاردکس و خلاصه موجودی انبار
  @Get('kardex')
  async getKardex(
    @Req() req: Request,
    @Query('warehouseId') warehouseId: string,
    @Query('productId') productId: string
  ) {
    const ctx = req.tenantContext!;
    const entries = await this.inventoryService.getKardex(ctx.tenantId, ctx.companyId, warehouseId, productId);
    return { success: true, data: entries };
  }

  @Get('stock-summary')
  async getStockSummary(
    @Req() req: Request,
    @Query('warehouseId') warehouseId?: string
  ) {
    const ctx = req.tenantContext!;
    const summary = await this.inventoryService.getStockSummary(ctx.tenantId, ctx.companyId, warehouseId);
    return { success: true, data: summary };
  }

  // ۶. انبارگردانی
  @Post('counts')
  async createInventoryCount(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const count = await this.inventoryService.createInventoryCount(
      ctx.tenantId,
      ctx.companyId,
      body.warehouseId,
      user.id,
      body
    );
    return { success: true, data: count };
  }

  @Post('counts/:id/adjust')
  async adjustInventoryCount(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.inventoryService.adjustInventoryCount(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      id
    );
    return { success: true, data: result };
  }
}
