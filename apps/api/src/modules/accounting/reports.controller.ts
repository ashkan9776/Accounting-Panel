import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ReportsService } from './reports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/accounting/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  async getTrialBalance(
    @Req() req: Request,
    @Query('level') level?: 'SUBSIDIARY' | 'HEAD' | 'GROUP',
    @Query('fiscalYearId') fiscalYearId?: string
  ) {
    const ctx = req.tenantContext!;
    const fyId = fiscalYearId || ctx.fiscalYearId;
    const report = await this.reportsService.getTrialBalance(ctx.tenantId, ctx.companyId, fyId, level);
    return { success: true, data: report };
  }

  @Get('general-journal')
  async getGeneralJournal(
    @Req() req: Request,
    @Query('fiscalYearId') fiscalYearId?: string
  ) {
    const ctx = req.tenantContext!;
    const fyId = fiscalYearId || ctx.fiscalYearId;
    const journal = await this.reportsService.getGeneralJournal(ctx.tenantId, ctx.companyId, fyId);
    return { success: true, data: journal };
  }

  @Get('subsidiary-ledger/:id')
  async getSubsidiaryLedger(
    @Req() req: Request,
    @Param('id') subsidiaryId: string,
    @Query('dimensionId') dimensionId?: string,
    @Query('fiscalYearId') fiscalYearId?: string
  ) {
    const ctx = req.tenantContext!;
    const fyId = fiscalYearId || ctx.fiscalYearId;
    const ledger = await this.reportsService.getSubsidiaryLedger(
      ctx.tenantId,
      ctx.companyId,
      subsidiaryId,
      fyId,
      dimensionId
    );
    return { success: true, data: ledger };
  }
}
