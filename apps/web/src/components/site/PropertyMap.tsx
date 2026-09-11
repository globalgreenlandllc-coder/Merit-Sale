'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

type Base = 'map' | 'satellite' | 'osm';

/**
 * Interactive map (Leaflet, keyless Esri raster tiles with an OpenStreetMap fallback),
 * tinted toward parchment, with the platform's own controls instead of Leaflet chrome.
 * "Measure from a point": click the map, or use the keyboard button to measure from
 * the map centre. Nothing is requested from the visitor's device.
 */
export function PropertyMap({ lat, lng, label, approximate = false, zoom = 15, rings = true, measure = true, className = '' }: { lat: number; lng: number; label: string; approximate?: boolean; zoom?: number; rings?: boolean; measure?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<{ map: import('leaflet').Map; setBase: (b: Base) => void; measureFrom: (lat: number, lng: number) => void } | null>(null);
  const [base, setBaseState] = useState<Base>('map');
  const [reading, setReading] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !ref.current) return;
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const map = L.map(ref.current, { scrollWheelZoom: false, zoomControl: false, attributionControl: false, dragging: !coarse, touchZoom: true, keyboard: true }).setView([lat, lng], approximate ? Math.min(zoom, 12) : zoom);
      const esri = (svc: string, max: number) => L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${svc}/MapServer/tile/{z}/{y}/{x}`, { maxZoom: max, className: svc === 'World_Imagery' ? 'etk-tiles-imagery' : 'etk-tiles-gray' });
      const layers: Record<Base, import('leaflet').Layer> = {
        map: esri('World_Street_Map', 19), satellite: esri('World_Imagery', 19),
        osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'etk-tiles-gray' }),
      };
      let current: Base = 'map'; layers.map.addTo(map);
      let errs = 0;
      (layers.map as import('leaflet').TileLayer).on('tileerror', () => { if (++errs < 3 || current !== 'map' || !map.hasLayer(layers.map)) return; map.removeLayer(layers.map); layers.osm.addTo(map); current = 'osm'; setBaseState('osm'); });
      const setBase = (b: Base) => { if (b === current) return; map.removeLayer(layers[current]); layers[b].addTo(map); current = b; setBaseState(b); };
      if (approximate) {
        L.circle([lat, lng], { radius: 900, color: '#b08d57', weight: 1, fillColor: '#b08d57', fillOpacity: 0.14, dashArray: '4 4' }).addTo(map).bindTooltip('Approximate area until title records', { direction: 'top', className: 'etk-tip' });
      } else {
        const icon = L.divIcon({ className: 'etk-pin', html: '<span class="etk-pin-ring"></span><span class="etk-pin-dot"></span>', iconSize: [28, 28], iconAnchor: [14, 14] });
        L.marker([lat, lng], { icon, keyboard: true, title: label }).addTo(map).bindTooltip(label, { direction: 'top', offset: [0, -14], className: 'etk-tip' });
        if (rings) for (const [mi, text] of [[0.5, '½ mi'], [1, '1 mi']] as [number, string][]) {
          L.circle([lat, lng], { radius: mi * 1609.344, color: '#4c5752', weight: 0.8, dashArray: '3 5', fill: false, interactive: false }).addTo(map);
          const eastLng = lng + (mi * 1609.344) / (111320 * Math.cos((lat * Math.PI) / 180));
          L.marker([lat, eastLng], { icon: L.divIcon({ className: 'etk-ring-label', html: `<span>${text}</span>`, iconSize: [40, 14], iconAnchor: [-4, 7] }), interactive: false, keyboard: false }).addTo(map);
        }
      }
      let line: import('leaflet').Polyline | null = null; let dot: import('leaflet').CircleMarker | null = null;
      const measureFrom = (aLat: number, aLng: number) => {
        const R = 3958.7613; const dLat = ((lat - aLat) * Math.PI) / 180; const dLng = ((lng - aLng) * Math.PI) / 180;
        const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2; const miles = 2 * R * Math.asin(Math.sqrt(s));
        const y = Math.sin(dLng) * Math.cos((lat * Math.PI) / 180); const x = Math.cos((aLat * Math.PI) / 180) * Math.sin((lat * Math.PI) / 180) - Math.sin((aLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.cos(dLng);
        const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360; const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        line?.remove(); dot?.remove();
        line = L.polyline([[aLat, aLng], [lat, lng]], { color: '#b08d57', weight: 1.2, dashArray: '4 4' }).addTo(map);
        dot = L.circleMarker([aLat, aLng], { radius: 4, color: '#0f1613', weight: 1, fillColor: '#faf8f2', fillOpacity: 1 }).addTo(map);
        setReading(`${miles < 10 ? miles.toFixed(2) : miles.toFixed(1)} mi · ${(miles * 1.609344).toFixed(1)} km · property lies ${dirs[Math.round(bearing / 45) % 8]} (${Math.round(bearing)}°) of the point`);
      };
      if (measure) map.on('click', (e) => measureFrom(e.latlng.lat, e.latlng.lng));
      api.current = { map, setBase, measureFrom };
    })();
    return () => { cancelled = true; api.current?.map.remove(); api.current = null; };
  }, [lat, lng, zoom, label, approximate, rings, measure]);
  const btn = 'inline-flex h-8 items-center px-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition';
  return (
    <div className="relative isolate">
      <div ref={ref} className={`map-parchment ${className}`} role="region" aria-label={`Map showing ${label}`} />
      <div className="absolute left-3 top-3 z-[500] flex overflow-hidden rounded-xs border hair-strong bg-paper/95 backdrop-blur" role="group" aria-label="Zoom">
        <button type="button" className={`${btn} border-r hair text-ink hover:bg-linen`} onClick={() => api.current?.map.zoomIn()} aria-label="Zoom in">+</button>
        <button type="button" className={`${btn} text-ink hover:bg-linen`} onClick={() => api.current?.map.zoomOut()} aria-label="Zoom out">−</button>
      </div>
      <div className="absolute right-3 top-3 z-[500] flex overflow-hidden rounded-xs border hair-strong bg-paper/95 backdrop-blur" role="radiogroup" aria-label="Map layer">
        {([['map', 'Map'], ['satellite', 'Satellite'], ['osm', 'OSM']] as [Base, string][]).map(([k, t], idx) => (
          <button key={k} type="button" role="radio" aria-checked={base === k} onClick={() => api.current?.setBase(k)} className={`${btn} ${idx ? 'border-l hair' : ''} ${base === k ? 'bg-ink text-parchment' : 'text-ink hover:bg-linen'}`}>{t}</button>
        ))}
      </div>
      {measure && (
        <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xs bg-paper/90 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-slate backdrop-blur" aria-live="polite">
          <button type="button" className="rounded-xs border hair-strong px-1.5 py-0.5 text-ink hover:bg-linen" onClick={() => { const c = api.current?.map.getCenter(); if (c) api.current?.measureFrom(c.lat, c.lng); }}>Measure from centre</button>
          <span className="truncate">{reading ?? 'or click any point'}</span>
        </div>
      )}
    </div>
  );
}
