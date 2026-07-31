# Issue #9 design decisions

Source: https://github.com/TanStack/charts/issues/9

This is the working decision log for reviewing the issue sequentially. Update
it after each feedback item is settled. It records API direction, not an
implementation plan or compatibility promise.

## Review status

1. Background highlight and focused-mark presentation — implemented
2. Gridlines without tick stubs — implemented
3. Responsive axis labels — implemented
4. Fixed tooltip placement — implemented
5. Stacked and grouped bar authoring — implemented
6. General data transforms — implemented

## Implementation audit

### Complexity

- State selection and callback evaluation live in one renderer-neutral scene
  resolver. SVG reconciles the resolved scene; Canvas repaints it and uses its
  existing crossfade path for transitions.
- Stateful scene groups build a prefix index once per focus paint. Point marks
  resolve a node in near-constant time instead of scanning every point for
  every node. This removes the quadratic dense-dot path found during review.
- Pointer movement repaints only when a scene contains inline states. Canvas
  must repaint its base scene when existing marks change or unmatched marks
  fade; that is an intentional cost, not duplicated interaction state.
- The resolver is the largest new runtime unit (315 source lines). Mark files
  only attach typed state metadata; focus resolution remains centralized.

### Duplication

- Bars and both area orientations use one `stackValues` adapter over one D3
  stack engine. The previous outer-transform registration and three repeated
  extent-expansion helpers are gone.
- SVG and Canvas share selectors, callbacks, ordered overrides, reduced-motion
  handling, and transition selection. Their remaining code differs only at
  the paint boundary.
- Native stack authoring removes 90 net lines from the stacked and normalized
  area examples by deleting their tidy-to-wide D3 preparation.

### Bundle size

- Against the compact-scales and opt-in-tooltip `main` baseline, the complete
  core authoring work adds 1.38 kB gzip to a static D3-scale line scene and
  1.37 kB to the equivalent compact-scale scene. A React compact-scale line is
  16.59 kB gzip, up 2.69 kB; the additional host cost covers focus filtering,
  inline state resolution and transitions, and the richer axis model.
- Representative marks add 3.33 kB gzip because that entry exercises the
  state-capable mark metadata plus native stack/group layout. The renderer-
  neutral host remains 10.04 kB, while the SVG DOM host is 14.00 kB and the
  Canvas host is 15.18 kB.
- Tooltip remains opt-in after the merge. The extension adds 3.52 kB gzip to a
  React compact-scale line; portal transport adds another 0.79 kB. Static,
  compact-scale, renderer-neutral, and adapter entries enforce that tooltip and
  portal modules are absent unless selected.
- The committed 12-consumer comparison matrix now spans 26.62-32.17 kB gzip
  for TanStack Charts across line, bar, area, and scatter tiers. Its baseline
  records the exact source revision separately from documentation-only commits.
- Every transform family now has an isolated gzip ceiling and a retained-input
  boundary. Numeric and 2D bins may retain `d3-array`; row stacks may retain
  `d3-shape`; all other families reject those dependencies and every granular
  entry rejects unrelated transform families.
- Static line, compact-scale line, and tooltip kernels also reject transform
  modules. This makes root-export tree shaking a release gate rather than a
  one-time observation.
- Exact universal baselines are refreshed only after the source audit. The
  reviewed ceilings retain narrow headroom, and the full bundle policy remains
  the release gate.

### General transform boundary

- General transforms are eager, pure row-to-row functions. They do not mutate
  mark options, create a hidden transform graph, or own framework reactivity.
- Accessors and reducers use single object arguments. Group dimensions keep
  their names; aggregations retain `source` and `sourceIndexes`; one-to-one
  transforms extend flat input rows.
- `groupBy`, one- and two-dimensional numeric bins, calendar bins, `window`,
  `cumulative`, `rank`, `normalize`, `select`, and row stacks cover the common
  cross-row operations. Ordinary functions are the custom composition escape
  hatch. There is no transform protocol or hidden reactive graph.
- Row stacks and mark stacks share `stackValues`. `stack()`/`group()` remain
  mark-local layout; row transforms are for reusable or inspectable data.
- Root exports remain tree-shakeable, and every transform family also has a
  granular `@tanstack/charts/transform/*` entry point.

### Transform implementation audit

- The complete transform layer is 1,726 source lines across the public value
  and reducer contracts, shared grouping/reduction internals, and ten transform
  families. Four new evidenced families replace repeated application logic;
  the public protocol and nested-row adapters were removed rather than carried
  beside the new model.
- Every transform family has a granular entry point. Numeric, two-dimensional,
  and calendar binning are separate entries so specialized logic does not
  enlarge ordinary histograms. Reducers and grouping mechanics remain shared.
- Field/accessor materialization, named-group identity, grouping, reducer
  preparation, and source lineage are shared. Named reducer inputs are
  evaluated once per source, avoiding a group-by-source rescan. Row stacks call
  the same `stackValues` engine as mark layouts. The obsolete private D3-core
  transform module and its tests are removed, deleting 402 duplicated lines.
- Group, normalize, select, rank, and stack are linear in source rows plus
  emitted output. Numeric bins add threshold construction. Calendar bins bucket
  rows in one pass; two-dimensional bins assign each row once before emitting
  the cell matrix. Window and cumulative work remain proportional to the
  observable reducer windows because custom reducers and exact lineage receive
  every contributing row.
- Eight conformance consumers now use flat named transform results directly,
  removing 60 net source lines and six direct D3 aggregation/rank imports.
- The common transform suite is 16.59 kB minified / 6.16 kB gzip. Individual
  families range from 0.77 kB gzip (`rank`) to 2.89 kB (`binX`); calendar bins
  are 1.30 kB, 2D bins 2.75 kB, and cumulative 1.03 kB. The full
  advanced reducer set is 0.42 kB gzip and is absent unless imported.
- Keeping advanced reducers outside the shared string switch reduced a complete
  histogram from the first-pass 18.75 kB gzip to 18.37 kB on the merged compact
  core, below its 18.7 kB ceiling. The comparable direct-D3 histogram is 17.09
  kB. Retained-input checks prove transform code is absent from locked
  non-transform consumers and that each granular entry keeps only its intended
  family and shared internals.

## 1. Focus presentation

### Decision

Model interaction presentation as ordinary marks filtered by one centralized
chart focus state. Do not create a separate renderer primitive for every
effect such as a point, band, rule, or active bar.

Observable Plot's pointer render transform is the useful precedent: an
interactive transform filters an ordinary mark to the active datum. TanStack
should retain its stronger centralized focus resolution rather than letting
each interactive mark resolve the pointer independently.

A representative API is:

```ts
defineChart({
  focus: 'group-x',
  marks: [
    whenFocused(
      bandX(rows, {
        x: 'date',
        fill: '#94a3b8',
        fillOpacity: 0.16,
        inset: -6,
      }),
      {
        match: 'x',
      },
    ),
    barY(rows, {
      x: 'date',
      y: 'value',
      color: 'category',
    }),
  ],
})
```

The implementation follows this contract:

- one `ChartFocusState` drives tooltips and every focus-filtered mark;
- the state distinguishes the primary point, focused group, input source, and
  pinned state;
- filters can match the primary point, focused group, stable point key, shared
  x value, shared y value, or group;
- ordinary mark order controls whether an effect is before or after other
  marks while axes retain their intended foreground placement;
- full mark data is available for channel and scale inference while the focus
  filter controls the rows rendered in the transient state;
- the hardcoded focus circle becomes an implicit focus-filtered mark;
- custom renderers receive complete interaction state rather than
  `paintFocus(point, points)`;
- SVG and Canvas must share the behavior without DOM mutation as the public
  extension mechanism;
- pointer updates must not rebuild the complete chart scene or repaint
  unrelated base geometry.

### Related work to preserve in the design

- Controlled or programmatic focus for linked charts, legends, and tables.
- Honest separation between semantic points, hit geometry, and presentation
  geometry.
- Keyboard, pointer, pinned, restored, and programmatic focus parity.
- Deterministic composition, non-interactive effect nodes, and transient export
  behavior.
- Facets and non-Cartesian coordinate systems must be supported by the general
  transform contract; Cartesian helpers can remain conveniences.

Specialized helpers such as `focusBandX` can be built later as compositions of
an ordinary mark and the focus filter. They should not define the core model.

Existing marks use inline state styles. This is separate from `whenFocused`:
the former changes presentation on existing geometry, while the latter adds
transient geometry.

```ts
dot(rows, {
  x: 'date',
  y: 'value',
  r: 3,
  states: [
    {
      when: { focus: 'primary' },
      style: {
        r: ({ datum }) => (datum.priority ? 9 : 7),
        fill: ({ point }) => point.color,
      },
      transition: { duration: 140, easing: 'ease-out' },
    },
    {
      when: { focus: 'unmatched' },
      style: { opacity: 0.25 },
    },
  ],
})
```

Callback values receive one object containing `datum`, `index`, `data`,
`point`, `focus`, `pointer`, and `matches`. Later matching states override
earlier properties. State styles cannot change data, channels, keys, layout,
or scale values.

## 2. Axis and grid configuration

### Decision

Use the freedom to make breaking changes. Replace the current flat mixture of
scale behavior and guide presentation with a nested axis model. Keep grid
presentation independent from the axis.

```ts
y: {
  scale: scaleLinear,
  nice: true,
  grid: true,
  axis: {
    line: true,
    ticks: { count: 5, size: 0, padding: 4, format: formatCurrency },
    tickLabels: { rotate: 0 },
    label: {
      text: 'Revenue',
      offset: 'auto',
    },
  },
}
```

The automatic-to-explicit range is:

```ts
// Inferred axis.
y: { scale: scaleLinear }

// Inferred axis plus grid.
y: { scale: scaleLinear, grid: true }

// Labels and grid without tick stubs.
y: {
  scale: scaleLinear,
  grid: true,
  axis: { ticks: { size: 0 } },
}

// Labels and grid without an axis baseline or tick stubs.
y: {
  scale: scaleLinear,
  grid: true,
  axis: {
    line: false,
    ticks: { size: 0 },
  },
}

// Materialized scale without a visible axis.
y: {
  scale: scaleLinear,
  axis: false,
}
```

This replaces:

- `guide` with `axis`;
- `ticks` with `axis.ticks.count`;
- `format` with `axis.ticks.format`;
- `tickRotate` with `axis.tickLabels.rotate`;
- `label` and `labelOffset` with `axis.label`;
- the current coupling between `guide: false` and `grid`.

`axis.ticks.size: 0` should omit tick-stub nodes. Tick padding and automatic
guide margins must use the resolved tick size rather than preserving hidden
four-pixel geometry.

Do not add explicit `axisX()` or `gridY()` guide marks based only on this
feedback. They introduce additional layout, duplication, positioning, and
facet semantics without current task evidence.

## 3. Responsive tick labels

### Decision

Separate semantic tick generation from label layout. Length-aware scales and
axes choose candidate values first. Rotation and thinning then operate as
orthogonal label policies, with thinning enabled by default as the final
readability guarantee.

```ts
x: {
  scale: scaleBand,
  axis: {
    ticks: {
      spacing: 80,
      size: 0,
    },
    tickLabels: {
      rotate: -35,
      thin: {
        minGap: 8,
        priority: 'ends',
        keep: [launchDate],
      },
    },
  },
}
```

The resolution pipeline is:

```text
available axis length
→ requested tick count
→ scale-generated candidate values
→ formatted and rotated label bounds
→ collision thinning
→ automatic guide margins
```

Candidate tick policies are mutually exclusive:

```ts
ticks: {
  spacing: 80
} // length-aware count
ticks: {
  count: 5
} // explicit count hint
ticks: {
  values: importantDates
} // exact candidates
```

The scale owns semantic candidates. A D3 scale may return a different number
than requested to preserve meaningful numeric or calendar intervals. Band
scales normally use their complete domain as the candidate set.

Label policies are independent:

```ts
tickLabels: {} // horizontal and automatically thinned
tickLabels: { rotate: -35 } // rotated and automatically thinned
tickLabels: { thin: false } // every horizontal label
tickLabels: { rotate: -35, thin: false } // every rotated label
tickLabels: false // no labels
```

Automatic rotation is not a default. Rotation changes reading direction and
chart height; authors opt into it. Thinning only prevents unreadable overlap
and remains enabled unless explicitly disabled.

Thinning supports both soft priority and hard retention:

```ts
tickLabels: {
  thin: {
    priority: 'ends',
    keep: [launchDate, migrationDate],
  },
}
```

- `priority` influences the best collision-free subset.
- `keep` guarantees that exact labels render.
- Hard-kept labels are placed first and ordinary colliding labels are removed.
- If hard-kept labels collide with each other, both remain because the author
  explicitly required them.
- Exact kept values are label-only by default; they do not implicitly add a
  tick stub or gridline.

For categorical x axes, first and last candidates receive soft priority by
default. They are not hard-kept when the available length cannot fit both.

Gridlines and tick stubs use the scale-generated candidates before label
thinning. Hiding a label does not remove its stub or gridline. A shorter axis
may still produce fewer gridlines when its length-aware scale generates fewer
candidate ticks.

Responsive scene layout iterates candidate resolution, label measurement,
thinning, and margins until stable. It uses a conservative result if a
threshold oscillates. Font loading and resize relayout may revise the visible
subset without restarting mark animation.

## 4. Tooltip anchoring along an axis

### Decision

Allow each tooltip anchor coordinate to select its source independently.
Avoid combinatorial presets such as `group-top`, `pointer-top`, and
`value-bottom`.

```ts
tooltip: {
  anchor: {
    x: 'value',
    y: 'plot-top',
  },
  placement: 'bottom',
  offset: 12,
}
```

`x: 'value'` maps the primary focus point's semantic `xValue` through the
resolved x scale. For dodged bars, this locates the outer category center
rather than a subgroup center or an average that changes when a series is
missing.

Coordinate sources are axis-specific:

```ts
anchor: {
  x:
    | 'point'
    | 'pointer'
    | 'value'
    | 'group-center'
    | 'plot-left'
    | 'plot-center'
    | 'plot-right',
  y:
    | 'point'
    | 'pointer'
    | 'value'
    | 'group-center'
    | 'plot-top'
    | 'plot-center'
    | 'plot-bottom',
}
```

Existing whole-anchor shorthands such as `point`, `pointer`, and
`group-center` can expand to the corresponding x/y pair.

The full callback remains available and receives complete interaction and
geometry context:

```ts
anchor: (_points, { focus, pointer, plot, surface, scales }) => ({
  x: scales.x.map(focus.primary.xValue),
  y: plot.y,
})
```

Use `plot` for inner plotting bounds rather than the current misleading
`chart` context property. `surface` describes the complete rendered size.

Fallbacks resolve per coordinate:

- an unavailable pointer coordinate falls back to the primary point;
- a non-finite semantic value mapping falls back to the primary point;
- an empty group falls back to the primary point;
- an invalid custom coordinate falls back to the primary point.

## 5. Stacked and grouped mark authoring

### Decision

Treat stacking and grouping as different geometric capabilities. Series
identity may be inferred from appearance after the geometry is known, but an
appearance channel must not select the geometry.

For stackable interval marks, a single value channel represents a length and
is converted to endpoints by an implicit stack transform:

```ts
barY(rows, {
  x: 'date',
  y: 'value',
  color: 'category',
})
```

Explicit endpoints opt out:

```ts
barY(rows, {
  x: 'date',
  y1: 'start',
  y2: 'end',
  color: 'category',
})
```

Stack behavior can be configured in the same layout slot used by grouping:

```ts
barY(rows, {
  x: 'date',
  y: 'value',
  color: 'category',
  layout: stack({
    order: 'input',
    offset: 'normalize',
  }),
})
```

The semantics follow Observable Plot's coherent distinction: `y` is a length,
while `y1` and `y2` are already resolved extents. `color` can infer series
identity, so it implies the default stack at repeated positions. `layout` is
optional unless stack order or offset is configured.

Grouping remains an explicit geometric choice:

```ts
barY(rows, {
  x: 'date',
  y: 'value',
  color: 'category',
  layout: group(),
})
```

The fully explicit form supplies series identity independently:

```ts
barY(rows, {
  x: 'date',
  y: 'value',
  z: 'category',
  color: 'category',
  layout: group(),
})
```

Series resolution obeys these rules:

- explicit `z` wins;
- otherwise, a discrete color channel may infer series identity once the
  geometry is known;
- a continuous color channel cannot infer series identity;
- color alone never switches a mark between stacked and grouped geometry;
- grouping without explicit or inferable series identity is a configuration
  error.

Therefore, supplying only `color` to a stackable interval mark produces
colored stacked intervals. Authors expecting side-by-side intervals must
request grouping explicitly.

Do not expose one generic `layout` option on every mark. Capabilities follow
mark semantics:

- bars support implicit length-to-extent stacking and explicit grouping;
- areas share the reusable stack transform;
- lines use positional values and do not stack by default, although a
  discrete stroke or color may infer the separate paths required to render
  series;
- dots, text, and rules overlap at repeated positions unless an explicit
  displacement transform such as dodge or jitter is used;
- cells and heatmaps use aggregation or binning rather than stacking;
- arcs use a dedicated angular or pie transform.

Computed geometry is part of the transform contract:

- scale domains use computed extents;
- labels and custom renderers can access endpoints and midpoints;
- tooltips receive the original value and computed endpoints;
- focus, legends, and interaction use the resolved series identity;
- transformed points preserve their original datum;
- types expose only the capabilities supported by each mark.
