import type {
  PricingRequest,
  PricingRequestWork,
  CostRate,
  CostRateInput,
  Customer,
  Lookups,
  Paged,
  PricingRule,
  PricingRuleInput,
  QuoteRequest,
  QuoteResponse,
  RateInquiryEmailRequest,
  RateInquiryEmailResponse,
  Tradelane,
  TransportMode,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE?.trim() || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let fieldErrors: Record<string, string[]> = {};
    try {
      const problem = await res.json();
      message = problem.title ?? problem.detail ?? message;
      fieldErrors = problem.errors ?? {};
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    throw new ApiError(message, res.status, fieldErrors);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface CostQuery {
  mode?: TransportMode | '';
  search?: string;
  tradelane?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export const api = {
  savePreferences: (rows: import('../components/CarrierPreferences').PreferenceRow[]) => request('/costs/preferences/', { method: 'PUT', body: JSON.stringify(rows) }),
  async previewPreferences(file: File): Promise<import('../components/CarrierPreferences').PreferenceRow[]> {
    const body=new FormData();body.append('file',file);
    const response=await fetch(`${BASE}/costs/preferences/preview`,{method:'POST',body});
    if(!response.ok) {const error=await response.json();throw new Error(error.title ?? 'Upload failed');}
    return response.json();
  },
  async downloadPreferences() {
    const response=await fetch(`${BASE}/costs/preferences/template`);
    if(!response.ok) throw new Error('Template download failed');
    const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='Carrier_Preferences.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  },
  requestRateDetails: (id: string) => request<{ search: QuoteRequest | null; rate: CostRate | null }>(`/pricing-requests/${encodeURIComponent(id)}/rate`),
  saveRequestBuyingRate: (id: string, revision: number, rate: CostRateInput) => request<PricingRequestWork>(`/pricing-requests/${encodeURIComponent(id)}/rate`, { method: 'PUT', body: JSON.stringify({ revision, rate }) }),
  pricingRequests: () => request<PricingRequest[]>('/pricing-requests/'),
  updatePricingRequest: (id: string, body: PricingRequestWork) =>
    request<PricingRequestWork>(`/pricing-requests/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  currentUser: () => request<{ name: string; email: string; isDemo: boolean }>('/me'),
  listCosts(q: CostQuery = {}) {
    const params = new URLSearchParams();
    if (q.mode) params.set('mode', q.mode);
    if (q.search) params.set('search', q.search);
    if (q.tradelane) params.set('tradelane', q.tradelane);
    if (q.activeOnly) params.set('activeOnly', 'true');
    params.set('page', String(q.page ?? 1));
    params.set('pageSize', String(q.pageSize ?? 25));
    return request<Paged<CostRate>>(`/costs?${params}`);
  },
  getCost: (id: number) => request<CostRate>(`/costs/${id}`),
  createCost: (body: CostRateInput) =>
    request<CostRate>('/costs', { method: 'POST', body: JSON.stringify(body) }),
  updateCost: (id: number, body: CostRateInput) =>
    request<CostRate>(`/costs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCost: (id: number) => request<void>(`/costs/${id}`, { method: 'DELETE' }),

  listRules: () => request<PricingRule[]>('/rules'),
  createRule: (body: PricingRuleInput) =>
    request<PricingRule>('/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateRule: (id: number, body: PricingRuleInput) =>
    request<PricingRule>(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRule: (id: number) => request<void>(`/rules/${id}`, { method: 'DELETE' }),
  testRules: (body: QuoteRequest) =>
    request<PricingRule[]>('/rules/test', { method: 'POST', body: JSON.stringify(body) }),

  quote: (body: QuoteRequest) =>
    request<QuoteResponse>('/quotes', { method: 'POST', body: JSON.stringify(body) }),
  pricingEmailStatus: () => request<{ enabled: boolean; mode: 'demo' | 'smtp' }>('/rate-inquiries/email-status'),
  requestRate: (body: RateInquiryEmailRequest) =>
    request<RateInquiryEmailResponse>('/rate-inquiries/requests', { method: 'POST', body: JSON.stringify(body) }),

  customers: () => request<Customer[]>('/reference/customers'),
  tradelanes: () => request<Tradelane[]>('/reference/tradelanes'),
  lookups: () => request<Lookups>('/reference/lookups'),
};

export const serviceApi = {
  list: (category: string, type: string, search: string, page: number) => request<Paged<import('../pages/ServiceRatesPage').ServiceRate>>(`/service-rates/?${new URLSearchParams({ category, type, search, page: String(page) })}`),
  save: (body: import('../pages/ServiceRatesPage').ServiceRate) => request(`/service-rates/${body.id || ''}`, { method: body.id ? 'PUT' : 'POST', body: JSON.stringify(body) }),
  remove: (id: number, revision: number) => request<void>(`/service-rates/${id}?revision=${revision}`, { method: 'DELETE' }),
};


export const rateImportApi = {
  async download(kind: import('../components/RateUpload').UploadKind, existing: boolean) {
    const response=await fetch(`${BASE}/rate-imports/${kind}/template?existing=${existing}`);
    if(!response.ok) throw new Error('Template download failed');
    const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=`${kind}_Rates_${existing?'Existing':'Template'}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  },
  async preview(kind: import('../components/RateUpload').UploadKind, file:File):Promise<import('../components/RateUpload').RateImportPreview> {
    const body=new FormData();body.append('file',file);
    const response=await fetch(`${BASE}/rate-imports/${kind}/preview`,{method:'POST',body});
    if(!response.ok){const error=await response.json();throw new Error(error.title??'Upload failed');}
    return response.json();
  },
  commit:(token:string)=>request<{created:number;updated:number}>('/rate-imports/commit',{method:'POST',body:JSON.stringify({token})}),
};
