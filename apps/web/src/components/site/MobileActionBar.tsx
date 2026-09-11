'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

/** Fixed bottom action bar below lg; hides while the inline docket or the footer is on screen. */
export function MobileActionBar({ href, label, fee }: { href: string; label: string; fee: string }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const targets = [document.getElementById('docket-inline'), document.querySelector('footer')].filter(Boolean) as Element[];
    if (!targets.length) { setHidden(false); return; }
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => { for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); setHidden(visible.size > 0); }, { rootMargin: '0px 0px -40px 0px' });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 border-t hair bg-paper/95 px-4 py-2.5 backdrop-blur transition lg:hidden ${hidden ? 'invisible translate-y-full' : 'visible translate-y-0'}`} style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }} aria-hidden={hidden} inert={hidden || undefined}>
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="plate">Registration</div><div className="font-display text-[22px] leading-none">{fee}</div></div><Link href={href} className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-sm bg-ink px-5 text-[14px] font-medium text-parchment">{label}</Link></div>
    </div>
  );
}
