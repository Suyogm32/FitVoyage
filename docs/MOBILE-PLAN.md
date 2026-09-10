# Mobile app plan

A React Native client for Fit Voyage, consuming the same Express API as the web
app. **Android only** for now; iOS is possible later but not planned.

This is also a learning project — Suyog is new to React Native — so the phases
are ordered to produce something usable early rather than to build the easiest
parts first.

---

## Scope: parity of capability, not parity of layout

Every feature on the web reaches mobile. Three of them are **reshaped** rather
than ported, because a phone is not a small desktop:

| Feature | Web | Mobile |
| --- | --- | --- |
| Weekly schedule | 7-column grid, all days visible | Horizontal day selector; one day at a time, swipe between them |
| AI program review | All days at once, edit inline | One day at a time with a `3 of 5` indicator, then a summary before applying |
| Volume & progress charts | Hover readouts, breakdown under the chart | Tap-for-readout, fewer points, breakdown on its own screen |

**Nothing is cut.** The earlier instinct — "planning belongs on desktop, the
phone is for logging" — assumed every user has both devices. Many people's only
device is a phone, so a feature that exists only on web is a feature those users
don't have. Reshaping is a design decision; cutting would have been an
exclusion.

The web app is responsive and already works in a mobile browser, so nobody is
stranded today. What native wins is the in-gym case specifically: faster launch,
no browser chrome, and eventually offline logging when the gym has no signal.

---

## Stack, and why

| Choice | Why not the alternative |
| --- | --- |
| **Expo** (managed) | Bare RN on Windows means Android Studio, SDK paths and Gradle. Expo means installing one app on the phone and scanning a QR code |
| **Expo Router** | File-based routing that mirrors the Next.js App Router already in use — route groups, layouts, `Link`. Largest single lever for making RN feel familiar |
| **StyleSheet + a theme object** | NativeWind would reuse existing Tailwind knowledge, but it adds a build-config layer that fails confusingly and hides RN's layout model. Learn the primitives first; NativeWind is a later option |
| **Custom hooks + axios** | Same pattern as `useProgress` / `useBodyWeight` on web, so the mental model transfers. React Query is a later upgrade, not a day-one dependency |
| **`mobile/` in this repo** | Consistent with `web/` and `backend/`. No shared package initially — that's a build-tooling problem to solve only if duplication becomes real |

---

## Phases

Phase 2 is the milestone that matters. Everything before it is scaffolding.

| Phase | Build | Concepts introduced |
| --- | --- | --- |
| 0 | Expo project running on a physical Android phone, one screen | Core components, why there is no `div`, Flexbox defaults |
| 1 | Firebase auth, login/signup, protected routes | AsyncStorage persistence, Expo Router layouts, auth gating |
| 2 | **Today's workout: view, log sets, mark complete** | Lists, forms, modals, calling the API |
| 3 | Weekly schedule with the day selector; add/edit/remove | Navigation params, state across screens |
| 4 | Exercise browse, search, detail | Paged lists, images, deep links |
| 5 | Progress dashboard and charts | `react-native-svg`, porting `TimeSeriesChart` |
| 6 | AI program generation and day-by-day review | Long requests, optimistic UI |
| 7 | Settings, theming, dark mode | Context, `useColorScheme`, persisted preferences |
| 8 | Installable build on the phone | EAS Build, icons, signing, APK distribution |
| 9 *(stretch)* | Offline logging with sync | Local queue, conflict handling |

---

## Predicted friction

This is the first test of whether the API assumes a browser. Three things to
expect:

**Firebase auth will not persist between app launches** unless initialised with
`initializeAuth` + `getReactNativePersistence(AsyncStorage)`. The web SDK
defaults to browser storage that doesn't exist on native. This is the classic
RN + Firebase trap.

**CORS stops applying, and that's instructive.** `ALLOWED_ORIGINS` does nothing
for a native client — CORS is a browser policy and native `fetch` doesn't
implement it. The API will serve mobile with no config change. A good practical
lesson in what CORS actually protects and what it doesn't.

**`ExerciseLog.date` as a `"DD/MM/YY"` string will behave differently.** Device
timezone and locale handling on mobile is less forgiving than a browser's.
Expect at least one off-by-one-day bug. See `CODE-SMELLS.md` §15.

---

## Learning resources

Official docs, in reading order. Better than any tutorial except the last one.

- [Core Components and APIs](https://reactnative.dev/docs/components-and-apis) —
  the vocabulary: `View`, `Text`, `Pressable`, `FlatList`
- [Layout with Flexbox](https://reactnative.dev/docs/flexbox) — **read
  properly.** RN defaults to `flexDirection: column`, not `row`. Trips up every
  web developer exactly once
- [Style](https://reactnative.dev/docs/style) — no cascade, no inheritance
  except within text, no CSS units
- [Expo Router introduction](https://docs.expo.dev/router/introduction/)
- [Expo: create your first app](https://docs.expo.dev/tutorial/create-your-first-app/) —
  the one tutorial worth doing end to end

The mental shift in one line: **you are not writing a page, you are composing
native views.** No document, no DOM, no cascade. Everything is explicit.

Concepts are written up as they're covered in `RN-NOTES.md`.
