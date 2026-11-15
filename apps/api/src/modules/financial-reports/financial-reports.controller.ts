import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { FinancialReportsService } from './financial-reports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/financial-reports')
export class FinancialReportsController {
  constructor(private readonly reportsService: FinancialReportsService) {}

  @Get('balance-sheet')
  async getBalanceSheet(@Req() req: Request, @Query('asOfDate') asOfDate?: string) {
    const ctx = req.tenantContext!;
    const result = await this.reportsService.getBalanceSheet(
      ctx.tenantId,
      ctx.companyId,
      asOfDate,
      ctx.fiscalYearId
    );
    return { success: true, data: result };
  }

  @Get('income-statement')
  async getIncomeStatement(
    @Req() req: Request,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const ctx = req.tenantContext!;
    const result = await this.reportsService.getIncomeStatement(
      ctx.tenantId,
      ctx.companyId,
      fromDate,
      toDate,
      ctx.fiscalYearId
    );
    return { success: true, data: result };
  }

  @Get('cash-flow')
  async getCashFlowStatement(
    @Req() req: Request,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const ctx = req.tenantContext!;
    const result = await this.reportsService.getCashFlowStatement(
      ctx.tenantId,
      ctx.companyId,
      fromDate,
      toDate,
      ctx.fiscalYearId
    );
    return { success: true, data: result };
  }

  @Get('ratios')
  async getFinancialRatios(@Req() req: Request, @Query('asOfDate') asOfDate?: string) {
    const ctx = req.tenantContext!;
    const result = await this.reportsService.getFinancialRatios(
      ctx.tenantId,
      ctx.companyId,
      asOfDate,
      ctx.fiscalYearId
    );
    return { success: true, data: result };
  }
}
