import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PartiesService } from './parties.service';
import { PartyType } from '@accounting/core';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Post()
  async createParty(
    @Req() req: Request,
    @Body()
    body: {
      partyType: PartyType;
      name: string;
      firstName?: string;
      lastName?: string;
      nationalId?: string;
      economicCode?: string;
      registrationNumber?: string;
      mobile?: string;
      phone?: string;
      email?: string;
      postalCode?: string;
      address?: string;
      creditLimit?: string | number;
      creditTermsDays?: number;
      isCustomer?: boolean;
      isSupplier?: boolean;
      isEmployee?: boolean;
      isShareholder?: boolean;
    }
  ) {
    const ctx = req.tenantContext!;
    const party = await this.partiesService.createParty(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: party };
  }

  @Get()
  async listParties(
    @Req() req: Request,
    @Query('type') type?: 'customer' | 'supplier' | 'employee',
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const ctx = req.tenantContext!;
    const parties = await this.partiesService.listParties(ctx.tenantId, ctx.companyId, {
      type,
      search,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });
    return { success: true, data: parties };
  }

  @Get(':id')
  async getPartyById(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const party = await this.partiesService.getPartyById(ctx.tenantId, id);
    return { success: true, data: party };
  }

  @Get(':id/statement')
  async getPartyStatement(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const statement = await this.partiesService.getPartyStatement(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: statement };
  }

  @Get('reports/aging')
  async getAgingReport(
    @Req() req: Request,
    @Query('currentDateShamsi') currentDateShamsi?: string
  ) {
    const ctx = req.tenantContext!;
    const date = currentDateShamsi || '1403/08/24';
    const report = await this.partiesService.getPartyAgingReport(ctx.tenantId, ctx.companyId, date);
    return { success: true, data: report };
  }
}
