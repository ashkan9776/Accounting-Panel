import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RulesService } from './rules.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  async listRules() {
    const rules = await this.rulesService.listRules();
    return { success: true, data: rules };
  }

  @Post('vat/calculate')
  async calculateVat(
    @Body()
    body: {
      grossAmount: number | string;
      discountAmount?: number | string;
      commodityCode: string;
      documentDateShamsi: string;
      isGold?: boolean;
      goldDetails?: { rawGoldValue: number | string; wageAndProfitValue: number | string };
    }
  ) {
    const res = await this.rulesService.calculateVat(
      body.grossAmount,
      body.discountAmount || 0,
      body.commodityCode,
      body.documentDateShamsi,
      body.isGold,
      body.goldDetails
    );
    return { success: true, data: res };
  }

  @Post('payroll/calculate')
  async calculatePayrollTax(
    @Body()
    body: {
      monthlyTaxableIncome: number | string;
      documentDateShamsi: string;
    }
  ) {
    const res = await this.rulesService.calculatePayrollTax(
      body.monthlyTaxableIncome,
      body.documentDateShamsi
    );
    return { success: true, data: res };
  }

  @Post('social-security/calculate')
  async calculateSocialSecurity(
    @Body()
    body: {
      grossInsurableWage: number | string;
      documentDateShamsi: string;
    }
  ) {
    const res = await this.rulesService.calculateSocialSecurity(
      body.grossInsurableWage,
      body.documentDateShamsi
    );
    return { success: true, data: res };
  }
}
