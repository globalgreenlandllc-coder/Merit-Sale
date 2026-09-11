import type { ReactNode } from 'react';

/** Engraved small-caps label with an optional index and a hairline. */
export function Plate({ children, index, dark = false, className = '' }: { children: ReactNode; index?: string; dark?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {index && <span className={`${dark ? 'plate-dark' : 'plate'} tabular-nums`}>{index}</span>}
      <span className={dark ? 'plate-dark' : 'plate'}>{children}</span>
      <span className={`h-px flex-1 ${dark ? 'bg-paper/15' : 'bg-ink/15'}`} aria-hidden />
    </div>
  );
}

export function SectionHeading({ index, label, title, lede, dark = false, className = '' }: { index?: string; label: string; title: ReactNode; lede?: ReactNode; dark?: boolean; className?: string }) {
  return (
    <header className={`max-w-3xl ${className}`}>
      <Plate index={index} dark={dark}>{label}</Plate>
      <h2 className={`font-display display-tight mt-5 text-[34px] leading-[1.08] sm:text-[44px] ${dark ? 'text-parchment' : 'text-ink'}`}>{title}</h2>
      {lede && <p className={`mt-5 text-[17px] leading-relaxed ${dark ? 'text-mist' : 'text-slate'}`}>{lede}</p>}
    </header>
  );
}
