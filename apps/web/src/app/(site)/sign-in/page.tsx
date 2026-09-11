import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button } from '@/components/ui/Button';
import { Input, FieldRow } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { signInLocal } from '@/modules/accounts/actions';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const personas = env.authProvider === 'local' ? await db.user.findMany({ where: { role: { not: 'registrant' } }, orderBy: { role: 'asc' } }) : [];
  const demoRegistrant = env.authProvider === 'local' ? await db.user.findFirst({ where: { role: 'registrant', legalName: { not: null } }, orderBy: { createdAt: 'asc' } }) : null;
  return (
    <Container className="grid gap-12 py-16 lg:grid-cols-[1fr_1fr]">
      <div>
        <Plate>Sign in</Plate>
        <h1 className="font-display mt-4 text-[40px] leading-tight">One account, one person.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate">Your account is tied to a verified identity. Creating more than one account, by any means, is a disqualifying violation of the Official Rules (2.4).</p>
        {sp.denied && <Notice className="mt-6" tone="danger" title="Wrong realm">You are signed in as <strong>{sp.denied}</strong>; that area requires <strong>{sp.need}</strong>. Roles are separated by design: no single role can both see answer keys and modify scores.</Notice>}
        {sp.error === 'email' && <Notice className="mt-6" tone="warn">Enter a valid email address.</Notice>}
        <form action={signInLocal} className="mt-8 max-w-md space-y-4">
          <input type="hidden" name="next" value={sp.next ?? '/account'} />
          <FieldRow label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></FieldRow>
          <Button type="submit" size="lg">Continue</Button>
          <p className="text-[12.5px] text-graphite">Local session provider is active. In production this screen is replaced by the identity provider adapter (MFA required for staff roles).</p>
        </form>
      </div>
      {env.authProvider === 'local' && (
        <div className="rounded-md border hair bg-parchment/60 p-6">
          <Plate>Development personas</Plate>
          <p className="mt-2 text-[13.5px] text-slate">Seeded accounts for each realm. Click to sign in as that role.</p>
          <ul className="mt-5 space-y-2">
            {[...(demoRegistrant ? [demoRegistrant] : []), ...personas].map((u) => (
              <li key={u.id}>
                <form action={signInLocal}>
                  <input type="hidden" name="email" value={u.email} /><input type="hidden" name="next" value={sp.next ?? '/account'} />
                  <button type="submit" className="flex w-full items-center justify-between rounded-sm border hair bg-paper px-4 py-3 text-left transition hover:border-ink">
                    <span><span className="block text-[14px] font-medium text-ink">{u.legalName ?? u.email}</span><span className="block font-mono text-[11.5px] text-graphite">{u.email}</span></span>
                    <span className="plate text-brass">{u.role.replace('_', ' ')}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
}
