import { PortInput, usePortNames } from '../components/Ports';
import { CountryInput, useCountryName } from '../components/Countries';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { AccountTier, Lookups, MarkupType, PricingRule, PricingRuleInput, TransportMode } from '../api/types';
import { Check, Field, Modal, Spinner } from '../components/ui';
import { MARKUP_LABELS, MODE_LABELS } from '../lib/format';
import { CONTAINER_TYPE_OPTIONS, CURRENCY_OPTIONS } from '../lib/rateOptions';

const TIERS: AccountTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

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
  accountTier: null,
  accountId: null,
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

function conditionSummary(r: PricingRule, countryName: (value: unknown) => string, portName: (value: unknown) => string) {
  const parts: string[] = [];
  if (r.mode) parts.push(MODE_LABELS[r.mode]);
  if (r.originCountry) parts.push(`origin ${countryName(r.originCountry)}`);
  if (r.portOfLoading) parts.push(`POL ${portName(r.portOfLoading)}`);
  if (r.tradelaneCode) parts.push(`lane ${r.tradelaneCode}`);
  if (r.destCountry) parts.push(`dest ${countryName(r.destCountry)}`);
  if (r.portOfDestination) parts.push(`POD ${portName(r.portOfDestination)}`);
  if (r.accountTier) parts.push(`tier ${r.accountTier}`);
  if (r.accountId) parts.push(`account ${r.accountId}`);
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
  const countryName = useCountryName();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const portName=usePortNames(rules.flatMap(r=>[r.portOfLoading,r.portOfDestination]));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: number | null; draft: PricingRuleInput } | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);

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
    void api.lookups().then(setLookups).catch(() => setLookups(null));
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
        by specificity, so an account-specific rule beats a trade-lane rule. Fallback rules only fire when
        nothing else matched, and minimum-sell floors are always applied last.
      </p>

      {error && <div className="banner error">{error}</div>}

      <Card className="card">
        <div className="toolbar">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Spinner label="Loading…" /> : 'Refresh'}
          </Button>
          <div className="spacer" />
          <Button variant="default" className="primary" onClick={() => setEditing({ id: null, draft: { ...EMPTY } })}>
            New rule
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="num">Priority</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="num">Specificity</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="num mono">{r.priority}</TableCell>
                <TableCell>
                  <strong>{r.name}</strong>
                  {r.description && <div className="small muted">{r.description}</div>}
                </TableCell>
                <TableCell style={{ whiteSpace: 'normal', maxWidth: 320 }}>{conditionSummary(r, countryName, portName)}</TableCell>
                <TableCell>{actionSummary(r)}</TableCell>
                <TableCell className="num mono">{r.specificity}</TableCell>
                <TableCell>
                  {!r.isActive && <Badge variant="secondary" className="tag muted">Inactive</Badge>}{' '}
                  {r.isFallback && <Badge variant="secondary" className="tag warn">Fallback</Badge>}{' '}
                  {r.stopProcessing && <Badge variant="secondary" className="tag">Stops</Badge>}
                </TableCell>
                <TableCell>
                  <Button variant="ghost"
                    className="link"
                    onClick={() => {
                      const { id: _id, specificity: _s, updatedAtUtc: _u, ...draft } = r;
                      setEditing({ id: r.id, draft });
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="destructive" className="link danger" onClick={() => void remove(r)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="muted">
                  No rules yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {editing && (
        <RuleEditor
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

function RuleEditor({
  id,
  draft,
  lookups,
  onCancel,
  onSaved,
}: {
  id: number | null;
  draft: PricingRuleInput;
  lookups: Lookups | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<PricingRuleInput>(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const set = <K extends keyof PricingRuleInput>(key: K, value: PricingRuleInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const options = (category: string, fallback: readonly string[]) =>
    lookups?.dropdownOptions?.[category] ?? fallback.map(value => ({ value, label: value }));

  const text = (key: keyof PricingRuleInput) => (
    <Input
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
      onClose={() => { if (!saving) onCancel(); }}
      footer={
        <>
          <span className="spacer" />
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="default" className="primary" onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner label="Saving…" /> : 'Save rule'}
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

      <section className="rule-section">
      <h3>Rule details</h3>
      <p className="small muted">Name the rule and set when it applies. Lower priority numbers run first.</p>
      <div className="rule-details-grid">
        <Field label="Rule name">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Priority" hint="Lower runs first">
          <Input
            type="number"
            value={form.priority}
            onChange={(e) => set('priority', Number(e.target.value))}
          />
        </Field>
        <Field label="Effective from">
          <Input
            type="date"
            value={form.effectiveFrom ?? ''}
            onChange={(e) => set('effectiveFrom', e.target.value || null)}
          />
        </Field>
        <Field label="Effective to">
          <Input
            type="date"
            value={form.effectiveTo ?? ''}
            onChange={(e) => set('effectiveTo', e.target.value || null)}
          />
        </Field>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="rule-description">Description</label>
        <Textarea
          id="rule-description"
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value || null)}
        />
      </div>

      </section>
      <section className="rule-section">
      <h3>Conditions</h3>
      <p className="small muted">
        Leave a condition blank to match anything.
      </p>
      <div className="rule-fields-grid">
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
        <Field label="Origin country"><CountryInput value={form.originCountry ?? ''} onChange={value => set('originCountry', value || null)} /></Field>
        <Field label="Port of loading"><PortInput value={form.portOfLoading ?? ''} country={form.originCountry} onChange={value=>set('portOfLoading',value||null)}/></Field>
        <Field label="Trade lane">{text('tradelaneCode')}</Field>
        <Field label="Destination country"><CountryInput value={form.destCountry ?? ''} onChange={value => set('destCountry', value || null)} /></Field>
        <Field label="Port of destination"><PortInput value={form.portOfDestination ?? ''} country={form.destCountry} onChange={value=>set('portOfDestination',value||null)}/></Field>
        <Field label="Account tier">
          <select
            value={form.accountTier ?? ''}
            onChange={(e) => set('accountTier', (e.target.value || null) as AccountTier | null)}
          >
            <option value="">Any</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account ID">{text('accountId')}</Field>
        <Field label="Container type">
          <select value={form.containerType ?? ''} onChange={(e) => set('containerType', e.target.value || null)}>
            <option value="">Any</option>
            {options('container_type', CONTAINER_TYPE_OPTIONS).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Container size" hint="20, 40, 40H or 45">{text('containerSize')}</Field>
        <Field label="Carrier">{text('carrier')}</Field>
        <Field label="Commodity">{text('commodity')}</Field>
      </div>

      </section>
      <section className="rule-section">
      <h3>Markup</h3>
      <p className="small muted">Choose how the selling price is calculated and set optional limits.</p>
      <div className="rule-fields-grid">
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
          <Input
            type="number"
            step="0.01"
            value={form.markupValue}
            onChange={(e) => set('markupValue', Number(e.target.value))}
          />
        </Field>
        <Field label="Currency" hint="Blank uses the rate currency">
          <select value={form.currency ?? ''} onChange={(e) => set('currency', e.target.value || null)}>
            <option value="">Use rate currency</option>
            {options('currency', CURRENCY_OPTIONS).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Min markup" hint="Clamp, per unit">
          <Input
            type="number"
            step="0.01"
            value={form.minMarkup ?? ''}
            onChange={(e) => set('minMarkup', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Max markup" hint="Clamp, per unit">
          <Input
            type="number"
            step="0.01"
            value={form.maxMarkup ?? ''}
            onChange={(e) => set('maxMarkup', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </div>

      </section>
      <section className="rule-section">
      <h3>Rule behavior</h3>
      <div className="rule-behavior">
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
      </section>
    </Modal>
  );
}
