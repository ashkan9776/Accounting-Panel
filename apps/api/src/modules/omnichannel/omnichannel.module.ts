import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { ECommerceService } from './e-commerce.service';
import { HardwareService } from './hardware.service';
import { VisitorService } from './visitor.service';
import { ECommerceController } from './e-commerce.controller';
import { HardwareController } from './hardware.controller';
import { VisitorController } from './visitor.controller';

@Module({
  imports: [AccountingModule],
  providers: [ECommerceService, HardwareService, VisitorService],
  controllers: [ECommerceController, HardwareController, VisitorController],
  exports: [ECommerceService, HardwareService, VisitorService]
})
export class OmnichannelModule {}
