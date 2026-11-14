import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { VersionedRulesEngine, VersionedRule } from '@accounting/core';

@Injectable()
export class RulesService {
  constructor(private readonly db: DatabaseService) {}

  private async getEngine(): Promise<VersionedRulesEngine> {
    const rows = await this.db.query(
      `SELECT rv.*, rd.rule_code
       FROM rule_versions rv
       JOIN rule_definitions rd ON rd.id = rv.rule_definition_id
       WHERE rv.is_active = 1`
    );

    const rules: VersionedRule[] = rows.map((r: any) => ({
      id: r.id,
      ruleCode: r.rule_code,
      version: r.version_number,
      effectiveFromShamsi: r.effective_from_shamsi,
      effectiveToShamsi: r.effective_to_shamsi,
      legalReference: r.legal_reference,
      parameters: JSON.parse(r.parameters_json),
      isActive: Boolean(r.is_active)
    }));

    return new VersionedRulesEngine(rules);
  }

  async listRules() {
    return this.db.query(
      `SELECT rd.rule_code, rd.title as definition_title, rv.version_number,
              rv.effective_from_shamsi, rv.effective_to_shamsi, rv.legal_reference,
              rv.parameters_json, rv.is_active
       FROM rule_versions rv
       JOIN rule_definitions rd ON rd.id = rv.rule_definition_id
       ORDER BY rd.rule_code, rv.version_number DESC`
    );
  }

  async calculateVat(
    grossAmount: number | string,
    discountAmount: number | string,
    commodityCode: string,
    documentDateShamsi: string,
    isGold: boolean = false,
    goldDetails?: { rawGoldValue: number | string; wageAndProfitValue: number | string }
  ) {
    const engine = await this.getEngine();
    return engine.calculateVat(grossAmount, discountAmount, commodityCode, documentDateShamsi, isGold, goldDetails);
  }

  async calculatePayrollTax(monthlyTaxableIncome: number | string, documentDateShamsi: string) {
    const engine = await this.getEngine();
    return engine.calculatePayrollTax(monthlyTaxableIncome, documentDateShamsi);
  }

  async calculateSocialSecurity(grossInsurableWage: number | string, documentDateShamsi: string) {
    const engine = await this.getEngine();
    return engine.calculateSocialSecurity(grossInsurableWage, documentDateShamsi);
  }
}
