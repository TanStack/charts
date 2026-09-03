---
title: Data Transforms
description: Typed, eager transforms for reusable application data.
---

Transforms are ordinary functions: source rows in, typed derived data out.
They do not rewrite mark options, retain state, cache results, or own framework
reactivity.

## Functions

| Export                     | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| `fold`                     | Wide rows repeated into authored field/value pairs       |
| `groupBy`                  | Named group fields, reducer outputs, and lineage         |
| `binX`, `binY`             | Numeric intervals on one axis                            |
| `binXY`                    | Numeric cells with x and y intervals                     |
| `binTimeX`, `binTimeY`     | Calendar-aligned intervals from a supplied time interval |
| `rollingWindow`            | Flat input rows extended with rolling outputs            |
| `cumulative`               | Flat input rows extended with running outputs            |
| `rank`                     | Flat input rows extended with ranks                      |
| `normalize`                | Flat input rows extended with normalized values          |
| `select`                   | Selected original rows                                   |
| `stackRowsX`, `stackRowsY` | Flat input rows extended with stack endpoints            |
| `mosaicX`, `mosaicY`       | Two normalized proportional interval dimensions          |
| `boxRows`                  | Tukey summary and outlier rows by category               |
| `linearRegressionRowsX/Y`  | Sampled least-squares fits and confidence bounds         |
| `waterfall`                | Ordered signed contributions as cumulative intervals     |
| `quantile`                 | A reusable quantile reducer factory                      |
| `treeLayout`               | Tidy-tree node and link rows in semantic coordinates     |
| `forceLayout`              | Settled nodes, resolved links, and padded x/y domains    |

Granular entry points are:

- `@tanstack/charts/transform`
- `@tanstack/charts/transform/bin`
- `@tanstack/charts/transform/bin-time`
- `@tanstack/charts/transform/bin-xy`
- `@tanstack/charts/transform/cumulative`
- `@tanstack/charts/transform/fold`
- `@tanstack/charts/transform/group`
- `@tanstack/charts/transform/mosaic`
- `@tanstack/charts/transform/normalize`
- `@tanstack/charts/transform/rank`
- `@tanstack/charts/transform/reduce`
- `@tanstack/charts/transform/select`
- `@tanstack/charts/transform/stack`
- `@tanstack/charts/transform/waterfall`
- `@tanstack/charts/transform/rolling-window`
- `@tanstack/charts/box`
- `@tanstack/charts/regression`
- `@tanstack/charts/hierarchy/tree`
- `@tanstack/charts/network/force`

Numeric, two-dimensional, and calendar bins are separate so specialized
binning does not enlarge an ordinary histogram.

Numeric `thresholds` accepts a count, complete boundary array, or a
D3-compatible threshold callback such as `thresholdScott`.

Collection transforms use action names such as `fold`, `groupBy`,
`rollingWindow`, and `normalize`. A `*RowsX` or `*RowsY` name is reserved for
prepared rows paired with a same-named mark family, such as `boxRows` and
`linearRegressionRowsX/Y`. Reducers remain scoped to the reduce entry and use
analytical names such as `delta`.

## Fold wide rows

`fold` turns selected fields into long-form rows while preserving the other
source fields:

```ts
import { fold } from '@tanstack/charts/transform/fold'

const points = fold(rows, {
  fields: ['R90_10_1980', 'R90_10_2015'] as const,
  as: { key: 'periodField', value: 'inequality' },
})
```

Output is source-row-major, then follows authored `fields` order. Each point
retains the source row's other properties and adds `periodField`, `inequality`,
`source`, and `sourceIndexes`. Omitting `as` uses `key` and `value`. Values are
not filtered, so `null`, `undefined`, and `NaN` remain available to subsequent
transforms or application logic.

Use a literal field tuple so the output key and value remain correlated when
TypeScript narrows the key. Duplicate fields, identical output names, and the
reserved `source` or `sourceIndexes` output names throw synchronously with a
`fold:` error. Output names may replace source fields; lineage retains the
original row.

## Group fields

`by: 'region'` preserves the field name in the result. Compound groups use a
named object:

```ts
const daily = groupBy(orders, {
  by: {
    region: 'region',
    day: (datum) => utcDay.floor(datum.createdAt),
  },
  outputs: {
    revenue: { value: 'amount', reduce: 'sum' },
    orders: { reduce: 'count' },
  },
})
```

The result contains `region` and `day`, not an opaque `key` or tuple.

## Reducers

Every output names its reducer. `count` omits `value`; numeric reducers require
it. Compact built-in strings are `count`, `sum`, `mean`, `min`, and `max`.
Tree-shakeable reducer functions provide `median`, `variance`, `deviation`,
`first`, `last`, `delta`, and `ratio` without adding them to every
aggregation bundle.

Custom reducers receive one object with `values`, selected `data`, source
`indexes`, and the named `group` object. `quantile(probability)` returns a
custom reducer.

Empty `count` and `sum` results are zero. Other empty numeric results are
`NaN`. `variance` and `deviation` use the sample denominator and return `NaN`
for fewer than two finite values. If a singleton group needs a zero-width
interval, state that policy in a small authored reducer.

Numeric reducers ignore non-finite channel values, while `source`,
`sourceIndexes`, and a custom reducer's `data` still describe every input row
in the group. Filter invalid observations before `groupBy` when lineage should
contain only contributors.

## Ordering and flat rows

`rollingWindow` and `cumulative` accept `orderBy` and ascending or descending `order`.
Input order is used when `orderBy` is omitted. `rank` orders by its `value` and
supports competition, dense, and ordinal ties.

One-to-one transforms spread the input row and add named outputs:

```ts
const trends = rollingWindow(daily, {
  by: 'region',
  orderBy: 'day',
  size: 28,
  partial: false,
  outputs: {
    revenue28d: { value: 'revenue', reduce: 'sum' },
    averageOrder28d: { value: 'averageOrder', reduce: 'mean' },
  },
})

lineY(trends, { x: 'day', y: 'revenue28d', color: 'region' })
```

There is no nested `datum.datum` path. A named output may intentionally replace
an input field; the original rows remain available through lineage. Structural
`source` and `sourceIndexes` names are reserved.

## Mosaic intervals

`mosaicY` allocates outer category totals across x, then normalizes y values
within each x category. Keep aggregation explicit so the definition shows
whether a cell represents a count or a weighted sum:

```ts
import { groupBy, mosaicY, rect } from '@tanstack/charts'

const counts = groupBy(responses, {
  by: { question: 'question', response: 'response' },
  outputs: { count: { reduce: 'count' } },
})

const cells = mosaicY(counts, {
  x: 'question',
  y: 'response',
  value: 'count',
  yOrder: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree'],
})

rect(cells, {
  x: 'x',
  x1: 'x1',
  x2: 'x2',
  y: 'y',
  y1: 'y1',
  y2: 'y2',
  color: 'yValue',
})
```

Each row retains the aggregate input fields and adds semantic `xValue` and
`yValue`, normalized centers and endpoints, the cell `value`, its outer-group
total, the grand total, and direct lineage. `mosaicX` transposes the policy:
y-category totals determine row heights and x values compose within each row.
Use `xOrder` and `yOrder` to make categorical ordering explicit. Duplicate
x/y pairs throw; aggregate them first with `groupBy`.

## Waterfall intervals

`waterfall` turns signed contributions into ordered cumulative intervals. It
does not derive the contributions themselves, so analytical intent remains
visible beside the chart:

```ts
import { barY, delta, rollingWindow } from '@tanstack/charts'
import { waterfall } from '@tanstack/charts/transform/waterfall'

const changes = rollingWindow(observations, {
  orderBy: 'year',
  size: 2,
  partial: false,
  outputs: { delta: { value: 'price', reduce: delta } },
})

const bridge = waterfall(changes, {
  value: 'delta',
  orderBy: 'year',
  total: true,
})

barY(bridge, {
  x: (row) => (row.kind === 'total' ? 'Total' : row.year),
  y1: 'start',
  y2: 'end',
  color: 'kind',
})
```

Each valid step retains the input row, adds `delta`, `start`, `end`, and an
`increase` or `decrease` kind, and carries one-row direct lineage. Zero is an
increase so it remains available to downstream policy. Nullish and nonfinite
values are omitted. A nonfinite cumulative result throws instead of emitting
invalid geometry.

`total: true` appends one zero-based `total` row for every nonempty group. The
total is a discriminated synthetic row containing only group fields, derived
fields, and aggregate direct lineage; it does not clone an arbitrary last
source row. `by`, `orderBy`, and `order` use the same first-seen grouping and
stable ordering contracts as the other eager transforms. Group output names
cannot collide with waterfall or lineage fields.

## Tidy hierarchy trees

`treeLayout` turns flat path or parent-reference rows into positioned nodes and
links. Import it from its exact optional entry:

```ts
import { treeLayout } from '@tanstack/charts/hierarchy/tree'

const hierarchy = treeLayout(rows, {
  path: 'name',
  delimiter: '.',
  orientation: 'left',
  nodeSize: [1, 1],
})
```

Use `path` and an optional one-character `delimiter` for full semantic paths.
Missing path ancestors are imputed with `data: null` and empty lineage. Use
`id` and `parentId` instead when every node is an explicit row:

```ts
const hierarchy = treeLayout(rows, {
  id: 'id',
  parentId: 'parentId',
})
```

The two input forms are mutually exclusive. IDs must be unique, every
non-root parent must exist, and the rows must form one acyclic hierarchy.
`sort` and `separation` receive immutable `TreeNodeContext` objects with
identity, raw data, depth, height, `internal`/`external` flags, and lineage. Input
order remains the child order when `sort` is omitted.

Path-mode IDs use canonical slash form and `name` is the terminal path segment.
Explicit-parent IDs are opaque, so `name` is the complete authored ID even
when it contains a slash.

Output nodes contain `id`, `parentId`, `name`, nullable `data`, `depth`,
`height`, `internal`, `external`, `x`, `y`, `source`, and `sourceIndexes`.
Each link contains stable source and target IDs, resolved endpoint nodes and
indexes, `x1`, `y1`, `x2`, `y2`, and the target node's raw-row lineage. A link
uses its target ID as its own ID because each non-root tree node has one
incoming link. Endpoint indexes are null when the corresponding path ancestor
was imputed.

`orientation` selects the root anchor: `left` is the default, with `right`,
`top`, and `bottom` also available. `nodeSize` is `[breadth, depth]` in semantic
data-space units. Normal positional scales own responsive projection, so this
eager transform does not depend on final chart bounds. It is uncached; memoize
unchanged hierarchy input with other derived data.

## Static force layouts

`forceLayout` runs a stopped D3 force simulation synchronously and returns
ordinary rows for native marks. Import it from its exact optional entry:

```ts
import { forceLayout } from '@tanstack/charts/network/force'

const graph = forceLayout(nodes, links, {
  nodeKey: 'id',
  source: 'source',
  target: 'target',
  iterations: 300,
  domainPadding: 0.2,
  forces: [
    { type: 'link', distance: 42 },
    { type: 'manyBody', strength: -120 },
    { type: 'center', x: 0, y: 0 },
    { type: 'collide', radius: 9, strength: 0.9 },
    { type: 'x', x: 0, strength: 0.03 },
    { type: 'y', y: 0, strength: 0.03 },
  ],
})
```

The built-in force descriptors are explicit and applied in authored order.
`link` accepts link-row distance and strength channels. `manyBody.strength`,
`collide.radius`, and the `x` and `y` targets and strengths accept node-row
channels. `center` coordinates and `collide.strength` are fixed values. Each
built-in force type may appear at most once.

Named custom factories accept any native D3-compatible force:

```ts
import { forceRadial } from 'd3-force'

const graph = forceLayout(nodes, links, {
  nodeKey: 'id',
  source: 'source',
  target: 'target',
  forces: [
    { type: 'manyBody', strength: -80 },
    {
      type: 'custom',
      name: 'radial',
      create: () => forceRadial(120, 0, 0).strength(0.08),
    },
  ],
})
```

`create` receives one `ForceFactoryContext` with the private mutable node and
link clones, immutable resolved endpoint-key arrays, and a `nodeKey` accessor
compatible with `d3.forceLink().id(...)`. The factory must return a D3 `Force`.
The working-clone types reserve D3's simulation fields; valid numeric node
seeds are retained, while conflicting source fields cannot leak into D3 state.
Names are nonempty and unique across custom and built-in forces. Factories may
configure or close over the private records, but must not add, remove, or
reorder them. The transform validates collection identity and final finite
coordinates.

The transform clones its inputs before D3 mutates simulation state. Output
nodes retain non-reserved source fields and add `x`, `y`, `vx`, `vy`, `source`,
and `sourceIndexes`. Output links retain their raw endpoint keys and add
resolved node references, source and target indexes, `x1`, `y1`, `x2`, `y2`,
`sourceRows`, and `sourceIndexes`. The result also contains `xDomain` and
`yDomain` for configured positional scales.

Node keys must be unique, and every link endpoint must match one. Stable input
and deterministic force factories produce repeatable static settlement. The
simulation remains stopped and ticks synchronously; a custom force does not
gain a timer or live-state ownership. The transform is eager, chart-size
independent, and uncached; memoize it with other derived data when a framework
component rebuilds unchanged input.

This API does not run a live simulation or own drag state. Products that need
continuous physics or node dragging should keep that controller and its
positions in application state, then render the current rows through normal
marks.

## Lineage

Aggregations expose `source` and `sourceIndexes`. Row-extending transforms
expose the source rows used for that derived value. This supports inspection,
tooltips, drill-down, and subsequent transforms without renderer knowledge.

Lineage is direct to the immediate input. In a `fold` → `normalize` pipeline,
the normalized row points to its folded input, and that folded row points to
the original source row. `select` returns the chosen input rows unchanged.

See [Transforms and Reactivity](../guides/transforms-and-reactivity.md) for
composition and memoization guidance.

## Types

Value and grouping contracts are `TransformAccessor`,
`TransformAccessorContext`, `TransformField`, `TransformValue`,
`TransformValueOutput`, `TransformKey`, `TransformGroupSpec`,
`TransformGroupRow`, `TransformOrder`, `TransformOrderOptions`, and
`TransformLineage`.

Reducer contracts are `TransformNumericReducer`, `TransformReducer`,
`TransformReduceContext`, `TransformOutputSpec`, `TransformOutputs`,
`TransformOutputValue`, and `TransformOutputRow`.

Group exports are `GroupByOptions` and `GroupByDatum`. Numeric bin exports are
`BinOptions`, `BinXDatum`, and `BinYDatum`. Two-dimensional bin exports are
`BinXYOptions` and `BinXYDatum`. Calendar bin exports are `TimeIntervalLike`,
`BinTimeOptions`, and `BinTimeDatum`.

Fold exports are `FoldField`, `FoldOutputNames`, `FoldOptions`, and
`FoldDatum`.

Rolling exports are `RollingWindowOptions`, `RollingWindowDatum`, and `RollingWindowAnchor`.
Cumulative exports are `CumulativeOptions` and `CumulativeDatum`. Rank exports
are `RankOptions`, `RankDatum`, and `RankTies`.

Normalization exports are `NormalizeOptions`, `NormalizeDatum`,
`NormalizeBasis`, and `NormalizeContext`. Selection exports are
`SelectOptions`, `SelectMethod`, and `SelectContext`. Row-stack exports are
`StackRowsXOptions`, `StackRowsXDatum`, `StackRowsYOptions`, and
`StackRowsYDatum`.

Mosaic exports are `MosaicOptions`, `MosaicXDatum`, and `MosaicYDatum`.

Waterfall exports are `WaterfallKind`, `WaterfallOptions`, `WaterfallDatum`,
`WaterfallStepDatum`, and `WaterfallTotalDatum`.

Static force-layout exports are `forceLayout`, `ForceLayoutOptions`,
`ForceDescriptor`, `ForceNumericValue`, `ForceLinkDescriptor`,
`ForceManyBodyDescriptor`, `ForceCenterDescriptor`, `ForceCollideDescriptor`,
`ForceXDescriptor`, `ForceYDescriptor`, `ForceFactoryDescriptor`,
`ForceFactory`, `ForceFactoryContext`, `ForceLayoutWorkingNode`,
`ForceLayoutWorkingLink`, `ForceLayoutResult`, `ForceLayoutNode`,
`ForceLayoutLink`, and `ForceLinkLineage`.

Tidy-tree exports are `treeLayout`, `TreeOrientation`, `TreeNodeContext`,
`TreeNodeComparator`, `TreeNodeSeparation`, `TreeLayoutPathOptions`,
`TreeLayoutParentOptions`, `TreeLayoutOptions`, `TreeLayoutNode`,
`TreeLayoutLink`, and `TreeLayoutResult`.
