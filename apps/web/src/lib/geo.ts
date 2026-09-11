import 'server-only';
import { headers } from 'next/headers';
import { env } from '@/lib/env';

/** Best-effort state from CDN/edge headers; pinned locally by GEO_DEV_STATE. */
export async function detectState(): Promise<{ state: string | null; source: string }> {
  const h = await headers();
  const candidates: [string, string | null][] = [
    ['x-geo-state', h.get('x-geo-state')],
    ['x-vercel-ip-country-region', h.get('x-vercel-ip-country-region')],
    ['cf-region-code', h.get('cf-region-code')],
  ];
  for (const [source, v] of candidates) if (v && /^[A-Z]{2}$/i.test(v)) return { state: v.toUpperCase(), source };
  if (env.geoDevState) return { state: env.geoDevState.toUpperCase(), source: 'GEO_DEV_STATE' };
  return { state: null, source: 'none' };
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
}

export async function userAgent(): Promise<string | null> {
  const h = await headers();
  return h.get('user-agent');
}
