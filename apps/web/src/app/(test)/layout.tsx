import { Wordmark } from '@/components/site/Wordmark';

/** Test client shell: dark, no navigation, nothing to click away to. */
export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain grain-dark min-h-dvh bg-ink text-parchment">
      <header className="relative z-[2] border-b hair-light"><div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-5"><Wordmark dark href="/account" /><span className="plate-dark">Test client · server time is authoritative</span></div></header>
      <main className="relative z-[2] mx-auto max-w-[1100px] px-5 py-10">{children}</main>
    </div>
  );
}
