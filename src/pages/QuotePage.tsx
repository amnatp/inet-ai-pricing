import { PortName } from '../components/Ports';
import { useCountryName } from '../components/Countries';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import type {
  Account,
  Lookups,
  QuoteOption,
  QuoteRequest,
  QuoteResponse,
  TransportMode,
} from '../api/types';
import { Check, Field, Modal, Spinner } from '../components/ui';
import { MODE_LABELS, UNIT_LABELS, money, today } from '../lib/format';

const INITIAL: QuoteRequest = {
  mode: 'SeaFcl',
  originCountry: null,
  portOfLoading: null,
  destCountry: null,
  portOfDestination: null,
  accountId: null,
  containerType: null,
  containerSize: null,
  quantity: 1,
  shipmentDate: today(),
  includeOptionalCharges: false,
  requestedBy: 'rate-inquiry',
};

export default function QuotePage() {
  const countryName = useCountryName();
  const [form, setForm] = useState<QuoteRequest>(INITIAL);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [result, setResult] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; email: string; isDemo: boolean } | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [contact, setContact] = useState<Contact>({ requesterEmail: '', notes: '', search: INITIAL });
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    void api.currentUser().then(setUser).catch(() => setUserError('Could not load your account email. Sign in and reload this page.'));
    void api.pricingEmailStatus().then((s) => { setEmailEnabled(s.enabled); setDemo(s.mode === 'demo'); }).catch(() => setEmailEnabled(null));
    void (async () => {
      try {
        const [l, c] = await Promise.all([api.lookups(), api.accounts()]);
        setLookups(l);
        setAccounts(c);
      } catch {
        // Reference data is optional; the form still works with free text.
      }
    })();
  }, []);

  const set = <K extends keyof QuoteRequest>(key: K, value: QuoteRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const modeContainerTypes = (lookups?.containerTypes ?? []).filter((c) => c.mode === form.mode);
  const usesSizes = form.mode === 'SeaFcl';

  // Container type is mode-specific and sizes only exist for FCL, so reset both on a mode change.
  function changeMode(mode: TransportMode) {
    const stillValid = (lookups?.containerTypes ?? []).some(
      (c) => c.mode === mode && c.code === form.containerType,
    );
    setForm((f) => ({
      ...f,
      mode,
      containerType: stillValid ? f.containerType : null,
      containerSize: mode === 'SeaFcl' ? f.containerSize : null,
    }));
  }

  async function run() {
    if (!user) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setContact({ requesterEmail: user.email, notes: notes.trim(), search: { ...form } });
      setResult(await api.quote({ ...form, quantity: Number(form.quantity) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rate search failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Rate inquiry</h1>
      <p className="subtitle">
        Search freight rates and ask the pricing team for a better offer.
        If no rates match, you can submit a price request to the pricing team.
      </p>

      {demo && <div className="banner info" role="status">Demo mode: pricing requests are saved locally. No emails are sent.</div>}

      {emailEnabled === false && <div className="banner warn" role="status">
        Email delivery is not configured yet. You can search rates, but requests cannot be emailed until an administrator sets up pricing-team email delivery.
      </div>}

      {error && <div className="banner error">{error}</div>}
      {userError && <div className="banner error" role="alert">{userError}</div>}

      <form className="card" onSubmit={(e) => { e.preventDefault(); if (!loading) void run(); }}>
        <div className="form-grid">
          <Field label="Mode">
            <select value={form.mode} onChange={(e) => changeMode(e.target.value as TransportMode)}>
              {(Object.keys(MODE_LABELS) as TransportMode[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Origin country">
            <select
              value={form.originCountry ?? ''}
              onChange={(e) => set('originCountry', e.target.value || null)}
            >
              <option value="">Any</option>{lookups?.originCountries.map(c => <option key={c} value={c}>{countryName(c)}</option>)}
            </select>
          </Field>
          <Field label="Port of loading">
            <select
              value={form.portOfLoading ?? ''}
              onChange={(e) => set('portOfLoading', e.target.value || null)}
            >
              <option value="">Any</option>{lookups?.portsOfLoading.map(p=><option key={p} value={p}><PortName value={p}/></option>)}
            </select>
          </Field>
          <Field label="Destination country">
            <select
              value={form.destCountry ?? ''}
              onChange={(e) => set('destCountry', e.target.value || null)}
            >
              <option value="">Any</option>{lookups?.destCountries.map(c => <option key={c} value={c}>{countryName(c)}</option>)}
            </select>
          </Field>
          <Field label="Port of destination">
            <select
              value={form.portOfDestination ?? ''}
              onChange={(e) => set('portOfDestination', e.target.value || null)}
            >
              <option value="">Any</option>{lookups?.portsOfDestination.map(p=><option key={p} value={p}><PortName value={p}/></option>)}
            </select>
          </Field>
          <Field label="Trade lane">
            <Input
              value={form.tradelaneCode ?? ''}
              placeholder="Resolved automatically"
              onChange={(e) => set('tradelaneCode', e.target.value || null)}
            />
          </Field>
          <Field label="Account">
            <select
              value={form.accountId ?? ''}
              onChange={(e) => set('accountId', e.target.value || null)}
            >
              <option value="">No account (spot)</option>
              {accounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {account.accountName} — {account.tier}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Container type" hint="CNTR TYPE on the rate sheet">
            <select
              value={form.containerType ?? ''}
              onChange={(e) => set('containerType', e.target.value || null)}
            >
              <option value="">Any</option>
              {modeContainerTypes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Container size"
            hint={usesSizes ? 'Blank prices every published size' : 'Not applicable for this mode'}
          >
            <select
              value={form.containerSize ?? ''}
              disabled={!usesSizes}
              onChange={(e) => set('containerSize', e.target.value || null)}
            >
              <option value="">All sizes</option>
              {(lookups?.containerSizes ?? []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity" hint="Containers, cbm or kg">
            <Input
              type="number"
              min={0.001}
              step="0.001"
              value={form.quantity}
              onChange={(e) => set('quantity', Number(e.target.value))}
            />
          </Field>
          <Field label="Shipment date">
            <Input
              type="date"
              value={form.shipmentDate ?? ''}
              onChange={(e) => set('shipmentDate', e.target.value || null)}
            />
          </Field>
        </div>

        <div className="inquiry-contact" style={{ marginTop: 14 }}>
          <Field label="Requester" hint={user?.isDemo ? 'Demo user profile. Login integration is pending.' : 'Email is taken automatically from your signed-in account.'}>
            <div className="small" style={{ padding: '8px 0' }}>{user ? <><strong>{user.name}</strong><br />{user.email}</> : userError ? 'Account unavailable' : <Spinner label="Loading your account…" />}</div>
          </Field>
          <Field label="Request notes (optional)" hint="Target price, timing, or special requirements.">
            <Textarea rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <Check
            label="Include optional charges"
            checked={form.includeOptionalCharges ?? false}
            onChange={(v) => set('includeOptionalCharges', v)}
          />
          <div className="spacer" />
          <Button variant="outline" type="button" disabled={loading} onClick={() => { setForm({ ...INITIAL, shipmentDate: today() }); setResult(null); setError(null); setNotes(''); }}>Reset</Button>
          <Button variant="default" className="primary" type="submit" disabled={loading || !user}>
            {loading ? <Spinner label="Searching…" /> : 'Search rates'}
          </Button>
        </div>
      </form>

      {result && <QuoteResult key={result.reference} result={result} contact={contact} demo={demo} />}
    </>
  );
}

type Contact = { requesterEmail: string; notes: string; search: QuoteRequest };

function QuoteResult({ result, contact, demo }: { result: QuoteResponse; contact: Contact; demo: boolean }) {
  return (
    <>
      <Card className="card">
        <div className="row">
          <div>
            <h2 style={{ marginBottom: 2 }}>Rate inquiry {result.reference}</h2>
            <span className="small muted">
              {result.options.length} option(s)
              {result.resolvedTradelaneCode && ` · lane ${result.resolvedTradelaneCode}`}
              {result.resolvedAccountName &&
                ` · ${result.resolvedAccountName} (${result.resolvedAccountTier})`}
            </span>
          </div>
        </div>
        {result.messages.map((m, i) => (
          <div key={i} className="banner info" style={{ marginTop: 12, marginBottom: 0 }}>
            {m}
          </div>
        ))}
      </Card>

      {result.options.length === 0 && <Card className="card">
        <h2>No matching rates found</h2>
        <p className="small muted">Would you like to request a price from the pricing team for this shipment?</p>
        <RateRequestAction reference={result.reference} contact={contact} demo={demo} />
      </Card>}

      {result.options.map((o) => (
        <OptionCard key={`${o.costRateId}:${o.containerSize}`} option={o} best={o.recommended} reference={result.reference} contact={contact} demo={demo} />
      ))}
    </>
  );
}

function OptionCard({ option: o, best, reference, contact, demo }: { option: QuoteOption; best: boolean; reference: string; contact: Contact; demo: boolean }) {
  return (
    <div className={`option${best ? ' best' : ''}`}>
      <div className="option-head">
        <div>
          <h3 style={{ marginBottom: 4 }}>
            {o.rateCode} {best && <Badge variant="secondary" className="tag">Recommended</Badge>}{' '}
            <Badge variant="secondary" className="tag muted">{o.rateType}</Badge>{' '}
            <Badge variant="secondary" className="tag">
              {o.containerType}
              {o.containerSize ? ` · ${o.containerSize}` : ''}
            </Badge>
          </h3>
          <div className="small muted">
            {o.carrier ?? 'Any carrier'} · priority {o.priority} · quota {o.quota ?? 'unspecified'} containers · <PortName value={o.portOfLoading}/> → <PortName value={o.portOfDestination}/> ·{' '}
            {o.transitTimeDays ? `${o.transitTimeDays} days` : 'transit n/a'} · valid to {o.validTo}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="price">
            {money(o.totalSell, o.currency)}
            <small>
              {money(o.unitSell, o.currency)} {UNIT_LABELS[o.unit]} × {o.quantity}
            </small>
          </div>
          <span className={`tag ${o.marginPercent >= 10 ? 'good' : o.marginPercent > 0 ? 'warn' : 'bad'}`}>
            margin {o.marginPercent}% · {money(o.totalMarkup, o.currency)}
          </span>
        </div>
      </div>

      {o.warnings.map((w, i) => (
        <div key={i} className="banner warn" style={{ marginTop: 12, marginBottom: 0 }}>
          {w}
        </div>
      ))}

      <div className="split">
        <div>
          <h3>Cost breakdown</h3>
          <Table>
            <TableBody>
              {o.costBreakdown.map((c) => (
                <TableRow key={c.code}>
                  <TableCell>
                    {c.name}
                    {!c.isMarkupable && <Badge variant="secondary" className="tag muted" style={{ marginLeft: 6 }}>pass-through</Badge>}
                  </TableCell>
                  <TableCell className="num">{money(c.unitCost, o.currency)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <strong>Total cost</strong>
                </TableCell>
                <TableCell className="num">
                  <strong>{money(o.unitCost, o.currency)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div>
          <h3>{o.priceSource === 'Rate' ? 'Selling price' : 'Applied rules'}</h3>
          <Table>
            <TableBody>
              {o.appliedRules.map((r) => (
                <TableRow key={r.ruleId}>
                  <TableCell style={{ whiteSpace: 'normal' }}>
                    <strong>{r.ruleName}</strong>
                    <div className="small muted">{r.explanation}</div>
                  </TableCell>
                  <TableCell className="num">{money(r.amountApplied, o.currency)}</TableCell>
                </TableRow>
              ))}
              {o.appliedRules.length === 0 && (
                <TableRow>
                  <TableCell className="muted">{o.priceSource === 'Rate' ? 'Saved selling price from rate record. Pricing rules are not applied.' : 'No rules matched.'}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>
                  <strong>Unit sell</strong>
                </TableCell>
                <TableCell className="num">
                  <strong>{money(o.unitSell, o.currency)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <RateRequestAction reference={reference} option={o} contact={contact} demo={demo} />
      </div>
    </div>
  );
}

function RateRequestAction({ reference, option, contact, demo }: {
  reference: string; option?: QuoteOption; contact: Contact; demo: boolean;
}) {
  const countryName = useCountryName();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(contact.notes);
  const [estimatedContainers, setEstimatedContainers] = useState('');
  const [accountId, setAccountId] = useState(contact.search.accountId ?? '');
  const [opportunityType, setOpportunityType] = useState<'GeneralOpportunity' | 'RFQ'>('GeneralOpportunity');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const delivery = await api.requestRate({ quoteReference: reference, costRateId: option?.costRateId,
        containerSize: option?.containerSize, notes: notes.trim(),
        estimatedContainers: estimatedContainers ? Number(estimatedContainers) : undefined,
        accountId: accountId.trim() || undefined, opportunityType });
      setDeliveryMessage(delivery.message);
      setSent(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The email could not be sent. Please try again.');
      setCanRetry(!(e instanceof ApiError && (e.status === 409 || e.message.includes('could not be confirmed'))));
    } finally { setSending(false); }
  }

  return <>
    <div aria-live="polite">
      {sent && <div className="banner success" role="status">{deliveryMessage}</div>}
      {sending && <p className="small muted" role="status">{demo ? 'Recording your demo request…' : 'Emailing your request to the pricing team…'}</p>}
      {error && !open && <div className="banner error" role="alert">{error}</div>}
    </div>
    {!sent && !sending && canRetry && <Button variant={!option ? "default" : "outline"} type="button"
      onClick={() => setOpen(true)}>
      {option ? 'Request better rate' : 'Request a price'}
    </Button>}
    {open && <Modal title={option ? "Request better rate" : "Request a price"} onClose={() => { if (!sending) setOpen(false); }}>
      {option ? <>
        <p className="small muted">{option.carrier} · <PortName value={option.portOfLoading}/> → <PortName value={option.portOfDestination}/> · {option.containerType} {option.containerSize}</p>
        <p className="small">Current total: {money(option.totalSell, option.currency)}.</p>
      </> : <div className="banner info">
        <strong>{MODE_LABELS[contact.search.mode]}</strong><br />
        {countryName(contact.search.originCountry) || 'Any origin'} / <PortName value={contact.search.portOfLoading || 'Any port'}/> → {countryName(contact.search.destCountry) || 'Any destination'} / <PortName value={contact.search.portOfDestination || 'Any port'}/><br />
        Quantity: {contact.search.quantity} · Shipment date: {contact.search.shipmentDate || 'Search date'}<br />
        Equipment: {contact.search.containerType || 'Any'} {contact.search.containerSize || ''}
      </div>}
      <p className="small">Submitting creates a pricing request with the original search details, your contact information, and the notes below.
        {demo ? ' This is a demo request; no email will be sent.' : ' The pricing team will also be notified by email.'}</p>
      <form onSubmit={(e) => { e.preventDefault(); if (!sending && canRetry) void send(); }}>
        <fieldset disabled={sending} className="opportunity-type">
          <legend>Request type</legend>
          <label><input type="radio" name="opportunityType" value="GeneralOpportunity" checked={opportunityType === 'GeneralOpportunity'} onChange={() => setOpportunityType('GeneralOpportunity')} /> General opportunity</label>
          <label><input type="radio" name="opportunityType" value="RFQ" checked={opportunityType === 'RFQ'} onChange={() => setOpportunityType('RFQ')} /> RFQ</label>
        </fieldset>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <Field label="Estimated volume (containers)" hint="Total expected container volume for this opportunity.">
            <Input type="number" min={1} max={1000000} step={1} required={contact.search.mode === 'SeaFcl'} disabled={sending} value={estimatedContainers} onChange={e => setEstimatedContainers(e.target.value)} placeholder="e.g. 100" />
          </Field>
          <Field label="Account ID" hint="Leave blank for an opportunity without an account ID.">
            <Input maxLength={40} disabled={sending} value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="e.g. C-1001" />
          </Field>
        </div>
        <Field label="Reply email" hint="Automatically provided by your user profile."><Input type="email" readOnly value={contact.requesterEmail} /></Field>
        <div style={{ marginTop: 12 }}><Field label="Request notes (optional)">
          <Textarea rows={3} maxLength={2000} value={notes} disabled={sending} onChange={(e) => setNotes(e.target.value)} placeholder="Target price or special requirements" />
        </Field></div>
        {error && <div className="banner error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <Button variant="outline" type="button" disabled={sending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="default" type="submit" className="primary" disabled={sending || !canRetry}>{sending ? <Spinner label="Submitting…" /> : 'Submit request'}</Button>
        </div>
      </form>
    </Modal>}
  </>;
}
