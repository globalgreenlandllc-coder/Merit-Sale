import type { ReactNode } from 'react';

export function Stat({ label, value, hint, dark = false }: { label: ReactNode; value: ReactNode; hint?: ReactNode; dark?: boolean }) {
  return (
    <div className={`border-t py-4 ${dark ? 'hair-light' : 'hair'}`}>
      <div className={dark ? 'plate-dark' : 'plate'}>{label}</div>
      <div className={`font-display mt-2 text-[30px] leading-none tabular-nums ${dark ? 'text-parchment' : 'text-ink'}`}>{value}</div>
      {hint && <div className={`mt-2 text-[13px] ${dark ? 'text-sage' : 'text-graphite'}`}>{hint}</div>}
    </div>
  );
}
