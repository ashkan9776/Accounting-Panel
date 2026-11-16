import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SaaSPlansService } from './saas-plans.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('api/v1/saas')
export class SaaSPlansController {
  constructor(private readonly plansService: SaaSPlansService) {}

  @Public()
  @Get('plans')
  async listPlans() {
    const result = await this.plansService.listPlans();
    return { success: true, data: result };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('subscription')
  async getSubscription(@Req() req: Request) {
    const tenantId = req.tenantContext?.tenantId || (req.user as any)?.tenantId;
    const result = await this.plansService.getTenantSubscription(tenantId);
    return { success: true, data: result };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('usage')
  async getUsageMetrics(@Req() req: Request) {
    const tenantId = req.tenantContext?.tenantId || (req.user as any)?.tenantId;
    const result = await this.plansService.getTenantUsageMetrics(tenantId);
    return { success: true, data: result };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upgrade/calculate')
  async calculateUpgrade(@Req() req: Request, @Body() body: { newPlanId: string }) {
    const tenantId = req.tenantContext?.tenantId || (req.user as any)?.tenantId;
    const result = await this.plansService.calculateUpgrade(tenantId, body.newPlanId);
    return { success: true, data: result };
  }

  @RequirePermissions('SAAS_ADMIN')
  @UseGuards(AuthGuard('jwt'))
  @Post('upgrade/execute')
  async executeUpgrade(
    @Req() req: Request,
    @Body() body: { newPlanId: string; billingCycle?: 'MONTHLY' | 'YEARLY'; paymentReference?: string },
  ) {
    const tenantId = req.tenantContext?.tenantId || (req.user as any)?.tenantId;
    const result = await this.plansService.executeUpgrade(
      tenantId,
      body.newPlanId,
      body.billingCycle,
      body.paymentReference,
    );
    return { success: true, data: result };
  }
}
