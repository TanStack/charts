# Angular Adapter

Use `Chart` from `@tanstack/charts/angular` with an immutable complete options value. The verified package contract currently covers browser mount, immutable updates, and teardown; adapter SSR and hydration are not yet promised.

## Ownership

- The component prerenders controller state, mounts into the real surface in the browser lifecycle, forwards replacement options, and destroys on teardown.
- Keep definition behavior in the definition.
- Use `[tanstackChartTooltipBody]` with the definition as the generic type witness for Angular-owned tooltip content.

## SSR Policy

Do not infer adapter SSR support from an application's Angular server infrastructure. For deterministic server SVG, use the framework-neutral runtime/render boundary or keep the chart on the verified browser path until the adapter contract changes.

## Failure Checks

- Mounting measurement or mutation against a server placeholder.
- Mutating nested options without replacing the complete value.
- Losing tooltip types by omitting the definition witness.
- Claiming hydration parity without an application-level test.

Source: `docs/framework/angular/adapter.md`; `docs/framework/angular/reference/chart.md`; GitHub issue 56
