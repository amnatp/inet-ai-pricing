import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';

type Country = { code: string; name: string };
const Countries = createContext<Country[]>([]);
export function CountryProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.countries().then(setCountries).catch(() => setError('Country names could not be loaded. Refresh to try again.')); }, []);
  return <Countries.Provider value={countries}>{error && <div role="alert" className="banner error">{error}</div>}{children}</Countries.Provider>;
}
export function useCountryName() {
  const countries = useContext(Countries);
  return (value: unknown): string => {
    const text = String(value ?? '');
    const key = text.trim().toUpperCase();
    return countries.find(c => c.code.toUpperCase() === key || c.name.toUpperCase() === key)?.name ?? text;
  };
}
export function CountryInput({ value, onChange, required = false }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  const countries = useContext(Countries);
  const current = countries.find(c => c.code.toUpperCase() === value.trim().toUpperCase() || c.name.toUpperCase() === value.trim().toUpperCase());
  return <select required={required} value={current?.code ?? value} onChange={e => onChange(e.target.value)}>
    <option value="">Select country</option>
    {!current && value && <option value={value}>{value}</option>}
    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
  </select>;
}
