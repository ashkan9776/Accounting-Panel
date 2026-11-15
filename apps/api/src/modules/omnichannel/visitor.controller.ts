import { Controller, Post, Get, Body, Req, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { VisitorService } from './visitor.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/omnichannel/visitor')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Get('customer-credit')
  async checkCustomerCredit(
    @Req() req: Request,
    @Query('partyId') partyId: string,
    @Query('amount') amount: string
  ) {
    const ctx = req.tenantContext!;
    const result = await this.visitorService.checkCustomerCredit(
      ctx.tenantId,
      ctx.companyId,
      partyId,
      amount || '0'
    );
    return { success: true, data: result };
  }

  @Post('visits')
  async recordVisitorVisit(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.visitorService.recordVisitorVisit(ctx.tenantId, ctx.companyId, user.id, body);
    return { success: true, data: result };
  }

  @Get('visits')
  async getVisitorVisits(@Req() req: Request, @Query('dateShamsi') dateShamsi?: string) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.visitorService.getVisitorVisits(ctx.tenantId, ctx.companyId, user.id, dateShamsi);
    return { success: true, data: result };
  }
}
