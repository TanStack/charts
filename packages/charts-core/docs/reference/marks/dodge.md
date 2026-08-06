---
title: Dodge Layouts
description: Reference for responsive dodgeX and dodgeY dot collision layouts, anchors, padding, radii, identity, and scale ownership.
---

`dodgeY` preserves each dot's scaled x position and derives a collision-free y
position in final plot pixels. `dodgeX` transposes the layout: y is preserved
and x is derived.

```ts
import { dodgeY } from '@tanstack/charts/dodge'
import { dot } from '@tanstack/charts/dot'

dot(rows, {
  x: 'value',
  key: 'id',
  r: 4,
  layout: dodgeY({
    anchor: 'middle',
    padding: 1,
  }),
})
```

The layouts are also exported from `@tanstack/charts` and
`@tanstack/charts/universal`.

## Signatures

```ts
function dodgeY(options?: {
  anchor?: 'top' | 'middle' | 'bottom'
  padding?: number
}): DodgeYLayout

function dodgeX(options?: {
  anchor?: 'left' | 'middle' | 'right'
  padding?: number
}): DodgeXLayout
```

`dodgeY` defaults to `bottom`; `dodgeX` defaults to `left`. `padding` is the
empty pixel distance between neighboring circle edges and defaults to `1`.
It must be finite and nonnegative.

The public type surface includes `DodgeOptions`, `DodgeXOptions`,
`DodgeYOptions`, `DodgeXAnchor`, `DodgeYAnchor`, `DodgeXLayout`, and
`DodgeYLayout`.

## Scale ownership

The measured channel remains an ordinary semantic chart value. A `dodgeY`
dot contributes only x scale values, so its chart definition needs an x scale
but no y scale. A `dodgeX` dot needs only a y scale.

```ts
defineChart({
  marks: [
    dot(rows, {
      x: 'economy',
      layout: dodgeY({ anchor: 'middle' }),
    }),
  ],
  x: { scale: scaleLinear().domain([5, 50]) },
})
```

Do not configure the generated channel: `y` with `dodgeY`, or `x` with
`dodgeX`. The generated interaction-point value is the logical anchor while
its `x` and `y` fields contain the actual laid-out pixel center.

## Collision and radius

Collision distance is the sum of both final dot radii and `padding`. Configure
`r` and `rScale` once on `dot`; the layout receives the same resolved radii
used for rendering.

Placement is synchronous and deterministic. Edge anchors choose the nearest
valid inward position. Middle anchors choose the valid position with the
smallest absolute displacement. Fixed-radius rows retain source order;
variable-radius rows are placed largest first with source order as the stable
tie-breaker.

## Identity, facets, and grouping

Every rendered point retains its source datum, source index, key, group,
state, and motion policy. Supply `key` when the measured channel contains
duplicates.

Each facet resolves its child dodge layout against that cell's final scales
and bounds. `z` and `color` affect ordinary dot grouping and paint; they do not
create separate collision lanes. Use facets when groups need independent
swarm bounds.
