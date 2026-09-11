/** Renders the counsel draft: numbered sections as headings, [placeholders] highlighted. */
export function RulesText({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l, i, arr) => l.trim() || (arr[i - 1]?.trim() ?? ''));
  const render = (line: string) => line.split(/(\[[^\]]+\])/g).map((part, i) => (/^\[[^\]]+\]$/.test(part) ? <span key={i} className="placeholder">{part}</span> : part));
  return (
    <div className="prose-etk">
      {lines.map((line, i) => {
        if (/^\d+\.\s+[A-Z]/.test(line) && line.length < 90) return <h2 key={i}>{render(line)}</h2>;
        if (/^Counsel note:/i.test(line)) return <p key={i} className="rounded-sm border border-amber/40 bg-amber-2/60 px-3 py-2 text-[13.5px] text-amber">{render(line)}</p>;
        if (/^[A-Z][A-Z ,.;'’-]{30,}$/.test(line)) return <p key={i} className="rounded-sm border hair-strong bg-linen/50 px-4 py-3 text-[13.5px] font-semibold tracking-wide text-ink">{render(line)}</p>;
        if (/^\d+\.\d+/.test(line)) { const [num, ...rest] = line.split(/\s+/); return <p key={i}><span className="mr-2 font-mono text-[13px] text-graphite">{num}</span>{render(rest.join(' '))}</p>; }
        if (/^[•\-•]/.test(line.trim())) return <p key={i} className="pl-5">{render(line.replace(/^[•\-•]\s*/, '· '))}</p>;
        if (line.length < 60 && !/[.:]$/.test(line) && /^[A-Z]/.test(line)) return <h3 key={i}>{render(line)}</h3>;
        return <p key={i}>{render(line)}</p>;
      })}
    </div>
  );
}
