'use client';
import { useEffect, useState } from 'react';

export interface ScheduleEvent { key: string; label: string; start: string | null; end?: string | null; note?: string; tier?: number }

function fmt(iso: string, tz: string) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });
}
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fold = (line: string) => { const out: string[] = []; let rest = line; while (rest.length > 73) { out.push(rest.slice(0, 73)); rest = ' ' + rest.slice(73); } out.push(rest); return out.join('\r\n'); };
function ics(events: ScheduleEvent[], title: string) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const slug = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Earn the Keys//Merit Open//EN', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    if (!e.start) continue;
    lines.push('BEGIN:VEVENT', `UID:${slug}-${e.key}@earnthekeys`, `DTSTAMP:${stamp(e.start)}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end ?? new Date(new Date(e.start).getTime() + 3600e3).toISOString())}`, fold(`SUMMARY:${esc(`${title} — ${e.label}`)}`), fold(`DESCRIPTION:${esc(e.note ?? '')}`), 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Official schedule in the official timezone on the server; the viewer's own timezone is added after mount. */
export function ScheduleTimeline({ events, title, officialTz = 'America/Los_Angeles', provisional = false, dark = false }: { events: ScheduleEvent[]; title: string; officialTz?: string; provisional?: boolean; dark?: boolean }) {
  const [viewerTz, setViewerTz] = useState(officialTz);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setViewerTz(Intl.DateTimeFormat().resolvedOptions().timeZone); setNow(Date.now()); }, []);
  const sameTz = viewerTz === officialTz;
  const download = () => { const blob = new Blob([ics(events, title)], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 10_000); };
  const dotBase = 'absolute -left-[31px] top-1 size-[11px] rounded-full border-2';
  return (
    <div>
      {provisional && <p className={`mb-4 text-[13px] ${dark ? 'text-brass-3' : 'text-amber'}`}>Provisional. Dates become fixed when the Official Rules lock, before registration opens.</p>}
      <ol className={`relative border-l ${dark ? 'border-paper/20' : 'border-ink/20'} pl-6`}>
        {events.map((e) => {
          const past = !!now && !!e.start && new Date(e.end ?? e.start).getTime() < now; const live = !!now && !!e.start && !past && new Date(e.start).getTime() <= now;
          return (
            <li key={e.key} className="relative pb-6 last:pb-0">
              <span className={`${dotBase} ${live ? 'border-brass bg-brass' : past ? (dark ? 'border-sage bg-sage' : 'border-graphite bg-graphite') : dark ? 'border-brass-2 bg-ink' : 'border-ink bg-paper'}`} aria-hidden />
              <div className={`text-[15px] font-medium ${dark ? 'text-parchment' : 'text-ink'}`}>{e.label}{e.tier && e.tier > 1 ? <span className={`ml-2 font-mono text-[10.5px] uppercase tracking-[0.14em] ${dark ? 'text-sage' : 'text-graphite'}`}>tier {e.tier} · proctored</span> : null}{live && <span className={`ml-2 font-mono text-[10.5px] uppercase tracking-[0.14em] ${dark ? 'text-brass-2' : 'text-amber'}`}>now</span>}</div>
              {e.start ? (
                <>
                  <div className={`mt-0.5 text-[13.5px] ${dark ? 'text-mist' : 'text-slate'}`}>{provisional ? '[' : ''}{fmt(e.start, viewerTz)}{e.end ? ` → ${fmt(e.end, viewerTz)}` : ''}{provisional ? ']' : ''}</div>
                  {!sameTz && <div className={`mt-0.5 font-mono text-[11px] ${dark ? 'text-sage' : 'text-graphite'}`}>official · {fmt(e.start, officialTz)}{e.end ? ` → ${fmt(e.end, officialTz)}` : ''}</div>}
                </>
              ) : <div className={`mt-0.5 text-[13.5px] ${dark ? 'text-sage' : 'text-graphite'}`}>[Date published at lock]</div>}
              {e.note && <div className={`mt-1 text-[12.5px] ${dark ? 'text-sage' : 'text-graphite'}`}>{e.note}</div>}
            </li>
          );
        })}
      </ol>
      <div className={`mt-5 flex flex-wrap items-center gap-3 text-[12.5px] ${dark ? 'text-sage' : 'text-graphite'}`}>
        {!provisional && <button type="button" onClick={download} className={`inline-flex h-8 items-center rounded-sm border px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition ${dark ? 'border-brass-2/60 text-brass-2 hover:bg-brass/10' : 'border-ink/30 text-ink hover:border-ink'}`}>Add to calendar (.ics)</button>}
        <span>{sameTz ? `Times in ${officialTz.replace('_', ' ')}.` : `Shown in your timezone (${viewerTz}); official times in ${officialTz.replace('_', ' ')}.`}{provisional ? '' : ' Dates do not move; the registration close is never extended.'}</span>
      </div>
    </div>
  );
}
