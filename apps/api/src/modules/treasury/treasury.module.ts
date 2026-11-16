import { Module } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { ChequesService } from './cheques.service';
import { ChequesController } from './cheques.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [TreasuryController, ChequesController],
  providers: [TreasuryService, ChequesService],
  exports: [TreasuryService, ChequesService]
})
export class TreasuryModule {}
