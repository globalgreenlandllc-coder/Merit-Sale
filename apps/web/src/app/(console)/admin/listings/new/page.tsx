import { PageHead, ErrorBanner, Card } from '@/components/console/ConsoleShell';
import { AddressLocator } from '@/components/console/AddressLocator';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Select, Textarea } from '@/components/ui/Field';
import { db } from '@/lib/db';
import { createListingAction } from '@/modules/admin/listing';
export const dynamic = 'force-dynamic';

export default async function NewListingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [eligible, last] = await Promise.all([db.stateRule.findMany({ where: { eligible: true }, orderBy: { code: 'asc' } }), db.meritOpen.findFirst({ where: { isPractice: false }, orderBy: { createdAt: 'desc' } })]);
  const inDays = (n: number, h: number) => { const d = new Date(Date.now() + n * 86400e3); d.setUTCHours(h + 7, 0, 0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  return (<>
    <PageHead label="Listings" title="New listing" />
    <ErrorBanner sp={sp} />
    <p className="mt-4 max-w-3xl text-[13.5px] text-slate">One form creates the property, its Merit Open with a listing number, a proposed round schedule at sane hours, primary and reserve forms for every round, and a draft ruleset from the counsel template. Everything stays editable until the Administrator locks it. Photography is added on the property page afterwards.</p>
    <form action={createListingAction} className="mt-6 space-y-6">
      <Card title="1 · Property and address">
        <div className="grid gap-4 md:grid-cols-2 mb-4"><FieldRow label="Property name" htmlFor="name" hint="e.g. The Larkspur Residence"><Input id="name" name="name" required /></FieldRow><FieldRow label="SPE entity (title holder)" htmlFor="speEntityName"><Input id="speEntityName" name="speEntityName" placeholder="[PROPERTY SPE LLC]" /></FieldRow></div>
        <AddressLocator initial={{}} />
        <div className="mt-4 grid gap-4 md:grid-cols-3"><FieldRow label="Title status" htmlFor="titleStatus"><Select id="titleStatus" name="titleStatus" defaultValue="under_option"><option value="under_option">under option</option><option value="under_contract">under contract</option><option value="owned">owned</option></Select></FieldRow><FieldRow label="Property type" htmlFor="propertyType"><Input id="propertyType" name="propertyType" defaultValue="Single-family detached" /></FieldRow></div>
      </Card>
      <Card title="2 · Facts">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <FieldRow label="Beds" htmlFor="beds"><Input id="beds" name="beds" type="number" /></FieldRow><FieldRow label="Baths" htmlFor="baths"><Input id="baths" name="baths" type="number" step="0.5" /></FieldRow><FieldRow label="Interior sq ft" htmlFor="sqft"><Input id="sqft" name="sqft" type="number" /></FieldRow><FieldRow label="Lot sq ft" htmlFor="lotSqft"><Input id="lotSqft" name="lotSqft" type="number" /></FieldRow>
          <FieldRow label="Year built" htmlFor="yearBuilt"><Input id="yearBuilt" name="yearBuilt" type="number" /></FieldRow><FieldRow label="Stories" htmlFor="stories"><Input id="stories" name="stories" type="number" /></FieldRow><FieldRow label="Garage spaces" htmlFor="garageSpaces"><Input id="garageSpaces" name="garageSpaces" type="number" /></FieldRow><FieldRow label="Heating" htmlFor="heating"><Input id="heating" name="heating" /></FieldRow>
          <FieldRow label="Cooling" htmlFor="cooling"><Input id="cooling" name="cooling" /></FieldRow><FieldRow label="Roof" htmlFor="roof"><Input id="roof" name="roof" /></FieldRow><FieldRow label="Exterior" htmlFor="exterior"><Input id="exterior" name="exterior" /></FieldRow>
        </div>
        <div className="mt-4"><FieldRow label="Description" htmlFor="description" hint="Factual. It renders only after counsel approval."><Textarea id="description" name="description" /></FieldRow></div>
      </Card>
      <Card title="3 · Appraisal and cost to hold">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <FieldRow label="Appraised value ($)" htmlFor="appraisedValue"><Input id="appraisedValue" name="appraisedValue" type="number" /></FieldRow><FieldRow label="Appraisal date" htmlFor="appraisalDate"><Input id="appraisalDate" name="appraisalDate" type="date" /></FieldRow><FieldRow label="Appraiser" htmlFor="appraiserName"><Input id="appraiserName" name="appraiserName" placeholder="[Independent appraiser]" /></FieldRow><div />
          <FieldRow label="Property tax / year ($)" htmlFor="taxAnnual"><Input id="taxAnnual" name="taxAnnual" type="number" /></FieldRow><FieldRow label="Insurance / year ($)" htmlFor="insuranceAnnual"><Input id="insuranceAnnual" name="insuranceAnnual" type="number" /></FieldRow><FieldRow label="HOA / month ($)" htmlFor="hoaMonthly"><Input id="hoaMonthly" name="hoaMonthly" type="number" defaultValue={0} /></FieldRow><FieldRow label="Utilities / month ($)" htmlFor="utilitiesMonthly"><Input id="utilitiesMonthly" name="utilitiesMonthly" type="number" /></FieldRow>
        </div>
      </Card>
      <Card title="4 · Merit Open">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow label="Merit Open name" htmlFor="openName" hint="Defaults to “The {City} Merit Open”."><Input id="openName" name="openName" /></FieldRow>
          <FieldRow label="Eligible states" htmlFor="eligibleStates" hint="From the states matrix; comma-separated codes."><Input id="eligibleStates" name="eligibleStates" defaultValue={eligible.map((s) => s.code).join(', ')} /></FieldRow>
          <div className="grid grid-cols-2 gap-3"><FieldRow label="Registration fee ($)" htmlFor="registrationFee"><Input id="registrationFee" name="registrationFee" type="number" step="0.01" defaultValue={last ? last.registrationFeeCents / 100 : 25} /></FieldRow><FieldRow label="Cash component ($)" htmlFor="cashComponent"><Input id="cashComponent" name="cashComponent" type="number" defaultValue={last ? last.cashComponentCents / 100 : 175000} /></FieldRow></div>
          <div className="grid grid-cols-3 gap-3"><FieldRow label="N (from R2)" htmlFor="advanceN"><Input id="advanceN" name="advanceN" type="number" defaultValue={last?.advanceN ?? 2000} /></FieldRow><FieldRow label="M (from R3)" htmlFor="advanceM"><Input id="advanceM" name="advanceM" type="number" defaultValue={last?.advanceM ?? 100} /></FieldRow><FieldRow label="Reservation target" htmlFor="reservationTarget"><Input id="reservationTarget" name="reservationTarget" type="number" defaultValue={5000} /></FieldRow></div>
        </div>
      </Card>
      <Card title="5 · Schedule">
        <div className="grid gap-4 md:grid-cols-2"><FieldRow label="Registration opens" htmlFor="registrationOpenAt"><Input id="registrationOpenAt" name="registrationOpenAt" type="datetime-local" defaultValue={inDays(14, 9)} /></FieldRow><FieldRow label="Registration closes" htmlFor="registrationCloseAt" hint="Immutable after lock. Never extended."><Input id="registrationCloseAt" name="registrationCloseAt" type="datetime-local" defaultValue={inDays(44, 17)} /></FieldRow></div>
        <p className="mt-3 text-[12.5px] text-graphite">Rounds are proposed from the close: Round 1 opens two days later at 9:00 for two days; Round 2 four days after that; Round 3 on the following Saturday at 10:00; the Final a week later at 9:00; tie-breaks four and six hours after. Adjust them on the Rounds page before lock.</p>
      </Card>
      <Button type="submit" size="lg">Create listing</Button>
    </form>
  </>);
}
