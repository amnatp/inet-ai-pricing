import { PortName, PortInput } from '../components/Ports';
import { CountryInput, useCountryName } from '../components/Countries';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from 'react';
import { ApiError, api, serviceApi } from '../api/client';
import type { Lookups } from '../api/types';
import { Field, Modal, Spinner } from '../components/ui';
import limits from './serviceRateFields.json';
import { today, addMonths } from '../lib/format';
import RateUpload from '../components/RateUpload';
import { CARGO_TYPE_OPTIONS, CHARGE_TYPE_OPTIONS, CONTAINER_TYPE_OPTIONS, CURRENCY_OPTIONS, DIRECTION_OPTIONS, RATE_TYPE_OPTIONS, SERVICE_UOM_OPTIONS } from '../lib/rateOptions';
export type ServiceRate = { id: number; revision: number; type: string; recordType: string; rateType: string; chargeType: string; validFrom: string; validTo: string; isActive: boolean } & Record<string, string | number | boolean | null>;
const label = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).replace('Uom', 'unit').replace('Account Id', 'Account ID').replace('Salesforce Opportunity Id', 'Salesforce opportunity ID');
const names: Record<string, string> = { Customs: 'Customs', Trucking: 'Trucking', CrossBorder: 'X-border' };
const msg = (e: unknown) => e instanceof Error ? e.message : 'Request failed.';
export default function ServiceRatesPage({ category, archiveOnly = false }: { category: 'customs' | 'transport'; archiveOnly?: boolean }) {
 const countryName = useCountryName();
 const [rows, setRows] = useState<ServiceRate[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1);
 const [search, setSearch] = useState(''), [type, setType] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false);
 const [validity,setValidity]=useState(archiveOnly ? 'archive' : 'current');
 const [upload,setUpload]=useState(false),[notice,setNotice]=useState('');
 const [editing, setEditing] = useState<ServiceRate | null>(null);
 const [lookups, setLookups] = useState<Lookups | null>(null);
 async function load() { setLoading(true); setError(''); try { const data = await serviceApi.list(category, type, search, page, validity); setRows(data.items); setTotal(data.total); } catch(e) { setError(msg(e)); } finally { setLoading(false); } }
 useEffect(() => { void load(); }, [category, type, page, validity]);
 useEffect(() => { void api.lookups().then(setLookups).catch(() => setLookups(null)); }, []);
 const money = (r: ServiceRate, side: string) => r[`${side}Amount`] == null ? 'Not set' : `${r[`${side}Currency`]} ${r[`${side}Amount`]} / ${r[`${side}Uom`]}`;
 return <><h1>{archiveOnly ? (category === 'customs' ? 'Archived customs rates' : 'Archived transport rates') : category === 'customs' ? 'Customs tariffs' : 'Transport tariffs'}</h1><p className="subtitle">{category === 'customs' ? 'Customs clearance and related service charges.' : 'Trucking and cross-border charges in one table, grouped by type.'} Each row is one charge; buying cost and selling price retain their own currency, minimum and unit.</p>
 {notice && <div className="banner info">{notice}</div>}
 {error && <div role="alert" className="banner error">{error}</div>}
 <Card className="card"><form className="toolbar" onSubmit={e => { e.preventDefault(); if (page !== 1) setPage(1); else void load(); }}>
 {!archiveOnly && <Field label="Validity view"><select value={validity} onChange={e=>{setValidity(e.target.value);setPage(1);}}><option value="current">Current rates</option><option value="upcoming">Upcoming rates</option><option value="archive">Archive (expired)</option><option value="all">All rates</option></select></Field>}
 <Field label="Search"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Charge, vendor, account or route" /></Field>
 {category === 'transport' && <Field label="Type"><select value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">All transport</option><option value="Trucking">Trucking</option><option value="CrossBorder">X-border</option></select></Field>}
 <Button variant="outline" disabled={loading}>{loading ? <Spinner label="Loading…" /> : 'Search / refresh'}</Button><span className="spacer" /><Button variant="outline" type="button" onClick={()=>setUpload(true)}>Upload rates</Button><Button variant="default" type="button" className="primary" onClick={() => setEditing({ id: 0, revision: 0, type: category === 'customs' ? 'Customs' : type || 'Trucking', recordType: 'General', rateType: 'FAK', chargeType: 'Mandatory', validFrom: today(), validTo: addMonths(today(), 3), isActive: true, owner: 'WICEBKK', costCurrency: 'THB', costUom: 'PER SHIPMENT' })}>Add charge rate</Button></form>
 <div style={{ overflowX: 'auto' }}><Table><TableHeader><TableRow>{['ID', 'Type', 'Vendor / agent', 'Route', 'Charge code', 'Charge', 'Buying cost', 'Selling price', 'Minimum cost / sell', 'Validity', 'Record', 'Status', 'Actions'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>
 {rows.map(r => <TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell><Badge variant="secondary" className="tag">{names[r.type]}</Badge></TableCell><TableCell>{r.vendor || '—'}</TableCell><TableCell>{r.originLocation || (r.portOfLoading ? <PortName value={r.portOfLoading}/> : countryName(r.originCountry) || '—')} → {r.destinationLocation || (r.portOfDestination ? <PortName value={r.portOfDestination}/> : countryName(r.destinationCountry) || (r.port ? <PortName value={r.port}/> : '—'))}</TableCell><TableCell>{r.chargeCode}</TableCell><TableCell>{r.chargeItem}<div className="muted">{r.chargeType}</div></TableCell><TableCell>{money(r, 'cost')}</TableCell><TableCell>{money(r, 'sell')}</TableCell><TableCell>{r.costMinimum ?? '—'} / {r.sellMinimum ?? '—'}</TableCell><TableCell>{r.validFrom}<br />{r.validTo}</TableCell><TableCell>{r.recordType}<div className="muted">{r.accountId || r.accountName || ''}</div></TableCell><TableCell>{r.validTo < today() ? 'Archived' : r.validFrom > today() ? 'Upcoming' : r.isActive ? 'Active' : 'Inactive'}</TableCell><TableCell><Button variant="outline" type="button" onClick={() => setEditing(structuredClone(r))}>Edit</Button> <Button variant="destructive" type="button" className="danger" onClick={async () => { if (!confirm('Delete this charge rate?')) return; try { await serviceApi.remove(r.id, r.revision); await load(); } catch(e) { setError(msg(e)); } }}>Delete</Button></TableCell></TableRow>)}
 {!loading && !rows.length && <TableRow><TableCell colSpan={13}>No charge rates found. Add a rate to get started.</TableCell></TableRow>}
 </TableBody></Table></div><div className="row" style={{ marginTop: 16 }}><span>{total} rates · Page {page}</span><span className="spacer" /><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Next</Button></div></Card>
 {upload && <RateUpload kinds={category==='customs'?['Customs']:['Trucking','CrossBorder']} onClose={()=>setUpload(false)} onSaved={message=>{setUpload(false);setNotice(message);void load();}} />}
 {editing && <Editor initial={editing} category={category} lookups={lookups} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />}</>;
}
function Editor({ initial, category, lookups, onClose, onSaved }: { initial: ServiceRate; category: string; lookups: Lookups | null; onClose: () => void; onSaved: () => Promise<void> }) {
 const [form, setForm] = useState(initial), [saving, setSaving] = useState(false), [error, setError] = useState('');
 const set = (key: string, value: string | number | boolean | null) => setForm(f => ({ ...f, [key]: value }));
 const values = (categoryName: string, fallback: readonly string[]) => lookups?.dropdownOptions?.[categoryName]?.map(x => x.value) ?? [...fallback];
 const input = (key: string, required = false) => <Field key={key} label={key === 'vendor' && category === 'customs' ? 'Agent' : label(key)}>{['port','portOfReceipt','portOfLoading','portOfDischarge','portOfDestination'].includes(key) ? <PortInput value={String(form[key] ?? '')} country={String((['portOfReceipt','portOfLoading'].includes(key)?form.originCountry:key==='port'?null:form.destinationCountry) ?? '')} onChange={value => set(key,value || null)} required={required} /> : key.endsWith('Country') ? <CountryInput required={required} value={String(form[key] ?? '')} onChange={value => set(key, value || null)} /> : <Input required={required} maxLength={limits[key as keyof typeof limits]} value={String(form[key] ?? '')} onChange={e => set(key, e.target.value || null)} />}</Field>;
 const select = (key: string, values: string[], required = false) => {
  const current = String(form[key] ?? '');
  const options = current && !values.includes(current) ? [current, ...values] : values;
  return <Field label={label(key)}><select required={required} value={current} onChange={e => set(key, e.target.value || null)}>{!required && <option value="">Not set</option>}{options.map(v => <option key={v} value={v}>{names[v] || v}</option>)}</select></Field>;
 };
 async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); setError(''); try { await serviceApi.save(form); await onSaved(); } catch(e) { setError(e instanceof ApiError ? `${e.message} ${Object.values(e.fieldErrors).flat().join(' ')}` : msg(e)); } finally { setSaving(false); } }
 const location = ['Country','Province','City','Location','Postcode'];
 return <Modal title={`${initial.id ? 'Edit' : 'Add'} ${category === 'customs' ? 'customs' : 'transport'} charge rate`} onClose={() => { if (!saving) onClose(); }}><form onSubmit={save}><fieldset disabled={saving} style={{ border: 0, padding: 0 }}>
 {error && <div className="banner error" role="alert">{error}</div>}
 <h2>Rate details</h2><div className="form-grid">{category === 'transport' && select('type', ['Trucking','CrossBorder'], true)}{input('owner', true)}{input('vendor')}{select('recordType', ['General','RFQ'], true)}{select('rateType', values('rate_type', RATE_TYPE_OPTIONS), true)}{input('accountId', form.recordType === 'RFQ' || form.rateType === 'NAC')}{input('accountName')}{input('salesforceOpportunityId', form.recordType === 'RFQ')}
 {['validFrom','validTo'].map(key => <Field key={key} label={label(key)}><Input type="date" required value={String(form[key])} onChange={e => set(key, e.target.value)} /></Field>)}</div>
 <h2 style={{ marginTop: 20 }}>Service and route</h2><div className="form-grid">
 {category === 'customs' ? <>{input('shippingLine')}{input('shipmentType')}{select('direction', values('direction', DIRECTION_OPTIONS))}{select('containerType', values('container_type', CONTAINER_TYPE_OPTIONS))}{['portOfReceipt','portOfLoading','portOfDischarge','portOfDestination','originCountry','destinationCountry'].map(k => input(k))}</> : <>{input('service')}{select('direction', values('direction', DIRECTION_OPTIONS))}{input('truckType')}{select('cargoType', values('cargo_type', CARGO_TYPE_OPTIONS))}{input('port')}{location.map(k => input(`origin${k}`, k === 'Country' && form.type === 'CrossBorder'))}{location.map(k => input(`destination${k}`, k === 'Country' && form.type === 'CrossBorder'))}<Field label="Fuel price reference"><Input type="number" min={0} step="0.01" value={String(form.fuelPrice ?? '')} onChange={e => set('fuelPrice', e.target.value === '' ? null : Number(e.target.value))} /></Field></>}
 </div><p className="small muted">For trucking, retain the port separately. Use origin and destination locations for domestic routes. Fuel price is a reference value; no fuel adjustment is calculated.</p>
 <h2>Charge</h2><p className="small muted">Leave charge code blank to derive it from the quotation template or charge name. Review inferred codes before use.</p><div className="form-grid">{input('chargeCode')}{input('chargeItem', true)}<Field label="Charge type"><select value={String(form.chargeType ?? '')} onChange={e => set('chargeType', e.target.value)}>{values('charge_type', CHARGE_TYPE_OPTIONS).map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></Field></div>
 {['cost','sell'].map(side => <section key={side} style={{ marginTop: 20 }}><h2>{side === 'cost' ? 'Buying cost' : 'Selling price'}</h2><div className="form-grid">{select(`${side}Currency`, values('currency', CURRENCY_OPTIONS), side === 'cost')}{['Minimum','Amount'].map(k => <Field key={k} label={k}><Input type="number" min={0} max={999999999} step="0.01" required={side === 'cost' && k === 'Amount'} value={String(form[side+k] ?? '')} onChange={e => set(side+k, e.target.value === '' ? null : Number(e.target.value))} /></Field>)}{select(`${side}Uom`, values('service_uom', SERVICE_UOM_OPTIONS), side === 'cost')}</div><Field label="Remark"><Textarea rows={2} maxLength={1000} value={String(form[`${side}Remark`] ?? '')} onChange={e => set(`${side}Remark`, e.target.value || null)} /></Field></section>)}
 <p className="small muted">Units can include shipment, container, container/day, or trip. These service tables store prices; freight inquiries do not calculate or add these charges yet.</p><label><input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} /> Active</label><div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button variant="default" className="primary" type="submit">{saving ? <Spinner label="Saving…" /> : 'Save charge rate'}</Button></div>
 </fieldset></form></Modal>;
}
