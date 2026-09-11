import { assertRole, Forbidden } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/** Address → coordinates via OpenStreetMap Nominatim (usage policy: identified, light use). Admin only. */
export async function GET(req: Request) {
  try { await assertRole(['admin']); } catch (e) { if (e instanceof Forbidden) return Response.json({ error: e.message }, { status: 403 }); throw e; }
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 6) return Response.json({ error: 'Enter a fuller address' }, { status: 400 });
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'jsonv2', limit: '1', addressdetails: '1', countrycodes: 'us' })}`;
  const r = await fetch(url, { headers: { 'user-agent': `EarnTheKeys/0.1 (admin geocoder; ${process.env.NEXT_PUBLIC_SITE_URL ?? 'local'})`, accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) return Response.json({ error: `Geocoder responded ${r.status}` }, { status: 502 });
  const rows = (await r.json()) as { lat: string; lon: string; display_name: string; address?: Record<string, string> }[];
  const hit = rows[0];
  if (!hit) return Response.json({ error: 'No match. Add the city and state, or set coordinates by hand.' }, { status: 404 });
  const a = hit.address ?? {};
  const state = a.state ? stateCode(a.state) : null;
  return Response.json({ lat: Number(hit.lat), lng: Number(hit.lon), display: hit.display_name, city: a.city ?? a.town ?? a.village ?? a.hamlet ?? null, county: (a.county ?? '').replace(/ County$/i, '') || null, state, zip: a.postcode ?? null, attribution: '© OpenStreetMap contributors' });
}

const STATES: Record<string, string> = { alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY' };
function stateCode(name: string): string | null { return STATES[name.toLowerCase()] ?? (name.length === 2 ? name.toUpperCase() : null); }
