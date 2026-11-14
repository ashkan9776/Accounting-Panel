import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { MoadianService } from './moadian.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/moadian')
export class MoadianController {
  constructor(private readonly moadianService: MoadianService) {}

  // ۱. تنظیمات مودیان و کلیدها
  @Get('settings')
  async getSettings(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const settings = await this.moadianService.getSettings(ctx.tenantId, ctx.companyId);
    return { success: true, data: settings };
  }

  @Put('settings')
  async updateSettings(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const settings = await this.moadianService.updateSettings(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: settings };
  }

  @Post('settings/generate-keys')
  async generateKeys(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const result = await this.moadianService.generateNewKeys(ctx.tenantId, ctx.companyId);
    return { success: true, data: result };
  }

  // ۲. آماده‌سازی صورتحساب از فاکتور فروش و ابطال
  @Post('invoices/prepare-from-sales/:salesId')
  async prepareFromSales(
    @Req() req: Request,
    @Param('salesId') salesId: string,
    @Body() body: any
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const invoice = await this.moadianService.prepareFromSales(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      salesId,
      body
    );
    return { success: true, data: invoice };
  }

  @Post('invoices/prepare-cancellation/:id')
  async prepareCancellation(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const invoice = await this.moadianService.prepareCancellation(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      id
    );
    return { success: true, data: invoice };
  }

  // ۳. ارسال و استعلام صورتحساب
  @Post('invoices/:id/send')
  async sendInvoice(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.moadianService.sendInvoice(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  @Post('invoices/:id/inquire')
  async inquireInvoice(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.moadianService.inquireInvoice(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  // ۴. پردازش صف ارسال Outbox
  @Post('outbox/process')
  async processOutbox(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const result = await this.moadianService.processOutbox(ctx.tenantId, ctx.companyId);
    return { success: true, data: result };
  }

  // ۵. مغایرت‌گیری کارپوشه (Reconciliation)
  @Post('reconcile')
  async reconcile(@Req() req: Request, @Body() body: { portalInvoices: any[] }) {
    const ctx = req.tenantContext!;
    const result = await this.moadianService.reconcileWithPortal(
      ctx.tenantId,
      ctx.companyId,
      body.portalInvoices || []
    );
    return { success: true, data: result };
  }

  // ۶. لیست و جزییات صورتحساب‌ها
  @Get('invoices')
  async listInvoices(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const invoices = await this.moadianService.listInvoices(ctx.tenantId, ctx.companyId);
    return { success: true, data: invoices };
  }

  @Get('invoices/:id')
  async getInvoice(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const invoice = await this.moadianService.getInvoice(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: invoice };
  }
}
