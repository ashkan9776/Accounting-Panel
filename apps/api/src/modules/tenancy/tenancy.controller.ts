import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { TenancyService } from './tenancy.service';

@Controller('api/v1/tenancy')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get('company')
  async getCompany(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const company = await this.tenancyService.getCompany(ctx.tenantId, ctx.companyId);
    return { success: true, data: company };
  }

  @Get('branches')
  async getBranches(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const branches = await this.tenancyService.getBranches(ctx.tenantId, ctx.companyId);
    return { success: true, data: branches };
  }

  @Get('fiscal-years')
  async getFiscalYears(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const years = await this.tenancyService.getFiscalYears(ctx.tenantId, ctx.companyId);
    return { success: true, data: years };
  }
}
