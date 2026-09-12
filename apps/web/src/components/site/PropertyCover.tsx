import { MapThumb } from './MapThumb';
import { coverPhoto, photoSrc, publishedPhotos } from '@/lib/photos';

type CoverProperty = { name: string; address: string; city: string; state: string; photosJson: string; latitude: number | null; longitude: number | null; titleStatus: string };

/**
 * The property as a photograph. Published photography leads; when none is published yet the
 * vicinity map stands in (a real place, never a stock image, never a drawing), and with no
 * coordinates an ink plate carries the address. Used on catalogue cards and the landing cover.
 */
export function PropertyCover({ p, width = 720, className = '', imgClassName = '', inset = false, count = false, eager = false, pendingLabel = 'Photography pending' }: {
  p: CoverProperty; width?: number; className?: string; imgClassName?: string;
  /** small vicinity map in the corner of the photograph */
  inset?: boolean;
  /** "N photographs" chip */
  count?: boolean;
  eager?: boolean;
  pendingLabel?: string;
}) {
  const photos = publishedPhotos(p); const cover = coverPhoto(p);
  const geo = typeof p.latitude === 'number' && typeof p.longitude === 'number'; const owned = p.titleStatus === 'owned';
  const chip = 'absolute rounded-xs bg-ink/75 px-1.5 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.16em] text-parchment backdrop-blur-[2px]';
  if (cover) {
    return (
      <figure className={`relative overflow-hidden bg-ink-2 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoSrc(cover.url, width)} alt={cover.caption ? `${p.name}: ${cover.caption}` : p.name} className={`size-full object-cover ${imgClassName}`} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'auto'} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/55 to-transparent" aria-hidden />
        {count && photos.length > 1 && <span className={`${chip} bottom-2 left-2`}>{photos.length} photographs</span>}
        {inset && geo && <span className="absolute bottom-2 right-2 border border-paper/70 shadow-[0_8px_20px_-8px_rgba(15,22,19,0.6)]" aria-hidden><MapThumb lat={p.latitude!} lng={p.longitude!} zoom={11} width={76} height={50} approximate={!owned} /></span>}
      </figure>
    );
  }
  if (geo) {
    return (
      <figure className={`relative overflow-hidden bg-linen ${className}`}>
        <MapThumb lat={p.latitude!} lng={p.longitude!} zoom={12} fill approximate={!owned} className="size-full" />
        <span className={`${chip} left-2 top-2`}>{pendingLabel}</span>
      </figure>
    );
  }
  return (
    <figure className={`grain grain-dark relative flex items-end overflow-hidden bg-ink p-3 text-parchment ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(210,180,122,0.14),transparent_60%)]" aria-hidden />
      <span className={`${chip} left-2 top-2 !bg-paper/10`}>{pendingLabel}</span>
      <span className="relative z-[2] font-display text-[15px] leading-tight text-parchment/90">{p.address.startsWith('[') ? `${p.city}, ${p.state}` : p.address}</span>
    </figure>
  );
}
