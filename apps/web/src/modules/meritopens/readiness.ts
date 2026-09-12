import 'server-only';
import { db } from '@/lib/db';
import { safeJson } from '@/lib/format';
import { latestRuleset, parseConfig, eligibleStates, type OpenFull } from './queries';
import type { PropertyPhoto } from '@/lib/photos';

export interface ReadinessItem { key: string; label: string; ok: boolean; detail: string; href: string; owner: 'admin' | 'author' | 'administrator' | 'counsel' }
export interface Readiness { items: ReadinessItem[]; ok: number; total: number; locked: boolean }

const isPlaceholder = (v: string | null | undefined) => !v || v.startsWith('[');
const EXPECTED_ITEMS: Record<string, number> = { r1: 1, r2: 10, r3: 12, final: 1, tiebreak_1: 1, tiebreak_2: 1 };

/** Everything still needed before the Administrator can lock and registration can open. */
export async function readiness(open: OpenFull): Promise<Readiness> {
  const p = open.property; const cfg = parseConfig(latestRuleset(open)); const states = eligibleStates(open);
  const photos = safeJson<PropertyPhoto[]>(p.photosJson, []).filter((x) => x.published);
  const stateRules = await db.stateRule.findMany({ where: { code: { in: states } } });
  const forms = await db.form.findMany({ where: { meritOpenId: open.id }, include: { items: { select: { id: true, scoringSpecJson: true } } } });
  const items: ReadinessItem[] = [];
  const add = (key: string, label: string, ok: boolean, detail: string, href: string, owner: ReadinessItem['owner']) => items.push({ key, label, ok, detail, href, owner });
  const prop = `/admin/properties/${p.id}`; const openPath = `/admin/opens/${open.id}`;

  if (!open.isPractice) {
    add('geo', 'Property located on the map', typeof p.latitude === 'number' && typeof p.longitude === 'number', 'Coordinates drive the map, distances, and the sun plate.', prop, 'admin');
    add('facts', 'Core facts entered', !!(p.beds && p.baths && p.sqft && p.yearBuilt), 'Beds, baths, interior area, and year built.', prop, 'admin');
    add('title', 'Title recorded and linked', p.titleStatus === 'owned' && !!p.countyRecorderUrl && !isPlaceholder(p.speEntityName), p.titleStatus === 'owned' ? 'Add the county recorder link and the SPE name.' : `Title is ${p.titleStatus.replace(/_/g, ' ')}; registration needs owned title or an Administrator override.`, prop, 'admin');
    add('appraisal', 'Appraisal on file', !!p.appraisedValueCents && !!p.appraisalDate && !isPlaceholder(p.appraiserName) && !!p.appraisalReportUrl, 'Value, date, appraiser, and a report link.', prop, 'admin');
    add('photos', 'Photography published', photos.length > 0, photos.length ? `${photos.length} published.` : 'Upload and mark photos published after counsel approval; the vicinity map stands in on cards and the cover until then.', prop, 'counsel');
    add('plans', 'Plate set assigned', !!p.planSetKey, 'Floor plan, site plan, and elevation, or leave pending.', prop, 'admin');
    add('approved', 'Neighborhood and nearby claims approved', !!p.factsApprovedAt && !!p.description, 'Counsel approves the factual claims; until then they render as pending.', prop, 'counsel');
    add('costs', 'Cost to hold entered', p.taxAnnualCents !== null && p.insuranceAnnualCents !== null, 'Property tax and insurance estimates with sources.', prop, 'admin');
  }
  add('states', 'Eligible states chosen', states.length > 0, states.join(', ') || 'None yet.', openPath, 'counsel');
  const missingDisclosures = stateRules.filter((r) => r.disclosureTemplate && !(cfg?.disclosures ?? []).some((d) => d.jurisdiction === r.code)).map((r) => r.code);
  add('disclosures', 'State disclosures present', missingDisclosures.length === 0, missingDisclosures.length ? `Missing disclosure blocks for ${missingDisclosures.join(', ')}.` : 'Every eligible state with a template has a block.', `${openPath}/rules`, 'counsel');
  add('window', 'Registration window set', !!open.registrationOpenAt && !!open.registrationCloseAt, 'Immutable after lock.', openPath, 'admin');
  add('ruleset', 'Ruleset drafted and valid', !!cfg, cfg ? `Version ${latestRuleset(open)?.version}.` : 'Draft the configuration and rules text.', `${openPath}/rules`, 'admin');
  for (const r of open.rounds) {
    const f = forms.find((x) => x.id === r.formId); const res = forms.find((x) => x.id === r.reserveFormId);
    const need = EXPECTED_ITEMS[r.number] ?? 1; const has = f?.items.length ?? 0; const hasRes = res?.items.length ?? 0;
    const okItems = has >= need && (r.number.startsWith('tiebreak') || hasRes >= need);
    add(`items-${r.number}`, `${r.number.toUpperCase()} items authored`, okItems, `${has}/${need} primary${r.number.startsWith('tiebreak') ? '' : ` · ${hasRes}/${need} reserve`}${f ? '' : ' · no primary form'}`, f ? `${openPath}/forms/${f.id}` : `${openPath}/rounds`, 'author');
  }
  add('locked', 'Locked by the Administrator', !!open.lockedAt, open.lockedAt ? 'Rules and keys are sealed and hashed.' : 'The lock ceremony runs once every item above is done.', `/administrator/opens/${open.id}/lock`, 'administrator');
  return { items, ok: items.filter((i) => i.ok).length, total: items.length, locked: !!open.lockedAt };
}
