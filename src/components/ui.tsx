import type { ReactNode } from 'react';
import { useEffect } from 'react';

export function Modal({
  title,
  children,
  footer,
  onClose,
}: Readonly<{
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop">
      <dialog className="modal" open aria-label={title}>
        <header>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {children}
        {footer && <footer>{footer}</footer>}
      </dialog>
    </div>
  );
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
