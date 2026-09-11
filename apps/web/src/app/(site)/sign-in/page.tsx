import { Container } from '@/components/ui/Container';
import { Plate } from '@/components/ui/Plate';
import { Button } from '@/components/ui/Button';
import { Input, FieldRow } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Badge } from '@/components/ui/Badge';
import { signInLocal } from '@/modules/accounts/actions';
import { requestCodeAction, verifyCodeAction } from '@/modules/accounts/auth-actions';
import { authMode, demoPersonasEnabled, staffListsConfigured } from '@/lib/auth/mode';
import { emailProviderName } from '@/lib/providers/email';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const mode = authMode(); const personas = demoPersonasEnabled(); const provider = emailProviderName();
  const next = sp.next ?? '/account';
  const step = sp.step === 'code' && sp.email ? 'code' : 'email';
  const personaRows = personas ? await db.user.findMany({ where: { OR: [{ role: { not: 'registrant' } }, { email: 'ada@example.test' }] }, orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] }) : [];
  const errors: Record<string, string> = {
    email: 'Enter a valid email address.', code: 'That code is not right. Check the six digits and try again.', expired: 'That code has expired or was used too many times. Request a new one.',
    rate: 'Too many codes requested for this address. Try again in an hour.', demo_disabled: 'Demo sign-in is disabled on this deployment. Use your email address.',
  };
  return (
    <Container className="grid gap-12 py-16 lg:grid-cols-[1fr_1fr]">
      <div>
        <Plate>Sign in</Plate>
        <h1 className="font-display mt-4 text-[40px] leading-tight">One account, one person.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate">We sign you in with a one-time code sent to your email; there is no password to keep. Your account is tied to a verified identity, and creating more than one account is a disqualifying violation of the Official Rules (2.4).</p>
        {sp.denied && <Notice className="mt-6" tone="danger" title="Wrong realm">You are signed in as <strong>{sp.denied}</strong>; that area requires <strong>{sp.need}</strong>. Roles are separated by design.</Notice>}
        {sp.error && errors[sp.error] && <Notice className="mt-6" tone="warn">{errors[sp.error]}</Notice>}
        {sp.sent && <Notice className="mt-6" tone="verify" title="Code sent">Check {sp.email} for a six-digit code. It expires in 10 minutes.</Notice>}
        {sp.notdelivered && <Notice className="mt-6" tone="warn" title="Email delivery is not configured on this deployment">The code was written to the server log instead. The site operator can read it in the deployment’s runtime logs, or configure delivery with <code className="font-mono text-[12.5px]">RESEND_API_KEY</code>.</Notice>}
        {sp.demo_code && <Notice className="mt-6" tone="info" title="Development mode">Your code is <span className="font-mono text-[16px] tracking-[0.2em]">{sp.demo_code}</span> (shown only in local development).</Notice>}

        {step === 'email' ? (
          <form action={requestCodeAction} className="mt-8 max-w-md space-y-4">
            <input type="hidden" name="next" value={next} />
            <FieldRow label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" defaultValue={sp.email ?? ''} /></FieldRow>
            <Button type="submit" size="lg">Send me a code</Button>
          </form>
        ) : (
          <form action={verifyCodeAction} className="mt-8 max-w-md space-y-4">
            <input type="hidden" name="next" value={next} /><input type="hidden" name="email" value={sp.email} />
            <FieldRow label={`Six-digit code sent to ${sp.email}`} htmlFor="code"><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required autoFocus className="font-mono text-[22px] tracking-[0.3em]" /></FieldRow>
            <div className="flex flex-wrap items-center gap-3"><Button type="submit" size="lg">Sign in</Button><a href={`/sign-in?next=${encodeURIComponent(next)}&email=${encodeURIComponent(sp.email ?? '')}`} className="link-rule text-[13.5px]">Use a different address or resend</a></div>
          </form>
        )}
        <p className="mt-6 text-[12.5px] text-graphite">Mode: {mode} · delivery: {provider}{mode === 'email' && !staffListsConfigured() ? ' · no staff addresses are listed on this deployment' : ''}</p>
      </div>

      {personas && (
        <div className="rounded-md border hair bg-parchment/60 p-6">
          <div className="flex items-center justify-between"><Plate>Demo personas</Plate><Badge tone="amber">insecure · demo only</Badge></div>
          <p className="mt-2 text-[13.5px] text-slate">Seeded accounts for each realm. Anyone who can see this page can use them, so this list only renders when demo personas are explicitly enabled.</p>
          <ul className="mt-5 space-y-2">
            {personaRows.map((u) => (
              <li key={u.id}>
                <form action={signInLocal}>
                  <input type="hidden" name="email" value={u.email} /><input type="hidden" name="next" value={next} />
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
