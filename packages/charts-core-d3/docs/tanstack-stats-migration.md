# TanStack Stats migration

> Archived experiment documentation. Use `packages/charts-core/docs` for the
> current D3-native product.

TanStack Stats is the first production parity target. This document separates
renderer capability from Stats product behavior and defines the migration gate.

## Current status

The executable fixtures in `@charts-poc/fixtures` reproduce the generic
rendering surface found in TanStack.com’s `NPMStatsChart.tsx`. A production
canary is also wired in the `codex/tanstack-charts-parity` TanStack.com
worktree. `chartRenderer=charts` selects TanStack Charts while Plot remains the
default and control:

| Stats behavior                          | TanStack Charts proof                                             |
| --------------------------------------- | ----------------------------------------------------------------- |
| Complete and partial multi-series lines | Layered `lineY` marks with solid and dashed strokes               |
| Stacked download area                   | App-computed intervals rendered through `areaY({ y1, y2 })`       |
| Normalized share area                   | App-computed intervals with percentage axis formatting            |
| Streamgraph                             | App-computed wiggle intervals rendered through the same area mark |
| Grouped package bars                    | `barX` or `barY` with stable keys and visual accessors            |
| Stacked package bars                    | Explicit `x1`/`x2` or `y1`/`y2` intervals                         |
| Horizontal and vertical orientation     | Equivalent `barX` and `barY` definitions                          |
| Timeline zoom window                    | Explicit scale domain plus mark clipping                          |
| Responsive axes                         | Definition logic based on measured container width                |
| Gradient fills                          | Opt-in resource-aware SVG renderer                                |
| Series pointer tooltip                  | Opt-in `focusGroupX` or `focusGroupY` grouping                    |
| Dynamic ranking updates                 | Keyed geometry interpolation with enter/update/exit               |
| Light and dark mode                     | Inherited color scheme and CSS chart tokens                       |

These cases have unit coverage and run in the React proof application. Browser
validation covers compact and ordinary containers, both themes, grouped
tooltips, zoom clipping, resource ID isolation, and interrupted animated
updates without blank marks.

The canary reuses the real Stats fetching, package grouping, baseline,
normalization, D3 stack, timeline, legend, embed, and export orchestration. Only
the visualization renderer changes.

Manual browser comparison currently passes:

- line, stacked, normalized area, and stream timelines
- grouped and stacked bars in both orientations
- timeline zoom domain and clipping
- 320px and full-width containers
- light and dark inherited colors
- wrapped external legends
- embed rendering
- bucket changes with all marks present during and after animation
- an enabled SVG, PNG, JPEG, GIF, and WebM export path

The current canary is sufficient to continue production integration, but it is
not yet approval to remove Plot. The remaining gates are automated screenshot
baselines, browser-level pointer and keyboard comparison, decoded export
comparison, native animated export frames, and production route bundle and
timing measurements.

The production build keeps the canary behind a dynamic import, so the default
Plot route pays only 0.47 kB gzip for the renderer switch. The selected Charts
renderer loads a separate 14.56 kB gzip chunk. Removing the Stats route’s
68.98 kB gzip Plot chunk would produce an estimated net route reduction of at
least 53.96 kB gzip; deleting Plot-only application code should improve that
further.

## Required optional capabilities

Stats uses two capabilities that stay out of a basic line-chart bundle:

```tsx
import { focusGroupX, focusGroupY } from '@tanstack/charts/focus'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { Chart } from '@tanstack/react-charts'

;<Chart
  definition={historyChart}
  input={historyInput}
  ariaLabel="Package downloads"
  focus={focusGroupX}
  renderSvg={renderChartSvgWithResources}
  tooltip={{
    formatGroup: (points) => formatStatsTooltip(points),
  }}
  animate={{ duration: 240 }}
/>
```

Use `focusGroupX` for time-series and vertical bars, and `focusGroupY` for horizontal
bars. React and Octane automatically scope gradient and clip IDs per chart.
Vanilla hosts rendering multiple resource-aware charts must provide a unique
`idPrefix`.

The measured full Stats-shaped surface includes both orientations, line and
area marks, UTC scales, gradients, clipping, grouped focus, tooltips, animation,
and the host:

| Consumer                                   |     Gzip |
| ------------------------------------------ | -------: |
| Vanilla Stats parity surface               | 14.03 kB |
| React Stats parity surface, React external | 14.58 kB |

The fixture includes consumer-side sample preparation, so these numbers are a
conservative application boundary rather than only library internals.

## Application-owned behavior

The library should not absorb:

- NPM fetching, request chunking, caching, retries, or partial-result semantics
- package grouping, baselines, indexes, normalization, or URL state
- D3 stack order and offset calculations, including wiggle and expand
- timeline playback controls and range gestures
- rich external legend UI and series visibility state
- copy and embed flows
- GIF and WebM frame orchestration

Those features remain in Stats and produce ordinary chart input. The chart host
exposes `onRender`, grouped focus callbacks, the resolved scene, and the SVG
element for application integration.

Static SVG and raster export are generic library capabilities, but Stats still
owns export composition: resolved application styles, the external legend,
file naming, background policy, animated frames, and video encoding.

## No-regression gate

Migration is approved only after all of the following pass against the real
TanStack.com implementation:

1. Mount the new renderer behind a local comparison switch using the existing
   Stats transformations and product state.
2. Capture old and new charts for every history mode, both bar layouts, both
   orientations, zoomed and unzoomed states, partial data, compact and wide
   containers, and light and dark themes.
3. Compare pointer grouping, keyboard focus, legend toggles, timeline
   interactions, and animated updates, including interrupted updates.
4. Compare SVG, PNG, and JPEG output. Exercise the existing GIF and WebM
   pipeline with frames produced by the new renderer.
5. Record render/update timing and the production route bundle before and after.
6. Remove Observable Plot from the Stats route only when visual, interaction,
   export, performance, and bundle checks are accepted.

Any difference must be classified as an intentional product change, an
application integration gap, or a library defect. Unclassified visual drift is
not parity.
