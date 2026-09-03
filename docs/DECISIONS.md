# Decision log

Each entry: the problem, the options considered, what was chosen, and what it cost.
Written after the fact, so the trade-offs are the real ones rather than the ones
predicted.

---

## 1. Schedule edits must not rewrite history

**Problem.** The schedule was a plain document. Editing Monday's bench press from
3×10 to 3×12 changed what last month's completed workouts appeared to have been.
Deleting an exercise erased it from every past workout that had logged it. The
progress dashboard was reporting against targets that no longer existed.

**Options.**

1. Snapshot the full schedule into every log. Simple, but the log becomes huge and
   the schedule stops being the source of truth for "what am I doing today".
2. Version the whole schedule document — a new copy per change. Easy to reason
   about, but a one-exercise edit rewrites all seven days, and reading "what was
   active on 3rd August" means scanning versions.
3. Effective-date individual entries. Each entry carries `addedOn` / `removedOn`.

**Chosen: 3.** It is SCD Type 2 / bitemporal modelling applied at the row level.
Edits become tombstone-plus-insert; deletes become tombstone-only. Reads filter on
`addedOn <= date < removedOn`.

**What it cost.** The schedule array only grows, and every read path has to go
through `isActiveOn` — forgetting it in one place silently shows removed exercises.
That is the real risk, and it is why the filter lives in one shared util rather
than being inlined per route.

**The nice surprise.** No migration was needed. MongoDB ObjectIds embed a creation
timestamp, so `exercise._id.getTimestamp()` is a correct `addedOn` for every
pre-existing entry. The fallback is still in `scheduleActive.js`.

---

## 2. Progressive overload is not an LLM's job

**Problem.** "Suggest what weight to lift next session" sounded like an AI feature,
and was initially built as one.

**Why it was wrong.** The decision has a small, closed input space — did you hit
your targets, how did the set feel, how fresh were you, how many sessions at this
load — and a small output space: go up, hold, back off, and by how much. Every
input is already in the database. There is no ambiguity for a model to resolve.

Handing that to an LLM buys nothing and costs: non-determinism on identical inputs,
latency, per-suggestion cost, no testability, and no way to explain a decision
beyond asking the model to narrate one.

**Chosen.** A declarative rule engine. Rules are data:

```js
{ id, priority, when: { hitAllTargets: { eq: true }, feel: { in: ["easy"] } },
  then: { loadDelta: 2.5 }, explain: "..." }
```

First match by priority wins. The operator vocabulary is deliberately tiny —
`eq`, `neq`, `in`, `gte`, `lte`.

**What it bought.** 12 unit tests covering the decision table. Explanations that
are real reasons rather than generated prose. Rules that can become
user-configurable later without touching the evaluator. And it runs in
microseconds, free.

**The tell.** During review, the LLM's remaining job had shrunk to picking between
three numbers we had already computed. When the model's job keeps shrinking as you
specify it, the design is telling you the problem is deterministic.

---

## 3. No one-rep max in progression

**Constraint set by the user, and it held up.**

Estimated 1RM (Epley: `w × (1 + r/30)`) is a decent comparison metric and a
terrible planning input. It is extrapolated from sub-maximal sets, its error grows
with rep count, and using it as the basis for tomorrow's load compounds that error
into a number the lifter never actually tested.

**Chosen.** Progress from what was actually performed. If you hit 3×10 at 40kg and
it felt easy, the next step is a function of 40kg — not of a hypothetical 53kg
single.

`estimateOneRepMax` still exists in `utils/personalRecords.js`, used **only** to
display PRs, where a rough comparable number is genuinely useful.

---

## 4. Ladder-shift for ascending pyramids

**Problem.** For a set scheme like 15/12/10 with 20/25/30kg, applying "+2.5kg" to
every set is wrong. The lifter has already proven 25kg for 12 reps and 30kg for 10.

**Chosen.** `shiftLadder`: each set inherits the load of the set above it, and only
the top set gets a genuinely new load. 20/25/30 becomes 25/30/32.5.

This is what experienced lifters do by hand, and it means each session only ever
introduces **one** untested weight. Detected by `isAscendingLadder`; flat schemes
fall through to the normal delta path.

---

## 5. Program generation *is* an LLM's job

**The contrast with decision 2**, and the reason this feature survived review.

"Build me a 4-day upper/lower split for a home gym with dumbbells and a band,
targeting hypertrophy, avoiding exercises I can't load" has a combinatorially large
output space, no single correct answer, and requires balancing volume across body
parts, ordering compounds before isolation, and matching movement patterns to
equipment. That is judgement over a large space — genuinely what these models are
for.

**How it is fenced in.**

- The model receives a **pre-filtered catalogue** and may only return ids from it.
  `validatePlan` checks against exactly that set; unknown ids are dropped and
  reported.
- The output is a **proposal, not an action**. It lands on a review screen where
  every exercise can be edited or removed, merged against what is already
  scheduled, and applying it is behind a `ConfirmDialog`.
- **Weights are not AI-suggested.** The apply step carries over the user's last
  logged weights where they exist; otherwise the field is left empty with a "no
  target weight" chip. A model guessing loads for a stranger is a safety problem,
  not a UX one.

---

## 6. Provider adapter pattern, no SDKs

**Problem.** Free tiers run out and models get deprecated. `gemini-2.5-flash`
became `gemini-3.6-flash` mid-build; a Llama model stopped being free on
OpenRouter.

**Chosen.** One interface — `complete({ system, payload }) → text` — implemented by
three small files under `utils/llm/providers/`, each exporting `name`,
`isConfigured` and `complete`. `resolveProviderChain` tries them in order; an
explicitly requested provider becomes a chain of one. All parsing, validation and
fallback live in shared orchestration.

Raw `fetch` with an `AbortController` timeout, no vendor SDKs. Three SDKs would be
three dependency trees, three auth conventions and three breaking-change schedules,
to send one JSON body each.

**Cost.** Provider-specific request shapes are hand-written, so a provider changing
its API is a manual fix. Acceptable for three providers; would not be at thirty.

---

## 7. CSS custom properties as the single colour source

**Problem.** Two styling systems — Tailwind and MUI — and a requirement for
light/dark plus four selectable accents. Defining the palette twice guarantees
drift.

**Chosen.** Colour lives in `globals.css` as bare `H S% L%` triplets. Tailwind
consumes them via `hsl(var(--x))`. MUI reads the *computed* values at runtime with
`getComputedStyle` and builds its theme from them. Mode and accent are `data-*`
attributes on `<html>`; an inline script in `layout.js` applies the stored choice
before first paint so there is no flash.

**Two bugs this design produced**, both worth remembering:

- **Format mismatch.** MUI's `colorManipulator` splits `hsl()` on commas, so
  space-separated triplets decomposed to `NaN`. Every derived colour — `light`,
  `dark`, `contrastText`, every hover `alpha()` — was computed from garbage for
  weeks, silently, because `NaN%` in a CSS colour still renders *something*. Fixed
  by `toMuiHsl`.
- **Timing.** `getComputedStyle` returns `""` before the stylesheet applies, and
  passing `undefined` into `createTheme` erases MUI's default instead of falling
  back to it. That produced `alpha(undefined)` and a hard crash on a freshly
  compiled route. Fixed with per-variable fallbacks.

**The general lesson.** An adapter between two systems must *translate*, not
concatenate. Ours was doing string interpolation and calling it a translation.

---

## 8. Accent-independent status colours

**Problem.** The program review screen tinted new exercises with `--primary`. With
an accent switcher, "new" would be blue for one user and green for another, and on
a green accent it would be indistinguishable from a success state.

**Chosen.** Separate `--success`, `--info` and `--warning` tokens, defined outside
the `[data-accent]` blocks so they never follow the accent. Status is semantic;
accent is decorative. They must not share a channel.

Same reasoning drove the light-mode palette change: `--background` was hue 4 — the
red accent at 91% lightness — so the page, the hero and the CTA all shared a hue
and nothing separated. Surfaces are now neutral so the accent is the only saturated
thing on screen, which is also what makes four accents viable at all.

---

## 8b. Charts use the accent for data and neutral for reference lines

**Corollary to 8, found the hard way.** The body-weight chart shipped with an
accent-coloured data line and a `--success` green goal line. Suyog flagged that
red reads as danger, and that weight going *down* is a positive outcome for
someone cutting.

**The line itself was fine.** A single data series carries no valence — red only
implies "bad" when contrasted with something implying "good". The mistake was the
pairing: red line, green target frames your actual weight as the failure state.
Meaningless for a chart that serves someone bulking and someone cutting equally.

Two concrete failures followed from it, not just a semantic one:

- **A green accent collides.** Green data line, green goal line, same hue. The
  `--success`/`--info`/`--warning` tokens exist precisely so status colour stays
  out of the accent's way — and this put them back in the same picture.
- **Red on green is the worst pairing for colour blindness.** Deuteranopia affects
  roughly 8% of men; a dashed stroke was the only thing separating the two lines.

**Chosen.** Data series uses `--primary`. Reference lines — goals, targets,
averages — use `--muted-foreground`. A goal is something to aim at, not something
to be rewarded for reaching.

**The general rule:** never let a chart's colours decide whether the user's number
is good news. The same restraint already applied to the trend copy, which says "up
0.4 kg" rather than "gained", and is never coloured.

---

## 9. One page, two chromes

**Problem.** "Browse exercises" in the sidebar pointed at `/`, the marketing
homepage, which had its own navbar. A signed-in user clicking a sidebar item was
ejected from the app shell into a different-looking page.

**Options.** Duplicate the browser into an in-app route; or make one route
shell-aware.

**Chosen.** `PageShell` picks the chrome from auth state — `AppShell` with sidebar
when signed in, `PublicNavbar` + `Footer` when not. `/exercises` and
`/exercise/[id]` both use it.

This is what makes the product structure work: anyone can browse and read exercise
pages, and the login wall appears only when they try to *schedule* something. A
shared exercise link is useful to a stranger.

---

## 10. Server-side search and pagination

**Problem.** The exercise list fetched all ~1,300 records and filtered and
paginated in the browser. Search did the same. Every body-part change re-fetched
the entire catalogue.

**Chosen.** A dedicated `GET /api/exercisedb/browse` returning
`{ items, total, page, pages }`, with filter, search, skip and limit on the server.

**Why a new route rather than adding pagination to `GET /`.** Four callers depend
on that route returning a bare array. Overloading it with a second response shape
is exactly the wart already present in `GET /api/myschedule`, which returns a flat
array with `?date` and a raw document without. A route whose contract matches one
screen is cheaper than a route that means two things.

**One detail that matters.** `skip`/`limit` is only correct over a *total* order.
Sorting by `name` alone would let two identically-named exercises swap places
between queries, so a record could appear on two pages or none. The sort is
`{ name: 1, id: 1 }`.

---

## 11. Side panels for forms, centre dialogs for confirmations

**Chosen.** Every form — add exercise, log sets, edit, goals, ad-hoc log — opens in
a right-hand `SidePanel` (MUI Drawer). Confirmations use a centred
`ConfirmDialog`.

**The distinction.** A form is work: it has several fields, it benefits from the
page staying visible behind it, and it behaves better on narrow screens as a
full-height panel. A confirmation is a single blocking question and belongs in the
middle of your attention.

**MUI gotcha, both components.** MUI paints a lightening gradient over `Paper` in
dark mode, which fights token colours. Both set `backgroundImage: "none"`.

---

## 12. Destructive actions confirm and report

**Problem.** Removing an exercise was one click, permanent-looking, with no
feedback. Applying a generated program replaced all seven days with no
confirmation at all. Several successful actions — logging sets, saving goals,
applying a suggestion — reported nothing, and their failure paths only did
`console.error`, so success and failure looked identical.

**Chosen.** A `ToastProvider` (built, not imported — it needs to speak in tokens)
and a shared `ConfirmDialog`, wired into both destructive paths and all the silent
success paths.

**The copy matters more than the component.** Both confirmations lead with the fact
that history survives — "workouts you've already logged keep the plan they were
logged against". Because of effective dating this is *true*, and it is the thing a
user cannot verify before clicking. Without it they hesitate over a reversible
action.

---

## 13. Deliberate denormalisation of exercise name and gif

`exerciseName` and `exerciseGif` are copied into schedule entries and log entries
rather than joined from `ExerciseDB`.

**Why.** A completed workout is a historical record and should render correctly
even if the catalogue entry is later renamed, re-gif'd or removed. And the workout
and schedule screens would otherwise need a catalogue lookup per row.

**Cost.** A catalogue rename does not propagate to existing schedules. For a
static reference dataset that is the correct trade; for a catalogue that changed
often it would not be.

---

## 14. Read-time computation for personal records

Personal records are detected when the progress endpoint reads logs, not flagged
when a log is written.

**Why.** A write-time flag freezes the rule that was in force when the row was
written. Change the definition of a PR and you need a backfill. Computed on read,
the same input always produces the same answer under the current rules.

The first log of an exercise is a **silent baseline** — it is not announced as a
PR, because "you set a record on your first attempt" is noise.

**Cost.** Recomputation on every read. At personal-app data volumes this is
nothing; if it ever mattered, the answer is a cache, not a stored flag.

---

## 15. A metric earns the default dashboard only if it changes a decision

**Problem.** Training volume — sets × reps × load — was built and shipped straight
onto the progress dashboard. Suyog's objection: most users can't act on it, so it's
cosmetic.

**The stronger version of that objection**, which is what settled it: **volume drops
during a deload, and a deload is correct training.** The number falls exactly when
someone is doing the right thing. A metric that is ambiguous in the one case where
it moves most is worse than no metric, because it invites the wrong conclusion at
the worst moment.

**Options.**

1. Delete it. Honest, but throws away an aggregation that the coach will need.
2. Show it to everyone with an explanation. Explanations don't survive contact with
   a dashboard — people read the number, not the caption.
3. Put it behind an opt-in.

**Chosen: 3**, as `User.advancedStats`, defaulting to false. The card is not
rendered and `useVolume` skips its request entirely when off — a disabled feature
shouldn't still cost a round trip.

**Deliberately not folded into `coachMode`.** They look like the same kind of flag
and aren't: `coachMode` changes what the app *asks* you (readiness and feel prompts
on every session), while `advancedStats` only changes what it *shows* you. Merging
them would mean someone who wants a chart starts getting interrogated after every
set. Behavioural opt-ins and display opt-ins are different things and should stay
separate flags.

**Named `advancedStats`, not `showVolume`,** so the next display-only metric doesn't
add a third toggle — but scoped to dashboard display so it can't become a junk
drawer.

**The rule this establishes:** a metric belongs on the default dashboard only if a
user would *do something differently* because of it. "Is this data interesting" is
the wrong filter and is how dashboards become unreadable. Volume earns its place
back once the coach reads it rather than merely displaying it — an unplanned volume
drop is a signal; a planned one isn't. Until something interprets it, it stays
opt-in.

**Also why the toggle's description names the failure mode.** "Show advanced
stats" would make users guess. Saying that volume drops during a planned deload
means the people who turn it on already know how to read it.

---

## 16. Body weight is a log, stored in kilograms

**Problem.** `User.trainingProfile.bodyWeight` was a single number. The schema
comment already called it debt and named the migration: "latest log entry becomes
current". It also made `deriveDirection` — the cut/bulk/maintain input to program
generation — a comparison of two static numbers that never moved.

**Chosen.** A `BodyWeight` collection, one document per user per day, unique on
`{ user, date }` so a second log for the same day upserts rather than duplicates.

**Stored in kilograms, always.** Converted once on write, converted back to the
user's preferred unit on read. Storing values as entered would mean a user who
switched from lb to kg gets a chart with half its points in a different unit —
unfixable after the fact, because nothing records which reading was which.

**A separate collection, not an array on `User`.** `requireAuth` loads the user
document on every authenticated request; an unbounded array of daily readings
would bloat the hottest read path in the API.

**Migration: none.** `resolveCurrentWeightKg` reads the newest log entry and falls
back to the legacy profile field when the log is empty — the same shape as
`scheduleActive`'s fallback to `_id.getTimestamp()` (§1). New feature, old data,
no backfill script.

**The trend is two seven-day averages, not last-minus-previous.** Daily weight
swings a kilo on water and food. A naive delta reports noise as progress, and
that's the number people make bad decisions on. When either window is empty the
answer is `null`, not `0` — "not enough history" is not "no change".

---

## 17. Tonnage counts loaded work only

**Problem.** Volume is `reps × load`. Bodyweight exercises record no load, so a
programme of push-ups and pull-ups reports zero volume.

**The tempting fix.** We now have a body weight log (§16), so push-ups could be
multiplied by the user's body weight and folded into the total.

**Why not.** Body weight changes for reasons unrelated to training. Someone in a
cut would show falling "volume" on identical work — the metric would move because
of their diet, not their training. Two different quantities added into one number
isn't a total, it's a category error with a decimal point.

**Chosen.** Tonnage counts loaded sets. Sets and reps are reported alongside it,
so bodyweight work is visible in the units that actually fit it, and the caption
under the chart says the exclusion out loud.

**The general rule:** when a metric excludes something, say so **where it is
displayed**, not only in a code comment. A user whose training is mostly
calisthenics sees a low number and concludes the app is broken — which is a
support problem created entirely by a missing sentence.

---

## 18. A substitution satisfies the exercise it replaced

**Problem.** The machine is busy, or the movement hurts today. The only options
were skip it — denting your completion rate for making a sensible call — or hunt
1,300 exercises manually.

**Why it isn't an AI feature**, despite looking like judgement: every input is
structured data we already hold. `target`, `bodyPart`, `equipment`,
`secondaryMuscles`, and the user's available equipment. Same test as §2 — when the
inputs are enumerable and the output space is small, it's a query.

**Options for what a swap *means*.**

1. Log it as an unplanned exercise. Zero new code, but the original stays
   incomplete forever and nothing records that one replaced the other.
2. Log it with a `substitutedFor` pointer.
3. Permanently swap the schedule via the versioned PATCH.

**Chosen: 2.** The original counts as satisfied, completion stays honest, and
repeated swaps become a signal worth acting on later ("you've swapped this four
times — replace it?"). 3 is wrong as a default: a busy machine on one Tuesday is
not a programme change.

**The substitute inherits the original's sets, reps and weights.** You're doing
the same work with a different tool. And because the log keeps the pointer, next
session's progression still reads the original's history rather than treating this
as a new exercise with no baseline.

---

## 19. Stall detection as a rule, not a branch

**Problem.** The engine had `deload-after-repeated-misses`, so *failing* was
handled. The shape it couldn't see: you hit every target, so no miss rule fires,
but `hold-when-struggled` repeats the same weight indefinitely. Grinding one load
for months is the most common way lifters waste a training block.

**Chosen.** One new fact (`sessionsAtLoad`) and one new row in `DEFAULT_RULES`.
No evaluator change, no new operator, no branch in `buildSuggestion`.

**This is the §2 payoff arriving on schedule.** The argument for declarative rules
was that new behaviour would be data. Two years of that claim being untested ended
with a rule that took an object literal and a derived fact — a hardcoded `if`
would have been faster on the day and worse now.

**One subtlety worth keeping.** `sessionsAtLoad` compares loads **normalised to
kg**. The rest of the engine works in whatever unit the user logs in, which is
fine within a session — but a user who switches preference mid-programme would
have 100 and 45.36 read as a load change, silently resetting the stall counter.
That case only surfaced because a test was written for it.

---

## 20. Deload advice is stored, advisory, and needs two signals

**Problem.** Accumulated fatigue is a week-level phenomenon. The per-exercise
engine can't see it: it doesn't know that three lifts stalled at once, or that
volume has climbed five weeks straight, or that you've felt beat up repeatedly.

**Chosen.** A separate assessor above the rule engine, reading three signals —
readiness, simultaneous stalls, volume trend — and requiring **two of three**.

**Why two.** One signal is noise. A bad night's sleep isn't systemic fatigue and a
single stalled lift is a problem with that lift. Requiring two is what makes the
advisory worth reading when it does fire.

**Why the cooldown is correctness, not courtesy.** A deload lowers volume *by
design*. Without stored state, the detector reads the drop it caused as fresh
evidence and recommends another one — a loop where the system's own advice becomes
its input. `User.deload` is therefore stored rather than derived, the same
principle as effective dating (§1): you have to know *why* the data looks like
this.

**Why the current week is excluded from the trend.** It's always partial.
Comparing a two-day-old week against a finished one reports a climb every Sunday
and a collapse every Monday.

**Why it only advises.** Accepting records a decision and shows guidance; the
schedule is untouched. Three signals justify raising a question, nowhere near
rewriting someone's training week on their behalf. Note also that the only
direction this feature ever pushes is *train less* — an app telling a stranger to
train harder off three data points is making a claim it can't support.

**And it shows its evidence.** The banner lists the specific signals that fired
rather than asserting "you seem fatigued", so a user can disagree with the
reasoning. That's the difference between advice and an oracle, and it's the same
reason every progression rule carries an `explain` string.
