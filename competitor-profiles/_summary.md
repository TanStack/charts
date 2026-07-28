# Competitive Landscape Summary

**Generated**: 2026-07-26  
**Your product**: TanStack Charts proof  
**Competitor profiled**: AG Charts

## Bottom line

AG Charts and TanStack Charts overlap heavily on common application-chart
outcomes and lightly on architecture.

AG Charts is a complete Canvas chart product for enterprise applications. It
wins today on catalog breadth, dense/live data, end-user analytical controls,
framework coverage, documentation, support, and installed distribution.

TanStack Charts should win somewhere else: composable marks and channels,
direct D3 ownership, public extension contracts, actual SVG SSR/hydration,
optional weight, Octane, and agent-maintainable application code.

## Side-by-side

| Dimension          | TanStack Charts proof                           | AG Charts 14                                                                   |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Primary goal       | Tiny, composable visualisation grammar          | Complete enterprise chart component                                            |
| Abstraction        | Marks, channels, supplied scales                | Chart options and typed series                                                 |
| Algorithms         | Direct granular D3 packages                     | First-party, no runtime dependencies                                           |
| Browser output     | SVG today; renderer-neutral scene               | Canvas                                                                         |
| Data               | Arbitrary iterables and heterogeneous mark data | Arrays of objects and series keys                                              |
| Scales             | Explicit configured D3 scales                   | Usually inferred proprietary axes/scales                                       |
| Extension          | Custom marks, scales, guides, renderers         | Themes, formatters, stylers; no documented public custom-series protocol found |
| Frameworks         | Vanilla, React, Octane                          | Vanilla, React, Angular, Vue                                                   |
| SSR                | Complete SVG plus hydration adoption            | Enterprise PNG/JPEG generation                                                 |
| Common charts      | Core cartesian marks and facets                 | Mature                                                                         |
| Specialised charts | Mostly pending D3-backed profiles               | 30+ total types                                                                |
| Dense/live data    | 10k local proof; no downsampling claim          | M4, 1m+ claim, transactions, async windows                                     |
| Interaction        | Focus, tooltip, select bridge, motion           | Zoom, navigator, selection, annotations, sync, menus                           |
| Modularity         | Static imports, subpaths, no registry           | Global module registry, up to 45% reduction                                    |
| AI workflow        | Agent docs and planned Intent skills            | Public upgrade skill; more planned                                             |
| Commercial support | Not established in this proof                   | Paid support, LTS, priority fixes                                              |

## Positioning map

**Axes**: fixed catalog → composable grammar; proof breadth → specialised
product breadth.

```text
Specialised product breadth
          high
           │  AG Charts
           │
           │
───────────┼────────────────────────
 catalog   │          grammar
           │                 TanStack Charts
           │                 proof
          low
```

AG occupies the complete catalog and embedded-analytics side. TanStack’s
opening is the high-expression grammar side, provided the production proof is
finished and the common path stays approachable.

## Competitive posture

### Defend

- Common charts must be polished enough that the grammar advantage is visible
  before users hit advanced composition.
- Finish visual, browser-performance, packaging, accessibility, locale, and
  RTL gates.
- Make explicit scales reliable for agents through recipes and skills.

### Differentiate

- Show a common chart becoming custom without an API migration.
- Publish actual SVG SSR/hydration examples.
- Make D3 interoperability and heterogeneous layers obvious.
- Keep optional features absent from bundles by construction.
- Own Octane and TanStack Starter distribution.

### Do not chase

- AG’s finance/map/gauge catalog
- AG Studio’s dashboard-builder category
- A global module registry
- A fixed series-options grammar
- Built-in data transport

## Highest-value follow-up

Build one reproducible AG Charts comparison harness using identical data and
application behavior. Measure browser render/update performance, large-data
behavior, React bundle size, accessibility interaction, and SSR output. The
current research establishes product shape; it does not replace an
apples-to-apples technical benchmark.

Full profile: [AG Charts](./ag-charts.md)
