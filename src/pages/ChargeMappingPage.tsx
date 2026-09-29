import { useEffect, useState } from 'react';
import { chargeMappings, type ChargeMapping } from '../api/client';
const blank = (): ChargeMapping => ({id:0,importTemplate:'OCEAN_EXTRACT_V1',rateType:'SeaFcl',carrierCode:null,sourceChargeName:'',itemCode:'',itemName:'',isActive:true,revision:0});
export default function ChargeMappingPage() {
  const [rows,setRows]=useState<ChargeMapping[]>([]);
  const [draft,setDraft]=useState<ChargeMapping>(blank);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [history,setHistory]=useState<Awaited<ReturnType<typeof chargeMappings.history>>>([]);
  const load=()=>chargeMappings.list().then(setRows);
  useEffect(()=>{load().catch(e=>setError(e.message));},[]);
  return <section className="page"><h1>Charge mapping</h1>
    <p>Map Excel charge headings to item codes. Carrier overrides take priority over general mappings. Changes apply to mapped imports and failed retries; successful imports stay unchanged.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setNotice('');try {await chargeMappings.save(draft);await load();setDraft(blank());setHistory([]);setNotice('Mapping saved.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
      <h2>{draft.id ? 'Edit mapping' : 'Add mapping'}</h2>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
        <label>Import template<input required maxLength={80} value={draft.importTemplate} onChange={e=>setDraft({...draft,importTemplate:e.target.value})}/></label>
        <label>Import type<select value={draft.rateType} onChange={e=>setDraft({...draft,rateType:e.target.value,carrierCode:null})}>{['SeaFcl','SeaLcl','Air','Customs','Trucking','CrossBorder'].map(k=><option key={k}>{k}</option>)}</select></label>
        <label>Carrier code (blank = general)<input maxLength={50} disabled={!['SeaFcl','SeaLcl','Air'].includes(draft.rateType)} value={draft.carrierCode||''} onChange={e=>setDraft({...draft,carrierCode:e.target.value||null})}/></label>
        <label>Excel charge heading<input required maxLength={160} value={draft.sourceChargeName} onChange={e=>setDraft({...draft,sourceChargeName:e.target.value})}/></label>
        <label>Item code<input required maxLength={40} value={draft.itemCode} onChange={e=>setDraft({...draft,itemCode:e.target.value})}/></label>
        <label>Item name<input required maxLength={120} value={draft.itemName} onChange={e=>setDraft({...draft,itemName:e.target.value})}/></label>
        <label><input type="checkbox" checked={draft.isActive} onChange={e=>setDraft({...draft,isActive:e.target.checked})}/> Active</label>
        <button disabled={busy} type="submit">{busy?'Saving…':'Save mapping'}</button><button type="button" onClick={()=>{setDraft(blank());setHistory([]);setError('');}}>New / cancel</button>
      </div>
    </form>
    <div style={{overflowX:'auto',marginTop:20}}><table><thead><tr>{['Template','Type','Carrier','Excel heading','Item code','Item name','Active','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.importTemplate}</td><td>{r.rateType}</td><td>{r.carrierCode||'General'}</td><td>{r.sourceChargeName}</td><td>{r.itemCode}</td><td>{r.itemName}</td><td>{r.isActive?'Yes':'No'}</td><td><button onClick={()=>{setDraft({...r});setHistory([]);setNotice('');}}>Edit</button> <button onClick={async()=>{try{setHistory(await chargeMappings.history(r.id));setNotice(`History for ${r.sourceChargeName}`);}catch(e){setError((e as Error).message);}}}>History</button></td></tr>)}</tbody></table></div>
    {history.map(h=><details key={h.id}><summary>{h.changedAtUtc} — {h.changedBy}</summary><pre style={{whiteSpace:'pre-wrap'}}>Before: {h.beforeJson||'(new mapping)'}{'\n'}After: {h.afterJson}</pre></details>)}
  </section>;
}
