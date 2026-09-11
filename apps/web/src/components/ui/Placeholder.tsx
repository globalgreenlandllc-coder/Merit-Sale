/** A counsel placeholder, always visibly bracketed and in one style site-wide. */
export function Placeholder({ children, dark = false }: { children: string; dark?: boolean }) {
  const text = children.startsWith('[') ? children : `[${children}]`;
  return <span className={`rounded-xs px-1 font-mono text-[12.5px] ${dark ? 'bg-paper/10 text-brass-3' : 'bg-amber-2 text-amber'}`}>{text}</span>;
}
