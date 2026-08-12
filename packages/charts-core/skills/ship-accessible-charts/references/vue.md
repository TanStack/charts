# Vue Adapter

Use `Chart` from `@tanstack/charts/vue`. Build captured definitions with `computed`; module-scope definitions need no reactive wrapper.

## Ownership

- The adapter prerenders through the shared controller, mounts in `onMounted`, updates from complete props, and destroys in `onBeforeUnmount`.
- Definition behavior stays in the definition.
- Use the scoped `#tooltipBody` slot for Vue-owned body content and read its pinned/dismiss state.

## SSR

Vue emits the complete accessible SVG. `initialWidth` determines server geometry, and `useId()` remains stable when the same tree, data, formatters, and dimensions render on server and client.

## Failure Checks

- Constructing a definition in template evaluation without `computed`.
- Mutating a definition or transformed rows in place and expecting update discovery.
- Divergent locale/time/random output during hydration.
- Slot controls present while the tooltip is transient rather than pinned.

Source: `docs/framework/vue/adapter.md`; `docs/framework/vue/reference/chart.md`
