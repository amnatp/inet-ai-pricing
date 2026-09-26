import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useState } from 'react';
import { rateImportApi } from '../api/client';
import { Field, Modal, Spinner } from './ui';
export type UploadKind = 'SeaFcl' | 'SeaLcl' | 'Air' | 'Customs' | 'Trucking' | 'CrossBorder';
export interface RateImportPreview {
 token:string; expiresAtUtc:string; created:number;updated:number;
 rows:{line:number;action:string;key:string;type:string;carrier:string|null;origin:string|null;destination:string|null;chargeCode:string;charge:string;cost:number|null;costBySize?:Record<string,number|null>|null;priceBySize?:Record<string,number|null>|null;costCurrency:string;costUnit:string;price:number|null;priceCurrency:string|null;priceUnit:string|null;validFrom:string;validTo:string;recordType:string;customerCode:string|null;details:unknown}[];
}
const names:Record<UploadKind,string>={SeaFcl:'Sea FCL',SeaLcl:'Sea LCL',Air:'Air freight',Customs:'Customs',Trucking:'Trucking',CrossBorder:'Cross-border'};
export default function RateUpload({kinds,onClose,onSaved}:{kinds:UploadKind[];onClose:()=>void;onSaved:(message:string)=>void}) {
 const [kind,setKind]=useState<UploadKind>(kinds[0]);const [preview,setPreview]=useState<RateImportPreview|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [filename,setFilename]=useState('');
 const message=(e:unknown)=>e instanceof Error?e.message:'Upload failed.';
 async function upload(file:File) {
  setBusy(true);setPreview(null);setError('');setFilename(file.name);
  try {setPreview(await rateImportApi.preview(kind,file));}catch(e){setError(message(e));}finally{setBusy(false);}
 }
 async function download(existing:boolean) {setError('');try{await rateImportApi.download(kind,existing);}catch(e){setError(message(e));}}
 async function save() {
  if(!preview)return;setBusy(true);setError('');
  try {const result=await rateImportApi.commit(preview.token);onSaved(`Upload saved: ${result.created} created, ${result.updated} updated.`);}
  catch(e){setError(message(e));setPreview(null);}finally{setBusy(false);}
 }
 return <Modal title="Upload rate records" onClose={()=>{if(!busy)onClose();}}>
  <div className="toolbar"><Field label="Service type"><select aria-label="Upload service type" disabled={busy} value={kind} onChange={e=>{setKind(e.target.value as UploadKind);setPreview(null);setError('');setFilename('');}}>{kinds.map(k=><option key={k} value={k}>{names[k]}</option>)}</select></Field>
   <Button variant="outline" disabled={busy} onClick={()=>void download(false)}>Download blank template</Button><Button variant="outline" disabled={busy} onClick={()=>void download(true)}>Download existing rates</Button>
  </div>
  <p>Use the template headers. Upload CSV or the first sheet of an XLSX workbook (up to 5 MB / 5,000 rows). Dates must be yyyy-mm-dd or Excel dates. Use numeric amounts without currency symbols and Yes/No flags.</p>
  {['Air','SeaFcl','SeaLcl'].includes(kind)?<p className="small muted">One row per charge. Repeat Id, RateCode and identical rate details for each charge. Leave Id blank to insert a new rate with a unique RateCode; supply an existing Id to update matching charges and retain other charges. Download existing rates to obtain IDs. {kind==='SeaFcl'?"Use Cost20, Cost40, Cost40H and Cost45 for charge costs by container size. At least one buying amount is required per charge. Sell20, Sell40, Sell40H and Sell45 are optional complete-rate selling prices per size.":`CostAmount is per ${kind==='Air'?'kg':'cbm'}. SellBase is the optional complete-rate selling price per ${kind==='Air'?'kg':'cbm'}.`} Repeat selling prices and rate details consistently across the rate’s charge rows.</p>:<p className="small muted">One row per charge rate. Leave Id blank to create a rate; use Id from Download existing rates to update it. Owner, ChargeCode, ChargeItem, validity dates, buying amount, currency and unit are required. RFQ requires customer code and Salesforce opportunity ID. Cross-border also requires both countries.</p>}
  <p className="small muted">Included blank optional cells clear those values; columns omitted from the file retain existing values on updates. New rates need all required details. Preview does not save anything.</p>
  <Field label="Choose file"><Input aria-label="Rate file" disabled={busy} type="file" accept=".csv,.xlsx" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}} /></Field>
  {error&&<div className="banner error" role="alert">{error}</div>}
  {busy&&<p><Spinner label="Processing…" /></p>}
  {preview&&<><p><strong>{filename}</strong> · {preview.created} new rates · {preview.updated} updates · {preview.rows.length} resulting charge lines</p>
  <div style={{maxHeight:'40vh',overflow:'auto'}}><Table><TableHeader><TableRow>{['Action / key','Route','Charge','Buying cost','Stored selling price','Validity','Details'].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>
   {preview.rows.map((r,i)=><TableRow key={i}><TableCell>{r.action} {r.key}<div className="small muted">{r.recordType} · {r.customerCode??'General'}</div></TableCell><TableCell>{r.origin??'—'} → {r.destination??'—'}<div className="small muted">{r.carrier}</div></TableCell><TableCell>{r.chargeCode}<div>{r.charge}</div></TableCell><TableCell>{r.costBySize?['20','40','40H','45'].map(size=>[size,r.costBySize![size]] as const).map(([size,cost])=><div key={size}>{size}: {cost==null?'Not offered':`${r.costCurrency} ${cost}`}</div>):`${r.costCurrency} ${r.cost} / ${r.costUnit}`}</TableCell><TableCell>{r.priceBySize?['20','40','40H','45'].map(size=>[size,r.priceBySize![size]] as const).filter(([size])=>r.costBySize?.[size]!=null).map(([size,price])=><div key={size}>{size}: {price==null?'Use pricing rules':`${r.priceCurrency} ${price} (package)`}</div>):r.price==null?'Use pricing rules':`${r.priceCurrency} ${r.price} / ${r.priceUnit}`}</TableCell><TableCell>{r.validFrom}<br/>{r.validTo}</TableCell><TableCell><details><summary>All fields</summary><pre style={{maxWidth:400,whiteSpace:'pre-wrap'}}>{JSON.stringify(r.details,null,2)}</pre></details></TableCell></TableRow>)}
  </TableBody></Table></div><p className="small muted">Review every change. Saving applies the entire batch. Preview expires after 30 minutes or an API restart.</p></>}
  <div className="toolbar" style={{marginTop:16}}><div className="spacer"/><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="default" className="primary" disabled={busy||!preview} onClick={()=>void save()}>Confirm and save rates</Button></div>
 </Modal>;
}
