Fit Voyage
A workout planner that doesn't rewrite your history, and won't use AI where a rule will do.

Live app · Engineering decisions · Architecture



Plan a training week, log every set, and get progression advice that shows its reasoning. Built as a portfolio project optimised for engineering depth rather than feature count — the interesting parts are a bitemporal data model, a declarative rule engine, and a deliberate decision to remove an LLM from the feature that looked most like an AI feature.

Trying the live app? The API is on a free tier and sleeps after 15 minutes idle, so the first load can take up to a minute while it wakes. The app tells you this while it happens rather than showing you an empty page.


Three things worth looking at
1. Editing your plan doesn't rewrite your past
Change Monday's bench press from 3×10 to 3×12 and last month's completed workouts should still show what you actually did — against the targets you were actually measured on. Most apps mutate the schedule and silently corrupt their own history.

Schedule entries are effective-dated. Nothing is ever mutated or deleted:

Action
What actually happens
Add
insert with addedOn = now, removedOn = null
Edit
set removedOn = now on the old entry, insert a new one
Remove
set removedOn = now. Nothing leaves the array


Reads filter on addedOn <= date < removedOn. It's SCD Type 2 applied at row level.

The part I'm happiest with: it shipped without a data migration. MongoDB ObjectIds embed their creation timestamp, so _id.getTimestamp() is a correct addedOn for every entry that predates the feature. The fallback is still in utils/scheduleActive.js.

→ DECISIONS.md §1
2. The progression engine deliberately isn't AI
"Suggest what weight to lift next session" sounds like an AI feature. It was built as one, reviewed, and rebuilt as a declarative rule engine.

The reasoning: the input space is small and closed — did you hit your targets, how did the set feel, how recovered were you, how many sessions at this load — and every input was already in the database. The tell was that the model's job kept shrinking as the problem got specified, until it was picking between three numbers we'd already computed.

Rules are data, not code:

{

  id: "reset-after-stall",

  priority: 15,

  when: { sessionsAtLoad: { gte: 4 }, hitAllTargets: { eq: true },

          feel: { in: ["struggled", "just_right"] } },

  then: { action: "deload", loadDeltaPct: -10 },

  explain: "Four sessions at this weight without moving up. Dropping 10% and

            building back usually breaks a plateau faster than grinding at it."

}

First match by priority wins, with a five-operator vocabulary. What that bought: a decision table covered by unit tests, explanations that are real reasons rather than generated prose, and rules that can become user-configurable without touching the evaluator. Stall detection was added later as one object literal and one derived fact — no evaluator change.

It also never uses estimated 1RM. Epley drifts badly above ~10 reps, and progressing from an estimate means deciding from a guess derived from a guess.

→ DECISIONS.md §2, §3, §19
3. Where AI is used, it's fenced in
Program generation is the one LLM feature, because that output space is genuinely large: balancing volume across body parts, ordering compounds before isolation, matching movement patterns to whatever equipment you own.

The constraints around it:

The model receives a pre-filtered catalogue and may only return IDs from it. validatePlan checks against exactly that set; hallucinated exercises are dropped and reported.
Output is a proposal, not an action — it lands on a review screen where every exercise can be edited or removed, and applying it is behind a confirmation.
Weights are never AI-suggested. They're carried over from your own logged history, or left empty. A model guessing loads for a stranger is a safety problem, not a UX one.
Three providers behind one complete({ system, payload }) → text interface with automatic fallback. Raw fetch, no vendor SDKs.

→ DECISIONS.md §5, §6


Architecture
flowchart LR

    subgraph client["Browser"]

        NEXT["Next.js 14<br/>App Router"]

    end

    subgraph server["Express API"]

        MW["requireAuth"]

        R["7 route modules"]

        U["Domain utils<br/>progression · catalogue<br/>volume · deload"]

    end

    FB["Firebase Auth"]

    LLM["Gemini → OpenRouter → Anthropic"]

    DB[("MongoDB")]

    NEXT -->|"Bearer ID token"| MW

    MW -->|verifyIdToken| FB

    MW --> R --> U

    R --> DB

    R -->|"program generation only"| LLM

The API is a separate service rather than Next.js route handlers because a React Native client is planned and will consume the same endpoints.

Every route derives identity from req.user.dbId. No endpoint accepts a user ID from the client — that was the fix for an IDOR class of bug found in an early audit, and it's the most important invariant in the codebase.


Stack
Frontend Next.js 14 (App Router) · MUI + Tailwind · deployed on Vercel Backend Express (ESM) · Mongoose · deployed on Render Data MongoDB Atlas · 1,300+ exercise catalogue Auth Firebase Auth (email + Google), Firebase Admin for token verification AI Gemini / OpenRouter / Anthropic behind a provider adapter

One detail worth noting: there is no charting library. Every chart is a hand-rolled SVG component that reads CSS custom properties, so it themes for free across light/dark and four accent colours. The same variables feed both Tailwind and MUI, so there's exactly one place colour is defined.


Features
Browse and search 1,300+ exercises (server-side filtered and paginated, no account needed) · weekly schedule with free-text day labels · per-set logging with weights, drag-to-complete, and ad-hoc entries · progress dashboard with personal records, streaks and a consistency heatmap · body weight tracking with a noise-resistant trend · per-exercise load history and training volume · exercise substitution for when the machine is taken · AI program generation with per-user rate limiting · progressive overload suggestions · stall and deload detection.


Running locally
# API

cd backend && npm install && npm run dev

# Web

cd web && npm install && npm run dev

Both need a .env; web/.env.example shows the frontend shape. The backend needs MONGODB_URI, Firebase Admin credentials, ALLOWED_ORIGINS, and at least one LLM provider key.
Tests
cd backend && npm test

95 tests on Node's built-in test runner — no test framework dependency. Several of them encode bugs found in production code: a zero-delta being grid-rounded so "hold" silently changed the weight, a forced increment landing off the plate grid, and a load comparison that read 100 lb and 45.36 kg as different weights.


Documentation




DECISIONS.md
20 case studies — problem → options considered → what was chosen → what it cost. The best single read here
ARCHITECTURE.md
System, auth flow, data model, effective dating, the progression and coach engines, theming. Diagrams throughout
CODE-SMELLS.md
Defect classes actually found in this codebase, with spotting heuristics and a pre-PR checklist



Status
Deployed and in use. Next up: a React Native client against the same API, and route-level tests for the coach endpoints.

Known and accepted: the API sleeps on free hosting; the /program/generate endpoint returns upstream provider error text on failure; ExerciseLog.date is a legacy "DD/MM/YY" string that newer collections deliberately don't copy.



Built by Suyog Mahangade
