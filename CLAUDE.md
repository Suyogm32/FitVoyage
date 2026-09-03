# Working on Fit Voyage

Orientation for an AI agent picking this project up cold. Read this first, then
the three documents in `docs/` before writing anything.

---

## What this is

A workout planning and logging app, built as a portfolio project with real
engineering depth rather than feature count. Three deployable pieces:

- `web/` — Next.js 14 (App Router), all client components, MUI + Tailwind
- `backend/` — Express (ESM), Mongoose, deployed separately
- MongoDB, Firebase Auth, and an LLM provider chain used for exactly one feature

A React Native app is planned and will consume the same Express API. That is why
the API is a separate service rather than Next.js route handlers.

## Read these before proposing anything

| Document | What it answers |
| --- | --- |
| `docs/ARCHITECTURE.md` | How it fits together — system, auth, data model, effective dating, progression engine, coach, program generation, theming. Mermaid diagrams throughout |
| `docs/DECISIONS.md` | **Why** it's built this way. 20 case studies in problem → options → chosen → cost form. Read before suggesting a change to anything non-obvious — most surprising choices are deliberate and explained here |
| `docs/CODE-SMELLS.md` | Defect classes actually found in this codebase, with spotting heuristics, ending in a pre-PR review checklist. Run through the checklist before saying work is done |

If something looks wrong, check `DECISIONS.md` first. A good share of the odd
choices are load-bearing.

## Running it

```bash
# frontend
cd web && npm install && npm run dev

# backend
cd backend && npm install && npm run dev

# tests — 95 of them, Node's built-in runner, no framework
cd backend && npm test
```

`npm test` is `node --test` with **no path argument**; passing a directory fails
on Windows. Both services need a `.env`; `web/.env.example` shows the frontend
shape.

## Invariants — do not break these

- **Identity comes from `req.user.dbId`.** No endpoint accepts a user id from the
  client. This was an IDOR fix; it is the most important rule in the API.
- **Schedule entries are never mutated or deleted.** Edits tombstone and insert,
  deletes set `removedOn`. Reads filter through `isActiveOn`. See `DECISIONS.md`
  §1 — forgetting the filter in one read path silently resurfaces removed
  exercises.
- **Estimated 1RM never feeds progression.** Display only. §3.
- **Progression rules are data, not code.** New behaviour is a row in
  `DEFAULT_RULES`, not a branch in the evaluator. §2, §19.
- **Colour comes from CSS variables only.** No hex codes, no `bg-white` except
  behind exercise gifs (dark line art on transparent). Status colours
  (`--success`/`--info`/`--warning`) are separate from the accent on purpose. §8,
  §8b.
- **New endpoints emit ISO dates.** `ExerciseLog.date` is a legacy `"DD/MM/YY"`
  string — parse it strictly with dayjs `customParseFormat`, never compare it
  directly. `CODE-SMELLS.md` §15.
- **Weights are stored in kilograms** in `BodyWeight`, converted at the API
  boundary. §16.
- **Destructive actions confirm, and every action reports its outcome.** Use the
  shared `ConfirmDialog` and `ToastProvider`. §12.

## Shared components — reach for these, don't reinvent

`SidePanel` (all forms), `ConfirmDialog` (destructive actions), `ToastProvider`
(`useToast()`), `TimeSeriesChart` (all charts — hand-rolled, no charting
dependency), `PageShell` (routes serving both signed-in and signed-out visitors),
`AuthLayout` (login/signup), `Logo`, `cardClass` from `lib/styles`.

The recurring failure mode before these existed was every screen solving the same
problem differently.

## How Suyog wants to work

- **He is the developer; you are the mentor.** Explain the reasoning, name the
  trade-offs, and let him decide. He pushes back well and is usually right when
  he does — engage with the argument rather than folding.
- **Give complete code; he applies it himself.** Do not edit files in the repo
  unless he explicitly asks in that message. For a file being restructured rather
  than lightly extended, give the **whole file** — partial "replace this block"
  instructions have broken repeatedly.
- **Say exactly where a block goes.** Give the line number and the anchor. Do not
  paste surrounding context alongside new code; it reads as "replace all of
  this" and has caused several bad edits.
- **Flag debt found along the way**, even when unasked — dead files, unused
  dependencies, missing guards. That's how most of the smell catalogue got
  written.
- **Ask before large work.** Scope and design forks are his call.

## Gotchas that have cost time

- **`cmd.exe`, not PowerShell.** Env vars are `set VAR=value` with no spaces and
  no quotes. Dev scripts document both forms in their header comments.
- **`Cannot find module './<number>.js'`** from `webpack-runtime` means a
  corrupted `.next`, never a missing package. `rmdir /s /q .next` and restart.
  Caused by running `next build` while `next dev` is running.
- **Dev seed scripts mutate real data**: `seedWorkoutHistory.js`,
  `seedBodyWeight.js`, `seedDeloadSignals.js`. They exist because effective
  dating and the future-date guard make history unreachable through the UI by
  design. They have no production guard yet.
- **React Strict Mode double-invokes effects in dev.** Duplicate requests in the
  Network tab are expected locally and do not happen in a production build.

## Where things stand

Complete: auth, scheduling with effective dating, per-set logging, ad-hoc
logging, progress dashboard, AI program generation with rate limiting, the
progressive overload engine, body weight tracking, exercise history and volume
analytics, exercise substitution, stall detection, deload advisory, full UI
overhaul with theming.

Not done, roughly in order:

1. **Deployment.** Not deployed anywhere yet. The build — not the running app —
   is what strains a free-tier instance, so the build belongs off-box. Also
   needed: CORS origins for a real domain, error responses that stop returning
   `error.message` to clients (several routes still do), a process manager and
   reverse proxy.
2. **React Native app.** The reason the API is a separate service. Will be the
   first real test of whether the API assumes a web client anywhere.
3. Smaller: production guards on the seed scripts, tests for the substitution
   route and the deload endpoint (the utils are covered, the routes aren't).
