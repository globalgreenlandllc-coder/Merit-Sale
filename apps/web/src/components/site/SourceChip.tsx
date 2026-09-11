/**
 * Provenance instead of trust badges: a mono hairline tag that names the source of a
 * fact and links to it when a link exists. Pending sources are amber, never hidden.
 */
export function SourceChip({ label, href, date, pending = false, dark = false, className = '' }: { label: string; href?: string | null; date?: string | null; pending?: boolean; dark?: boolean; className?: string }) {
  const isPending = pending || !href;
  const base = `inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-xs border px-1.5 py-[2px] font-mono text-[10.5px] uppercase tracking-[0.12em] align-middle ${className}`;
  const tone = isPending ? (dark ? 'border-brass-2/50 text-brass-3' : 'border-amber/50 bg-amber-2/70 text-amber') : dark ? 'border-paper/25 text-mist' : 'border-ink/20 text-slate';
  const text = <>{label}{date ? <span className="opacity-70">· {date}</span> : null}{isPending ? <span className="opacity-90">· pending</span> : null}{href ? <span aria-hidden>↗</span> : null}</>;
  if (href && !isPending) return <a href={href} className={`${base} ${tone} hover:border-brass hover:text-ink`} target="_blank" rel="noreferrer">{text}</a>;
  return <span className={`${base} ${tone}`}>{text}</span>;
}
