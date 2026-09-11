import Link from 'next/link';
import { KeyGlyph } from './KeyGlyph';

export function Wordmark({ dark = false, href = '/' }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${dark ? 'text-parchment' : 'text-ink'}`} aria-label="Earn the Keys — home">
      <span className={`grid size-8 place-items-center rounded-xs border ${dark ? 'border-brass-2/60 text-brass-2' : 'border-brass/60 text-brass'} transition group-hover:bg-brass/10`}>
        <KeyGlyph size={17} />
      </span>
      <span className="font-display text-[21px] leading-none tracking-tight">Earn the Keys</span>
    </Link>
  );
}
