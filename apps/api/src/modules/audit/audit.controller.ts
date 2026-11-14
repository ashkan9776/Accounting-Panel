import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuditService } from './audit.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async listLogs(
    @Req() req: Request,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const ctx = req.tenantContext!;
    const logs = await this.auditService.listLogs(ctx.tenantId, limit ? Number(limit) : 50, offset ? Number(offset) : 0);
    return { success: true, data: logs };
  }

  @Get('verify-chain')
  async verifyChain(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const verification = await this.auditService.verifyChain(ctx.tenantId);
    return { success: true, data: verification };
  }
}
