import type { ReactNode } from 'react';

export function Ledger({ rows, className = '' }: { rows: { term: ReactNode; detail: ReactNode }[]; className?: string }) {
  return (
    <dl className={`ledger ${className}`}>
      {rows.map((r, i) => (
        <div key={i}>
          <dt>{r.term}</dt>
          <dd>{r.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
