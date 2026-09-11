# Earn the Keys — the Merit Sale platform

A merit sale is a way of selling a home where the buyer is chosen by objective skill instead of by price or by luck. This repository is the platform that runs **Merit Opens**: paid-registration, objectively scored reasoning competitions in which the highest verified score, certified by an independent administrator, takes the keys. No chance is used at any stage.

The engineering source of truth is [docs/spec/BUILD_SPEC.md](docs/spec/BUILD_SPEC.md). Counsel drafts live in [docs/legal](docs/legal). Bracketed values such as `[CUSTODIAN NAME]` are placeholders pending counsel and are rendered from configuration, never from code.

## Quick start

```bash
npm run setup        # install, create the local SQLite database, seed demo data
npm run dev          # http://localhost:3000
npm test             # golden tests for scoring, rules-config, items
```

Requires Node 20+. No external keys are needed: payments, identity verification, sanctions, and proctoring run through mock adapters until vendor keys are set in `apps/web/.env` (see `.env.example`).

### Development personas

The local auth provider is active. Open `/sign-in` and click a persona, or enter any email to create a fresh registrant.

| Persona | Email | Realm |
|---|---|---|
| Ada Whitfield | `ada@example.test` | Registrant (verified, registered for the Autumn practice open) |
| Dima | `dima@earnthekeys.test` | Platform admin (`/admin`) |
| Independent Administrator | `administrator@meridian-verification.test` | Administrator console (`/administrator`) |
| Outside Counsel | `counsel@auditor.test` | Read-only auditor (`/auditor`) |
| Item Author | `author@items.test` | Sealed authoring workspace |

Realms are separate: an admin cannot enter the Administrator console and vice versa. No role can both see answer keys and modify scores.

### A ten-minute tour

1. **Public site** — `/` (platform), `/opens/hollow-creek` (a live Merit Open with the "Verify everything" ledger and the state disclosure block), `/registry` (every published hash, released packages, and how to verify them), `/audit/practice-summer` (a completed event's generated audit summary), `/practice`.
2. **Take a round** — sign in as Ada, open your account, and enter Round 1 of *The Autumn Practice Merit Open*. The clock starts on the server when the item renders; the locked-browser client logs focus loss, blocks copy and paste, and auto-submits at the limit.
3. **Certify it** — sign in as the Administrator, open the Autumn practice open, then Round 1's console. *Unseal and score* decrypts the committed package with the Administrator key, verifies it against the published hash, scores every attempt, and runs integrity screening. *Certify* writes the deterministic pass list as a hashed certification and moves the Merit Open to Round 2.
4. **Back to Ada** — Round 2 is now open for her. Take it, then repeat step 3 for Round 2 to see ranking, the tie-order subset, and the inclusion rule.
5. **Everything else** — integrity flags with evidence, disputes, accommodations, the cancellation workflow with automatic refunds, the technical-failure re-administration tool, the winner wizard, and the auditor's hash-chain check.

`npm run db:reset` returns the demo to its starting state.

## What is in the box

```
apps/web                 Next.js 16 modular monolith (public site, test client, admin, administrator, auditor, API)
  src/modules/           accounts · registrations · rounds · scoring · integrity · disputes · administrator · admin · audit · meritopens
  src/lib/               db · session (local provider) · guards · audit hash chain · geo · vendor adapters
  prisma/                schema (SQLite locally, Postgres-ready) · seed with self-verifying item generators
  scripts/dev-session.mts print a signed session cookie for a persona (local provider only)
packages/scoring         pure scoring, advancement, tie-break — no side effects, no randomness, golden tests
packages/rules-config    versioned, hashable ruleset schema; canonical JSON; state machine
packages/items           item schema (free-response only), pre-lock validators, sealed package builder
docs/spec                the build specification
docs/legal               counsel drafts (Rules, Terms, memo, design section, landing copy)
```

The three packages are the spec's `/services/scoring`, `/packages/rules-config`, and `/packages/items`. The remaining services (api, rounds, integrity, audit) are modules inside the monolith, as §7 of the spec allows; each has a single entry file so it can be extracted later.

### Compliance rules enforced in code

| Rule | Where |
|---|---|
| One registration per person | unique `(userId, meritOpenId)` + identity dedup + device/IP screening |
| No chance anywhere | `packages/scoring` has no random source; a test scans the source for one. Advancement is a pure function of the Score table and replays identically in any row order |
| Free-response only | the input-type enum contains no select type; prompts phrased as a choice fail validation |
| One common form, fixed order | items are an ordered list; no per-user shuffle exists |
| Rules locked after registration opens | lock ceremony hashes the ruleset; every later edit path checks `lockedAt` |
| No extensions | registration close is immutable after lock; the Administrator cannot move to Round 1 before it |
| Money to custodian, not sponsor | payment adapter settles to the custodian account; the platform holds no balance |
| Hash commitment before each round | a round cannot open unless its form hash is published; unsealing verifies the package against that hash before scoring |
| Prior winners ineligible | `User.priorWinner` blocks registration across all Merit Opens |
| Eligible states only | states matrix + residence + location check as a hard block |
| State disclosures | disclosure templates render from the ruleset per state (CA B&P 17539.1 fields) |
| Accessibility | accommodations add time or assistive flags without touching items or scoring |

### Real versus mocked

Real: the data model, state machine, lock ceremony (AES-256-GCM under the Administrator key, SHA-256 commitment, key wipe), test client, server-authoritative timing, scoring, screening, certification with hashed documents, dispute and accommodation workflows, cancellation with refunds, package release, public audit summary, and an append-only audit log with a hash chain.

Adapters with mock implementations until keys exist: payments (Stripe Checkout with custodian settlement is implemented behind `PAYMENTS_PROVIDER=stripe`), identity verification, sanctions, proctoring, transactional email. Sessions use a signed-cookie local provider; swap `src/lib/auth/session.ts` for your identity provider and enforce MFA there for staff roles.

## The listing page

Each Merit Open is presented as a monograph of record rather than a portal listing: a folio strip with the listing number and rules hash, a cover plate with a plate viewer (photographs when approved; until then the architect's plate set: floor plan, site plan, elevation, vicinity map, all labelled schematic and not to scale), a title block with the facts strip, and a docket rail with the fixed facts and the one action. Numbered sections follow: overview, fact sheet with provenance chips on every record fact, location, cost to hold, title abstract and record, verify everything, how it works, eligibility and schedule, disclosures, questions.

- **Maps** use Leaflet with keyless Esri street tiles (satellite toggle, OpenStreetMap fallback) tinted into the palette, a region inset, half-mile and one-mile rings, straight-line distances to seeded anchors, directions links, and a measure-from-a-point tool that never asks for the visitor's location. Catalogue cards and the home page use a static, no-JavaScript tile thumbnail. Before launch traffic, move to a licensed or proxied tile source and keep attribution visible in every variant.
- **Photography** is uploaded by the platform admin on the property page (`/admin/properties/<id>`), stored under `UPLOADS_DIR` (default `apps/web/uploads/`, ignored by git, served by `/api/uploads`), hashed on upload, and shown only once marked published after counsel approval. Published photographs lead the plate viewer; the plate set never disappears behind them.
- **Smart tools**, all client-side and key-free: state eligibility preview, timezone-aware schedule with `.ics` export, in-browser SHA-256 verifier for released packages against every published hash, sun-and-light plate computed from coordinates with the NOAA solar equations.

## Deploying to Vercel

1. **Project settings.** Import the GitHub repository and set **Root Directory** to `apps/web`. Vercel detects the npm workspace and installs from the repository root. Framework preset: Next.js; the build command is the package's `npm run build` (schema selection, Prisma generate, Next build).
2. **Database.** Create a Postgres database (Neon through the Vercel Marketplace, Vercel Postgres, or Supabase) and set `DATABASE_URL` on the project. Any non-`file:` URL selects the PostgreSQL schema automatically. Then create the tables and demo data from your machine against that database:
   ```bash
   cd apps/web
   export DATABASE_URL="postgresql://…"            # pooled URL, the one the app uses
   export DATABASE_URL_UNPOOLED="postgresql://…"   # direct URL for db push (same value if your provider has no pooler)
   export ADMINISTRATOR_SEAL_KEY="…"               # the same key set in Vercel
   npm run db:push && npm run db:seed
   ```
3. **Environment variables.** `DATABASE_URL`, `SESSION_SECRET` (long random string), `ADMINISTRATOR_SEAL_KEY` (`npm run keys:generate`; must match the key used when the seed sealed the packages, so seed with the same value), `NEXT_PUBLIC_SITE_URL` (the deployment URL), `PAYMENTS_PROVIDER=mock` until Stripe keys exist. Leave `GEO_DEV_STATE` unset: Vercel supplies the visitor's region header, so eligibility uses real location.
4. **Photography.** Add a Vercel Blob store to the project; its `BLOB_READ_WRITE_TOKEN` switches uploads to object storage (the serverless filesystem is read-only).
5. **Redeploy.** Every push to `main` deploys.

## Production notes

- The Prisma schema has two variants under `apps/web/prisma/variants/`; `prisma/select.mjs` copies the right one to `prisma/schema.prisma` from `DATABASE_URL` before every generate, push, or seed. Status fields are strings and JSON columns are text, so both providers share one data model.
- Put `ADMINISTRATOR_SEAL_KEY` in a KMS principal the platform cannot read; the platform only receives unsealed material per round.
- `SESSION_SECRET`, Stripe keys, and vendor keys go in the environment, never in the vendor table.
- Round windows must handle tens of thousands of concurrent starts: scoring already runs after the window in a batch; add a queue and CDN before Phase 1 launch per spec §7.
