# Earn the Keys — Platform Build Specification

Consolidated from: Merit Sale Concept Memo, Official Rules (draft), Terms of Service (draft), Merit Open Design (Section 6), Landing Page Copy, Strategy v2. This is the engineering source of truth. Legal placeholders remain in [brackets] until counsel signs off; the system must be built so those values are configuration, not code.

## 0. One-paragraph summary

A web platform that sells homes through Merit Opens: paid-registration, objectively scored reasoning competitions. The platform (or its SPE) owns the home before paid registration opens. Each adult in a cleared state registers once for a fixed fee, takes a multi-round free-response test, and the highest verified score is certified by an independent administrator and receives the home plus a cash component. No chance is used at any stage. Money flows from the payment processor directly to a third-party custodian. Answer keys are hash-committed before each round and released afterward.

## 1. Roles and permissions

| Role | Who | Can |
|---|---|---|
| Visitor | Anyone | View property pages, rules, audit summaries; join a free reservation list |
| Registrant | Verified adult in cleared state | One account, one registration per Merit Open; take rounds; view own scores; file own score challenge; request accommodation |
| Platform Admin | Sponsor staff | Create/edit Merit Opens before lock; manage properties, content, states matrix, vendors; view aggregate dashboards; cannot view or edit answer keys after lock, cannot alter scores, cannot change locked rules |
| Item Author | Contracted authors | Create and validate items in a sealed workspace before lock; no access after lock |
| Independent Administrator | Third-party company | Lock rules and keys; publish hashes; certify advancement and winner; decide disputes and integrity flags; release key packages; cannot create Merit Opens, edit items, or touch payments |
| Proctor | Vendor staff (via integration) | Live sessions for Rounds 3 and Final; flag events |
| Auditor (read-only) | Counsel, regulator, custodian | Read-only access to locked artifacts, logs, certifications |

Separation of duties is a hard requirement: no single role can both see answer keys and modify scores; no role can modify a locked ruleset.

## 2. Core objects (data model)

```
Property
  id, spe_entity_id, address, legal_description, county_recorder_ref,
  deed_recorded_at, title_status {under_option, under_contract, owned},
  liens[], included_items[], excluded_items[], appraised_value, appraisal_date,
  photos[], disclosures_pack_url, status {draft, preview, live, closed}

MeritOpen
  id, property_id, name ("The [City] Merit Open"), state_eligibility[],
  registration_fee_cents, cash_component_cents,
  reservation_target (nullable), registration_open_at, registration_close_at,
  round_schedule[], N (advance from R2), M (advance from R3),
  rules_version, rules_hash, locked_at, locked_by (administrator_id),
  status {draft, reservation, registration, r1, r2, r3, final, tiebreak,
          certification, closing, complete, cancelled}

Ruleset (immutable after lock)
  merit_open_id, version, official_rules_pdf, terms_version,
  scoring_config, advancement_config, tie_order_subsets, tiebreak_config,
  technical_failure_policy, accommodation_policy, hash

User
  id, email, phone, dob, legal_name, residence_state, residence_address,
  identity_verification {vendor_ref, status, verified_at, level},
  sanctions_check {status, checked_at}, device_fingerprints[],
  prior_winner (bool), excluded_reason (nullable), created_at

Reservation (free, non-binding)
  id, user_id, merit_open_id, created_at, verified (bool)

Registration
  id, user_id, merit_open_id, payment_id, status
  {pending, confirmed, disqualified, withdrawn, refunded},
  confirmed_at, eligibility_snapshot (state, age, exclusions), UNIQUE(user_id, merit_open_id)

Payment
  id, registration_id, processor_ref, amount_cents, currency,
  status {authorized, settled, refunded, chargeback}, custodian_settlement_ref,
  settled_at

Round
  id, merit_open_id, number {1,2,3,final,tiebreak_n}, type,
  window_start, window_end (R1, R2) | scheduled_at (R3, Final),
  duration_seconds (R1 = 60), form_id, reserve_form_id, integrity_tier {1,2,3},
  status {scheduled, open, closed, scoring, certified}

Form (sealed)
  id, round_id, items[] (ordered), package_hash (SHA-256), hash_published_at,
  package_released_at, released_url

Item
  id, form_id, position, prompt (rich text), input_type
  {integer, decimal, string_exact, ordering, assignment, allocation},
  answer_key (encrypted, sealed), scoring_formula (for partial credit /
  optimization), validation_rules, max_points, tie_order_flag (bool)

Attempt
  id, registration_id, round_id, started_at, submitted_at,
  session_token, device_fingerprint, ip, focus_loss_events[],
  proctoring_session_ref (R3/Final), status {in_progress, submitted, expired, voided}

Response
  attempt_id, item_id, raw_answer, submitted_at, score (computed after key unseal),
  valid (bool for constrained items)

Score
  attempt_id, total_points, tie_order_points, elapsed_seconds,
  r1_pass (bool), computed_at, key_package_hash_used

Advancement
  round_id, registration_id, rank (nullable for R1), advanced (bool),
  reason {score, inclusion_rule, r1_pass}, certified_by, certified_at

IntegrityFlag
  id, attempt_id, type {duplicate_answers, implausible_timing, shared_device,
  shared_network, focus_loss, proctor_flag, report}, evidence_ref,
  status {open, cleared, upheld}, decided_by, decided_at

Dispute
  id, registration_id, round_id, item_id (nullable), type {score_challenge,
  integrity_report, technical_failure}, filed_at, deadline_at, statement,
  decision, decided_by, decided_at

Certification
  merit_open_id, type {threshold_none, r2_advancement, r3_advancement,
  winner}, document_url, signed_by (administrator), signed_at, hash

Accommodation
  user_id, merit_open_id, request, decision, extra_time_seconds, assistive_flags[]

AuditEvent (append-only)
  id, actor_id, actor_role, action, object_type, object_id, before_hash,
  after_hash, timestamp, ip
```

## 3. State machine of a Merit Open

```
draft
  └─ (property under option/contract, admin configures) ─▶ reservation
reservation  [free list open; count visible; no payments possible]
  └─ (title recorded OR counsel-approved "contract + committed financing";
      ruleset locked by Administrator; hashes published) ─▶ registration
registration [payments open; one per user; geofenced; ends at close_at, no extension]
  └─ (close) ─▶ r1
r1  [60-second qualifier window; pass/fail]
  └─ (Administrator certifies pass list) ─▶ r2
r2  [10 items window; Tier 1]
  └─ (scoring; integrity screen; Administrator certifies top N + inclusion rule) ─▶ r3
r3  [proctored, single session]
  └─ (Administrator certifies top M) ─▶ final
final [proctored; optimization]
  └─ (exact tie?) ─▶ tiebreak (repeat until resolved) ─▶ certification
certification [identity re-verify, affidavit, prize acceptance]
  └─ ▶ closing ─▶ complete [key packages released; public audit summary published]

Any state ─ (cancellation event per Rules 12.4, Administrator-recorded) ─▶ cancelled
   → automatic full refunds incl. processing fees; public notice
```

Hard rules enforced in code:

- registration_close_at cannot be edited after lock.
- No transition to registration unless Property.title_status == owned (or a counsel-approved override flag set by Administrator with recorded justification).
- Round windows cannot be moved except via the technical-failure or compromised-form workflow, which requires Administrator action and notifies all registrants.

## 4. Flows

### 4.1 Reservation (Model D)
- Visitor views property preview (under option). Page states: free, non-binding, no prize awarded at this stage, paid registration opens only after the platform owns the home.
- Creates account, light identity verification (email + phone + DOB + state; full ID verification deferred to registration).
- Reservation stored; live count shown if configured.
- When platform takes title: reservation holders get first-access window to paid registration (e.g., 72 hours) before general opening.

### 4.2 Registration and payment
- Eligibility pre-check: age ≥ 18, residence_state ∈ eligible_states, IP geolocation consistent with state, not excluded (employee/vendor/family lists, sanctions, prior winner), no existing registration.
- Full identity verification via vendor (document + selfie). Store vendor ref only, not images.
- Affirmative acceptance of Rules, Terms, Privacy, proctoring consent (checkbox + timestamp + rules_hash).
- Payment via processor; settlement routed to custodian account (processor configured with custodian as merchant of record or split-settlement per counsel).
- On settlement webhook: Registration → confirmed; email receipt with registration ID, round dates, tech requirements.
- Chargeback webhook: Registration → disqualified (unless unauthorized-use exception handled manually by admin with audit log).

### 4.3 Item authoring and lock
- Authors build items in sealed workspace; each item validated: exactly one correct answer or deterministic formula; no trivial default answer; free-response only (input types enumerated; no select types exist in the schema).
- Reserve form created per round.
- Administrator reviews and locks: keys encrypted with Administrator-controlled key; package (items + keys + formulas) hashed; hash published on public page and in audit log; platform admins lose read access.
- Rules lock happens in the same ceremony; rules_hash published.

### 4.4 Round 1 — 60-second qualifier
- Within window, registrant starts; item displayed; countdown 60s from render (server timestamp on serve, client shows timer; server rejects submissions > 60s + latency grace defined in config, e.g., 3s).
- Single free-response input; submit once.
- Scoring after window closes: exact-match → pass. No ranking. Elapsed time not stored in Score for R1 (only start/submit timestamps in Attempt for audit).
- Administrator certifies pass list.

### 4.5 Round 2 — 10 items, ~10 minutes, Tier 1
- Locked-browser mode (full-screen, focus-loss logging, copy/paste disabled, right-click disabled, one active session token).
- Items served in fixed order; per-item timestamps recorded.
- Scoring: exact match per item, max_points each; tie_order_points from items flagged tie_order_flag (e.g., 8–10); elapsed_seconds from first-item render to final submit.
- Advancement algorithm (deterministic, reproducible from Score table):
  1. sort by total_points desc
  2. then tie_order_points desc
  3. then elapsed_seconds asc
  4. take top N; if the group tied on all three at position N exceeds remaining capacity → include the entire tied group (inclusion rule).
- Integrity screening job runs before certification (4.8). Flagged registrants held; certification proceeds for others or waits per Administrator decision.
- Administrator certifies list; certification document hashed and stored.

### 4.6 Round 3 — proctored
- Single scheduled session; proctoring vendor session created per registrant; ID re-match at start; webcam/screen recording refs stored (retention per policy).
- 12–15 multi-step items; partial-credit formulas evaluated server-side from scoring_formula.
- Same advancement algorithm with Round 3 tie-order subset; top M.

### 4.7 Final and tie-break
- One optimization problem: structured input (allocation/ordering); server validates constraints → invalid = 0; objective computed by formula; highest valid wins; no elapsed-time use.
- Exact tie at full precision → tie-break: sealed problem served simultaneously to tied finalists (scheduled start, all clients unlock at server time); repeat until unique highest.
- Administrator certifies winner after identity/eligibility re-verification and affidavit upload.

### 4.8 Integrity screening (batch, after R1 and R2)
- Identical answer-string clusters across accounts (especially on wrong answers).
- Implausible timing (per-item times below configured floor).
- Shared device fingerprint / IP / network across multiple registrations.
- Focus-loss count above threshold.
- Output: IntegrityFlags with evidence; Administrator UI to clear/uphold; upheld → Registration disqualified, Attempt voided, recompute advancement.

### 4.9 Disputes
- Score challenge: own scores only; window (e.g., 72h) after scores posted; item + claimed error; Administrator decides against locked key; decision logged.
- Integrity report: any user; routed to Administrator.
- Technical failure: registrant reports outage; platform provides server logs (uptime, error rates) per Exhibit E; Administrator decides re-administration with reserve form to all affected.

### 4.10 Key release and public audit
- After certification + dispute window: Administrator releases package; page shows published hash, download, and a "verify it yourself" instruction (sha256sum package.zip).
- Public audit summary auto-generated: registrations by state, advancing counts per round, integrity flags and dispositions, winner certified score, winner name/city (consent-gated).

### 4.11 Cancellation and refunds
- Administrator records cancellation event with reason code from Rules 12.4.
- Refund job: all confirmed registrations refunded in full including processing fees, to original payment method; failures queued for manual follow-up; public notice page.

### 4.12 Closing hand-off
- Certification package exported to title company; winner cash component release instruction to custodian; deed recording confirmation stored on Property; MeritOpen → complete.

## 5. Compliance rules encoded as system constraints

| Rule (source) | Enforcement |
|---|---|
| One registration per person (Rules 2.4) | DB unique constraint + identity dedup + device/IP heuristics |
| No chance anywhere (Rules 4, 5) | No RNG in any advancement/tie path; code review checklist; advancement functions are pure and replayable from stored data |
| Free-response only (Rules 4.3) | Item schema has no select-type input |
| One common form, fixed order (Rules 4.5) | Form is ordered list; no per-user shuffle |
| Rules locked after registration opens (Rules 13) | Ruleset immutable; edits create a new version only before lock; post-lock changes require Administrator "correction" workflow with mandatory registrant notification |
| No extensions (Rules 3.6, 12.2) | registration_close_at immutable after lock |
| Money to custodian, not sponsor (Rules 12.1) | Processor settlement destination configured to custodian; platform holds no balance |
| Prior winners ineligible (Rules 2.2) | User.prior_winner blocks registration across all Merit Opens |
| Eligible states only (Rules 2.1) | State matrix config; residence + ID + IP checks; hard block |
| California B&P 17539.1 disclosures | Property/Merit Open page template renders required fields (max rounds, max cost, later rounds harder, end date, tie method, prior-contest stats) from config; template versioned per state |
| Hash commitment before each round (Rules 7) | Round cannot open unless Form.hash_published_at set |
| Accessibility (Rules 8.7) | Accommodation object applies extra time / assistive flags without altering items or scoring |

## 6. Integrations

| Function | Options | Notes |
|---|---|---|
| Payments | Stripe / Adyen / high-risk-capable acquirer | Must support settlement to custodian; confirm MCC classification with counsel; second processor on standby |
| Custodian | Bank trust/FBO account or licensed escrow company | API or file-based release instructions; reconciliation report daily |
| Identity verification | Persona / Veriff / Jumio / Stripe Identity | Store vendor ref + status only |
| Sanctions screening | Vendor bundled with IDV or OFAC API | At registration and before certification |
| Proctoring | ProctorU / Examity / Honorlock-type | Rounds 3 and Final; session refs; retention policy |
| Geolocation | IP geolocation + device signals | Block VPN/proxy patterns; log |
| Email/SMS | Transactional provider | Legal notices are mandatory sends; marketing separate with opt-out |
| Hash/registry | Platform page + optional public timestamping (e.g., OpenTimestamps) | Cheap extra credibility |
| Title/closing | Manual export | Certification PDF + data |

## 7. Architecture (suggested)

- Backend: monolith with clear modules (accounts, properties, meritopens, rounds, scoring, integrity, disputes, payments, audit). Any mainstream stack; scoring and advancement in a pure, side-effect-free module with golden tests.
- Sealed key store: answer keys encrypted at rest with a key held by the Administrator (KMS with separate principal). Platform services can score only after Administrator unseals for that round; unseal event logged.
- Test client: web app with locked-browser mode (full-screen API, visibility/focus events, disabled clipboard); mobile-friendly for R1/R2; R3/Final desktop with proctoring SDK.
- Time: server-authoritative timestamps for all attempt events; client timer is display only.
- Audit log: append-only table + periodic hash chain; exportable.
- Scale: R1/R2 must handle tens of thousands of concurrent starts within a window; queue-based scoring; CDN for item assets; rate limiting per account.
- Environments: prod, staging, and a "practice" environment for the free demand-test event.

## 8. Public pages

- Property preview (reservation phase) — labeled as free/non-binding.
- Merit Open landing page (post-title) — per Landing Page Copy; state-specific disclosure block; "Verify everything" table with live links (recorder, custodian summary, administrator, hashes, entity registration).
- Official Rules, Terms, Privacy, Accessibility, Dispute procedure.
- Hash registry page (all published hashes, release links, verification instructions).
- Public audit summaries (one per completed Merit Open).
- Practice problems page (sample items; never from live forms).

## 9. Admin and Administrator UIs

Platform Admin: properties, Merit Open config (pre-lock), states matrix, vendor settings, content, dashboards (registrations by state/day, funnel from reservation → registration → R1 → R2), refunds queue, support tools (no score access).

Independent Administrator: lock ceremony (rules + forms + hash publish), unseal per round, advancement certification screen showing the deterministic list with reasons, integrity flag queue with evidence, dispute queue, technical-failure decision tool (re-administer with reserve form), cancellation recording, winner certification wizard (ID re-verify status, affidavit, signature), key release.

## 10. MVP scope and phases

**Phase 0 — Demand test (build first, ~4–6 weeks)**
- Accounts with light verification; free reservation list; practice Merit Open with a small cash prize: R1 (60s) + R2 (10 items) only, Tier 1 controls, manual scoring review.
- Metrics: reservation → start R1, R1 pass rate, R2 completion rate, median time, score distribution, tie density at hypothetical N.
- Output decides whether to proceed and calibrates N, item difficulty, and R1 latency grace.

**Phase 1 — Full Merit Open engine**
- Everything in Sections 3–5; payments to custodian; IDV; integrity screening; Administrator UI; hash registry; disputes; refunds; audit log.

**Phase 2 — Proctored rounds and Final**
- Proctoring integration; Final optimization scorer; tie-break flow; certification wizard; closing export; public audit summary.

**Phase 3 — Seller product and multi-state**
- Seller intake and property pipeline; state matrix expansion; per-state disclosure templates; multi-Merit-Open scheduling; reporting for counsel and custodian.

## 11. Non-functional requirements

- Availability during round windows ≥ 99.9%; documented outage detection feeding the technical-failure policy.
- All attempt data immutable once submitted; corrections only via Administrator workflows with audit trail.
- Data retention: scores/keys/certifications 7 years; proctoring media per policy (e.g., 12 months post-closing); IDV refs per vendor.
- Privacy: no storage of ID images; biometric consent flow per state; data map for counsel.
- Security: MFA for all admin/administrator roles; role separation enforced server-side; pen test before Phase 1 launch.
- Accessibility: WCAG 2.1 AA on registrant-facing pages; accommodation flags honored by test client.

## 12. Suggested repo layout

```
/apps
  /web            # public site + registrant test client
  /admin          # platform admin
  /administrator  # independent administrator console (separate auth realm)
/services
  /api            # accounts, properties, meritopens, registrations, payments
  /rounds         # serving, attempts, timing, locked-browser telemetry
  /scoring        # pure scoring + advancement + tiebreak (golden tests)
  /integrity      # batch screening jobs
  /audit          # append-only log + hash chain + public audit summaries
/packages
  /rules-config   # versioned, hashable ruleset schema
  /items          # item schema, validators, sealed package builder
/docs
  /legal          # Rules, Terms, disclosures templates (versioned, hashed)
  /spec           # this document
```

## 13. Open configuration values (from counsel / business)

registration_fee_cents, cash_component_cents, eligible_states[], N, M, R1 latency grace, R2 duration, tie-order subsets, dispute window hours, refund SLA days, retention periods, prototype state disclosure template, custodian release events, reservation target, first-access window for reservation holders.

End of specification.
