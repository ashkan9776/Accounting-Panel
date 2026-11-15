import { Controller, Get, Put, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('executive')
  async getExecutiveDashboard(@Req() req: Request, @Query('asOfDate') asOfDate?: string) {
    const ctx = req.tenantContext!;
    const result = await this.dashboardService.getExecutiveDashboard(ctx.tenantId, ctx.companyId, asOfDate);
    return { success: true, data: result };
  }

  @Get('receivables-aging')
  async getReceivablesAging(@Req() req: Request, @Query('asOfDate') asOfDate?: string) {
    const ctx = req.tenantContext!;
    const result = await this.dashboardService.getReceivablesAging(ctx.tenantId, ctx.companyId, asOfDate);
    return { success: true, data: result };
  }

  @Get('widgets')
  async getUserWidgets(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.dashboardService.getUserWidgets(ctx.tenantId, user.id);
    return { success: true, data: result };
  }

  @Put('widgets/layout')
  async updateWidgetLayout(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.dashboardService.updateWidgetLayout(ctx.tenantId, user.id, body.widgets);
    return { success: true, data: result };
  }
}
