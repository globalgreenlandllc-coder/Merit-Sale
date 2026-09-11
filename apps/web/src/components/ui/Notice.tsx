import type { ReactNode } from 'react';

type Tone = 'info' | 'verify' | 'warn' | 'danger';
const tones: Record<Tone, string> = {
  info: 'border-ink/20 bg-linen/40 text-ink-3',
  verify: 'border-verify/30 bg-verify-2/60 text-verify',
  warn: 'border-amber/40 bg-amber-2/70 text-amber',
  danger: 'border-clay/40 bg-clay-2/70 text-clay',
};

export function Notice({ tone = 'info', title, children, className = '' }: { tone?: Tone; title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border px-4 py-3.5 text-[14px] leading-relaxed ${tones[tone]} ${className}`} role={tone === 'danger' ? 'alert' : 'note'}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
