import type { ComponentProps, ReactNode } from 'react';

export function Label({ children, hint, htmlFor, dark = false }: { children: ReactNode; hint?: ReactNode; htmlFor?: string; dark?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className={`block text-[13px] font-medium ${dark ? 'text-parchment' : 'text-ink'}`}>{children}</span>
      {hint && <span className={`mt-0.5 block text-[12.5px] ${dark ? 'text-sage' : 'text-graphite'}`}>{hint}</span>}
    </label>
  );
}

export function Input({ dark = false, className = '', ...props }: ComponentProps<'input'> & { dark?: boolean }) {
  return <input className={`field ${dark ? 'field-dark' : ''} ${className}`} {...props} />;
}

export function Textarea({ dark = false, className = '', ...props }: ComponentProps<'textarea'> & { dark?: boolean }) {
  return <textarea className={`field min-h-28 ${dark ? 'field-dark' : ''} ${className}`} {...props} />;
}

export function Select({ dark = false, className = '', children, ...props }: ComponentProps<'select'> & { dark?: boolean }) {
  return (
    <select className={`field ${dark ? 'field-dark' : ''} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function FieldRow({ label, hint, htmlFor, children, dark = false }: { label: ReactNode; hint?: ReactNode; htmlFor?: string; children: ReactNode; dark?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} hint={hint} dark={dark}>{label}</Label>
      {children}
    </div>
  );
}

export function Checkbox({ label, name, defaultChecked, required }: { label: ReactNode; name: string; defaultChecked?: boolean; required?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-ink-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} required={required} className="mt-1 size-4 shrink-0 accent-[#1f3b2e]" />
      <span>{label}</span>
    </label>
  );
}
