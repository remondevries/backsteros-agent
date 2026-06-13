# Performance verification checklist

Use this checklist when validating UI or data-layer performance changes.

## Editor and navigation

- [ ] Open a daily note and type continuously — `ContentPanelTabsBar` and right chat panel should not re-render every keystroke (React Profiler).
- [ ] Switch content tabs — each tab restores its prior navigation state including focus context.
- [ ] Close the active tab — outgoing tab state is persisted before fallback tab loads.

## Lists and scrolling

- [ ] Chat session with 100+ messages scrolls smoothly.
- [ ] Linear project with 100+ issues scrolls smoothly within status groups.
- [ ] Vault folder with 100+ notes scrolls smoothly; search input debounces (~200ms).

## Network and caching

- [ ] Open command palette twice in one session — vault search index fetched once (server cache + client cache).
- [ ] Navigate Projects → Overview → Issues — no duplicate settings or overview fetches within TTL window.
- [ ] Browse Meetings/Letters with flatten enabled — single `/vault/entries?flatten=true` request per folder.

## Mobile layout

- [ ] At ≤720px width, open vault breadcrumb sidebar, browse folders, tap **Done** — main content returns.
- [ ] Selecting a note or changing folder path closes the narrow sidebar overlay.

## Sidecar (local dev)

- [ ] With `SIDECAR_DEV_TIMING=1`, `/vault/search-index` logs cache hits on second request within same vault mtime.
