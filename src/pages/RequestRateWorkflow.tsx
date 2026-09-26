import { Spinner } from '../components/ui';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { CostRateInput, Lookups, PricingRequest, PricingRequestWork } from '../api/types';
import { CostEditor, EMPTY } from './CostsPage';
import { addMonths, money, today } from '../lib/format';

export default function RequestRateWorkflow({ request, onSave, disabled }: { request: PricingRequest; onSave: (work: PricingRequestWork) => void; disabled: boolean }) {
  const [details, setDetails] = useState<Awaited<ReturnType<typeof api.requestRateDetails>> | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [editing, setEditing] = useState<CostRateInput | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    Promise.all([api.requestRateDetails(request.id), api.lookups()]).then(([d, l]) => {
      if (live) { setDetails(d); setLookups(l); }
    }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [request.id, request.revision]);
  function edit() {
    if (!details) return;
    if (details.rate) { setEditing(structuredClone(details.rate)); return; }
    const s = details.search;
    const date = s?.shipmentDate || today();
    setEditing({ ...structuredClone(EMPTY), rateCode: `PR-${request.reference.slice(-24)}-${request.id.split(':')[1]}`.slice(0, 40),
      mode: s?.mode || 'SeaFcl', originCountry: s?.originCountry || '', portOfLoading: s?.portOfLoading || '',
      destCountry: s?.destCountry || '', portOfDestination: s?.portOfDestination || '',
      carrier: s?.carrier || null, tradelaneCode: s?.tradelaneCode || null,
      recordType: request.opportunityType === 'RFQ' ? 'RFQ' : 'General',
      customerCode: request.customerCode || s?.customerCode || null, rateType: (request.customerCode || s?.customerCode) ? 'NAC' : 'FAK',
      containerType: s?.containerType || (s?.mode === 'Air' ? 'AIR' : s?.mode === 'SeaLcl' ? 'LCL' : 'DC'),
      unit: s?.mode === 'Air' ? 'PerKg' : s?.mode === 'SeaLcl' ? 'PerCbm' : 'PerContainer',
      validFrom: date, validTo: addMonths(date, 3), remark: `Pricing request ${request.reference}`,
      charges: [{ ...EMPTY.charges[0], code: 'FREIGHT', name: 'Freight' }] });
  }
  return <section className="request-rate-workflow">
    <h2>Rate setup</h2>
    <p className="muted">Add buying costs and an optional selling price. Saving marks this request Ready.</p>
    {error && <div role="alert" className="banner error">{error}</div>}
    {loading ? <p><Spinner label="Loading rate setup…" /></p> : details && <>
      <div className="card"><h3>Buying rate & selling price</h3>
        {details.rate ? <p><strong>{details.rate.rateCode}</strong><br />{details.rate.portOfLoading} → {details.rate.portOfDestination}<br />
          {details.rate.availableSizes.length ? details.rate.availableSizes.map(size => <span key={size}>{size}: {money(details.rate!.totalCostBySize[size], details.rate!.currency)} · </span>) : money(details.rate.totalCostBase || 0, details.rate.currency)}
          <br /><span className="muted">Valid {details.rate.validFrom} to {details.rate.validTo}</span></p> : <p className="muted">Add the carrier's buying rate for this request.</p>}
        <button className="primary" disabled={disabled} onClick={edit}>{details.rate ? 'Edit rate & price' : 'Add rate & price'}</button>
        {details.rate && <p className="small muted">{details.rate.availableSizes.length ? details.rate.availableSizes.map(size => {
          const key = ({ '20': 'sell20', '40': 'sell40', '40H': 'sell40H', '45': 'sell45' } as const)[size as '20' | '40' | '40H' | '45'];
          const value = key ? details.rate![key] : null;
          return <span key={size}>{size} selling price: {value == null ? 'Use pricing rules' : money(value, details.rate!.currency)}<br /></span>;
        }) : <>Selling price: {details.rate.sellBase == null ? 'Use pricing rules' : money(details.rate.sellBase, details.rate.currency)}</>}</p>}
      </div>
    </>}
    {disabled && <p className="banner warn">Save your status or notes changes before setting up the rate.</p>}
    {editing && <CostEditor id={details?.rate?.id ?? null} title={`Rate & price · ${request.reference}`} draft={editing} lookups={lookups} onCancel={() => setEditing(null)} onSubmitRate={async rate => { onSave(await api.saveRequestBuyingRate(request.id, request.revision, rate)); }} onSaved={() => setEditing(null)} />}
  </section>;
}
