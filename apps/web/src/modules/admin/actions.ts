'use server';
import { redirect } from 'next/navigation';
import { validateItem, type AuthoredItemInput } from '@etk/items';
import { RulesetConfigSchema } from '@etk/rules-config';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertRole } from '@/lib/auth/guards';
import { getPaymentProvider } from '@/lib/providers/payments';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => { const v = Number(str(fd, k)); return Number.isFinite(v) ? v : null; };
const date = (fd: FormData, k: string) => { const v = str(fd, k); return v ? new Date(v) : null; };
function fail(path: string, msg: string): never { redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`); }
const jsonArray = (fd: FormData, k: string) => { const v = str(fd, k) || '[]'; try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? JSON.stringify(parsed) : '[]'; } catch { return '[]'; } };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function savePropertyAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const id = str(formData, 'id');
  const name = str(formData, 'name');
  if (!name) fail('/admin/properties', 'Name required');
  const data = {
    name, slug: str(formData, 'slug') || slugify(name), address: str(formData, 'address'), city: str(formData, 'city'), state: str(formData, 'state').toUpperCase(), zip: str(formData, 'zip') || null,
    speEntityName: str(formData, 'speEntityName') || null, legalDescription: str(formData, 'legalDescription') || null, countyRecorderRef: str(formData, 'countyRecorderRef') || null, countyRecorderUrl: str(formData, 'countyRecorderUrl') || null,
    deedRecordedAt: date(formData, 'deedRecordedAt'), titleStatus: str(formData, 'titleStatus') || 'under_option',
    appraisedValueCents: num(formData, 'appraisedValue') !== null ? Math.round(num(formData, 'appraisedValue')! * 100) : null, appraisalDate: date(formData, 'appraisalDate'), appraiserName: str(formData, 'appraiserName') || null,
    beds: num(formData, 'beds'), baths: num(formData, 'baths'), sqft: num(formData, 'sqft'), lotSqft: num(formData, 'lotSqft'), yearBuilt: num(formData, 'yearBuilt'),
    description: str(formData, 'description') || null, neighborhood: str(formData, 'neighborhood') || null,
    includedItemsJson: JSON.stringify(str(formData, 'includedItems').split('\n').map((x) => x.trim()).filter(Boolean)),
    excludedItemsJson: JSON.stringify(str(formData, 'excludedItems').split('\n').map((x) => x.trim()).filter(Boolean)),
    disclosuresPackUrl: str(formData, 'disclosuresPackUrl') || null, status: str(formData, 'status') || 'draft',
    county: str(formData, 'county') || null, latitude: num(formData, 'latitude'), longitude: num(formData, 'longitude'), planSetKey: str(formData, 'planSetKey') || null,
    appraisalReportUrl: str(formData, 'appraisalReportUrl') || null, propertyType: str(formData, 'propertyType') || null, stories: num(formData, 'stories'), garageSpaces: num(formData, 'garageSpaces'), fireplaces: num(formData, 'fireplaces'),
    heating: str(formData, 'heating') || null, cooling: str(formData, 'cooling') || null, roof: str(formData, 'roof') || null, exterior: str(formData, 'exterior') || null, foundation: str(formData, 'foundation') || null,
    waterSource: str(formData, 'waterSource') || null, sewer: str(formData, 'sewer') || null, floodZone: str(formData, 'floodZone') || null, lotDimensions: str(formData, 'lotDimensions') || null, parking: str(formData, 'parking') || null,
    parcelNumber: str(formData, 'parcelNumber') || null, zoning: str(formData, 'zoning') || null, schoolDistrict: str(formData, 'schoolDistrict') || null,
    taxAnnualCents: num(formData, 'taxAnnual') !== null ? Math.round(num(formData, 'taxAnnual')! * 100) : null, insuranceAnnualCents: num(formData, 'insuranceAnnual') !== null ? Math.round(num(formData, 'insuranceAnnual')! * 100) : null,
    hoaMonthlyCents: num(formData, 'hoaMonthly') !== null ? Math.round(num(formData, 'hoaMonthly')! * 100) : null, utilitiesMonthlyCents: num(formData, 'utilitiesMonthly') !== null ? Math.round(num(formData, 'utilitiesMonthly')! * 100) : null,
    factsApprovedAt: date(formData, 'factsApprovedAt'), nearbyJson: jsonArray(formData, 'nearbyJson'), anchorsJson: jsonArray(formData, 'anchorsJson'), historyJson: jsonArray(formData, 'historyJson'),
  };
  const before = id ? await db.property.findUnique({ where: { id } }) : null;
  const row = id ? await db.property.update({ where: { id }, data }) : await db.property.create({ data });
  await audit({ actorId: s.userId, actorRole: s.role, action: id ? 'property.update' : 'property.create', objectType: 'Property', objectId: row.id, before: before ? { titleStatus: before.titleStatus, status: before.status } : undefined, after: { titleStatus: data.titleStatus, status: data.status } });
  redirect(`/admin/properties/${row.id}`);
}

/** Merit Open config is editable only before lock (spec §1). */
export async function saveMeritOpenAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const id = str(formData, 'id');
  const existing = id ? await db.meritOpen.findUnique({ where: { id } }) : null;
  if (existing?.lockedAt) fail(`/admin/opens/${id}`, 'This Merit Open is locked. Post-lock changes go through the Administrator correction workflow (Rules 13.2).');
  const name = str(formData, 'name');
  const propertyId = str(formData, 'propertyId');
  if (!name || !propertyId) fail('/admin/opens', 'Name and property required');
  const data = {
    name, slug: str(formData, 'slug') || slugify(name), propertyId, city: str(formData, 'city'), isPractice: formData.get('isPractice') === 'on',
    stateEligibilityJson: JSON.stringify(str(formData, 'eligibleStates').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)),
    registrationFeeCents: Math.round((num(formData, 'registrationFee') ?? 0) * 100), cashComponentCents: Math.round((num(formData, 'cashComponent') ?? 0) * 100),
    reservationTarget: num(formData, 'reservationTarget'), showReservationCount: formData.get('showReservationCount') === 'on',
    registrationOpenAt: date(formData, 'registrationOpenAt'), registrationCloseAt: date(formData, 'registrationCloseAt'), firstAccessHours: num(formData, 'firstAccessHours') ?? 72,
    advanceN: num(formData, 'advanceN') ?? 2000, advanceM: num(formData, 'advanceM') ?? 100,
  };
  let row;
  if (id) row = await db.meritOpen.update({ where: { id }, data });
  else {
    const year = new Date().getUTCFullYear();
    const seq = (await db.meritOpen.count({ where: { listingNo: { startsWith: `ETK-${year}-` } } })) + 1;
    row = await db.meritOpen.create({ data: { ...data, status: 'draft', listingNo: `ETK-${year}-${String(seq).padStart(3, '0')}` } });
  }
  await audit({ actorId: s.userId, actorRole: s.role, action: id ? 'meritopen.update' : 'meritopen.create', objectType: 'MeritOpen', objectId: row.id, after: { fee: data.registrationFeeCents, closeAt: data.registrationCloseAt } });
  redirect(`/admin/opens/${row.id}`);
}

export async function adminTransitionAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const id = str(formData, 'openId');
  const open = await db.meritOpen.findUniqueOrThrow({ where: { id } });
  // admins may only move draft → reservation; everything after that is the Administrator's
  if (open.status !== 'draft') fail(`/admin/opens/${id}`, 'Only draft → reservation is an admin transition.');
  await db.meritOpen.update({ where: { id }, data: { status: 'reservation' } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'meritopen.transition', objectType: 'MeritOpen', objectId: id, before: { status: 'draft' }, after: { status: 'reservation' } });
  redirect(`/admin/opens/${id}`);
}

export async function saveRulesetAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const openId = str(formData, 'openId');
  const path = `/admin/opens/${openId}/rules`;
  const open = await db.meritOpen.findUniqueOrThrow({ where: { id: openId } });
  if (open.lockedAt) fail(path, 'Locked rulesets are immutable.');
  const configRaw = str(formData, 'configJson');
  let parsed;
  try { parsed = RulesetConfigSchema.parse(JSON.parse(configRaw)); } catch (e) { fail(path, `Config invalid: ${e instanceof Error ? e.message.slice(0, 200) : 'parse error'}`); }
  const version = str(formData, 'version') || '1.0';
  const officialRulesText = str(formData, 'officialRulesText');
  const termsVersion = str(formData, 'termsVersion') || parsed.termsVersion;
  const row = await db.ruleset.upsert({
    where: { meritOpenId_version: { meritOpenId: openId, version } },
    create: { meritOpenId: openId, version, configJson: JSON.stringify(parsed), officialRulesText, termsVersion },
    update: { configJson: JSON.stringify(parsed), officialRulesText, termsVersion },
  });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'ruleset.save', objectType: 'Ruleset', objectId: row.id, after: { version } });
  redirect(path);
}

export async function saveRoundAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const openId = str(formData, 'openId');
  const path = `/admin/opens/${openId}/rounds`;
  const open = await db.meritOpen.findUniqueOrThrow({ where: { id: openId } });
  if (open.lockedAt) fail(path, 'Round schedule is locked. Use the Administrator re-administration workflow.');
  const number = str(formData, 'number');
  const id = str(formData, 'id');
  const data = {
    number, sequence: num(formData, 'sequence') ?? 1, type: str(formData, 'type') || 'items',
    windowStart: date(formData, 'windowStart'), windowEnd: date(formData, 'windowEnd'), scheduledAt: date(formData, 'scheduledAt'),
    durationSeconds: num(formData, 'durationSeconds') ?? 600, latencyGraceSeconds: num(formData, 'latencyGraceSeconds') ?? 3, integrityTier: num(formData, 'integrityTier') ?? 1, capacity: num(formData, 'capacity'),
    formId: str(formData, 'formId') || null, reserveFormId: str(formData, 'reserveFormId') || null,
  };
  const row = id ? await db.round.update({ where: { id }, data }) : await db.round.create({ data: { ...data, meritOpenId: openId } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'round.save', objectType: 'Round', objectId: row.id, after: data });
  redirect(path);
}

export async function createFormAction(formData: FormData) {
  const s = await assertRole(['admin', 'item_author']);
  const openId = str(formData, 'openId');
  const roundNumber = str(formData, 'roundNumber');
  const label = str(formData, 'label') || 'primary';
  const f = await db.form.create({ data: { meritOpenId: openId, roundNumber, label } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'form.create', objectType: 'Form', objectId: f.id, after: { roundNumber, label } });
  redirect(`/admin/opens/${openId}/forms/${f.id}`);
}

/** Item authoring in the sealed workspace: validated on save; keys readable only before lock. */
export async function saveItemAction(formData: FormData) {
  const s = await assertRole(['admin', 'item_author']);
  const formId = str(formData, 'formId');
  const openId = str(formData, 'openId');
  const path = `/admin/opens/${openId}/forms/${formId}`;
  const form = await db.form.findUniqueOrThrow({ where: { id: formId } });
  if (form.hashPublishedAt) fail(path, 'This form is sealed. Items cannot change after lock.');
  const id = str(formData, 'id');
  let scoring: unknown;
  try { scoring = JSON.parse(str(formData, 'scoringJson')); } catch { fail(path, 'Scoring spec must be valid JSON.'); }
  const input: AuthoredItemInput = {
    id: id || `new-${Date.now()}`, position: num(formData, 'position') ?? 1, prompt: str(formData, 'prompt'), inputType: str(formData, 'inputType') as AuthoredItemInput['inputType'],
    scoring: scoring as AuthoredItemInput['scoring'], maxPoints: num(formData, 'maxPoints') ?? 1, tieOrderFlag: formData.get('tieOrderFlag') === 'on', calculatorPermitted: formData.get('calculatorPermitted') === 'on',
    inputHint: str(formData, 'inputHint') || undefined, fields: str(formData, 'fieldsJson') ? JSON.parse(str(formData, 'fieldsJson')) : undefined,
  };
  const v = validateItem(input);
  if (!v.ok) fail(path, v.problems.join('; '));
  const data = { position: input.position, prompt: input.prompt, inputType: input.inputType, scoringSpecJson: JSON.stringify(scoring), maxPoints: input.maxPoints, tieOrderFlag: !!input.tieOrderFlag, calculatorPermitted: !!input.calculatorPermitted, inputHint: input.inputHint ?? null, fieldsJson: input.fields ? JSON.stringify(input.fields) : null };
  const row = id ? await db.item.update({ where: { id }, data }) : await db.item.create({ data: { ...data, formId } });
  await audit({ actorId: s.userId, actorRole: s.role, action: id ? 'item.update' : 'item.create', objectType: 'Item', objectId: row.id, after: { position: data.position, inputType: data.inputType } });
  redirect(path);
}

export async function deleteItemAction(formData: FormData) {
  const s = await assertRole(['admin', 'item_author']);
  const id = str(formData, 'id');
  const openId = str(formData, 'openId');
  const item = await db.item.findUniqueOrThrow({ where: { id }, include: { form: true } });
  if (item.form.hashPublishedAt) fail(`/admin/opens/${openId}/forms/${item.formId}`, 'Sealed.');
  await db.item.delete({ where: { id } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'item.delete', objectType: 'Item', objectId: id });
  redirect(`/admin/opens/${openId}/forms/${item.formId}`);
}

export async function saveStateRuleAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const code = str(formData, 'code').toUpperCase();
  const data = { name: str(formData, 'name') || code, eligible: formData.get('eligible') === 'on', disclosureTemplate: str(formData, 'disclosureTemplate') || null, counselStatus: str(formData, 'counselStatus') || 'not_reviewed', notes: str(formData, 'notes') || null };
  await db.stateRule.upsert({ where: { code }, create: { code, ...data }, update: data });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'state.save', objectType: 'StateRule', objectId: code, after: data });
  redirect('/admin/states');
}

export async function addExclusionAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const row = await db.exclusionEntry.create({ data: { matchType: str(formData, 'matchType') || 'email', value: str(formData, 'value').toLowerCase(), category: str(formData, 'category') || 'employee', party: str(formData, 'party') || 'Sponsor', addedById: s.userId } });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'exclusion.add', objectType: 'ExclusionEntry', objectId: row.id, after: { matchType: row.matchType, category: row.category } });
  redirect('/admin/exclusions');
}

export async function saveVendorAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const id = str(formData, 'id');
  const data = { kind: str(formData, 'kind'), name: str(formData, 'name'), publicSummaryUrl: str(formData, 'publicSummaryUrl') || null, active: formData.get('active') === 'on', configJson: str(formData, 'configJson') || '{}' };
  const row = id ? await db.vendor.update({ where: { id }, data }) : await db.vendor.create({ data });
  await audit({ actorId: s.userId, actorRole: s.role, action: 'vendor.save', objectType: 'Vendor', objectId: row.id, after: { kind: data.kind, name: data.name } });
  redirect('/admin/vendors');
}

export async function retryRefundAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const id = str(formData, 'refundId');
  const refund = await db.refund.findUniqueOrThrow({ where: { id }, include: { payment: true } });
  const r = refund.payment.processorRef ? await getPaymentProvider().refund({ processorRef: refund.payment.processorRef, amountCents: refund.amountCents, reason: refund.reason }) : { ok: false, error: 'no processor ref' };
  await db.refund.update({ where: { id }, data: { status: r.ok ? 'completed' : 'failed', processorRef: r.ref ?? null, attemptedAt: new Date() } });
  if (r.ok) { await db.payment.update({ where: { id: refund.paymentId }, data: { status: 'refunded', refundedAt: new Date() } }); await db.registration.update({ where: { id: refund.payment.registrationId }, data: { status: 'refunded' } }); }
  await audit({ actorId: s.userId, actorRole: s.role, action: 'refund.retry', objectType: 'Refund', objectId: id, after: { ok: r.ok, error: r.ok ? undefined : r.error } });
  redirect('/admin/refunds');
}
