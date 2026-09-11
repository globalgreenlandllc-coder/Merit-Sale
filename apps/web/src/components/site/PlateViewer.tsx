'use client';
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';

export interface Plate { id: string; kind: 'plate' | 'photo' | 'map'; label: string; caption: string; node?: ReactNode; url?: string; credit?: string; thumb?: ReactNode }

function toRoman(n: number): string { const m: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; }

/**
 * Plate viewer: one active plate at 3:2, a caption row in the title-block idiom, and a
 * keyboard-navigable thumbnail strip. Photographs are numbered as photographs, sheets as
 * plates; the architect's sheets never disappear behind photos. Full screen uses <dialog>.
 */
export function PlateViewer({ plates, title }: { plates: Plate[]; title: string }) {
  const [i, setI] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const uid = useId();
  const total = plates.length;
  const photoCount = plates.filter((p) => p.kind === 'photo').length;
  const numberOf = (k: number) => { const pl = plates[k]!; if (pl.kind === 'photo') return `Photograph ${plates.slice(0, k + 1).filter((p) => p.kind === 'photo').length} of ${photoCount}`; return `Plate ${toRoman(plates.slice(0, k + 1).filter((p) => p.kind !== 'photo').length)}`; };
  const go = useCallback((n: number) => {
    const next = (n + total) % total; setI(next);
    requestAnimationFrame(() => { const t = strip.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]; t?.focus({ preventScroll: true }); t?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  }, [total]);
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); } if (e.key === 'Home') { e.preventDefault(); go(0); } if (e.key === 'End') { e.preventDefault(); go(total - 1); } };
  const p = plates[i];
  if (!p) return null;
  const render = (pl: Plate, big: boolean) => pl.kind === 'photo'
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={pl.url} alt={pl.caption || `${title} · photograph`} className={`size-full object-cover ${big ? '' : 'opacity-90'}`} loading={big ? 'eager' : 'lazy'} />
    : pl.kind === 'map' ? <div className="size-full" role="img" aria-label={`Vicinity map · ${pl.caption}`}>{pl.node}</div>
    : <div className={`flex size-full items-center justify-center ${big ? 'p-6 sm:p-10' : 'p-1.5'}`}>{pl.node}</div>;
  return (
    <div className="text-brass-2">
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${i}`} className="relative overflow-hidden rounded-xs border border-brass-2/25 bg-ink-2" style={{ aspectRatio: '3 / 2' }}>
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(210,180,122,0.12),transparent_60%)]" aria-hidden />
        <div className="relative z-[2] size-full">{render(p, true)}</div>
        <button type="button" onClick={() => dialog.current?.showModal()} className="absolute bottom-3 right-3 z-[3] inline-flex h-8 items-center rounded-xs border border-brass-2/50 bg-ink/70 px-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-brass-3 backdrop-blur hover:bg-ink" aria-label="Open full screen">Full screen</button>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-mist">
        <span className="shrink-0">{numberOf(i)} · {p.label}</span><span className="text-mist/80">{p.caption}{p.credit ? ` · ${p.credit}` : ''}</span>
      </div>
      {total > 1 && (
        <div ref={strip} role="tablist" aria-label={`${title} plates`} className="mt-3 flex gap-2 overflow-x-auto pb-1" onKeyDown={onKey}>
          {plates.map((pl, k) => (
            <button key={pl.id} id={`${uid}-tab-${k}`} role="tab" aria-selected={k === i} aria-controls={`${uid}-panel`} aria-label={`${numberOf(k)} · ${pl.label}`} tabIndex={k === i ? 0 : -1} onClick={() => go(k)} className={`relative h-14 w-[84px] shrink-0 overflow-hidden rounded-xs border transition ${k === i ? 'border-brass-2 bg-ink' : 'border-paper/15 bg-ink-2 hover:border-paper/40'}`}>
              <div className="size-full text-brass-2" aria-hidden>{pl.thumb ?? render(pl, false)}</div>
              <span className="absolute bottom-0.5 left-1 font-mono text-[8px] uppercase tracking-[0.14em] text-parchment/80" aria-hidden>{pl.kind === 'photo' ? 'P' : toRoman(plates.slice(0, k + 1).filter((x) => x.kind !== 'photo').length)}</span>
            </button>
          ))}
        </div>
      )}
      <dialog ref={dialog} aria-labelledby={`${uid}-dialog-title`} className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink text-parchment backdrop:bg-ink/90" onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
        <div className="flex h-full flex-col" onKeyDown={onKey}>
          <div className="flex items-center justify-between px-5 py-3"><span id={`${uid}-dialog-title`} className="plate-dark">{title} · {numberOf(i)} · {p.label}</span><button type="button" onClick={() => dialog.current?.close()} className="inline-flex h-8 items-center rounded-sm border border-paper/40 px-3 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-paper/10">Close · Esc</button></div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6 text-brass-2">
            <div className="max-h-full w-full max-w-6xl">{render(p, true)}</div>
            <button type="button" onClick={() => go(i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-paper/40 p-3 text-parchment hover:bg-paper/10" aria-label="Previous">←</button>
            <button type="button" onClick={() => go(i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-paper/40 p-3 text-parchment hover:bg-paper/10" aria-label="Next">→</button>
          </div>
          <div className="px-5 pb-5 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-mist">{p.caption}</div>
        </div>
      </dialog>
    </div>
  );
}
