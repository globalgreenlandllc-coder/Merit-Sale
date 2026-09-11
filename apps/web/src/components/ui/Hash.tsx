'use client';
import { useState } from 'react';

export function Hash({ value, short = false, className = '' }: { value: string | null | undefined; short?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="hash text-graphite">— not yet published —</span>;
  const shown = short ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
  return (
    <button
      type="button"
      title="Copy hash"
      onClick={() => { navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }); }}
      className={`hash group inline text-left text-ink-3 hover:text-ink ${className}`}
    >
      <span className="border-b border-dotted border-brass/60 group-hover:border-brass">{shown}</span>
      <span className="ml-2 font-sans text-[11px] uppercase tracking-wider text-brass opacity-0 transition group-hover:opacity-100">{copied ? 'copied' : 'copy'}</span>
    </button>
  );
}
