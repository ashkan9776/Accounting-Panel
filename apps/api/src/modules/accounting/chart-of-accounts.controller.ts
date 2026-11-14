import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { FloatingDimensionType } from '@accounting/core';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/accounting/chart')
export class ChartOfAccountsController {
  constructor(private readonly coaService: ChartOfAccountsService) {}

  @Get('tree')
  async getChartTree(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const tree = await this.coaService.getFullChartTree(ctx.tenantId, ctx.companyId);
    return { success: true, data: tree };
  }

  @Get('subsidiaries')
  async getSubsidiaries(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const subs = await this.coaService.getSubsidiaries(ctx.tenantId, ctx.companyId);
    return { success: true, data: subs };
  }

  @Get('floating-dimensions')
  async getFloatingDimensions(
    @Req() req: Request,
    @Query('type') dimensionType?: FloatingDimensionType
  ) {
    const ctx = req.tenantContext!;
    const dimensions = await this.coaService.getFloatingDimensions(ctx.tenantId, ctx.companyId, dimensionType);
    return { success: true, data: dimensions };
  }

  @Post('floating-dimensions')
  async createFloatingDimension(
    @Req() req: Request,
    @Body() body: { dimensionType: FloatingDimensionType; code: string; title: string; referenceId?: string }
  ) {
    const ctx = req.tenantContext!;
    const result = await this.coaService.createFloatingDimension(
      ctx.tenantId,
      ctx.companyId,
      body.dimensionType,
      body.code,
      body.title,
      body.referenceId
    );
    return { success: true, data: result };
  }
}
