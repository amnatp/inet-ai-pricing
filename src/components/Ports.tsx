import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { Input } from './ui/input';
export type Port = { code: string; name: string; countryCode: string; isSuggestion?:boolean; subdivision?: string | null };
const Context = createContext<{ names: Record<string,string>; ensure: (values: string[]) => void; remember: (ports: Port[]) => void }>({names:{},ensure:()=>{},remember:()=>{}});
export function PortProvider({ children }: { children: ReactNode }) {
 const [names,setNames]=useState<Record<string,string>>({}); const [error,setError]=useState('');
 const known=useRef(new Set<string>()); const queue=useRef(new Set<string>()); const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const remember=useCallback((ports:Port[])=>{ ports.forEach(p=>known.current.add(p.code)); setNames(old=>({...old,...Object.fromEntries(ports.map(p=>[p.code,p.name]))})); },[]);
 const ensure=useCallback((values:string[])=>{
  for(const value of values) {const code=value.trim().toUpperCase(); if(/^[A-Z]{2}[A-Z0-9]{3}$/.test(code)&&!known.current.has(code)) queue.current.add(code);}
  if(!queue.current.size||timer.current) return;
  timer.current=setTimeout(()=>{timer.current=null;const pending=[...queue.current];queue.current.clear();pending.forEach(c=>known.current.add(c));
   for(let i=0;i<pending.length;i+=100) void api.ports({codes:pending.slice(i,i+100).join(',')}).then(remember).catch(()=>setError('Port names could not be loaded. Refresh to try again.'));
  },0);
 },[remember]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;},[]);
 return <Context.Provider value={{names,ensure,remember}}>{error&&<div className="banner error" role="alert">{error}</div>}{children}</Context.Provider>;
}
export function usePortNames(values: unknown[]) {
 const {names,ensure}=useContext(Context); const keys=values.filter(v=>typeof v==='string').join('|');
 useEffect(()=>{ensure(keys.split('|'));},[keys,ensure]);
 return (value:unknown)=>{const text=String(value??'');return names[text.trim().toUpperCase()]??text;};
}
export function PortName({value}:{value:unknown}) { const label=usePortNames([value]);return <>{label(value)}</>; }
export function PortInput({value,onChange,country,mode,field,required=false,disabled=false,ariaLabel,allowAll=false}:{allowAll?:boolean;ariaLabel?:string;value:string;onChange:(v:string)=>void;country?:string|null;mode?:string|null;field?:string;required?:boolean;disabled?:boolean}) {
 const label=usePortNames([value]); const {remember}=useContext(Context); const [options,setOptions]=useState<Port[]>([]); const id=useId();
 const [error,setError]=useState(''); const display=label(value);
 useEffect(()=>{
  let active=true;
  if(disabled||display.trim().length<2) {setOptions([]);return;}
  const timer=setTimeout(()=>{void api.ports({search:display,country:country??undefined,mode:mode??undefined,field}).then(rows=>{if(active){setOptions(rows);remember(rows);setError('');}}).catch(()=>{if(active)setError('Could not search ports.');});},200);
  return ()=>{active=false;clearTimeout(timer);};
 },[display,country,mode,field,disabled,remember]);
 return <><Input aria-label={ariaLabel} list={id} value={display} required={required} disabled={disabled} placeholder={allowAll ? "ALL or location name / UN/LOCODE" : "Port name or UN/LOCODE"} onChange={e=>{const text=e.target.value; const selected=options.find(p=>`${p.name} (${p.code})`===text);onChange(selected?.code??text);}}/>
 <datalist id={id}>{allowAll&&<option value="ALL">All locations</option>}{options.map(p=><option key={p.code} value={`${p.name} (${p.code})`}>{p.isSuggestion?"Possible match · ":""}{p.countryCode}{p.subdivision?` · ${p.subdivision}`:''}</option>)}</datalist>{error&&<span role="alert" className="small">{error}</span>}</>;
}
