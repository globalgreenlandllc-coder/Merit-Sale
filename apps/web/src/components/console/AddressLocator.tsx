'use client';
import { useState } from 'react';
import { MapThumb } from '@/components/site/MapThumb';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input } from '@/components/ui/Field';

export function AddressLocator({ initial }: { initial: { address?: string | null; city?: string | null; state?: string | null; zip?: string | null; county?: string | null; latitude?: number | null; longitude?: number | null } }) {
  const [f, setF] = useState({ address: initial.address ?? '', city: initial.city ?? '', state: initial.state ?? '', zip: initial.zip ?? '', county: initial.county ?? '', latitude: initial.latitude?.toString() ?? '', longitude: initial.longitude?.toString() ?? '' });
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const locate = async () => {
    setBusy(true); setStatus(null);
    try {
      const q = [f.address, f.city, f.state, f.zip].filter(Boolean).join(', ');
      const r = await fetch(`/api/admin/geocode?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!r.ok) { setStatus(j.error ?? 'Could not locate'); return; }
      setF((s) => ({ ...s, latitude: j.lat.toFixed(6), longitude: j.lng.toFixed(6), county: s.county || j.county || '', city: s.city || j.city || '', state: s.state || j.state || '', zip: s.zip || j.zip || '' }));
      setStatus(`Located: ${j.display} (${j.attribution}). Adjust the coordinates if the pin is off.`);
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Could not locate'); } finally { setBusy(false); }
  };
  const lat = Number(f.latitude), lng = Number(f.longitude); const has = Number.isFinite(lat) && Number.isFinite(lng) && f.latitude !== '' && f.longitude !== '';
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><FieldRow label="Street address" htmlFor="address" hint="Bracket it, e.g. [Address published when title records], while under option."><Input id="address" name="address" required value={f.address} onChange={set('address')} /></FieldRow></div>
        <FieldRow label="City" htmlFor="city"><Input id="city" name="city" required value={f.city} onChange={set('city')} /></FieldRow>
        <div className="grid grid-cols-2 gap-3"><FieldRow label="State" htmlFor="state"><Input id="state" name="state" required maxLength={2} value={f.state} onChange={set('state')} /></FieldRow><FieldRow label="ZIP" htmlFor="zip"><Input id="zip" name="zip" value={f.zip} onChange={set('zip')} /></FieldRow></div>
        <FieldRow label="County" htmlFor="county"><Input id="county" name="county" value={f.county} onChange={set('county')} /></FieldRow>
        <div className="grid grid-cols-2 gap-3"><FieldRow label="Latitude" htmlFor="latitude"><Input id="latitude" name="latitude" inputMode="decimal" value={f.latitude} onChange={set('latitude')} /></FieldRow><FieldRow label="Longitude" htmlFor="longitude"><Input id="longitude" name="longitude" inputMode="decimal" value={f.longitude} onChange={set('longitude')} /></FieldRow></div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" size="sm" onClick={locate} disabled={busy}>{busy ? 'Locating…' : 'Locate on the map'}</Button>{status && <span className="text-[12.5px] text-slate">{status}</span>}</div>
      </div>
      <div className="plate-frame self-start">{has ? <MapThumb lat={lat} lng={lng} zoom={12} width={226} height={170} className="!w-full" /> : <div className="flex h-[170px] items-center justify-center text-center text-[12.5px] text-graphite">Map preview appears once located</div>}<div className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">Vicinity preview</div></div>
    </div>
  );
}
