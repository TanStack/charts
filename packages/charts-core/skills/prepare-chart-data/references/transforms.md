# Transform Selection and Output Contracts

Use this table to choose analytical ownership. Read `docs/reference/transforms.md` for exact signatures.

| Need                           | Primitive                        | Input and output contract                 | Preserve or verify                            |
| ------------------------------ | -------------------------------- | ----------------------------------------- | --------------------------------------------- |
| Wide fields become metric rows | `fold`                           | rows → one row per selected field         | field tuple, metric direction, lineage        |
| Aggregate by named keys        | `groupBy`                        | rows → one row per group                  | group fields, empty groups, reducer semantics |
| Numeric histogram              | `binX` / `binY`                  | observations → interval rows              | thresholds, inclusive edges, sample count     |
| Two-dimensional bins           | `binXY`                          | observations → x/y interval cells         | empty cells, count or aggregate output        |
| Calendar bins                  | time-bin transform               | dates → calendar interval rows            | timezone, interval boundary, missing periods  |
| Reusable stack endpoints       | `stackRowsX` / `stackRowsY`      | series rows → endpoint rows               | negative policy, order, missing series        |
| Mark-local stacking            | `stack()` layout                 | ordinary rows → mark geometry             | use when endpoints have no external consumer  |
| Mark-local grouping            | `group()` layout                 | ordinary rows → grouped mark geometry     | bandwidth and series order                    |
| Normalize values               | `normalize`                      | rows → rows with named normalized output  | basis, denominator, zero extent               |
| Rank categories                | `rank`                           | rows → rank output                        | direction, ties, stable secondary order       |
| Rolling statistic              | `rollingWindow`                  | ordered rows → windowed rows              | partition, order, size, partial-window policy |
| Running total                  | `cumulative`                     | ordered rows → cumulative output          | reset partition and missing values            |
| Select representative rows     | `select`                         | rows → original chosen rows               | order and tie policy                          |
| Reduce with custom output      | `reduce` / reducer callback      | group/window → scalar or row              | deterministic, synchronous reducer            |
| Regression                     | regression transform/mark        | observations → fitted values or geometry  | model assumptions, residual evidence          |
| Waterfall                      | waterfall transform              | changes → start/end contribution rows     | reconciliation to starting and ending totals  |
| Mosaic                         | mosaic transform                 | categorical observations → area intervals | marginal totals and empty combinations        |
| Hierarchy                      | hierarchy preparation            | parent-child or nested rows → hierarchy   | root policy, cycles, negative values          |
| Product-specific enrichment    | ordinary `map`/`filter`/function | application rows → application rows       | named units and explicit lineage              |

## Sequence Rules

1. Fix row grain and units before aggregation.
2. Apply structural transforms before analytics that depend on the new structure.
3. Partition and order before rolling or cumulative transforms.
4. Keep geometry-only stack/group work inside the mark.
5. Hoist eager transforms out of chart builders and render functions.
6. Recompute when source rows or semantic options change; do not mutate results in place.
7. Verify empty, single-row, missing, duplicate, negative, and zero-denominator cases.

## Lineage Rule

Every derived row used for inspection should answer: “Which immediate rows produced this value?” TanStack transforms use `source`; application transforms should retain an equivalent field when the answer matters.

## Projection Rule

Forecasting is not a display transform. Keep model execution outside the chart, then deliver rows that explicitly identify observed versus projected status, cutoff, horizon, and interval endpoints.
