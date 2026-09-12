'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertRole } from '@/lib/auth/guards';
import { proposeSchedule, slugify } from '@/lib/listing';
import { OFFICIAL_RULES_DRAFT } from '@/lib/legal/drafts';
import { CANCELLATION_REASONS, RulesetConfigSchema } from '@etk/rules-config';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => { const v = str(fd, k); if (!v) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const date = (fd: FormData, k: string) => { const v = str(fd, k); return v ? new Date(v) : null; };
function fail(msg: string): never { redirect(`/admin/listings/new?error=${encodeURIComponent(msg)}`); }

/**
 * Smart intake: creates the property, its Merit Open (draft, numbered), a proposed round
 * schedule at sane hours, primary and reserve forms for every round, and a draft ruleset
 * from the counsel template. Everything stays editable until the Administrator locks it.
 */
export async function createListingAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const name = str(formData, 'name'); const address = str(formData, 'address'); const city = str(formData, 'city'); const state = str(formData, 'state').toUpperCase();
  if (!name || !address || !city || state.length !== 2) fail('Property name, address, city, and a two-letter state are required.');
  const closeAt = date(formData, 'registrationCloseAt'); const openAt = date(formData, 'registrationOpenAt');
  if (!openAt || !closeAt || closeAt <= openAt) fail('Registration open and close must be set, with close after open.');
  const states = str(formData, 'eligibleStates').split(',').map((x) => x.trim().toUpperCase()).filter((x) => x.length === 2);
  if (!states.length) fail('Choose at least one eligible state.');
  const fee = Math.round((num(formData, 'registrationFee') ?? 25) * 100); const cash = Math.round((num(formData, 'cashComponent') ?? 0) * 100);
  const N = num(formData, 'advanceN') ?? 2000; const M = num(formData, 'advanceM') ?? 100;
  const dollars = (k: string) => { const v = num(formData, k); return v === null ? null : Math.round(v * 100); };

  const propertySlug = await uniqueSlug('property', slugify(str(formData, 'propertySlug') || name));
  const property = await db.property.create({ data: {
    slug: propertySlug, name, address, city, state, zip: str(formData, 'zip') || null, county: str(formData, 'county') || null,
    latitude: num(formData, 'latitude'), longitude: num(formData, 'longitude'),
    speEntityName: str(formData, 'speEntityName') || null, titleStatus: str(formData, 'titleStatus') || 'under_option',
    beds: num(formData, 'beds'), baths: num(formData, 'baths'), sqft: num(formData, 'sqft'), lotSqft: num(formData, 'lotSqft'), yearBuilt: num(formData, 'yearBuilt'), stories: num(formData, 'stories'), garageSpaces: num(formData, 'garageSpaces'),
    propertyType: str(formData, 'propertyType') || null, heating: str(formData, 'heating') || null, cooling: str(formData, 'cooling') || null, roof: str(formData, 'roof') || null, exterior: str(formData, 'exterior') || null,
    appraisedValueCents: dollars('appraisedValue'), appraisalDate: date(formData, 'appraisalDate'), appraiserName: str(formData, 'appraiserName') || null,
    taxAnnualCents: dollars('taxAnnual'), insuranceAnnualCents: dollars('insuranceAnnual'), hoaMonthlyCents: dollars('hoaMonthly'), utilitiesMonthlyCents: dollars('utilitiesMonthly'),
    description: str(formData, 'description') || null, status: 'preview',
    historyJson: JSON.stringify([{ date: new Date().toISOString(), event: 'Listing created', source: 'Sponsor' }]),
  } });

  const openName = str(formData, 'openName') || `The ${city} Merit Open`;
  const openSlug = await uniqueSlug('open', slugify(str(formData, 'openSlug') || city));
  const year = new Date().getUTCFullYear();
  const seq = (await db.meritOpen.count({ where: { listingNo: { startsWith: `ETK-${year}-` } } })) + 1;
  const open = await db.meritOpen.create({ data: {
    slug: openSlug, name: openName, city, propertyId: property.id, listingNo: `ETK-${year}-${String(seq).padStart(3, '0')}`,
    stateEligibilityJson: JSON.stringify(states), registrationFeeCents: fee, cashComponentCents: cash, reservationTarget: num(formData, 'reservationTarget'), registrationTarget: num(formData, 'registrationTarget') ?? num(formData, 'reservationTarget'),
    registrationOpenAt: openAt, registrationCloseAt: closeAt, firstAccessHours: 72, advanceN: N, advanceM: M, status: 'draft',
  } });

  // rounds + forms from the proposed schedule
  const sch = proposeSchedule(closeAt);
  const form = (round: string, label: 'primary' | 'reserve' | 'tiebreak') => db.form.create({ data: { meritOpenId: open.id, roundNumber: round, label } });
  const rounds: { number: string; sequence: number; type: string; windowStart?: Date; windowEnd?: Date; scheduledAt?: Date; durationSeconds: number; integrityTier: number; capacity?: number; reserve: boolean; label: 'primary' | 'tiebreak' }[] = [
    { number: 'r1', sequence: 1, type: 'qualifier', windowStart: sch.r1[0], windowEnd: sch.r1[1], durationSeconds: 60, integrityTier: 1, reserve: true, label: 'primary' },
    { number: 'r2', sequence: 2, type: 'items', windowStart: sch.r2[0], windowEnd: sch.r2[1], durationSeconds: 600, integrityTier: 1, capacity: N, reserve: true, label: 'primary' },
    { number: 'r3', sequence: 3, type: 'proctored', scheduledAt: sch.r3, durationSeconds: 5400, integrityTier: 2, capacity: M, reserve: true, label: 'primary' },
    { number: 'final', sequence: 4, type: 'optimization', scheduledAt: sch.final, durationSeconds: 10800, integrityTier: 3, reserve: true, label: 'primary' },
    { number: 'tiebreak_1', sequence: 5, type: 'tiebreak', scheduledAt: sch.tiebreak1, durationSeconds: 3600, integrityTier: 3, reserve: false, label: 'tiebreak' },
    { number: 'tiebreak_2', sequence: 6, type: 'tiebreak', scheduledAt: sch.tiebreak2, durationSeconds: 3600, integrityTier: 3, reserve: false, label: 'tiebreak' },
  ];
  for (const r of rounds) {
    const primary = await form(r.number, r.label); const reserve = r.reserve ? await form(r.number, 'reserve') : null;
    await db.round.create({ data: { meritOpenId: open.id, number: r.number, sequence: r.sequence, type: r.type, windowStart: r.windowStart ?? null, windowEnd: r.windowEnd ?? null, scheduledAt: r.scheduledAt ?? null, durationSeconds: r.durationSeconds, latencyGraceSeconds: 3, integrityTier: r.integrityTier, capacity: r.capacity ?? null, formId: primary.id, reserveFormId: reserve?.id ?? null } });
  }

  // draft ruleset from the counsel template
  const config = RulesetConfigSchema.parse({
    version: '1.0', meritOpenSlug: openSlug, registrationFeeCents: fee, cashComponentCents: cash, eligibleStates: states, minimumAge: 18,
    registrationOpenAt: openAt.toISOString(), registrationCloseAt: closeAt.toISOString(),
    rounds: [
      { number: 'r1', windowStart: sch.r1[0].toISOString(), windowEnd: sch.r1[1].toISOString(), durationSeconds: 60, integrityTier: 1, itemCount: 1 },
      { number: 'r2', windowStart: sch.r2[0].toISOString(), windowEnd: sch.r2[1].toISOString(), durationSeconds: 600, integrityTier: 1, itemCount: 10 },
      { number: 'r3', scheduledAt: sch.r3.toISOString(), durationSeconds: 5400, integrityTier: 2, itemCount: 12 },
      { number: 'final', scheduledAt: sch.final.toISOString(), durationSeconds: 10800, integrityTier: 3, itemCount: 1 },
    ],
    advanceN: N, advanceM: M, tieOrderSubsets: { r2: [8, 9, 10], r3: [10, 11, 12] }, r1LatencyGraceSeconds: 3, disputeWindowHours: 72, refundSlaDays: 30, firstAccessHours: 72, certificationDays: 14, closingDays: 60,
    retention: { scoresKeysCertificationsYears: 7, proctoringMediaMonthsPostClosing: 12 },
    technicalFailurePolicy: 'Exhibit E: a verified platform or proctoring failure is remedied by re-administering the affected round to all affected registrants with the committed reserve form. No score is ever adjusted.',
    accommodationPolicy: 'Rules 8.7: extended time and assistive technology where reasonable; requests due 7 days before the round; never alters items, keys, or scoring.', accommodationRequestDeadlineDays: 7,
    cancellationReasonCodes: CANCELLATION_REASONS.map((r) => ({ code: r.code, description: r.description })), termsVersion: '1.0', privacyVersion: '1.0', disclosures: [],
    parties: { sponsor: '[SPONSOR LEGAL NAME]', propertyOwner: str(formData, 'speEntityName') || '[PROPERTY SPE LEGAL NAME]', administrator: '[ADMINISTRATOR COMPANY NAME]', custodian: '[CUSTODIAN NAME]', titleCompany: '[TITLE COMPANY]' },
  });
  await db.ruleset.create({ data: { meritOpenId: open.id, version: '1.0', configJson: JSON.stringify(config), officialRulesText: OFFICIAL_RULES_DRAFT, termsVersion: '1.0' } });

  await audit({ actorId: s.userId, actorRole: s.role, action: 'listing.create', objectType: 'MeritOpen', objectId: open.id, after: { property: property.id, listingNo: open.listingNo, slug: openSlug, states, fee, cash } });
  redirect(`/admin/opens/${open.id}?created=1`);
}

async function uniqueSlug(kind: 'property' | 'open', base: string): Promise<string> {
  let slug = base || kind; let i = 2;
  const exists = async (v: string) => (kind === 'property' ? db.property.findUnique({ where: { slug: v } }) : db.meritOpen.findUnique({ where: { slug: v } }));
  while (await exists(slug)) slug = `${base}-${i++}`;
  return slug;
}
