export type TransportMode = 'SeaFcl' | 'SeaLcl' | 'Air';
export type ChargeUnit = 'PerContainer' | 'PerCbm' | 'PerRt' | 'PerKg' | 'PerShipment' | 'PerBl' | 'PerSet';
export type AccountTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export type MarkupType =
  | 'Percentage'
  | 'FixedPerUnit'
  | 'FlatPerShipment'
  | 'TargetMargin'
  | 'MinimumSell';

export interface CostCharge {
  id?: number;
  code: string;
  name: string;
  amount20: number | null;
  amount40: number | null;
  amount40H: number | null;
  amount45: number | null;
  amountBase: number | null;
  isMandatory: boolean;
  isMarkupable: boolean;
}

export interface CostRate {
  preferred: boolean;
  quota: number | null;
  recordType: 'General' | 'RFQ';
  salesforceOpportunityId: string | null;
  id: number;
  rateCode: string;
  mode: TransportMode;
  priceOwner: string;
  agent: string | null;
  carrier: string | null;
  carrierCode?: string | null;
  originCountry: string;
  portOfReceipt: string | null;
  portOfLoading: string;
  destCountry: string;
  portOfDischarge: string | null;
  portOfDestination: string;
  tradelaneCode: string | null;
  rateType: string;
  accountId: string | null;
  commodity: string | null;
  direction: string | null;
  chargeType: string | null;
  cargoType: string | null;
  accountType: string | null;
  rateApplyBy: string | null;
  oceanService: string | null;
  tsPort: string | null;
  inlandRouting: string | null;
  deliveryType?: string | null;
  inlandRoutingSource?: string | null;
  inlandRoutingStatus?: string | null;
  inlandRoutingReason?: string | null;
  inlandRoutingRuleVersion?: string | null;
  inlandRoutingOverrideReason?: string | null;
  containerType: string;
  unit: ChargeUnit;
  currency: string;
  validFrom: string;
  validTo: string;
  priority: number;
  transitTimeDays: number | null;
  remark: string | null;
  isActive: boolean;
  availableSizes: string[];
  totalCostBySize: Record<string, number>;
  totalCostBase: number | null;
  updatedAtUtc: string;
  updatedBy: string | null;
  sell20: number | null;
  sell40: number | null;
  sell40H: number | null;
  sell45: number | null;
  sellBase: number | null;
  charges: CostCharge[];
}

export type CostRateInput = Omit<
  CostRate,
  'id' | 'availableSizes' | 'totalCostBySize' | 'totalCostBase' | 'updatedAtUtc' | 'updatedBy'
>;

export interface PricingRule {
  id: number;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  stopProcessing: boolean;
  isFallback: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  mode: TransportMode | null;
  originCountry: string | null;
  portOfLoading: string | null;
  destCountry: string | null;
  portOfDestination: string | null;
  tradelaneCode: string | null;
  accountTier: AccountTier | null;
  accountId: string | null;
  containerType: string | null;
  containerSize: string | null;
  carrier: string | null;
  commodity: string | null;
  markupType: MarkupType;
  markupValue: number;
  currency: string | null;
  minMarkup: number | null;
  maxMarkup: number | null;
  specificity: number;
  updatedAtUtc: string;
}

export type PricingRuleInput = Omit<PricingRule, 'id' | 'specificity' | 'updatedAtUtc'>;

export interface QuoteRequest {
  mode: TransportMode;
  originCountry?: string | null;
  portOfLoading?: string | null;
  destCountry?: string | null;
  portOfDestination?: string | null;
  tradelaneCode?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  accountTier?: AccountTier | null;
  containerType?: string | null;
  containerSize?: string | null;
  commodity?: string | null;
  carrier?: string | null;
  quantity: number;
  shipmentDate?: string | null;
  includeOptionalCharges?: boolean;
  requestedBy?: string | null;
}

export interface AppliedRule {
  ruleId: number;
  ruleName: string;
  priority: number;
  specificity: number;
  markupType: MarkupType;
  markupValue: number;
  amountApplied: number;
  explanation: string;
}

export interface QuoteOption {
  costRateId: number;
  rateCode: string;
  mode: TransportMode;
  carrier: string | null;
  portOfLoading: string;
  portOfDestination: string;
  tradelaneCode: string | null;
  containerType: string;
  containerSize: string | null;
  unit: ChargeUnit;
  currency: string;
  validFrom: string;
  validTo: string;
  transitTimeDays: number | null;
  rateType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unitSell: number;
  totalSell: number;
  totalMarkup: number;
  marginPercent: number;
  costBreakdown: { code: string; name: string; unitCost: number; isMarkupable: boolean }[];
  appliedRules: AppliedRule[];
  warnings: string[];
  priceSource?: 'Rate' | 'Rules';
  preferred: boolean;
  priority: number;
  quota: number | null;
  recommended: boolean;
}

export interface QuoteResponse {
  reference: string;
  generatedAtUtc: string;
  resolvedTradelaneCode: string | null;
  resolvedAccountId: string | null;
  resolvedAccountName: string | null;
  resolvedAccountTier: AccountTier | null;
  options: QuoteOption[];
  messages: string[];
}

export interface RateInquiryEmailRequest {
  estimatedContainers?: number;
  accountId?: string;
  opportunityType?: 'GeneralOpportunity' | 'RFQ';
  quoteReference: string;
  costRateId?: number;
  containerSize?: string | null;
  notes?: string;
}

export interface RateInquiryEmailResponse {
  reference: string;
  status: 'sent' | 'demo';
  sentAtUtc: string | null;
  message: string;
}

export interface Account {
  id: number;
  accountId: string;
  accountName: string;
  tier: AccountTier;
  country: string | null;
  salesOwner: string | null;
  isActive: boolean;
}

export interface Tradelane {
  id: number;
  code: string;
  name: string;
  countries: string;
}

export interface ContainerType {
  code: string;
  name: string;
  mode: TransportMode;
}

export interface ContainerSize {
  code: string;
  name: string;
}

export interface Lookups {
  dropdownOptions: Record<string, { value: string; label: string }[]>;
  originCountries: string[];
  portsOfLoading: string[];
  destCountries: string[];
  portsOfDestination: string[];
  carriers: string[];
  containerTypes: ContainerType[];
  containerSizes: ContainerSize[];
  currencies: string[];
  modes: TransportMode[];
  markupTypes: MarkupType[];
  tiers: AccountTier[];
  chargeUnits: ChargeUnit[];
}

export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export type RequestStatus = 'New' | 'InProgress' | 'Waiting' | 'BuyingRateSet' | 'Ready' | 'Resolved' | 'Closed';
export interface PricingRequestWork {
  status: RequestStatus;
  assignee: string;
  notes: string;
  revision: number;
  updatedAtUtc: string | null;
}
export interface PricingRequest extends PricingRequestWork {
  estimatedContainers: number | null;
  accountId: string | null;
  opportunityType: 'GeneralOpportunity' | 'RFQ' | null;
  id: string;
  reference: string;
  requesterEmail: string;
  subject: string;
  body: string;
  createdAtUtc: string;
  emailStatus: string;
}
