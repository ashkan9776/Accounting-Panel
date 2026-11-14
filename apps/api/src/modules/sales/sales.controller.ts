import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SalesService } from './sales.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSalesInvoice(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const sales = await this.salesService.createSalesInvoice(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: sales };
  }

  @Post(':id/return')
  async createSalesReturn(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.salesService.createSalesReturn(
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

  @Get()
  async listSalesDocuments(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const docs = await this.salesService.listSalesDocuments(ctx.tenantId, ctx.companyId);
    return { success: true, data: docs };
  }

  @Get(':id')
  async getSalesDocument(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const doc = await this.salesService.getSalesDocument(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: doc };
  }
}
