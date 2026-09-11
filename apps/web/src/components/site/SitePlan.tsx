/** Site plan in the same hand as the floor plan: lot, setbacks, footprint, drive, terrace, trees. */
export function SitePlan({ className = '', animate = false, street = 'Larkspur Lane', lot = '7,400 sq ft', sqft = '2,140 sq ft', stories = '1 story', decorative = false }: { className?: string; animate?: boolean; street?: string; lot?: string; sqft?: string; stories?: string; decorative?: boolean }) {
  const g = (delay: number) => (animate ? { className: 'animate-draw', style: { animationDelay: `${delay}s` }, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 } : {});
  const lbl = 'font-mono text-[9px] uppercase tracking-[0.2em] fill-current';
  const dim = 'font-mono text-[9px] tracking-[0.12em] fill-current';
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': `Site plan: ${lot} lot on ${street}, residence of ${sqft}, ${stories}, garage, terrace, trees` };
  const tree = (x: number, y: number, r: number) => (
    <g key={`${x}${y}`}>
      <circle cx={x} cy={y} r={r} />
      <circle cx={x} cy={y} r={r * 0.55} opacity="0.5" />
      <path d={`M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r}`} opacity="0.35" />
    </g>
  );
  return (
    <svg viewBox="0 0 720 540" className={className} fill="none" stroke="currentColor" strokeLinecap="square" {...a11y}>
      {/* lot boundary */}
      <g strokeWidth="1.6" {...g(0)}><path d="M80 60 H640 V440 H80 Z" /></g>
      {/* setbacks */}
      <g strokeWidth="0.6" strokeDasharray="5 4" opacity="0.5" {...g(0.4)}><path d="M120 100 H600 V400 H120 Z" /></g>
      {/* house footprint (matches the floor plan) */}
      <g strokeWidth="1.3" {...g(0.8)}>
        <path d="M220 150 H460 V270 H540 V360 H220 Z" />
        <path d="M228 158 H452 M228 174 H452 M228 190 H452 M228 206 H452 M228 222 H452 M228 238 H452 M228 254 H452 M228 270 H532 M228 286 H532 M228 302 H532 M228 318 H532 M228 334 H532 M228 350 H532" opacity="0.18" />
      </g>
      {/* terrace + garage */}
      <g strokeWidth="0.9" opacity="0.8" {...g(1.2)}>
        <path d="M460 270 H540 V360 H460 Z" strokeDasharray="3 3" />
        <path d="M540 290 H600 V360 H540" />
        <path d="M600 300 H640 M600 350 H640" opacity="0.6" />
      </g>
      {/* drive and walk */}
      <g strokeWidth="0.8" opacity="0.7" {...g(1.5)}>
        <path d="M600 300 L640 300 M600 350 L640 350" />
        <path d="M604 306 H636 M604 344 H636 M604 316 H636 M604 326 H636 M604 336 H636" opacity="0.25" />
        <path d="M330 360 V440" strokeDasharray="2 3" /><path d="M322 360 V440 M338 360 V440" opacity="0.4" />
      </g>
      {/* trees */}
      <g strokeWidth="0.7" opacity="0.65" {...g(1.9)}>{tree(140, 130, 26)}{tree(170, 380, 30)}{tree(590, 110, 22)}{tree(520, 400, 18)}{tree(110, 260, 20)}</g>
      {/* street */}
      <g strokeWidth="1" opacity="0.7" {...g(2.2)}><path d="M40 470 H680 M40 500 H680" /><path d="M60 485 H120 M160 485 H220 M260 485 H320 M360 485 H420 M460 485 H520 M560 485 H620" strokeDasharray="0" opacity="0.35" /></g>
      {/* dimensions & north */}
      <g strokeWidth="0.6" opacity="0.85" {...g(2.4)}>
        <path d="M80 44 H640 M80 38 V50 M640 38 V50" /><path d="M660 60 V440 M654 60 H666 M654 440 H666" />
        <path d="M660 24 L668 48 L660 42 L652 48 Z" fill="currentColor" opacity="0.7" /><circle cx="660" cy="36" r="18" opacity="0.5" />
      </g>
      <g stroke="none" opacity="0.85">
        <text x="360" y="32" textAnchor="middle" className={dim}>93′-0″</text>
        <text x="678" y="255" textAnchor="middle" className={dim} transform="rotate(-90 678 255)">80′-0″</text>
        <text x="340" y="215" textAnchor="middle" className={lbl}>Residence</text>
        <text x="340" y="230" textAnchor="middle" className={dim} opacity="0.85">{sqft} · {stories}</text>
        <text x="500" y="318" textAnchor="middle" className={lbl} opacity="0.7">Terrace</text>
        <text x="570" y="330" textAnchor="middle" className={lbl} opacity="0.7">Garage</text>
        <text x="360" y="527" textAnchor="middle" className={lbl}>{street}</text>
        <text x="100" y="80" className={dim} opacity="0.85">Lot · {lot}</text>
        <text x="130" y="115" className={dim} opacity="0.85">Setback</text>
        <text x="660" y="90" textAnchor="middle" className={dim}>N</text>
      </g>
    </svg>
  );
}
