import type { MeritOpen, Property } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldRow, Input, Select } from '@/components/ui/Field';
import { saveMeritOpenAction } from '@/modules/admin/actions';
import { safeJson } from '@/lib/format';

const dt = (v: Date | null | undefined) => (v ? new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export function OpenForm({ o, properties }: { o: MeritOpen | null; properties: Property[] }) {
  const locked = !!o?.lockedAt;
  return (
    <form action={saveMeritOpenAction} className="grid gap-5 md:grid-cols-2">
      <input type="hidden" name="id" value={o?.id ?? ''} />
      <fieldset disabled={locked} className="contents">
        <FieldRow label="Name" htmlFor="name" hint="The [City] Merit Open"><Input id="name" name="name" required defaultValue={o?.name ?? ''} /></FieldRow>
        <FieldRow label="Slug" htmlFor="slug"><Input id="slug" name="slug" defaultValue={o?.slug ?? ''} /></FieldRow>
        <FieldRow label="Property" htmlFor="propertyId"><Select id="propertyId" name="propertyId" defaultValue={o?.propertyId ?? ''}>{properties.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.titleStatus}</option>)}</Select></FieldRow>
        <FieldRow label="City" htmlFor="city"><Input id="city" name="city" defaultValue={o?.city ?? ''} /></FieldRow>
        <FieldRow label="Eligible states (comma-separated)" htmlFor="eligibleStates"><Input id="eligibleStates" name="eligibleStates" defaultValue={safeJson<string[]>(o?.stateEligibilityJson, []).join(', ')} /></FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Registration fee ($)" htmlFor="registrationFee"><Input id="registrationFee" name="registrationFee" type="number" step="0.01" defaultValue={o ? o.registrationFeeCents / 100 : 25} /></FieldRow>
          <FieldRow label="Cash component ($)" htmlFor="cashComponent"><Input id="cashComponent" name="cashComponent" type="number" step="1" defaultValue={o ? o.cashComponentCents / 100 : 175000} /></FieldRow>
        </div>
        <FieldRow label="Registration opens" htmlFor="registrationOpenAt"><Input id="registrationOpenAt" name="registrationOpenAt" type="datetime-local" defaultValue={dt(o?.registrationOpenAt)} /></FieldRow>
        <FieldRow label="Registration closes" htmlFor="registrationCloseAt" hint="Immutable after lock. Never extended."><Input id="registrationCloseAt" name="registrationCloseAt" type="datetime-local" defaultValue={dt(o?.registrationCloseAt)} /></FieldRow>
        <div className="grid grid-cols-3 gap-3">
          <FieldRow label="N (from R2)" htmlFor="advanceN"><Input id="advanceN" name="advanceN" type="number" defaultValue={o?.advanceN ?? 2000} /></FieldRow>
          <FieldRow label="M (from R3)" htmlFor="advanceM"><Input id="advanceM" name="advanceM" type="number" defaultValue={o?.advanceM ?? 100} /></FieldRow>
          <FieldRow label="First-access hours" htmlFor="firstAccessHours"><Input id="firstAccessHours" name="firstAccessHours" type="number" defaultValue={o?.firstAccessHours ?? 72} /></FieldRow>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Reservation target" htmlFor="reservationTarget"><Input id="reservationTarget" name="reservationTarget" type="number" defaultValue={o?.reservationTarget ?? ''} /></FieldRow>
          <div className="space-y-3 pt-6"><Checkbox name="showReservationCount" defaultChecked={o?.showReservationCount ?? true} label="Show live reservation count" /><Checkbox name="isPractice" defaultChecked={o?.isPractice ?? false} label="Practice event (cash award, no property)" /></div>
        </div>
      </fieldset>
      <div className="md:col-span-2">{locked ? <p className="text-[13.5px] text-clay">Locked {o!.lockedAt!.toISOString()} by the Administrator. Configuration is immutable (Rules 13).</p> : <Button type="submit">Save Merit Open</Button>}</div>
    </form>
  );
}
