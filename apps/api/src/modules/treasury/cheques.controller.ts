import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ChequesService } from './cheques.service';
import { ChequeDirection, ChequeStatus, PostingPolicy } from '@accounting/core';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/treasury/cheques')
export class ChequesController {
  constructor(private readonly chequesService: ChequesService) {}

  @Get('sayad/inquire/:sayadId')
  async inquireSayad(@Param('sayadId') sayadId: string) {
    const result = await this.chequesService.inquireSayad(sayadId);
    return { success: true, data: result };
  }

  @Post()
  async registerCheque(
    @Req() req: Request,
    @Body()
    body: {
      chequeDirection: ChequeDirection;
      sayadId: string;
      chequeSerialNumber: string;
      bankName: string;
      bankBranchName?: string;
      drawerIban?: string;
      drawerPartyId?: string;
      payeePartyId?: string;
      amount: string | number;
      issueDateShamsi: string;
      dueDateShamsi: string;
      postingPolicy?: PostingPolicy;
      isGuarantee?: boolean;
      description?: string;
      bankDimensionId?: string;
    }
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.chequesService.registerCheque(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  @Post(':id/status')
  async changeStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      toStatus: ChequeStatus;
      actionDateShamsi: string;
      bankDimensionId?: string;
      payeePartyDimensionId?: string;
      description?: string;
    }
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.chequesService.changeStatus(
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
  async listCheques(
    @Req() req: Request,
    @Query('direction') direction?: ChequeDirection,
    @Query('status') status?: ChequeStatus,
    @Query('dueFromDate') dueFromDate?: string,
    @Query('dueToDate') dueToDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const ctx = req.tenantContext!;
    const cheques = await this.chequesService.listCheques(ctx.tenantId, ctx.companyId, {
      direction,
      status,
      dueFromDate,
      dueToDate,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });
    return { success: true, data: cheques };
  }

  @Get(':id')
  async getChequeById(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const cheque = await this.chequesService.getChequeById(ctx.tenantId, id);
    return { success: true, data: cheque };
  }
}
