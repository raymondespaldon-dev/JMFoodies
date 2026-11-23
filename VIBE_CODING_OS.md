# JMFoodies — Vibe-Coding Operating System

> **Purpose:** one file that tells you exactly where the project is, which skill to load at each step, which agent/model should do the work, and what to type. Read it top to bottom on every work session.
>
> Companion docs: [`PROJECT_REVERSE_ENGINEERING.md`](./PROJECT_REVERSE_ENGINEERING.md) (what exists) and [`APPDEPLOY_START_TO_FINISH_PLAYBOOK.md`](./APPDEPLOY_START_TO_FINISH_PLAYBOOK.md) (the 8 build slices).

---

## 1. Where the project actually is (audited 2026-11-23)

**Active project:** `D:\JMFoodies` — Vite 7.3.8 + vanilla JS + Supabase.
(`D:\Caterly` is a separate Next.js experiment; ignore it for this work.)

| Evidence | Finding |
|---|---|
| `npm run build` | ✅ Passes — 59 modules, built in ~3.3s |
| Git | `feat/booking-hardening`, baseline committed as `c35bd07` on top of `6b370df Initial commit` |
| Frontend | `src/main.js` = 75 KB monolith, 18 KB CSS |
| Database | 4 SQL files, RLS on every table, triggers exist |
| Booking write | `main.js:283` prices the booking **in the browser**, then `:286` inserts the booking and `:287-288` inserts menu items as a **second request** |
| Atomic RPC | ❌ No `create_booking` function in `database/02_functions.sql` |
| Build routes | ✅ **Fixed in `59b201d`** — all 16 pages build (63 modules) |
| Tests | ❌ None |
| Docs | ✅ Reverse-engineering spec + 8-slice AppDeploy playbook already written |

### Phase verdict

```
Phase 0  Orient ........................ DONE
Phase 1  Idea & shaping ................ DONE
Phase 2  Scope / acceptance criteria .... DONE (in the spec)
Phase 3  Plan & architecture ........... DONE (8-slice playbook)
Phase 3.5 Baseline audit (brownfield) ... DONE (reverse-engineering doc)
Phase 4  Workspace & tracking .......... PARTIAL (no worktrees, no story ledger)
Phase 5  Design ........................ PARTIAL (UI exists, no design-system pass)
Phase 6  Build ......................... ▶ YOU ARE HERE
           Slice 1 Foundation .......... DONE (16/16 pages build, 63 modules)
           Slice 2 DB / RLS ............ ~80% (written, untested)
           Slice 3 Secure booking core . 0%  ← THE CRITICAL DOOR
Phase 7  Review ........................ NOT STARTED
Phase 8  Verify ........................ NOT STARTED
Phase 9  Docs & memory ................. NOT STARTED
Phase 10 Ship .......................... NOT STARTED
Phase 11 Learn ......................... NOT STARTED
```

**One-sentence status:** *You have a working demo with a documented plan; you do not yet have a safe booking system, because the write path is client-priced, non-atomic, and there are no tests.*

**Stop-the-line rule:** do not accept a single real customer booking until Step 4 (atomic RPC) and Step 6 (RLS tests) both pass.

---

## 2. The improved phase model

The 12-phase list is correct as a *methodology*. For a project that already has code, two improvements are needed:

1. **New Phase 3.5 — Baseline audit.** Before planning brownfield work, reverse-engineer what exists. You already did this; keep it as a required phase.
2. **Phase 6 becomes a loop, not a block.** One phase = many slices:

```
for each slice in plan:
    freeze contract (Brain)
    write failing test (Hands)
    implement (Hands)
    review (Reviewer)
    verify slice (Hands + Eyes)
    commit
```

So the working order for you is:

```
Commit baseline → Freeze Slice 3 contract → Finish Slice 1 routes
→ Slice 3 RPC (test-first) → Rewire UI → Slice 2 RLS tests
→ Review → Verify → Document → Ship
```

---

## 3. Your machines, models, and what each is for

| Harness | What it is | What you have | Role |
|---|---|---|---|
| **OpenCode** | This session; 10 free models + subagents | `opencode/deepseek-v4.1-flash-free`, `beam-free`, `big-pickle`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free` | **Hands** — code, tests, docs, commands |
| **Antigravity** | Separate app/CLI with own quota | Standard (5h/day): Beam 1.0, DeepSeek V4.1 Flash Slow, Nemotron 3.5 Lightning, Glyph Cluster, Solar Pro 4 / Mini 4. Premium (1–2h/day): DeepSeek V4.1 Flash high | **Brain** — planning, architecture, hard debugging, security |
| **Codex** | Separate CLI; drains fast | Your Codex account quota | **Brain / final reviewer**, used sparingly |
| **Freebuff** | Separate CLI (`freebuff.exe`, manicode). **Unlimited prompts, hour-limited windows** — the quota is time, not tokens | DeepSeek V4.1 Flash **high (2h window)**, DeepSeek V4.1 Flash **low (1h window)**, plus other models | **Primary heavy-execution lane** — the big code block of a slice, run inside a window |
| **Orca** | Orchestrator, v1.4.271, running | Agents (verified via `orca agent installed`): `claude`, `codex`, `opencode`, `opencode2`, `antigravity`, **`freebuff`** | **Control plane** — parallel workers in worktrees |

### The hard truth about "auto reroute"

OpenCode V2 does **not** automatically fail over to another model on a rate-limit/usage error. The docs only say a configured default falls back to the newest *available* model when the configured one is unavailable — that is not 429 failover. Antigravity, Codex and Freebuff are **separate harnesses**, not OpenCode providers.

So "auto reroute" is done at the **Orca layer**, not inside OpenCode:

1. A worker hits its limit.
2. You (or the coordinator) start a new worker with the **next agent** and the same spec + a handoff file.
3. The work continues; no re-planning from zero.

Manual fallback inside OpenCode is `/models`. A custom plugin could watch session errors and switch models, but that is experimental — do not depend on it.

Note the distinction that matters: they are not OpenCode *providers*, but Freebuff, Codex, Antigravity, Claude and OpenCode2 are all Orca *agents*. So a harness that cannot be a provider in OpenCode can still be a full worker in Orca — `--agent freebuff` is valid.

### Routing table

| Work type | Who | First choice | Fallback |
|---|---|---|---|
| Product/requirements, architecture, ADR, slice contract | **Brain** | Antigravity `Beam 1.0 · high` | Antigravity `DeepSeek V4.1 Flash · high` → `Glyph Cluster · high` → Codex |
| Hard bug / security review | **Brain** | Codex | Antigravity `Beam 1.0 · high` |
| **Bulk slice implementation (window open)** | **Primary Hands** | **Freebuff `DeepSeek V4.1 Flash · high`** (2h window) | Freebuff `DeepSeek V4.1 Flash · low` (1h window) |
| Any edit, anytime, no window | **Always-on Hands** | `opencode/deepseek-v4.1-flash-free` | `opencode/beam-free` → `opencode/big-pickle` → `opencode/nemotron-3.5-lightning-free` → `opencode/mimo-v2.6-flash-free` → `opencode/flint-40b-free` → `opencode/hy4-flash-free` → `opencode/iceman-free` → `opencode/tidepool-alpha-free` |
| UI/screenshot inspection | **Eyes** | `opencode/nemotron-3.5-super-vl-free` (vision) + Playwright | Brain for judgement |
| Lint/format/mechanical | **Hands** | `opencode/flint-40b-free` | any free model |
| Final code review | **Reviewer** | Antigravity standard (`Solar Pro 4` / `Nemotron`) | Codex |

**Budget rule:** the Brain never writes bulk code; the Hands never invent architecture. If the Hands get stuck twice on the same error, escalate to the Brain with the error + diff, not a blank prompt.

### Freebuff is a burst lane, not a backup

Freebuff's quota is **time-boxed, not token-boxed**: unlimited prompts inside the window. That inverts the economics — the marginal cost of prompt #40 is **zero**, so the only thing you are spending is the clock. The rational strategy is therefore *not* "save it for emergencies". It is **maximise completed work per window**.

That changes the ranking of your whole system:

| Harness | Quota shape | Correct use |
|---|---|---|
| Freebuff | Unlimited prompts, N hours | **Fill the window with execution.** One slice per window. |
| OpenCode free | Unlimited, always on, weaker models | Small edits, tests, docs, verification runs — the always-on lane |
| Antigravity | 5h/day + 1–2h premium | **Scarce.** Minutes per day, spent on decisions only |
| Codex | Drains fast | **Scarce.** Hard security/correctness review only |

So Freebuff outranks OpenCode for volume work *while a window is open*, and Antigravity/Codex outrank everything for *judgement*. Neither replaces the other.

#### The trap: unlimited prompts ≠ one 5-hour session

Long single sessions rot. The agent re-reads a huge context every turn, drifts off the spec, and starts "improving" things you froze. Unlimited prompting is a licence to do **many short, verifiable tasks**, not one endless one. Reset the session between slices and resume from `HANDOFF.md`.

#### The window protocol

The window's most expensive seconds are the first ones. Do all of this **before** you open it:

1. Spec frozen (`SLICE_3_SPEC.md`) — the window must not contain a single design decision.
2. Failing tests already written, by OpenCode, so the window starts with a red test.
3. `HANDOFF.md` written — files to touch, commands to run, done-criteria.
4. Branch clean; `.env` untouched.
5. One file-set for that worker. No shared files with any parallel worker.

Then, inside the window:

```
implement smallest step → run the test → commit → next step
```

Commit every green step. If the window dies mid-task, the next harness resumes from the last commit, not from zero.

#### Window budget (your actual numbers)

| Window | Reserve it for |
|---|---|
| DeepSeek V4.1 Flash **high — 2h** | The hardest execution block of the project. For you: **Slice 3** — `create_booking` RPC + frontend rewire + SQL tests. |
| DeepSeek V4.1 Flash **low — 1h** | Bulk mechanical work: test scaffolding, RLS check scripts, docs, refactors, formatting. |
| Remaining hours | Review and verification passes, and a second independent look at the diff. |

Do **not** spend the high window on planning. Planning is Antigravity's job and costs minutes; the window costs the scarcest resource you have.

### The switch protocol (use this every time a limit hits)

1. **Stop.** Do not retry the same call blindly.
2. **Write `HANDOFF.md`** — current slice, what is done, what is next, files touched, failing command, decisions made.
3. **Save the tree** — `git add -A && git commit -m "wip: <slice>"` on a `wip/<slice>` branch, or `git stash push -m "<slice>"`.
4. **Switch** — `/models` in OpenCode, or start an Orca worker with the next agent. If OpenCode's free models start throttling, that is the moment to open a Freebuff window: unlimited prompts buy you out of a per-model rate limit entirely.
5. **Resume with the handoff**, not with the original chat. Say: *"Read HANDOFF.md and the spec. Continue from step N. Do not re-plan."*

---

## 4. Orca orchestration plan

### Preconditions (do these first)

- [ ] Baseline committed (Step 1 below).
- [ ] `SLICE_3_SPEC.md` frozen by the Brain (Step 2).
- [ ] Each worker owns different files — no shared edits.
- [ ] No worker touches `.env` or production Supabase.

Orca is running and reachable (verified): `orca status --json` → `runtime.state: ready`.

Available agent IDs (verified): `codex`, `antigravity`, `opencode`.

### Run A — Brain writes the contract (1 worker, current worktree)

```text
orca orchestration worker-start --environment local --spec-file .orca/specs/slice3-contract.md --worktree current --agent antigravity
```

Spec file `.orca/specs/slice3-contract.md`:

```text
You are the architect for JMFoodies, a Vite + vanilla JS + Supabase catering booking app.

Read PROJECT_REVERSE_ENGINEERING.md, APPDEPLOY_START_TO_FINISH_PLAYBOOK.md (Slice 3), database/02_functions.sql, database/03_policies.sql, and src/main.js lines 240-290.

Produce SLICE_3_SPEC.md only. Do not edit app code.
It must define:
1. `create_booking(payload jsonb)` RPC: exact input shape, server-side price recomputation from packages + package_food_items + food_items (never trust client price), guest minimum, date/time and required-menu validation, booking_reference generation, single transaction inserting bookings + booking_food_items, return shape.
2. Error codes for: invalid package, menu count mismatch, price tampering, unauthenticated, date in past, guest below minimum.
3. RLS assumptions and which role may call it.
4. The test list (happy path + each error).
5. Non-goals for this slice (payments, SMS, cancellation, deposits).

Also write docs/adr/0001-atomic-booking-rpc.md recording the decision and alternatives.
Placement: this machine (local), the user named it.
```

**Gate:** spec has an input/output contract, price authority, error codes, and tests. Freeze it — workers may not change it.

### Run B — Two parallel workers (new-child worktrees)

`slice1-build` is **retired** — the four routes were fixed in `59b201d`. Running that worker now would be a stale task.

| Worker | Agent | Owns | Deliverable |
|---|---|---|---|
| `slice3-db` | **`freebuff`** (`DeepSeek V4.1 Flash · high`) | `database/05_booking_rpc.sql`, `database/tests/booking_rpc.sql` | RPC + SQL tests |
| `slice3-web` | `opencode` (`deepseek-v4.1-flash-free`) | `src/main.js` `submitBooking`, `src/supabase.js` | UI calls RPC only |

Why this allocation, and not Codex on the SQL:

- The RPC + its test file is the **largest, most iterative** block in the project — several rounds of write → run → fix. That is exactly what a time-boxed unlimited-prompt window is for. Freebuff is the right owner, not the backup.
- The frontend rewire is ~40 lines. Wasting a scarce Brain hour or a window hour on it is a bad trade; OpenCode's always-on lane is enough.
- **Codex's scarce quota is better spent reviewing the RPC than writing it.** Authoring costs far more tokens than auditing, and the thing you need Codex's intelligence for is catching a price-authority hole — which is a read, not a write. That is Step 7, not Step 4.

Both workers follow the frozen contract, so they run in parallel. They must not touch the same files.

PowerShell parallel start:

```powershell
$d = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ([guid]::NewGuid()))
$map = @{ 'slice3-db' = 'freebuff'; 'slice3-web' = 'opencode' }
$starts = foreach ($n in $map.Keys) {
  $p = Start-Process -FilePath 'orca' -NoNewWindow -PassThru -WorkingDirectory (Get-Location) `
    -ArgumentList "orchestration worker-start --environment local --spec-file .orca/specs/$n.md --worktree new-child --name $n --agent $($map[$n])" `
    -RedirectStandardOutput "$d\$n.out" -RedirectStandardError "$d\$n.err"
  $null = $p.Handle
  [pscustomobject]@{ Name = $n; Process = $p }
}
foreach ($s in $starts) { $s.Process.WaitForExit(); "$($s.Name) exit $($s.Process.ExitCode)" }
Get-ChildItem $d | ForEach-Object { "== $($_.Name)"; Get-Content $_.FullName }
```

**Before you launch `slice3-db`, confirm the Freebuff high window is actually open** (`freebuff` status / the app's quota panel). Starting that worker outside the window wastes the Orca readiness handshake and leaves a dead worker you have to clean up.

Then **end your turn**. Orca wakes you when workers report. Do not poll.

### Run C — Review + verify

```text
# one reviewer, read-only
orca orchestration worker-start --environment local --spec-file .orca/specs/review.md --worktree current --agent antigravity
```

Review spec: *"Review the merged diff against SLICE_3_SPEC.md. Report P0/P1/P2 with file:line. Do not edit. Check: server-side price authority, atomicity, RLS, error handling, no secrets."*

`opencode` worker runs `verification-loop` + `npx playwright test` in parallel.

### Orca safety rules

- Max ~4 workers at once; start the rest as those return.
- Never steer through a worker's terminal — use `orca orchestration send`.
- Never mark a reported failure as complete.
- Lost track: `orca orchestration inbox --terminal run:<run_id> --limit 50`.

---

## 5. The step-by-step script

Each step lists **Skill → Agent/Model → Prompt → Output → Gate**.

---

### Step 1 — Commit the baseline and protect secrets

- **Skills:** `git-workflow`, `conventional-commit-review`
- **Agent/Model:** Hands — `opencode/deepseek-v4.1-flash-free`
- **Do:**
  ```powershell
  git status
  # confirm .env is ignored and contains no real service-role key
  git add -A
  git commit -m "chore: baseline audit docs and playbooks"
  git checkout -b feat/booking-hardening
  ```
- **Prompt:**
  > Review this repo's git state. Confirm `.env` is not tracked, `.env.example` has no real keys, and no service-role key appears in `src/` or HTML. Then write a Conventional Commits message for the three untracked docs. Do not change app logic.
- **Output:** clean tree on `feat/booking-hardening`.
- **Gate:** `git status` clean; no secret in `git ls-files`; build still passes.

---

### Step 2 — Freeze the Slice 3 contract (the Brain step)

- **Skills:** `intent-driven-development` → `architecture-decision-records` → `writing-plans`
- **Agent/Model:** Brain — Antigravity `Beam 1.0 · high` (or Codex)
- **Command:** the Orca Run A spec above.
- **Prompt (if running in chat instead of Orca):**
  > Read `PROJECT_REVERSE_ENGINEERING.md`, the Slice 3 section of `APPDEPLOY_START_TO_FINISH_PLAYBOOK.md`, `database/02_functions.sql`, `database/03_policies.sql`, and `src/main.js` lines 240-290. Write `SLICE_3_SPEC.md` defining an atomic `create_booking(payload jsonb)` RPC with server-side price recomputation, validation, error codes, RLS assumptions, and a test list. Then write `docs/adr/0001-atomic-booking-rpc.md`. Do not edit app code. Do not invent business rules: where the source is unclear, list it as an open decision.
- **Output:** `SLICE_3_SPEC.md`, `docs/adr/0001-atomic-booking-rpc.md`.
- **Gate:** every acceptance criterion is testable; no unresolved business rule that blocks implementation.

---

### Step 3 — Finish Slice 1: build/route completeness

- **Skills:** none required; use `verification-loop` for the build check
- **Agent/Model:** Hands — `opencode/deepseek-v4.1-flash-free`
- **Prompt:**
  > Add these entry points to `vite.config.js` rollup inputs: `account.html`, `my-bookings.html`, `notifications.html`, `admin/cancellation-requests.html`. Do not change any page content. Run `npm run build` and confirm every one of those pages appears in `dist/`. Report the exact list of built HTML files.
- **Output:** 16 HTML entries in `dist/`.
- **Gate:** `npm run build` passes and all four pages exist in `dist/`.

---

### Step 4 — Implement the atomic booking RPC (test-first)

- **Skills:** `test-driven-development` → `tdd-workflow` → `error-handling`
- **Agent/Model:** Primary Hands — **Freebuff `DeepSeek V4.1 Flash · high`** inside its 2h window. `opencode/deepseek-v4.1-flash-free` writes the test scaffolding first so the window opens with a red test.
- **Orca:** Run B `slice3-db`.
- **Prompt:**
  > Implement `SLICE_3_SPEC.md` exactly. Create `database/05_booking_rpc.sql` with `public.create_booking(payload jsonb)`:
  > - `security definer`, `set search_path = public`
  > - require `auth.uid()`
  > - recompute base price from `packages` and extras from `food_items`; ignore any price fields in the payload
  > - validate package active, guest count ≥ minimum, event date not in the past, required menu counts
  > - insert `bookings` and `booking_food_items` in one transaction; roll back everything on any failure
  > - generate the booking reference server-side; return `{booking_id, booking_reference, estimated_total}`
  >
  > Then write `database/tests/booking_rpc.sql` covering: happy path, tampered price, wrong menu count, unauthenticated, past date, below minimum. Do not edit `src/main.js` in this worker.
- **Output:** RPC + SQL tests.
- **Gate:** all six tests pass on a fresh staging database; a tampered price cannot change the stored total.

---

### Step 5 — Rewire the frontend to the RPC

- **Skills:** `test-driven-development` → `error-handling` → `browser-qa`
- **Agent/Model:** Hands — `opencode/deepseek-v4.1-flash-free`
- **Orca:** Run B `slice3-web`.
- **Prompt:**
  > Replace the two-request write in `src/main.js` `submitBooking` (`:283-289`) with one call to `supabase.rpc('create_booking', { payload })`. Keep the existing form fields and UI behavior. Remove client-side price authority from the payload. Map each RPC error code to a clear message. Keep a local display estimate only as a preview, clearly labelled. Do not change the database in this worker. Show the diff before applying.
- **Output:** one network write; UI unchanged for the happy path.
- **Gate:** booking + menu items succeed or fail together; error messages are human-readable.

---

### Step 6 — Slice 2 gate: RLS and access matrix tests

- **Skills:** `security-review`-style review via the **`security-reviewer`** agent → `verification-loop`
- **Agent/Model:** Reviewer — Antigravity standard or Codex; execution by `opencode`
- **Prompt:**
  > Produce a role × table access matrix for `anon`, `customer A`, `customer B`, `admin` across profiles, packages, food_items, bookings, booking_food_items, booking_services, booking_status_history, availability, business_settings. For each cell state allow/deny and the policy that enforces it. Then write SQL checks that prove the matrix. Flag any policy that is broader than necessary, especially `public read package categories/foods/alternatives` and `admin read availability`. Do not weaken RLS to make the UI pass.
- **Output:** `docs/access-matrix.md` + passing SQL checks.
- **Gate:** A cannot read B's booking; anon cannot write; admin can do everything intended.

---

### Step 7 — Review

- **Skills:** `requesting-code-review` → `code-review` (CodeRabbit CLI) → `receiving-code-review`
- **Agent/Model:** Reviewer — **Codex first** (this is where its scarce quota earns its cost: it is reading ~300 lines to find a price-authority hole, not authoring), then Antigravity standard as second pass; fixes by Hands
- **Prompt:**
  > Review the branch `feat/booking-hardening` against `SLICE_3_SPEC.md`. Report findings as P0 (data loss/security), P1 (correctness), P2 (quality) with file:line. Specifically check: server-side price authority, atomicity, RLS, error handling, secret leakage, and whether any UI path can bypass validation. Do not implement fixes in this pass.
- **Gate:** zero open P0/P1; P2s triaged.

---

### Step 8 — Verify

- **Skills:** `verification-loop` → `verification-before-completion` → `browser-qa`
- **Agent/Model:** Hands + Eyes — `opencode` + `nemotron-3.5-super-vl-free` + Playwright
- **Commands:**
  ```powershell
  npm run build
  npx playwright test        # once the suite exists
  ```
- **Prompt:**
  > Run the six-phase verification: build, type/lint check, tests with coverage, security grep for keys, diff review, and a browser pass of the booking flow at 375px, 768px and 1440px. Report PASS/FAIL per phase and a final SHIP / DO-NOT-SHIP verdict with evidence.
- **Gate:** PASS on all phases; no console errors on the booking page.

---

### Step 9 — Document and persist context

- **Skills:** `architecture-decision-records` (update) → `living-docs-governance` → `ck` → `growth-log` → `agent-self-evaluation`
- **Commands:**
  ```text
  /ck init
  /ck save
  ```
- **Prompt:**
  > Update the ADR index, record any new decision from this slice, regenerate `CLAUDE.md`/onboarding notes from the real code, and save a `HANDOFF.md` with: what shipped, what is next, open decisions, and how to run the tests.
- **Gate:** a new session can resume from the docs alone.

---

### Step 10 — Ship

- **Skills:** `conventional-commit-review` → `git-workflow` → `production-audit` → `finishing-a-development-branch`
- **Prompt:**
  > Run a local production-readiness audit: env vars, RLS, secrets, error paths, build output, and rollback plan. Then draft the Conventional Commits message(s) and tell me whether this branch is ready to merge. Do not push.
- **Gate:** audit passes; merge decision made.

---

### Step 11 — Learn

- **Skills:** `continuous-learning-v2` → `growth-log`
- **Prompt:**
  > Extract one reusable rule from this slice: what went wrong, the root cause, and the signal that would catch it next time. Append it to the growth log. Do not write a diary.
- **Gate:** one transferable rule recorded.

---

## 6. GitHub repos: install these, skip the rest

You already have **109 skills, ECC, Superpowers, Orca and 4 agent harnesses**. More tools now would add context cost, not speed. Install only what closes a real gap in *this* project.

### Install (2)

1. **`supabase/mcp`** — official Supabase MCP server (3k★, Apache-2.0).
   - **Why:** lets the agent inspect your real schema, RLS policies and logs, and generate migrations safely. Directly useful for Steps 4 and 6.
   - **Command:**
     ```powershell
     opencode mcp add supabase --global --url https://mcp.supabase.com/mcp
     ```
   - Then run `/mcps` and sign in (OAuth — no API key).
   - **Safety:** start read-only. Do not point it at production until Slice 3 passes.

2. **`microsoft/playwright-cli`** — browser automation as a CLI + skill.
   - **Why:** its own README recommends the CLI over the MCP for coding agents because it is more token-efficient — which matters on free models. You need it for the booking-flow browser QA in Step 8.
   - **How:** follow the README at `github.com/microsoft/playwright-cli`. (The older `microsoft/playwright-mcp` works too, but costs more context.)

### Optional (1)

3. **`GoogleChrome/modern-web-guidance`** — 200+ modern web guides, offline CLI.
   - **Why:** accessibility, forms, `dialog`/`popover`, Core Web Vitals. Useful for the public booking funnel.
   - **Command:**
     ```powershell
     npx modern-web-guidance@latest install
     ```
   - **Where it fits:** Phase 5/8, after `ui-ux-pro-max`, before `browser-qa`. It does not replace planning or testing.

### Skip

- Any more orchestration framework — you have Orca.
- Any more skill packs — you have ECC + Superpowers; adding more raises context cost and creates duplicates.
- Any "one-click app builder" that rewrites the stack — your docs explicitly forbid switching away from Vite + vanilla + Supabase.

### ECC modules worth adding

Your ECC install has only 5 of 34 modules. For this project the useful missing ones are:
`framework-language` (frontend patterns), `database` (Postgres/RLS patterns), `security` (security review), `devops-infra` (deployment).
Run `/configure-ecc` and request those; do not install the full 34-module profile.

---

## 7. Skill → when → where (quick reference)

| Skill | When | Where |
|---|---|---|
| `git-workflow`, `conventional-commit-review` | every commit | Steps 1, 10 |
| `intent-driven-development` | before any slice | Step 2 |
| `architecture-decision-records` | any decision with alternatives | Steps 2, 9 |
| `writing-plans` | multi-step work | Step 2 |
| `using-git-worktrees` | before parallel work | Step 1 / Orca Run B |
| `test-driven-development`, `tdd-workflow` | every code change | Steps 4–5 |
| `error-handling` | any user-facing failure path | Steps 4–5 |
| `security-reviewer` (agent) | public input, auth, PII | Step 6 |
| `database-reviewer` (agent) | SQL, RLS, migrations | Steps 4, 6 |
| `code-reviewer` (agent) | after each slice | Step 7 |
| `requesting-code-review`, `receiving-code-review` | review loop | Step 7 |
| `code-review` (CodeRabbit) | PR/committed scope | Step 7 |
| `verification-loop` | before claiming done | Step 8 |
| `verification-before-completion` | final gate | Step 8 |
| `browser-qa` | UI changed | Step 8 |
| `e2e-testing` | critical flows | Step 8 |
| `living-docs-governance` | docs drift | Step 9 |
| `ck` | session continuity | Step 9 (`/ck save`, `/ck resume`) |
| `growth-log` | after a hard slice | Step 11 |
| `agent-self-evaluation` | end of slice | Step 11 |
| `production-audit` | before launch | Step 10 |
| `finishing-a-development-branch` | merge decision | Step 10 |
| `orchestration` | 2+ independent slices | Orca Runs A–C |
| `ui-ux-pro-max`, `design-md`, `design-taste-frontend` | visual work | Phase 5 |
| `modern-web-guidance` | frontend correctness | Phase 5/8 |
| `brownfield-retrospective` | inherited code audit | Phase 3.5 |
| `codebase-onboarding` | new session on old repo | Phase 3.5 / 9 |
| `ck` / `unified-memory` | cross-session context | Step 9 |
| `santa-method` | high-consequence release | before Step 10 if payments go live |

---

## 8. The daily loop

1. `/ck resume` (or read `HANDOFF.md`).
2. Run `npm run build` — is the baseline green?
3. Pick **one** slice from the plan.
4. Brain freezes/confirms the contract (5 minutes of Antigravity, not 30).
5. Hands implement test-first.
6. Reviewer checks the diff.
7. Verify, commit, update `HANDOFF.md`.
8. If two slices are independent, fan out with Orca; otherwise stay serial.

**Never** run more than one worker on the same file. **Never** spend Brain quota on mechanical edits. **Never** trust a client-side price.

---

## 9. Open decisions still blocking production

From the reverse-engineering spec — answer these before Step 10:

- [ ] Currency and timezone (UI formats PHP; confirm).
- [ ] Minimum booking notice (seed says 3 days; code does not enforce).
- [ ] Must customers sign in to book? (source says yes; confirm).
- [ ] Which status transitions may an admin perform?
- [ ] Is the first release staging-only or real customers?
- [ ] Deposits / online payment in scope now? (default: no)

---

## 10. What to do right now

```
1. ✅ Step 1 done — baseline `c35bd07`, branch `feat/booking-hardening`.
2. ▶ Step 2 — run this with Antigravity Beam 1.0 high → SLICE_3_SPEC.md. THIS IS THE ONLY BLOCKER.
3. ✅ Step 3 done — `59b201d`, 16/16 pages in dist/.
4. After Step 2 is frozen: Orca Run B (slice3-db + slice3-web only; slice1-build is no longer needed).
```

**Paste-ready prompt for Antigravity** (Run A — the Brain). Copy the spec from Section 4 verbatim; it already contains the file list, the required contract, and the "do not edit app code" guard.

**After that:** reply here with `SLICE_3_SPEC.md` on disk and say "spec frozen". I will generate the `.orca/specs/` worker files and start Run B.

Everything else can wait. The single highest-value action is **Step 2**, because every worker after it depends on that frozen contract.
