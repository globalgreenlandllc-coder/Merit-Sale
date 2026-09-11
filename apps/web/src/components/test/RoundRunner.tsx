'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { submitAttempt } from '@/modules/rounds/actions';
import type { PublicItemView } from '@/modules/rounds/service';

interface Props {
  attemptId: string;
  sessionToken: string;
  startedAt: number;
  expiresAt: number;
  serverNow: number;
  graceSeconds: number;
  items: PublicItemView[];
  roundLabel: string;
  single: boolean;
  tier: number;
}

type FocusEvent = { type: string; at: number };

const HINTS: Record<string, string> = { integer: 'Whole number', decimal: 'Number (decimals allowed)', string_exact: 'Short exact answer', ordering: 'Comma-separated list, in order', assignment: 'Pairs like A→2, B→1', allocation: 'Values like x1=40000, x3=60000' };

export function RoundRunner({ attemptId, sessionToken, startedAt, expiresAt, serverNow, graceSeconds, items, roundLabel, single, tier }: Props) {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const now = () => Date.now() + offset;
  const [remaining, setRemaining] = useState(Math.max(0, Math.floor((expiresAt - now()) / 1000)));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<'running' | 'submitting' | 'done' | 'error'>('running');
  const [message, setMessage] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const renderedAt = useRef<Record<string, number>>({});
  const events = useRef<FocusEvent[]>([]);
  const flushTimer = useRef<number | null>(null);
  const submitted = useRef(false);

  const flush = useCallback(() => {
    if (!events.current.length) return;
    const batch = events.current.splice(0, events.current.length);
    fetch(`/api/attempts/${attemptId}/telemetry`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionToken, events: batch }), keepalive: true }).catch(() => undefined);
  }, [attemptId, sessionToken]);

  const log = useCallback((type: string) => {
    events.current.push({ type, at: now() });
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(flush, 800);
  }, [flush]);

  const doSubmit = useCallback(async (auto = false) => {
    if (submitted.current) return;
    submitted.current = true;
    setState('submitting');
    flush();
    const r = await submitAttempt({ attemptId, answers, renderedAt: renderedAt.current });
    if (r.ok) { setState('done'); setMessage(auto ? 'Time reached. Your answers were submitted automatically.' : 'Your answers were received.'); }
    else { setState('error'); setMessage(r.error ?? r.status); }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }, [answers, attemptId, flush]);

  // per-item render timestamps (server clock)
  useEffect(() => {
    const it = items[index];
    if (it && !renderedAt.current[it.id]) renderedAt.current[it.id] = now();
  }, [index, items]);

  // countdown, auto-submit at the limit (server still checks; grace only covers latency)
  useEffect(() => {
    const t = window.setInterval(() => {
      const left = Math.floor((expiresAt - now()) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0 && state === 'running') doSubmit(true);
    }, 250);
    return () => window.clearInterval(t);
  }, [expiresAt, state, doSubmit]);

  // locked-browser telemetry
  useEffect(() => {
    const onVis = () => { if (document.hidden) log('visibility_hidden'); };
    const onBlur = () => log('window_blur');
    const onFs = () => { if (!document.fullscreenElement && state === 'running') { setLocked(false); log('fullscreen_exit'); } };
    const block = (e: Event) => { e.preventDefault(); log(`blocked_${e.type}`); };
    const keys = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'p', 's', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); log(`blocked_key_${e.key.toLowerCase()}`); } if (e.key === 'PrintScreen') log('printscreen'); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('copy', block); document.addEventListener('paste', block); document.addEventListener('cut', block); document.addEventListener('contextmenu', block);
    document.addEventListener('keydown', keys);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('copy', block); document.removeEventListener('paste', block); document.removeEventListener('cut', block); document.removeEventListener('contextmenu', block);
      document.removeEventListener('keydown', keys); window.removeEventListener('pagehide', flush);
    };
  }, [log, flush, state]);

  const enterFullscreen = () => { document.documentElement.requestFullscreen?.().then(() => setLocked(true)).catch(() => setLocked(true)); };

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const item = items[index];
  const answered = items.filter((i) => (answers[i.id] ?? '').trim()).length;

  if (state === 'done' || state === 'error') {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className={`plate-dark ${state === 'error' ? 'text-clay' : 'text-brass-2'}`}>{state === 'error' ? 'Not recorded' : 'Recorded'}</div>
        <h1 className="font-display mt-4 text-[40px] leading-tight">{state === 'error' ? 'Something went wrong.' : `${roundLabel} submitted.`}</h1>
        <p className="mt-4 text-[16px] text-mist">{message}</p>
        <p className="mt-2 text-[14px] text-sage">Scores are posted after the round closes and the Administrator unseals the committed key. You will be notified.</p>
        <a href="/account" className="mt-8 inline-flex h-11 items-center rounded-sm bg-parchment px-5 text-[14px] text-ink">Back to your account</a>
      </div>
    );
  }

  return (
    <div className="locked-copy" onDragStart={(e) => e.preventDefault()}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b hair-light pb-4">
        <div><div className="plate-dark">{roundLabel}</div><div className="mt-1 text-[13px] text-sage">{single ? 'One item. One submission.' : `Item ${index + 1} of ${items.length} · ${answered} answered`}</div></div>
        <div className="flex items-center gap-4">
          {!locked && <button type="button" onClick={enterFullscreen} className="rounded-sm border border-brass-2/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brass-2 hover:bg-brass/10">Enter full screen</button>}
          <div className={`font-mono text-[34px] tabular-nums ${remaining <= 10 ? 'text-clay animate-tick' : 'text-parchment'}`} aria-live="polite" aria-label="Time remaining">{mm}:{ss}</div>
        </div>
      </div>

      {tier >= 2 && <div className="mt-4 rounded-sm border border-brass-2/40 bg-brass/10 px-4 py-2 text-[13px] text-brass-3">Proctoring session active. Webcam, screen, and ID match are recorded by the proctoring vendor. Prohibited: other people, other devices, AI tools, calculators unless the item says so.</div>}

      {item && (
        <section className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="plate-dark">Item {item.position} · {item.maxPoints} {item.maxPoints === 1 ? 'point' : 'points'}{item.calculatorPermitted ? ' · calculator permitted' : ''}</div>
            <p className="font-display mt-4 text-[26px] leading-[1.35] text-parchment sm:text-[30px]">{item.prompt}</p>
          </div>
          <div className="lg:pt-8">
            <label className="block">
              <span className="text-[13px] text-mist">Your answer</span>
              <span className="mt-0.5 block text-[12px] text-sage">{item.inputHint ?? HINTS[item.inputType]}</span>
              {item.fields?.length ? (
                <div className="mt-3 space-y-2">
                  {item.fields.map((f) => {
                    const parsed = Object.fromEntries((answers[item.id] ?? '').split(',').map((p) => p.split('=').map((x) => x.trim())).filter((p) => p.length === 2)) as Record<string, string>;
                    return <div key={f.key} className="grid grid-cols-[1fr_1fr] items-center gap-3"><span className="text-[13px] text-mist">{f.label}</span><input className="field field-dark" inputMode="decimal" value={parsed[f.key] ?? ''} onChange={(e) => { const next = { ...parsed, [f.key]: e.target.value }; setAnswers((a) => ({ ...a, [item.id]: Object.entries(next).filter(([, v]) => v !== '').map(([k, v]) => `${k}=${v}`).join(', ') })); }} /></div>;
                  })}
                </div>
              ) : (
                <textarea className="field field-dark mt-3 min-h-24 font-mono text-[16px]" autoFocus value={answers[item.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [item.id]: e.target.value }))} onPaste={(e) => e.preventDefault()} spellCheck={false} autoComplete="off" />
              )}
            </label>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!single && index > 0 && <button type="button" onClick={() => setIndex((i) => i - 1)} className="h-11 rounded-sm border hair-light px-4 text-[14px] text-parchment hover:bg-paper/10">Previous</button>}
              {!single && index < items.length - 1 && <button type="button" onClick={() => setIndex((i) => i + 1)} className="h-11 rounded-sm bg-parchment px-5 text-[14px] text-ink hover:bg-paper">Next item</button>}
              {(single || index === items.length - 1) && <button type="button" disabled={state !== 'running'} onClick={() => doSubmit(false)} className="h-11 rounded-sm bg-brass px-6 text-[14px] font-medium text-ink hover:bg-brass-2 disabled:opacity-50">{state === 'submitting' ? 'Submitting…' : single ? 'Submit answer' : 'Submit all answers'}</button>}
            </div>
            {!single && (
              <ol className="mt-8 flex flex-wrap gap-1.5" aria-label="Items">
                {items.map((it, i) => <li key={it.id}><button type="button" onClick={() => setIndex(i)} className={`size-8 rounded-xs border font-mono text-[12px] ${i === index ? 'border-brass-2 text-brass-2' : (answers[it.id] ?? '').trim() ? 'border-paper/40 text-parchment' : 'border-paper/15 text-sage'}`}>{i + 1}</button></li>)}
              </ol>
            )}
          </div>
        </section>
      )}
      <p className="mt-12 text-[12px] text-sage">Full-screen, focus changes, copy, paste, and right-click are logged. Server timestamps decide timing; the grace for network latency is {graceSeconds}s and is not extra time.</p>
    </div>
  );
}
