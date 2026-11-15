import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { FixedAssetsService } from './fixed-assets.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/fixed-assets')
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Post()
  async createAsset(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.fixedAssetsService.createAsset(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  @Get()
  async listAssets(@Req() req: Request, @Query() query: any) {
    const ctx = req.tenantContext!;
    const result = await this.fixedAssetsService.listAssets(ctx.tenantId, ctx.companyId, query);
    return { success: true, data: result };
  }

  @Get(':id')
  async getAsset(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.fixedAssetsService.getAsset(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  @Post('depreciation/calculate')
  async calculateDepreciation(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.fixedAssetsService.calculateAndPostDepreciation(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  @Post(':id/dispose')
  async disposeAsset(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.fixedAssetsService.disposeAsset(
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
}
