# Svelte Adapter

Use `Chart` from `@tanstack/charts/svelte`. Derive the complete definition with Svelte 5 `$derived` when it captures reactive values.

## Ownership

- The adapter prerenders through the shared controller, mounts in `onMount`, updates from an effect, and returns cleanup that destroys the host.
- Keep definition behavior in the definition and surface/accessibility options on `Chart`.
- Pass a Svelte 5 `tooltipBody` snippet for framework-owned content; the host owns placement, pinning, portaling, and dismissal.

## SSR

Svelte emits the complete accessible SVG. `initialWidth` controls server geometry, and `$props.id()` requires the same deterministic tree, values, and formatting at hydration.

## Failure Checks

- Rebuilding a captured definition during unrelated template work instead of deriving it.
- Reading browser size during server construction.
- Treating snippet content as tooltip behavior.
- Interactive transient content before the tooltip is pinned.

Source: `docs/framework/svelte/adapter.md`; `docs/framework/svelte/reference/chart.md`
