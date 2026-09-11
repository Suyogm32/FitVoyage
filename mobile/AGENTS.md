# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Fit Voyage mobile — agent handoff

The React Native client for Fit Voyage. **Read `../CLAUDE.md` first** for the
project as a whole, then `../docs/MOBILE-PLAN.md` for the phased plan and
`../docs/RN-NOTES.md` for concepts already covered.

This app consumes the same Express API as the web app. **No backend changes have
been needed or made.**

---

## Stop here first: the live problem

**Phase 1 (auth) is not finished.** Symptom: login succeeds, but the app stays on
the login screen instead of redirecting to the app.

A diagnostic was in progress and its result is not yet known. A `console.log` was
added to the `onAuthStateChanged` callback in `src/lib/auth-context.tsx`:

```jsx
console.log("auth state:", firebaseUser ? firebaseUser.email : "null");
```

Ask Suyog to log in and report what the terminal prints. Three outcomes, each
pointing somewhere different:

| Terminal output | Diagnosis |
| --- | --- |
| `null` → `email` → `null` | Being signed out. `login.tsx` checks `emailVerified` and calls `auth.signOut()` if false. Fix: drop that check for now — his account is verified on web, and it should be re-added when mobile signup exists |
| `email`, but login screen persists | Listener works, redirect doesn't. Problem is in `src/app/(auth)/_layout.tsx` — likely the `<Redirect href="/" />` target |
| only `null`, never the email | `onAuthStateChanged` is watching a different `auth` instance than `signInWithEmailAndPassword` used. Usually means `src/lib/firebase.js` is imported by two different specifiers (`@/lib/firebase` vs `./firebase`) and evaluated twice. Module identity is per resolved path |

Do not start phase 2 until this is resolved.

---

## Environment

`mobile/.env` is gitignored and will **not** arrive with a clone. It needs:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_API_BASE_URL=https://fitvoyage-api.onrender.com
```

Values are the same as `web/.env`, with the `NEXT_PUBLIC_` prefix swapped for
`EXPO_PUBLIC_`. Copy them by hand — never commit them.

```bash
cd mobile && npm install && npx expo start
```

Tested on a **physical Android phone via Expo Go**, scanning the QR code. Phone
and PC must share a Wi-Fi network; `npx expo start --tunnel` is the fallback.
**Android only** — iOS is not planned.

---

## What exists

```
src/
  app/
    _layout.tsx            AuthProvider + Stack, headers off
    (auth)/_layout.tsx     redirects to "/" when signed in
    (auth)/login.tsx       email + password
    (app)/_layout.tsx      redirects to "/login" when signed out; spinner while loading
    (app)/index.tsx        Today screen — HARDCODED placeholder data, not wired to the API
  lib/
    firebase.js            initializeAuth + getReactNativePersistence(AsyncStorage)
    apiClient.js           axios + Firebase ID token interceptor, 90s timeout
    auth-context.tsx       AuthProvider / useAuth, port of the web version
  components/, constants/, hooks/   from the Expo template, mostly unused so far
```

`src/components/app-tabs.tsx` is currently unreferenced — the root layout renders
a `Stack`. Tabs arrive in phase 2, probably with the stable `Tabs` API rather
than the template's `unstable-native-tabs`.

---

## Conventions for this app

- **Every file under `src/` is `.ts` or `.tsx`, and contains plain JavaScript.**
  `tsconfig.json` includes only `**/*.ts` and `**/*.tsx`, and Expo resolves the
  `@/*` alias through those paths — a `.jsx` route file fails with a misleading
  "missing the required default export". Expo strips types with Babel and never
  typechecks, so no type annotations are needed. Editor squiggles are cosmetic.
- **`npx expo install`, never `npm install`, for new packages.** It picks
  versions matching the Expo SDK; `npm install` grabs latest and produces native
  module mismatches that surface as cryptic runtime crashes.
- **Styling is `StyleSheet.create` with hardcoded colours for now.** A theme
  layer lands in phase 7. NativeWind was considered and rejected — it hides RN's
  layout model behind an abstraction while Suyog is still learning it.
- **Data fetching mirrors the web app**: custom hooks plus the shared
  `apiClient`, the same shape as `useProgress` / `useBodyWeight`. No React Query.
- Route groups `(auth)` and `(app)` work exactly like the web app's `(app)`
  group. Guards live in layouts, never in individual screens.

---

## Gotchas already hit

- **"X is undefined" for something you can see is exported usually means the
  bundler, not the export.** Restart with `npx expo start -c` to clear Metro's
  cache. Adding route files while the dev server runs leaves a stale route
  manifest.
- **`cmd.exe`, not PowerShell.** `set VAR=value`, no spaces, no quotes. Paths
  containing route groups need quoting: `ren "src\app\(app)\_layout.jsx" ...`.
- **`autoCapitalize="none"` on every email input.** Android capitalises the first
  letter by default, so login fails with what looks like a wrong password.
- **`onChangeText`, not `onChange`.** It hands you the string; there is no DOM
  event.
- **`Pressable`, not `Button`.** RN's `Button` is barely styleable. `Pressable`
  takes a `style` function of press state — that's the `:active` equivalent.
- **`flex: 1` only fills a parent with a definite size along that axis.** See
  `../docs/RN-NOTES.md`; it collapses silently to zero otherwise.

---

## Predicted friction still ahead

- `ExerciseLog.date` is a legacy `"DD/MM/YY"` string. Device timezone and locale
  handling is less forgiving than a browser's — expect an off-by-one-day bug.
  Parse strictly with dayjs `customParseFormat`. See `../docs/CODE-SMELLS.md` §15.
- CORS does not apply to a native client — `ALLOWED_ORIGINS` is irrelevant here
  and no backend change is needed. This is expected, not a misconfiguration.
- The API sleeps on Render's free tier; a cold request takes up to a minute.
  `apiClient` has a 90s timeout for this reason. Mobile needs its own waking
  state, equivalent to the web app's `ApiWakingBanner`.

---

## How to work with Suyog

He is the developer and new to React Native; you are the mentor. Full detail is
in `../CLAUDE.md`, but the points that matter most here:

- **Concept first, then build.** Explain the React Native idea and how it differs
  from the web equivalent he already knows, *then* write the code.
- **Give complete code; he applies it himself.** Do not edit repo files unless he
  asks in that message.
- **Say exactly where a block goes** — file and line. Do not paste surrounding
  context around new code; it reads as "replace all of this" and has caused bad
  edits repeatedly.
- Append new concepts to `../docs/RN-NOTES.md` as they come up, written from what
  actually confused him rather than as textbook definitions.

## Next, once auth works

Phase 2 in `../docs/MOBILE-PLAN.md`: today's workout wired to
`GET /api/myschedule?date=&day=`, logging sets via `POST /api/myschedule`, and
marking exercises complete. That is the first genuinely useful build — everything
before it is scaffolding.
