# React Native notes

Concepts as they come up, written for someone who already knows React and the
web. Each entry is here because it caused confusion, not because it appears in a
tutorial.

Companion to [MOBILE-PLAN.md](MOBILE-PLAN.md).

---

## Phase 0 — primitives and layout

### The file map

Expo Router is deliberately close to the Next.js App Router.

| Expo Router | Next.js App Router |
| --- | --- |
| `src/app/_layout.tsx` | `app/layout.js` — wraps every route, persists across navigation |
| `src/app/index.tsx` | `app/page.js` — the `/` route |
| `src/app/explore.tsx` | `app/explore/page.js` |
| `@/components/…` | same alias idea, rooted at `src/` |

No `<html>` or `<body>`. The root of the tree is a native view.

**This project uses Expo SDK 57 / React Native 0.86 / React 19, and routes live
in `src/app/`, not root `app/`.** Most tutorials online assume root `app/` — they
are out of date, not wrong-in-principle.

Files keep the `.tsx` extension but contain plain JavaScript. Expo strips types
with Babel and never typechecks, so TypeScript is optional here. Editor squiggles
about implicit types are cosmetic.

### `View` and `Text` replace `div` and `span` — and `Text` is mandatory

A bare string inside a `View` is a **runtime crash**, not a styling problem.

There is no document. A `View` compiles to an Android `ViewGroup`; text needs a
`TextView`. The platform has no concept of loose text inside a container, so RN
refuses to invent one. The error names the offending string, which makes it easy
to find in a large component.

### Flexbox is always on, and the defaults differ

| Property | Web default | RN default |
| --- | --- | --- |
| `display` | `block` | always flex |
| `flexDirection` | `row` | **`column`** |
| `flexShrink` | `1` | **`0`** |

Every row layout has to opt in with `flexDirection: "row"`.

### `flex: 1` only fills a parent that has a definite size

The one that actually bit. `flex: 1` expands to:

```js
flexGrow: 1      // take a share of leftover space
flexShrink: 1    // give up space if needed
flexBasis: 0     // start from zero size along the main axis
```

`flexBasis: 0` is the trap: **start at zero, then grow.** Which axis it applies
to depends on the parent's `flexDirection`.

Observed live: a card with `flexDirection: "row"` containing a `flex: 1` text
block and a badge. Removing `flexDirection: "row"`:

- Main axis became vertical, so the text block started at **zero height**
- The card sizes to its content, so there was **no leftover height to grow into**
- The text block stayed at zero and its content disappeared entirely
- The badge, having no `flex`, kept its natural size and remained visible

> **`flex: 1` only fills something when the parent has a definite size along
> that axis.**

This is why `flex: 1` works on a screen-level container — its parent is the
screen, which has a real height — and silently collapses inside a
content-sized container.

The fix for a genuine column layout is to *remove* `flex: 1`, not to add a
height.

### `justifyContent` and `alignItems` swap axes with the direction

They are defined relative to the main and cross axes, not to horizontal and
vertical. Changing `flexDirection` reverses what both of them mean.

In a row: `justifyContent` spreads horizontally, `alignItems` aligns vertically.
In a column: exactly the other way round.

### Styles are objects and nothing cascades

`StyleSheet.create({...})`. camelCase keys, **numbers not strings** —
`paddingHorizontal: 16`, never `"16px"`. No units; everything is
density-independent pixels.

There is no inheritance. `color` on a `View` does nothing to the `Text` inside
it. Every text style must be set on a `Text`, which is why shared `ThemedText`
style components exist — the same problem `cardClass` solves on the web side.
