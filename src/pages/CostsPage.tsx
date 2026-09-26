import { useEffect, useState } from 'react';
import CarrierPreferences from '../components/CarrierPreferences';
import RateUpload from '../components/RateUpload';
import { ApiError, api } from '../api/client';
import type { CostCharge, CostRate, CostRateInput, Lookups, TransportMode } from '../api/types';
import { Check, Field, Modal, Spinner } from '../components/ui';
import { MODE_LABELS, UNIT_LABELS, addMonths, money, today } from '../lib/format';

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
  customerCode: null,
  commodity: null,
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

export default function CostsPage() {
  const [validity,setValidity]=useState('current');
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
      const page = await api.listCosts({ mode, search, activeOnly, tradelane, validity, pageSize: 200 });
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
      <h1>Freight tariffs</h1>
      <p className="subtitle">
        Buying rates per lane and equipment. Sell prices are derived from these by the rules engine.
      </p>

      {notice && <div className="banner info">{notice}</div>}
      {error && <div className="banner error">{error}</div>}

      <div className="card">
        <div className="toolbar">
          <Field label="Validity view"><select value={validity} onChange={e=>setValidity(e.target.value)}><option value="current">Current rates</option><option value="upcoming">Upcoming rates</option><option value="archive">Archive (expired)</option><option value="all">All rates</option></select></Field>
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
          <Field label="Trade lane"><input value={tradelane} placeholder="e.g. TRANSPACIFIC" onChange={e=>setTradelane(e.target.value.toUpperCase())} /></Field>
          <Field label="Search">
            <input
              value={search}
              placeholder="Rate code, port or carrier"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
          </Field>
          <Check label="Active only" checked={activeOnly} onChange={setActiveOnly} />
          <button onClick={() => void load()} disabled={loading}>
            {loading ? <Spinner label="Loading…" /> : 'Apply'}
          </button>
          <div className="spacer" />
          <button onClick={()=>setUpload(true)}>Upload freight rates</button>
          <button disabled={loading} onClick={()=>setPreferences(true)}>Carrier preferences / upload</button>
          <button className="primary" onClick={() => setEditing({ id: null, draft: structuredClone(EMPTY) })}>
            New freight tariff
          </button>
        </div>

        <div style={{overflowX: 'auto'}}><table>
          <thead>
            <tr>
              <th>ID</th><th>Rate code</th>
              <th>Charge codes</th>
              <th>Mode</th>
              <th>Lane</th>
              <th>Carrier</th><th>Preferred</th><th>Priority</th><th>Quota</th>
              <th>Cntr type</th>
              <th>Rate type</th>
              <th>Validity</th>
              <th className="num">Cost by size</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.id}</td>
                <td>
                  <strong>{r.rateCode}</strong> <span className="tag muted">{r.recordType}</span>
                </td>
                <td>{r.charges.map(c => c.code).join(", ")}</td><td>{MODE_LABELS[r.mode]}</td>
                <td>
                  {r.portOfLoading} → {r.portOfDestination}
                  {r.tradelaneCode && <span className="tag muted" style={{ marginLeft: 6 }}>{r.tradelaneCode}</span>}
                </td>
                <td>{r.carrier ?? '—'}</td><td>{r.preferred ? 'Yes' : 'No'}</td><td>{r.priority}</td><td>{r.quota ?? '—'}</td>
                <td>
                  <span className="tag">{r.containerType}</span>
                </td>
                <td>
                  <span className={`tag ${r.rateType === 'NAC' ? '' : 'muted'}`}>{r.rateType}</span>
                </td>
                <td className="small muted">
                  {r.validFrom} → {r.validTo}
                </td>
                <td className="num small">
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
                </td>
                <td>
                  <span className={`tag ${r.isActive ? 'good' : 'muted'}`}>
                    {r.validTo < today() ? 'Archived' : r.validFrom > today() ? 'Upcoming' : r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="link" onClick={() => startEdit(r)}>
                    Edit
                  </button>
                  <button className="link danger" onClick={() => void remove(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={15} className="muted">
                  No cost rates match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table></div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Showing {rows.length} of {total} rates.
        </p>
      </div>

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
    if (form.recordType === 'RFQ' && !form.customerCode?.trim()) {
      setError('RFQ rates require a customer code.');
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
          <button onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="primary" onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner label="Saving…" /> : onSubmitRate ? 'Save rate & mark ready' : 'Save rate'}
          </button>
        </>
      }
    >
      {error && <div className="banner error">{error}</div>}
      {Object.entries(fieldErrors).map(([key, messages]) => (
        <div key={key} className="banner warn">
          <strong>{key}:</strong> {messages.join(' ')}
        </div>
      ))}

      <div className="grid">
        <Field label="Rate code">
          <input value={form.rateCode} onChange={(e) => set('rateCode', e.target.value)} />
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
          <input value={form.carrier ?? ''} onChange={(e) => set('carrier', e.target.value || null)} />
        </Field>
        <Field label="Agent">
          <input value={form.agent ?? ''} onChange={(e) => set('agent', e.target.value || null)} />
        </Field>

        <Field label="Origin country">
          <input value={form.originCountry} onChange={(e) => set('originCountry', e.target.value)} />
        </Field>
        <Field label="Port of loading">
          <input value={form.portOfLoading} onChange={(e) => set('portOfLoading', e.target.value)} />
        </Field>
        <Field label="Destination country">
          <input value={form.destCountry} onChange={(e) => set('destCountry', e.target.value)} />
        </Field>
        <Field label="Port of destination">
          <input
            value={form.portOfDestination}
            onChange={(e) => set('portOfDestination', e.target.value)}
          />
        </Field>

        <Field label="Trade lane" hint="e.g. TRANSPACIFIC, EUROPE, ISC">
          <input
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
            <option value="FAK">FAK</option>
            <option value="NAC">NAC</option>
          </select>
        </Field>
        <Field label="Customer code" hint={form.recordType === 'RFQ' ? 'Required for RFQ rates' : 'Required for NAC rates'}>
          <input
            required={form.recordType === 'RFQ' || form.rateType === 'NAC'}
            value={form.customerCode ?? ''}
            onChange={(e) => set('customerCode', e.target.value || null)}
          />
        </Field>
        <Field label="Salesforce opportunity ID" hint={form.recordType === 'RFQ' ? 'Required for RFQ rates' : 'Optional for general rates'}>
          <input required={form.recordType === 'RFQ'} maxLength={80} value={form.salesforceOpportunityId ?? ''} onChange={e => set('salesforceOpportunityId', e.target.value || null)} placeholder="Salesforce opportunity ID" />
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
            {(Object.keys(UNIT_LABELS) as (keyof typeof UNIT_LABELS)[]).map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Currency">
          <input
            value={form.currency}
            maxLength={3}
            onChange={(e) => set('currency', e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Valid from">
          <input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
        </Field>
        <Field label="Valid to">
          <input type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} />
        </Field>

        <Check label="Preferred carrier" checked={form.preferred} onChange={(v) => set('preferred', v)} />
        <Field label="Quota (containers)" hint="Allocation for this rate’s validity period; blank = unspecified, 0 = unavailable">
          <input type="number" min="0" step="1" value={form.quota ?? ''} onChange={(e) => set('quota', e.target.value === '' ? null : Number(e.target.value))} />
        </Field>
        <Field label="Transit time (days)">
          <input
            type="number"
            value={form.transitTimeDays ?? ''}
            onChange={(e) => set('transitTimeDays', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Priority" hint="1 is the first choice, then 2, 3…">
          <input
            type="number"
            value={form.priority}
            onChange={(e) => set('priority', Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="cost-remark">Remark</label>
        <textarea
          id="cost-remark"
          rows={2}
          value={form.remark ?? ''}
          onChange={(e) => set('remark', e.target.value || null)}
        />
      </div>

      {!onSubmitRate && <Check label="Active" checked={form.isActive} onChange={(v) => set('isActive', v)} />}

      <h3 style={{ marginTop: 18 }}>Selling price (optional)</h3>
      <p className="small muted">Enter the final selling price per unit in {form.currency}, including any charges you want to sell. A saved price is used as-is; leave it blank to calculate the price using pricing rules. Quantity multiplies this price.</p>
      <div className="grid">
        {(usesSizes ? (['sell20', 'sell40', 'sell40H', 'sell45'] as const) : (['sellBase'] as const)).map((key, index) => <Field key={key} label={usesSizes ? `Sell / ${SIZE_LABELS[index]} container` : `Sell / ${UNIT_LABELS[form.unit]}`}>
          <input type="number" min={0} max={9999999} step="0.01" value={form[key] ?? ''} placeholder="Use pricing rules" onChange={e => set(key, e.target.value === '' ? null : Number(e.target.value))} />
        </Field>)}
      </div>

      <h3 style={{ marginTop: 18 }}>Charge components</h3>
      <p className="small muted" style={{ marginTop: -4 }}>
        {usesSizes
          ? 'Leave a size blank when the carrier does not offer it on this lane.'
          : 'Amounts are quoted per cbm / kg for this mode.'}
      </p>
      <table>
        <thead>
          <tr>
            <th>Charge code</th>
            <th>Description</th>
            {usesSizes ? (
              SIZE_LABELS.map((s) => (
                <th key={s} className="num">
                  {s}
                </th>
              ))
            ) : (
              <th className="num">Amount</th>
            )}
            <th>Mand.</th>
            <th>Markup</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {form.charges.map((c, i) => (
            <tr key={c.id ?? `new-${i}`}>
              <td>
                <input
                  value={c.code}
                  style={{ width: 80 }}
                  onChange={(e) => setCharge(i, { code: e.target.value.toUpperCase() })}
                />
              </td>
              <td>
                <input
                  value={c.name}
                  style={{ width: '100%', minWidth: 160 }}
                  onChange={(e) => setCharge(i, { name: e.target.value })}
                />
              </td>
              {usesSizes ? (
                SIZE_KEYS.map((key) => (
                  <td key={key} className="num">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="—"
                      value={c[key] ?? ''}
                      style={{ width: 90, textAlign: 'right' }}
                      onChange={(e) =>
                        setCharge(i, { [key]: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                  </td>
                ))
              ) : (
                <td className="num">
                  <input
                    type="number"
                    step="0.01"
                    value={c.amountBase ?? ''}
                    style={{ width: 110, textAlign: 'right' }}
                    onChange={(e) =>
                      setCharge(i, { amountBase: e.target.value === '' ? null : Number(e.target.value) })
                    }
                  />
                </td>
              )}
              <td>
                <input
                  type="checkbox"
                  checked={c.isMandatory}
                  onChange={(e) => setCharge(i, { isMandatory: e.target.checked })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={c.isMarkupable}
                  onChange={(e) => setCharge(i, { isMarkupable: e.target.checked })}
                />
              </td>
              <td>
                <button
                  className="link danger"
                  onClick={() => setForm((f) => ({ ...f, charges: f.charges.filter((_, x) => x !== i) }))}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={2}>Total cost</th>
            {usesSizes ? (
              sizeTotals.map((t, i) => (
                <th key={SIZE_KEYS[i]} className="num">
                  {t === null ? '—' : money(t, form.currency)}
                </th>
              ))
            ) : (
              <th className="num">{money(baseTotal, form.currency)}</th>
            )}
            <th colSpan={3} />
          </tr>
        </tfoot>
      </table>

      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => setForm((f) => ({ ...f, charges: [...f.charges, { ...EMPTY_CHARGE }] }))}>
          Add charge line
        </button>
      </div>
    </Modal>
  );
}
