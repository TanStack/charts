# Preact Adapter

Use `Chart` from `@tanstack/charts/preact` and Preact's `useMemo` for definitions that capture reactive values.

## Ownership

- The adapter prerenders, mounts the shared host in a layout effect, forwards complete prop updates, and destroys it on unmount.
- Keep definition behavior in the definition and surface/accessibility options on `Chart`.
- Use `renderTooltipBody` for Preact-owned pinned content; the shared host owns focus, placement, portaling, and dismissal.

## SSR

Preact emits the complete host, surface, and accessible SVG. `initialWidth` controls server geometry, and `useId()` must see the same component tree on both sides.

## Failure Checks

- Definition recreation without changed captured values.
- Nondeterministic server data, formatting, dimensions, or tree order.
- Assuming a React-only tooltip import works in Preact.
- Rendering interactive controls in a transient inert tooltip body.

Source: `docs/framework/preact/adapter.md`; `docs/framework/preact/reference/chart.md`
