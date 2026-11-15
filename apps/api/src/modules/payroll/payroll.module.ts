import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AccountingModule } from '../accounting/accounting.module';
import { EmployeesService } from './employees.service';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [AccountingModule],
  controllers: [PayrollController],
  providers: [
    DatabaseService,
    EmployeesService,
    PayrollService
  ],
  exports: [
    EmployeesService,
    PayrollService
  ]
})
export class PayrollModule {}
