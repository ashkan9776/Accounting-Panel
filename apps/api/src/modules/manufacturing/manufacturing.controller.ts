import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { WorkCentersService } from './work-centers.service';
import { BomsService } from './boms.service';
import { ProductionOrdersService } from './production-orders.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/manufacturing')
export class ManufacturingController {
  constructor(
    private readonly workCentersService: WorkCentersService,
    private readonly bomsService: BomsService,
    private readonly productionOrdersService: ProductionOrdersService
  ) {}

  // ==========================================
  // ۱. مراکز کاری تولید (Work Centers)
  // ==========================================
  @Post('work-centers')
  async createWorkCenter(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.workCentersService.createWorkCenter(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: result };
  }

  @Get('work-centers')
  async listWorkCenters(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const result = await this.workCentersService.listWorkCenters(ctx.tenantId, ctx.companyId);
    return { success: true, data: result };
  }

  @Get('work-centers/:id')
  async getWorkCenter(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.workCentersService.getWorkCenter(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  @Put('work-centers/:id')
  async updateWorkCenter(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.workCentersService.updateWorkCenter(ctx.tenantId, ctx.companyId, id, body);
    return { success: true, data: result };
  }

  // ==========================================
  // ۲. فرمول‌های ساخت محصول (BOM)
  // ==========================================
  @Post('boms')
  async createBom(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.bomsService.createBom(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: result };
  }

  @Get('boms')
  async listBoms(@Req() req: Request, @Query('productId') productId?: string) {
    const ctx = req.tenantContext!;
    const result = await this.bomsService.listBoms(ctx.tenantId, ctx.companyId, productId);
    return { success: true, data: result };
  }

  @Get('boms/:id')
  async getBom(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.bomsService.getBom(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  @Post('boms/:id/explode')
  async explodeBom(@Req() req: Request, @Param('id') id: string, @Body('quantity') quantity: string | number) {
    const ctx = req.tenantContext!;
    const result = await this.bomsService.explodeBom(ctx.tenantId, ctx.companyId, id, quantity || '1');
    return { success: true, data: result };
  }

  @Get('boms/:id/standard-cost')
  async getStandardCost(@Req() req: Request, @Param('id') id: string, @Query('baseQuantity') baseQuantity?: string) {
    const ctx = req.tenantContext!;
    const result = await this.bomsService.calculateStandardCost(ctx.tenantId, ctx.companyId, id, baseQuantity);
    return { success: true, data: result };
  }

  // ==========================================
  // ۳. سفارشات تولید و دستور کار (Production Orders)
  // ==========================================
  @Post('orders')
  async createOrder(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.productionOrdersService.createOrder(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  @Get('orders')
  async listOrders(@Req() req: Request, @Query() query: any) {
    const ctx = req.tenantContext!;
    const result = await this.productionOrdersService.listOrders(ctx.tenantId, ctx.companyId, query);
    return { success: true, data: result };
  }

  @Get('orders/:id')
  async getOrder(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.productionOrdersService.getOrder(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  @Post('orders/:id/issue-materials')
  async issueMaterials(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.productionOrdersService.issueMaterialsToWip(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      id,
      body
    );
    return { success: true, data: result };
  }

  @Post('orders/:id/record-operation')
  async recordOperation(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.productionOrdersService.recordOperationWork(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      id,
      body
    );
    return { success: true, data: result };
  }

  @Post('orders/:id/record-scrap')
  async recordScrap(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.productionOrdersService.recordScrap(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      id,
      body
    );
    return { success: true, data: result };
  }

  @Post('orders/:id/complete')
  async completeOrder(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.productionOrdersService.completeOrderAndReceipt(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      id,
      body
    );
    return { success: true, data: result };
  }

  @Post('orders/:id/close-variances')
  async closeOrderAndVariances(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.productionOrdersService.closeOrderAndPostVariances(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      id,
      body
    );
    return { success: true, data: result };
  }
}
