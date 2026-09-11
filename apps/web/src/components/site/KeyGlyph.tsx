export function KeyGlyph({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="8" cy="12" r="4.2" />
      <circle cx="8" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12.2 12h9M18 12v3M21 12v2.2" />
    </svg>
  );
}
