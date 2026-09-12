/** Renders the counsel draft: numbered sections as anchored headings, [placeholders] highlighted, counsel notes only for staff. */
export function rulesSections(text: string): { id: string; title: string }[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => /^\d+\.\s+[A-Z]/.test(l) && l.length < 90).map((l) => ({ id: `s-${l.match(/^\d+/)![0]}`, title: l }));
}

export function RulesText({ text, showCounselNotes = false }: { text: string; showCounselNotes?: boolean }) {
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l, i, arr) => l.trim() || (arr[i - 1]?.trim() ?? ''));
  const render = (line: string) => line.split(/(\[[^\]]+\])/g).map((part, i) => (/^\[[^\]]+\]$/.test(part) ? <span key={i} className="placeholder">{part}</span> : part));
  return (
    <div className="prose-etk">
      {lines.map((line, i) => {
        if (/^\d+\.\s+[A-Z]/.test(line) && line.length < 90) return <h2 key={i} id={`s-${line.match(/^\d+/)![0]}`} className="scroll-mt-24">{render(line)}</h2>;
        if (/^Counsel note:/i.test(line)) return showCounselNotes ? <p key={i} className="rounded-sm border border-amber/40 bg-amber-2/60 px-3 py-2 text-[13.5px] text-amber"><span className="plate mr-2 text-amber">internal</span>{render(line)}</p> : null;
        if (/^[A-Z][A-Z ,.;'’-]{30,}$/.test(line)) return <p key={i} className="rounded-sm border hair-strong bg-linen/50 px-4 py-3 text-[13.5px] font-semibold tracking-wide text-ink">{render(line)}</p>;
        if (/^\d+\.\d+/.test(line)) { const [num, ...rest] = line.split(/\s+/); return <p key={i} id={`s-${num?.replace('.', '-')}`} className="scroll-mt-24"><span className="mr-2 font-mono text-[13px] text-graphite">{num}</span>{render(rest.join(' '))}</p>; }
        if (/^[•\-•]/.test(line.trim())) return <p key={i} className="pl-5">{render(line.replace(/^[•\-•]\s*/, '· '))}</p>;
        if (line.length < 60 && !/[.:]$/.test(line) && /^[A-Z]/.test(line)) return <h3 key={i}>{render(line)}</h3>;
        return <p key={i}>{render(line)}</p>;
      })}
    </div>
  );
}
