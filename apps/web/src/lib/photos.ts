import { safeJson } from './format';

/** One photograph on a property. Only `published` photographs reach public pages; the first published one is the cover. */
export interface PropertyPhoto { url: string; caption: string; credit: string; addedAt: string; published: boolean; sha256?: string; /** sample photograph loaded in demo mode; removed when the site goes live */ demo?: boolean }

type WithPhotos = { photosJson: string };

export function allPhotos(p: WithPhotos): PropertyPhoto[] {
  return safeJson<PropertyPhoto[]>(p.photosJson, []).map((ph) => ({ ...ph, published: ph.published ?? false }));
}

/** Sample photography carries an explicit flag; older seeds are recognised by their credit line. */
export const isDemoPhoto = (ph: PropertyPhoto): boolean => ph.demo === true || ph.credit === 'Unsplash · demo photograph';

/** Photographs that are the listing's own: published and not a sample. */
export function realPhotos(p: WithPhotos): PropertyPhoto[] {
  return allPhotos(p).filter((ph) => ph.published && !!ph.url && !isDemoPhoto(ph));
}

export function publishedPhotos(p: WithPhotos): PropertyPhoto[] {
  return allPhotos(p).filter((ph) => ph.published && !!ph.url);
}

export function coverPhoto(p: WithPhotos): PropertyPhoto | null {
  return publishedPhotos(p)[0] ?? null;
}

/**
 * Width hint for photograph URLs that accept one (Unsplash-style demo photography).
 * Uploaded and Blob-stored photographs are served exactly as stored.
 */
export function photoSrc(url: string, width: number): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('auto', 'format'); u.searchParams.set('fit', 'crop'); u.searchParams.set('q', '80'); u.searchParams.set('w', String(width)); u.searchParams.delete('h');
      return u.toString();
    }
  } catch { /* relative upload path */ }
  return url;
}

export const toRoman = (n: number) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n - 1] ?? String(n);
