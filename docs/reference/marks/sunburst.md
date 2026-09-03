---
title: Sunburst Mark
description: Reference for flat hierarchy input, responsive radial partitioning, node lineage, branch color, and the optional sunburst import.
---

`sunburst` partitions a flat hierarchy into nested angular sectors. It runs
inside `polar`, so ring radii resolve from the final polar layout without
application-owned partition rows or D3 arc generators.

```ts
import { defineChart } from '@tanstack/charts'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import { polar } from '@tanstack/charts/polar'

const chart = defineChart({
  marks: [
    polar({
      startAngle: Math.PI / 2,
      endAngle: Math.PI / 2 - Math.PI * 2,
      marks: [
        sunburst(rows, {
          path: 'name',
          delimiter: '.',
          value: 'size',
          rootId: '/flare/analytics',
          visibleDepth: 2,
          innerRadius: ({ radius }) => radius * 0.14,
          ringPadding: 2,
          color: 'branchId',
          stroke: '#fff',
        }),
      ],
      scales: {
        angle: null,
        radius: null,
      },
    }),
  ],
  scales: {
    x: null,
    y: null,
  },
})
```

The exact `@tanstack/charts/hierarchy/sunburst` subpath keeps hierarchy
construction and partitioning out of root, universal, ordinary polar, and
radial-bar consumers.

## Hierarchy input

Path input constructs parent-child relationships from a string channel:

```ts
sunburst(rows, {
  path: 'name',
  delimiter: '.',
  value: 'size',
})
```

Explicit parent references use `nodeId` because `id` identifies the mark:

```ts
sunburst(rows, {
  id: 'package-sunburst',
  nodeId: 'id',
  parentId: 'parentId',
  value: 'size',
})
```

Path input may omit ancestors. Those structural nodes have `data: null` and
empty direct lineage. Duplicate identities, invalid parents, multiple roots,
and cycles throw before rendering. Source child order is preserved unless
`sort` is supplied.

Path-mode node IDs use the shared hierarchy contract's canonical slash form,
independent of the authored delimiter. The original row and path remain on
`data`; use them when presentation must preserve source spelling. Path-mode
`name` is the terminal path segment. Explicit-parent IDs are opaque, so their
`name` is the complete authored ID even when it contains a slash.

## Options

`SunburstPathOptions<TDatum>` and `SunburstParentOptions<TDatum>` form the
`SunburstOptions<TDatum>` union.

| Option                                        | Type                                                     | Default        | Meaning                                             |
| --------------------------------------------- | -------------------------------------------------------- | -------------- | --------------------------------------------------- |
| `path`                                        | `TransformValue<TDatum, string>`                         | Path mode only | Full hierarchy path                                 |
| `delimiter`                                   | `string`                                                 | `/`            | One-character path separator                        |
| `nodeId`                                      | `TransformValue<TDatum, string>`                         | Parent mode    | Explicit node identity                              |
| `parentId`                                    | `TransformValue<TDatum, string?>`                        | Parent mode    | Explicit parent identity                            |
| `value`                                       | `TransformValue<TDatum, number?>`                        | Required       | Nonnegative contribution aggregated through parents |
| `sort`                                        | `SunburstNodeComparator<TDatum>`                         | Source order   | Sibling comparator over immutable node values       |
| `rootId`                                      | `string`                                                 | Hierarchy root | Node whose children form the first rendered ring    |
| `visibleDepth`                                | `number`                                                 | All depths     | Maximum descendant rings below the active root      |
| `innerRadius`                                 | `PolarLength`                                            | `0`            | Responsive inner edge of the first rendered ring    |
| `outerRadius`                                 | `PolarLength`                                            | Layout radius  | Responsive outer edge of the last rendered ring     |
| `ringPadding`                                 | `number`                                                 | `0`            | Fixed CSS-pixel gap between hierarchy depths        |
| `id`, `className`                             | `string`                                                 | Derived        | Stable mark identity and optional class             |
| `z`                                           | `Channel<SunburstNode<TDatum>, ChartKey?>`               | No group       | Geometry and interaction group                      |
| `color`                                       | `Channel<SunburstNode<TDatum>, ChartKey?>`               | `z`            | Value sent to the chart color scale                 |
| `fill`, `stroke`                              | `VisualChannel<SunburstNode<TDatum>, string>`            | Color / none   | Per-sector paint                                    |
| `fillOpacity`, `strokeOpacity`, `strokeWidth` | `number`                                                 | Renderer value | Sector presentation                                 |
| `strokeDasharray`                             | `string`                                                 | None           | Sector stroke dash pattern                          |
| `opacity`                                     | `number`                                                 | Renderer value | Whole-sector opacity                                |
| `motion`                                      | `ChartMarkMotionOptions<SunburstNode<TDatum>>['motion']` | None           | Per-node motion policy                              |

Nullish values contribute zero. Other values must be finite and nonnegative.
`ringPadding` is a nonnegative pixel value. If padding consumes the available
radial span, the mark omits sectors instead of emitting inverted rings.

## Responsive partition

The enclosing `polar` mark owns the angular sweep and final center. `sunburst`
allocates each node's angle from its aggregate value and divides the resolved
`innerRadius` to `outerRadius` span into equal depth rings. The radius options
accept pixel lengths or responsive callbacks through `PolarLength`. Both
resolved radii must be finite and nonnegative; their order controls the ring
direction.

`ringPadding` remains a fixed pixel gap as the chart resizes. It does not
change the hierarchy values or angular allocation. Sectors replay the shared
renderer-neutral D3 path commands into a sampled interaction polygon, so
rounded, reversed, and complete sectors retain paint-faithful focus geometry.

## Drill-down and motion

`rootId` makes an existing hierarchy node the structural root without changing
its canonical ID or rebuilding source rows. Its children become depth one, and
the root itself is not painted. `visibleDepth` is relative to that root; hidden
descendants still contribute to aggregate values and `internal` metadata.

```ts
const definition = (rootId: string) =>
  defineChart({
    marks: [
      polar({
        marks: [
          sunburst(rows, {
            id: 'package-sunburst',
            path: 'name',
            delimiter: '.',
            value: 'size',
            rootId,
            visibleDepth: 2,
          }),
        ],
        scales: {
          angle: null,
          radius: null,
        },
      }),
    ],
    scales: {
      x: null,
      y: null,
    },
    motion: {
      transition: { type: 'tween', duration: 720, easing: 'ease-in-out' },
    },
  })
```

Rebuild the definition when application navigation changes `rootId`, and mount
it with the optional `motion()` renderer. Retained descendants keep their node
keys. Sunburst motion interpolates each sector's angles and radii, then
regenerates a valid concentric arc around the fixed polar center every frame.
Newly revealed descendants unfold from their nearest disappearing ancestor
sector. During drill-up, removed descendants collapse into their nearest
appearing ancestor. Nodes without an overlapping lineage use the normal enter
or exit opacity transition. The renderer snaps these updates when the user
requests reduced motion.

In path mode, pass the canonical slash ID such as `/flare/analytics`, not the
authored delimiter spelling. Explicit-parent IDs remain opaque.

## Nodes and lineage

The root is structural and is not painted. Every rendered sector carries one
`SunburstNode<TDatum>` with:

- stable `id`, `parentId`, and root-to-parent `ancestorIds`;
- `name`, `depth`, `height`, and `internal` / `external` metadata;
- aggregate `value`;
- `branchId`, equal to the first node below the root for that branch;
- the direct authored `data` row, or `null` for an imputed node; and
- direct `source` and `sourceIndexes` lineage.

`branchId` is useful for inherited branch color: `color: 'branchId'` gives a
top-level branch and all its descendants one color without preparing a color
field. Paint, motion, and sort callbacks receive the same immutable node
values.

## Types

The exact entry exports `sunburst`, `SunburstNode`,
`SunburstNodeComparator`, `SunburstPathOptions`, `SunburstParentOptions`, and
`SunburstOptions`.

See [Polar Marks](./polar.md) for angular sweeps and responsive
`PolarLength` values.
