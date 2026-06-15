# Conventions

Architecture and workflow notes for BacksterOS Agent. For commands and CI, see [`AGENTS.md`](../AGENTS.md).

## Layout

| Area | Path |
|------|------|
| React UI | `src/` |
| Platform helpers (Tauri, iOS, runtime) | `src/platform/` |
| Sidecar API | `sidecar/src/` |
| Agent kit (Linear, preflight) | `agent/` |
| Staging deploy | [`docs/deploy-staging.md`](deploy-staging.md) |

Prefer `src/platform/*` over scattering `@tauri-apps/*` imports. Linear-first product mode gates vault paths via `PRODUCT_MODE`.

## iOS web app

The app supports iPhone/iPad Safari and **Add to Home Screen** (standalone web app). Layout is driven by classes on `<html>` set in [`src/platform/documentLayout.ts`](../src/platform/documentLayout.ts):

| Class | When |
|-------|------|
| `ios-device` | iPhone, iPad, or dev simulation (see below) |
| `ios-standalone` | Home Screen / standalone display mode |
| `ios-standalone-dev` | Dev simulation only — fake safe-area insets |

Styles live in [`src/styles/ios.css`](../src/styles/ios.css) (imported from `index.css`). Key behaviors:

- Solid black/white surfaces (no frosted content panels)
- Fixed bottom nav + swipe-in list sidebar overlay
- 44pt touch targets for toggles and tabs
- Sheet transitions kept even when **Reduce Motion** is on

Nav item IDs for bottom bar vs list swipe are centralized in [`src/lib/iosNavConfig.ts`](../src/lib/iosNavConfig.ts).

### Dev simulation (`?ios=1`)

On **localhost in dev** (`npm run dev`), append a query flag to exercise iOS layout in desktop Safari or Chrome without a device:

```text
http://localhost:5173/?ios=1
```

Accepted values: `1`, `true`, or `standalone` (see [`src/platform/iosStandalone.ts`](../src/platform/iosStandalone.ts)).

What it enables:

- `isIosDevice()` and `isIosStandaloneWebApp()` return true
- `html` gets `ios-device`, `ios-standalone`, and `ios-standalone-dev`
- Fake safe areas (59px top, 34px bottom) when real `env(safe-area-inset-*)` is zero

**Tips:**

- Use a narrow viewport (e.g. 390×844) in DevTools device mode
- Combine with `useNarrowContentLayout()` breakpoints to see list-first navigation
- Simulation is **dev-only**; production builds ignore the query param

### Testing

- Unit: `bun test src/lib/iosNavConfig.test.ts src/lib/contentPanelSidebarPresentation.test.ts src/lib/iosHorizontalSwipe.test.ts src/lib/iosPullToRefresh.test.ts`
- Platform: `bun test src/platform/iosStandalone.test.ts`
