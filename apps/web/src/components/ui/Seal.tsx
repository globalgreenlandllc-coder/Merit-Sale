/** Rotating circular seal. Purely decorative; the certification itself is the hashed document. */
export function Seal({ text = 'CERTIFIED · INDEPENDENT ADMINISTRATOR · ', size = 132, dark = false, className = '' }: { text?: string; size?: number; dark?: boolean; className?: string }) {
  const color = dark ? '#d2b47a' : '#b08d57';
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" className={`animate-spin-slow ${className}`} aria-hidden>
      <defs>
        <path id="seal-circle" d="M66,66 m-48,0 a48,48 0 1,1 96,0 a48,48 0 1,1 -96,0" />
      </defs>
      <circle cx="66" cy="66" r="62" fill="none" stroke={color} strokeWidth="0.75" />
      <circle cx="66" cy="66" r="34" fill="none" stroke={color} strokeWidth="0.75" />
      <text fontFamily="var(--font-jetbrains), monospace" fontSize="9.2" letterSpacing="2.2" fill={color}>
        <textPath href="#seal-circle">{text}</textPath>
      </text>
      <path d="M58 72 l6 6 l12 -14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
