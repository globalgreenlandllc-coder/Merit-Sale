'use client';
import { useState } from 'react';
import { US_STATES } from '@/lib/states';

/** Client-side eligibility preview. Nothing is stored; the real check runs server-side at registration. */
export function EligibilityChecker({ eligibleStates, minimumAge = 18, dark = false }: { eligibleStates: string[]; minimumAge?: number; dark?: boolean }) {
  const [state, setState] = useState('');
  const [adult, setAdult] = useState<boolean | null>(null);
  const [excluded, setExcluded] = useState<boolean | null>(null);
  const name = US_STATES.find(([c]) => c === state)?.[1];
  const stateOk = state ? eligibleStates.includes(state) : null;
  const verdict = state === '' || adult === null || excluded === null ? null : stateOk && adult && !excluded ? 'yes' : 'no';
  const cls = dark ? 'field field-dark' : 'field';
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <select className={`${cls} py-2.5 text-[14px]`} value={state} onChange={(e) => setState(e.target.value)} aria-label="Your state of residence"><option value="">Your state…</option>{US_STATES.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}</select>
        <select className={`${cls} py-2.5 text-[14px]`} value={adult === null ? '' : adult ? 'y' : 'n'} onChange={(e) => setAdult(e.target.value === '' ? null : e.target.value === 'y')} aria-label="Are you at least the minimum age"><option value="">Age {minimumAge}+?</option><option value="y">Yes</option><option value="n">No</option></select>
        <select className={`${cls} py-2.5 text-[14px]`} value={excluded === null ? '' : excluded ? 'y' : 'n'} onChange={(e) => setExcluded(e.target.value === '' ? null : e.target.value === 'y')} aria-label="Are you connected to the sponsor, administrator, custodian, vendors, or seller"><option value="">Connected to a party?</option><option value="n">No</option><option value="y">Yes (employee, contractor, family, seller)</option></select>
      </div>
      <div aria-live="polite" className={`min-h-6 text-[14px] leading-relaxed ${dark ? 'text-mist' : 'text-slate'}`}>
        {verdict === 'yes' && <span className={dark ? 'text-brass-2' : 'text-verify'}>Residents of {name} who are {minimumAge}+ and unconnected to any party can register. Identity and location are verified at registration.</span>}
        {verdict === 'no' && stateOk === false && <span className={dark ? 'text-clay-2' : 'text-clay'}>This Merit Open is not open to residents of {name}. Registering from a non-eligible state leads to refund and removal.</span>}
        {verdict === 'no' && stateOk && <span className={dark ? 'text-clay-2' : 'text-clay'}>Not eligible under Official Rules 2.1–2.2.</span>}
        {verdict === null && <span className={dark ? 'text-sage' : 'text-graphite'}>Eligible states: {eligibleStates.join(', ')}. Nothing you enter here is stored.</span>}
      </div>
    </div>
  );
}
