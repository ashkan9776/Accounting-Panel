import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PurchasesService } from './purchases.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async createPurchase(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const purchase = await this.purchasesService.createPurchase(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: purchase };
  }

  @Get()
  async listPurchases(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const purchases = await this.purchasesService.listPurchases(ctx.tenantId, ctx.companyId);
    return { success: true, data: purchases };
  }

  @Get(':id')
  async getPurchase(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const purchase = await this.purchasesService.getPurchase(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: purchase };
  }
}
