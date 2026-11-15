import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ECommerceService } from './e-commerce.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/omnichannel/e-commerce')
export class ECommerceController {
  constructor(private readonly eCommService: ECommerceService) {}

  @Post('orders')
  async createOnlineOrder(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const branchId = req.headers['x-branch-id'] as string || 'branch-central-1';
    const result = await this.eCommService.createOnlineOrder(ctx.tenantId, ctx.companyId, branchId, body);
    return { success: true, data: result };
  }

  @Get('orders/:id')
  async getOnlineOrder(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.eCommService.getOnlineOrderById(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  @Post('orders/:id/payment/initiate')
  async initiatePayment(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.eCommService.initiatePayment(ctx.tenantId, ctx.companyId, id, body?.gatewayType);
    return { success: true, data: result };
  }

  @Post('payment/verify')
  async verifyPayment(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const branchId = req.headers['x-branch-id'] as string || 'branch-central-1';
    const fiscalYearId = req.headers['x-fiscal-year-id'] as string || 'fy-1403';
    const result = await this.eCommService.verifyPaymentAndPost(
      ctx.tenantId,
      ctx.companyId,
      branchId,
      fiscalYearId,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  @Post('payment/settle-to-bank')
  async settleGatewayToBank(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const branchId = req.headers['x-branch-id'] as string || 'branch-central-1';
    const fiscalYearId = req.headers['x-fiscal-year-id'] as string || 'fy-1403';
    const result = await this.eCommService.settleGatewayToBank(
      ctx.tenantId,
      ctx.companyId,
      branchId,
      fiscalYearId,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  @Post('orders/:id/assign-courier')
  async assignCourier(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.eCommService.assignCourier(
      ctx.tenantId,
      ctx.companyId,
      id,
      body?.courierProvider,
      body?.trackingCode
    );
    return { success: true, data: result };
  }

  @Get('sync-catalog')
  async syncExternalCatalog(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const platform = (req.query.platform as any) || 'WOOCOMMERCE';
    const result = await this.eCommService.syncExternalCatalog(ctx.tenantId, ctx.companyId, platform);
    return { success: true, data: result };
  }
}
