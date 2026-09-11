/**
 * Architectural line drawing used as the platform's signature art. Every stroke is
 * currentColor, so it draws in ink on parchment and in brass on ink. Groups draw on
 * in sequence via stroke-dashoffset (disabled under prefers-reduced-motion).
 */
export function FloorPlan({ className = '', animate = true, labels = true }: { className?: string; animate?: boolean; labels?: boolean }) {
  const g = (delay: number) => (animate ? { className: 'animate-draw', style: { animationDelay: `${delay}s` }, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 } : {});
  const lbl = 'font-mono text-[8.5px] uppercase tracking-[0.2em] fill-current';
  const dim = 'font-mono text-[7.5px] tracking-[0.12em] fill-current';
  return (
    <svg viewBox="0 0 720 540" className={className} fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter" role="img" aria-label="Floor plan of the residence">
      {/* exterior walls */}
      <g strokeWidth="2" {...g(0)}>
        <path d="M40 60 H520 V300 H680 V480 H40 Z" />
      </g>
      {/* interior walls */}
      <g strokeWidth="1" opacity="0.9" {...g(0.5)}>
        <path d="M300 60 V208 M300 232 V300" />
        <path d="M40 300 H140 M164 300 H360 M384 300 H520" />
        <path d="M260 300 V352 M260 376 V480" />
        <path d="M340 300 V480" />
        <path d="M260 400 H340" />
        <path d="M520 300 V480" strokeDasharray="4 4" />
        <path d="M420 60 V150 M420 174 V300" opacity="0.6" />
      </g>
      {/* doors */}
      <g strokeWidth="0.8" opacity="0.7" {...g(1.1)}>
        <path d="M300 208 A24 24 0 0 1 324 232" /><path d="M300 208 V232" strokeDasharray="2 2" />
        <path d="M140 300 A24 24 0 0 1 164 276" /><path d="M140 300 H164" strokeDasharray="2 2" />
        <path d="M360 300 A24 24 0 0 1 384 324" /><path d="M360 300 H384" strokeDasharray="2 2" />
        <path d="M260 352 A24 24 0 0 0 284 376" /><path d="M260 352 V376" strokeDasharray="2 2" />
        <path d="M420 150 A24 24 0 0 0 444 174" /><path d="M420 150 V174" strokeDasharray="2 2" />
        {/* front door */}
        <path d="M400 480 A30 30 0 0 0 430 450" /><path d="M400 480 H430" strokeDasharray="2 2" />
        {/* terrace slider */}
        <path d="M520 360 V420" strokeWidth="2.2" opacity="0.5" />
      </g>
      {/* windows */}
      <g strokeWidth="1" opacity="0.8" {...g(1.5)}>
        <path d="M90 60 H200 M90 64 H200 M90 56 H200" />
        <path d="M330 60 H400 M330 64 H400 M330 56 H400" />
        <path d="M40 120 V220 M44 120 V220 M36 120 V220" />
        <path d="M40 340 V440 M44 340 V440 M36 340 V440" />
        <path d="M120 480 H220 M120 484 H220 M120 476 H220" />
        <path d="M600 480 H650 M600 484 H650 M600 476 H650" />
        <path d="M680 340 V440 M684 340 V440 M676 340 V440" />
      </g>
      {/* fixtures */}
      <g strokeWidth="0.7" opacity="0.55" {...g(1.9)}>
        {/* kitchen island + counters */}
        <rect x="340" y="200" width="70" height="26" />
        <path d="M320 60 V160 H340 V60" />
        <path d="M440 60 V300 H520" opacity="0.5" />
        <circle cx="350" cy="100" r="6" /><circle cx="350" cy="130" r="6" />
        {/* stair */}
        <path d="M460 70 H510 M460 80 H510 M460 90 H510 M460 100 H510 M460 110 H510 M460 120 H510" />
        {/* bath */}
        <rect x="270" y="312" width="24" height="34" rx="6" />
        <circle cx="318" cy="325" r="7" />
        {/* primary bed */}
        <rect x="60" y="360" width="120" height="80" rx="2" />
        <path d="M60 380 H180" />
        {/* bed 2 */}
        <rect x="380" y="330" width="90" height="60" rx="2" />
        <path d="M380 345 H470" />
        {/* study desk */}
        <rect x="272" y="420" width="56" height="18" />
        {/* terrace pavers */}
        <path d="M540 320 H660 M540 340 H660 M540 360 H660 M540 380 H660 M540 400 H660 M540 420 H660 M540 440 H660 M540 460 H660" opacity="0.5" />
        {/* fireplace */}
        <rect x="150" y="60" width="40" height="10" />
      </g>
      {/* dimensions */}
      <g strokeWidth="0.6" opacity="0.5" {...g(2.3)}>
        <path d="M40 34 H520 M40 28 V40 M520 28 V40" />
        <path d="M706 300 V480 M700 300 H712 M700 480 H712" />
        <path d="M14 60 V480 M8 60 H20 M8 480 H20" />
        {/* north arrow */}
        <path d="M660 40 L668 64 L660 58 L652 64 Z" fill="currentColor" opacity="0.7" />
        <circle cx="660" cy="52" r="20" opacity="0.5" />
        {/* scale bar */}
        <path d="M40 510 H140 M40 505 V515 M90 505 V515 M140 505 V515" />
        <path d="M40 510 H90" strokeWidth="3" opacity="0.7" />
      </g>
      {labels && (
        <g stroke="none" opacity="0.85">
          <text x="170" y="185" textAnchor="middle" className={lbl}>Great room</text>
          <text x="170" y="198" textAnchor="middle" className={dim} opacity="0.6">26′ × 20′</text>
          <text x="370" y="182" textAnchor="middle" className={lbl}>Kitchen</text>
          <text x="370" y="195" textAnchor="middle" className={dim} opacity="0.6">14′ × 20′</text>
          <text x="470" y="200" textAnchor="middle" className={lbl} opacity="0.6">Entry</text>
          <text x="150" y="332" textAnchor="middle" className={lbl}>Primary suite</text>
          <text x="150" y="345" textAnchor="middle" className={dim} opacity="0.6">18′ × 15′</text>
          <text x="300" y="336" textAnchor="middle" className={lbl} opacity="0.7">Bath</text>
          <text x="300" y="462" textAnchor="middle" className={lbl} opacity="0.7">Study</text>
          <text x="430" y="418" textAnchor="middle" className={lbl}>Bedroom 2</text>
          <text x="430" y="431" textAnchor="middle" className={dim} opacity="0.6">15′ × 15′</text>
          <text x="600" y="392" textAnchor="middle" className={lbl} opacity="0.7">Terrace</text>
          <text x="280" y="24" textAnchor="middle" className={dim}>48′-0″</text>
          <text x="693" y="395" textAnchor="middle" className={dim} transform="rotate(-90 693 395)">18′-0″</text>
          <text x="4" y="270" textAnchor="middle" className={dim} transform="rotate(-90 4 270)">42′-0″</text>
          <text x="660" y="90" textAnchor="middle" className={dim}>N</text>
          <text x="90" y="530" textAnchor="middle" className={dim}>0 · 5 · 10 ft</text>
        </g>
      )}
    </svg>
  );
}
