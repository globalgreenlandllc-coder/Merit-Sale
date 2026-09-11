'use client';
import { useState } from 'react';
import { scoreItem, type ScoringSpec } from '@etk/scoring';
import { Button } from '@/components/ui/Button';

/** Sample items. These are never drawn from a live or sealed form. */
const SAMPLES: { id: string; kind: string; prompt: string; hint: string; spec: ScoringSpec }[] = [
  { id: 's1', kind: 'Pattern logic · integer', hint: 'Whole number', prompt: 'A sequence is defined by this rule: each term after the first is three times the previous term, minus two. The first term is 2. What is the fourth term?', spec: { kind: 'numeric', answer: 28, points: 1 } },
  { id: 's2', kind: 'Constraint problem · name', hint: 'Type one name from the problem', prompt: 'Four runners — Nia, Omar, Priya, and Quinn — finish a race in positions 1 to 4 with no ties. Quinn finishes immediately before Priya. Omar finishes immediately after Priya. Nia does not finish last. Who finishes third?', spec: { kind: 'exact', answer: 'Priya', points: 1 } },
  { id: 's3', kind: 'Quantitative reasoning · ordering', hint: 'Comma-separated, lowest total cost first', prompt: 'Three warehouses each charge monthly rent plus a per-unit handling rate. Alder: $700 rent, $2 per unit, 300 units. Birch: $900 rent, $1 per unit, 250 units. Cedar: $300 rent, $4 per unit, 220 units. List the warehouses from lowest to highest total monthly cost.', spec: { kind: 'ordering', answer: ['Birch', 'Cedar', 'Alder'], points: 1 } },
  { id: 's4', kind: 'Counting · integer', hint: 'Whole number', prompt: 'A grid has 4 columns and 3 rows of cells. Starting at the top-left cell and moving only right or down one cell at a time, how many distinct paths reach the bottom-right cell?', spec: { kind: 'numeric', answer: 10, points: 1 } },
  { id: 's5', kind: 'Assignment · minimise cost', hint: 'e.g. X→1, Y→2', prompt: 'Two couriers, X and Y, must each be assigned to exactly one of two zones, 1 and 2. Cost for X: zone 1 = $5, zone 2 = $9. Cost for Y: zone 1 = $6, zone 2 = $4. Give the assignment that minimises total cost.', spec: { kind: 'assignment', answer: { X: '1', Y: '2' }, points: 1 } },
];

export function PracticeSet() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, { points: number; valid: boolean }>>({});
  return (
    <ol className="mt-10 space-y-8">
      {SAMPLES.map((s, i) => {
        const r = checked[s.id];
        return (
          <li key={s.id} className="rounded-md border hair bg-paper p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4"><span className="plate">Sample {i + 1} · {s.kind}</span>{r && <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${r.points > 0 ? 'text-verify' : r.valid ? 'text-clay' : 'text-amber'}`}>{r.points > 0 ? 'Correct' : r.valid ? 'Not the answer' : 'Could not read that'}</span>}</div>
            <p className="font-display mt-4 text-[21px] leading-snug">{s.prompt}</p>
            <form className="mt-5 flex flex-wrap items-center gap-3" onSubmit={(e) => { e.preventDefault(); setChecked((c) => ({ ...c, [s.id]: scoreItem(s.spec, answers[s.id] ?? '') })); }}>
              <input className="field max-w-md flex-1" placeholder={s.hint} value={answers[s.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [s.id]: e.target.value }))} aria-label={`Answer to sample ${i + 1}`} />
              <Button type="submit" variant="secondary">Check</Button>
            </form>
          </li>
        );
      })}
    </ol>
  );
}
