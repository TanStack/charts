# Solid Adapter

Use `Chart` from `@tanstack/charts/solid`. Build definitions that capture signals with `createMemo` and pass the memoized value.

## Ownership

- The adapter prerenders from reactive props, mounts in `onMount`, updates from effects, and destroys in `onCleanup`.
- Keep behavior in the definition and surface/accessibility concerns on `Chart`.
- Use `renderTooltipBody` for Solid-owned content. Read the tooltip context reactively instead of destructuring it and losing tracking.

## SSR

Solid emits the complete accessible SVG. `initialWidth` controls server geometry, and `createUniqueId()` requires deterministic server/client trees.

## Failure Checks

- Calling a definition factory repeatedly instead of memoizing captured values.
- Destructuring reactive tooltip context and freezing content.
- Browser-only measurements in definition construction.
- Controls rendered before `tooltip.pinned` is true.

Source: `docs/framework/solid/adapter.md`; `docs/framework/solid/reference/chart.md`
