# Bug and smell catalogue

Defect classes actually found in this codebase, with the fix and how to spot the
next one. Ordered by how often they recurred.

Use the [review checklist](#review-checklist) at the bottom before opening a PR.

---

## 1. Client-side filtering and pagination

**Found in:** `SearchExercises`, `Exercises`, `ScheduleStack`.

All three fetched the entire ~1,300-row catalogue and then filtered or sliced in
the browser. Changing a body-part filter re-fetched everything.

**Fix.** `GET /api/exercisedb/browse` with filter, search, skip and limit
server-side. Components hold one page.

**Spotting it.** `.filter(...)` or `.slice(...)` applied to a response array is the
tell. If the user can narrow a result set, the narrowing belongs in the query.

**Related trap.** `skip`/`limit` is only correct over a **total** order. Sorting by
a non-unique field lets rows swap between queries, so a record can appear on two
pages or none. Always add a unique tie-breaker: `{ name: 1, id: 1 }`.

---

## 2. Dependency arrays that compare by reference

**Found in:** `GoalsModal`.

```js
useEffect(() => {
  /* seed state AND fetch body parts */
}, [weeklyGoals]);   // an array prop
```

The parent passes `weeklyGoals={profile?.weeklyGoals || []}` inline, so the array
identity changes on every parent render. The effect re-ran, re-fetched, and reset
the user's in-progress typing to the server values.

**Fix.** Split into a seed-once effect guarded by a ref, and a mount-only fetch.

**Spotting it.** Any object, array or function in a dependency array that is not
memoised. It looks correct and fails silently — the symptom is a request loop or
state that "keeps resetting", not an error.

---

## 3. Over-broad `try` swallowing the caller's error

**Found in:** `ProgramReview.apply`, and previously in `requireAuth`.

```js
try {
  await apiClient.post(...);
  onApplied();          // ← inside the try
} catch {
  setError("Couldn't apply this program.");
}
```

The request succeeded; `onApplied()` threw; the user was told the API failed.

**Fix.** A `succeeded` flag, with the callback outside the `try`:

```js
let succeeded = false;
try { await apiClient.post(...); succeeded = true; }
catch (err) { setError(...); }
finally { setSubmitting(false); }
if (succeeded) onApplied?.();
```

**Spotting it.** Anything after the `await` inside a `try` whose `catch` reports a
*specific* cause. The `catch` should only cover the operation it names.

---

## 4. Silent failure paths

**Found in:** `handleSaveLog`, `applySuggestion`, `removeExercise`, and every
modal's save handler.

```js
catch (error) {
  console.error("Error saving log:", error);
}
```

Success and failure looked identical to the user. A failed log just… didn't appear.

**Fix.** `ToastProvider`; every mutation reports both outcomes. Form errors stay
inline (the user is still in the form); actions that close their own UI use a
toast.

**Spotting it.** A `catch` block whose entire body is `console.error`.

---

## 5. Missing double-submit guards

**Found in:** most mutation handlers, repeatedly.

**Fix.** Every async handler starts with `if (submitting) return;` and sets the
flag before the first `await`.

**Spotting it.** Any `onClick` that hits the network without a disabled state
derived from in-flight status. This one recurred often enough to belong at the top
of the checklist.

---

## 6. Two pieces of state for one fact

**Found in:** `Exercises`, `ScheduleStack`.

```js
const [showPopup, setShowPopup] = useState(false);
const [addExer, setAddExer] = useState({});
useEffect(() => { if (addExer.name) setShowPopup(true); }, [addExer]);
```

An effect existed purely to keep two states in sync, and they could fall out of
sync.

**Fix.** `const [addExer, setAddExer] = useState(null)` — non-null *is* the open
state. The effect disappears.

**Spotting it.** An effect whose only job is to set state from other state. That is
derived data, not state.

---

## 7. Dual-shape routes

**Found in:** `GET /api/myschedule` — returns a flat per-day array with `?date`, a
raw schedule document without it.

Every caller must know which shape it will get, and the response type can't be
described in one sentence.

**Not fixed** (it has several callers), but it is the reason `/browse` was added as
a separate route instead of overloading `GET /api/exercisedb`. A route whose
contract matches one screen is cheaper than a route that means two things.

**Spotting it.** A handler with an early `return res.json(...)` producing a
different *shape*, not just different data.

---

## 8. Shared DOM ids in repeated components

**Found in:** `HorizontalScrollForExercises`, `HorizontalScrollBar`.

```js
<div id="slider" ...>
document.getElementById("slider").scrollLeft += 800;
```

The page renders two of these. `getElementById` returns the first, so the second
row's arrows scrolled the first row.

**Fix.** `useRef`.

**Spotting it.** Any literal `id` inside a component that can render more than
once, and any `getElementById` in React at all.

---

## 9. Undefined values in library configuration

**Found in:** `lib/theme.js`.

```js
text: { primary: readVar("--foreground") }   // returns undefined when unread
```

MUI merges your palette **over** its defaults, so an explicit `undefined` *erases*
the default rather than falling back to it. The result was
`alpha(undefined, ...)` → `Cannot read properties of undefined (reading 'type')`
inside `Button`'s hover style, crashing any page with a MUI button.

**Fix.** A fallback at every lookup, not a hope that the library copes.

**Spotting it.** Config objects built from runtime lookups —
`getComputedStyle`, `process.env`, query params. Omitting a key and passing
`undefined` are different things.

---

## 10. String concatenation posing as format translation

**Found in:** `lib/theme.js`.

```js
return value ? `hsl(${value})` : undefined;
```

Variables hold bare `H S% L%` triplets for Tailwind. MUI's `colorManipulator`
splits `hsl()` on **commas**, so `hsl(240 10% 12%)` parsed as `[240]` and every
derived colour came out `NaN`. It never threw — `NaN%` in a CSS colour still
renders something — so it was wrong for weeks while looking merely "a bit off".

**Fix.** `toMuiHsl` converts to the comma form.

**Spotting it.** A template literal bridging two libraries' formats. If two systems
read the same value, something must translate, and translation is a function, not
interpolation.

---

## 11. Half-wired refresh chains

**Found in:** the schedule page after adding an exercise; the AI-suggested weights
flow.

A mutation succeeded, the server was correct, and the UI showed stale data until a
manual refresh — because an `onChange` callback wasn't threaded from the mutating
component up to the component that owns the fetch.

**Spotting it.** Any component that mutates data it doesn't own must accept a
callback prop, and every caller must pass it. Grep for the callback name and check
every call site, not just the one you're editing.

---

## 12. Empty stub components and dead class names

**Found in:** `ScheduleComponent/Searchbar.jsx` (empty), `VideoCard.jsx` (returns
`<div className="card"></div>` and nothing else), and the classes `.detail-image`,
`.exercise-video`, `.bodyPart-card`, `bg-LoginBackCol` — all referenced in JSX with
**no CSS rule anywhere**.

`.detail-image` was why the exercise gif rendered at raw intrinsic size: it looked
styled, and wasn't.

**Spotting it.** A component that returns nothing meaningful; a `className` you
can't find a rule for. Both cost nothing to keep and mislead you every time you
read the file.

---

## 13. Dependencies that do nothing

Nine packages had zero imports: `@mui/styled-engine-sc`, `@mui/lab`, `swiper`,
`react-horizontal-scrolling-menu`, `date-fns`, `class-variance-authority`, plus
`clsx` and `tailwind-merge` (used only by `lib/utils.js`, which nothing imports)
and `react-calendar` (imported only for a CSS file, in a component that renders
MUI's `StaticDatePicker`).

`@mui/styled-engine-sc` is the interesting one: it only takes effect if you alias
`@mui/styled-engine` to it in `next.config.mjs`, which is empty — so MUI has always
used emotion, and the package did nothing while keeping `styled-components`
installed as a peer dependency.

**Spotting it.** Periodically grep each `package.json` dependency for an import.
Removals ship to production and pollute `npm audit` forever.

---

## 14. Spreading an object over explicit keys

**Found in:** `exerciseHistory` in `utils/volume.js`.

```js
sessions.push({
  sets: (exercise.setsCompleted || []).map(...),  // an array
  ...totals,                                      // totals.sets is a NUMBER
});
```

`summariseExerciseEntry` returns `sets` as a *count*. Because the spread came
last, it silently replaced the array. Everything downstream that called
`session.sets.map()` threw.

**Fix.** Destructure and rename at the boundary:
`const { sets: setCount, ...totals } = summariseExerciseEntry(exercise)`.

**Spotting it.** A spread placed after explicit keys in the same literal. The root
cause here was naming, not the spread — two different quantities were both called
`sets`. If either had been `setCount` from the start there'd have been no
collision to hide. Be suspicious of a short noun that could plausibly mean both a
collection and its size.

---

## 15. Stringly-typed dates

**Found in:** `ExerciseLog.date`, stored as `"DD/MM/YY"`.

That format can't be range-queried in Mongo and sorts wrong lexically —
`"01/09/26"` precedes `"30/08/26"`. Every consumer has to parse with dayjs
`customParseFormat` in strict mode before comparing, and one forgotten parse is a
silently wrong ordering rather than an error.

**Not migrated** — it has too many readers to be worth it right now. But
`BodyWeight.date` is a real `Date`, and `/api/history/*` emits ISO strings.

**The rule going forward:** new collections store `Date`, new endpoints emit ISO,
the client formats. A date that has to be parsed before it can be compared isn't a
date, it's a label.

---

## 16. Security issues found and fixed

Recorded so they stay fixed.

- **IDOR.** Endpoints accepted a user id from the client. Every route now derives
  identity from `req.user.dbId` only.
- **Plaintext passwords in the credentials flow.** Resolved by moving to Firebase
  Auth — the backend has no password field at all now.
- **Two route bugs in `program.js`** where `days` was used instead of the validated
  `validDays`, letting unvalidated day keys through.
- **Still open:** no per-user rate limit on `POST /api/program/generate`, which
  calls a paid provider chain in a loop-able way. Must land before public
  deployment.
- **Accepted, known:** a hardcoded RapidAPI YouTube key in
  `web/app/utils/fetchData.js`. Deliberate for now.

---

## Review checklist

Before opening a PR:

**Data fetching**
- [ ] Filtering, sorting and pagination happen server-side
- [ ] `skip`/`limit` queries sort on a unique tie-breaker
- [ ] Effects that fetch have a `cancelled` guard against out-of-order responses
- [ ] No object/array/function in a dependency array unless memoised

**Mutations**
- [ ] `if (submitting) return;` before the first `await`
- [ ] Both success and failure are reported to the user
- [ ] Callbacks fire outside the `try` that reports API errors
- [ ] The refresh callback is threaded through *every* call site
- [ ] Destructive actions confirm, and the copy says what survives

**State**
- [ ] No effect exists purely to sync one state from another
- [ ] Derived values are computed, not stored
- [ ] No spread placed after explicit keys it could overwrite

**API**
- [ ] One response shape per route
- [ ] Identity comes from `req.user.dbId`, never the request body
- [ ] Date and enum inputs are validated server-side, not just constrained in the UI
- [ ] New endpoints emit ISO dates; `ExerciseLog` dates are parsed strictly
- [ ] Units are converted at one boundary, not per consumer

**Metrics**
- [ ] The number would change what a user does — otherwise it's opt-in
- [ ] Anything the metric excludes is stated where it's displayed
- [ ] A partial period (the current week) is excluded from trend comparisons
- [ ] "Not enough data" is a distinct answer from "no change" — null, not zero

**Advice**
- [ ] The user can see which signals fired, not just the conclusion
- [ ] Acting on advice records that it happened, so the system can't re-detect
      the change it caused
- [ ] Advice suggests; it doesn't rewrite the user's data on its own initiative

**Styling**
- [ ] No hex codes or `bg-white`/`text-black` outside deliberate exceptions
- [ ] Every colour is a token
- [ ] Checked in both light and dark mode
- [ ] No literal DOM `id` in a component that can render twice

**Hygiene**
- [ ] No `className` without a matching rule
- [ ] New dependencies are actually imported
