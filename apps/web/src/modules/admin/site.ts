'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/guards';
import { isPersonaEmail } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
import { isSiteMode, siteMode, switchSiteMode } from '@/lib/site-mode';

/** Admin-only switch between demonstration and live. Audited; refuses to strand the deployment without an admin. */
export async function setSiteModeAction(formData: FormData) {
  const s = await assertRole(['admin']);
  const mode = String(formData.get('mode') ?? '');
  if (!isSiteMode(mode)) redirect(`/admin/site?error=${encodeURIComponent('Unknown mode.')}`);
  const before = await siteMode();
  if (before === mode) redirect('/admin/site');
  const r = await switchSiteMode(mode);
  if (!r.ok) redirect(`/admin/site?error=${encodeURIComponent(r.reason ?? 'The mode could not be changed.')}`);
  await audit({ actorId: s.userId, actorRole: s.role, action: 'site.mode.set', objectType: 'SiteSetting', objectId: 'site.mode', before: { mode: before }, after: { mode }, detail: { photosChanged: r.photos ?? 0 } });
  revalidatePath('/', 'layout');
  // A persona's session ends with demo mode; send them to sign in with their listed address.
  if (mode === 'live' && isPersonaEmail(s.email)) redirect('/sign-in?switched=live');
  redirect(`/admin/site?switched=${mode}&photos=${r.photos ?? 0}`);
}
