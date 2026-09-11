import { PropertyMap } from './PropertyMap';
import { MapThumb } from './MapThumb';

/** The map as an engraved plate: double hairline mat, region inset, coordinate stamp, directions and open-in links, attribution. */
export function MapPlate({ lat, lng, label, approximate = false, county, className = '' }: { lat: number; lng: number; label: string; approximate?: boolean; county?: string | null; className?: string }) {
  const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${approximate ? 12 : 15}/${lat}/${lng}`;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const apple = `https://maps.apple.com/?daddr=${lat},${lng}`;
  const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  const link = 'link-rule inline-flex min-h-6 items-center py-1 normal-case tracking-normal text-slate';
  return (
    <figure className={`plate-frame ${className}`}>
      <div className="relative">
        <PropertyMap lat={lat} lng={lng} label={label} approximate={approximate} className="h-[300px] w-full sm:h-[460px]" />
        <div className="pointer-events-none absolute bottom-3 right-3 z-[500] hidden border border-ink/30 bg-paper sm:block" aria-hidden><MapThumb lat={lat} lng={lng} zoom={6} width={150} height={100} /><span className="absolute bottom-1 left-1.5 rounded-xs bg-paper/80 px-1 font-mono text-[8px] uppercase tracking-[0.14em] text-slate">Region</span></div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t hair px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-graphite">
        <span>{approximate ? 'Approximate area · address published when title records' : `${fmt(lat, 'N', 'S')} · ${fmt(lng, 'E', 'W')}${county ? ` · ${county} County` : ''}`}</span>
        <span className="flex flex-wrap gap-x-4">{!approximate && <><a className={link} href={google} target="_blank" rel="noreferrer">Directions ↗</a><a className={link} href={apple} target="_blank" rel="noreferrer">Apple Maps ↗</a></>}<a className={link} href={osm} target="_blank" rel="noreferrer">OpenStreetMap ↗</a></span>
        <span className="w-full text-[9.5px] normal-case tracking-normal text-graphite">Map tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS · imagery © Esri, Maxar, Earthstar Geographics · OpenStreetMap layer © OpenStreetMap contributors</span>
      </figcaption>
    </figure>
  );
}
