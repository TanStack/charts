---
'@tanstack/charts': minor
---

Move TanStack Charts into official Alpha on the regular `0.x` release line.

Chart definitions now require Cartesian scales under `scales.x` and `scales.y`.
Polar definitions require `scales.angle` and `scales.radius`. The temporary
pre-Alpha root properties, runtime adapters, and development warnings have been
removed. Custom mark types should replace `ChartMarkX` and `ChartMarkY` with
`ChartMarkPointX` and `ChartMarkPointY`, imported from
`@tanstack/charts/mark/scale-values`. Polar layout callbacks should read the
reserved mappings from `layout.scales`.

Reserved scale entries are checked against the marks that use them at the
precise authored type boundary. A materialized dimension requires a configured
scale, while an unused dimension requires an explicit `null` entry. Runtime
validation still checks required reserved entries and channels that actually
materialize, but type-only scale ownership cannot be recovered after a custom
mark or stored definition has been erased.

Fresh built-in mark option literals now reject unsupported properties while
preserving typed channels, named scale IDs, and generic mark wrappers.

Exact-zero cells in diverging stacks now stay on their running positive or
negative baseline instead of drawing false spikes through lower area layers.
Pinned tooltips now dismiss when the pointer is pressed outside the chart and
tooltip, so pointer inspection resumes after focus leaves the chart.
