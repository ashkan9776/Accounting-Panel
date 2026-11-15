import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { MigrationService } from './migration.service';
import { DataMigrationSource } from '@accounting/core';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/saas/migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('accounts')
  async importAccounts(
    @Req() req: Request,
    @Body() body: { source: DataMigrationSource; rows: any[] },
  ) {
    const ctx = req.tenantContext!;
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const result = await this.migrationService.importAccounts(
      ctx.tenantId,
      ctx.companyId,
      body.source || 'SEPIDAR',
      body.rows,
      userId,
    );
    return { success: true, data: result };
  }

  @Post('parties')
  async importParties(
    @Req() req: Request,
    @Body() body: { source: DataMigrationSource; rows: any[] },
  ) {
    const ctx = req.tenantContext!;
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const result = await this.migrationService.importParties(
      ctx.tenantId,
      ctx.companyId,
      body.source || 'SEPIDAR',
      body.rows,
      userId,
    );
    return { success: true, data: result };
  }

  @Post('products')
  async importProducts(
    @Req() req: Request,
    @Body() body: { source: DataMigrationSource; rows: any[] },
  ) {
    const ctx = req.tenantContext!;
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const result = await this.migrationService.importProducts(
      ctx.tenantId,
      ctx.companyId,
      body.source || 'SEPIDAR',
      body.rows,
      userId,
    );
    return { success: true, data: result };
  }

  @Post('opening-balance')
  async importOpeningBalance(
    @Req() req: Request,
    @Body() body: { source: DataMigrationSource; fiscalYearId?: string; rows: any[] },
  ) {
    const ctx = req.tenantContext!;
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const result = await this.migrationService.importOpeningBalance(
      ctx.tenantId,
      ctx.companyId,
      body.fiscalYearId || ctx.fiscalYearId || 'fy-1403',
      body.source || 'RAHKARAN',
      body.rows,
      userId,
    );
    return { success: true, data: result };
  }
}
