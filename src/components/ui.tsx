import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';

export function Modal({ title, children, footer, onClose }: Readonly<{
 title: string; children: ReactNode; footer?: ReactNode; onClose: () => void;
}>) {
 return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
  <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[900px]" aria-describedby={undefined} onPointerDownOutside={e => e.preventDefault()}>
   <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
   <div className="min-w-0">{children}</div>
   {footer && <DialogFooter>{footer}</DialogFooter>}
  </DialogContent>
 </Dialog>;
}

export function Field({
  label,
  children,
  hint,
}: Readonly<{
  label: string;
  children: ReactNode;
  hint?: string;
}>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="small muted">{hint}</span>}
    </label>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}>) {
  return (
    <label className="field checkbox">
      <Checkbox checked={checked} onCheckedChange={value => onChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

export function Spinner({ label = 'Loading…' }: Readonly<{ label?: string }>) {
  return <span className="loading-status" role="status" aria-live="polite">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </span>;
}
