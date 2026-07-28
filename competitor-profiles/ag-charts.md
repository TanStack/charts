# AG Charts — Competitor Profile

**URL**: https://www.ag-grid.com/charts/  
**Generated**: 2026-07-26  
**Depth**: focused deep profile  
**Compared product**: TanStack Charts proof

## Executive assessment

AG Charts is a serious direct competitor for production application charts.
It is stronger today on chart breadth, dense and live data, end-user analytical
controls, framework coverage, accessibility validation, documentation,
support, and distribution.

The architectural overlap is much lower than the feature overlap. AG Charts is
a Canvas-based catalog configured through chart and series options. TanStack
Charts is a renderer-neutral mark/channel grammar with explicit D3 algorithms,
custom marks, SVG SSR, and thin adapters. They solve many of the same common
jobs from opposite product theses.

The practical conclusion is not to chase AG’s catalog. TanStack Charts needs
to make its different thesis legible and prove the places where that thesis
wins: layered and custom visualisation, D3 interoperability, application
integration, SSR markup, optional weight, Octane, and agent-maintainable code.

## At a glance

| Metric                | AG Charts                                                         |
| --------------------- | ----------------------------------------------------------------- |
| Positioning           | Professional charting for enterprise applications                 |
| Origin                | AG Grid Integrated Charts engine, extracted as standalone in 2020 |
| Current release       | 14.0.2, published 2026-07-22                                      |
| Browser renderer      | HTML Canvas                                                       |
| Core API              | Chart options with typed series objects and field keys            |
| Frameworks            | JavaScript, React, Angular, Vue                                   |
| Community licence     | MIT                                                               |
| Enterprise list price | From $499/developer, perpetual, one year updates/support          |
| Enterprise bundle     | From $1,498/developer with AG Grid Enterprise                     |
| Adoption signal       | 1,626,168 weekly npm downloads; 474 GitHub stars                  |
| Release pace          | Roughly six to eight weeks between recent major/minor releases    |

Adoption metrics are a 2026-07-26 snapshot. npm downloads include more than
unique standalone applications.

## What AG Charts is trying to become

AG Charts began as an answer to AG Grid customers who wanted direct chart
control outside the grid. Its current direction points to five goals:

1. Own the default chart layer for enterprise web applications.
2. Cover most application visualisation needs with first-party series and
   controls instead of requiring composition.
3. Lead on Canvas performance for dense, streaming, and remote data.
4. Monetise specialised charts, advanced interaction, and support.
5. Feed and benefit from a wider embedded-analytics stack: AG Grid below it and
   AG Studio above it.

The company’s move into coding-agent skills makes maintenance workflow part of
the product strategy, not only documentation.

Sources: [launch history](https://blog.ag-grid.com/introducing-ag-charts/),
[Enterprise history](https://blog.ag-grid.com/introducing-ag-charts-enterprise/),
[current positioning](https://www.ag-grid.com/charts/javascript-charts/),
[AG skills](https://www.ag-grid.com/charts/react/skills/), and
[AG Studio](https://www.ag-grid.com/studio/).

## Product model

### AG Charts

```ts
const options = {
  data,
  series: [
    { type: 'bar', xKey: 'month', yKey: 'sales' },
    { type: 'line', xKey: 'month', yKey: 'margin' },
  ],
}

AgCharts.create(options)
```

- The chart type determines the valid option surface.
- Fields are connected through series-specific keys.
- Axes and scales are commonly inferred.
- Themes, formatters, stylers, and callbacks customise the catalog.
- Modules enable features through a global registry.

### TanStack Charts

```ts
const chart = defineChart({
  marks: [
    barY(rows, { x: 'month', y: 'sales' }),
    lineY(rows, { x: 'month', y: 'margin' }),
  ],
  x: { scale: scaleBand(months) },
  y: { scale: scaleLinear().domain([0, maxValue]).nice() },
})
```

- Marks and channels are the stable grammar.
- Different marks can consume different data and datum types.
- D3 owns scales, transforms, curves, and layouts.
- Explicit scales expose semantic policy and avoid a parallel math layer.
- Custom marks and scene nodes preserve an open extension ceiling.
- Imports, rather than a registry, determine capability.

This is the central competitive distinction. AG optimises the path from a known
chart type to a complete component. TanStack optimises the path from data and
visual encodings to a composable application visualisation.

## Overlap

### Direct head-to-head

| Job                                  | AG Charts                          | TanStack Charts proof                           |
| ------------------------------------ | ---------------------------------- | ----------------------------------------------- |
| Line, area, bar, scatter/dot         | Mature catalog                     | Implemented marks                               |
| Combination/layered cartesian charts | Multiple series                    | Native mark composition                         |
| Responsive container charts          | Built in                           | Built in                                        |
| Light/dark themes                    | Themes and CSS colours             | Automatic inheritance and tokens                |
| Tooltips and focus                   | Mature, multiple modes             | Nearest/grouped pointer and keyboard focus      |
| Selection and callbacks              | Built-in state APIs                | Application-facing focus/select bridge          |
| Animation                            | Enterprise module                  | Optional keyed host motion                      |
| Accessibility                        | Keyboard and screen-reader support | Accessible SVG, keyboard focus, author guidance |
| Browser export                       | Raster                             | SVG and raster                                  |
| React                                | Supported                          | Supported                                       |
| Vanilla TypeScript                   | Supported                          | Supported                                       |

This is where evaluation shortlists will compare them directly.

### Similar outcome, different implementation

| Concern       | AG Charts                           | TanStack Charts                                   |
| ------------- | ----------------------------------- | ------------------------------------------------- |
| Modularity    | Registered feature modules          | Static imports and subpath exports                |
| SSR           | Enterprise PNG/JPEG generation      | Complete SVG markup and hydration adoption        |
| Performance   | Canvas, M4, transactions            | Small scene/SVG compiler, keyed reconciliation    |
| Data mapping  | Array-of-object fields              | Arbitrary iterables, fields, accessors, constants |
| Scale policy  | Usually inferred                    | Explicit configured D3 scales                     |
| Customisation | Options, themes, callbacks, stylers | Composition, custom marks, custom renderers       |
| AI workflow   | Upgrade skill; more planned         | Task docs, `llms.txt`, future authoring skills    |

### Little present overlap

- AG’s Financial Charts, maps, gauges, organisation charts, Sankey/chord,
  annotation toolbar, navigator, range controls, and AG Grid integration.
- TanStack’s Octane adapter, renderer-neutral scene protocol, direct D3
  ownership, full SVG SSR/hydration, heterogeneous mark data, and public custom
  mark contract.

## Where AG Charts is stronger

### Breadth and completion

AG markets 30+ chart types and includes specialised finance, map, hierarchy,
flow, range, polar, and gauge products. TanStack’s implemented proof is still a
cartesian grammar with polar, geo, hierarchy, force, contour, brush, drag, and
zoom pending.

### End-user analytical controls

AG ships zoom, navigator, scrollbars, range buttons, crosshairs, annotations,
synchronisation, selection, context menus, active-item state, and update flash.
These are coherent UI features, not just event hooks.

### Dense, live, and remote data

AG claims interactive million-point charts using M4 aggregation, supports
incremental transactions, and now requests visible windows from async data
sources. TanStack has good local 10,000-point measurements but lacks equivalent
browser evidence and downsampling.

Sources: [large datasets](https://www.ag-grid.com/charts/javascript/large-dataset-interactivity/),
[transactions](https://www.ag-grid.com/charts/javascript/transactions/), and
[async data](https://www.ag-grid.com/charts/react/async-data/).

### Framework and ecosystem reach

AG supports React, Angular, Vue, and vanilla JavaScript and has a natural
distribution channel through AG Grid. AG Studio extends it into embedded
analytics. TanStack currently supports React, Octane, and vanilla TypeScript.

### Accessibility maturity

AG documents a concrete keyboard model, page navigation for large series,
screen-reader announcements, and named screen-reader testing. TanStack’s SVG
model is promising, but the proof still needs the visual/accessibility release
gate described in `PLAN.md`.

Source: [AG Charts accessibility](https://www.ag-grid.com/charts/react/accessibility/).

### Commercial assurance

AG sells dedicated engineering support, priority fixes, LTS, and perpetual
licences. That matters to enterprise buyers regardless of API quality.

## Where TanStack Charts can be stronger

### One grammar from common to custom

TanStack can evolve a line chart into a layered statistical or bespoke
visualisation without switching to a second API. AG’s documented public model
remains a catalog of series types. This research found no documented public
custom-series protocol comparable to TanStack custom marks.

That claim should be demonstrated, not merely stated: publish examples that
start common and become meaningfully custom while preserving the same
definition.

### D3 interoperability without hiding ownership

TanStack accepts native D3 scales and curve factories and treats D3 as the
algorithm layer. Teams can use the large D3 ecosystem without waiting for
TanStack to recreate every algorithm. AG’s “no dependencies” claim is useful
for procurement and bundling, but it also means AG owns a very large
proprietary mathematical and rendering surface.

### Arbitrary data and heterogeneous layers

TanStack marks consume the application’s original values and may use unrelated
datum types in one chart. AG supports per-series arrays, but its documented
input contract is still array-of-object data bound through type-specific keys.

### SVG SSR and hydration

TanStack server-renders the actual chart markup and adopts it during hydration.
AG’s “SSR” currently means Enterprise PNG/JPEG generation. The two features
serve different jobs; TanStack has a meaningful advantage for accessible,
inspectable, styleable application HTML.

Source: [AG server-side rendering](https://www.ag-grid.com/charts/react/server-side-rendering/).

### Optional weight without registration

TanStack’s exact imports and subpath exports fit the project charter: unused
marks, renderers, interactions, and D3 capabilities should disappear. AG’s v13
modules improved its bundle story substantially, but require global
registration. A direct identical-consumer bundle comparison is still needed.

### TanStack and Octane integration

First-party Octane support and TanStack Starter distribution are uncontested
paths. They will matter only if the examples and documentation are as polished
as the engine.

## AG weaknesses and openings

These are competitive openings, not claims that AG is a weak product.

1. **Fixed catalog pressure.** Its option types, modules, documentation, and
   Enterprise boundary grow with each series and control. Bespoke graphics can
   fall outside the documented model.
2. **Canvas tradeoffs.** Canvas enables dense rendering but gives up native SVG
   structure, direct DOM inspection, vector browser output, and markup
   hydration.
3. **Paid application essentials.** Zoom, animations, annotations, navigator,
   synchronisation, and server rendering are Enterprise. A permissive TanStack
   implementation could be attractive if those capabilities remain optional
   and composable.
4. **Global module registry.** It improves tree shaking but creates hidden
   bootstrap state and a configuration failure mode that TanStack explicitly
   rejects.
5. **Major-version migration cost.** AG introduced LTS after users reacted to
   significant breaking changes. Its `ag-update` skill directly addresses this
   cost.
6. **Framework gap.** No Octane adapter.

## Threats to TanStack Charts

1. **The free product is already enough for common dashboards.** Community is
   not a crippled demo; it includes the high-frequency transaction path and
   common series.
2. **AG is closing historical gaps quickly.** In seven months it added modules,
   live updates, scrollbars, interaction state, server rendering, selection,
   org charts, async data, richer theming, and broader data types.
3. **AG’s distribution is structural.** Grid users get a natural chart choice,
   and Studio packages the same engine into higher-level analytics.
4. **AI authoring will not remain unique.** AG already publishes an upgrade
   skill and plans more.
5. **Ease-of-use contrast.** AG can produce a finished common chart from a
   series object while TanStack requires explicit domain and scale decisions.
   TanStack’s API-friction log already records this repetition.
6. **Performance perception.** AG has a clear million-point story. TanStack
   should not imply comparable dense-data capability until browser benchmarks
   and downsampling boundaries exist.

## What TanStack should copy

Copy the product lesson, not the architecture.

1. **A concrete keyboard model and test matrix.** Treat accessibility behavior
   as a shipped interaction contract.
2. **State snapshots.** A small serialisable interaction-state contract for
   focus, selection, and zoom can make application coordination easier.
3. **A live-data benchmark and update contract.** Decide whether keyed input is
   enough or whether an optional transaction path is justified by a real
   consumer.
4. **Module-selection guidance.** TanStack does not need a registry, but it can
   generate exact imports for a recipe and show the resulting bundle.
5. **Migration discipline.** Codemods or skills, changelogs, compatibility
   tables, and LTS policy matter once the package ships.
6. **Async-data recipes.** Keep transport out of runtime, but document
   windowed fetching, loading state, cancellation, and downsampling with Router
   and Query.
7. **CSS-variable and RTL validation.** These are production basics, not
   optional polish.

## What TanStack should not copy

1. A `series: [{ type: ... }]` catalog as the primary grammar.
2. A global capability registry.
3. A proprietary scale, shape, transform, and layout ecosystem built to claim
   zero dependencies.
4. Data fetching inside the chart core.
5. A rush into finance, maps, gauges, and annotation toolbars before the core
   grammar and production gates are finished.
6. A dashboard builder or natural-language runtime inside Charts. AG Studio is
   a different product category.

## Recommended product position

> TanStack Charts is the composable TypeScript visualisation grammar for
> application teams and coding agents: D3-native, renderer-neutral, SSR-first,
> tiny by capability, and able to grow from a polished chart into a custom
> visualisation without changing APIs.

Avoid positioning as “AG Charts but smaller” or “a free enterprise chart
catalog.” AG will win that framing today.

## Recommended next work

### Before expanding chart types

1. Finish the existing release gates: visual regression, production-browser
   benchmarks, packed-consumer tests, and published bundle budgets.
2. Build an identical-consumer benchmark against AG Charts Community:
   responsive line, grouped bar, 10k and 1m-point line, keyed streaming update,
   tooltip/focus, React bundle, and initial hydration.
3. Publish one decisive extension example that AG’s documented catalog cannot
   express cleanly.
4. Turn the existing Stats migration into a public “series config to
   marks/channels” comparison.
5. Run agent evaluations on explicit-scale construction. Fix docs or skills
   first; add API only when unrelated tasks repeat the same policy.

### Near-term optional capabilities

1. Resolve selection, brush, zoom, and cross-chart coordination boundaries.
2. Define the large-data contract: app aggregation, optional downsampling
   profile, Canvas renderer, or a combination.
3. Complete locale and RTL decisions.
4. Ship an authoring skill before AG’s skills expand beyond upgrades.

### Explicitly defer

- Financial chart shell and annotation toolbar
- Map catalog
- Gauge catalog
- Dashboard builder
- Built-in transport/data-source runtime

## Decision guide

Choose AG Charts today when the job requires:

- Financial, map, gauge, hierarchy, flow, or organisation charts out of the box
- Million-point Canvas interaction or high-frequency transactions
- Built-in zoom, navigator, annotations, synchronisation, and range controls
- Angular or Vue
- AG Grid integration
- Commercial support

Choose or continue building TanStack Charts when the job values:

- Layered and custom visualisation over a fixed chart catalog
- Native D3 scales, shapes, transforms, and layouts
- Actual SVG SSR and hydration
- Per-capability bundle control without global registration
- Original datum identity and heterogeneous layer data
- React, Octane, and TanStack ecosystem integration
- Code meant to be generated, inspected, and maintained by agents

## Raw data sources

Research notes are in
[`raw/ag-charts/2026-07-26/scrapes`](./raw/ag-charts/2026-07-26/scrapes/).

No DataForSEO or review-site data was used. Adoption signals come from npm and
GitHub; product claims come from AG’s site, documentation, repository, and
release posts.
