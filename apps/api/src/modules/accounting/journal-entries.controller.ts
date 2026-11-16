import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntryStatus, JournalEntryType, JournalLineInput } from '@accounting/core';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/accounting/journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalService: JournalEntriesService) {}

  @RequirePermissions('ACCOUNTING_WRITE')
  @Post()
  async createEntry(
    @Req() req: Request,
    @Body()
    body: {
      entryDateShamsi: string;
      entryType?: JournalEntryType;
      description: string;
      sourceModule?: string;
      sourceDocumentId?: string;
      lines: JournalLineInput[];
    }
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const entry = await this.journalService.createEntry(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: entry };
  }

  @Get()
  async listEntries(
    @Req() req: Request,
    @Query('status') status?: JournalEntryStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const ctx = req.tenantContext!;
    const entries = await this.journalService.listEntries(ctx.tenantId, ctx.companyId, {
      fiscalYearId: ctx.fiscalYearId,
      status,
      fromDateShamsi: fromDate,
      toDateShamsi: toDate,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });
    return { success: true, data: entries };
  }

  @Get(':id')
  async getEntryById(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const entry = await this.journalService.getEntryById(ctx.tenantId, id);
    return { success: true, data: entry };
  }

  @RequirePermissions('ACCOUNTING_WRITE')
  @Post(':id/approve')
  async approveEntry(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.journalService.approveEntry(ctx.tenantId, id, user.id);
    return { success: true, data: result };
  }

  @RequirePermissions('ACCOUNTING_WRITE')
  @Post(':id/finalize')
  async finalizeEntry(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.journalService.finalizeEntry(ctx.tenantId, id, user.id);
    return { success: true, data: result };
  }

  @RequirePermissions('ACCOUNTING_WRITE')
  @Post(':id/reverse')
  async reverseEntry(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { reversalDateShamsi: string; reason?: string }
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.journalService.reverseEntry(
      ctx.tenantId,
      id,
      user.id,
      body.reversalDateShamsi,
      body.reason
    );
    return { success: true, data: result };
  }
}
