import type { Property } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Select, Textarea } from '@/components/ui/Field';
import { savePropertyAction } from '@/modules/admin/actions';
import { safeJson } from '@/lib/format';

export function PropertyForm({ p }: { p: Property | null }) {
  const d = (v: Date | null | undefined) => (v ? v.toISOString().slice(0, 10) : '');
  return (
    <form action={savePropertyAction} className="grid gap-5 md:grid-cols-2">
      <input type="hidden" name="id" value={p?.id ?? ''} />
      <FieldRow label="Name" htmlFor="name"><Input id="name" name="name" required defaultValue={p?.name ?? ''} /></FieldRow>
      <FieldRow label="Slug" htmlFor="slug"><Input id="slug" name="slug" defaultValue={p?.slug ?? ''} /></FieldRow>
      <FieldRow label="Address" htmlFor="address"><Input id="address" name="address" required defaultValue={p?.address ?? ''} /></FieldRow>
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
        <FieldRow label="City" htmlFor="city"><Input id="city" name="city" required defaultValue={p?.city ?? ''} /></FieldRow>
        <FieldRow label="State" htmlFor="state"><Input id="state" name="state" required maxLength={2} defaultValue={p?.state ?? ''} /></FieldRow>
        <FieldRow label="ZIP" htmlFor="zip"><Input id="zip" name="zip" defaultValue={p?.zip ?? ''} /></FieldRow>
      </div>
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
      <FieldRow label="Page status" htmlFor="status"><Select id="status" name="status" defaultValue={p?.status ?? 'draft'}><option value="draft">draft</option><option value="preview">preview</option><option value="live">live</option><option value="closed">closed</option></Select></FieldRow>
      <div className="md:col-span-2"><Button type="submit">Save property</Button></div>
    </form>
  );
}
