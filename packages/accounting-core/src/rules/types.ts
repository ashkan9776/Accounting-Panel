/**
 * تایپ‌های موتور قوانین نسخه‌دار (Versioned Rules Engine)
 */

export interface VersionedRule<T = any> {
  id: string;
  ruleCode: string;
  version: number;
  effectiveFromShamsi: string; // YYYY/MM/DD
  effectiveToShamsi?: string;   // YYYY/MM/DD or null/undefined
  legalReference: string;
  parameters: T;
  isActive: boolean;
}

export interface VatRuleParameters {
  standardRate: number; // e.g. 10.0
  exemptCommodityCodes: string[];
  goldRules: {
    rawGoldExempt: boolean;
    appliesToWageAndProfitOnly: boolean;
    rate: number;
  };
}

export interface TaxBracket {
  bracketNumber: number;
  title: string;
  fromAmount: number;
  toAmount: number | null; // null for no upper limit
  ratePercent: number;
}

export interface PayrollTaxParameters {
  monthlyBrackets: TaxBracket[];
  annualExemptionCeiling: number;
}

export interface SocialSecurityParameters {
  employeeRatePercent: number;    // 7%
  employerRatePercent: number;    // 20%
  unemploymentRatePercent: number;// 3%
  maxInsurableMonthlyWage?: number;
}

export interface RuleEvaluationResult<T = any> {
  ruleCode: string;
  version: number;
  legalReference: string;
  effectiveDate: string;
  parameters: T;
  explanation: string;
}

export interface PayrollTaxCalculationResult {
  taxableIncome: string; // Decimal string
  totalTax: string;
  effectiveRatePercent: string;
  bracketsUsed: {
    bracket: number;
    title: string;
    taxableInBracket: string;
    ratePercent: number;
    taxAmount: string;
  }[];
  explanationTrace: string;
}

export interface VatCalculationResult {
  grossAmount: string;
  discountAmount: string;
  netTaxableAmount: string;
  vatRatePercent: number;
  vatAmount: string;
  dutyAmount: string;
  totalWithVat: string;
  isExempt: boolean;
  legalReference: string;
  explanationTrace: string;
}
