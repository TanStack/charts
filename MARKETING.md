# TanStack Charts Marketing Strategy

Last updated: 2026-07-28

## Status

TanStack Charts is currently an unpublished, private `0.0.0` package proof in a
public repository. Until the production gates in [`PLAN.md`](./PLAN.md) are
complete, marketing should invite people to explore the proof, follow
development, or join early access. It should not imply that the packages are
ready for production installation.

## Executive summary

TanStack Charts should not be marketed as another catalog of chart types. Its
opening is the missing middle between high-level chart libraries and assembling
an application charting system from D3 or low-level primitives.

**Positioning:**

> TanStack Charts is a D3-native visualization grammar for product-grade web
> applications.

**Memorable expression:**

> D3's power. A chart library's ergonomics.

**Primary promise:**

> Build charts that can grow with your product without outgrowing your chart
> library.

TanStack Charts lets teams retain D3's algorithms and expressive ceiling while
TanStack owns responsive layout, scene compilation, default SVG and opt-in
Canvas rendering, SSR and hydration, themes, accessibility, interaction,
animation, export, and framework lifecycle.

## Product overview

**One-line description:** A lightweight TypeScript visualization grammar for
responsive, accessible, server-rendered application charts, powered by native
D3 primitives.

**Product category:** TypeScript visualization grammar; application charting
library.

**Product type:** MIT-licensed open-source developer library, subject to final
distribution decisions.

**Core model:** Marks consume application data directly. Channels describe
visual encodings. D3 supplies algorithms. TanStack compiles the definition into
a renderer-neutral keyed scene and owns the application runtime around it.

**Framework position:** The core is framework-independent. React and Octane are
thin adapters, not separate chart implementations.

**Lineage:** Observable Plot is the primary conceptual inspiration for the
marks-and-channels grammar. TanStack Charts is an independent implementation,
not a Plot fork or compatibility layer. Credit this lineage plainly rather than
presenting the compositional model as a TanStack invention.

## Target audience

### Ideal teams

- Frontend teams building analytics, monitoring, reporting, or data-rich
  product features.
- Design-system and platform teams standardizing charts across applications.
- Teams whose charts begin as common line, bar, area, or scatter plots but
  accumulate product-specific requirements.
- Teams already comfortable making explicit decisions about data domains,
  scales, and visual encodings.
- Teams that need responsive layout, dark mode, SSR, accessibility, live
  updates, interaction, or export as part of the application contract.

### Primary users

| Persona                    | Cares about                                               | Current problem                                           | Value promised                                                                    |
| -------------------------- | --------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Frontend engineer          | Shipping a polished feature without owning a chart engine | Catalog APIs become awkward as requirements become custom | One grammar from common charts to bespoke product visualization                   |
| Staff or platform engineer | Stable architecture, performance, and reuse               | Teams accumulate unrelated chart wrappers and conventions | Framework-neutral definitions, thin adapters, explicit extension contracts        |
| Design-system engineer     | Consistency, themes, accessibility, responsive behavior   | Every product team solves chart presentation differently  | Shared defaults, theme tokens, automatic guide layout, keyboard behavior          |
| Technical lead             | Delivery risk and long-term maintainability               | D3 is flexible but expensive to operationalize            | Native D3 algorithms with lifecycle, rendering, testing, and integration supplied |

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

- Give an application D3-level visual flexibility without building its chart
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

### Native D3 ownership

Authors supply native D3 scales, curves, bins, stacks, layouts, and other
algorithms. TanStack does not ask teams to relearn a parallel mathematical
system or wait for a fixed chart catalog to expose an upstream D3 capability.

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

Marks, renderers, interaction helpers, export, and specialized D3 algorithms
are independently imported. There is no global module registry or
side-effectful feature installation.

## Competitive landscape

### Positioning map

| Alternative                                                                                                                                                                                                   | Best at                                                                   | TanStack Charts position                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Recharts](https://recharts.github.io/en-US/) and [Nivo](https://nivo.rocks/)                                                                                                                                 | Quickly producing standard React charts                                   | A framework-independent grammar that can continue into bespoke visualization                                                                                           |
| [visx](https://github.com/airbnb/visx) and raw D3                                                                                                                                                             | Maximum low-level visual control                                          | Native D3 power with responsive layout, guides, rendering, interaction, accessibility, SSR, and lifecycle supplied                                                     |
| [Observable Plot](https://observablehq.com/plot/)                                                                                                                                                             | Concise exploratory visualization through composable marks and channels   | The primary conceptual inspiration; an independent implementation for typed application code, explicit D3 ownership, framework lifecycle, and capability-level imports |
| [Chart.js](https://www.chartjs.org/) and [Apache ECharts](https://echarts.apache.org/en/index.html)                                                                                                           | Broad catalogs and Canvas-oriented rendering                              | Smaller in the current like-for-like consumer benchmark, SVG by default with opt-in Canvas, composable, and designed for product-specific charts                       |
| [uPlot](https://github.com/leeoniya/uPlot), [Chartist](https://chartist.dev/), [Frappe Charts](https://github.com/frappe/charts), and [Lightweight Charts](https://github.com/tradingview/lightweight-charts) | Deliberately small or specialized charting surfaces                       | Competitive in the small-bundle class with a broader grammar; TanStack should claim capability-scaled size, not absolute size leadership                               |
| [AG Charts](https://www.ag-grid.com/charts/)                                                                                                                                                                  | Enterprise breadth, specialized charts, dense data, controls, and support | Open grammar, D3 interoperability, actual SVG SSR, heterogeneous layers, and no global registry                                                                        |
| [Vega and Vega-Lite](https://vega.github.io/)                                                                                                                                                                 | Portable declarative specifications and analysis tooling                  | Ordinary TypeScript and application integration instead of a JSON visualization runtime                                                                                |

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

**Eyebrow:** TanStack Charts

**Headline:** D3's power. A chart library's ergonomics.

**Body:** TanStack Charts is a lightweight TypeScript visualization grammar for
responsive, accessible, server-rendered charts, deeply inspired by Observable
Plot. Compose marks over your existing data, bring native D3 scales and curves,
and render the same definition in React, vanilla JavaScript, or Octane.

**Primary CTA today:** Explore the proof

**Secondary CTA today:** Follow development

**Primary CTA after release:** Build your first chart

**Secondary CTA after release:** Explore examples

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

#### Bring D3. Do not relearn it.

Use native D3 scales, curves, bins, stacks, and layouts. TanStack owns the
application runtime, not a second implementation of visualization math.

#### Built for applications, not screenshots.

Container responsiveness, automatic guide margins, light and dark themes,
keyboard interaction, tooltips, keyed SVG updates, opt-in Canvas painting, SVG
SSR, hydration, and export are part of the runtime.

#### Pay only for what you import.

Marks, renderers, interaction helpers, and D3 capabilities are independently
importable and tree-shakeable.

### Demonstration section

**Headline:** One definition. No customization cliff.

The flagship demonstration should evolve one chart in place:

1. Render a normal line chart.
2. Add an area, baseline, and event data from separate arrays.
3. Add a product-specific custom mark.
4. Make the definition responsive to its container.
5. Render the same definition through React, Canvas, server SVG, and export.
6. Show the resulting bundle trace.

This demonstration expresses the product thesis better than a gallery of
unrelated chart thumbnails.

### Proof section

**Headline:** Complete charts around 18–22 KiB gzip.

The durable public claim is:

> Complete tested charts are approximately 18–22 KiB gzip. A static SVG line
> is 13.30 KiB gzip. Consumers pay for the capabilities they import.

Do not lead with the 4.70 KiB custom-scale scene. It proves the scene compiler
has a low isolated cost when an application supplies its own scale, but it is
not a complete rendered chart.

#### TanStack consumer boundaries

| Consumer surface                              |       Gzip size | Evidence status                                         |
| --------------------------------------------- | --------------: | ------------------------------------------------------- |
| Custom-scale line scene, no renderer          |        4.70 KiB | Exact byte lock; not a complete chart                   |
| D3-scale line with static SVG                 |       13.30 KiB | Exact byte lock                                         |
| Mounted basic line, bar, area, or scatter     | 18.08–18.79 KiB | Checked four-chart comparison baseline                  |
| Mounted chart with legend and pointer tooltip | 18.37–19.08 KiB | Checked four-chart comparison baseline                  |
| Advanced two-series composition               | 18.38–21.26 KiB | Checked four-chart comparison baseline                  |
| React line consumer, with React externalized  |       19.49 KiB | Exact byte lock                                         |
| TanStack Stats parity surface                 |       30.68 KiB | Isolated measurement under a 30.9 KiB capability budget |

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
| TanStack Charts            | 18.08–18.79 KiB | 18.37–19.08 KiB | 18.38–21.26 KiB |
| Chart.js                   |      2.47–2.76× |      2.85–3.13× |      2.68–2.85× |
| Observable Plot            |      4.54–5.04× |      4.47–4.95× |      4.31–4.54× |
| Recharts, React external   |      5.05–5.33× |      5.75–5.89× |      5.13–5.89× |
| Recharts, full cold bundle |      8.14–8.55× |      8.81–9.06× |      7.88–9.07× |
| Apache ECharts             |      8.37–8.74× |      8.96–9.33× |      8.15–9.08× |

Competitor cells are competitor gzip divided by TanStack gzip, ranged across
the matched line, bar, area, and scatter fixtures. Across every matched fixture
in this controlled suite, TanStack shipped 60–89% less gzipped JavaScript.

This supports “substantially smaller than the measured mainstream libraries.”
It does not support “smaller than every popular charting library.” Highcharts,
ApexCharts, Nivo, Victory, visx, and Plotly are not yet in the controlled
matrix. Visx is the most important modular challenger to measure next.

#### Small-library screen

The following is a dated exploratory screen, not launch-proof evidence. It used
the same minified, tree-shaken browser ESM build target, included required CSS
for Chartist and uPlot, and produced identical output across five builds.

| Library and fixture                   | Gzip size | Marketing interpretation                                   |
| ------------------------------------- | --------: | ---------------------------------------------------------- |
| Chartist 1.5.0 basic line             |  9.99 KiB | Smaller, with a deliberately narrower behavior surface     |
| TanStack Charts basic line            | 18.26 KiB | Same complete basic fixture used by the controlled suite   |
| Frappe Charts 1.6.2 line              | 18.41 KiB | Effectively the same size class                            |
| TanStack Charts interactive line      | 18.55 KiB | Includes legend and pointer tooltip                        |
| uPlot 1.6.32 time-series line and CSS | 23.46 KiB | TanStack interactive line is approximately 21% smaller     |
| Lightweight Charts 5.2.0 line         | 52.29 KiB | Specialized financial surface; not a generic feature match |

Environment: esbuild 0.27.7 from the locked workspace, browser ESM targeting
ES2022, Node `gzipSync`, Node 24.15.0 on macOS arm64, measured 2026-07-28. Move
these fixtures into the canonical harness before using the table in public
copy.

#### Evidence maturity

Internal bundle control is strong: eight ordinary TanStack consumers are exact
minified and gzip byte locks, optional capabilities have isolated ceilings, and
the current local checks reproduce those locks. Comparative stability is not
ready for an unqualified public superlative:

- the small-library fixtures are not yet in the canonical matrix;
- the comparison builds workspace source rather than packed production
  packages;
- the toolchain and compression environment are not pinned at full-version
  granularity;
- the GitHub workflow has not completed successfully because organization
  policy requires third-party Actions to use full commit SHAs;
- there is not yet longitudinal CI history.

Before launch, pin the workflow Actions and exact toolchain, measure packed
artifacts, add the small-library fixtures, exact-lock the named public claim
consumers, and publish versioned JSON and Markdown results from CI.

Every published number must link to the
[`comparison protocol`](./benchmarks/comparison/README.md),
[`bundle baseline`](./benchmarks/comparison/bundle-baseline.json), and exact
fixture source. Do not turn the measurements into an unqualified multiple or
imply that bundle size alone represents product quality.

Additional proof:

- Complete SVG SSR and client hydration adoption.
- React, vanilla, and Octane adapters over the same scene and runtime.
- Typed arbitrary-data channels and heterogeneous mark data.
- Public custom-mark contract used by built-in marks.
- Automatic guide margins based on formatted content and measured fonts.
- A TanStack Stats migration with documented API friction and parity evidence.

### Final CTA

**Headline:** Build charts that grow with your product.

**Body:** Keep your data, bring the D3 primitives you trust, and let TanStack
handle the application runtime around them.

**CTA today:** Explore TanStack Charts

**CTA after release:** Build your first chart

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

| Objection                                                             | Response                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit domains and scales are more work than a chart-type component | Correct. TanStack Charts targets teams that want semantic control and a higher customization ceiling. Recipes and tooling should make the common policies obvious without hiding them behind runtime inference.                                                                                                                                                                          |
| The chart catalog is smaller than AG Charts, ECharts, or Nivo         | Also correct. The product thesis is a composable grammar with direct D3 interoperability, not first-party ownership of every specialized chart type.                                                                                                                                                                                                                                     |
| Why not use D3 or visx directly?                                      | They provide the algorithms or primitives. TanStack supplies the application runtime: responsive layout, guides, scene compilation, lifecycle, interaction, accessibility, SSR, hydration, animation, and export.                                                                                                                                                                        |
| Why not use Observable Plot?                                          | Plot is the primary conceptual inspiration and remains an excellent choice for concise exploratory visualization. TanStack is an independent implementation focused on typed application integration, explicit D3 policy, capability-level imports, framework lifecycle, and stable interactive scenes.                                                                                  |
| Is it ready for production?                                           | Not yet. The current package is a private proof with documented release gates. Marketing must state that plainly until those gates close.                                                                                                                                                                                                                                                |
| Can it handle millions of live points?                                | Canvas is an explicit opt-in and keeps the same definition and interaction API while removing per-mark DOM cost. It still creates scene nodes and interaction points, default focus is linear without a spatial index, and overplotting does not become useful because the pixels are cheaper. Treat million-point streaming as a measured representation problem, not a renderer claim. |

## Anti-personas

TanStack Charts is not currently the best choice for teams that:

- Need dozens of specialized finance, map, hierarchy, flow, polar, or gauge
  chart types immediately.
- Need proven million-point streaming throughput, built-in downsampling, or a
  GPU rendering pipeline.
- Want a no-code dashboard builder.
- Need a portable JSON visualization specification.
- Want a library to infer every domain, scale, and chart decision.
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

**Pull:** One grammar from common to custom, direct D3 interoperability,
existing-data input, SVG SSR, responsive application behavior, and
capability-level imports.

**Habit:** Existing charts already work; the team knows the incumbent API;
standard chart catalogs have more examples and integrations.

**Anxiety:** TanStack Charts is new, has a smaller catalog, requires explicit
scale policy, and has not yet established compatibility, support, or production
history.

Marketing should answer anxiety with migration guides, real application case
studies, stable API commitments, reproducible benchmarks, and honest release
gates.

## Messaging and language

### Phrases to use

- D3-native visualization grammar
- Product-grade application charts
- One grammar from common to custom
- Keep your existing data
- Actual SVG SSR and hydration
- Native D3 scales and curves
- Framework-independent engine
- Thin framework adapters
- Lightweight and capability-scaled
- Complete chart consumers around 18–22 KiB gzip, with the benchmark link
- Pay only for what you import
- Built for applications, not screenshots
- No customization cliff
- Deeply inspired by Observable Plot
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

- Conversion: Explore the proof, follow development, or join early access.
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
- Packed-consumer tests.
- A green, fully pinned bundle-comparison workflow and published result
  artifacts.
- Remaining Plot-backed animated export migration.
- Accessibility, locale, and RTL release gates.
- Public package, versioning, license packaging, and compatibility policy.

## Goals

**Primary business goal:** Establish TanStack Charts as the default chart
foundation for data-rich TanStack applications and a credible choice for
frontend teams whose visualizations need to grow beyond standard chart types.

**Primary conversion today:** Explore the proof or join early access.

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

- Public package names and release sequence.
- Whether early access uses a waitlist, discussion thread, or prerelease npm
  channel.
- Which TanStack product becomes the launch case study.
- Compatibility and support policy.
- The minimum chart and interaction profile required for stable release.
- When CI-backed packed-artifact evidence is strong enough to use “tiny”
  without weakening the evidence-led positioning.
- Which customer phrases emerge from early-adopter interviews and should
  replace the proposed language in this document.
