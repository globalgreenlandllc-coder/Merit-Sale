'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PropertyPhoto } from '@/lib/photos';
import { Button } from '@/components/ui/Button';

export function PhotoManager({ propertyId, photos: initial }: { propertyId: string; photos: PropertyPhoto[] }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = `/api/admin/properties/${propertyId}/photos`;
  const call = async (init: RequestInit) => {
    setBusy(true); setError(null);
    try {
      const r = await fetch(api, init);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error ?? `Request failed (${r.status})`); return; }
      setPhotos(j.photos); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setBusy(false); }
  };
  const patch = (body: Record<string, unknown>) => call({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return (
    <div className="space-y-5">
      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); await call({ method: 'POST', body: fd }); form.reset(); }}>
        <div className="sm:col-span-3"><input type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="field py-2 text-[13px] file:mr-3 file:rounded-xs file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:text-parchment" /></div>
        <input name="caption" placeholder="Caption (e.g. Great room toward the terrace)" className="field py-2 text-[13px]" />
        <input name="credit" placeholder="Photographer credit" className="field py-2 text-[13px]" />
        <Button type="submit" size="sm" disabled={busy}>{busy ? 'Working…' : 'Upload'}</Button>
      </form>
      <p className="text-[12.5px] text-graphite">JPEG, PNG, WebP, or AVIF up to 12 MB each. Uploads stay unpublished until marked published after counsel approval; only published photographs appear on the public page. The first published photo is the cover.</p>
      {error && <p className="text-[13px] text-clay" role="alert">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.url} className={`overflow-hidden rounded-sm border bg-paper ${p.published ? 'border-verify/50' : 'hair'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption} className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-1.5 p-2">
              <input defaultValue={p.caption} placeholder="Caption" className="field py-1 text-[12px]" onBlur={(e) => { if (e.target.value !== p.caption) patch({ url: p.url, caption: e.target.value }); }} />
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <label className="flex cursor-pointer items-center gap-1.5 text-slate"><input type="checkbox" checked={p.published} onChange={(e) => patch({ url: p.url, published: e.target.checked })} className="accent-[#1f3b2e]" />published</label>
                <span className="flex gap-2">
                  {i > 0 && <button type="button" className="link-rule" onClick={() => patch({ url: p.url, moveTo: i - 1 })} aria-label="Move earlier">↑</button>}
                  {i < photos.length - 1 && <button type="button" className="link-rule" onClick={() => patch({ url: p.url, moveTo: i + 1 })} aria-label="Move later">↓</button>}
                  <button type="button" className="text-clay" onClick={() => { if (confirm('Remove this photo?')) call({ method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: p.url }) }); }}>remove</button>
                </span>
              </div>
              {p.sha256 && <div className="truncate font-mono text-[10px] text-graphite" title={p.sha256}>sha256 {p.sha256.slice(0, 16)}…</div>}
            </div>
          </li>
        ))}
        {!photos.length && <li className="col-span-full rounded-sm border border-dashed hair-strong p-6 text-center text-[13px] text-graphite">No photography yet. The public page shows the architect’s plate set until photographs are published.</li>}
      </ul>
    </div>
  );
}
