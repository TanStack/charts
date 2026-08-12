# Octane Adapter

Use `Chart` from `@tanstack/charts/octane`. Use `/canvas` for the Canvas surface and `/core` for an injected renderer.

## Ownership

- Keep fixed definitions at module scope and captured definitions stable through Octane `useMemo`.
- The adapter prerenders, mounts in `useLayoutEffect`, forwards complete updates, and destroys on cleanup.
- Put behavior in the definition; use `renderTooltipBody` only for Octane-owned pinned content.

## SSR

Octane emits complete SVG or a deterministic Canvas shell at `initialWidth`, then hydrates/adopts it in the browser target. Keep definitions, data, domains, renderer choice, dimensions, and generated IDs deterministic.

## Failure Checks

- Definition recreation on every component execution.
- Switching target structure between server and browser.
- Expecting Canvas pixels on the server.
- Treating tooltip body rendering as focus/placement ownership.

Source: `docs/framework/octane/adapter.md`; `docs/framework/octane/quick-start.md`; `docs/framework/octane/reference/chart.md`
