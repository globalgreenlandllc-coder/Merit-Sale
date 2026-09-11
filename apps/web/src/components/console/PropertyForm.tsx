import type { Property } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Select, Textarea } from '@/components/ui/Field';
import { savePropertyAction } from '@/modules/admin/actions';
import { safeJson } from '@/lib/format';
import { AddressLocator } from './AddressLocator';

export function PropertyForm({ p }: { p: Property | null }) {
  const d = (v: Date | null | undefined) => (v ? v.toISOString().slice(0, 10) : '');
  return (
    <form action={savePropertyAction} className="grid gap-5 md:grid-cols-2">
      <input type="hidden" name="id" value={p?.id ?? ''} />
      <FieldRow label="Name" htmlFor="name"><Input id="name" name="name" required defaultValue={p?.name ?? ''} /></FieldRow>
      <FieldRow label="Slug" htmlFor="slug"><Input id="slug" name="slug" defaultValue={p?.slug ?? ''} /></FieldRow>
      <div className="md:col-span-2"><AddressLocator initial={{ address: p?.address, city: p?.city, state: p?.state, zip: p?.zip, county: p?.county, latitude: p?.latitude, longitude: p?.longitude }} /></div>
      <FieldRow label="SPE entity name" htmlFor="speEntityName" hint="Holds title from before registration opens until closing."><Input id="speEntityName" name="speEntityName" defaultValue={p?.speEntityName ?? ''} /></FieldRow>
      <FieldRow label="Title status" htmlFor="titleStatus" hint="Registration cannot open unless owned (or Administrator override)."><Select id="titleStatus" name="titleStatus" defaultValue={p?.titleStatus ?? 'under_option'}><option value="under_option">under option</option><option value="under_contract">under contract</option><option value="owned">owned</option></Select></FieldRow>
      <FieldRow label="Deed recorded" htmlFor="deedRecordedAt"><Input id="deedRecordedAt" name="deedRecordedAt" type="date" defaultValue={d(p?.deedRecordedAt)} /></FieldRow>
      <FieldRow label="County recorder reference" htmlFor="countyRecorderRef"><Input id="countyRecorderRef" name="countyRecorderRef" defaultValue={p?.countyRecorderRef ?? ''} /></FieldRow>
      <FieldRow label="County recorder URL" htmlFor="countyRecorderUrl"><Input id="countyRecorderUrl" name="countyRecorderUrl" defaultValue={p?.countyRecorderUrl ?? ''} /></FieldRow>
      <FieldRow label="Legal description" htmlFor="legalDescription"><Textarea id="legalDescription" name="legalDescription" defaultValue={p?.legalDescription ?? ''} /></FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Appraised value ($)" htmlFor="appraisedValue"><Input id="appraisedValue" name="appraisedValue" type="number" step="1" defaultValue={p?.appraisedValueCents ? p.appraisedValueCents / 100 : ''} /></FieldRow>
        <FieldRow label="Appraisal date" htmlFor="appraisalDate"><Input id="appraisalDate" name="appraisalDate" type="date" defaultValue={d(p?.appraisalDate)} /></FieldRow>
        <FieldRow label="Appraiser" htmlFor="appraiserName"><Input id="appraiserName" name="appraiserName" defaultValue={p?.appraiserName ?? ''} /></FieldRow>
        <FieldRow label="Year built" htmlFor="yearBuilt"><Input id="yearBuilt" name="yearBuilt" type="number" defaultValue={p?.yearBuilt ?? ''} /></FieldRow>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <FieldRow label="Beds" htmlFor="beds"><Input id="beds" name="beds" type="number" defaultValue={p?.beds ?? ''} /></FieldRow>
        <FieldRow label="Baths" htmlFor="baths"><Input id="baths" name="baths" type="number" step="0.5" defaultValue={p?.baths ?? ''} /></FieldRow>
        <FieldRow label="Sq ft" htmlFor="sqft"><Input id="sqft" name="sqft" type="number" defaultValue={p?.sqft ?? ''} /></FieldRow>
        <FieldRow label="Lot sq ft" htmlFor="lotSqft"><Input id="lotSqft" name="lotSqft" type="number" defaultValue={p?.lotSqft ?? ''} /></FieldRow>
      </div>
      <FieldRow label="Description" htmlFor="description" hint="Factual. No superlatives counsel hasn’t approved."><Textarea id="description" name="description" defaultValue={p?.description ?? ''} /></FieldRow>
      <FieldRow label="Neighborhood" htmlFor="neighborhood"><Textarea id="neighborhood" name="neighborhood" defaultValue={p?.neighborhood ?? ''} /></FieldRow>
      <FieldRow label="Included (one per line, Exhibit B)" htmlFor="includedItems"><Textarea id="includedItems" name="includedItems" defaultValue={safeJson<string[]>(p?.includedItemsJson, []).join('\n')} /></FieldRow>
      <FieldRow label="Excluded (one per line)" htmlFor="excludedItems"><Textarea id="excludedItems" name="excludedItems" defaultValue={safeJson<string[]>(p?.excludedItemsJson, []).join('\n')} /></FieldRow>
      <FieldRow label="Disclosures pack URL" htmlFor="disclosuresPackUrl"><Input id="disclosuresPackUrl" name="disclosuresPackUrl" defaultValue={p?.disclosuresPackUrl ?? ''} /></FieldRow>
      <FieldRow label="Plate set" htmlFor="planSetKey" hint="Built-in schematic set, or pending."><Select id="planSetKey" name="planSetKey" defaultValue={p?.planSetKey ?? ''}><option value="">Plans pending</option><option value="larkspur-2025">larkspur-2025 · single-level, 3 bed</option></Select></FieldRow>
      <FieldRow label="Appraisal report URL" htmlFor="appraisalReportUrl" hint="The appraisal chip stays pending without it."><Input id="appraisalReportUrl" name="appraisalReportUrl" defaultValue={p?.appraisalReportUrl ?? ''} /></FieldRow>
      <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4">
        <FieldRow label="Type" htmlFor="propertyType"><Input id="propertyType" name="propertyType" defaultValue={p?.propertyType ?? ''} /></FieldRow>
        <FieldRow label="Stories" htmlFor="stories"><Input id="stories" name="stories" type="number" defaultValue={p?.stories ?? ''} /></FieldRow>
        <FieldRow label="Garage spaces" htmlFor="garageSpaces"><Input id="garageSpaces" name="garageSpaces" type="number" defaultValue={p?.garageSpaces ?? ''} /></FieldRow>
        <FieldRow label="Fireplaces" htmlFor="fireplaces"><Input id="fireplaces" name="fireplaces" type="number" defaultValue={p?.fireplaces ?? ''} /></FieldRow>
        <FieldRow label="Heating" htmlFor="heating"><Input id="heating" name="heating" defaultValue={p?.heating ?? ''} /></FieldRow>
        <FieldRow label="Cooling" htmlFor="cooling"><Input id="cooling" name="cooling" defaultValue={p?.cooling ?? ''} /></FieldRow>
        <FieldRow label="Roof" htmlFor="roof"><Input id="roof" name="roof" defaultValue={p?.roof ?? ''} /></FieldRow>
        <FieldRow label="Exterior" htmlFor="exterior"><Input id="exterior" name="exterior" defaultValue={p?.exterior ?? ''} /></FieldRow>
        <FieldRow label="Foundation" htmlFor="foundation"><Input id="foundation" name="foundation" defaultValue={p?.foundation ?? ''} /></FieldRow>
        <FieldRow label="Water" htmlFor="waterSource"><Input id="waterSource" name="waterSource" defaultValue={p?.waterSource ?? ''} /></FieldRow>
        <FieldRow label="Sewer" htmlFor="sewer"><Input id="sewer" name="sewer" defaultValue={p?.sewer ?? ''} /></FieldRow>
        <FieldRow label="Flood zone" htmlFor="floodZone"><Input id="floodZone" name="floodZone" defaultValue={p?.floodZone ?? ''} placeholder="[FEMA zone pending]" /></FieldRow>
        <FieldRow label="Lot dimensions" htmlFor="lotDimensions"><Input id="lotDimensions" name="lotDimensions" defaultValue={p?.lotDimensions ?? ''} /></FieldRow>
        <FieldRow label="Parking" htmlFor="parking"><Input id="parking" name="parking" defaultValue={p?.parking ?? ''} /></FieldRow>
        <FieldRow label="Parcel no." htmlFor="parcelNumber"><Input id="parcelNumber" name="parcelNumber" defaultValue={p?.parcelNumber ?? ''} /></FieldRow>
        <FieldRow label="Zoning" htmlFor="zoning"><Input id="zoning" name="zoning" defaultValue={p?.zoning ?? ''} /></FieldRow>
        <FieldRow label="School district" htmlFor="schoolDistrict"><Input id="schoolDistrict" name="schoolDistrict" defaultValue={p?.schoolDistrict ?? ''} /></FieldRow>
        <FieldRow label="Tax / year ($)" htmlFor="taxAnnual"><Input id="taxAnnual" name="taxAnnual" type="number" defaultValue={p?.taxAnnualCents != null ? p.taxAnnualCents / 100 : ''} /></FieldRow>
        <FieldRow label="Insurance / year ($)" htmlFor="insuranceAnnual"><Input id="insuranceAnnual" name="insuranceAnnual" type="number" defaultValue={p?.insuranceAnnualCents != null ? p.insuranceAnnualCents / 100 : ''} /></FieldRow>
        <FieldRow label="HOA / month ($)" htmlFor="hoaMonthly"><Input id="hoaMonthly" name="hoaMonthly" type="number" defaultValue={p?.hoaMonthlyCents != null ? p.hoaMonthlyCents / 100 : ''} /></FieldRow>
        <FieldRow label="Utilities / month ($)" htmlFor="utilitiesMonthly"><Input id="utilitiesMonthly" name="utilitiesMonthly" type="number" defaultValue={p?.utilitiesMonthlyCents != null ? p.utilitiesMonthlyCents / 100 : ''} /></FieldRow>
        <FieldRow label="Facts approved by counsel" htmlFor="factsApprovedAt" hint="Unlocks the neighborhood text and nearby places."><Input id="factsApprovedAt" name="factsApprovedAt" type="date" defaultValue={d(p?.factsApprovedAt)} /></FieldRow>
      </div>
      <FieldRow label="Nearby places (JSON)" htmlFor="nearbyJson" hint='[{"label":"…","kind":"grocery","minutes":6,"mode":"drive","source":"Sponsor · measured"}]'><Textarea id="nearbyJson" name="nearbyJson" className="font-mono text-[12px]" defaultValue={p?.nearbyJson ?? '[]'} /></FieldRow>
      <FieldRow label="Distance anchors (JSON)" htmlFor="anchorsJson" hint='[{"label":"Seattle","lat":47.6062,"lng":-122.3321}]'><Textarea id="anchorsJson" name="anchorsJson" className="font-mono text-[12px]" defaultValue={p?.anchorsJson ?? '[]'} /></FieldRow>
      <FieldRow label="History (JSON)" htmlFor="historyJson" hint='[{"date":"2026-09-05","event":"Deed recorded","source":"County recorder","href":"…"}]'><Textarea id="historyJson" name="historyJson" className="font-mono text-[12px]" defaultValue={p?.historyJson ?? '[]'} /></FieldRow>
      <FieldRow label="Page status" htmlFor="status"><Select id="status" name="status" defaultValue={p?.status ?? 'draft'}><option value="draft">draft</option><option value="preview">preview</option><option value="live">live</option><option value="closed">closed</option></Select></FieldRow>
      <div className="md:col-span-2"><Button type="submit">Save property</Button></div>
    </form>
  );
}
