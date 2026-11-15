import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SecurityService } from './security.service';
import { TenantIsolationGuard } from './tenant-isolation.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/saas/security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Post('2fa/setup')
  async setupTwoFactor(@Req() req: Request) {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const result = await this.securityService.setupTwoFactor(userId);
    return { success: true, data: result };
  }

  @Post('2fa/verify')
  async verifyTwoFactor(@Req() req: Request, @Body() body: { token: string }) {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const result = await this.securityService.verifyAndEnableTwoFactor(userId, body.token);
    return { success: true, data: result };
  }

  @Get('audit-logs')
  async getAuditLogs(@Req() req: Request) {
    const tenantId = req.tenantContext?.tenantId || (req.user as any)?.tenantId;
    const result = await this.securityService.getSecurityAuditLogs(tenantId);
    return { success: true, data: result };
  }

  /**
   * روت تست ایزولاسیون چندمستاجری (Tenant Isolation)
   */
  @UseGuards(TenantIsolationGuard)
  @Get('tenant-check')
  async checkTenantIsolation(@Req() req: Request) {
    const tenantId = req.tenantContext?.tenantId || (req.user as any)?.tenantId;
    return {
      success: true,
      data: {
        authenticatedTenantId: tenantId,
        status: 'ISOLATED_OK',
      },
    };
  }
}
