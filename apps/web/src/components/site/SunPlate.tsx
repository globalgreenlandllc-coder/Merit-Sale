import { daylightByMonth, localCivilDay, sunTimes } from '@/lib/solar';

/** Sun and light: daylight hours through the year and today's sunrise/sunset, computed from the coordinates. */
export function SunPlate({ lat, lng, tz, now, dark = false }: { lat: number; lng: number; tz: string; now: Date; dark?: boolean }) {
  const { day, month: m } = localCivilDay(now, tz);
  const hours = daylightByMonth(lat, lng, day.getUTCFullYear());
  const today = sunTimes(lat, lng, day);
  const t = (d: Date | null) => (d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }) : '—');
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const W = 320, H = 140, pad = 18; const max = 18, min = 6;
  const yOf = (h: number) => H - pad - ((h - min) / (max - min)) * (H - 2 * pad);
  const pts = hours.map((h, i) => [pad + (i * (W - 2 * pad)) / 11, yOf(h)] as const);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const ink = dark ? 'text-parchment' : 'text-ink'; const dim = dark ? 'text-sage' : 'text-graphite';
  return (
    <div className={`border-t ${dark ? 'hair-light' : 'hair'} pt-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 className={`${dark ? 'plate-dark' : 'plate'} shrink-0 whitespace-nowrap`}>Sun and light</h3><span className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${dim}`}>NOAA solar equations · {lat.toFixed(2)}° N</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Daylight hours by month, from ${Math.min(...hours).toFixed(1)} to ${Math.max(...hours).toFixed(1)} hours`}>
        <g stroke="currentColor" className={dim} strokeWidth="0.5" opacity="0.6"><path d={`M${pad} ${H - pad} H${W - pad}`} /><path d={`M${pad} ${yOf(12)} H${W - pad}`} strokeDasharray="2 3" /><path d={`M${pad} ${pad} H${W - pad}`} strokeDasharray="2 3" /></g>
        <path d={`${path} L${pts[11]![0]} ${H - pad} L${pts[0]![0]} ${H - pad} Z`} fill="#b08d57" fillOpacity="0.08" stroke="none" />
        <path d={path} fill="none" stroke="#b08d57" strokeWidth="1.5" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === m ? 3.5 : 1.8} fill={i === m ? '#b08d57' : 'currentColor'} className={ink} />)}
        {months.map((mo, i) => <text key={i} x={pts[i]![0]} y={H - 3} textAnchor="middle" className={`font-mono text-[9px] fill-current ${i === m ? ink : dim}`}>{mo}</text>)}
        <text x={pad - 2} y={pad + 3} textAnchor="end" className={`font-mono text-[9px] fill-current ${dim}`}>{max}h</text><text x={pad - 2} y={yOf(12) + 3} textAnchor="end" className={`font-mono text-[9px] fill-current ${dim}`}>12h</text><text x={pad - 2} y={H - pad + 3} textAnchor="end" className={`font-mono text-[9px] fill-current ${dim}`}>{min}h</text>
      </svg>
      <dl className={`mt-3 grid grid-cols-3 gap-3 text-[13px] ${ink}`}>
        <div><dt className={`${dark ? 'plate-dark' : 'plate'} whitespace-nowrap`}>Sunrise</dt><dd className="mt-0.5 font-mono">{t(today.sunrise)}</dd></div>
        <div><dt className={`${dark ? 'plate-dark' : 'plate'} whitespace-nowrap`}>Sunset</dt><dd className="mt-0.5 font-mono">{t(today.sunset)}</dd></div>
        <div><dt className={`${dark ? 'plate-dark' : 'plate'} whitespace-nowrap`}>Daylight today</dt><dd className="mt-0.5 font-mono">{(today.dayLengthMinutes / 60).toFixed(1)} h</dd></div>
      </dl>
      <p className={`mt-2 text-[12px] ${dim}`}>Longest day {Math.max(...hours).toFixed(1)} h, shortest {Math.min(...hours).toFixed(1)} h. Computed from the coordinates only; room orientation is schematic until confirmed on survey.</p>
    </div>
  );
}
