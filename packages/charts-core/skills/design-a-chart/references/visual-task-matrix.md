# Visual Task Matrix

Use the first row that matches the reader's decision. Then inspect row grain, units, denominators, missing values, ordering, and uncertainty before choosing TanStack Charts primitives.

| Reader task                      | Data requirement                                      | First form                                           | TanStack Charts strategy                                           | Verify                                      | Avoid                                           |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------- |
| Follow change                    | Ordered temporal or ordinal x; one or more quantities | Line                                                 | `lineY`; add `areaY` only for meaningful magnitude or interval     | order, gaps, series identity, time grain    | connecting unordered categories                 |
| Compare discrete periods         | Ordered periods with independent totals               | Bars                                                 | `barY` or `barX`; preserve zero when length carries magnitude      | baseline, period completeness               | line continuity when periods are not continuous |
| Rank categories                  | Named categories and one quantity                     | Sorted horizontal bars or dots                       | sort rows before `barX` or `dot`                                   | ties, zero, negative values, visible labels | wedges or bubbles for close values              |
| Compare two values per category  | Two measures with the same unit and category grain    | Dumbbell or slopegraph                               | `dot` plus `link`/`lineY`; grouped bars when absolute zero matters | direction, common scale                     | dual axes                                       |
| Show progress to target          | Actual, target, and directionality                    | Bar/dot plus target rule                             | primary mark plus `ruleX`/`ruleY`; annotate variance               | target period and unit                      | gauge decoration without scale context          |
| Explain a KPI change             | Current value plus contributing categories or stages  | Ranked contribution bars, waterfall, or before/after | `waterfall`, `barX`, `link`, annotations                           | contributions reconcile to total            | unexplained single headline number              |
| Inspect a relationship           | Two quantitative variables; optional group            | Scatterplot                                          | `dot`; use regression or density only when it answers the question | scale shape, outliers, overplotting         | implying causation                              |
| Show a third quantity            | Two positions plus non-negative magnitude             | Bubble scatterplot                                   | `dot` with an area-preserving radius scale                         | radius represents area; legend exists       | mapping signed values to radius                 |
| Inspect one distribution         | Raw observations or honest bins                       | Histogram or ECDF                                    | `binX` plus bars; cumulative transform plus line                   | bin sensitivity, sample size                | only mean and standard deviation                |
| Compare distributions            | Raw observations by group                             | Box, violin, ridgeline, or facets                    | first-party composite marks; retain source lineage                 | sample size, outliers, common scale         | overlapping filled densities without legibility |
| Show uncertainty                 | Estimate with lower/upper endpoints                   | Interval, error bar, range area                      | `areaY`, ranged rect/bar, links/rules                              | interval meaning and confidence level       | treating interval endpoints as separate series  |
| Show observed plus forecast      | Ordered history, boundary, projection, uncertainty    | Solid history, differentiated forecast, interval     | layered `lineY`, `areaY`, boundary annotation                      | status remains clear without color          | one continuous unqualified line                 |
| Show composition over categories | Components and total                                  | Stacked bars                                         | `barY` with `stack()` or inferred stack                            | totals, negative policy, layer order        | comparing interior layers precisely             |
| Show changing composition        | Ordered x, component values                           | Stacked area or normalized stack                     | `areaY` with stacking/normalization                                | missing series and denominator              | interpreting proportions as volume              |
| Show two categorical dimensions  | Counts or values by two categories                    | Mosaic or heatmap                                    | mosaic transform/mark or `rect` cells                              | marginal totals and empty cells             | arbitrary area without labels                   |
| Show a matrix                    | Two categorical/ordinal dimensions and cell value     | Heatmap                                              | `rect` with x/y intervals or bands and color scale                 | color domain, missing versus zero           | rainbow scales for ordered values               |
| Repeat a comparison              | Same question across groups                           | Facets                                               | facet or named views sharing semantic domains                      | panel order, shared domains, smallest panel | one legend or axis whose scope is unclear       |
| Show topology                    | Nodes and edges where connection is the question      | Node-link or adjacency matrix                        | force/link primitives or prepared matrix                           | disconnected nodes, direction, edge meaning | node-link for very dense graphs                 |
| Show flow                        | Weighted source-target stages                         | Sankey                                               | first-party Sankey layout                                          | conservation, cycles, dropped nodes         | using width when values do not reconcile        |
| Show hierarchy                   | Parent-child structure and quantity                   | Treemap, sunburst, or tree                           | first-party hierarchy primitives                                   | root policy, negative values, label fit     | implying area precision for small leaves        |
| Show geography                   | Coordinates or regions tied to a spatial question     | Map                                                  | `geo` primitives with explicit projection                          | projection, missing regions, spatial unit   | maps when rank is the actual task               |
| Show density                     | Many points where individual identity is not required | Hexbin, contour, or raster density                   | first-party spatial layouts using final bounds                     | bin/bandwidth sensitivity                   | raw points that saturate the surface            |
| Navigate or edit a range         | Ordered scale and accepted application state          | Chart plus semantic control                          | `brushX`, `zoomX`, `handleX`, or application control               | keyboard path, cancellation, clamping       | pointer-only transparent overlays               |

## Metric Checks

| Metric kind        | Carry with it                           | Failure to prevent                          |
| ------------------ | --------------------------------------- | ------------------------------------------- |
| Count              | eligibility and time window             | comparing unequal exposure                  |
| Rate or percentage | numerator and denominator               | small-base volatility and Simpson's paradox |
| Average            | sample count and distribution shape     | hiding skew or mixture changes              |
| Index              | base period and formula                 | treating an index as an absolute unit       |
| Currency           | currency, real/nominal basis, period    | mixing units or inflation bases             |
| Duration           | start/stop rules and censoring          | treating incomplete intervals as zero       |
| Forecast           | cutoff, horizon, model status, interval | presenting estimates as observations        |
| Target             | owner, period, direction, reset policy  | comparing actuals to a stale target         |
| Cumulative value   | reset boundary and flow/stock meaning   | interpreting a stock as period change       |

## Recommendation Policy

When the requested form conflicts with the task:

1. State the mismatch in one sentence.
2. Recommend the form that supports the decision.
3. Preserve the user's requested form only if its semantics remain honest.
4. Make any perceptual limitation explicit in the chart or surrounding explanation.

Source: `docs/guides/choosing-a-chart.md`
