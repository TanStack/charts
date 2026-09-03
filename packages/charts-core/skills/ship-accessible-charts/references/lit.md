# Lit Adapter

Register a custom element with `defineChartElement` from `@tanstack/charts/lit`, then replace its complete `options` value when data or policy changes. Lit SSR and hydration are not yet a verified adapter contract.

## Ownership

- The element prerenders through the shared controller, mounts after first update, updates from replacement options, destroys on disconnect, and mounts again on reconnect.
- Keep definition behavior inside the definition.
- Use the documented body-renderer seam only for Lit-owned tooltip content.

## Lifecycle Checks

- Registration happens once for a tag name.
- Disconnect releases runtime resources.
- Reconnect mounts the existing element/controller cleanly.
- Options are replaced rather than mutated in place.

## SSR Policy

Do not claim Lit hydration support from browser lifecycle tests. Use framework-neutral static rendering when server SVG is required, or verify the application integration explicitly.

Source: `docs/framework/lit/adapter.md`; `docs/framework/lit/reference/chart.md`
