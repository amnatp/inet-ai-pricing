import { PortName, PortInput } from '../components/Ports';
import { CountryInput } from '../components/Countries';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from 'react';
import CarrierPreferences from '../components/CarrierPreferences';
import RateUpload from '../components/RateUpload';
import { ApiError, api } from '../api/client';
import type { CostCharge, CostRate, CostRateInput, Lookups, TransportMode } from '../api/types';
import { Check, Field, Modal, Spinner } from '../components/ui';
import { MODE_LABELS, UNIT_LABELS, addMonths, money, today } from '../lib/format';
import { ACCOUNT_TYPE_OPTIONS, CARGO_TYPE_OPTIONS, CHARGE_TYPE_OPTIONS, CURRENCY_OPTIONS, DIRECTION_OPTIONS, INLAND_ROUTING_OPTIONS, OCEAN_SERVICE_OPTIONS, RATE_APPLY_BY_OPTIONS, RATE_TYPE_OPTIONS } from '../lib/rateOptions';

const SIZE_KEYS = ['amount20', 'amount40', 'amount40H', 'amount45'] as const;
const SIZE_LABELS = ["20'", "40'", "40'H", "45'"];

const EMPTY_CHARGE: CostCharge = {
  code: '',
  name: '',
  amount20: null,
  amount40: null,
  amount40H: null,
  amount45: null,
  amountBase: null,
  isMandatory: true,
  isMarkupable: true,
};

export const EMPTY: CostRateInput = {
  rateCode: '',
  recordType: 'General',
  salesforceOpportunityId: null,
  sell20: null,
  sell40: null,
  sell40H: null,
  sell45: null,
  sellBase: null,
  mode: 'SeaFcl',
  priceOwner: 'WICEBKK',
  agent: null,
  carrier: null,
  originCountry: 'THAILAND',
  portOfReceipt: null,
  portOfLoading: 'LAEM CHABANG',
  destCountry: '',
  portOfDischarge: null,
  portOfDestination: '',
  tradelaneCode: null,
  rateType: 'FAK',
  accountId: null,
  commodity: null,
  direction: null,
  chargeType: null,
  cargoType: null,
  accountType: null,
  rateApplyBy: null,
  oceanService: null,
  tsPort: null,
  inlandRouting: null,
  containerType: 'DC',
  unit: 'PerContainer',
  currency: 'USD',
  validFrom: today(),
  validTo: addMonths(today(), 3),
  priority: 1,
  preferred: false,
  quota: null,
  transitTimeDays: null,
  remark: null,
  isActive: true,
  charges: [{ ...EMPTY_CHARGE, code: 'OFR', name: 'OCEAN FREIGHT' }],
};

export default function CostsPage({ archiveOnly = false }: { archiveOnly?: boolean }) {
  const [validity,setValidity]=useState(archiveOnly ? 'archive' : 'current');
  const [preferences,setPreferences]=useState(false);
  const [upload,setUpload]=useState(false);
  const [notice,setNotice]=useState('');
  const [tradelane,setTradelane]=useState('');
  const [rows, setRows] = useState<CostRate[]>([]);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<TransportMode | ''>('');
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: number | null; draft: CostRateInput } | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);

  useEffect(() => {
    void api.lookups().then(setLookups).catch(() => setLookups(null));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
        const page = await api.listCosts({
          mode,
          search,
          activeOnly,
          tradelane,
          validity,
          pageSize: validity === 'archive' ? 5000 : 200,
        });
      setRows(page.items);
      setTotal(page.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cost rates.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeOnly, validity]);

  function startEdit(rate: CostRate) {
    const {
      id: _id,
      availableSizes: _sizes,
      totalCostBySize: _bySize,
      totalCostBase: _base,
      updatedAtUtc: _u,
      updatedBy: _b,
      ...draft
    } = rate;
    setEditing({ id: rate.id, draft: structuredClone(draft) });
  }

  async function remove(rate: CostRate) {
    if (!confirm(`Delete rate ${rate.rateCode}? This cannot be undone.`)) return;
    try {
      await api.deleteCost(rate.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  }

  return (
    <>
      <h1>{archiveOnly ? 'Archived freight rates' : 'Freight tariffs'}</h1>
      <p className="subtitle">
        Buying rates per lane and equipment. Sell prices are derived from these by the rules engine.
      </p>

      {notice && <div className="banner info">{notice}</div>}
      {error && <div className="banner error">{error}</div>}

      <Card className="card">
        <div className="toolbar">
          {!archiveOnly && <Field label="Validity view"><select value={validity} onChange={e=>setValidity(e.target.value)}><option value="current">Current rates</option><option value="upcoming">Upcoming rates</option><option value="archive">Archive (expired)</option><option value="all">All rates</option></select></Field>}
          <Field label="Mode">
            <select value={mode} onChange={(e) => setMode(e.target.value as TransportMode | '')}>
              <option value="">All modes</option>
              {(Object.keys(MODE_LABELS) as TransportMode[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trade lane"><Input value={tradelane} placeholder="e.g. TRANSPACIFIC" onChange={e=>setTradelane(e.target.value.toUpperCase())} /></Field>
          <Field label="Search">
            <Input
              value={search}
              placeholder="Rate code, port or carrier"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
          </Field>
          <Check label="Active only" checked={activeOnly} onChange={setActiveOnly} />
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Spinner label="Loading…" /> : 'Apply'}
          </Button>
          <div className="spacer" />
          <Button variant="outline" onClick={()=>setUpload(true)}>Upload freight rates</Button>
          <Button variant="outline" disabled={loading} onClick={()=>setPreferences(true)}>Carrier preferences / upload</Button>
          <Button variant="default" className="primary" onClick={() => setEditing({ id: null, draft: structuredClone(EMPTY) })}>
            New freight tariff
          </Button>
        </div>

        <div style={{overflowX: 'auto'}}><Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead><TableHead>Rate code</TableHead>
              <TableHead>Charge codes</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Lane</TableHead>
              <TableHead>Carrier</TableHead><TableHead>Preferred</TableHead><TableHead>Priority</TableHead><TableHead>Quota</TableHead>
              <TableHead>Cntr type</TableHead>
              <TableHead>Rate type</TableHead>
              <TableHead>Ocean classification</TableHead>
              <TableHead>Ocean service</TableHead>
              <TableHead>T/S port</TableHead>
              <TableHead>Inland routing</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead className="num">Cost by size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}><TableCell>{r.id}</TableCell>
                <TableCell>
                  <strong>{r.rateCode}</strong> <Badge variant="secondary" className="tag muted">{r.recordType}</Badge>
                </TableCell>
                <TableCell>{r.charges.map(c => c.code).join(", ")}</TableCell><TableCell>{MODE_LABELS[r.mode]}</TableCell>
                <TableCell>
                  <PortName value={r.portOfLoading} /> → <PortName value={r.portOfDestination} />
                  {r.tradelaneCode && <Badge variant="secondary" className="tag muted" style={{ marginLeft: 6 }}>{r.tradelaneCode}</Badge>}
                </TableCell>
                <TableCell>{r.carrier ?? '—'}{r.carrierCode && <div className="text-xs text-muted-foreground">{r.mode === 'Air' ? 'IATA' : 'SCAC'}: {r.carrierCode}</div>}</TableCell><TableCell>{r.preferred ? 'Yes' : 'No'}</TableCell><TableCell>{r.priority}</TableCell><TableCell>{r.quota ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="tag">{r.containerType}</Badge>
                </TableCell>
                <TableCell>
                  <span className={`tag ${r.rateType === 'NAC' ? '' : 'muted'}`}>{r.rateType}</span>
                </TableCell>
                <TableCell className="small">
                  {r.mode === 'Air' ? '—' : <>{r.direction ?? '—'} · {r.chargeType ?? '—'}<div className="muted">{r.cargoType ?? '—'} · {r.accountType ?? '—'} · {r.rateApplyBy ?? '—'}</div></>}
                </TableCell>
                <TableCell>{r.mode === 'Air' ? '—' : r.oceanService ?? '—'}</TableCell>
                <TableCell>{r.mode === 'Air' || r.oceanService === 'Direct' ? '—' : <PortName value={r.tsPort ?? '—'} />}</TableCell>
                <TableCell>{r.mode === 'Air' ? '—' : r.inlandRouting ?? '—'}</TableCell>
                <TableCell className="small muted">
                  {r.validFrom} → {r.validTo}
                </TableCell>
                <TableCell className="num small">
                  {r.availableSizes.length > 0 ? (
                    r.availableSizes.map((s) => (
                      <div key={s}>
                        <span className="muted">{s}</span> {money(r.totalCostBySize[s], r.currency)}
                      </div>
                    ))
                  ) : (
                    <div>
                      {money(r.totalCostBase ?? 0, r.currency)}
                      <div className="muted">{UNIT_LABELS[r.unit]}</div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`tag ${r.isActive ? 'good' : 'muted'}`}>
                    {r.validTo < today() ? 'Archived' : r.validFrom > today() ? 'Upcoming' : r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" className="link" onClick={() => startEdit(r)}>
                    Edit
                  </Button>
                  <Button variant="destructive" className="link danger" onClick={() => void remove(r)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={19} className="muted">
                  No cost rates match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table></div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Showing {rows.length} of {total} rates.
        </p>
      </Card>

      {upload && <RateUpload kinds={mode==='Air'?['Air','SeaFcl','SeaLcl']:mode==='SeaLcl'?['SeaLcl','SeaFcl','Air']:['SeaFcl','SeaLcl','Air']} onClose={()=>setUpload(false)} onSaved={message=>{setUpload(false);setNotice(message);void load();}} />}
      {preferences && <CarrierPreferences rates={rows} onClose={()=>setPreferences(false)} onSaved={()=>{setPreferences(false);void load();}} />}
      {editing && (
        <CostEditor
          id={editing.id}
          draft={editing.draft}
          lookups={lookups}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </>
  );
}

export function CostEditor({
  id,
  draft,
  lookups,
  onCancel,
  onSaved,
  onSubmitRate,
  title,
}: Readonly<{
  id: number | null;
  draft: CostRateInput;
  lookups: Lookups | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
  onSubmitRate?: (rate: CostRateInput) => Promise<void>;
  title?: string;
}>) {
  const [form, setForm] = useState<CostRateInput>(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const set = <K extends keyof CostRateInput>(key: K, value: CostRateInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const dropdown = (category: string, fallback: readonly string[]) =>
    lookups?.dropdownOptions?.[category] ?? fallback.map(value => ({ value, label: value }));

  const setCharge = (index: number, patch: Partial<CostCharge>) =>
    setForm((f) => ({
      ...f,
      charges: f.charges.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const usesSizes = form.mode === 'SeaFcl';

  const sizeTotals = SIZE_KEYS.map((key) => {
    const amounts = form.charges.map((c) => c[key]);
    return amounts.some((a) => a !== null && a !== undefined)
      ? amounts.reduce<number>((sum, a) => sum + (Number(a) || 0), 0)
      : null;
  });

  const baseTotal = form.charges.reduce<number>((sum, c) => sum + (Number(c.amountBase) || 0), 0);

  async function save() {
    if (form.recordType === 'RFQ' && !form.accountId?.trim()) {
      setError('RFQ rates require an account ID.');
      return;
    }
    if (form.recordType === 'RFQ' && !form.salesforceOpportunityId?.trim()) {
      setError('RFQ rates require a Salesforce opportunity ID.');
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      if (onSubmitRate) await onSubmitRate(form);
      else if (id === null) await api.createCost(form);
      else await api.updateCost(id, form);
      await onSaved();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fieldErrors);
      } else {
        setError(e instanceof Error ? e.message : 'Save failed.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={title ?? (id === null ? 'New freight tariff' : `Edit ${form.rateCode}`)}
      onClose={() => { if (!saving) onCancel(); }}
      footer={
        <>
          <span className="spacer" />
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="default" className="primary" onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner label="Saving…" /> : onSubmitRate ? 'Save rate & mark ready' : 'Save rate'}
          </Button>
        </>
      }
    >
      {error && <div className="banner error">{error}</div>}
      {Object.entries(fieldErrors).map(([key, messages]) => (
        <div key={key} className="banner warn">
          <strong>{key}:</strong> {messages.join(' ')}
        </div>
      ))}

      <div className="form-grid">
        <Field label="Rate code">
          <Input value={form.rateCode} onChange={(e) => set('rateCode', e.target.value)} />
        </Field>
        <Field label="Mode">
          <select
            value={form.mode}
            onChange={(e) => {
              const mode = e.target.value as TransportMode;
              const first = (lookups?.containerTypes ?? []).find((c) => c.mode === mode);
              setForm((f) => ({ ...f, mode, containerType: first?.code ?? f.containerType }));
            }}
          >
            {(Object.keys(MODE_LABELS) as TransportMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Carrier">
          <Input value={form.carrier ?? ''} onChange={(e) => set('carrier', e.target.value || null)} />
        </Field>
        <Field label="Agent">
          <Input value={form.agent ?? ''} onChange={(e) => set('agent', e.target.value || null)} />
        </Field>

        <Field label="Origin country">
          <CountryInput value={form.originCountry} onChange={value => set('originCountry', value)} required />
        </Field>
        <Field label="Port of receipt"><PortInput field="PortOfReceipt" mode={form.mode} value={form.portOfReceipt ?? ''} country={form.originCountry} onChange={value => set('portOfReceipt', value || null)} /></Field>
        <Field label="Port of loading">
          <PortInput mode={form.mode} value={form.portOfLoading} country={form.originCountry} onChange={value => set('portOfLoading', value)} required />
        </Field>
        <Field label="Destination country">
          <CountryInput value={form.destCountry} onChange={value => set('destCountry', value)} required />
        </Field>
        <Field label="Port of discharge"><PortInput mode={form.mode} value={form.portOfDischarge ?? ''} country={form.destCountry} onChange={value => set('portOfDischarge', value || null)} /></Field>
        <Field label="Port of destination">
          <PortInput mode={form.mode} value={form.portOfDestination} country={form.destCountry} onChange={value => set('portOfDestination', value)} required />
        </Field>

        <Field label="Trade lane" hint="e.g. TRANSPACIFIC, EUROPE, ISC">
          <Input
            value={form.tradelaneCode ?? ''}
            onChange={(e) => set('tradelaneCode', e.target.value || null)}
          />
        </Field>
        <Field label="Record type">
          <select value={form.recordType} onChange={e => set('recordType', e.target.value as 'General' | 'RFQ')}>
            <option value="General">General</option><option value="RFQ">RFQ</option>
          </select>
        </Field>
        <Field label="Rate type">
          <select value={form.rateType} onChange={(e) => set('rateType', e.target.value)}>
            {dropdown('rate_type', RATE_TYPE_OPTIONS).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        {form.mode !== 'Air' && <>
          <Field label="Export / import"><select value={form.direction ?? ''} onChange={e => set('direction', e.target.value || null)}><option value="">Not set</option>{dropdown('direction', DIRECTION_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Charge type"><select value={form.chargeType ?? ''} onChange={e => set('chargeType', e.target.value || null)}><option value="">Not set</option>{dropdown('charge_type', CHARGE_TYPE_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Cargo type"><select value={form.cargoType ?? ''} onChange={e => set('cargoType', e.target.value || null)}><option value="">Not set</option>{dropdown('cargo_type', CARGO_TYPE_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Account type"><select value={form.accountType ?? ''} onChange={e => set('accountType', e.target.value || null)}><option value="">Not set</option>{dropdown('account_type', ACCOUNT_TYPE_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Rate apply by"><select value={form.rateApplyBy ?? ''} onChange={e => set('rateApplyBy', e.target.value || null)}><option value="">Not set</option>{dropdown('rate_apply_by', RATE_APPLY_BY_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Ocean service"><select value={form.oceanService ?? ''} onChange={e => setForm(f => ({ ...f, oceanService: e.target.value || null, tsPort: e.target.value === 'Direct' ? null : f.tsPort }))}><option value="">Not set</option>{dropdown('ocean_service', OCEAN_SERVICE_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="T/S port"><PortInput mode={form.mode} value={form.tsPort ?? ''} disabled={form.oceanService === 'Direct'} onChange={value => set('tsPort', value || null)} /></Field>
          <Field label="Inland routing"><select value={form.inlandRouting ?? ''} onChange={e => set('inlandRouting', e.target.value || null)}><option value="">Not set</option>{dropdown('inland_routing', INLAND_ROUTING_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        </>}
        <Field label="Account ID" hint={form.recordType === 'RFQ' ? 'Required for RFQ rates' : 'Required for NAC rates'}>
          <Input
            required={form.recordType === 'RFQ' || form.rateType === 'NAC'}
            value={form.accountId ?? ''}
            onChange={(e) => set('accountId', e.target.value || null)}
          />
        </Field>
        <Field label="Salesforce opportunity ID" hint={form.recordType === 'RFQ' ? 'Required for RFQ rates' : 'Optional for general rates'}>
          <Input required={form.recordType === 'RFQ'} maxLength={80} value={form.salesforceOpportunityId ?? ''} onChange={e => set('salesforceOpportunityId', e.target.value || null)} placeholder="Salesforce opportunity ID" />
        </Field>
        <Field label="Container type" hint="CNTR TYPE, e.g. DC, RF, OT, FR">
          <select
            value={form.containerType}
            onChange={(e) => set('containerType', e.target.value)}
          >
            {(lookups?.containerTypes ?? [])
              .filter((c) => c.mode === form.mode)
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Charge unit">
          <select value={form.unit} onChange={(e) => set('unit', e.target.value as CostRateInput['unit'])}>
            {dropdown('freight_uom', Object.keys(UNIT_LABELS)).map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Currency">
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
            {dropdown('currency', CURRENCY_OPTIONS).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Valid from">
          <Input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
        </Field>
        <Field label="Valid to">
          <Input type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} />
        </Field>

        <Check label="Preferred carrier" checked={form.preferred} onChange={(v) => set('preferred', v)} />
        <Field label="Quota (containers)" hint="Allocation for this rate’s validity period; blank = unspecified, 0 = unavailable">
          <Input type="number" min="0" step="1" value={form.quota ?? ''} onChange={(e) => set('quota', e.target.value === '' ? null : Number(e.target.value))} />
        </Field>
        <Field label="Transit time (days)">
          <Input
            type="number"
            value={form.transitTimeDays ?? ''}
            onChange={(e) => set('transitTimeDays', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Priority" hint="1 is the first choice, then 2, 3…">
          <Input
            type="number"
            value={form.priority}
            onChange={(e) => set('priority', Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="cost-remark">Remark</label>
        <Textarea
          id="cost-remark"
          rows={2}
          value={form.remark ?? ''}
          onChange={(e) => set('remark', e.target.value || null)}
        />
      </div>

      {!onSubmitRate && <Check label="Active" checked={form.isActive} onChange={(v) => set('isActive', v)} />}

      <h3 style={{ marginTop: 18 }}>Selling price (optional)</h3>
      <p className="small muted">Enter the final selling price per unit in {form.currency}, including any charges you want to sell. A saved price is used as-is; leave it blank to calculate the price using pricing rules. Quantity multiplies this price.</p>
      <div className="form-grid">
        {(usesSizes ? (['sell20', 'sell40', 'sell40H', 'sell45'] as const) : (['sellBase'] as const)).map((key, index) => <Field key={key} label={usesSizes ? `Sell / ${SIZE_LABELS[index]} container` : `Sell / ${UNIT_LABELS[form.unit]}`}>
          <Input type="number" min={0} max={9999999} step="0.01" value={form[key] ?? ''} placeholder="Use pricing rules" onChange={e => set(key, e.target.value === '' ? null : Number(e.target.value))} />
        </Field>)}
      </div>

      <h3 style={{ marginTop: 18 }}>Charge components</h3>
      <p className="small muted" style={{ marginTop: -4 }}>
        {usesSizes
          ? 'Leave a size blank when the carrier does not offer it on this lane.'
          : 'Amounts are quoted per cbm / kg for this mode.'}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Charge code</TableHead>
            <TableHead>Description</TableHead>
            {usesSizes ? (
              SIZE_LABELS.map((s) => (
                <TableHead key={s} className="num">
                  {s}
                </TableHead>
              ))
            ) : (
              <TableHead className="num">Amount</TableHead>
            )}
            <TableHead>Mand.</TableHead>
            <TableHead>Markup</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {form.charges.map((c, i) => (
            <TableRow key={c.id ?? `new-${i}`}>
              <TableCell>
                <Input
                  value={c.code}
                  style={{ width: 80 }}
                  onChange={(e) => setCharge(i, { code: e.target.value.toUpperCase() })}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={c.name}
                  style={{ width: '100%', minWidth: 160 }}
                  onChange={(e) => setCharge(i, { name: e.target.value })}
                />
              </TableCell>
              {usesSizes ? (
                SIZE_KEYS.map((key) => (
                  <TableCell key={key} className="num">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="—"
                      value={c[key] ?? ''}
                      style={{ width: 90, textAlign: 'right' }}
                      onChange={(e) =>
                        setCharge(i, { [key]: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                  </TableCell>
                ))
              ) : (
                <TableCell className="num">
                  <Input
                    type="number"
                    step="0.01"
                    value={c.amountBase ?? ''}
                    style={{ width: 110, textAlign: 'right' }}
                    onChange={(e) =>
                      setCharge(i, { amountBase: e.target.value === '' ? null : Number(e.target.value) })
                    }
                  />
                </TableCell>
              )}
              <TableCell>
                <input
                  type="checkbox"
                  checked={c.isMandatory}
                  onChange={(e) => setCharge(i, { isMandatory: e.target.checked })}
                />
              </TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  checked={c.isMarkupable}
                  onChange={(e) => setCharge(i, { isMarkupable: e.target.checked })}
                />
              </TableCell>
              <TableCell>
                <Button variant="destructive"
                  className="link danger"
                  onClick={() => setForm((f) => ({ ...f, charges: f.charges.filter((_, x) => x !== i) }))}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead colSpan={2}>Total cost</TableHead>
            {usesSizes ? (
              sizeTotals.map((t, i) => (
                <TableHead key={SIZE_KEYS[i]} className="num">
                  {t === null ? '—' : money(t, form.currency)}
                </TableHead>
              ))
            ) : (
              <TableHead className="num">{money(baseTotal, form.currency)}</TableHead>
            )}
            <TableHead colSpan={3} />
          </TableRow>
        </TableFooter>
      </Table>

      <div className="row" style={{ marginTop: 10 }}>
        <Button variant="outline" onClick={() => setForm((f) => ({ ...f, charges: [...f.charges, { ...EMPTY_CHARGE }] }))}>
          Add charge line
        </Button>
      </div>
    </Modal>
  );
}
