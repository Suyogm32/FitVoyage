# Architecture

Fit Voyage is a workout planning and logging app. Three deployable pieces plus two
external services.

- `web/` — Next.js 14 (App Router), all rendering client-side, MUI + Tailwind
- `backend/` — Express (ESM), Mongoose, deployed separately
- MongoDB — single database, four collections
- Firebase Auth — identity; the backend never stores a password
- An LLM provider chain — used for one feature only (program generation)

A React Native app is planned and will consume the same Express API, which is the
reason the API exists as a separate service at all rather than living in Next.js
route handlers.

---

## System

```mermaid
flowchart LR
    subgraph client["Browser"]
        NEXT["Next.js 14 web app<br/>App Router, client components"]
    end

    subgraph external["External services"]
        FBAUTH["Firebase Auth"]
        LLM["LLM providers<br/>Gemini / Anthropic / OpenRouter"]
        YT["RapidAPI YouTube search"]
    end

    subgraph server["Express API"]
        MW["requireAuth<br/>middleware"]
        ROUTES["7 route modules"]
        UTILS["Domain utils<br/>progression, catalogue,<br/>PRs, effective dating"]
    end

    DB[("MongoDB<br/>Mongoose")]

    NEXT -->|"sign in / sign up"| FBAUTH
    FBAUTH -->|"ID token"| NEXT
    NEXT -->|"Bearer ID token<br/>axios interceptor"| MW
    MW -->|"verifyIdToken"| FBAUTH
    MW --> ROUTES
    ROUTES --> UTILS
    ROUTES --> DB
    ROUTES -->|"program generation only"| LLM
    NEXT -->|"exercise demo videos"| YT
```

`web` talks to YouTube search directly rather than through the API — it is the one
call that needs no user data and no secret worth protecting server-side. Everything
else goes through Express.

---

## Authentication

Firebase owns credentials entirely. The backend has no password field, no hashing,
no reset flow. It trusts a verified ID token and maps it to a local user document.

```mermaid
sequenceDiagram
    participant U as User
    participant W as Next.js
    participant F as Firebase Auth
    participant A as Express (requireAuth)
    participant M as MongoDB

    U->>W: email + password
    W->>F: signInWithEmailAndPassword
    F-->>W: ID token (+ emailVerified)
    Note over W: unverified users are signed<br/>out immediately
    W->>A: GET /api/... (Authorization: Bearer <token>)
    A->>F: verifyIdToken
    F-->>A: { uid, email, name }
    A->>M: findOne({ firebaseUid })
    alt no user for this uid
        A->>M: findOne({ email })  — legacy NextAuth account
        alt found
            A->>M: attach firebaseUid to it
        else not found
            A->>M: create user
        end
    end
    A->>A: req.user = { uid, email, dbId }
    A-->>W: response
```

Two things worth knowing:

**Users are created lazily**, on first authenticated request rather than at signup.
Signup only talks to Firebase. This means the app has no "registration failed
halfway" state to reconcile.

**The legacy-email branch** exists because this project migrated from NextAuth
credentials to Firebase. Accounts created before the migration have an email but no
`firebaseUid`; the first Firebase-authenticated request with a matching email
adopts them. Once no pre-migration accounts remain, that branch can go — it is the
only place the app trusts an email as an identity key.

**Every route derives its user from `req.user.dbId`.** No endpoint accepts a user
id from the client. This was the fix for an IDOR class of bug found in an earlier
audit and it is the single most important invariant in the API.

---

## Data model

Four collections. `ExerciseDB` is a read-only catalogue; the other three are
per-user.

```mermaid
erDiagram
    USER ||--o| WORKOUTSCHEDULE : "has one"
    USER ||--o{ EXERCISELOG : "has many (one per date)"
    EXERCISEDB ||..o{ EXERCISEDETAILS : "referenced by exerciseId"
    EXERCISEDB ||..o{ LOGGEDEXERCISE : "referenced by exerciseId"

    USER {
        ObjectId _id
        string firebaseUid UK
        string email UK
        string name
        string preferredWeightUnit
        array weeklyGoals
        bool coachMode
        object trainingProfile
    }

    WORKOUTSCHEDULE {
        ObjectId userId FK
        object schedule "mon..sun -> [ExerciseDetails]"
        object dayFocus "mon..sun -> free text"
    }

    EXERCISEDETAILS {
        string exerciseId
        string exerciseName
        string exerciseGif
        int numberOfSets
        array targetReps
        bool usesWeight
        array targetWeight
        string weightUnit
        date addedOn
        date removedOn "null while active"
    }

    EXERCISELOG {
        ObjectId userId FK
        string date "DD/MM/YY"
        string day "mon..sun"
        string readiness "fresh|normal|beat_up"
        array exercises
    }

    LOGGEDEXERCISE {
        string exerciseId
        string exerciseName
        string exerciseGif
        bool unplanned
        string feel "easy|just_right|struggled"
        array setsCompleted
    }

    EXERCISEDB {
        string id UK
        string name
        string bodyPart
        string target
        string equipment
        string gifUrl
        array secondaryMuscles
        array instructions
    }
```

`trainingProfile` holds goal, experience, daysPerWeek, availableEquipment,
bodyWeight and goalWeight. It exists to feed program generation, not to be
displayed.

### Denormalisation, on purpose

`exerciseName` and `exerciseGif` are copied into both the schedule and the log
rather than joined from `ExerciseDB` at read time. Two reasons: a logged workout
should still render correctly if the catalogue entry is later renamed or removed,
and the schedule and workout screens would otherwise need a lookup per row on
every render.

---

## Effective dating

The single most important design decision in the data model, and the one that is
least visible from the UI.

**Problem.** A schedule is a living document, but a log refers back to it. If a
user swaps an exercise on Monday, last week's Monday must not retroactively show
the new exercise, and a completed workout must keep the rep targets it was actually
measured against.

**Solution.** Schedule entries are never mutated or deleted. Each carries a
validity window:

```
addedOn   <= X < removedOn        →  entry was active on date X
removedOn === null                →  still active
```

Three operations, in `backend/routes/saveWorkout.js`:

| Action | What actually happens |
| --- | --- |
| Add | insert with `addedOn = now`, `removedOn = null` |
| Edit (PATCH) | set `removedOn = now` on the old entry, insert a new one with `addedOn = now` |
| Remove (DELETE) | set `removedOn = now`. Nothing is pulled from the array |

```mermaid
gantt
    title One exercise slot over time
    dateFormat YYYY-MM-DD
    axisFormat %d %b

    section Bench Press
    3 x 10 (original)        :done, a1, 2026-07-01, 2026-08-10
    3 x 12 (after edit)      :active, a2, 2026-08-10, 2026-08-30

    section Cable Fly
    3 x 15 (removed 20 Aug)  :done, b1, 2026-07-15, 2026-08-20
```

Reads filter through `isActiveOn(exercise, date)` in
`backend/utils/scheduleActive.js`. When `addedOn` is missing — entries created
before this was introduced — it falls back to `exercise._id.getTimestamp()`,
because a MongoDB ObjectId embeds its creation time. **That is why this feature
shipped with no data migration.**

The cost is that the schedule array only grows. At personal-app scale that is
irrelevant; if it ever matters, tombstones older than the retention window can be
compacted.

---

## Request flow: logging a workout

```mermaid
sequenceDiagram
    participant W as /myworkout
    participant S as GET /api/myschedule
    participant SA as scheduleActive
    participant DB as MongoDB
    participant P as POST /api/myschedule

    W->>S: ?date=30/08/26&day=sat
    S->>DB: load schedule + log for that date
    S->>SA: isActiveOn(entry, date) for each entry
    SA-->>S: entries valid on that date only
    S->>S: merge log status onto entries
    S->>S: append unplanned logged exercises
    S-->>W: [{ ...entry, status, setsCompleted }]

    W->>P: log sets for one exercise
    P->>P: reject future dates
    P->>DB: upsert ExerciseLog for that date
    P-->>W: ok
    W->>S: refetch
```

The GET endpoint serves two shapes depending on whether `date` is supplied — with
a date it returns a flat per-day array, without one it returns the raw schedule
document. **This is a known wart**, noted in `CODE-SMELLS.md`; the browse endpoint
was later added as a separate route specifically to avoid repeating it.

---

## Progressive overload engine

Deterministic. No LLM involved — see `DECISIONS.md` for why.

```mermaid
flowchart TD
    START["GET /api/coach/suggest"] --> GATE{coachMode on?}
    GATE -->|no| NONE["return nothing"]
    GATE -->|yes| HIST["analyseHistory<br/>last sessions, excluding today"]
    HIST --> FACTS["Facts:<br/>hitAllTargets, feel,<br/>readiness, sessionsAtLoad"]
    FACTS --> RULES["evaluateRules<br/>first match by priority"]
    RULES --> DELTA["then: { loadDelta%, repDelta }"]
    DELTA --> LADDER{ascending<br/>pyramid?}
    LADDER -->|yes| SHIFT["shiftLadder:<br/>each set inherits the load<br/>of the set above;<br/>only the top set is new"]
    LADDER -->|no| GRID["applyLoadDelta<br/>rounded to plate grid"]
    SHIFT --> OUT["suggestion + explanation"]
    GRID --> OUT
```

Rules are **data, not code** — `{ id, priority, when, then, explain }` with a tiny
operator vocabulary (`eq`, `neq`, `in`, `gte`, `lte`). First match by priority
wins. This is what makes them extendable, and eventually user-configurable,
without touching the evaluator.

Two rounding invariants are regression-tested in
`backend/test/progression.test.js`:

- a "hold" decision returns **exactly** the same weight (a 0% delta must not be
  grid-rounded — 18.5kg was becoming 18.75kg)
- a forced increment lands **on** the grid, never off it (15.25kg was possible when
  the increment was applied to an already-off-grid weight)

**One-rep max is never used to decide progression.** `estimateOneRepMax` exists in
`utils/personalRecords.js` and is used only to display PRs.

---

## AI program generation

The one feature that calls an LLM, and it is deliberately fenced in.

```mermaid
flowchart TD
    CFG["User config:<br/>goal, days, equipment, experience"] --> CAT["selectCatalogue<br/>filter by goal + equipment,<br/>cap per body part"]
    CAT --> PAY["buildProgramPayload<br/>only these exercise ids"]
    PAY --> CHAIN

    subgraph CHAIN["resolveProviderChain"]
        G["gemini"] -->|fails / not configured| A["anthropic"]
        A -->|fails| O["openrouter"]
    end

    CHAIN --> PARSE["parseResponse"]
    PARSE --> VAL["validatePlan<br/>ids must be from the set we sent"]
    VAL --> DROP{unknown ids?}
    DROP -->|yes| REPORT["drop them, report the drops"]
    DROP -->|no| REVIEW
    REPORT --> REVIEW["/program review screen<br/>merge with current schedule"]
    REVIEW --> CONFIRM["ConfirmDialog"]
    CONFIRM --> APPLY["POST /api/program/apply"]
```

Providers implement one interface — `complete({ system, payload }) → text` — using
raw `fetch` with an `AbortController` timeout. No vendor SDKs. All parsing,
validation and fallback live in shared orchestration, so adding a provider is one
small file.

Two guardrails worth naming:

- **`selectCatalogue` has a floor.** Trimming is skipped below
  `MIN_TRIM_THRESHOLD` (60) and goal filtering keeps at least
  `MIN_AFTER_GOAL_FILTER` (10). Without these, a bodyweight-only user was being
  handed 8 exercises to build a week from.
- **The model can only return ids we sent it.** `validatePlan` checks against
  exactly that set. A hallucinated exercise is dropped and reported, never
  scheduled.

---

## Frontend structure

```mermaid
flowchart TD
    ROOT["app/layout.js<br/>+ inline theme script"] --> TP["ThemeProvider"]
    TP --> TOAST["ToastProvider"]
    TOAST --> AUTH["Authprovider"]

    AUTH --> PUB["/ homepage<br/>PublicNavbar"]
    AUTH --> SHARED["/exercises, /exercise/[id]<br/>PageShell"]
    AUTH --> APP["(app)/* routes<br/>AppShell"]
    AUTH --> AUTHPAGES["/login, /signup<br/>AuthLayout"]

    SHARED --> PICK{signed in?}
    PICK -->|yes| APPSHELL2["AppShell — sidebar"]
    PICK -->|no| PUBNAV2["PublicNavbar + Footer"]
```

`PageShell` is the piece that lets one page serve both audiences: the exercise
browser and detail pages render inside the sidebar when signed in and inside the
public navbar when not, instead of existing twice.

### Theming

One source of colour, two consumers.

```mermaid
flowchart LR
    CSS["globals.css<br/>--background, --card, --primary,<br/>--success, --info, --warning<br/>as bare 'H S% L%' triplets"]
    CSS -->|"hsl(var(--x))"| TW["Tailwind<br/>tailwind.config.js"]
    CSS -->|"getComputedStyle + toMuiHsl"| MUI["MUI createTheme<br/>lib/theme.js"]
    ATTR["data-theme / data-accent<br/>on html"] --> CSS
    SCRIPT["inline script in layout.js<br/>runs before first paint"] --> ATTR
    PROVIDER["ThemeProvider"] --> ATTR
```

Two details that are easy to get wrong and were both bugs at some point:

- **MUI cannot parse space-separated `hsl()`.** Its `colorManipulator` splits on
  commas, so `hsl(240 10% 12%)` decomposes to `NaN`. `toMuiHsl` converts to the
  comma form. Tailwind wants the bare triplet; MUI wants a complete function.
- **Every `readVar` needs a fallback.** `getComputedStyle` returns `""` before the
  stylesheet is applied, and passing `undefined` into `createTheme` *erases* MUI's
  default rather than falling back to it.

Semantic status colours (`--success`, `--info`, `--warning`) sit **outside** the
`[data-accent]` blocks on purpose: "new" and "already scheduled" must mean the same
thing whichever accent the user picks.

---

## Conventions

- **No user id from the client, ever.** `req.user.dbId` only.
- **Read-time computation over write-time flags.** Personal records are detected
  when read, not stamped on the log. The same input always produces the same
  answer, and the rules can change without a backfill.
- **Rest days are derived**, from having nothing scheduled — never stored. A stored
  flag could disagree with the actual plan.
- **Future dates are rejected server-side**, not just hidden in the UI.
- **Soft delete everywhere** in the schedule. See effective dating.
- **`node --test`** for tests, no test framework dependency.
- **Raw `fetch` for LLM providers**, no SDKs.
