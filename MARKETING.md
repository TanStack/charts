# TanStack Charts Marketing Strategy

Last updated: 2026-08-09

## Status

The latest public pre-alpha release is TanStack Charts `0.10.0`. Repository docs,
examples, and the catalog follow unreleased `main` and may include contracts not
available in `0.10.0`; documentation at the verified release source revision is
the release record. Marketing must keep that distinction and the pre-alpha
status visible until the gates in [`PLAN.md`](./PLAN.md) are complete.

## Executive summary

TanStack Charts should not be marketed as another catalog of chart types. Its
opening is the missing middle between high-level chart libraries and assembling
an application charting system from D3 or low-level primitives.

**Positioning:**

> TanStack Charts is a composable TypeScript visualization grammar for
> product-grade web applications.

**Memorable expression:**

> Small primitives. A complete application runtime.

**Primary promise:**

> Build charts that can grow with your product without outgrowing your chart
> library.

TanStack Charts combines compact authoring primitives, D3-compatible
boundaries, and an open extension ceiling with responsive layout, scene
compilation, SVG and Canvas rendering, SSR and hydration, themes,
accessibility, interaction, animation, export, and framework lifecycle.

## Product overview

**One-line description:** A lightweight TypeScript visualization grammar for
responsive, accessible, server-rendered application charts.

**Product category:** TypeScript visualization grammar; application charting
library.

**Product type:** MIT-licensed open-source developer library. The current
package line is pre-alpha.

**Core model:** Marks consume application data directly. Channels describe
visual encodings. Compact TanStack primitives and native D3 callables compose
inside the same definition. TanStack compiles it into a renderer-neutral keyed
scene and owns the application runtime around it.

**Framework position:** The core is framework-independent. One
`@tanstack/charts` installation exposes thin adapter subpaths for React, Vue,
Svelte, Solid, Angular, Preact, Lit, Alpine, Octane, and React Native. React and
Octane also have Canvas components over the same runtime.

**Lineage:** TanStack Charts builds on the grammar-of-graphics tradition
established by Leland Wilkinson and developed through ggplot2, Vega-Lite, and
Observable Plot. Plot is the closest API inspiration for mark-local data,
channels, and layered composition. TanStack Charts is an independent
implementation, not a Plot fork or compatibility layer. Credit the broader
lineage and Plot's direct influence rather than presenting the compositional
model as a TanStack invention.

## Target audience

### Ideal teams

- Frontend teams building analytics, monitoring, reporting, or data-rich
  product features.
- Design-system and platform teams standardizing charts across applications.
- Teams whose charts begin as common line, bar, area, or scatter plots but
  accumulate product-specific requirements.
- Teams comfortable choosing scale types and visual encodings while letting
  routine domains derive from mark data.
- Teams that need responsive layout, dark mode, SSR, accessibility, live
  updates, interaction, or export as part of the application contract.

### Primary users

| Persona                    | Cares about                                               | Current problem                                                   | Value promised                                                                     |
| -------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Frontend engineer          | Shipping a polished feature without owning a chart engine | Catalog APIs become awkward as requirements become custom         | One grammar from common charts to bespoke product visualization                    |
| Staff or platform engineer | Stable architecture, performance, and reuse               | Teams accumulate unrelated chart wrappers and conventions         | Framework-neutral definitions, thin adapters, explicit extension contracts         |
| Design-system engineer     | Consistency, themes, accessibility, responsive behavior   | Every product team solves chart presentation differently          | Shared defaults, theme tokens, automatic guide layout, keyboard behavior           |
| Technical lead             | Delivery risk and long-term maintainability               | Low-level primitives are flexible but expensive to operationalize | Composable algorithms with lifecycle, rendering, testing, and integration supplied |

### Primary use case

Build a chart that is part of a product interface, not merely an embedded
report or static graphic.

The ideal chart:

1. Starts as a familiar chart.
2. Gains thresholds, annotations, comparisons, projections, mixed data
   sources, or product-specific marks.
3. Must remain responsive, themeable, accessible, interactive, and
   server-renderable.
4. Should continue using the same data model and authoring grammar as it
   evolves.

### Jobs to be done

- Give an application low-level visual flexibility without building its chart
  runtime from scratch.
- Turn existing application data into product-specific visualizations without
  reshaping it into a library-owned series or dataset model.
- Standardize chart behavior across frameworks and application surfaces.
- Preserve an escape hatch for custom marks and renderers without abandoning
  the common API.

### High-value scenarios

- SaaS product analytics with goals, thresholds, forecasts, and event overlays.
- Operational dashboards with responsive layouts, keyboard inspection, and
  live keyed updates.
- Design systems that need consistent charts without locking every product
  into React components.
- Server-rendered application pages that need actual SVG markup and hydration.
- Product-specific visualizations that combine unrelated data sources in one
  scene.

## The problem

Most chart libraries are easy until the chart stops being standard.

High-level catalog libraries make the first chart quick, but their model is
usually organized around named chart or series types. As product requirements
become less standard, teams work around type-specific options, renderer
boundaries, or framework ownership.

D3 and low-level visualization components preserve control, but leave the
application responsible for layout, rendering, responsiveness, lifecycle,
interactions, accessibility, animation, SSR, export, and cleanup.

Exploratory visualization grammars are expressive and concise, but are not
primarily designed as typed application infrastructure with framework
lifecycle and capability-level bundle ownership.

The cost is duplicated infrastructure, brittle customizations, visual
inconsistency, and eventual migration to a different API when a chart exceeds
the original library's model.

## Differentiation

### One grammar from common to custom

Common constructors such as `lineY`, `barX`, and `dot` use the same mark and
channel grammar as layered visualizations and public custom marks. A chart can
become more specialized without migrating to a second API.

### Composable algorithm ownership

Authors can use compact TanStack scales and row transforms, native D3
callables, or application-prepared rows in the same definition. Scale factories
infer routine domains from mark channels; configured scale instances retain
their fixed domains. TanStack keeps those choices explicit and interoperable
instead of requiring one mathematical implementation or a fixed chart catalog.

### Application runtime included

TanStack owns the work that D3 deliberately leaves to an application:
responsive ranges, automatic guide layout, scene compilation, DOM lifecycle,
keyed SVG reconciliation, Canvas painting, interaction, accessibility, themes,
SSR, hydration, and export.

### Existing data stays intact

Marks consume arrays, objects, tuples, and iterables directly. Different marks
in the same chart may use unrelated data and datum types. Original datum
identity survives interaction and callbacks.

### Framework-independent engine

Definitions, scene calculation, static SVG, the vanilla host, and the optional
Canvas renderer do not depend on React. Framework adapters bind the same host
and scene protocol to their lifecycle.

### Capability-level bundle ownership

Marks, transforms, layouts, renderers, interaction helpers, export, and
optional D3-backed algorithms are independently imported from exact
`@tanstack/charts` subpaths. Framework adapters and compact scales use the same
package without collapsing those module boundaries. There is no global module
registry or side-effectful feature installation.

## Competitive landscape

### Positioning map

| Alternative                                                                                                                                                                                                   | Best at                                                                   | TanStack Charts position                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Recharts](https://recharts.github.io/en-US/) and [Nivo](https://nivo.rocks/)                                                                                                                                 | Quickly producing standard React charts                                   | A framework-independent grammar that can continue into bespoke visualization                                                                                 |
| [visx](https://github.com/airbnb/visx) and raw D3                                                                                                                                                             | Maximum low-level visual control                                          | Composable primitives with responsive layout, guides, rendering, interaction, accessibility, SSR, and lifecycle supplied                                     |
| [Observable Plot](https://observablehq.com/plot/)                                                                                                                                                             | Concise exploratory visualization through composable marks and channels   | The closest API inspiration; an independent implementation for typed application code, explicit algorithm ownership, framework lifecycle, and narrow imports |
| [Chart.js](https://www.chartjs.org/) and [Apache ECharts](https://echarts.apache.org/en/index.html)                                                                                                           | Broad catalogs and Canvas-oriented rendering                              | Smaller in the current like-for-like consumer benchmark, SVG by default with opt-in Canvas, composable, and designed for product-specific charts             |
| [uPlot](https://github.com/leeoniya/uPlot), [Chartist](https://chartist.dev/), [Frappe Charts](https://github.com/frappe/charts), and [Lightweight Charts](https://github.com/tradingview/lightweight-charts) | Deliberately small or specialized charting surfaces                       | Competitive in the small-bundle class with a broader grammar; TanStack should claim capability-scaled size, not absolute size leadership                     |
| [AG Charts](https://www.ag-grid.com/charts/)                                                                                                                                                                  | Enterprise breadth, specialized charts, dense data, controls, and support | Open grammar, D3 interoperability, actual SVG SSR, heterogeneous layers, and no global registry                                                              |
| [Vega and Vega-Lite](https://vega.github.io/)                                                                                                                                                                 | Portable declarative specifications and analysis tooling                  | Ordinary TypeScript and application integration instead of a JSON visualization runtime                                                                      |

### Primary comparisons

Comparison and migration content should be built in this order:

1. TanStack Charts vs. Recharts
2. TanStack Charts vs. visx
3. TanStack Charts vs. Observable Plot
4. TanStack Charts vs. Chart.js
5. TanStack Charts vs. Apache ECharts

AG Charts is important for enterprise evaluations, but it should not define
the launch narrative. Its catalog breadth, dense-data story, analytical
controls, and commercial support are strengths that TanStack should not
pretend to match. See the current
[`competitor-profiles/ag-charts.md`](./competitor-profiles/ag-charts.md).

### Competitive shorthand

> Catalog libraries give you chart types. Low-level libraries give you
> primitives. TanStack Charts gives you a grammar and the runtime required to
> ship it.

## Landing page draft

### Hero

**Headline:** Start with a chart. Keep the same grammar when it gets custom.

**Body:** TanStack Charts is a lightweight TypeScript visualization grammar for
responsive, accessible, server-rendered charts, built on the grammar-of-graphics
tradition and most directly inspired by Observable Plot. Compose marks over your
existing data, choose compact primitives or D3-compatible inputs, and render the
same definition through vanilla TypeScript or adapters for React, Vue, Svelte,
Solid, Angular, Preact, Lit, Alpine, and Octane.

**Primary CTA:** Build your first chart

**Secondary CTA:** Explore examples

### Problem section

**Headline:** Most chart libraries are easy until your chart stops being
standard.

**Body:** Catalog libraries get the first chart on screen quickly, but product
requirements rarely stop there. D3 gives you complete control, but leaves your
team responsible for layout, rendering, lifecycle, interaction,
accessibility, and framework integration. TanStack Charts gives you one
composable grammar from the common case to the custom one.

### Value section

#### Start with a line. End wherever the product needs.

Layer bars, areas, rules, dots, text, and custom marks without migrating to a
different API.

#### Your data already has a shape. Keep it.

Marks consume your arrays, objects, tuples, and iterables directly. Different
layers can even use different datum types.

#### Bring the algorithm that fits.

Use compact scales and row transforms for common work, native D3 callables when
their fuller semantics matter, or prepared rows from application code. TanStack
owns the chart runtime and keeps those inputs composable.

#### Built for applications, not screenshots.

Container responsiveness, automatic guide margins, light and dark themes,
keyboard interaction, tooltips, keyed SVG updates, opt-in Canvas painting, SVG
SSR, hydration, and export are part of the runtime.

#### Pay only for what you import.

Marks, transforms, layouts, renderers, and interaction helpers are independently
importable and tree-shakeable.

### Demonstration section

**Headline:** One definition. No customization cliff.

The flagship demonstration should evolve one chart in place:

1. Render a normal line chart.
2. Add an area, baseline, and event data from separate arrays.
3. Add a product-specific custom mark.
4. Make the definition responsive to its container.
5. Render the same definition through a framework adapter, the vanilla host,
   Canvas, server SVG, and export.
6. Show the resulting bundle trace.

This demonstration expresses the product thesis better than a gallery of
unrelated chart thumbnails.

### Proof section

**Headline:** Complete charts around 24–29 KiB gzip.

The durable public claim is:

> Complete tested charts are approximately 24–29 KiB gzip. A static SVG line
> is 14.54 KiB gzip. Consumers pay for the capabilities they import.

Do not lead with the 5.82 KiB custom-scale scene. It proves the scene compiler
has a low isolated cost when an application supplies its own scale, but it is
not a complete rendered chart.

#### TanStack consumer boundaries

| Consumer surface                                        |            Gzip size | Evidence status                                          |
| ------------------------------------------------------- | -------------------: | -------------------------------------------------------- |
| Custom-scale line scene, no renderer                    |             5.82 KiB | Exact byte lock; not a complete chart                    |
| D3-scale line with static SVG                           |            14.54 KiB | Exact byte lock                                          |
| Mounted basic line, bar, area, or scatter               |      23.68–24.70 KiB | Checked four-chart comparison baseline                   |
| Mounted chart with legend and pointer tooltip           |      25.27–25.92 KiB | Checked four-chart comparison baseline                   |
| Advanced two-series composition                         |      25.27–28.06 KiB | Checked four-chart comparison baseline                   |
| React line consumer, D3 scales, React externalized      | 21,281 B / 20.78 KiB | Exact byte lock                                          |
| React line consumer, compact scales, React externalized | 14,227 B / 13.89 KiB | Exact byte lock                                          |
| TanStack Stats parity surface                           |            35.35 KiB | Isolated measurement under a 35.45 KiB capability budget |

The exact ordinary-consumer locks live in
[`universal-baseline.json`](./benchmarks/bundle-size/universal-baseline.json).
The isolated feature ceilings and their policy live in
[`measure-bundles.mjs`](./scripts/measure-bundles.mjs).

#### Popular general-purpose libraries

The controlled suite covers five libraries, four chart families, and three
capability tiers. Basic means one series with axes and grid. Interactive adds a
legend and pointer tooltip. Advanced adds two-series smoothing, stacking, or
variable point size.

| Gzip comparison            |           Basic |     Interactive |        Advanced |
| -------------------------- | --------------: | --------------: | --------------: |
| TanStack Charts            | 23.68–24.70 KiB | 25.27–25.92 KiB | 25.27–28.06 KiB |
| Chart.js                   |      1.89–2.12× |      2.07–2.29× |      2.02–2.08× |
| Observable Plot            |      3.45–3.87× |      3.29–3.63× |      3.23–3.30× |
| Recharts, React external   |      3.85–4.07× |      4.24–4.30× |      3.89–4.29× |
| Recharts, full cold bundle |      6.20–6.53× |      6.49–6.61× |      5.97–6.60× |
| Apache ECharts             |      6.37–6.72× |      6.60–6.83× |      6.17–6.60× |

Competitor cells are competitor gzip divided by TanStack gzip, ranged across
the matched line, bar, area, and scatter fixtures. Across every matched fixture
in this controlled suite, TanStack shipped 47–85% less gzipped JavaScript.

This supports “substantially smaller than the measured mainstream libraries.”
It does not support “smaller than every popular charting library.” Highcharts,
ApexCharts, Nivo, Victory, visx, and Plotly are not yet in the controlled
matrix. Visx is the most important modular challenger to measure next.

#### Evidence maturity

Internal bundle control is strong: ten ordinary TanStack consumers are exact
minified and gzip byte locks, optional capabilities have isolated ceilings, and
CI reproduces those locks. Comparative stability is not ready for an
unqualified public superlative:

- the small-library fixtures are not yet in the canonical matrix;
- the comparison builds workspace source rather than packed production
  packages;
- there is not yet longitudinal CI history.

Before broad marketing, measure packed artifacts, add the small-library
fixtures, and publish release-linked JSON and Markdown results from CI.

Every published number must link to the
[`comparison protocol`](./benchmarks/comparison/README.md),
[`bundle baseline`](./benchmarks/comparison/bundle-baseline.json), and exact
fixture source. Do not turn the measurements into an unqualified multiple or
imply that bundle size alone represents product quality.

Additional proof:

- Complete SVG SSR and client hydration adoption.
- Nine framework adapters and the vanilla host over the same scene and runtime.
- Definition-owned focus, tooltip, keyboard, and animation behavior, with
  adapter-native tooltip body composition.
- Scale-domain and stable-key inference with explicit overrides.
- Faceting, declarative transforms, polar coordinates, and geographic
  projections through the same mark-and-channel grammar.
- 100 catalog cases with complete authored-source accounting and pinned dataset
  provenance.
- Typed arbitrary-data channels and heterogeneous mark data.
- Public custom-mark contract used by built-in marks.
- Automatic guide margins based on formatted content and measured fonts.
- A TanStack Stats migration with documented API friction and parity evidence.

### Final CTA

**Headline:** Build charts that grow with your product.

**Body:** Keep your data, compose the primitives you need, and let TanStack
handle the application runtime around them.

**CTA:** Build your first chart

## Go-to-market

Developer libraries are marketed through proof rather than adjectives.

### Flagship assets

1. **Common-to-custom interactive demo.** Show one chart growing without an
   API migration.
2. **TanStack Stats migration case study.** Document parity, bundle impact,
   SSR, interaction behavior, API friction, and remaining limitations.
3. **Reproducible comparison page.** Publish identical line, bar, area, and
   scatter consumers across mainstream libraries and small specialists with
   the benchmark methodology and output.
4. **SSR and hydration demo.** Show actual server SVG, hydration adoption, and
   export from one definition.
5. **Data and composition demo.** Layer unrelated data types and preserve
   original datum identity through tooltips and selection.

### Distribution

- Ship real TanStack product surfaces with Charts before a broad launch.
- Publish examples for TanStack Start and React.
- Use the TanStack community, documentation, release notes, and technical
  writing as the primary distribution channels.
- Invite chart-heavy TanStack users into an early-adopter program.
- Turn real early-adopter problems into recipes, migration guides, and
  product proof.

### Search and content themes

- React charts with SSR
- D3 React chart library
- TypeScript visualization grammar
- Custom React charts
- Accessible SVG charts
- Responsive application charts
- Recharts alternative
- visx alternative
- Observable Plot for applications
- Chart library without a customization ceiling

### AI and agent positioning

Disclose that TanStack Charts was implemented almost entirely with AI coding
agents under Tanner Linsley's personal direction and review. Tanner defined the
product, architecture, API, constraints, tradeoffs, and final decisions. Do not
describe the library as designed by AI or autonomously built.

This is a transparent account of how the implementation was produced, not the
main marketing wedge. Agent-ready, task-oriented documentation remains
supporting proof. The useful product claim is that agents generate and maintain
ordinary TypeScript through the same public API as humans. Avoid generic claims
about being "AI-native."

## Objections

| Objection                                                     | Response                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Do I still need to choose scales?                             | Yes. Authors choose a compact or D3-compatible scale and may supply a configured instance when the domain is part of the product contract. Scale factories let TanStack Charts infer routine domains from mark channels.                                                                                                                                                                 |
| The chart catalog is smaller than AG Charts, ECharts, or Nivo | Also correct. The product thesis is a composable grammar with interoperable primitives, not first-party ownership of every specialized chart type.                                                                                                                                                                                                                                       |
| Why not use D3 or visx directly?                              | They provide the algorithms or primitives. TanStack supplies the application runtime: responsive layout, guides, scene compilation, lifecycle, interaction, accessibility, SSR, hydration, animation, and export.                                                                                                                                                                        |
| Why not use Observable Plot?                                  | Plot is the closest API inspiration and remains an excellent choice for concise exploratory visualization. TanStack is an independent implementation focused on typed application integration, composable capability-level imports, framework lifecycle, and stable interactive scenes.                                                                                                  |
| Is it ready for production?                                   | Not yet. `0.10.0` is a public pre-alpha release. Marketing must keep the documented release gates visible until they close.                                                                                                                                                                                                                                                              |
| Can it handle millions of live points?                        | Canvas is an explicit opt-in and keeps the same definition and interaction API while removing per-mark DOM cost. It still creates scene nodes and interaction points, default focus is linear without a spatial index, and overplotting does not become useful because the pixels are cheaper. Treat million-point streaming as a measured representation problem, not a renderer claim. |

## Anti-personas

TanStack Charts is not currently the best choice for teams that:

- Need dozens of specialized finance, map, hierarchy, flow, polar, or gauge
  chart types immediately.
- Need proven million-point streaming throughput, built-in downsampling, or a
  GPU rendering pipeline.
- Want a no-code dashboard builder.
- Need a portable JSON visualization specification.
- Want a library to choose every scale and chart decision.
- Need commercial support, LTS, or contractual response times.
- Have three permanently standard React charts and value the shortest possible
  initial implementation over customization headroom.

Recommend AG Charts or ECharts for specialized breadth and dense data,
Recharts or Nivo for a permanently standard React-only surface, and Vega-Lite
or Observable tooling for declarative analysis workflows.

## Switching dynamics

**Push:** The current chart has exceeded a catalog API; teams are duplicating
wrappers and lifecycle code; SSR or accessibility is incomplete; product
requirements require more than styling a known chart type.

**Pull:** One grammar from common to custom, composable algorithm ownership,
existing-data input, SVG SSR, responsive application behavior, and
capability-level imports.

**Habit:** Existing charts already work; the team knows the incumbent API;
standard chart catalogs have more examples and integrations.

**Anxiety:** TanStack Charts is new, has a smaller catalog, still asks authors
to choose scale types when routine domains can be inferred, and has not yet
established compatibility, support, or production history.

Marketing should answer anxiety with migration guides, real application case
studies, stable API commitments, reproducible benchmarks, and honest release
gates.

## Messaging and language

### Phrases to use

- D3-compatible visualization primitives
- Compact scales and row transforms for common work
- Product-grade application charts
- One grammar from common to custom
- Keep your existing data
- Actual SVG SSR and hydration
- Native D3 scales, curves, layouts, and forces accepted where their contracts fit
- Framework-independent engine
- Thin framework adapters
- Lightweight and capability-scaled
- Complete chart consumers around 24–29 KiB gzip, with the benchmark link
- Pay only for what you import
- Built for applications, not screenshots
- No customization cliff
- Built on the grammar-of-graphics lineage
- An API most directly inspired by Observable Plot
- Independent implementation, not a Plot fork
- Implemented almost entirely with AI under Tanner Linsley's direction

### Phrases to avoid

- The most powerful chart library
- The fastest chart library
- The smallest chart library
- Tiny
- Smaller than every chart library
- A sub-5 KiB chart, when referring to a scene-only fixture
- Every chart type
- D3 without learning D3
- Infinitely customizable
- AI-native charting
- Enterprise-ready
- Production-ready
- Million-point performance
- Zero configuration
- Plot-compatible
- A Plot replacement
- An official Plot implementation
- Based on Plot, without clarifying that the implementation is independent
- Designed by AI
- Autonomously built
- Vibe-coded

### Brand voice

Direct, technical, confident, and evidence-led. Explain architectural
tradeoffs plainly. Prefer working examples and measured claims over adjectives.
Be willing to recommend another library when TanStack Charts is not the right
fit.

## Claim guardrails

Do not claim:

- The broadest chart catalog.
- The easiest basic React chart.
- Million-point or streaming-data leadership.
- A dashboard-builder product.
- Complete D3 capability coverage.
- Renderer breadth beyond the renderers that actually ship.
- Production readiness before the release gates close.
- Bundle advantages without the benchmark protocol, committed baseline,
  compression format, compared consumer scope, and React externalization
  policy.
- Comparisons against specialist libraries before they are in the canonical
  harness and CI.
- “Tiny” as a primary product descriptor before the comparison suite has
  successful CI history.
- A complete-chart size from a scene-only, host-only, or adapter-only fixture.
- Accessibility conformance beyond the tested keyboard and aggregate
  SVG/Canvas behavior.

Every bundle claim should name the capability tier, compression unit, library
version, and whether framework runtimes and required CSS are included. Every
new proof claim should point to a reproducible example, benchmark, test, or
production case study.

## Launch sequence

### Current proof phase

- Conversion: Install `0.10.0`, read its release-source docs, explore the catalog,
  and report friction.
- Publish architecture, benchmarks, and working examples with limitations.
- Recruit a small number of chart-heavy TanStack users.

### Public alpha or beta

- Conversion: Install the prerelease and report friction.
- Publish migration guides and an API stability policy.
- Add packed-consumer, visual regression, accessibility, and browser benchmark
  evidence.

### Stable release

- Conversion: Install TanStack Charts and build the first chart.
- Lead with the common-to-custom demonstration and Stats case study.
- Publish supported environments, compatibility, release policy, and
  production benchmark results.

## Product proof required for broad marketing

Before using "production-ready," complete or explicitly disposition the gaps
tracked in [`PLAN.md`](./PLAN.md):

- Visual regression suite.
- Production-browser benchmark coverage.
- Longitudinal, release-linked bundle-comparison results.
- Remaining Plot-backed animated export migration.
- Accessibility, locale, and RTL release gates.
- Release and compatibility policy.

## Goals

**Primary business goal:** Establish TanStack Charts as the default chart
foundation for data-rich TanStack applications and a credible choice for
frontend teams whose visualizations need to grow beyond standard chart types.

**Primary conversion today:** Install `0.10.0` and complete the first chart.

**Primary conversion after stable release:** Install the package and complete
the first chart.

**Leading indicators:**

- Real TanStack product surfaces migrated.
- Early adopters shipping product-specific charts.
- Successful migrations from Recharts, visx, Observable Plot, or custom D3.
- Repeated use of custom marks and heterogeneous layers.
- Benchmark and example reproductions.
- API friction resolved at the correct layer.

## Open decisions

- Whether early access uses a waitlist, discussion thread, or prerelease npm
  channel.
- Which TanStack product becomes the launch case study.
- Compatibility and support policy.
- The minimum chart and interaction profile required for stable release.
- When CI-backed packed-artifact evidence is strong enough to use “tiny”
  without weakening the evidence-led positioning.
- Which customer phrases emerge from early-adopter interviews and should
  replace the proposed language in this document.
