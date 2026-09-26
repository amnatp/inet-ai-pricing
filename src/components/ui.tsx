import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';

export function Modal({ title, children, footer, onClose }: Readonly<{
 title: string; children: ReactNode; footer?: ReactNode; onClose: () => void;
}>) {
 return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
  <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1000px]" aria-describedby={undefined} onPointerDownOutside={e => e.preventDefault()}>
   <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14"><DialogTitle>{title}</DialogTitle></DialogHeader>
   <div className="min-h-0 min-w-0 overflow-y-auto px-6 py-5">{children}</div>
   {footer && <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">{footer}</DialogFooter>}
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
