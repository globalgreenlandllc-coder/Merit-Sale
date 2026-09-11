import type { ReactNode } from 'react';

export function Table({ head, children, dense = false, className = '' }: { head: ReactNode[]; children: ReactNode; dense?: boolean; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-t hair text-left text-[13.5px]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={`plate border-b hair ${dense ? 'py-2' : 'py-3'} pr-4 font-normal`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tr className={`border-b hair align-top ${className}`}>{children}</tr>;
}

export function Td({ children, className = '', mono = false }: { children: ReactNode; className?: string; mono?: boolean }) {
  return <td className={`py-3 pr-4 ${mono ? 'font-mono text-[12.5px]' : ''} ${className}`}>{children}</td>;
}
