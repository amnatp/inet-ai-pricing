import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useState } from 'react';
import { api } from '../api/client';
import type { CostRate } from '../api/types';
import { Modal, Spinner } from './ui';

export interface PreferenceRow {
  rateCode: string; carrier: string | null; tradelaneCode: string | null;
  preferred: boolean; priority: number; quota: number | null; expectedUpdatedAtUtc: string;
}
export default function CarrierPreferences({ rates, onClose, onSaved }: { rates: CostRate[]; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<PreferenceRow[]>(rates.map(r => ({...r, expectedUpdatedAtUtc:r.updatedAtUtc})));
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const change=(index:number,values:Partial<PreferenceRow>)=>setRows(old=>old.map((r,i)=>i===index?{...r,...values}:r));
  async function upload(file:File) {
    setBusy(true);setError('');
    try {setRows(await api.previewPreferences(file));} catch(e){setError(e instanceof Error?e.message:'Upload failed');} finally{setBusy(false);}
  }
  async function save() {
    setBusy(true);setError('');
    try {await api.savePreferences(rows);onSaved();} catch(e){setError(e instanceof Error?e.message:'Save failed');} finally{setBusy(false);}
  }
  return <Modal title="Carrier recommendations and quota" onClose={onClose}>
    <p>Mark preferred carriers in each trade lane. Priority 1 is the first choice. Searches recommend up to three eligible preferred carriers; other rates remain available.</p>
    <p className="small muted">Quota is containers allocated for the rate’s validity period. Blank means unspecified; 0 excludes the rate from recommendations. This is planning capacity, not remaining booking inventory.</p>
    <div className="toolbar"><Button variant="outline" disabled={busy} onClick={()=>void api.downloadPreferences().catch(e=>setError(String(e)))}>Download upload template</Button>
      <label>Upload CSV / Excel <Input type="file" accept=".csv,.xlsx" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}} /></label>
    </div>
    <p className="small muted">Upload the first sheet with RateCode, Preferred, Priority and Quota headers. Upload replaces this preview; nothing is saved until you select Save. Blank Quota clears the allocation.</p>
    {error&&<div className="banner error">{error}</div>}
    <div style={{maxHeight:'50vh',overflow:'auto'}}><Table><TableHeader><TableRow><TableHead>Rate</TableHead><TableHead>Trade lane</TableHead><TableHead>Carrier</TableHead><TableHead>Preferred</TableHead><TableHead>Priority</TableHead><TableHead>Quota</TableHead></TableRow></TableHeader><TableBody>
      {rows.map((r,i)=><TableRow key={r.rateCode}><TableCell>{r.rateCode}</TableCell><TableCell>{r.tradelaneCode??'—'}</TableCell><TableCell>{r.carrier??'—'}</TableCell>
        <TableCell><input aria-label={`Preferred ${r.rateCode}`} type="checkbox" checked={r.preferred} onChange={e=>change(i,{preferred:e.target.checked})} /></TableCell>
        <TableCell><Input aria-label={`Priority ${r.rateCode}`} type="number" min={r.preferred?1:0} max={999} step={1} value={r.priority} onChange={e=>change(i,{priority:Number(e.target.value)})} style={{width:90}} /></TableCell>
        <TableCell><Input aria-label={`Quota ${r.rateCode}`} type="number" min={0} max={1000000} step={1} value={r.quota??''} onChange={e=>change(i,{quota:e.target.value===''?null:Number(e.target.value)})} style={{width:110}} /></TableCell></TableRow>)}
    </TableBody></Table></div>
    <div className="toolbar" style={{marginTop:16}}><span>{rows.length} rates in this preview</span><div className="spacer"/><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="default" className="primary" disabled={busy||!rows.length} onClick={()=>void save()}>{busy?<Spinner label="Working…" />:'Save preferences & quota'}</Button></div>
  </Modal>;
}
