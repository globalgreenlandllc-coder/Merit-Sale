/**
 * NOAA solar position equations (Meeus). Pure math, no network. Used for the
 * "sun and light" plate: sunrise, sunset, and daylight hours for a latitude/longitude.
 */
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function julianDay(date: Date): number { return date.getTime() / 86400000 + 2440587.5; }

function solarParams(jd: number) {
  const t = (jd - 2451545) / 36525;
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C = Math.sin(rad(M)) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * t) + Math.sin(rad(3 * M)) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  return { decl, eqTime };
}

export interface SunTimes { sunrise: Date | null; sunset: Date | null; dayLengthMinutes: number; solarNoon: Date }

/** Sunrise/sunset (UTC instants) for the civil day containing `date` at the given location. */
export function sunTimes(lat: number, lng: number, date: Date): SunTimes {
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const { decl, eqTime } = solarParams(julianDay(dayStart) + 0.5);
  const cosHa = (Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(decl)))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
  const noonMin = 720 - 4 * lng - eqTime;
  const solarNoon = new Date(dayStart.getTime() + noonMin * 60000);
  if (cosHa > 1) return { sunrise: null, sunset: null, dayLengthMinutes: 0, solarNoon };
  if (cosHa < -1) return { sunrise: null, sunset: null, dayLengthMinutes: 1440, solarNoon };
  const ha = deg(Math.acos(cosHa));
  const sunrise = new Date(dayStart.getTime() + (noonMin - ha * 4) * 60000);
  const sunset = new Date(dayStart.getTime() + (noonMin + ha * 4) * 60000);
  return { sunrise, sunset, dayLengthMinutes: ha * 8, solarNoon };
}

/** Daylight hours on the 21st of each month for a year. */
export function daylightByMonth(lat: number, lng: number, year: number): number[] {
  return Array.from({ length: 12 }, (_, m) => sunTimes(lat, lng, new Date(Date.UTC(year, m, 21, 12))).dayLengthMinutes / 60);
}

/** Sun azimuth (degrees from north, clockwise) and altitude at an instant. */
export function sunPosition(lat: number, lng: number, at: Date): { azimuth: number; altitude: number } {
  const { decl, eqTime } = solarParams(julianDay(at));
  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes() + at.getUTCSeconds() / 60;
  const trueSolarTime = (minutes + eqTime + 4 * lng + 1440) % 1440;
  const ha = trueSolarTime / 4 - 180;
  const zenith = deg(Math.acos(Math.sin(rad(lat)) * Math.sin(rad(decl)) + Math.cos(rad(lat)) * Math.cos(rad(decl)) * Math.cos(rad(ha))));
  const altitude = 90 - zenith;
  let az = deg(Math.acos(((Math.sin(rad(lat)) * Math.cos(rad(zenith))) - Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.sin(rad(zenith)))));
  az = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
  return { azimuth: az, altitude };
}

export function tzForState(state: string | null | undefined): string {
  switch (state) {
    case 'AZ': return 'America/Phoenix';
    case 'ID': return 'America/Boise';
    case 'MT': case 'WY': case 'CO': case 'UT': case 'NM': return 'America/Denver';
    case 'WA': case 'OR': case 'CA': case 'NV': return 'America/Los_Angeles';
    case 'AK': return 'America/Anchorage'; case 'HI': return 'Pacific/Honolulu';
    case 'TX': case 'OK': case 'KS': case 'NE': case 'SD': case 'ND': case 'MN': case 'IA': case 'MO': case 'AR': case 'LA': case 'MS': case 'AL': case 'WI': case 'IL': case 'TN': return 'America/Chicago';
    default: return 'America/New_York';
  }
}

/** Civil date (Y/M/D at local noon, as a UTC instant) for an instant in a timezone. */
export function localCivilDay(now: Date, tz: string): { day: Date; month: number } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now).map((p) => [p.type, p.value]));
  return { day: new Date(Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, 12)), month: +parts.month! - 1 };
}
