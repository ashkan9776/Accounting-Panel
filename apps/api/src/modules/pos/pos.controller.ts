import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PosShiftsService } from './pos-shifts.service';
import { PosOrdersService } from './pos-orders.service';
import { DatabaseService } from '../../database/database.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/pos')
export class PosController {
  constructor(
    private readonly shiftsService: PosShiftsService,
    private readonly ordersService: PosOrdersService,
    private readonly db: DatabaseService
  ) {}

  // ۱. مدیریت شیفت‌ها
  @Post('shifts/open')
  async openShift(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const shift = await this.shiftsService.openShift(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      body
    );
    return { success: true, data: shift };
  }

  @Get('shifts')
  async listShifts(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const shifts = await this.shiftsService.listShifts(ctx.tenantId, ctx.companyId);
    return { success: true, data: shifts };
  }

  @Get('shifts/active')
  async getActiveShift(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const shift = await this.shiftsService.getActiveShift(ctx.tenantId, ctx.companyId, user.id);
    return { success: true, data: shift };
  }

  @Post('shifts/:id/cash-movement')
  async addCashMovement(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const movement = await this.shiftsService.addCashMovement(
      ctx.tenantId,
      id,
      user.id,
      body
    );
    return { success: true, data: movement };
  }

  @Get('shifts/:id/x-report')
  async getXReport(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const report = await this.shiftsService.getXReport(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: report };
  }

  @Post('shifts/:id/close')
  async closeShift(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.shiftsService.closeShift(
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

  // ۲. ثبت سفارشات و تسویه
  @Post('orders')
  async createOrder(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const order = await this.ordersService.createOrder(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      body
    );
    return { success: true, data: order };
  }

  @Get('orders/hold')
  async getHoldOrders(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const orders = await this.ordersService.getHoldOrders(ctx.tenantId, ctx.companyId, ctx.branchId!);
    return { success: true, data: orders };
  }

  @Post('orders/:id/recall-complete')
  async recallAndCompleteOrder(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const order = await this.ordersService.recallAndCompleteOrder(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      id,
      body
    );
    return { success: true, data: order };
  }

  @Post('orders/sync-offline')
  async syncOfflineOrders(@Req() req: Request, @Body() body: { orders: any[] }) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.ordersService.syncOfflineOrders(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      body.orders || []
    );
    return { success: true, data: result };
  }

  @Get('orders/:id/receipt')
  async getReceipt(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const receipt = await this.ordersService.generateReceipt(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: receipt };
  }

  // ۳. استعلام پایانه‌های کارتخوان
  @Get('terminals')
  async listTerminals(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const terminals = await this.db.query(
      'SELECT * FROM pos_terminals WHERE tenant_id = ? AND company_id = ? AND is_active = true',
      [ctx.tenantId, ctx.companyId]
    );
    return { success: true, data: terminals };
  }
}
