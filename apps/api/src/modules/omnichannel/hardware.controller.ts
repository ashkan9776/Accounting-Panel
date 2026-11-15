import { Controller, Post, Get, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { HardwareService } from './hardware.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/omnichannel/hardware')
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Get('terminals')
  async getTerminals(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const branchId = req.headers['x-branch-id'] as string;
    const result = await this.hardwareService.getTerminals(ctx.tenantId, ctx.companyId, branchId);
    return { success: true, data: result };
  }

  @Get('receipt-escpos/:orderId')
  async generateReceiptEscPos(@Req() req: Request, @Param('orderId') orderId: string) {
    const ctx = req.tenantContext!;
    const result = await this.hardwareService.generateReceiptEscPos(ctx.tenantId, ctx.companyId, orderId);
    return { success: true, data: result };
  }

  @Post('pcpos/sale')
  async sendPcPosTransaction(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.hardwareService.sendPcPosTransaction(
      ctx.tenantId,
      ctx.companyId,
      body.terminalId,
      body.amount,
      body.orderId
    );
    return { success: true, data: result };
  }

  @Post('scale/read')
  async readScaleWeight(@Body() body: any) {
    const result = await this.hardwareService.readScaleWeight(body.terminalId, body.rawStream);
    return { success: true, data: result };
  }

  @Post('attendance/import')
  async importAttendanceLogs(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.hardwareService.importAttendanceLogs(ctx.tenantId, ctx.companyId, body.logs);
    return { success: true, data: result };
  }

  @Get('attendance/summary/:employeeId')
  async getEmployeeAttendanceSummary(
    @Req() req: Request,
    @Param('employeeId') employeeId: string,
    @Query('dateShamsi') dateShamsi: string
  ) {
    const ctx = req.tenantContext!;
    const date = dateShamsi || '1403/12/29';
    const result = await this.hardwareService.getEmployeeAttendanceSummary(
      ctx.tenantId,
      ctx.companyId,
      employeeId,
      date
    );
    return { success: true, data: result };
  }
}
