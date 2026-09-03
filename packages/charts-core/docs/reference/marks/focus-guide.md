---
title: Focus Guide Marks
description: Render datum-bound focus rules, markers, and axis labels with stable renderer-neutral motion.
---

`focusGuideX` and `focusGuideY` render ordinary scene nodes only for the active
focus target. Import them from the exact optional subpath:

For an unsnapped x/y value pair with no datum focus target, use
[`continuousCursor`](../focus-and-interaction.md#continuous-cursor) instead.

```ts
import { focusGuideX } from '@tanstack/charts/focus/guide'

focusGuideX(rows, {
  id: 'cursor',
  x: 'period',
  y: 'value',
  z: 'series',
  key: 'id',
  yRule: {},
  marker: {},
  xLabel: { format: (period) => period },
  yLabel: { format: (value) => String(value) },
  motion: {
    transition: { type: 'spring', stiffness: 240, damping: 22 },
  },
})
```

`focusGuideX` enables the vertical x rule by default. `focusGuideY` enables the
horizontal y rule. Configure both rules on either mark for a crosshair.

```ts
function focusGuideX<TDatum>(
  source: Iterable<TDatum>,
  options: FocusGuideOptions<TDatum>,
): ChartMark<TDatum>

function focusGuideY<TDatum>(
  source: Iterable<TDatum>,
  options: FocusGuideOptions<TDatum>,
): ChartMark<TDatum>
```

## Options

| Option   | Type                                       | Default                | Meaning                                      |
| -------- | ------------------------------------------ | ---------------------- | -------------------------------------------- |
| `id`     | `string`                                   | Layer-derived          | Stable mark and motion owner                 |
| `x`      | `Channel<TDatum, ChartValue?>`             | Required               | Semantic x value and guide position          |
| `y`      | `Channel<TDatum, ChartValue?>`             | Required               | Semantic y value and guide position          |
| `z`      | `Channel<TDatum, ChartKey?>`               | No group               | Series identity retained on guide points     |
| `key`    | `Channel<TDatum, ChartKey>`                | Inferred               | Candidate datum identity                     |
| `match`  | `ChartFocusMatch`                          | `'primary'`            | Focus selection used to choose candidates    |
| `xRule`  | `false \| FocusGuideRuleOptions<TDatum>`   | `{}` for `focusGuideX` | Full-height rule at the focused x coordinate |
| `yRule`  | `false \| FocusGuideRuleOptions<TDatum>`   | `{}` for `focusGuideY` | Full-width rule at the focused y coordinate  |
| `marker` | `false \| FocusGuideMarkerOptions<TDatum>` | Disabled               | Dot at the focused x/y coordinate            |
| `xLabel` | `false \| FocusGuideLabelOptions`          | Disabled               | Label outside the x edge                     |
| `yLabel` | `false \| FocusGuideLabelOptions`          | Disabled               | Label outside the y edge                     |
| `motion` | `ChartMotionDefinition<TDatum>`            | None                   | Enter, retarget, and exit policy             |

Rule options provide `stroke`, `strokeOpacity`, `strokeWidth`,
`strokeDasharray`, and `lineCap`. Marker options provide `radius`, `fill`,
`fillOpacity`, `stroke`, `strokeOpacity`, and `strokeWidth`. Paint and numeric
rule or marker values may be datum visual channels.

Label options provide `format`, `side`, `offset`, `paddingX`, `paddingY`,
`radius`, `background`, `color`, `stroke`, `strokeWidth`, `fontSize`, and
`fontWeight`. A formatter receives the typed semantic value and a
`FocusGuideLabelFormatContext` containing `{ point }`, the active `ChartPoint`
and its original datum reference.

## Focus and motion

Guide candidates participate in scale inference but do not enter
`ChartScene.points`, pointer hit testing, callbacks, or tooltip rows. Focus
resolves the selected candidate under stable structural keys. The first target
enters at its final coordinate, later targets update the same rule, marker, and
label nodes, and clearing focus exits those nodes.

Primary matching uses the original object reference, or the primitive value
plus source position for primitive rows. Candidate ownership is structural;
keys such as `a` and `a:point` remain distinct rather than being interpreted as
a hierarchy.

Static SVG, Canvas, and native surfaces snap to the resolved focus target. The
optional `@tanstack/charts/motion` SVG renderer applies `motion`, preserves
spring velocity through rapid retargets, and handles reduced motion and
teardown. A focus guide composes with the default focus ring; set
`focusRing: false` only when its marker replaces that indicator.

`whenFocused(mark, { retarget: true })` exposes the same structural behavior
for custom compositions. Normal `whenFocused` marks keep their existing
pre-rendered visibility behavior when `retarget` is omitted.
