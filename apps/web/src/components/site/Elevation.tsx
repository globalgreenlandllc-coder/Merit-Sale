/** South elevation: low standing-seam roof over a long single-storey mass, clerestory over the great room, covered terrace. */
export function Elevation({ className = '', animate = false, label = 'South elevation', roof = 'Standing-seam roof', exterior = 'cedar and fiber-cement', decorative = false }: { className?: string; animate?: boolean; label?: string; roof?: string; exterior?: string; decorative?: boolean }) {
  const g = (delay: number) => (animate ? { className: 'animate-draw', style: { animationDelay: `${delay}s` }, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 } : {});
  const lbl = 'font-mono text-[9px] uppercase tracking-[0.2em] fill-current';
  const dim = 'font-mono text-[9px] tracking-[0.12em] fill-current';
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': `${label}: single-story mass with ${roof}, ${exterior}, clerestory over the great room, covered terrace` };
  const win = (x: number, y: number, w: number, h: number, cols = 2) => (
    <g key={`${x}${y}`}>
      <rect x={x} y={y} width={w} height={h} />
      {Array.from({ length: cols - 1 }, (_, i) => <path key={i} d={`M${x + (w / cols) * (i + 1)} ${y} V${y + h}`} opacity="0.6" />)}
      <path d={`M${x + 4} ${y + 4} L${x + w - 4} ${y + h - 4}`} opacity="0.12" />
    </g>
  );
  return (
    <svg viewBox="0 0 720 360" className={className} fill="none" stroke="currentColor" strokeLinecap="square" {...a11y}>
      {/* grade */}
      <g strokeWidth="1.6" {...g(0)}><path d="M20 290 H700" /><path d="M20 296 H700" strokeWidth="0.5" opacity="0.4" /><path d="M40 302 H60 M90 302 H120 M160 302 H175 M230 302 H265 M320 302 H340 M400 302 H430 M480 302 H500 M560 302 H590 M640 302 H660" strokeWidth="0.5" opacity="0.35" /></g>
      {/* main mass */}
      <g strokeWidth="1.3" {...g(0.5)}>
        <path d="M80 290 V170 H520 V290" />
        <path d="M60 170 L540 170 L556 150 L44 150 Z" />
        {/* taller great-room volume with clerestory */}
        <path d="M200 150 V110 H400 V150" /><path d="M186 110 L414 110 L428 92 L172 92 Z" />
        {/* terrace roof + posts */}
        <path d="M520 170 H660 M540 170 V290 M600 170 V290 M656 170 V290" /><path d="M520 170 L676 170 L688 152 H540" />
      </g>
      {/* roof seams */}
      <g strokeWidth="0.5" opacity="0.45" {...g(1)}>
        <path d="M80 165 L92 152 M120 165 L132 152 M160 165 L172 152 M440 165 L452 152 M480 165 L492 152 M520 165 L532 152 M560 165 L572 152 M600 165 L612 152 M640 165 L652 152" />
        <path d="M210 106 L220 96 M250 106 L260 96 M290 106 L300 96 M330 106 L340 96 M370 106 L380 96" />
      </g>
      {/* siding hatch */}
      <g strokeWidth="0.35" opacity="0.22" {...g(1.3)}>
        {Array.from({ length: 22 }, (_, i) => <path key={i} d={`M${86 + i * 20} 172 V288`} />)}
        {Array.from({ length: 9 }, (_, i) => <path key={`c${i}`} d={`M${208 + i * 22} 112 V148`} />)}
      </g>
      {/* openings */}
      <g strokeWidth="0.9" opacity="0.85" {...g(1.6)}>
        {win(100, 195, 60, 70, 2)}{win(180, 190, 90, 80, 3)}{win(300, 190, 90, 80, 3)}{win(440, 200, 50, 60, 1)}
        {win(210, 118, 180, 24, 6)}
        {/* door */}
        <rect x="410" y="200" width="22" height="90" /><circle cx="428" cy="248" r="1.5" fill="currentColor" />
        {/* terrace slider */}
        <rect x="548" y="196" width="46" height="94" /><path d="M571 196 V290" opacity="0.6" />
      </g>
      {/* chimney */}
      <g strokeWidth="1" {...g(1.9)}><path d="M120 150 V120 H140 V150" /><path d="M116 120 H144" /></g>
      {/* people scale + dims */}
      <g strokeWidth="0.6" opacity="0.85" {...g(2.2)}>
        <path d="M30 290 V92 M24 290 H36 M24 92 H36" /><path d="M80 320 H660 M80 314 V326 M660 314 V326" />
        <path d="M690 290 V250 M690 250 a5 5 0 1 1 0.01 0 M690 262 L682 280 M690 262 L698 280" opacity="0.7" />
      </g>
      <g stroke="none" opacity="0.85">
        <text x="16" y="195" textAnchor="middle" className={dim} transform="rotate(-90 16 195)">16′-6″</text>
        <text x="370" y="340" textAnchor="middle" className={dim}>72′-0″</text>
        <text x="300" y="66" textAnchor="middle" className={lbl}>{label}</text>
        <text x="300" y="82" textAnchor="middle" className={dim} opacity="0.85">{roof} · {exterior} · clerestory over great room</text>
      </g>
    </svg>
  );
}
