# Migrate From Recharts

Recharts expresses a chart through a React component tree. TanStack Charts expresses one reusable definition and lets the React adapter own mount/update lifecycle. Do not translate JSX node names one for one.

## Ownership Map

| Recharts concern              | Inspect                                              | TanStack destination                                |
| ----------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| chart container component     | shared data and layout direction                     | prepared rows plus definition                       |
| `<ResponsiveContainer>`       | parent sizing, aspect, debounce                      | adapter container measurement; height/aspect policy |
| `<XAxis>` / `<YAxis>`         | data key, domain, type, ticks, formatter             | positional scale and axis guide                     |
| `<Line>` / `<Bar>` / `<Area>` | data key, stack ID, shape, animation                 | mark channels, `z`, stack/group layout, stable key  |
| `<Tooltip>`                   | active payload, label, formatter, portal assumptions | definition tooltip and optional adapter body        |
| `<Legend>`                    | series identity and visibility                       | color scale/legend or controlled interactive legend |
| `<Brush>`                     | accepted domain and application policy               | controlled brush/zoom or application control        |
| custom shape                  | semantic geometry versus DOM convenience             | built-in composition, then custom mark if required  |

## Sequence

1. Normalize implicit chart-level data and per-series data into explicit mark-local rows.
2. Record `dataKey`, `stackId`, axis IDs, and hidden-series domain behavior.
3. Replace implicit component inheritance with explicit channels and scales.
4. Keep definition construction memoized against captured React values.
5. Move only rich tooltip body composition to the React adapter; keep tooltip behavior in the definition.
6. Test mount/unmount, Strict Mode development lifecycle, SSR, and container resize.

## High-Risk Differences

- Recharts component nesting looks like semantic ownership but often supplies inherited data/config. Make every TanStack mark's data and channels explicit.
- `stackId` is not merely color grouping. Choose native stack layout and explicit `z`/color semantics.
- Recharts custom shapes often receive already-resolved pixels. TanStack custom marks must remain renderer-neutral and declare scale values before render.
- Do not recreate the definition on every React render.
- Do not move tooltip focus behavior onto adapter props; only the body renderer is framework-owned.

## Parity Cases

- Filtered series retain intended domains and colors.
- Stacks handle missing and negative values.
- Tooltip group order, pinning, and keyboard traversal match the product task.
- Responsive layout works without a fixed-width wrapper.
- Server output and hydration use deterministic initial geometry.

Source: `docs/guides/migrating.md`; React adapter documentation
