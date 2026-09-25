import type { ChargeUnit, MarkupType, TransportMode } from '../api/types';

export const MODE_LABELS: Record<TransportMode, string> = {
  SeaFcl: 'Sea FCL',
  SeaLcl: 'Sea LCL',
  Air: 'Air',
};

export const UNIT_LABELS: Record<ChargeUnit, string> = {
  PerContainer: 'per container',
  PerCbm: 'per cbm',
  PerKg: 'per kg',
  PerShipment: 'per shipment',
  PerBl: 'per B/L',
};

export const MARKUP_LABELS: Record<MarkupType, string> = {
  Percentage: 'Percentage of cost',
  FixedPerUnit: 'Fixed amount per unit',
  FlatPerShipment: 'Flat fee per shipment',
  TargetMargin: 'Target gross margin',
  MinimumSell: 'Minimum sell price',
};

export function markupSuffix(type: MarkupType) {
  return type === 'Percentage' || type === 'TargetMargin' ? '%' : 'amount';
}

export function money(value: number, currency = 'USD') {
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
