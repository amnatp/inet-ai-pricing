export const DIRECTION_OPTIONS = ['Export', 'Import', 'Cross Trade'] as const;
export const CURRENCY_OPTIONS = ['USD', 'THB', 'EUR', 'CNY', 'JPY', 'SGD', 'HKD'] as const;
export const RATE_TYPE_OPTIONS = ['FAK', 'NAC', 'NVO FAK', 'BCO', 'Spot Rate', 'Contract'] as const;
export const CONTAINER_TYPE_OPTIONS = ['DC', 'HC', 'RF', 'OT', 'FR', 'NOR', 'TK'] as const;
export const CHARGE_TYPE_OPTIONS = ['Mandatory', 'Optional', 'Conditional'] as const;
export const CARGO_TYPE_OPTIONS = ['GENERAL', 'DG', 'PERISHABLE', 'VALUABLE', 'OVERSIZE'] as const;
export const ACCOUNT_TYPE_OPTIONS = ['DIRECT', 'AGENT', 'FORWARDER', 'BENEFICIAL CARGO OWNER'] as const;
export const RATE_APPLY_BY_OPTIONS = ['ETD', 'ETA', 'SO Date', 'Gate-in Date'] as const;
export const OCEAN_SERVICE_OPTIONS = ['Direct', 'Transshipment'] as const;
export const INLAND_ROUTING_OPTIONS = ['Direct Port', 'IPI', 'RIPI'] as const;
export const SERVICE_UOM_OPTIONS = [
  'PER CONTAINER',
  'PER CBM',
  'PER RT',
  'PER KG',
  'PER BL',
  'PER SHIPMENT',
  'PER SET',
] as const;
