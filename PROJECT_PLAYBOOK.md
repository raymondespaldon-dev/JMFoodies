# New Project / Web App Playbook

**A chronological, skill-driven operating manual for starting and shipping a new project.**

Canonical copy: `C:\Users\Gina\PROJECT_PLAYBOOK.md` (read this from any project).
Convenience copy: `D:\JMFoodies\PROJECT_PLAYBOOK.md`.

---

## 0. How to use this file — read this first

This file is a **pipeline**, not a menu. When you start a new project, open it and work **top to bottom** in the exact order below. Each phase tells you:

- **Invoke** — which installed skill(s) to load
- **Why** — what would go wrong if you skipped it
- **Output** — the artifact the phase must produce
- **Gate** — the condition that must be true before you move on
- **Skip if** — the only legitimate reason to bypass it

### Invocation syntax

Skills are loaded with the `skill` tool using their exact ID (the names are installed on this machine). In chat you can type them as slash commands:

```
/brainstorming
/writing-plans
/verification-loop
```

### The three priority tiers

| Tier | Meaning | Rule |
|---|---|---|
| **CORE** | The spine of every software project | Never skip |
| **CONDITIONAL** | Use only when its trigger matches | Skip if the trigger is false |
| **SITUATIONAL** | Niche / specialist | Read the trigger, then decide |

### The one rule that matters most

> **Do not write production code before Phase 3 (Plan) is approved, and do not claim "done" before Phase 8 (Verify) produces a PASS.** Most project failures are phase-skipping failures, not coding failures.

---

## TL;DR — the 12-step spine

If you only remember one thing, remember this sequence:

1. `using-superpowers` → know how to find skills
2. `brainstorming` → discover intent and requirements
3. `product-lens` → go/no-go on the idea
4. `intent-driven-development` → turn it into testable acceptance criteria
5. `writing-plans` + `architecture-decision-records` → plan and record decisions
6. `using-git-worktrees` → isolate the work
7. `ui-ux-pro-max` (+ `design-md` / `design-taste-frontend` / `shadcn`) → fix the design before coding
8. `test-driven-development` (+ `tdd-workflow`) → build in red/green/refactor
9. `requesting-code-review` → `code-review` → `receiving-code-review` → review loop
10. `verification-loop` → `verification-before-completion` → `browser-qa` → prove it works
11. `git-workflow` → `conventional-commit-review` → `finishing-a-development-branch` → integrate
12. `continuous-learning-v2` → `growth-log` → capture what you learned

Everything else in this file is a conditional branch off this spine.

---

# THE CHRONOLOGICAL PIPELINE

## PHASE 0 — Orient (5 minutes)

### `using-superpowers` — CORE
- **Why:** It establishes how to discover and invoke skills at all. Without it, you will forget the catalog exists and re-solve problems manually.
- **Output:** The habit of checking for a relevant skill before acting.
- **Gate:** You can name the skill you are about to use for the current task.

### `context-budget` — CONDITIONAL
- **Trigger:** Long session or long build ahead; you want to know remaining context capacity.
- **Why:** Routes context checks to the native meter without wasteful file scanning, so you can plan a strategic compaction point.

---

## PHASE 1 — Idea & shaping (product thinking)

### `brainstorming` — CORE
- **Why:** MUST run before any creative work. It explores user intent, requirements and design *before* implementation. Skipping it means building the wrong thing elegantly.
- **Output:** Notes on intent, constraints, requirements, and proposed design.
- **Gate:** You can state what the app is, who it is for, and what success looks like.

### `product-lens` — CORE for new products
- **Why:** Four diagnostics (YC-style product diagnostic → `PRODUCT-BRIEF.md`, founder review, user-journey audit, ICE prioritization). It pressure-tests *why* before building and produces an explicit go/no-go.
- **Output:** `PRODUCT-BRIEF.md` with a go/no-go recommendation and prioritized features.
- **Gate:** Decision is **go**. If no-go, stop here — you just saved weeks.

### `council` — CONDITIONAL
- **Trigger:** Multiple valid paths exist, a tradeoff is unresolved, or you need a structured go/no-go call.
- **Why:** Four-voice council produces structured disagreement before you choose, so you don't quietly pick the first option.

### `dev-team` — SITUATIONAL
- **Trigger:** You want PM + Architect + Developer + QA perspectives in one session without switching agents.
- **Why:** Catches cross-role blind spots early, especially on bigger features.

---

## PHASE 2 — Scope into verifiable criteria

### `intent-driven-development` — CORE
- **Why:** Turns ambiguous or high-impact changes into scoped, pass/fail acceptance criteria. It is specifically good at de-risking security, data, migration, and integration changes.
- **Output:** Written acceptance criteria for the whole project and each feature.
- **Gate:** Every criterion is objectively testable (not "should feel fast", but "loads in < 2s").

### `eval-harness` — CONDITIONAL
- **Trigger:** The app has AI/agent features, or you need measurable pass/fail and reliability (`pass@k`, `pass^k`).
- **Why:** Define capability and regression evals *before* coding so you can tell whether the AI feature actually works.
- **Output:** Eval suite with graders and pass thresholds.

---

## PHASE 3 — Plan & architecture (no production code yet)

### `writing-plans` — CORE
- **Why:** Converts your spec into a multi-step implementation plan before touching code. This is the document you will execute later.
- **Output:** A written implementation plan with ordered tasks.
- **Gate:** Plan exists and is ordered by dependency.

### `architecture-decision-records` — CORE for greenfield
- **Why:** Captures each framework/database/state decision as a numbered ADR with context, alternatives, and consequences, plus an index in `docs/adr/`. Future-you will ask "why did we pick this?" — this is the answer.
- **Output:** `docs/adr/0001-....md` files + index README.
- **Gate:** At minimum: stack, database, auth, and state-management decisions recorded.

### `plan-canvas` — CONDITIONAL
- **Trigger:** The plan is complex enough that pointing at it is easier than describing changes.
- **Why:** Opens the plan in a local browser canvas where feedback can be annotated and approved without long chat threads.

### `dispatching-parallel-agents` — CONDITIONAL
- **Trigger:** 2+ independent tasks with no shared state or sequential dependency.
- **Why:** Parallelizes genuinely independent work instead of doing it serially.

---

## PHASE 4 — Workspace & tracking

### `using-git-worktrees` — CORE for non-trivial work
- **Why:** Creates an isolated workspace (native tooling or git worktree fallback) so feature work cannot corrupt the current branch.
- **Gate:** You are working in an isolated branch/worktree.

### `story-lifecycle` — CONDITIONAL
- **Trigger:** No Jira/Linear/Taiga, or you want file-based epic → story → sprint tracking.
- **Why:** Keeps delivery structured without an external PM tool.
- **Output:** Epic/story/sprint files, one story being implemented at a time.

### `codebase-onboarding` — CONDITIONAL
- **Trigger:** You are extending an *existing* repo rather than starting fresh.
- **Why:** Produces an architecture map, key entry points, conventions, and a starter `CLAUDE.md` so you don't fight the existing codebase.
- **Also use again after Phase 9** to regenerate the guide with what you learned.

---

## PHASE 5 — UX & visual design (before component code)

### `ui-ux-pro-max` — CORE for any interface
- **Why:** Searchable local design intelligence: 79 styles, 192 palettes, 74 font pairings, 119 UX guidelines, 105 icons, 17 GSAP presets, 25 chart types, 22 stacks. It removes guesswork from interface decisions.
- **Output:** Chosen style, palette, type pairing, and UX rules for the app.

### `design-md` — CONDITIONAL
- **Trigger:** You want the app to match a known brand style (Stripe, Vercel, Linear, Apple, Notion, etc.) from the 84-spec `DESIGN.md` library at `D:\awesome-design-md`.
- **Why:** Gives a consistent, named visual system instead of improvised styling.

### `design-taste-frontend` — CONDITIONAL
- **Trigger:** Public-facing **landing page, marketing site, portfolio, product page, or hero**. Not for dashboards/app screens.
- **Why:** Anti-slop art direction with a real-browser inspector and a look-and-fix loop — prevents the generic "AI-made" look.

### `shadcn` — CONDITIONAL
- **Trigger:** The project uses shadcn/ui or has a `components.json`.
- **Why:** Correct component install, theming, and composition patterns for that system.

- **Gate (whole phase):** Design system and component approach are fixed. You are not making styling decisions mid-build.

---

## PHASE 6 — Build loop (repeat per story/feature)

Run this loop for each item in the plan.

### `test-driven-development` — CORE
- **Why:** Write the failing test first, watch it fail, make the smallest change to green, then refactor. Prevents code written to satisfy an imagined requirement.
- **Gate:** Red → green → refactor observed for each behavior.

### `tdd-workflow` — CORE companion
- **Why:** The fuller discipline: 80%+ coverage across unit, integration, and E2E tests.

### `error-handling` — CORE
- **Why:** Typed errors, retries, circuit breakers, and user-facing failure messages designed up front. Retrofitting error handling is expensive.

### `subagent-driven-development` — CONDITIONAL
- **Trigger:** Executing the written plan with independent tasks in the current session.
- **Why:** Dispatches each task to a fresh subagent with review checkpoints.

### `ai-regression-testing` — CONDITIONAL
- **Trigger:** AI wrote or reviewed the code (which it probably did).
- **Why:** Sandbox-mode API testing without DB dependencies, automated bug-check workflows, and patterns that catch the "same model wrote and reviewed it" blind spot.

### `codehealth-mcp` — CONDITIONAL (can also run in Phase 7)
- **Why:** Real-time structural Code Health via CodeScene MCP — review before edits, verify score deltas after, gate commits and PRs.

- **Gate (whole loop):** All tests green, no debug code, error paths covered.

---

## PHASE 7 — Review & code health

### `requesting-code-review` — CORE
- **Why:** Verifies completed tasks and major features against requirements *before* merging.

### `code-review` — CORE
- **Why:** Runs CodeRabbit CLI reviews (committed/uncommitted/directory scopes) and interprets its output.

### `receiving-code-review` — CORE
- **Why:** Requires technical rigor and verification before implementing feedback — do not performatively agree or blindly apply suggestions, especially when feedback seems unclear or questionable.

### `rules-distill` — SITUATIONAL
- **Trigger:** The same principle keeps recurring across skills and belongs in a rule file.

> **Agent note (not a skill):** For code handling user input, auth, API endpoints, or sensitive data, also dispatch the **`security-reviewer`** agent after this phase.

---

## PHASE 8 — Verify (evidence before assertions)

### `verification-before-completion` — CORE
- **Why:** Run the verification commands and **confirm the output** before making any success claim. Evidence before assertions, always.

### `verification-loop` — CORE
- **Why:** Six-phase verification: build, type check, lint, tests with coverage, security grep, diff review → PASS/FAIL report.
- **Gate:** Report says **PASS**. Do not advance on a FAIL.

### `e2e-testing` — CONDITIONAL
- **Trigger:** Web app with critical user journeys.
- **Why:** Playwright patterns — Page Object Model, configuration, CI/CD integration, artifact management, flaky-test strategies.

### `browser-qa` — CONDITIONAL (strongly recommended for web)
- **Trigger:** Feature is on staging/preview and you are about to ship frontend changes.
- **Why:** Automated post-deploy UI verification: console errors, Core Web Vitals, form and auth flows, screenshots at three breakpoints, axe-core accessibility audit → **SHIP / DO-NOT-SHIP** verdict.

### `windows-desktop-e2e` — SITUATIONAL
- **Trigger:** You are building a Windows native desktop app (WPF, WinForms, Win32/MFC, Qt), not a web app.

---

## PHASE 9 — Documentation & memory

### `architecture-decision-records` — revisit
- Add any new decisions made during the build (they always appear).

### `living-docs-governance` — CONDITIONAL
- **Trigger:** Long-lived project where docs drift from code.
- **Why:** Assigns constitution/map/status/history roles to existing docs so intentional removals don't get recreated.

### `codebase-onboarding` — revisit
- Regenerate the onboarding guide and `CLAUDE.md` to reflect what actually got built.

### `unified-memory` — CONDITIONAL
- **Trigger:** Work state must survive across sessions or be handed to another agent (Claude, Codex, Hermes, Cursor, OpenCode).
- **Why:** Shares durable, inspectable context through the local ECC Memory Vault.

### `ck` — CONDITIONAL
- **Trigger:** You want persistent per-project memory with deterministic `init/save/resume/info/list/forget` commands and a SessionStart hook.

### `growth-log` — CORE at project end
- **Why:** Extracts a reusable pattern — root cause, transferable rule, recognizable signal — instead of a diary-style recap.

### `agent-self-evaluation` — CORE at project end
- **Why:** Self-rates on accuracy, completeness, clarity, actionability, conciseness with concrete evidence.

---

## PHASE 10 — Ship

### `git-workflow` — CORE
- **Why:** Branching strategy, commit conventions, clean history, merge vs rebase, conflict resolution.

### `conventional-commit-review` — CORE
- **Why:** Reviews staged changes and drafts a Conventional Commits-compliant message with the right type and scope.

### `production-audit` — CORE for launches
- **Why:** Local-evidence production readiness audit ("what breaks in prod?") without sending repo data to an external service.

### `delivery-gate` — CONDITIONAL (strict teams)
- **Why:** Stop hook that blocks finishing until quality checks pass; detects rationalization patterns, stale learning logs, and low disk space.

### `santa-method` — CONDITIONAL (high-consequence only)
- **Trigger:** Compliance, brand-sensitive content, production deploys, or hallucination-prone claims.
- **Why:** Two independent reviewers with the same rubric must both pass before shipping, with a fix-and-re-review loop and escalation cap.

### `finishing-a-development-branch` — CORE
- **Why:** Once implementation is complete, all tests pass, and verification is PASS, decide how to integrate.
- **Gate:** Merged or intentionally parked.

---

## PHASE 11 — Learn & maintain (ongoing)

### `continuous-learning-v2` — CORE habit
- **Why:** Instinct-based learning with confidence scoring; v2.1 adds project-scoped instincts to prevent cross-project contamination. Promotes lessons into skills/commands/agents.
- (Ignore legacy `continuous-learning` v1 — v2 is a strict superset.)

### `agent-introspection-debugging` — CONDITIONAL
- **Trigger:** An agent run failed and you need a reproducible diagnosis instead of a blind retry.

### Skill hygiene (periodic, not per project)
- `skill-stocktake` — audit skill/command quality (quick scan or full).
- `skill-comply` — check whether agents actually follow the skills they were given.
- `skill-host-compat` — lint frontmatter before a skill PR.
- `config-gc` — clean redundant, stale, or orphaned config.

---

# TRACKS THAT ARE NOT WEB-APP WORK

These are installed and available, but they serve **different deliverables**. Do not pull them into a software project — they have their own chronology.

## A. GTA VI content-desk track (deliverable = short-form clips/posts)
`setup` → `playbook` → `stream-finder` / `trend-radar` / `campaign-finder` → `live-mode` → `moment-finder` → `hook-writer` → `clip-cutter` → `rule-check` → `secrets-map` / `cheat-codes` / `questions-to-posts` → `multilang` → `learning-loop`

## B. Video / HyperFrames track (deliverable = rendered video)
`hyperframes` (mandatory entry) → `hyperframes-creative` → `hyperframes-core` → `hyperframes-animation` + `hyperframes-keyframes` → `media-use` → `hyperframes-audio` → `hyperframes-registry` → `hyperframes-cli` → `hyperframes-studio`
Related: `kape-explainer` (narrated 3D explainer), `spatial-film` (unnarrated 3D product film), `reverse-any-video`, `style-sampling`, `psychology-explainer`.

## C. Ops/integration track
`orca-cli` (Orca worktrees/terminals/browser), `orca-computer-use` (GUI control when no programmatic path), `orchestration` (Orca workers), `orca-chat-visuals` (inline charts/diagrams), `plan-canvas`.

---

# QUICK DECISION TABLE

| "I want to…" | Use this skill |
|---|---|
| Figure out what to build | `brainstorming`, `product-lens` |
| Decide between 2 valid approaches | `council` |
| Know if the idea is worth it | `product-lens` → go/no-go |
| Make requirements testable | `intent-driven-development` |
| Write the implementation plan | `writing-plans`, `plan-canvas` |
| Remember why we chose the stack | `architecture-decision-records` |
| Start clean feature work | `using-git-worktrees` |
| Track stories without Jira | `story-lifecycle` |
| Make it look designed | `ui-ux-pro-max`, `design-md`, `design-taste-frontend`, `shadcn` |
| Build with confidence | `test-driven-development`, `tdd-workflow`, `error-handling` |
| Get a second opinion | `requesting-code-review`, `code-review`, `receiving-code-review` |
| Prove it actually works | `verification-loop`, `verification-before-completion`, `browser-qa` |
| Check "what breaks in prod" | `production-audit` |
| Write a good commit | `conventional-commit-review`, `git-workflow` |
| Merge and close the branch | `finishing-a-development-branch` |
| Remember lessons for next time | `continuous-learning-v2`, `growth-log` |

---

# TWO PATHS THROUGH THE PIPELINE

**Minimal (small app / prototype):** `brainstorming` → `intent-driven-development` → `writing-plans` → `ui-ux-pro-max` → `test-driven-development` → `code-review` → `verification-loop` → `conventional-commit-review` → `growth-log`.

**Thorough (product launch):** Every CORE phase above, plus `product-lens`, `architecture-decision-records`, `using-git-worktrees`, `eval-harness` (if AI), `e2e-testing`, `browser-qa`, `production-audit`, `santa-method` (if high-consequence), and `living-docs-governance`.

---

# MAINTENANCE NOTE

Your skills are duplicated across 7 roots:

- `C:\Users\Gina\.config\opencode\skills` (66 — primary for this harness)
- `C:\Users\Gina\.agents\skills` (34)
- `C:\Users\Gina\.gemini\skills` (31)
- `C:\Users\Gina\.codex\skills` (22)
- `C:\Users\Gina\.claude\skills` (18)
- `D:\gtavi-claudecode\skills` (16 — project-only)
- `C:\Users\Gina\.gemini\config\plugins\superpowers\skills` (14)

**200 folder installs, 109 unique skills.** If you edit a skill (or this playbook), sync the copies — otherwise the harnesses drift apart. Use `skill-stocktake` and `config-gc` periodically to audit.
