import { FloorPlan } from './FloorPlan';

/**
 * Stands in for property photography until counsel-approved photos are loaded.
 * A plan on an ink plate reads as "estate" without a single stock image.
 */
export function PropertyFigure({ caption, className = '', animate = true }: { caption?: string; className?: string; animate?: boolean }) {
  return (
    <figure className={`grain grain-dark relative overflow-hidden rounded-md bg-ink text-brass-2 shadow-lift ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(210,180,122,0.14),transparent_60%)]" aria-hidden />
      <div className="relative z-[2] p-6 sm:p-10">
        <FloorPlan className="w-full" animate={animate} />
      </div>
      {caption && <figcaption className="relative z-[2] border-t hair-light px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-sage">{caption}</figcaption>}
    </figure>
  );
}
