/**
 * Static map thumbnail with no JavaScript: nine raster tiles positioned so the
 * coordinate sits at the exact centre, then a pin overlaid. Used on cards.
 */
export function MapThumb({ lat, lng, zoom = 13, width = 320, height = 200, approximate = false, fill = false, attribution = true, className = '' }: { lat: number; lng: number; zoom?: number; width?: number; height?: number; approximate?: boolean; fill?: boolean; /** hide the tile credit on tiny insets; the page footer carries it */ attribution?: boolean; className?: string }) {
  const n = 2 ** zoom;
  const xf = ((lng + 180) / 360) * n;
  const latR = (lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  const cx = Math.floor(xf), cy = Math.floor(yf);
  const px = (xf - cx) * 256, py = (yf - cy) * 256;
  const left = fill ? `calc(50% - ${256 + px}px)` : width / 2 - (256 + px);
  const top = fill ? `calc(50% - ${256 + py}px)` : height / 2 - (256 + py);
  return (
    <div className={`relative overflow-hidden bg-linen ${fill ? 'size-full' : ''} ${className}`} style={fill ? undefined : { width, height }} aria-hidden>
      <div className="map-parchment absolute" style={{ left, top, width: 768, height: 768 }}>
        {[-1, 0, 1].map((dy) => [-1, 0, 1].map((dx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${dx}${dy}`} src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${cy + dy}/${cx + dx}`} width={256} height={256} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', left: (dx + 1) * 256, top: (dy + 1) * 256 }} />
        )))}
      </div>
      {approximate ? (
        <span className="absolute rounded-full border border-dashed border-brass bg-brass/15" style={{ width: 96, height: 96, left: 'calc(50% - 48px)', top: 'calc(50% - 48px)' }} />
      ) : (
        <span className="etk-pin absolute" style={{ left: 'calc(50% - 14px)', top: 'calc(50% - 14px)' }}><span className="etk-pin-ring" /><span className="etk-pin-dot" /></span>
      )}
      {attribution && <span className="absolute bottom-1 right-1.5 rounded-xs bg-paper/70 px-1 font-mono text-[8px] leading-3 text-graphite">Tiles © Esri</span>}
    </div>
  );
}
