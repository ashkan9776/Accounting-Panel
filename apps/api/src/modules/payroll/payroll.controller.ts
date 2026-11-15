import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { EmployeesService } from './employees.service';
import { PayrollService } from './payroll.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/payroll')
export class PayrollController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly payrollService: PayrollService
  ) {}

  // ==========================================
  // ۱. پرسنل و احکام کارگزینی (Employees)
  // ==========================================
  @Post('employees')
  async createEmployee(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.employeesService.createEmployee(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: result };
  }

  @Get('employees')
  async listEmployees(@Req() req: Request, @Query() query: any) {
    const ctx = req.tenantContext!;
    const result = await this.employeesService.listEmployees(ctx.tenantId, ctx.companyId, query);
    return { success: true, data: result };
  }

  @Get('employees/:id')
  async getEmployee(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.employeesService.getEmployee(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  // ==========================================
  // ۲. دوره‌های حقوق و محاسبه کارکرد (Periods & Calculation)
  // ==========================================
  @Post('periods')
  async createPeriod(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.payrollService.createPeriod(ctx.tenantId, ctx.companyId, ctx.branchId!, body);
    return { success: true, data: result };
  }

  @Get('periods')
  async listPeriods(@Req() req: Request, @Query('yearShamsi') yearShamsi?: string) {
    const ctx = req.tenantContext!;
    const result = await this.payrollService.listPeriods(ctx.tenantId, ctx.companyId, yearShamsi);
    return { success: true, data: result };
  }

  @Get('periods/:id')
  async getPeriod(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.payrollService.getPeriod(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }

  @Post('periods/:id/calculate')
  async calculatePeriod(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const result = await this.payrollService.calculatePeriodSlips(ctx.tenantId, ctx.companyId, id, body);
    return { success: true, data: result };
  }

  @Post('periods/:id/approve')
  async approvePayroll(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.payrollService.approveAndPostPayroll(
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

  @Post('periods/:id/pay')
  async paySalaries(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.payrollService.paySalariesViaBank(
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

  @Get('periods/:id/tamin-diskette')
  async getTaminDiskette(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const result = await this.payrollService.generateTaminDiskette(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: result };
  }
}
