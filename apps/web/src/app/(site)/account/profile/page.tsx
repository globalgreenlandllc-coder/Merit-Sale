import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button } from '@/components/ui/Button';
import { FieldRow, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth/guards';
import { updateProfile } from '@/modules/accounts/actions';
import { US_STATES } from '@/lib/states';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await requireSession('/account/profile');
  const u = await db.user.findUniqueOrThrow({ where: { id: s.userId } });
  return (
    <Container className="max-w-2xl py-16">
      <Plate>Profile</Plate>
      <h1 className="font-display mt-4 text-[40px] leading-tight">Who you are, where you live.</h1>
      {sp.reason === 'light_verification' && <Notice className="mt-6" tone="info" title="Light verification">A reservation needs your phone, date of birth, and state. Full identity verification (document and selfie) happens at paid registration.</Notice>}
      <form action={updateProfile} className="mt-8 space-y-5">
        <input type="hidden" name="next" value={sp.next ?? '/account'} />
        <FieldRow label="Legal name" htmlFor="legalName" hint="Exactly as on your government ID."><Input id="legalName" name="legalName" defaultValue={u.legalName ?? ''} /></FieldRow>
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldRow label="Phone" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={u.phone ?? ''} /></FieldRow>
          <FieldRow label="Date of birth" htmlFor="dob"><Input id="dob" name="dob" type="date" defaultValue={u.dob ? u.dob.toISOString().slice(0, 10) : ''} /></FieldRow>
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
          <FieldRow label="State of residence" htmlFor="residenceState"><Select id="residenceState" name="residenceState" defaultValue={u.residenceState ?? ''}><option value="">—</option>{US_STATES.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}</Select></FieldRow>
          <FieldRow label="Residence address" htmlFor="residenceAddress"><Input id="residenceAddress" name="residenceAddress" defaultValue={u.residenceAddress ?? ''} /></FieldRow>
        </div>
        <Button type="submit" size="lg">Save</Button>
      </form>
    </Container>
  );
}
