import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { TaxReportsService } from './tax-reports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/tax')
export class TaxReportsController {
  constructor(private readonly taxReportsService: TaxReportsService) {}

  @Get('vat-return')
  async getVatReturn(@Req() req: Request, @Query() query: any) {
    const ctx = req.tenantContext!;
    const result = await this.taxReportsService.getVatReturn(
      ctx.tenantId,
      ctx.companyId,
      query.yearShamsi,
      query.quarter
    );
    return { success: true, data: result };
  }

  @Post('vat-return/settle')
  async settleVatReturn(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.taxReportsService.settleVatReturn(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  @Get('article-169')
  async getArticle169Report(@Req() req: Request, @Query() query: any) {
    const ctx = req.tenantContext!;
    const result = await this.taxReportsService.getArticle169Report(
      ctx.tenantId,
      ctx.companyId,
      query.yearShamsi,
      query.quarter
    );
    return { success: true, data: result };
  }

  @Post('corporate-tax/provision')
  async estimateAndPostCorporateTax(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.taxReportsService.estimateAndPostCorporateTax(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: result };
  }
}
