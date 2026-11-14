import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { TreasuryService } from './treasury.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  // ۱. حساب‌های بانکی
  @Get('bank-accounts')
  async listBankAccounts(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const accounts = await this.treasuryService.listBankAccounts(ctx.tenantId, ctx.companyId);
    return { success: true, data: accounts };
  }

  @Post('bank-accounts')
  async createBankAccount(
    @Req() req: Request,
    @Body()
    body: {
      bankName: string;
      branchName?: string;
      branchCode?: string;
      accountNumber: string;
      iban?: string;
      cardNumber?: string;
      initialBalance?: string | number;
    }
  ) {
    const ctx = req.tenantContext!;
    const account = await this.treasuryService.createBankAccount(ctx.tenantId, ctx.companyId, body);
    return { success: true, data: account };
  }

  // ۲. صندوق‌ها
  @Get('cash-desks')
  async listCashDesks(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const cashDesks = await this.treasuryService.listCashDesks(ctx.tenantId, ctx.companyId);
    return { success: true, data: cashDesks };
  }

  @Post('cash-desks')
  async createCashDesk(
    @Req() req: Request,
    @Body()
    body: {
      code: string;
      title: string;
      initialBalance?: string | number;
    }
  ) {
    const ctx = req.tenantContext!;
    const cashDesk = await this.treasuryService.createCashDesk(ctx.tenantId, ctx.companyId, ctx.branchId!, body);
    return { success: true, data: cashDesk };
  }

  // ۳. تنخواه‌گردان‌ها
  @Get('petty-cash')
  async listPettyCashFunds(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const funds = await this.treasuryService.listPettyCashFunds(ctx.tenantId, ctx.companyId);
    return { success: true, data: funds };
  }

  @Post('petty-cash')
  async createPettyCashFund(
    @Req() req: Request,
    @Body()
    body: {
      code: string;
      title: string;
      custodianPartyId: string;
      ceilingAmount: string | number;
    }
  ) {
    const ctx = req.tenantContext!;
    const fund = await this.treasuryService.createPettyCashFund(ctx.tenantId, ctx.companyId, ctx.branchId!, body);
    return { success: true, data: fund };
  }

  // ۴. انتقال وجه بین حساب‌ها
  @Post('transfers')
  async transferMoney(
    @Req() req: Request,
    @Body()
    body: {
      sourceType: 'BANK' | 'CASH' | 'PETTY';
      sourceId: string;
      destType: 'BANK' | 'CASH' | 'PETTY';
      destId: string;
      amount: string | number;
      transferDateShamsi: string;
      trackingCode?: string;
      description?: string;
    }
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.treasuryService.transferMoney(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      body
    );
    return { success: true, data: result };
  }

  // ۵. صورت‌حساب بانک و مغایرت‌گیری
  @Post('bank-statements/import')
  async importBankStatement(
    @Req() req: Request,
    @Body()
    body: {
      bankAccountId: string;
      rows: {
        statementDateShamsi: string;
        referenceNumber?: string;
        debit?: string | number;
        credit?: string | number;
        balance?: string | number;
        description?: string;
      }[];
    }
  ) {
    const ctx = req.tenantContext!;
    const res = await this.treasuryService.importBankStatement(ctx.tenantId, ctx.companyId, body.bankAccountId, body.rows);
    return { success: true, data: res };
  }

  @Get('bank-statements/:bankAccountId')
  async getBankStatement(
    @Req() req: Request,
    @Param('bankAccountId') bankAccountId: string
  ) {
    const ctx = req.tenantContext!;
    const stmt = await this.treasuryService.getBankStatement(ctx.tenantId, bankAccountId);
    return { success: true, data: stmt };
  }
}
