# BeFit (Fit-Voyage) — Production Readiness Audit

Date: 2026-07-29
Scope: Full read-through of `app/`, `lib/`, `models/`, config, and git history.

This is a working audit we'll use as the backbone for our case studies. Each section below is a candidate case study — we can tackle them one at a time.

---

## 0. Architecture snapshot

Next.js 14 (App Router) + MongoDB. Two parallel data-access layers: the native `mongodb` driver (`lib/mongodb.js`, used only by NextAuth's `MongoDBAdapter`) and Mongoose (`lib/mongoose.js`, used by every app API route). Auth is split into two unrelated systems: NextAuth Google OAuth (real, cookie-based sessions) and a hand-rolled email/password flow (`/api/login`, `/api/signup`) that never touches NextAuth — it just returns a user object that the client stuffs into `sessionStorage`. External exercise/video data comes from RapidAPI, called client-side.

No middleware, no tests, no CI, no error monitoring, no rate limiting, no input validation layer (e.g. zod).

---

## 1. Critical — fix before anything else touches production

### 1.1 Live secret committed in the repo

`models/updateScript.js` has a hardcoded MongoDB Atlas connection string with a plaintext username/password, committed and present in the working tree today. Anyone with repo access (or anyone who ever cloned it) has your database credentials.
**Action:** rotate the Atlas password immediately, delete the hardcoded string (use `process.env.MONGODB_URI` instead), and treat the old password as burned.

### 1.2 Secrets in git history

`.env` was committed and later deleted across several commits (`8a63302`, `b5be3a9`, `d34f8b7`, `98d7afa`). Deleting a file doesn't remove it from history — `MONGODB_URI`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, and the RapidAPI key from that period are all still retrievable via `git show <commit>:.env`.
**Action:** rotate every credential that was ever in `.env` (Google OAuth secret, NextAuth secret, RapidAPI key, Mongo password — same rotation as 1.1 covers Mongo). Once rotated, history rewriting (BFG/filter-repo) is optional cleanup, not a substitute for rotation.

### 1.3 RapidAPI keys hardcoded and shipped to the browser

`app/utils/fetchData.js` hardcodes two RapidAPI keys directly in source, and this module is imported by client components (`ExerciseVideos.jsx`, `app/exercise/[...id]/page.jsx`). That means the keys ship in the JS bundle to every visitor — anyone can open devtools and lift them, and your RapidAPI usage/billing is exposed. Note the `.env` already defines `EXERCISE_RAPID_API_KEY` / `RAPID_API_HOST` but nothing reads them.
**Action:** move all RapidAPI calls behind your own API routes (server-side only), read the key from `process.env` there, and have client components call your route instead of RapidAPI directly.

### 1.4 Passwords stored and compared in plaintext

`models/User.js` has a bare `password: String`. `app/api/signup/route.js` saves it as-is; `app/api/login/route.js` does `User.findOne({ email, password })` — a plaintext equality match, and it also `console.log`s the raw password on every login attempt.
**Action:** hash with bcrypt (or argon2) on signup, compare with a hash check on login, never log credentials.

### 1.5 No authorization on API routes (IDOR)

`/api/MySchedule`, `/api/MySchedule/CompletedExercises`, `/api/SaveWorkout` all trust a `userId` passed straight from the client (from `sessionStorage`, which any user can edit in devtools). There is no session check tying the request to the logged-in user. Anyone can read or write anyone else's workout schedule by changing one value in localStorage/devtools.
**Action:** every route that touches user data must derive the user from a verified server-side session (`getServerSession`), not from a client-supplied ID.

### 1.6 Two disconnected auth systems, one is fake

The Google OAuth path produces a real NextAuth session cookie. The email/password path does not — `Login.jsx`'s `checkUser` just mutates a local JS object (`session.status = "authenticated"`) which doesn't trigger React state or persist anything server-side; "logged in" state is entirely reconstructed from `sessionStorage` on next load. There's no server-verifiable session for credential users at all, which is also why 1.5 is possible.
**Action:** decide on one auth strategy. Either add NextAuth's Credentials provider (so email/password also produces a real session) or drop the custom flow and go Google-only. Either way, stop using `sessionStorage` as a trust boundary.

---

## 2. Bugs that break features right now

- **Mongoose model name collision (crashes the process):** `models/WorkoutDays.js` registers `model("Workouts", WorkoutScheduleSchema)`. `models/ExerciseSchema.js` also registers `model("Workouts", ExerciseLogSchema-based-schema)` (it checks `models.WorkoutsLog`, which is never the actual registered name, so the guard never works). Once both files are imported in the same process — which happens because `MySchedule/route.js` imports one and `MySchedule/CompletedExercises/route.js` imports the other — Mongoose throws `OverwriteModelError: Cannot overwrite 'Workouts' model once compiled`. This will crash those routes.
- **`WorkoutsLog` used without being imported:** `app/api/MySchedule/route.js`'s `POST` handler calls `WorkoutsLog.findOne(...)` but only imports `Workouts` from `@/models/WorkoutDays`. `ReferenceError` on every call.
- **`CompletedExercises.jsx` is dead:** prop typo — `MyWorkout/page.jsx` passes `selectedDate`, but the component destructures `seletedDate`, so the effect never fires. Inside the handler it also calls `setTodaysExercises` and reads `days`, neither of which exist in that file (copy-paste from `TodaysExercises.jsx`). This component silently never loads data and would throw if it ever did fire.
- **`app/api/auth/callback/route.js` is Pages-Router code living in an App Router route file:** it does `export default async function callback(req, res)` and calls `getSession({ req })` from `next-auth/react` — neither works as an App Router route handler (which needs named `GET`/`POST` exports and `getServerSession` for server-side session reads). This route is currently non-functional.
- **`Navbar.jsx` logout is broken:** `logout()` references `ss` and `router`, neither imported or defined in that file, and calls `signOut("google", { redirect: false })` — `signOut`'s first argument isn't a provider id, so this is a `ReferenceError` waiting to happen the moment someone clicks Logout.
- **`models/ExerciseData.js` imports `Target` from `lucide-react`** (a React icon) inside a Mongoose schema file, unused. Harmless today but signals copy-paste and drags a frontend package into a server model file.

---

## 3. Data model gaps

- No `unique: true` / index on `User.email` — duplicate signups with the same email are allowed, and lookups aren't indexed.
- `ExerciseDB.id` (used for point lookups in `/api/ExerciseDB?id=`) has no index — every lookup is a collection scan.
- No schema validation (`required`, `min/max`, enums) on most fields — e.g. `WorkoutDays`'s `schedule.mon` etc. accept anything.
- Two competing "workout log" shapes (`WorkoutDays.js`'s day-of-week schedule vs `ExerciseSchema.js`'s date-based log) — pick one data model; right now the app half-uses both, which is part of what causes the model collision in §2.
- `models/updateScript.js` is a one-off migration script sitting in `models/` and importing the live `User` model — migrations should live outside the models directory and never contain connection strings (see §1.1).

---

## 4. Production infrastructure — currently missing entirely

- **No tests.** Zero `.test.js`/`.spec.js` files anywhere. No test runner configured.
- **No CI.** No `.github/workflows`, no lint/build gate on PRs.
- **No environment validation.** Nothing checks required env vars exist at boot beyond `lib/mongodb.js`'s single throw; a missing `NEXTAUTH_SECRET` or `GOOGLE_CLIENT_SECRET` fails silently/late.
- **No centralized error handling.** Every route hand-rolls try/catch and returns the raw JS `Error` object as JSON (`{ message, error }`) — this leaks stack traces and internal details to the client.
- **`console.log` everywhere**, including of request bodies containing passwords and full session objects. None of this is stripped for production.
- **No rate limiting** on `/api/login` or `/api/signup` — trivially brute-forceable once §1.4 is fixed, and even now (plaintext compare) it's brute-forceable.
- **No route protection / middleware.** Pages like `/myworkout` and `/schedule` do all their "am I logged in" logic client-side in `useEffect`; there's no `middleware.js` redirecting unauthenticated requests server-side, so the page and its data fetches can be reached directly.
- **No monitoring/observability** (Sentry or equivalent), no structured logging, no health-check endpoint.
- **Unused dependency:** `googleapis` is in `package.json` but never imported anywhere — dead weight in `node_modules` and install time.
- **`next.config.mjs` is empty** — no image domain allowlist (yet `<img>` tags load from Google's `session.user.image` and local `/public` — fine for now, but if `next/image` is ever adopted this will need `images.remotePatterns`), no security headers (CSP, HSTS, X-Frame-Options), no output config for deployment target.

---

## 5. Suggested case-study order

I'd suggest we work through these roughly in this order — each is a self-contained session:

1. **Secrets & credential rotation** (§1.1, 1.2) — 30-minute case study on why history-scrubbing isn't enough and how to rotate cleanly. Do this first regardless of what else we pick, since it's live exposure.
2. **Auth redesign** (§1.4, 1.5, 1.6) — the meatiest one: password hashing, a single real session strategy (NextAuth Credentials provider or drop custom auth), and deriving user identity server-side instead of trusting client input. This case study naturally teaches session management, IDOR, and password storage.
3. **Data layer cleanup** (§2 model collision, §3) — consolidate to one workout-log schema, add indexes/validation, fix the `WorkoutsLog` reference bug. Good case study on Mongoose model registration semantics and schema design.
4. **API key hygiene** (§1.3) — move RapidAPI calls server-side. Short, concrete case study on client/server trust boundaries in Next.js App Router.
5. **Bug sweep** (§2 remaining items) — Navbar logout, the auth callback route, `CompletedExercises` prop typo. Quick wins once auth is redesigned anyway (some of these get subsumed by #2).
6. **Production infra** (§4) — testing setup, CI, middleware-based route protection, error handling/logging conventions, security headers. This is the "make it deployable with confidence" phase, best done last once the app's behavior is actually correct.

---

## 6. Do today, before anything else

1. Rotate the MongoDB Atlas password (§1.1) and remove the hardcoded string from `models/updateScript.js`.
2. Rotate `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, and the RapidAPI key (§1.2, 1.3) since they've been in git history / client bundles.
3. Confirm the Atlas cluster's network access list isn't `0.0.0.0/0` open to the world (worth checking while you're rotating credentials).

None of the rest is urgent in the "someone has your DB password right now" sense — the rest we can pace out as case studies.
