import { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { CustomerTier, MarkupType, PricingRule, PricingRuleInput, TransportMode } from '../api/types';
import { Check, Field, Modal } from '../components/ui';
import { MARKUP_LABELS, MODE_LABELS } from '../lib/format';

const TIERS: CustomerTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

const EMPTY: PricingRuleInput = {
  name: '',
  description: null,
  priority: 100,
  isActive: true,
  stopProcessing: false,
  isFallback: false,
  effectiveFrom: null,
  effectiveTo: null,
  mode: null,
  originCountry: null,
  portOfLoading: null,
  destCountry: null,
  portOfDestination: null,
  tradelaneCode: null,
  customerTier: null,
  customerCode: null,
  containerType: null,
  containerSize: null,
  carrier: null,
  commodity: null,
  markupType: 'Percentage',
  markupValue: 10,
  currency: null,
  minMarkup: null,
  maxMarkup: null,
};

function conditionSummary(r: PricingRule) {
  const parts: string[] = [];
  if (r.mode) parts.push(MODE_LABELS[r.mode]);
  if (r.originCountry) parts.push(`origin ${r.originCountry}`);
  if (r.portOfLoading) parts.push(`POL ${r.portOfLoading}`);
  if (r.tradelaneCode) parts.push(`lane ${r.tradelaneCode}`);
  if (r.destCountry) parts.push(`dest ${r.destCountry}`);
  if (r.portOfDestination) parts.push(`POD ${r.portOfDestination}`);
  if (r.customerTier) parts.push(`tier ${r.customerTier}`);
  if (r.customerCode) parts.push(`customer ${r.customerCode}`);
  if (r.containerType) parts.push(`cntr type ${r.containerType}`);
  if (r.containerSize) parts.push(`size ${r.containerSize}`);
  if (r.carrier) parts.push(`carrier ${r.carrier}`);
  if (r.commodity) parts.push(`commodity ${r.commodity}`);
  return parts.length ? parts.join(' · ') : 'Any request';
}

function actionSummary(r: PricingRule) {
  switch (r.markupType) {
    case 'Percentage':
      return `+${r.markupValue}% on markupable cost`;
    case 'TargetMargin':
      return `gross up to ${r.markupValue}% margin`;
    case 'FixedPerUnit':
      return `+${r.markupValue} ${r.currency ?? ''} per unit`;
    case 'FlatPerShipment':
      return `+${r.markupValue} ${r.currency ?? ''} per shipment`;
    case 'MinimumSell':
      return `floor at ${r.markupValue} ${r.currency ?? ''} per unit`;
  }
}

export default function RulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: number | null; draft: PricingRuleInput } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRules(await api.listRules());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(rule: PricingRule) {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      await api.deleteRule(rule.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  }

  return (
    <>
      <h1>Pricing rules</h1>
      <p className="subtitle">
        Rules are evaluated from the lowest priority number upwards and their markups stack. Ties are broken
        by specificity, so a customer-specific rule beats a trade-lane rule. Fallback rules only fire when
        nothing else matched, and minimum-sell floors are always applied last.
      </p>

      {error && <div className="banner error">{error}</div>}

      <div className="card">
        <div className="toolbar">
          <button onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <div className="spacer" />
          <button className="primary" onClick={() => setEditing({ id: null, draft: { ...EMPTY } })}>
            New rule
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th className="num">Priority</th>
              <th>Rule</th>
              <th>Conditions</th>
              <th>Action</th>
              <th className="num">Specificity</th>
              <th>Flags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="num mono">{r.priority}</td>
                <td>
                  <strong>{r.name}</strong>
                  {r.description && <div className="small muted">{r.description}</div>}
                </td>
                <td style={{ whiteSpace: 'normal', maxWidth: 320 }}>{conditionSummary(r)}</td>
                <td>{actionSummary(r)}</td>
                <td className="num mono">{r.specificity}</td>
                <td>
                  {!r.isActive && <span className="tag muted">Inactive</span>}{' '}
                  {r.isFallback && <span className="tag warn">Fallback</span>}{' '}
                  {r.stopProcessing && <span className="tag">Stops</span>}
                </td>
                <td>
                  <button
                    className="link"
                    onClick={() => {
                      const { id: _id, specificity: _s, updatedAtUtc: _u, ...draft } = r;
                      setEditing({ id: r.id, draft });
                    }}
                  >
                    Edit
                  </button>
                  <button className="link danger" onClick={() => void remove(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="muted">
                  No rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <RuleEditor
          id={editing.id}
          draft={editing.draft}
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

function RuleEditor({
  id,
  draft,
  onCancel,
  onSaved,
}: {
  id: number | null;
  draft: PricingRuleInput;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<PricingRuleInput>(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const set = <K extends keyof PricingRuleInput>(key: K, value: PricingRuleInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const text = (key: keyof PricingRuleInput) => (
    <input
      value={(form[key] as string | null) ?? ''}
      onChange={(e) => set(key, (e.target.value || null) as PricingRuleInput[typeof key])}
    />
  );

  const isPercent = form.markupType === 'Percentage' || form.markupType === 'TargetMargin';

  async function save() {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      if (id === null) await api.createRule(form);
      else await api.updateRule(id, form);
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
      title={id === null ? 'New pricing rule' : `Edit rule`}
      onClose={onCancel}
      footer={
        <>
          <span className="spacer" />
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save rule'}
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
        <Field label="Rule name">
          <input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Priority" hint="Lower runs first">
          <input
            type="number"
            value={form.priority}
            onChange={(e) => set('priority', Number(e.target.value))}
          />
        </Field>
        <Field label="Effective from">
          <input
            type="date"
            value={form.effectiveFrom ?? ''}
            onChange={(e) => set('effectiveFrom', e.target.value || null)}
          />
        </Field>
        <Field label="Effective to">
          <input
            type="date"
            value={form.effectiveTo ?? ''}
            onChange={(e) => set('effectiveTo', e.target.value || null)}
          />
        </Field>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="rule-description">Description</label>
        <textarea
          id="rule-description"
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value || null)}
        />
      </div>

      <h3 style={{ marginTop: 18 }}>Conditions</h3>
      <p className="small muted" style={{ marginTop: -4 }}>
        Leave a condition blank to match anything.
      </p>
      <div className="grid">
        <Field label="Mode">
          <select
            value={form.mode ?? ''}
            onChange={(e) => set('mode', (e.target.value || null) as TransportMode | null)}
          >
            <option value="">Any</option>
            {(Object.keys(MODE_LABELS) as TransportMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Origin country">{text('originCountry')}</Field>
        <Field label="Port of loading">{text('portOfLoading')}</Field>
        <Field label="Trade lane">{text('tradelaneCode')}</Field>
        <Field label="Destination country">{text('destCountry')}</Field>
        <Field label="Port of destination">{text('portOfDestination')}</Field>
        <Field label="Customer tier">
          <select
            value={form.customerTier ?? ''}
            onChange={(e) => set('customerTier', (e.target.value || null) as CustomerTier | null)}
          >
            <option value="">Any</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer code">{text('customerCode')}</Field>
        <Field label="Container type" hint="DC, RF, OT, FR, TK, LCL, AIR">{text('containerType')}</Field>
        <Field label="Container size" hint="20, 40, 40H or 45">{text('containerSize')}</Field>
        <Field label="Carrier">{text('carrier')}</Field>
        <Field label="Commodity">{text('commodity')}</Field>
      </div>

      <h3 style={{ marginTop: 18 }}>Markup</h3>
      <div className="grid">
        <Field label="Markup type">
          <select
            value={form.markupType}
            onChange={(e) => set('markupType', e.target.value as MarkupType)}
          >
            {(Object.keys(MARKUP_LABELS) as MarkupType[]).map((m) => (
              <option key={m} value={m}>
                {MARKUP_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={isPercent ? 'Value (%)' : 'Value (amount)'}>
          <input
            type="number"
            step="0.01"
            value={form.markupValue}
            onChange={(e) => set('markupValue', Number(e.target.value))}
          />
        </Field>
        <Field label="Currency" hint="Blank uses the rate currency">
          <input
            value={form.currency ?? ''}
            maxLength={3}
            onChange={(e) => set('currency', e.target.value.toUpperCase() || null)}
          />
        </Field>
        <Field label="Min markup" hint="Clamp, per unit">
          <input
            type="number"
            step="0.01"
            value={form.minMarkup ?? ''}
            onChange={(e) => set('minMarkup', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Max markup" hint="Clamp, per unit">
          <input
            type="number"
            step="0.01"
            value={form.maxMarkup ?? ''}
            onChange={(e) => set('maxMarkup', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <Check label="Active" checked={form.isActive} onChange={(v) => set('isActive', v)} />
        <Check
          label="Fallback (only when no other rule matched)"
          checked={form.isFallback}
          onChange={(v) => set('isFallback', v)}
        />
        <Check
          label="Stop after this rule"
          checked={form.stopProcessing}
          onChange={(v) => set('stopProcessing', v)}
        />
      </div>
    </Modal>
  );
}
