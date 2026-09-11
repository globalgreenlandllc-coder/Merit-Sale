import type { Property } from '@prisma/client';
import { Ledger } from '@/components/ui/Ledger';
import { Placeholder } from '@/components/ui/Placeholder';
import { SourceChip } from './SourceChip';
import { haversineMiles } from '@/lib/listing';
import { fmtDate, money, safeJson, sqft } from '@/lib/format';

export interface NearbyItem { label: string; kind: string; minutes: number; mode: 'walk' | 'drive' | 'bike' | 'transit'; source?: string; href?: string }
export interface HistoryItem { date: string; event: string; source: string; href?: string }
export interface Anchor { label: string; lat: number; lng: number }

const isPlaceholder = (v: string | null | undefined) => !v || v.startsWith('[');

/** Beds · baths · area · lot · year · stories · garage. Labels never wrap; values share a baseline. */
export function FactsStrip({ p, dark = false, limit, className = '' }: { p: Property; dark?: boolean; limit?: number; className?: string }) {
  const facts: [string, string | null][] = [
    ['Beds', p.beds?.toString() ?? null], ['Baths', p.baths?.toString() ?? null], ['Sq ft', p.sqft ? p.sqft.toLocaleString('en-US') : null], ['Lot sf', p.lotSqft ? p.lotSqft.toLocaleString('en-US') : null],
    ['Built', p.yearBuilt?.toString() ?? null], ['Stories', p.stories?.toString() ?? null], ['Garage', p.garageSpaces ? `${p.garageSpaces}-car` : null],
  ];
  const shown = facts.filter(([, v]) => v).slice(0, limit ?? facts.length);
  return (
    <dl className={`grid grid-cols-3 grid-rows-[auto_auto] gap-y-4 sm:grid-cols-5 ${className}`}>
      {shown.map(([k, v]) => (
        <div key={k} className={`grid grid-rows-subgrid row-span-2 border-l pl-3 ${dark ? 'border-paper/20' : 'border-ink/15'}`}><dt className={`${dark ? 'plate-dark' : 'plate'} self-end whitespace-nowrap`}>{k}</dt><dd className={`font-display tabular text-[24px] leading-none ${dark ? 'text-parchment' : 'text-ink'}`}>{v}</dd></div>
      ))}
    </dl>
  );
}

const ledgerTight = '[&>*]:!grid-cols-[6.5rem_minmax(0,1fr)] [&>*]:py-2.5 [&_dd]:min-w-0 [&_dd]:text-[14px]';

/** Three fact groups as an appraiser's card. Chips sit on their own line so nothing overflows. */
export function FactSheet({ p, titleVerified, appraisalPending }: { p: Property; titleVerified: boolean; appraisalPending: boolean }) {
  const val = (v: string | number | null | undefined) => (v === null || v === undefined ? '—' : isPlaceholder(String(v)) ? <Placeholder>{String(v)}</Placeholder> : v);
  const perSqft = p.appraisedValueCents && p.sqft ? money(Math.round(p.appraisedValueCents / p.sqft), { compact: true }) : null;
  return (
    <div className="grid gap-x-12 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
      <div><h3 className="plate mb-2 text-ink">Interior</h3><Ledger className={ledgerTight} rows={[{ term: 'Type', detail: val(p.propertyType) }, { term: 'Bedrooms', detail: val(p.beds) }, { term: 'Bathrooms', detail: val(p.baths) }, { term: 'Interior', detail: sqft(p.sqft) }, { term: 'Stories', detail: val(p.stories) }, { term: 'Fireplaces', detail: val(p.fireplaces) }, { term: 'Heating', detail: val(p.heating) }, { term: 'Cooling', detail: val(p.cooling) }]} /></div>
      <div><h3 className="plate mb-2 text-ink">Exterior &amp; lot</h3><Ledger className={ledgerTight} rows={[{ term: 'Lot', detail: sqft(p.lotSqft) }, { term: 'Lot dims', detail: val(p.lotDimensions) }, { term: 'Built', detail: val(p.yearBuilt) }, { term: 'Foundation', detail: val(p.foundation) }, { term: 'Roof', detail: val(p.roof) }, { term: 'Exterior', detail: val(p.exterior) }, { term: 'Parking', detail: val(p.parking) }, { term: 'Water', detail: val(p.waterSource) }, { term: 'Sewer', detail: val(p.sewer) }]} /></div>
      <div className="md:col-span-2 xl:col-span-1"><h3 className="plate mb-2 text-ink">Parcel &amp; record</h3><Ledger className={ledgerTight} rows={[
        { term: 'County', detail: val(p.county) }, { term: 'Zoning', detail: val(p.zoning) },
        { term: 'Parcel', detail: <><span className="block">{val(p.parcelNumber)}</span><SourceChip label="Assessor" pending /></> },
        { term: 'Flood zone', detail: <><span className="block">{val(p.floodZone)}</span><SourceChip label="FEMA FIRM" pending /></> },
        { term: 'Title', detail: <><span className="block">{titleVerified ? 'Held by' : p.titleStatus === 'owned' ? 'Recording pending · ' : `${p.titleStatus.replace(/_/g, ' ')} · `}{isPlaceholder(p.speEntityName) ? <Placeholder>{p.speEntityName ?? '[Property SPE LLC]'}</Placeholder> : p.speEntityName}</span><SourceChip label="County recorder" href={p.countyRecorderUrl} date={titleVerified && p.deedRecordedAt ? fmtDate(p.deedRecordedAt) : null} pending={!titleVerified} /></> },
        { term: 'Appraised', detail: <><span className="block">{money(p.appraisedValueCents)}{perSqft ? <span className="text-graphite"> · {perSqft}/sf</span> : null}</span><SourceChip label={isPlaceholder(p.appraiserName) ? '[Independent appraiser]' : p.appraiserName!} href={p.appraisalReportUrl} date={p.appraisalDate ? fmtDate(p.appraisalDate) : null} pending={appraisalPending} /></> },
        { term: 'Schools', detail: val(p.schoolDistrict) },
        { term: 'Disclosures', detail: p.disclosuresPackUrl ? <a className="link-rule" href={p.disclosuresPackUrl}>Disclosure pack ↗</a> : <SourceChip label="Disclosure pack" pending /> },
      ]} /></div>
    </div>
  );
}

/** Cost of ownership after closing as a three-column cost table. No mortgage line: conveyed free of monetary liens. */
export function OwnershipCosts({ p }: { p: Property }) {
  const tax = p.taxAnnualCents ?? null, ins = p.insuranceAnnualCents ?? null, hoa = p.hoaMonthlyCents ?? null, util = p.utilitiesMonthlyCents ?? null;
  const monthly = (tax ? tax / 12 : 0) + (ins ? ins / 12 : 0) + (hoa ?? 0) + (util ?? 0);
  const dollars = (c: number) => money(Math.round(c / 100) * 100);
  const rows: { term: string; annual: string | null; monthly: string | null; chip: React.ReactNode }[] = [
    { term: 'Property tax', annual: tax !== null ? dollars(tax) : null, monthly: tax !== null ? dollars(tax / 12) : null, chip: <SourceChip label={`${p.county ?? '[County]'} assessor`} pending /> },
    { term: 'Insurance', annual: ins !== null ? dollars(ins) : null, monthly: ins !== null ? dollars(ins / 12) : null, chip: <SourceChip label="Sponsor estimate" pending /> },
    { term: 'HOA', annual: hoa !== null ? (hoa === 0 ? 'None' : dollars(hoa * 12)) : null, monthly: hoa ? dollars(hoa) : hoa === 0 ? '—' : null, chip: <SourceChip label="Rules Exhibit D" pending /> },
    { term: 'Utilities', annual: util !== null ? dollars(util * 12) : null, monthly: util !== null ? dollars(util) : null, chip: <SourceChip label="Sponsor estimate" pending /> },
  ];
  const pendingAll = tax === null && ins === null;
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-end gap-x-4 border-b hair pb-3"><span className="plate">Cost to hold, after closing</span><span className="plate text-right">Annual</span><span className="plate text-right">Monthly</span></div>
      {rows.map((r) => (
        <div key={r.term} className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-baseline gap-x-4 border-b hair py-2.5 text-[14px]">
          <span className="min-w-0"><span className="block text-ink">{r.term}</span><span className="mt-0.5 block">{r.chip}</span></span>
          <span className="tabular text-right">{r.annual ?? <Placeholder>pending</Placeholder>}</span><span className="tabular text-right">{r.monthly ?? '—'}</span>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-baseline gap-x-4 border-b hair py-3"><span className="text-[14px] text-ink">Estimated monthly total</span><span /><span className="font-display tabular text-right text-[26px] leading-none">{pendingAll ? <span className="text-[16px] text-graphite">pending</span> : dollars(monthly)}</span></div>
      <p className="mt-3 text-[13px] text-slate">No mortgage: the home is conveyed free of monetary liens (Rules 6.1). The person who takes the keys also owes income tax on the prize (Rules 6.4); the cash component exists to help with it. A first full-year assessment on a new build may exceed the current bill.</p>
    </div>
  );
}

/** Straight-line distances to seeded anchors (haversine). */
export function DistancesLedger({ p }: { p: Property }) {
  const anchors = safeJson<Anchor[]>(p.anchorsJson, []);
  if (!anchors.length || typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return null;
  return (
    <div><h3 className="plate mb-3 text-ink">Distances, straight line</h3>
      <ul className="border-t hair">{anchors.map((a) => { const mi = haversineMiles(p.latitude!, p.longitude!, a.lat, a.lng); return <li key={a.label} className="flex items-baseline justify-between gap-4 border-b hair py-2.5 text-[14.5px]"><span>{a.label}</span><span className="font-mono text-[12.5px] text-slate">{mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi · {Math.round(mi * 1.609344)} km</span></li>; })}</ul>
      <p className="mt-2 text-[12px] text-graphite">Computed from coordinates; driving distances are longer.</p>
    </div>
  );
}

export function PropertyRecord({ p, extra = [] }: { p: Property; extra?: HistoryItem[] }) {
  const items = [...safeJson<HistoryItem[]>(p.historyJson, []), ...extra].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (!items.length) return <p className="text-[14px] text-graphite">No recorded events yet.</p>;
  return (
    <ol className="border-t hair">
      {items.map((h, i) => (
        <li key={i} className="grid gap-1 border-b hair py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:gap-4"><span className="font-mono text-[12px] text-graphite">{fmtDate(h.date)}</span><span className="text-[14.5px] text-ink">{h.event}</span><SourceChip label={h.source} href={h.href} pending={!h.href} /></li>
      ))}
    </ol>
  );
}

/** Title abstract: the instruments a buyer's attorney reads, bracketed until on file. */
export function TitleLedger({ p, titleVerified }: { p: Property; titleVerified: boolean }) {
  const liens = safeJson<string[]>(p.liensJson, []);
  const val = (v: string | null | undefined, fallback: string) => (isPlaceholder(v) ? <Placeholder>{v ?? fallback}</Placeholder> : v);
  return (
    <Ledger rows={[
      { term: 'Legal description', detail: val(p.legalDescription, '[Exhibit A — legal description]') },
      { term: 'Recording', detail: <>{val(p.countyRecorderRef, '[County recorder instrument no.]')}{titleVerified && p.deedRecordedAt ? ` · ${fmtDate(p.deedRecordedAt)}` : ' · recording pending'} <SourceChip label="County recorder" href={p.countyRecorderUrl} pending={!titleVerified} /></> },
      { term: 'Liens of record', detail: <>{liens.length ? liens.join(' · ') : 'None of record'} <SourceChip label="Title commitment" pending /></> },
      { term: 'Easements / CC&Rs', detail: <><Placeholder>[per title commitment]</Placeholder> <SourceChip label="Title commitment" pending /></> },
      { term: 'Survey', detail: <><Placeholder>[ALTA survey pending]</Placeholder></> },
      { term: 'Title insurance', detail: 'Owner’s policy issued at closing; paid by the Sponsor (Rules 6.5).' },
    ]} />
  );
}

const MODE: Record<string, string> = { walk: 'walk', drive: 'drive', bike: 'bike', transit: 'transit' };
export function NearbyList({ p, approvedAt }: { p: Property; approvedAt: Date | null }) {
  const items = safeJson<NearbyItem[]>(p.nearbyJson, []);
  if (!items.length || !approvedAt) return <p className="text-[14px] text-graphite"><Placeholder>[Nearby places pending counsel approval of factual claims.]</Placeholder></p>;
  return (
    <ul className="border-t hair">
      {items.map((n, i) => <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b hair py-2.5 text-[14.5px]"><span className="min-w-0"><span>{n.label}</span><span className="ml-2 plate">{n.kind}</span><span className="mt-0.5 block"><SourceChip label={n.source ?? 'Sponsor'} href={n.href} date={fmtDate(approvedAt)} pending={!n.href} /></span></span><span className="font-mono text-[12.5px] text-slate">{n.minutes} min {MODE[n.mode] ?? n.mode}</span></li>)}
    </ul>
  );
}
