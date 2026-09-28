import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { PricingRequest, PricingRequestWork, RequestStatus } from '../api/types';
import RequestRateWorkflow from './RequestRateWorkflow';
import { Field, Spinner } from '../components/ui';

const labels: Record<RequestStatus, string> = { New: 'New', InProgress: 'In progress', Waiting: 'Waiting for rate', BuyingRateSet: 'Buying rate set', Ready: 'Ready', Resolved: 'Resolved', Closed: 'Closed' };
const date = (value: string) => new Date(value).toLocaleString();
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to load pricing requests.';

export default function PricingRequestsPage() {
  const [generation, setGeneration] = useState(0);
  const [requests, setRequests] = useState<PricingRequest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState('Open');
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const discard = () => !dirty || window.confirm('Discard unsaved changes to this request?');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    if (!discard()) return;
    setDirty(false);
    setLoading(true); setError('');
    try { setRequests(await api.pricingRequests()); setGeneration(g => g + 1); }
    catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visible = requests.filter(r => (status === 'All' || (status === 'Open' ? !['Resolved', 'Closed'].includes(r.status) : r.status === status)) &&
    `${r.reference} ${r.requesterEmail} ${r.subject} ${r.body} ${r.accountId ?? ""} ${r.opportunityType ?? ""} ${r.assignee}`.toLowerCase().includes(search.toLowerCase()));
  const current = requests.find(r => r.id === selected);
  return <section className="requests-page">
    <div className="row request-heading"><div><h1>Pricing requests</h1><p className="subtitle">Review inquiries, coordinate rates, and track the next step.</p></div><div className="spacer" /><Button variant="outline" onClick={() => void load()} disabled={loading}>{loading ? <Spinner label="Loading…" /> : 'Refresh queue'}</Button></div>
    <div className="request-stats">{(['New', 'InProgress', 'BuyingRateSet', 'Ready'] as RequestStatus[]).map(s => <Button variant="outline" key={s} className={status === s ? 'selected' : ''} onClick={() => setStatus(s)}><span>{labels[s]}</span><strong>{loading ? '—' : requests.filter(r => r.status === s).length}</strong></Button>)}</div>
    {error && <div role="alert" className="banner error">{error}</div>}
    <div className="request-layout">
      <Card className="card request-queue">
        <div className="toolbar"><Field label="Search requests"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Reference, route, requester, owner…" /></Field><Field label="Status"><select value={status} onChange={e => setStatus(e.target.value)}><option>Open</option><option>All</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div>
        <div className="request-count" aria-live="polite">{loading ? <Spinner label="Loading requests…" /> : `${visible.length} request${visible.length === 1 ? '' : 's'}`}</div>
        {!loading && !error && visible.length === 0 && <div className="request-empty"><h2>{requests.length ? 'No requests match your filters' : 'No pricing requests yet'}</h2><p>{requests.length ? 'Try another search or status.' : 'Requests from rate inquiries will appear here, including demo requests.'}</p>{!requests.length && <Link to="/rate-inquiry">Open rate inquiry →</Link>}</div>}
        <div className="request-list">{visible.map(r => <Button variant="outline" key={r.id} aria-pressed={selected === r.id} className={`request-item ${selected === r.id ? 'selected' : ''}`} onClick={() => { if (r.id !== selected && discard()) { setDirty(false); setSelected(r.id); } }}><div className="row"><strong>{r.reference}</strong><span className="spacer" /><span className={`tag ${r.status === 'Resolved' ? 'good' : r.status === 'Waiting' ? 'warn' : ''}`}>{labels[r.status]}</span></div><div className="request-reason">{r.subject.replace('[Rate inquiry] ', '').replace(` - ${r.reference}`, '')}</div><div className="muted">{r.requesterEmail}</div><div className="request-meta"><span>{r.assignee || 'Unassigned'}</span><time>{date(r.createdAtUtc)}</time></div></Button>)}</div>
      </Card>
      {current ? <RequestDetail key={`${current.id}:${current.revision}:${generation}`} request={current} onDirty={setDirty} onSave={work => setRequests(all => all.map(r => r.id === current.id ? { ...r, ...work } : r))} /> : <Card className="card request-empty"><span className="request-symbol" aria-hidden="true">↗</span><h2>Select a pricing request</h2><p>Review the shipment and selected rate, assign an owner, and record your progress.</p></Card>}
    </div>
  </section>;
}

function RequestDetail({ request, onSave, onDirty }: { request: PricingRequest; onDirty: (dirty: boolean) => void; onSave: (work: PricingRequestWork) => void }) {
  const [draft, setDraft] = useState<PricingRequestWork>(request);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dirty = draft.status !== request.status || draft.assignee !== request.assignee || draft.notes !== request.notes;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try { const result = await api.updatePricingRequest(request.id, draft); onSave(result); setSaved(true); }
    catch (e) { setError(message(e)); }
    finally { setSaving(false); }
  }
  return <Card className="card request-detail"><div className="row"><h2>{request.reference}</h2><span className="spacer" /><Badge variant="secondary" className="tag muted">Email: {request.emailStatus}</Badge></div>
    <p className="muted">Requested {date(request.createdAtUtc)}</p>
    {request.emailStatus === 'Demo' && <div className="banner info">Demo request. No email was sent.</div>}
    <div className="form-grid" style={{ marginBottom: 18 }}>
      <div><span className="muted">Request type</span><div>{request.opportunityType === 'RFQ' ? 'RFQ' : request.opportunityType ? 'General opportunity' : 'Not specified'}</div></div>
      <div><span className="muted">Estimated containers</span><div>{request.estimatedContainers ?? 'Not specified'}</div></div>
      <div><span className="muted">Account ID</span><div>{request.accountId || 'Not specified'}</div></div>
    </div>
    <details open><summary>Shipment & request details</summary><pre className="request-body">{request.body}</pre></details>
    <RequestRateWorkflow request={request} onSave={onSave} disabled={dirty} />
    <form onSubmit={save}><h2>Handle request</h2><div className="form-grid"><Field label="Status"><select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as RequestStatus })}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key} disabled={(key === "BuyingRateSet" || key === "Ready") && key !== request.status}>{label}</option>)}</select></Field><Field label="Assigned to"><Input maxLength={200} value={draft.assignee} placeholder="Team member name" onChange={e => setDraft({ ...draft, assignee: e.target.value })} /></Field></div>
      <Field label="Internal notes / rate response" hint="Saved for the pricing team. These notes are not emailed to the requester."><Textarea rows={6} maxLength={5000} placeholder="Carrier follow-up, proposed rate, validity, and next steps…" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></Field>
      {error && <div className="banner error" role="alert">{error}</div>}
      <div className="row"><span className="muted" role="status">{dirty ? 'Unsaved changes' : saved || request.updatedAtUtc ? 'Changes saved' : ''}</span><div className="spacer" /><Button variant="default" className="primary" disabled={saving || !dirty}>{saving ? <Spinner label="Saving…" /> : 'Save changes'}</Button></div>
    </form>
  </Card>;
}
