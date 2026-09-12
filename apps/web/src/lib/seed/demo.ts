/* eslint-disable no-console */
/**
 * Demo seed: three Merit Opens at different stages plus a reservation-phase property.
 * Every item is generated from a parameterised template that computes its own key,
 * so nothing here can carry a wrong answer. The lock ceremony, scoring, screening,
 * certification, and release are replayed with the same pure packages the app uses.
 * Runs from the CLI (prisma/seed.ts) and from the setup endpoint on an empty database.
 */
import { OFFICIAL_RULES_DRAFT, TERMS_DRAFT } from '@/lib/legal/drafts';
import { DEMO_PHOTOS } from './photos';
import type { PrismaClient, Registration, Item } from '@prisma/client';
import { buildPackage, sealPackage, validateForm, type AuthoredItemInput } from '@etk/items';
import { canonicalJson, sha256Hex, hashObject, hashRuleset, parseRuleset, CANCELLATION_REASONS, type RulesetConfigInput } from '@etk/rules-config';
import { scoreAttempt, selectAdvancing, r1Pass, type FormItemKey, type ScoringSpec } from '@etk/scoring';

let db: PrismaClient;
let SEAL_KEY = '';

// ---------- deterministic helpers ----------
let seedState = 20260910;
const rnd = () => { seedState = (seedState * 1103515245 + 12345) & 0x7fffffff; return seedState / 0x7fffffff; };
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!;
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86400e3);
/** a calendar day n days out, snapped to a wall-clock hour in Pacific time (UTC-7 during the seeded season) */
const at = (n: number, hourPT: number) => { const d = new Date(now.getTime() + n * 86400e3); d.setUTCHours(hourPT + 7, 0, 0, 0); return d; };
const hours = (n: number) => new Date(now.getTime() + n * 3600e3);
const ord = (n: number) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][n - 1]!;
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

// ---------- audit chain (mirrors src/lib/audit.ts) ----------
let prevHash: string | null = null;
async function audit(e: { actorId?: string | null; actorRole: string; action: string; objectType: string; objectId: string; detail?: unknown; after?: unknown; before?: unknown; at?: Date }) {
  const timestamp = e.at ?? new Date();
  const body = { prevHash, actorId: e.actorId ?? null, actorRole: e.actorRole, action: e.action, objectType: e.objectType, objectId: e.objectId, beforeHash: e.before === undefined ? null : hashObject(e.before), afterHash: e.after === undefined ? null : hashObject(e.after), detailJson: e.detail === undefined ? null : canonicalJson(e.detail), timestamp: timestamp.toISOString() };
  const entryHash = sha256Hex(canonicalJson(body));
  await db.auditEvent.create({ data: { ...body, timestamp, entryHash } });
  prevHash = entryHash;
}

// =====================================================================
// Item generators. Each computes its own key from its parameters.
// =====================================================================
type ItemDraft = Omit<AuthoredItemInput, 'id'>;

function seqItem(p: { a1: number; a2: number; mul: number; add: number; n: number }, position = 1): ItemDraft {
  const t = [p.a1, p.a2];
  while (t.length < p.n) t.push(p.mul * t[t.length - 1]! + p.add * t[t.length - 2]!);
  const mulTxt = p.mul === 1 ? 'the previous term' : `${p.mul} times the previous term`;
  const addTxt = p.add === 1 ? 'the term before that' : p.add === 2 ? 'twice the term before that' : `${p.add} times the term before that`;
  return { position, inputType: 'integer', prompt: `A sequence begins ${p.a1}, ${p.a2}. Each later term equals ${mulTxt} plus ${addTxt}. What is the ${ord(p.n)} term of the sequence?`, scoring: { kind: 'numeric', answer: t[p.n - 1]!, points: 1 }, maxPoints: 1, inputHint: 'Whole number' };
}

function seqSumItem(p: { a1: number; a2: number; mul: number; add: number; n: number }, position = 1): ItemDraft {
  const t = [p.a1, p.a2];
  while (t.length < p.n) t.push(p.mul * t[t.length - 1]! + p.add * t[t.length - 2]!);
  const sum = t.reduce((s, v) => s + v, 0);
  return { position, inputType: 'integer', prompt: `A sequence begins ${p.a1}, ${p.a2}. Each later term equals ${p.mul === 1 ? 'the previous term' : `${p.mul} times the previous term`} plus ${p.add === 1 ? 'the term before that' : `${p.add} times the term before that`}. What is the sum of the first ${p.n} terms?`, scoring: { kind: 'numeric', answer: sum, points: 1 }, maxPoints: 1, inputHint: 'Whole number' };
}

interface R2Params {
  bins: number; collatz: [number, number]; seats: [string, string, string, string, 2 | 3];
  reorder: { start: number; usage: number[]; threshold: number; refillTo: number; unitCost: number; fee: number };
  tank: [number, number, number]; warehouses: { names: string[]; rent: number[]; rate: number[]; units: number[] };
  assign: number[][]; ferry: [number, number, number]; code: [number, -1 | 1]; grid: [number, number, number, number];
}

function r2Items(p: R2Params): ItemDraft[] {
  const items: ItemDraft[] = [];
  // 1 bins
  { const a = p.bins, b = 2 * a - 2, c = b + 15, d = Math.floor(c / 2);
    items.push({ position: 1, inputType: 'integer', prompt: `A warehouse has four bins. Bin A holds ${a} units. Bin B holds 2 fewer than twice Bin A. Bin C holds 15 more than Bin B. Bin D holds half of Bin C, rounded down to a whole unit. How many units are there in total?`, scoring: { kind: 'numeric', answer: a + b + c + d, points: 1 }, maxPoints: 1, inputHint: 'Whole number' }); }
  // 2 collatz
  { let v = p.collatz[0]; for (let i = 0; i < p.collatz[1]; i++) v = v % 2 === 0 ? v / 2 : 3 * v + 1;
    items.push({ position: 2, inputType: 'integer', prompt: `Start with the number ${p.collatz[0]}. At each step, if the current number is even, halve it; if it is odd, multiply it by 3 and add 1. What is the number after exactly ${p.collatz[1]} steps?`, scoring: { kind: 'numeric', answer: v, points: 1 }, maxPoints: 1, inputHint: 'Whole number' }); }
  // 3 seats — solved by brute force so the key is proven unique
  { const [n1, n2, n3, n4, ask] = p.seats; const names = [n1, n2, n3, n4];
    const perms: string[][] = []; const go = (rest: string[], acc: string[]) => { if (!rest.length) { perms.push(acc); return; } rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x])); }; go(names, []);
    const ok = perms.filter((s) => { const pos = (n: string) => s.indexOf(n) + 1; return pos(n3) !== 1 && pos(n3) !== 4 && pos(n2) === pos(n4) + 1 && (pos(n1) === 1 || pos(n1) === 4) && pos(n3) < pos(n1); });
    if (ok.length !== 1) throw new Error('seating puzzle not unique');
    items.push({ position: 3, inputType: 'string_exact', prompt: `Four people — ${n1}, ${n2}, ${n3}, and ${n4} — sit in a row of four seats numbered 1 to 4 from left to right, one person per seat. ${n3} is not in an end seat. ${n2} sits immediately to the right of ${n4}. ${n1} sits in seat 1 or seat 4. ${n3} sits somewhere to the left of ${n1}. Who sits in seat ${ask}?`, scoring: { kind: 'exact', answer: ok[0]![ask - 1]!, points: 1 }, maxPoints: 1, inputHint: 'Type one name from the problem' }); }
  // 4 reorder
  { const r = p.reorder; let stock = r.start, cost = 0; const daysN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    r.usage.forEach((u) => { stock -= u; if (stock < r.threshold) { cost += (r.refillTo - stock) * r.unitCost + r.fee; stock = r.refillTo; } });
    items.push({ position: 4, inputType: 'integer', prompt: `A shop starts Monday with ${r.start} units in stock. Daily usage is ${r.usage.map((u, i) => `${daysN[i]} ${u}`).join(', ')}. At the end of any day on which stock is below ${r.threshold}, the shop immediately orders enough units to bring stock back to ${r.refillTo}, paying $${r.unitCost} per unit plus a flat $${r.fee} fee for that order. Orders arrive instantly. What is the total ordering cost for the week, in dollars?`, scoring: { kind: 'numeric', answer: cost, points: 1 }, maxPoints: 1, inputHint: 'Whole number of dollars' }); }
  // 5 tank
  { const [cap, emptyH, fill] = p.tank; const net = cap / emptyH - fill; const h = cap / net; if (Math.abs(h * 100 - Math.round(h * 100)) > 1e-9 || net <= 0) throw new Error('tank params');
    items.push({ position: 5, inputType: 'decimal', prompt: `A tank holds ${cap} liters. Draining alone at a constant rate, it empties completely in ${emptyH} hours. A pipe fills the tank at ${fill} liters per hour. The tank starts full and the drain and the pipe operate together. How many hours pass until the tank is empty? Give the exact value as a decimal.`, scoring: { kind: 'numeric', answer: Math.round(h * 100) / 100, points: 1 }, maxPoints: 1, inputHint: 'Decimal number of hours' }); }
  // 6 warehouses
  { const w = p.warehouses; const totals = w.names.map((n, i) => ({ n, t: w.rent[i]! + w.rate[i]! * w.units[i]! })); if (new Set(totals.map((x) => x.t)).size !== totals.length) throw new Error('warehouse totals not distinct');
    const order = [...totals].sort((a, b) => a.t - b.t).map((x) => x.n);
    items.push({ position: 6, inputType: 'ordering', prompt: `Four warehouses each charge monthly rent plus a per-unit handling rate. ${w.names.map((n, i) => `${n}: $${w.rent[i]!.toLocaleString()} rent, $${w.rate[i]} per unit, ${w.units[i]} units`).join('. ')}. List the four warehouses from lowest to highest total monthly cost.`, scoring: { kind: 'ordering', answer: order, points: 1 }, maxPoints: 1, inputHint: 'Comma-separated names, lowest cost first' }); }
  // 7 assignment
  { const c = p.assign; const couriers = ['A', 'B', 'C']; const zones = ['1', '2', '3']; const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const scored = perms.map((pm) => ({ pm, t: pm.reduce((s, z, i) => s + c[i]![z]!, 0) })).sort((a, b) => a.t - b.t); if (scored[0]!.t === scored[1]!.t) throw new Error('assignment not unique');
    const answer = Object.fromEntries(scored[0]!.pm.map((z, i) => [couriers[i]!, zones[z]!]));
    items.push({ position: 7, inputType: 'assignment', prompt: `Three couriers, A, B, and C, must each be assigned to exactly one of three zones, 1, 2, and 3, with no zone shared. Daily cost in dollars: ${couriers.map((k, i) => `Courier ${k}: zone 1 = ${c[i]![0]}, zone 2 = ${c[i]![1]}, zone 3 = ${c[i]![2]}`).join('; ')}. Give the assignment that minimises total daily cost.`, scoring: { kind: 'assignment', answer, points: 1 }, maxPoints: 1, inputHint: 'Pairs like A→2, B→1, C→3' }); }
  // 8 ferry (tie-order)
  { const [fe, be, bo] = p.ferry; const f = new Set<number>(); for (let t = 0; t <= 360; t += fe) f.add(t); let n = 0; for (let t = bo; t <= 360; t += be) if (f.has(t)) n++; if (n === 0) throw new Error('ferry trivial');
    const hhmm = (m: number) => `${6 + Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    items.push({ position: 8, tieOrderFlag: true, inputType: 'integer', prompt: `A ferry departs every ${fe} minutes, with the first departure at 6:00. A bus arrives at the ferry dock every ${be} minutes, with the first arrival at ${hhmm(bo)}. Counting all times from 6:00 through 12:00 inclusive, how many times do a ferry departure and a bus arrival fall in the same minute?`, scoring: { kind: 'numeric', answer: n, points: 1 }, maxPoints: 1, inputHint: 'Whole number' }); }
  // 9 code (tie-order)
  { const [sum, d] = p.code; const u = (sum - d) / 5; const h = 2 * u; const t = h + d; if (!Number.isInteger(u) || u < 1 || h > 9 || t < 0 || t > 9) throw new Error('code params');
    items.push({ position: 9, tieOrderFlag: true, inputType: 'integer', prompt: `A three-digit code has digits that add up to ${sum}. The hundreds digit is twice the units digit. The tens digit is one ${d === 1 ? 'more' : 'less'} than the hundreds digit. What is the code?`, scoring: { kind: 'numeric', answer: 100 * h + 10 * t + u, points: 1 }, maxPoints: 1, inputHint: 'Three-digit number' }); }
  // 10 grid (tie-order)
  { const [w, h, r, c] = p.grid; const C = (n: number, k: number) => { let v = 1; for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i; return Math.round(v); }; const paths = C(r - 1 + c - 1, r - 1) * C(h - r + w - c, h - r);
    items.push({ position: 10, tieOrderFlag: true, inputType: 'integer', prompt: `A grid has ${w} columns and ${h} rows of cells. A path starts at the top-left cell and reaches the bottom-right cell moving only one cell right or one cell down at a time. How many such paths pass through the cell in row ${r}, column ${c}, counting rows from the top and columns from the left starting at 1?`, scoring: { kind: 'numeric', answer: paths, points: 1 }, maxPoints: 1, inputHint: 'Whole number' }); }
  return items;
}

function routingItem(position: number, p: { DA: number; AB: number; BC: number; CD: number; rate: number; speed: number }): ItemDraft {
  const legs = { DA: p.DA, AB: p.AB, BC: p.BC, CD: p.CD }; const len = p.DA + p.AB + p.BC + p.CD;
  const sorted = Object.entries(legs).sort((a, b) => b[1] - a[1]); if (sorted[0]![1] === sorted[1]![1]) throw new Error('routing longest leg not unique');
  const fuel = Math.round(len * p.rate * 100) / 100; const minutes = (len / p.speed) * 60; if (Math.abs(minutes * 10 - Math.round(minutes * 10)) > 1e-9) throw new Error('routing minutes');
  return { position, inputType: 'assignment', maxPoints: 6, fields: [{ key: 'a', label: '(a) Route length, km' }, { key: 'b', label: '(b) Longest leg, two letters' }, { key: 'c', label: '(c) Fuel cost, $' }, { key: 'd', label: '(d) Minutes' }],
    prompt: `A delivery van leaves depot D, visits stops A, B, and C in that order, and returns to D. Leg distances in km: D to A ${p.DA}, A to B ${p.AB}, B to C ${p.BC}, C to D ${p.CD}. Fuel costs $${p.rate} per km. The van averages ${p.speed} km/h. (a) What is the total route length in km? (b) Which leg is longest? Answer with its two letters, for example AB. (c) What is the total fuel cost in dollars, to the cent? (d) How many minutes does the drive take, to one decimal place?`,
    scoring: { kind: 'parts', parts: [{ key: 'a', type: 'integer', answer: len, weight: 2 }, { key: 'b', type: 'string_exact', answer: sorted[0]![0], weight: 1 }, { key: 'c', type: 'decimal', answer: fuel, weight: 1.5 }, { key: 'd', type: 'decimal', answer: Math.round(minutes * 10) / 10, weight: 1.5 }] } };
}
function staffingItem(position: number, p: { shifts: { name: string; hours: number; wage: number }[] }): ItemDraft {
  const hoursT = p.shifts.reduce((s, x) => s + x.hours, 0); const cost = p.shifts.reduce((s, x) => s + x.hours * x.wage, 0);
  const costs = p.shifts.map((x) => ({ n: x.name, c: x.hours * x.wage })).sort((a, b) => b.c - a.c); if (costs[0]!.c === costs[1]!.c) throw new Error('staffing not unique');
  return { position, inputType: 'assignment', maxPoints: 6, fields: [{ key: 'a', label: '(a) Total hours' }, { key: 'b', label: '(b) Total cost, $' }, { key: 'c', label: '(c) Costliest shift' }],
    prompt: `A café schedules three shifts in one day: ${p.shifts.map((x) => `${x.name} shift, ${x.hours} hours at $${x.wage} per hour`).join('; ')}. (a) How many staff-hours are scheduled in total? (b) What is the total wage cost in dollars? (c) Which shift costs the most? Answer with the shift name.`,
    scoring: { kind: 'parts', parts: [{ key: 'a', type: 'integer', answer: hoursT, weight: 2 }, { key: 'b', type: 'integer', answer: cost, weight: 2 }, { key: 'c', type: 'string_exact', answer: costs[0]!.n, weight: 2 }] } };
}
function mixtureItem(position: number, p: { grams: number; pct: number; evap: number }): ItemDraft {
  const salt = (p.grams * p.pct) / 100; const newPct = (salt / (p.grams - p.evap)) * 100; if (!Number.isInteger(salt) || Math.abs(newPct * 10 - Math.round(newPct * 10)) > 1e-9) throw new Error('mixture params');
  return { position, inputType: 'assignment', maxPoints: 6, fields: [{ key: 'a', label: '(a) Grams of salt' }, { key: 'b', label: '(b) New percentage' }],
    prompt: `A ${p.grams} g salt solution is ${p.pct}% salt by mass. ${p.evap} g of water evaporates and no salt is lost. (a) How many grams of salt does the solution contain? (b) What percentage of the remaining solution is salt, to one decimal place?`,
    scoring: { kind: 'parts', parts: [{ key: 'a', type: 'integer', answer: salt, weight: 3 }, { key: 'b', type: 'decimal', answer: Math.round(newPct * 10) / 10, weight: 3 }] } };
}
function finalItem(p: { budget: number; cap1: number; floor3: number; cap24: number; coef: [number, number, number, number]; labels: [string, string, string, string] }): ItemDraft {
  const [a1, a2, a3, a4] = p.coef; if (!(a1 >= a3 && a3 >= a2 && a3 >= a4 && p.budget - p.cap1 >= p.floor3)) throw new Error('final params');
  const optimum = a1 * p.cap1 + a3 * (p.budget - p.cap1);
  return { position: 1, inputType: 'allocation', maxPoints: optimum, fields: p.labels.map((l, i) => ({ key: `x${i + 1}`, label: `x${i + 1} · ${l}` })),
    prompt: `You are allocating a renovation budget of ${money(p.budget)} across four improvements: x1 ${p.labels[0]}, x2 ${p.labels[1]}, x3 ${p.labels[2]}, x4 ${p.labels[3]}. Each dollar allocated returns the following in assessed value: x1 returns ${a1}, x2 returns ${a2}, x3 returns ${a3}, x4 returns ${a4}. Constraints: the total allocation may not exceed the budget; x1 may not exceed ${money(p.cap1)}; x3 must be at least ${money(p.floor3)}; x2 plus x4 together may not exceed ${money(p.cap24)}; no allocation may be negative. Submit the allocation, in dollars, that maximises total assessed-value return. Your score is the return of your allocation if it satisfies every constraint, and zero otherwise.`,
    scoring: { kind: 'optimization', variables: ['x1', 'x2', 'x3', 'x4'], constraints: [{ expr: { x1: 1, x2: 1, x3: 1, x4: 1 }, op: '<=', rhs: p.budget, label: 'budget' }, { expr: { x1: 1 }, op: '<=', rhs: p.cap1, label: 'x1 cap' }, { expr: { x3: 1 }, op: '>=', rhs: p.floor3, label: 'x3 floor' }, { expr: { x2: 1, x4: 1 }, op: '<=', rhs: p.cap24, label: 'x2+x4 cap' }], objective: { expr: { x1: a1, x2: a2, x3: a3, x4: a4 }, sense: 'max' }, precision: 2 } };
}

// ---------- parameter sets (assertions above prove each key) ----------
const R2: Record<string, R2Params> = {
  A: { bins: 37, collatz: [7, 6], seats: ['Kim', 'Lars', 'Mira', 'Odell', 2], reorder: { start: 45, usage: [12, 9, 14, 11, 8], threshold: 20, refillTo: 60, unitCost: 4, fee: 25 }, tank: [180, 2.5, 24], warehouses: { names: ['North', 'East', 'South', 'West'], rent: [1200, 900, 1500, 1000], rate: [3.5, 4, 2.5, 3], units: [400, 420, 500, 480] }, assign: [[8, 6, 7], [5, 9, 8], [7, 8, 4]], ferry: [40, 25, 10], code: [14, -1], grid: [5, 4, 2, 3] },
  B: { bins: 41, collatz: [9, 6], seats: ['Ana', 'Bo', 'Cyd', 'Dev', 3], reorder: { start: 50, usage: [15, 10, 12, 9, 6], threshold: 20, refillTo: 60, unitCost: 5, fee: 30 }, tank: [240, 4, 20], warehouses: { names: ['North', 'East', 'South', 'West'], rent: [1100, 950, 1400, 1000], rate: [3, 4, 2, 3.5], units: [400, 400, 500, 480] }, assign: [[4, 7, 9], [6, 5, 8], [7, 8, 3]], ferry: [30, 45, 15], code: [16, 1], grid: [6, 4, 2, 4] },
  C: { bins: 29, collatz: [11, 6], seats: ['Ira', 'Jun', 'Kai', 'Lee', 2], reorder: { start: 40, usage: [8, 7, 9, 10, 6], threshold: 20, refillTo: 50, unitCost: 3, fee: 20 }, tank: [150, 3, 10], warehouses: { names: ['Alder', 'Birch', 'Cedar', 'Dogwood'], rent: [1000, 800, 1200, 900], rate: [3, 4, 2, 2.5], units: [300, 350, 400, 500] }, assign: [[5, 8, 6], [7, 4, 9], [8, 7, 5]], ferry: [20, 35, 5], code: [19, -1], grid: [4, 4, 2, 2] },
  D: { bins: 33, collatz: [15, 7], seats: ['Nell', 'Omar', 'Pia', 'Rex', 3], reorder: { start: 48, usage: [11, 13, 9, 12, 7], threshold: 25, refillTo: 70, unitCost: 4, fee: 35 }, tank: [200, 4, 10], warehouses: { names: ['Harbor', 'Ridge', 'Meadow', 'Quarry'], rent: [800, 1300, 600, 1100], rate: [5, 2, 6, 3], units: [200, 300, 250, 350] }, assign: [[6, 9, 5], [4, 8, 7], [9, 5, 8]], ferry: [36, 24, 12], code: [21, 1], grid: [5, 5, 3, 3] },
  E: { bins: 45, collatz: [13, 5], seats: ['Sam', 'Tess', 'Uma', 'Vik', 2], reorder: { start: 55, usage: [14, 12, 16, 8, 9], threshold: 20, refillTo: 65, unitCost: 6, fee: 40 }, tank: [300, 5, 20], warehouses: { names: ['Elm', 'Fir', 'Gum', 'Hazel'], rent: [1500, 700, 900, 1200], rate: [1, 4, 3, 2.5], units: [600, 300, 450, 400] }, assign: [[3, 6, 8], [7, 4, 6], [5, 9, 4]], ferry: [50, 30, 20], code: [9, -1], grid: [6, 3, 2, 3] },
  F: { bins: 27, collatz: [19, 5], seats: ['Wren', 'Xavi', 'Yuki', 'Zed', 3], reorder: { start: 42, usage: [9, 11, 13, 6, 10], threshold: 18, refillTo: 55, unitCost: 3, fee: 15 }, tank: [120, 2, 30], warehouses: { names: ['Iris', 'Jade', 'Kestrel', 'Larch'], rent: [950, 1250, 700, 1050], rate: [2.5, 1.5, 4, 3], units: [500, 600, 320, 380] }, assign: [[9, 4, 7], [5, 8, 6], [6, 7, 3]], ferry: [24, 40, 8], code: [11, 1], grid: [5, 3, 2, 2] },
};
const R3 = {
  A: [routingItem(1, { DA: 12, AB: 10, BC: 9, CD: 15, rate: 0.4, speed: 50 }), staffingItem(2, { shifts: [{ name: 'Morning', hours: 6, wage: 18 }, { name: 'Afternoon', hours: 5, wage: 20 }, { name: 'Night', hours: 8, wage: 24 }] }), { ...mixtureItem(3, { grams: 500, pct: 12, evap: 100 }), tieOrderFlag: true }, { ...routingItem(4, { DA: 14, AB: 11, BC: 8, CD: 17, rate: 0.45, speed: 40 }), tieOrderFlag: true }],
  B: [routingItem(1, { DA: 9, AB: 13, BC: 11, CD: 12, rate: 0.5, speed: 60 }), staffingItem(2, { shifts: [{ name: 'Open', hours: 5, wage: 19 }, { name: 'Mid', hours: 7, wage: 17 }, { name: 'Close', hours: 6, wage: 23 }] }), { ...mixtureItem(3, { grams: 400, pct: 15, evap: 100 }), tieOrderFlag: true }, { ...routingItem(4, { DA: 16, AB: 7, BC: 10, CD: 19, rate: 0.35, speed: 40 }), tieOrderFlag: true }],
};
const FINAL = {
  A: finalItem({ budget: 100000, cap1: 40000, floor3: 10000, cap24: 50000, coef: [1.8, 1.2, 1.5, 1.1], labels: ['roof and envelope', 'landscaping', 'kitchen', 'smart systems'] }),
  B: finalItem({ budget: 120000, cap1: 50000, floor3: 15000, cap24: 60000, coef: [1.7, 1.3, 1.4, 1.0], labels: ['foundation and drainage', 'exterior paint', 'primary bath', 'lighting'] }),
};
const TIEBREAK = [seqSumItem({ a1: 2, a2: 7, mul: 1, add: 3, n: 8 }), seqSumItem({ a1: 4, a2: 5, mul: 2, add: 1, n: 7 })];

// =====================================================================
// DB helpers
// =====================================================================
async function createForm(openId: string, slug: string, roundNumber: string, label: 'primary' | 'reserve' | 'tiebreak', drafts: ItemDraft[], opts: { seal: boolean; sealedAt?: Date; releasedAt?: Date | null }) {
  const pre = validateForm(drafts.map((d, i) => ({ ...d, id: `tmp-${i}` })));
  if (!pre.ok) throw new Error(`${slug}/${roundNumber}/${label}: ${pre.problems.join('; ')}`);
  const form = await db.form.create({ data: { meritOpenId: openId, roundNumber, label } });
  const rows: Item[] = [];
  for (const d of drafts) rows.push(await db.item.create({ data: { formId: form.id, position: d.position, prompt: d.prompt, inputType: d.inputType, scoringSpecJson: opts.seal ? null : JSON.stringify(d.scoring), maxPoints: d.maxPoints, tieOrderFlag: !!d.tieOrderFlag, calculatorPermitted: !!d.calculatorPermitted, inputHint: d.inputHint ?? null, fieldsJson: d.fields ? JSON.stringify(d.fields) : null } }));
  let hash: string | null = null;
  if (opts.seal) {
    const full = validateForm(drafts.map((d, i) => ({ ...d, id: rows[i]!.id }))).reports.map((r) => r.item!);
    const pkg = buildPackage({ meritOpenSlug: slug, round: roundNumber, label, formId: form.id, items: full, authoredAt: (opts.sealedAt ?? now).toISOString() });
    hash = pkg.hash;
    await db.form.update({ where: { id: form.id }, data: { packageHash: hash, hashPublishedAt: opts.sealedAt ?? now, sealedPackage: sealPackage(pkg.plaintext, SEAL_KEY), releasedPackage: opts.releasedAt ? pkg.plaintext : null, packageReleasedAt: opts.releasedAt ?? null } });
  }
  const keys: FormItemKey[] = rows.map((r, i) => ({ itemId: r.id, position: r.position, spec: drafts[i]!.scoring as ScoringSpec, tieOrderFlag: !!drafts[i]!.tieOrderFlag }));
  return { form, rows, keys, hash };
}

const FIRST = ['Ada', 'Bram', 'Celia', 'Dev', 'Esme', 'Farid', 'Greta', 'Hugo', 'Ines', 'Jonah', 'Kira', 'Luca', 'Maren', 'Nico', 'Orla', 'Pavel', 'Quinn', 'Rosa', 'Soren', 'Tova', 'Uri', 'Vera', 'Wes', 'Xia', 'Yara', 'Zeke', 'Anouk', 'Bo', 'Cass', 'Dario', 'Elin', 'Finn', 'Gia', 'Hal', 'Ivo', 'Juno', 'Kit', 'Lior', 'Mika', 'Noor'];
const LAST = ['Whitfield', 'Okafor', 'Lindqvist', 'Marchetti', 'Nakamura', 'Oyelaran', 'Petrov', 'Quintero', 'Rasmussen', 'Sato', 'Thorne', 'Underhill', 'Vasquez', 'Wren', 'Xu', 'Yilmaz', 'Zahra', 'Abernathy', 'Brooks', 'Castellano'];
const STREETS = ['Alder Ridge Ln', 'Meridian Ct', 'Larkspur Way', 'Cedar Hollow Rd', 'Quarry St', 'Harbor View Dr'];
const CITIES: Record<string, string[]> = { WA: ['Hollow Creek', 'Bellingham', 'Olympia', 'Spokane'], OR: ['Bend', 'Eugene', 'Astoria'], ID: ['Boise', 'Moscow'] };

async function makeUser(prefix: string, i: number, state: string, opts: { full?: boolean; createdAt?: Date } = {}) {
  const first = FIRST[(i * 7 + prefix.length) % FIRST.length]!; const last = LAST[(i * 3 + prefix.length) % LAST.length]!;
  const city = pick(CITIES[state] ?? ['Somewhere']);
  return db.user.create({ data: {
    email: `${prefix}${String(i).padStart(3, '0')}@example.test`, legalName: `${first} ${last}`, phone: `+1 555 0${String(100 + i).slice(-3)} ${String(1000 + i * 13).slice(-4)}`,
    dob: new Date(Date.UTC(between(1962, 2004), between(0, 11), between(1, 28))), residenceState: state, residenceAddress: `${between(10, 4999)} ${pick(STREETS)}, ${city}, ${state}`,
    role: 'registrant', idvStatus: 'verified', idvLevel: opts.full === false ? 'light' : 'full', idvVerifiedAt: opts.createdAt ?? days(-5), idvVendorRef: `mock_idv_${prefix}${i}`, sanctionsStatus: 'clear', sanctionsCheckedAt: opts.createdAt ?? days(-5), createdAt: opts.createdAt ?? days(-5),
  } });
}

function rulesConfig(o: { slug: string; fee: number; cash: number; states: string[]; openAt: Date; closeAt: Date; rounds: { number: 'r1' | 'r2' | 'r3' | 'final'; windowStart?: Date; windowEnd?: Date; scheduledAt?: Date; durationSeconds: number; integrityTier: 1 | 2 | 3; itemCount: number }[]; N: number; M: number; disclosures?: RulesetConfigInput['disclosures']; practice?: boolean }): RulesetConfigInput {
  return {
    version: '1.0', meritOpenSlug: o.slug, registrationFeeCents: o.fee, cashComponentCents: o.cash, eligibleStates: o.states, minimumAge: 18,
    registrationOpenAt: o.openAt.toISOString(), registrationCloseAt: o.closeAt.toISOString(),
    rounds: o.rounds.map((r) => ({ number: r.number, windowStart: r.windowStart?.toISOString(), windowEnd: r.windowEnd?.toISOString(), scheduledAt: r.scheduledAt?.toISOString(), durationSeconds: r.durationSeconds, integrityTier: r.integrityTier, itemCount: r.itemCount })),
    advanceN: o.N, advanceM: o.M, tieOrderSubsets: { r2: [8, 9, 10], r3: [3, 4] }, r1LatencyGraceSeconds: 3, disputeWindowHours: 72, refundSlaDays: 30, firstAccessHours: 72, certificationDays: 14, closingDays: 60,
    retention: { scoresKeysCertificationsYears: 7, proctoringMediaMonthsPostClosing: 12 },
    technicalFailurePolicy: 'Exhibit E: a verified platform or proctoring failure is remedied by re-administering the affected round to all affected registrants with the committed reserve form. No score is ever adjusted.',
    accommodationPolicy: 'Rules 8.7: extended time and assistive technology where reasonable; requests due 7 days before the round; never alters items, keys, or scoring.', accommodationRequestDeadlineDays: 7,
    cancellationReasonCodes: CANCELLATION_REASONS.map((r) => ({ code: r.code, description: r.description })), termsVersion: '1.0', privacyVersion: '1.0', disclosures: o.disclosures ?? [],
    parties: { sponsor: '[SPONSOR LEGAL NAME]', propertyOwner: o.practice ? 'n/a (practice event)' : '[PROPERTY SPE LEGAL NAME]', administrator: '[ADMINISTRATOR COMPANY NAME]', custodian: '[CUSTODIAN NAME]', titleCompany: '[TITLE COMPANY]' },
  };
}

async function lockOpen(openId: string, slug: string, cfgInput: RulesetConfigInput, rulesText: string, adminId: string, at: Date, formsPublished: { formId: string; hash: string | null; round: string; label: string }[]) {
  const cfg = parseRuleset(cfgInput);
  const rulesHash = hashRuleset(cfg, rulesText);
  const rs = await db.ruleset.create({ data: { meritOpenId: openId, version: cfg.version, configJson: JSON.stringify(cfg), officialRulesText: rulesText, termsVersion: cfg.termsVersion, hash: rulesHash, lockedAt: at, createdAt: new Date(at.getTime() - 86400e3) } });
  await db.meritOpen.update({ where: { id: openId }, data: { rulesHash, rulesVersion: cfg.version, lockedAt: at, lockedById: adminId } });
  const doc = { meritOpen: slug, lockedAt: at.toISOString(), rulesVersion: cfg.version, rulesHash, forms: formsPublished, administrator: adminId };
  await db.certification.create({ data: { meritOpenId: openId, type: 'lock', documentJson: JSON.stringify(doc), hash: hashObject(doc), signedById: adminId, signedAt: at } });
  await audit({ actorId: adminId, actorRole: 'administrator', action: 'meritopen.lock', objectType: 'MeritOpen', objectId: openId, after: doc, at });
  return { rs, rulesHash };
}

function wrongFor(spec: ScoringSpec, salt: number): string {
  switch (spec.kind) {
    case 'numeric': return String(spec.answer + [1, 2, 3, 7, 10, -1, -2][salt % 7]!);
    case 'exact': return ['Nobody', 'Lars', 'Mira', 'Kai', 'Jun', 'Bo', 'Odell'][salt % 7]! === spec.answer ? 'Nobody' : ['Nobody', 'Lars', 'Mira', 'Kai', 'Jun', 'Bo', 'Odell'][salt % 7]!;
    case 'ordering': { const a = [...spec.answer]; const i = salt % (a.length - 1); [a[i], a[i + 1]] = [a[i + 1]!, a[i]!]; return a.join(', '); }
    case 'assignment': { const e = Object.entries(spec.answer); const i = salt % (e.length - 1); return e.map(([k, v], j) => `${k}→${j === i ? e[i + 1]![1] : j === i + 1 ? e[i]![1] : v}`).join(', '); }
    default: return '';
  }
}

// =====================================================================
export async function runSeed(client: PrismaClient, sealKey: string): Promise<Record<string, number>> {
  db = client; SEAL_KEY = sealKey; seedState = 20260910; prevHash = null;
  if (SEAL_KEY.length !== 64) throw new Error('ADMINISTRATOR_SEAL_KEY (64 hex chars) is required to seal packages');
  console.log('→ resetting');
  for (const m of ['response', 'score', 'integrityFlag', 'attempt', 'advancement', 'dispute', 'refund', 'payment', 'registration', 'reservation', 'accommodation', 'notification', 'certification', 'round', 'item', 'form', 'ruleset', 'meritOpen', 'property', 'exclusionEntry', 'vendor', 'stateRule', 'siteSetting', 'auditEvent', 'user'] as const) {
    // @ts-expect-error dynamic model access
    await db[m].deleteMany();
  }

  // ---------- staff & personas ----------
  const admin = await db.user.create({ data: { email: 'dima@earnthekeys.test', legalName: 'Dima (Founder · Platform Admin)', role: 'admin', mfaEnabled: true, createdAt: days(-90) } });
  const administrator = await db.user.create({ data: { email: 'administrator@meridian-verification.test', legalName: 'Independent Administrator (demo)', role: 'administrator', mfaEnabled: true, createdAt: days(-90) } });
  const auditor = await db.user.create({ data: { email: 'counsel@auditor.test', legalName: 'Outside Counsel (read-only auditor)', role: 'auditor', mfaEnabled: true, createdAt: days(-90) } });
  const author = await db.user.create({ data: { email: 'author@items.test', legalName: 'Item Author (contracted)', role: 'item_author', createdAt: days(-90) } });
  const ada = await db.user.create({ data: { email: 'ada@example.test', legalName: 'Ada Whitfield', phone: '+1 555 0100 2211', dob: new Date(Date.UTC(1991, 4, 14)), residenceState: 'WA', residenceAddress: '18 Meridian Ct, Hollow Creek, WA', role: 'registrant', idvStatus: 'verified', idvLevel: 'full', idvVerifiedAt: days(-12), idvVendorRef: 'mock_idv_full_ada', sanctionsStatus: 'clear', sanctionsCheckedAt: days(-12), createdAt: days(-70) } });
  await audit({ actorId: admin.id, actorRole: 'admin', action: 'platform.bootstrap', objectType: 'Platform', objectId: 'seed', at: days(-90), detail: { note: 'Development seed. Bracketed values are placeholders pending counsel.' } });

  // ---------- states, vendors, exclusions, legal ----------
  const STATES: [string, string][] = [['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']];
  const ELIGIBLE = ['WA', 'OR', 'ID'];
  for (const [code, name] of STATES) await db.stateRule.create({ data: { code, name, eligible: ELIGIBLE.includes(code), counselStatus: ELIGIBLE.includes(code) ? 'demo_only' : code === 'CA' ? 'in_review' : code === 'WA' ? 'later_phase' : 'not_reviewed', disclosureTemplate: code === 'CA' ? 'CA-BP-17539.1' : null, notes: ELIGIBLE.includes(code) ? 'Marked eligible for the development build only. Not cleared by counsel.' : code === 'CA' ? 'B&P 17539.1 disclosure template drafted; not cleared.' : null } });
  for (const v of [
    { kind: 'custodian', name: '[CUSTODIAN NAME] — trust / FBO account', publicSummaryUrl: null },
    { kind: 'administrator', name: '[ADMINISTRATOR COMPANY NAME]', publicSummaryUrl: null },
    { kind: 'payments', name: 'Stripe (adapter · mock in development)', publicSummaryUrl: null },
    { kind: 'idv', name: 'Persona (adapter · mock in development)', publicSummaryUrl: null },
    { kind: 'sanctions', name: 'OFAC screening bundled with IDV (mock)', publicSummaryUrl: null },
    { kind: 'proctoring', name: 'ProctorU-type live proctoring (mock)', publicSummaryUrl: null },
    { kind: 'title', name: '[TITLE COMPANY]', publicSummaryUrl: null },
    { kind: 'timestamping', name: 'OpenTimestamps (optional public anchoring)', publicSummaryUrl: 'https://opentimestamps.org' },
  ]) await db.vendor.create({ data: { ...v, configJson: '{}' } });
  await db.exclusionEntry.createMany({ data: [
    { matchType: 'domain', value: 'earnthekeys.test', category: 'employee', party: 'Sponsor', addedById: admin.id },
    { matchType: 'email', value: 'author@items.test', category: 'item_author', party: 'Sponsor', addedById: admin.id },
    { matchType: 'domain', value: 'meridian-verification.test', category: 'vendor', party: 'Administrator', addedById: admin.id },
    { matchType: 'name', value: '[Seller principal name]', category: 'seller', party: 'Seller', addedById: admin.id },
  ] });
  const rulesText = OFFICIAL_RULES_DRAFT;
  await db.siteSetting.create({ data: { key: 'legal.terms', valueJson: JSON.stringify({ version: '1.0', status: 'draft for counsel', text: TERMS_DRAFT }) } });
  await db.siteSetting.create({ data: { key: 'legal.privacy', valueJson: JSON.stringify({ version: '0.1', status: 'pending counsel', text: 'PRIVACY POLICY\n[Pending counsel.]\n\n1. What we collect\n1.1 Account and identity data: email, phone, date of birth, legal name, residence address, and the reference and result returned by our identity-verification vendor. We do not store images of identity documents or selfies.\n1.2 Test-session data: server timestamps, device and session identifiers, IP address, focus-loss events, and, for proctored rounds, references to the proctoring vendor’s session recordings, which the vendor retains under the published retention policy.\n1.3 Payment data is processed by the payment processor; we store only references and amounts.\n2. Why we collect it\nIdentity and eligibility verification, integrity screening, scoring and certification, tax reporting, legal compliance, and the public audit summary described in the Official Rules.\n3. Biometric data\n[State-specific biometric consent language to be supplied by counsel.]\n4. Retention\nScores, keys, and certifications: [7] years. Proctoring media: [12] months after closing. Identity-verification references: per vendor agreement.\n5. Your rights\n[Per state law.]' }) } });
  await db.siteSetting.create({ data: { key: 'legal.accessibility', valueJson: JSON.stringify({ version: '0.1', status: 'draft', text: 'ACCESSIBILITY\n1. Commitment\nRegistrant-facing pages are built to WCAG 2.1 AA. The test client honours accommodation flags (extended time, large text, screen-reader mode) without changing any item, key, or formula.\n2. Requesting an accommodation\nSubmit a request from your account no later than [7] days before the round. Decisions are made under a written procedure and never on the basis of any score.\n3. Contact\n[EMAIL]' }) } });
  await db.siteSetting.create({ data: { key: 'legal.disputes', valueJson: JSON.stringify({ version: '0.1', status: 'draft', text: 'EXHIBIT E — INTEGRITY REVIEW, TECHNICAL-FAILURE VERIFICATION, AND DISPUTE PROCEDURE\n1. Score challenges (Rules 11.1)\n1.1 Filed from your account within [72 hours] after scores are posted; must identify the item and the claimed error.\n1.2 The Administrator decides by applying the locked answer key and formulas. The Administrator has no authority to alter either.\n2. Integrity reports (Rules 11.2)\n2.1 Any person may report a suspected violation of Section 8. Reports are reviewed by the Administrator against the evidence produced by screening and proctoring.\n2.2 Flags are decided as cleared or upheld. Upheld flags result in disqualification and forfeiture.\n3. Technical failure (Rules 8.8)\n3.1 The platform provides server logs (uptime, error rates) for the round window.\n3.2 A verified failure is remedied only by re-administration with the committed reserve form to all affected registrants.\n4. Records\nEvery decision is written, hashed, and listed in the public audit summary in aggregate.' }) } });

  // =====================================================================
  // 1. PRACTICE — SUMMER (complete). Phase 0 demand test with full record.
  // =====================================================================
  console.log('→ practice-summer (complete)');
  const practiceProp = await db.property.create({ data: { demo: true, slug: 'practice-event', name: 'Practice event · no property conveyed', address: 'n/a', city: 'Online', state: 'WA', titleStatus: 'owned', status: 'live', description: 'Practice Merit Opens carry a small cash award so the mechanics can be tested at scale. No property is conveyed.', createdAt: days(-70) } });
  const ps = await db.meritOpen.create({ data: { demo: true, slug: 'practice-summer', propertyId: practiceProp.id, name: 'The Summer Practice Merit Open', city: 'Online', isPractice: true, stateEligibilityJson: JSON.stringify(ELIGIBLE), registrationFeeCents: 0, cashComponentCents: 250000, registrationOpenAt: days(-60), registrationCloseAt: days(-40), advanceN: 10, advanceM: 3, status: 'complete', closedAt: days(-20), winnerConsentToPublish: true, listingNo: 'ETK-2026-001', createdAt: days(-70) } });
  const psR1win: [Date, Date] = [days(-38), days(-36)]; const psR2win: [Date, Date] = [days(-34), days(-32)];
  const psR1 = await createForm(ps.id, ps.slug, 'r1', 'primary', [seqItem({ a1: 1, a2: 3, mul: 2, add: 1, n: 6 })], { seal: true, sealedAt: days(-62), releasedAt: days(-25) });
  const psR1res = await createForm(ps.id, ps.slug, 'r1', 'reserve', [seqItem({ a1: 2, a2: 3, mul: 1, add: 3, n: 7 })], { seal: true, sealedAt: days(-62) });
  const psR2 = await createForm(ps.id, ps.slug, 'r2', 'primary', r2Items(R2.C!), { seal: true, sealedAt: days(-62), releasedAt: days(-25) });
  const psR2res = await createForm(ps.id, ps.slug, 'r2', 'reserve', r2Items(R2.D!), { seal: true, sealedAt: days(-62) });
  const psRound1 = await db.round.create({ data: { meritOpenId: ps.id, number: 'r1', sequence: 1, type: 'qualifier', windowStart: psR1win[0], windowEnd: psR1win[1], durationSeconds: 60, latencyGraceSeconds: 3, integrityTier: 1, formId: psR1.form.id, reserveFormId: psR1res.form.id, status: 'certified', unsealedAt: days(-35.9), unsealedById: administrator.id, scoresPostedAt: days(-35.8), disputeDeadlineAt: days(-32.8) } });
  const psRound2 = await db.round.create({ data: { meritOpenId: ps.id, number: 'r2', sequence: 2, type: 'items', windowStart: psR2win[0], windowEnd: psR2win[1], durationSeconds: 600, latencyGraceSeconds: 3, integrityTier: 1, capacity: 10, formId: psR2.form.id, reserveFormId: psR2res.form.id, status: 'certified', unsealedAt: days(-31.9), unsealedById: administrator.id, scoresPostedAt: days(-31), disputeDeadlineAt: days(-28) } });
  const psCfg = rulesConfig({ slug: ps.slug, fee: 0, cash: 250000, states: ELIGIBLE, openAt: days(-60), closeAt: days(-40), N: 10, M: 3, practice: true, rounds: [{ number: 'r1', windowStart: psR1win[0], windowEnd: psR1win[1], durationSeconds: 60, integrityTier: 1, itemCount: 1 }, { number: 'r2', windowStart: psR2win[0], windowEnd: psR2win[1], durationSeconds: 600, integrityTier: 1, itemCount: 10 }] });
  const psLock = await lockOpen(ps.id, ps.slug, psCfg, rulesText, administrator.id, days(-62), [psR1, psR1res, psR2, psR2res].map((f) => ({ formId: f.form.id, hash: f.hash, round: f.form.roundNumber, label: f.form.label })));
  await audit({ actorId: admin.id, actorRole: 'admin', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: ps.id, before: { status: 'draft' }, after: { status: 'reservation' }, at: days(-65) });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: ps.id, before: { status: 'reservation' }, after: { status: 'registration' }, at: days(-60) });

  // registrants
  const psUsers = []; const psRegs: Registration[] = [];
  for (let i = 1; i <= 40; i++) {
    const u = await makeUser('ps', i, pick(['WA', 'WA', 'WA', 'OR', 'ID']), { createdAt: days(-58 + i * 0.4) });
    const reg = await db.registration.create({ data: { userId: u.id, meritOpenId: ps.id, status: 'confirmed', confirmedAt: days(-58 + i * 0.4), eligibilitySnapshotJson: JSON.stringify({ state: u.residenceState, geoState: u.residenceState, geoSource: 'seed', age: 30, sanctions: 'clear', exclusions: 0, priorWinner: false }), acceptedRulesHash: psLock.rulesHash, acceptedTermsVersion: '1.0', acceptedAt: days(-58 + i * 0.4), proctoringConsentAt: days(-58 + i * 0.4), createdAt: days(-58 + i * 0.4) } });
    await db.payment.create({ data: { registrationId: reg.id, provider: 'mock', processorRef: `mock_pi_ps${i}`, amountCents: 0, status: 'settled', custodianSettlementRef: `mock_custody_ps${i}`, settledAt: reg.confirmedAt } });
    psUsers.push(u); psRegs.push(reg);
  }
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: ps.id, before: { status: 'registration' }, after: { status: 'r1' }, at: days(-40) });

  // R1 attempts
  const skill = psUsers.map(() => rnd());
  const r1Key = psR1.keys[0]!;
  const r1Pass_: boolean[] = [];
  for (let i = 0; i < 40; i++) {
    if (i === 30 || i === 31) { r1Pass_.push(false); continue; } // never attempted
    const startedAt = new Date(psR1win[0].getTime() + rnd() * (psR1win[1].getTime() - psR1win[0].getTime() - 120e3));
    const elapsed = between(14, 58); const submittedAt = new Date(startedAt.getTime() + elapsed * 1000);
    const SPECIAL = new Set([4, 5, 6, 7, 8, 11, 14, 19, 20, 21]);
    const correct = skill[i]! > 0.28 || SPECIAL.has(i);
    const raw = correct ? String((r1Key.spec as { answer: number }).answer) : wrongFor(r1Key.spec, i);
    const att = await db.attempt.create({ data: { registrationId: psRegs[i]!.id, roundId: psRound1.id, formId: psR1.form.id, startedAt, expiresAt: new Date(startedAt.getTime() + 60e3), submittedAt, sessionToken: `seed_r1_${i}`, deviceFingerprint: `fp_${i}`, ip: `10.0.${Math.floor(i / 8)}.${i}`, status: 'submitted' } });
    const s = scoreAttempt([r1Key], { registrationId: psRegs[i]!.id, answers: { [r1Key.itemId]: raw }, elapsedSeconds: elapsed });
    await db.response.create({ data: { attemptId: att.id, itemId: r1Key.itemId, rawAnswer: raw, renderedAt: startedAt, submittedAt, score: s.perItem[r1Key.itemId]!.points, valid: s.perItem[r1Key.itemId]!.valid, canonical: s.perItem[r1Key.itemId]!.canonical } });
    const pass = r1Pass(r1Key.spec, raw, true);
    await db.score.create({ data: { attemptId: att.id, totalPoints: s.totalPoints, tieOrderPoints: 0, elapsedSeconds: elapsed, r1Pass: pass, keyPackageHashUsed: psR1.hash!, computedAt: days(-35.9) } });
    r1Pass_.push(pass);
  }
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'round.unseal', objectType: 'Round', objectId: psRound1.id, detail: { packageHash: psR1.hash }, at: days(-35.9) });
  const r1Doc = { meritOpen: ps.slug, round: 'r1', certifiedAt: days(-35.8).toISOString(), rulesHash: psLock.rulesHash, packageHash: psR1.hash, decisions: psRegs.map((r, i) => ({ registrationId: r.id, rank: null, advanced: r1Pass_[i], reason: r1Pass_[i] ? 'r1_pass' : 'r1_fail' })).filter((_, i) => i !== 30 && i !== 31) };
  const r1Cert = await db.certification.create({ data: { meritOpenId: ps.id, roundId: psRound1.id, type: 'r1_pass_list', documentJson: JSON.stringify(r1Doc), hash: hashObject(r1Doc), signedById: administrator.id, signedAt: days(-35.8) } });
  await db.advancement.createMany({ data: r1Doc.decisions.map((d) => ({ roundId: psRound1.id, registrationId: d.registrationId, rank: null, advanced: !!d.advanced, reason: d.reason, certificationId: r1Cert.id, certifiedAt: days(-35.8) })) });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'round.certify', objectType: 'Round', objectId: psRound1.id, after: { certificationId: r1Cert.id, hash: r1Cert.hash, advanced: r1Pass_.filter(Boolean).length }, at: days(-35.8) });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: ps.id, before: { status: 'r1' }, after: { status: 'r2' }, at: days(-35.8) });

  // R2 attempts
  const keys2 = psR2.keys;
  type Pattern = { correct: boolean[]; elapsed: number };
  const patternFor = (i: number): Pattern => ({ correct: keys2.map((_, k) => rnd() < 0.3 + skill[i]! * 0.6 - k * 0.02), elapsed: between(280, 590) });
  const patterns = new Map<number, Pattern>();
  const trio = [4, 5, 6]; const trioPattern: Pattern = { correct: [true, true, true, false, true, false, true, true, false, false], elapsed: 455 };
  for (let i = 0; i < 40; i++) if (r1Pass_[i]) patterns.set(i, trio.includes(i) ? { ...trioPattern, elapsed: trioPattern.elapsed + i } : patternFor(i));
  // standings from patterns to find the rank-10 registrant, then clone their pattern for the inclusion trio (distinct wrong answers)
  const standingOf = (i: number, p: Pattern) => ({ registrationId: psRegs[i]!.id, totalPoints: p.correct.filter(Boolean).length, tieOrderPoints: p.correct.slice(7).filter(Boolean).length, elapsedSeconds: p.elapsed });
  const prelim = [...patterns.entries()].filter(([i]) => ![19, 20, 21].includes(i)).map(([i, p]) => standingOf(i, p)).sort((a, b) => b.totalPoints - a.totalPoints || b.tieOrderPoints - a.tieOrderPoints || a.elapsedSeconds - b.elapsedSeconds);
  const tenth = prelim[9]!; const tenthIdx = psRegs.findIndex((r) => r.id === tenth.registrationId);
  for (const i of [19, 20, 21]) if (patterns.has(i)) patterns.set(i, { correct: [...patterns.get(tenthIdx)!.correct], elapsed: patterns.get(tenthIdx)!.elapsed });
  const answersFor = (i: number, p: Pattern) => Object.fromEntries(keys2.map((k, idx) => [k.itemId, p.correct[idx] ? keyAnswer(k.spec) : wrongFor(k.spec, trio.includes(i) ? 3 : i + idx)]));
  function keyAnswer(spec: ScoringSpec): string { switch (spec.kind) { case 'numeric': return String(spec.answer); case 'exact': return spec.answer; case 'ordering': return spec.answer.join(', '); case 'assignment': return Object.entries(spec.answer).map(([k, v]) => `${k}→${v}`).join(', '); default: return ''; } }
  const attempts2 = new Map<number, string>();
  for (const [i, p] of patterns) {
    const startedAt = new Date(psR2win[0].getTime() + rnd() * (psR2win[1].getTime() - psR2win[0].getTime() - 700e3));
    const submittedAt = new Date(startedAt.getTime() + p.elapsed * 1000);
    const fp = i === 7 || i === 8 ? 'fp_shared_household' : `fp_${i}`;
    const focus = i === 11 ? JSON.stringify([1, 2, 3, 4, 5, 6].map((n) => ({ type: n % 2 ? 'window_blur' : 'visibility_hidden', at: startedAt.getTime() + n * 40e3 }))) : '[]';
    const att = await db.attempt.create({ data: { registrationId: psRegs[i]!.id, roundId: psRound2.id, formId: psR2.form.id, startedAt, expiresAt: new Date(startedAt.getTime() + 600e3), submittedAt, sessionToken: `seed_r2_${i}`, deviceFingerprint: fp, ip: i === 7 || i === 8 ? '10.9.9.9' : `10.0.${Math.floor(i / 8)}.${i}`, status: 'submitted', focusLossEventsJson: focus } });
    attempts2.set(i, att.id);
    const answers = answersFor(i, p);
    const s = scoreAttempt(keys2, { registrationId: psRegs[i]!.id, answers, elapsedSeconds: p.elapsed });
    let t = startedAt.getTime(); const per = p.elapsed / keys2.length;
    for (const k of keys2) { const renderedAt = new Date(t); t += per * 1000 * (0.6 + rnd() * 0.8); const sub = new Date(Math.min(t, submittedAt.getTime())); await db.response.create({ data: { attemptId: att.id, itemId: k.itemId, rawAnswer: answers[k.itemId]!, renderedAt, submittedAt: sub, score: s.perItem[k.itemId]!.points, valid: s.perItem[k.itemId]!.valid, canonical: s.perItem[k.itemId]!.canonical } }); }
    await db.score.create({ data: { attemptId: att.id, totalPoints: s.totalPoints, tieOrderPoints: s.tieOrderPoints, elapsedSeconds: p.elapsed, keyPackageHashUsed: psR2.hash!, computedAt: days(-31.9) } });
  }
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'round.unseal', objectType: 'Round', objectId: psRound2.id, detail: { packageHash: psR2.hash }, at: days(-31.9) });
  // flags + decisions
  const flag = async (i: number, type: string, evidence: unknown, status: 'cleared' | 'upheld', note: string) => {
    const f = await db.integrityFlag.create({ data: { attemptId: attempts2.get(i)!, type, evidenceJson: JSON.stringify(evidence), status, decidedById: administrator.id, decidedAt: days(-31.5), decisionNote: note, createdAt: days(-31.9) } });
    await audit({ actorId: administrator.id, actorRole: 'administrator', action: `integrity.${status}`, objectType: 'IntegrityFlag', objectId: f.id, detail: { type, note }, at: days(-31.5) });
  };
  const trioIds = trio.map((i) => attempts2.get(i)!);
  await flag(4, 'duplicate_answers', { sharedWrongAnswers: ['4=…', '6=…', '9=…', '10=…'], clusterSize: 3, attemptIds: trioIds }, 'upheld', 'Identical wrong-answer vector on four items with implausible shared error strings; registrant admitted receiving answers by message. Disqualified under Rules 8.5.');
  await flag(5, 'duplicate_answers', { sharedWrongAnswers: ['4=…', '6=…', '9=…', '10=…'], clusterSize: 3, attemptIds: trioIds }, 'cleared', 'Review of timestamps shows this registrant submitted first; the shared vector originated here. No evidence this registrant received assistance.');
  await flag(6, 'duplicate_answers', { sharedWrongAnswers: ['4=…', '6=…', '9=…', '10=…'], clusterSize: 3, attemptIds: trioIds }, 'cleared', 'Same household as ps005; separate verified identities; no assistance evidenced for this registrant.');
  await flag(7, 'shared_device', { fingerprint: 'fp_shared_household', attemptIds: [attempts2.get(7), attempts2.get(8)] }, 'cleared', 'Two household members on one laptop, verified separately; attempts 3 hours apart.');
  await flag(8, 'shared_device', { fingerprint: 'fp_shared_household', attemptIds: [attempts2.get(7), attempts2.get(8)] }, 'cleared', 'See sibling flag.');
  await flag(11, 'focus_loss', { count: 6, threshold: 3 }, 'cleared', 'Six focus-loss events within 30 seconds consistent with a notification storm; no answer changes after the events.');
  await db.attempt.update({ where: { id: attempts2.get(4)! }, data: { status: 'voided', voidReason: 'Integrity flag upheld: duplicate_answers' } });
  await db.registration.update({ where: { id: psRegs[4]!.id }, data: { status: 'disqualified', disqualifiedReason: 'Integrity violation (duplicate_answers) upheld by Administrator' } });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'registration.disqualify', objectType: 'Registration', objectId: psRegs[4]!.id, at: days(-31.5) });
  // advancement (N = 10) from the stored scores, exactly as the app would
  const eligible = [...patterns.entries()].filter(([i]) => i !== 4).map(([i, p]) => standingOf(i, p));
  const result = selectAdvancing(eligible, 10);
  const r2Doc = { meritOpen: ps.slug, round: 'r2', certifiedAt: days(-31).toISOString(), rulesHash: psLock.rulesHash, packageHash: psR2.hash, capacity: 10, inclusionRuleApplied: result.inclusionRuleApplied, tiedAtCutoff: result.tiedAtCutoff, decisions: result.decisions.map((d) => ({ registrationId: d.registrationId, rank: d.rank, totalPoints: d.totalPoints, tieOrderPoints: d.tieOrderPoints, elapsedSeconds: d.elapsedSeconds, advanced: d.advanced, reason: d.reason })) };
  const r2Cert = await db.certification.create({ data: { meritOpenId: ps.id, roundId: psRound2.id, type: 'r2_advancement', documentJson: JSON.stringify(r2Doc), hash: hashObject(r2Doc), signedById: administrator.id, signedAt: days(-31) } });
  await db.advancement.createMany({ data: result.decisions.map((d) => ({ roundId: psRound2.id, registrationId: d.registrationId, rank: d.rank, advanced: d.advanced, reason: d.reason, certificationId: r2Cert.id, certifiedAt: days(-31) })) });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'round.certify', objectType: 'Round', objectId: psRound2.id, after: { certificationId: r2Cert.id, hash: r2Cert.hash, advanced: result.advancingCount, inclusionRuleApplied: result.inclusionRuleApplied }, at: days(-31) });
  console.log(`   practice-summer R2: ${result.advancingCount} advanced, inclusion rule ${result.inclusionRuleApplied ? 'APPLIED' : 'not applied'} (tied ${result.tiedAtCutoff} at rank ${result.cutoffRank})`);
  // practice award to the top standing; certified as the event result
  const top = result.decisions[0]!;
  const winDoc = { meritOpen: ps.slug, winnerRegistrationId: top.registrationId, certifiedScore: top.totalPoints, rulesHash: psLock.rulesHash, reVerifiedAt: days(-27).toISOString(), affidavitSignedAt: days(-27).toISOString(), publicityConsent: true, note: 'Practice event: cash award; no property conveyed; Rules 2.2 prior-winner exclusion not applied to practice awards.' };
  await db.certification.create({ data: { meritOpenId: ps.id, type: 'winner', documentJson: JSON.stringify(winDoc), hash: hashObject(winDoc), signedById: administrator.id, signedAt: days(-27) } });
  await db.meritOpen.update({ where: { id: ps.id }, data: { winnerRegistrationId: top.registrationId } });
  await db.registration.update({ where: { id: top.registrationId }, data: { reVerifiedAt: days(-27), affidavitSignedAt: days(-27) } });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'winner.certify', objectType: 'MeritOpen', objectId: ps.id, after: winDoc, at: days(-27) });
  for (const f of [psR1, psR2]) { const doc = { formId: f.form.id, round: f.form.roundNumber, label: 'primary', hash: f.hash, releasedAt: days(-25).toISOString() }; await db.certification.create({ data: { meritOpenId: ps.id, roundId: f.form.roundNumber === 'r1' ? psRound1.id : psRound2.id, type: 'release', documentJson: JSON.stringify(doc), hash: hashObject(doc), signedById: administrator.id, signedAt: days(-25) } }); await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'form.release', objectType: 'Form', objectId: f.form.id, after: doc, at: days(-25) }); }
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: ps.id, before: { status: 'closing' }, after: { status: 'complete' }, at: days(-20) });
  // one decided score challenge
  const chal = await db.dispute.create({ data: { registrationId: psRegs[14]!.id, roundId: psRound2.id, itemId: keys2[5]!.itemId, type: 'score_challenge', statement: 'Item 6: I listed the warehouses correctly by cost; I believe the ordering was scored wrong.', filedAt: days(-30.5), deadlineAt: days(-28), status: 'decided', decision: 'The locked key orders the warehouses by computed total cost. The submitted ordering swapped the second and third warehouses. The score stands. The Administrator has no authority to alter the key.', decidedById: administrator.id, decidedAt: days(-29.5) } });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'dispute.decide', objectType: 'Dispute', objectId: chal.id, at: days(-29.5) });

  // =====================================================================
  // 2. PRACTICE — AUTUMN (in Round 1 now). Take R1 as Ada; unseal as Administrator.
  // =====================================================================
  console.log('→ practice-autumn (r1 open)');
  const pa = await db.meritOpen.create({ data: { demo: true, slug: 'practice-autumn', propertyId: practiceProp.id, name: 'The Autumn Practice Merit Open', city: 'Online', isPractice: true, stateEligibilityJson: JSON.stringify(ELIGIBLE), registrationFeeCents: 0, cashComponentCents: 250000, registrationOpenAt: days(-10), registrationCloseAt: hours(-1), advanceN: 10, advanceM: 3, status: 'r1', listingNo: 'ETK-2026-003', createdAt: days(-14) } });
  const paR1 = await createForm(pa.id, pa.slug, 'r1', 'primary', [seqItem({ a1: 3, a2: 5, mul: 1, add: 2, n: 6 })], { seal: true, sealedAt: days(-11) });
  const paR1res = await createForm(pa.id, pa.slug, 'r1', 'reserve', [seqItem({ a1: 4, a2: 6, mul: 1, add: 2, n: 6 })], { seal: true, sealedAt: days(-11) });
  const paR2 = await createForm(pa.id, pa.slug, 'r2', 'primary', r2Items(R2.E!), { seal: true, sealedAt: days(-11) });
  const paR2res = await createForm(pa.id, pa.slug, 'r2', 'reserve', r2Items(R2.F!), { seal: true, sealedAt: days(-11) });
  const paRound1 = await db.round.create({ data: { meritOpenId: pa.id, number: 'r1', sequence: 1, type: 'qualifier', windowStart: hours(-1), windowEnd: days(7), durationSeconds: 60, latencyGraceSeconds: 3, integrityTier: 1, formId: paR1.form.id, reserveFormId: paR1res.form.id, status: 'open' } });
  await db.round.create({ data: { meritOpenId: pa.id, number: 'r2', sequence: 2, type: 'items', windowStart: hours(-1), windowEnd: days(14), durationSeconds: 600, latencyGraceSeconds: 3, integrityTier: 1, capacity: 10, formId: paR2.form.id, reserveFormId: paR2res.form.id, status: 'scheduled' } });
  const paCfg = rulesConfig({ slug: pa.slug, fee: 0, cash: 250000, states: ELIGIBLE, openAt: days(-10), closeAt: hours(-1), N: 10, M: 3, practice: true, rounds: [{ number: 'r1', windowStart: hours(-1), windowEnd: days(7), durationSeconds: 60, integrityTier: 1, itemCount: 1 }, { number: 'r2', windowStart: hours(-1), windowEnd: days(14), durationSeconds: 600, integrityTier: 1, itemCount: 10 }] });
  const paLock = await lockOpen(pa.id, pa.slug, paCfg, rulesText, administrator.id, days(-11), [paR1, paR1res, paR2, paR2res].map((f) => ({ formId: f.form.id, hash: f.hash, round: f.form.roundNumber, label: f.form.label })));
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: pa.id, before: { status: 'reservation' }, after: { status: 'registration' }, at: days(-10) });
  const paRegs = [];
  for (let i = 1; i <= 25; i++) {
    const u = await makeUser('pa', i, pick(['WA', 'WA', 'OR', 'ID']), { createdAt: days(-9 + i * 0.3) });
    const reg = await db.registration.create({ data: { userId: u.id, meritOpenId: pa.id, status: 'confirmed', confirmedAt: days(-9 + i * 0.3), eligibilitySnapshotJson: JSON.stringify({ state: u.residenceState, geoState: u.residenceState, geoSource: 'seed', age: 33, sanctions: 'clear', exclusions: 0, priorWinner: false }), acceptedRulesHash: paLock.rulesHash, acceptedTermsVersion: '1.0', acceptedAt: days(-9 + i * 0.3), proctoringConsentAt: days(-9 + i * 0.3) } });
    await db.payment.create({ data: { registrationId: reg.id, provider: 'mock', processorRef: `mock_pi_pa${i}`, amountCents: 0, status: 'settled', custodianSettlementRef: `mock_custody_pa${i}`, settledAt: reg.confirmedAt } });
    paRegs.push(reg);
    if (i <= 10) { // already attempted R1 in the last hour
      const startedAt = new Date(now.getTime() - between(5, 55) * 60e3); const elapsed = between(12, 57); const submittedAt = new Date(startedAt.getTime() + elapsed * 1000);
      const k = paR1.keys[0]!; const raw = rnd() < 0.7 ? String((k.spec as { answer: number }).answer) : wrongFor(k.spec, i);
      const att = await db.attempt.create({ data: { registrationId: reg.id, roundId: paRound1.id, formId: paR1.form.id, startedAt, expiresAt: new Date(startedAt.getTime() + 60e3), submittedAt, sessionToken: `seed_pa_r1_${i}`, deviceFingerprint: `fp_pa_${i}`, ip: `10.1.0.${i}`, status: 'submitted' } });
      await db.response.create({ data: { attemptId: att.id, itemId: k.itemId, rawAnswer: raw, renderedAt: startedAt, submittedAt } });
    }
  }
  const adaReg = await db.registration.create({ data: { userId: ada.id, meritOpenId: pa.id, status: 'confirmed', confirmedAt: days(-8), eligibilitySnapshotJson: JSON.stringify({ state: 'WA', geoState: 'WA', geoSource: 'GEO_DEV_STATE', age: 35, sanctions: 'clear', exclusions: 0, priorWinner: false }), acceptedRulesHash: paLock.rulesHash, acceptedTermsVersion: '1.0', acceptedAt: days(-8), proctoringConsentAt: days(-8) } });
  await db.payment.create({ data: { registrationId: adaReg.id, provider: 'mock', processorRef: 'mock_pi_ada', amountCents: 0, status: 'settled', custodianSettlementRef: 'mock_custody_ada', settledAt: days(-8) } });
  await db.notification.create({ data: { userId: ada.id, meritOpenId: pa.id, kind: 'receipt', subject: 'Registration confirmed — The Autumn Practice Merit Open', body: `Registration ID ${adaReg.id}. Free practice registration. Round 1 (60-second qualifier) is open now; Round 2 opens once the Round 1 pass list is certified.`, sentAt: days(-8) } });
  await db.accommodation.create({ data: { userId: (await db.user.findUniqueOrThrow({ where: { email: 'pa005@example.test' } })).id, meritOpenId: pa.id, request: 'Screen-reader user; requesting 50% extended time on Round 2 and large-text mode.', status: 'granted', decision: 'Granted: +300 s on Round 2, large_text and screen_reader flags. Items and scoring unchanged.', extraTimeSeconds: 300, assistiveFlagsJson: JSON.stringify(['screen_reader', 'large_text']), decidedAt: days(-3) } });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: pa.id, before: { status: 'registration' }, after: { status: 'r1' }, at: hours(-1) });

  // =====================================================================
  // 3. HOLLOW CREEK (registration open). The real product.
  // =====================================================================
  console.log('→ hollow-creek (registration)');
  const lark = await db.property.create({ data: { demo: true,
    slug: 'larkspur-residence', name: 'The Larkspur Residence', address: '1200 Larkspur Lane', city: 'Hollow Creek', state: 'WA', zip: null, speEntityName: '[PROPERTY SPE LLC]', legalDescription: '[Exhibit A — legal description]', countyRecorderRef: '[County recorder instrument no.]', countyRecorderUrl: null, deedRecordedAt: days(-6), titleStatus: 'owned',
    appraisedValueCents: 115000000, appraisalDate: days(-14), appraiserName: '[Independent appraiser]', beds: 3, baths: 2.5, sqft: 2140, lotSqft: 7400, yearBuilt: 2025, status: 'live',
    planSetKey: 'larkspur-2025', photosJson: JSON.stringify(DEMO_PHOTOS['larkspur-residence']), factsApprovedAt: days(-1), propertyType: 'Single-family detached', waterSource: 'Municipal', sewer: 'Septic, permitted 2025', floodZone: '[FEMA zone pending]', foundation: 'Slab on grade', lotDimensions: '93 ft × 80 ft (approx.)', parking: 'Attached 2-car garage · 2 driveway', fireplaces: 1,
    anchorsJson: JSON.stringify([{ label: 'Bellingham', lat: 48.7519, lng: -122.4787 }, { label: 'Seattle', lat: 47.6062, lng: -122.3321 }, { label: 'Vancouver, BC', lat: 49.2827, lng: -123.1207 }]),
    stories: 1, garageSpaces: 2, heating: 'Heat pump, ducted', cooling: 'Heat pump', roof: 'Standing-seam metal', exterior: 'Cedar and fiber-cement', latitude: 48.6871, longitude: -122.3392, county: 'Whatcom', parcelNumber: '[Parcel no.]', schoolDistrict: '[School district]', zoning: 'Residential (single-family)',
    taxAnnualCents: 986000, insuranceAnnualCents: 214000, hoaMonthlyCents: 0, utilitiesMonthlyCents: 26000,
    nearbyJson: JSON.stringify([{ label: 'Hollow Creek Market', kind: 'grocery', minutes: 6, mode: 'drive', source: 'Sponsor · measured off-peak' }, { label: 'Rail trail access', kind: 'trail', minutes: 9, mode: 'walk', source: 'Sponsor · measured' }, { label: 'Hollow Creek K–8', kind: 'school', minutes: 11, mode: 'drive', source: 'Sponsor · measured off-peak' }, { label: 'County seat', kind: 'town', minutes: 15, mode: 'drive', source: 'Sponsor · measured off-peak' }, { label: 'Regional airport', kind: 'airport', minutes: 38, mode: 'drive', source: 'Sponsor · measured off-peak' }]),
    historyJson: JSON.stringify([{ date: days(-6).toISOString(), event: 'Deed recorded to [PROPERTY SPE LLC]', source: 'County recorder' }, { date: days(-14).toISOString(), event: 'Independent appraisal: $1,150,000', source: '[Independent appraiser]' }, { date: days(-30).toISOString(), event: 'Purchase option signed with builder', source: 'Sponsor' }, { date: '2025-11-15T00:00:00.000Z', event: 'Construction completed; certificate of occupancy', source: 'County building department' }]),
    description: 'A single-level home completed in 2025 on a quiet cul-de-sac. Great room with a fireplace opening to a covered terrace; kitchen with an island and a walk-in pantry; primary suite with a dressing room and a tiled bath; two further bedrooms and a study. Attached two-car garage. Heat-pump heating and cooling; the builder’s structural warranty is assignable (Exhibit B).',
    neighborhood: 'Hollow Creek sits fifteen minutes from the county seat with a K–8 school, a weekly market, and a rail trail reached on foot from the property.',
    includedItemsJson: JSON.stringify(['Range, refrigerator, dishwasher, washer, dryer', 'Window coverings', 'Heat-pump system', 'Builder’s structural warranty (assignable)']), excludedItemsJson: JSON.stringify(['Staging furniture', 'Garage tool bench']), createdAt: days(-30),
  } });
  await audit({ actorId: admin.id, actorRole: 'admin', action: 'property.create', objectType: 'Property', objectId: lark.id, after: { titleStatus: 'under_option' }, at: days(-30) });
  await audit({ actorId: admin.id, actorRole: 'admin', action: 'property.update', objectType: 'Property', objectId: lark.id, before: { titleStatus: 'under_option' }, after: { titleStatus: 'owned' }, at: days(-6) });
  const hc = await db.meritOpen.create({ data: { demo: true, slug: 'hollow-creek', propertyId: lark.id, name: 'The Hollow Creek Merit Open', city: 'Hollow Creek', stateEligibilityJson: JSON.stringify(ELIGIBLE), registrationFeeCents: 2500, cashComponentCents: 17500000, reservationTarget: 5000, registrationOpenAt: at(-3, 9), registrationCloseAt: at(21, 17), firstAccessHours: 72, advanceN: 2000, advanceM: 100, status: 'registration', listingNo: 'ETK-2026-002', createdAt: days(-28) } });
  const hcR1 = await createForm(hc.id, hc.slug, 'r1', 'primary', [seqItem({ a1: 2, a2: 5, mul: 1, add: 2, n: 7 })], { seal: true, sealedAt: days(-5) });
  const hcR1res = await createForm(hc.id, hc.slug, 'r1', 'reserve', [seqItem({ a1: 3, a2: 4, mul: 2, add: 1, n: 6 })], { seal: true, sealedAt: days(-5) });
  const hcR2 = await createForm(hc.id, hc.slug, 'r2', 'primary', r2Items(R2.A!), { seal: true, sealedAt: days(-5) });
  const hcR2res = await createForm(hc.id, hc.slug, 'r2', 'reserve', r2Items(R2.B!), { seal: true, sealedAt: days(-5) });
  const hcR3 = await createForm(hc.id, hc.slug, 'r3', 'primary', R3.A, { seal: true, sealedAt: days(-5) });
  const hcR3res = await createForm(hc.id, hc.slug, 'r3', 'reserve', R3.B, { seal: true, sealedAt: days(-5) });
  const hcF = await createForm(hc.id, hc.slug, 'final', 'primary', [FINAL.A], { seal: true, sealedAt: days(-5) });
  const hcFres = await createForm(hc.id, hc.slug, 'final', 'reserve', [FINAL.B], { seal: true, sealedAt: days(-5) });
  const hcT1 = await createForm(hc.id, hc.slug, 'tiebreak_1', 'tiebreak', [TIEBREAK[0]!], { seal: true, sealedAt: days(-5) });
  const hcT2 = await createForm(hc.id, hc.slug, 'tiebreak_2', 'tiebreak', [TIEBREAK[1]!], { seal: true, sealedAt: days(-5) });
  const sched = [
    { number: 'r1', sequence: 1, type: 'qualifier', windowStart: at(23, 9), windowEnd: at(25, 21), durationSeconds: 60, integrityTier: 1, formId: hcR1.form.id, reserveFormId: hcR1res.form.id },
    { number: 'r2', sequence: 2, type: 'items', windowStart: at(27, 9), windowEnd: at(29, 21), durationSeconds: 600, integrityTier: 1, capacity: 2000, formId: hcR2.form.id, reserveFormId: hcR2res.form.id },
    { number: 'r3', sequence: 3, type: 'proctored', scheduledAt: at(35, 10), durationSeconds: 5400, integrityTier: 2, capacity: 100, formId: hcR3.form.id, reserveFormId: hcR3res.form.id },
    { number: 'final', sequence: 4, type: 'optimization', scheduledAt: at(42, 9), durationSeconds: 10800, integrityTier: 3, formId: hcF.form.id, reserveFormId: hcFres.form.id },
    { number: 'tiebreak_1', sequence: 5, type: 'tiebreak', scheduledAt: new Date(at(42, 9).getTime() + 4 * 3600e3), durationSeconds: 3600, integrityTier: 3, formId: hcT1.form.id },
    { number: 'tiebreak_2', sequence: 6, type: 'tiebreak', scheduledAt: new Date(at(42, 9).getTime() + 6 * 3600e3), durationSeconds: 3600, integrityTier: 3, formId: hcT2.form.id },
  ];
  for (const r of sched) await db.round.create({ data: { meritOpenId: hc.id, latencyGraceSeconds: 3, ...r } });
  const hcCfg = rulesConfig({ slug: hc.slug, fee: 2500, cash: 17500000, states: ELIGIBLE, openAt: at(-3, 9), closeAt: at(21, 17), N: 2000, M: 100, rounds: [
    { number: 'r1', windowStart: at(23, 9), windowEnd: at(25, 21), durationSeconds: 60, integrityTier: 1, itemCount: 1 }, { number: 'r2', windowStart: at(27, 9), windowEnd: at(29, 21), durationSeconds: 600, integrityTier: 1, itemCount: 10 },
    { number: 'r3', scheduledAt: at(35, 10), durationSeconds: 5400, integrityTier: 2, itemCount: 4 }, { number: 'final', scheduledAt: at(42, 9), durationSeconds: 10800, integrityTier: 3, itemCount: 1 }],
    disclosures: [{ templateKey: 'CA B&P §17539.1', jurisdiction: 'CA', note: 'Renders only once CA is an eligible state.', maxRounds: 4, maxCostCents: 2500, laterRoundsHarder: true, endDate: at(42, 9).toISOString(), tieMethod: 'Ordered rules only: total score, then a published tie-order subset, then elapsed time (Rounds 2–3). Final ties are resolved by sealed sudden-death problems. No drawing at any stage.', priorEventStats: `Summer Practice Merit Open: 40 registrants, ${r1Pass_.filter(Boolean).length} qualified from Round 1, ${result.advancingCount} advanced from Round 2 (inclusion rule ${result.inclusionRuleApplied ? 'applied' : 'not applied'}).` }] });
  const hcLock = await lockOpen(hc.id, hc.slug, hcCfg, rulesText, administrator.id, days(-5), [hcR1, hcR1res, hcR2, hcR2res, hcR3, hcR3res, hcF, hcFres, hcT1, hcT2].map((f) => ({ formId: f.form.id, hash: f.hash, round: f.form.roundNumber, label: f.form.label })));
  await audit({ actorId: admin.id, actorRole: 'admin', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: hc.id, before: { status: 'draft' }, after: { status: 'reservation' }, at: days(-27) });
  await audit({ actorId: administrator.id, actorRole: 'administrator', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: hc.id, before: { status: 'reservation' }, after: { status: 'registration' }, at: days(-3) });
  const hcUsers = [];
  for (let i = 1; i <= 120; i++) {
    const u = await makeUser('hc', i, pick(['WA', 'WA', 'WA', 'WA', 'OR', 'OR', 'ID']), { createdAt: days(-6 + i * 0.03) });
    hcUsers.push(u);
    if (i <= 80) await db.reservation.create({ data: { userId: u.id, meritOpenId: hc.id, verified: true, createdAt: days(-20 + i * 0.1) } });
    const at = days(-3 + i * 0.025);
    const reg = await db.registration.create({ data: { userId: u.id, meritOpenId: hc.id, status: 'confirmed', confirmedAt: at, eligibilitySnapshotJson: JSON.stringify({ state: u.residenceState, geoState: u.residenceState, geoSource: 'x-vercel-ip-country-region', age: 34, sanctions: 'clear', exclusions: 0, priorWinner: false }), acceptedRulesHash: hcLock.rulesHash, acceptedTermsVersion: '1.0', acceptedAt: at, proctoringConsentAt: at, createdAt: at } });
    await db.payment.create({ data: { registrationId: reg.id, provider: 'mock', processorRef: `mock_pi_hc${i}`, amountCents: 2500, feeCents: 103, status: 'settled', custodianSettlementRef: `mock_custody_hc${i}`, settledAt: at } });
    if (i % 17 === 0) await audit({ actorId: u.id, actorRole: 'registrant', action: 'registration.confirm', objectType: 'Registration', objectId: reg.id, after: { status: 'confirmed', processorRef: `mock_pi_hc${i}` }, at });
  }
  // an ineligible registration refunded (moved out of state after registering)
  const moved = await makeUser('hc', 121, 'WA'); const movedReg = await db.registration.create({ data: { userId: moved.id, meritOpenId: hc.id, status: 'refunded', confirmedAt: days(-2), eligibilitySnapshotJson: JSON.stringify({ state: 'WA', geoState: 'NV', geoSource: 'x-vercel-ip-country-region', age: 41, sanctions: 'clear', exclusions: 0, priorWinner: false }), acceptedRulesHash: hcLock.rulesHash, acceptedAt: days(-2), proctoringConsentAt: days(-2) } });
  const movedPay = await db.payment.create({ data: { registrationId: movedReg.id, provider: 'mock', processorRef: 'mock_pi_hc121', amountCents: 2500, feeCents: 103, status: 'refunded', custodianSettlementRef: 'mock_custody_hc121', settledAt: days(-2), refundedAt: days(-1) } });
  await db.refund.create({ data: { paymentId: movedPay.id, amountCents: 2603, status: 'completed', reason: 'Registrant confirmed relocation to a non-eligible state; refunded and removed under Rules 2.1', processorRef: 'mock_re_hc121', attemptedAt: days(-1) } });
  await db.accommodation.create({ data: { userId: hcUsers[6]!.id, meritOpenId: hc.id, request: 'Requesting extended time on Round 2 due to a documented processing disability; documentation available to the Administrator on request.' } });
  await db.dispute.create({ data: { reporterUserId: hcUsers[9]!.id, registrationId: null, type: 'integrity_report', statement: `[${hc.name}] A public forum thread is offering to sell "guaranteed Round 1 answers". Link provided to the Administrator via the report form.` } });

  // =====================================================================
  // 4. CEDAR HOLLOW (reservation phase, under option)
  // =====================================================================
  console.log('→ cedar-hollow (reservation)');
  const alder = await db.property.create({ data: { demo: true, slug: 'alder-ridge-house', name: 'The Alder Ridge House', address: '[Address published when title records]', city: 'Bend', state: 'OR', speEntityName: null, titleStatus: 'under_option', photosJson: JSON.stringify(DEMO_PHOTOS['alder-ridge-house']), appraisedValueCents: null, beds: 4, baths: 3, sqft: 2680, yearBuilt: 2026, status: 'preview', stories: 2, garageSpaces: 2, latitude: 44.0912, longitude: -121.2640, county: 'Deschutes', anchorsJson: JSON.stringify([{ label: 'Bend', lat: 44.0582, lng: -121.3153 }, { label: 'Portland', lat: 45.5152, lng: -122.6784 }]), historyJson: JSON.stringify([{ date: days(-12).toISOString(), event: 'Purchase option signed with builder', source: 'Sponsor' }]), description: 'Under option. A two-storey home nearing completion on a ridge lot. Details, appraisal, and the recorder link are published when the platform takes title.', createdAt: days(-12) } });
  const ch = await db.meritOpen.create({ data: { demo: true, slug: 'cedar-hollow', propertyId: alder.id, name: 'The Cedar Hollow Merit Open', city: 'Cedar Hollow', stateEligibilityJson: JSON.stringify(ELIGIBLE), registrationFeeCents: 2500, cashComponentCents: 19500000, reservationTarget: 5000, registrationTarget: 5000, registrationOpenAt: at(45, 9), registrationCloseAt: at(75, 17), advanceN: 2000, advanceM: 100, status: 'reservation', listingNo: 'ETK-2026-004', createdAt: days(-12) } });
  await audit({ actorId: admin.id, actorRole: 'admin', action: 'meritopen.transition', objectType: 'MeritOpen', objectId: ch.id, before: { status: 'draft' }, after: { status: 'reservation' }, at: days(-11) });
  for (let i = 1; i <= 63; i++) { const u = await makeUser('cr', i, pick(['WA', 'OR', 'OR', 'ID']), { full: false, createdAt: days(-11 + i * 0.15) }); await db.reservation.create({ data: { userId: u.id, meritOpenId: ch.id, verified: true, createdAt: days(-11 + i * 0.15) } }); }
  await db.reservation.create({ data: { userId: ada.id, meritOpenId: ch.id, verified: true, createdAt: days(-4) } });
  // draft ruleset for the admin to finish (not locked)
  await db.ruleset.create({ data: { meritOpenId: ch.id, version: '0.1', configJson: JSON.stringify(rulesConfig({ slug: ch.slug, fee: 2500, cash: 19500000, states: ELIGIBLE, openAt: days(45), closeAt: days(75), N: 2000, M: 100, rounds: [{ number: 'r1', windowStart: days(77), windowEnd: days(79), durationSeconds: 60, integrityTier: 1, itemCount: 1 }] })), officialRulesText: rulesText, termsVersion: '1.0' } });
  // author drafts (unsealed) so the workspace shows readable keys pre-lock
  await createForm(ch.id, ch.slug, 'r1', 'primary', [seqItem({ a1: 5, a2: 8, mul: 1, add: 2, n: 6 })], { seal: false });
  await audit({ actorId: author.id, actorRole: 'item_author', action: 'item.create', objectType: 'Form', objectId: ch.id, at: days(-2), detail: { note: 'R1 primary drafted' } });

  await db.notification.create({ data: { userId: ada.id, meritOpenId: ch.id, kind: 'schedule', subject: 'You are on the list for The Cedar Hollow Merit Open', body: 'This reservation is free and non-binding. Nothing is awarded at this stage. Paid registration opens only after the platform owns the home; you will get a 72-hour first-access window before general opening.', sentAt: days(-4) } });
  await audit({ actorId: auditor.id, actorRole: 'auditor', action: 'audit.chain.verify', objectType: 'AuditLog', objectId: 'all', detail: { ok: true }, at: hours(-2) });

  const counts = { users: await db.user.count(), opens: await db.meritOpen.count(), forms: await db.form.count(), items: await db.item.count(), attempts: await db.attempt.count(), flags: await db.integrityFlag.count(), certifications: await db.certification.count(), audit: await db.auditEvent.count() };
  console.log('✓ seeded', counts);
  return counts;
}

