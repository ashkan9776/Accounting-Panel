import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AccountingModule } from '../accounting/accounting.module';
import { FixedAssetsService } from './fixed-assets.service';
import { FixedAssetsController } from './fixed-assets.controller';

@Module({
  imports: [AccountingModule],
  controllers: [FixedAssetsController],
  providers: [
    DatabaseService,
    FixedAssetsService
  ],
  exports: [
    FixedAssetsService
  ]
})
export class FixedAssetsModule {}
