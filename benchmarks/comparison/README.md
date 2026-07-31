# Chart library comparison

This suite compares TanStack Charts, Chart.js, Apache ECharts, Recharts, and
Observable Plot with the same deterministic data across line, bar, area, and
scatter charts.

The public [library comparison](../../docs/comparison.md) uses the same
capability source and tracked bundle baseline. Documentation checks reject
stale matrix cells, package versions, bundle ranges, or competitor links.

## Commands

```sh
# Install the Playwright version's pinned headless browser
pnpm browser:install

# Bundle size and the standard browser matrix
pnpm benchmark

# One side of the comparison
pnpm benchmark:size
pnpm benchmark:perf

# Fast local validation
pnpm benchmark -- --profile=quick

# Maximum point-count stress cases
pnpm benchmark -- --profile=full

# Narrow a run
pnpm benchmark -- --profile=quick --library=tanstack,chartjs --chart=line,bar

# Compare one or more capability tiers
pnpm benchmark -- --tier=basic,interactive
```

Results are written to
`.benchmark-output/results/comparison.{json,md}`. The Markdown report begins
with a generated prose summary of the overall size, timing, output-complexity,
and coverage findings. JSON stores the same paragraphs in `narrativeSummary`
and remains the stable format for history, dashboards, and CI artifacts.

## Stress matrix

The separate [stress suite](./stress) compares the same five libraries under
large-data, rapid-update, interaction, resize, dashboard, and lifecycle
pressure:

```sh
pnpm benchmark:stress:quick
pnpm benchmark:stress:standard
pnpm benchmark:stress:full
```

It keeps direct-rendering frontiers separate from sensible large-data
representations such as density bins, screen-aware line envelopes, histograms,
and top-category rollups. Correctness is gated; cross-library timing rank is
informational.

Bundle output is checked against
[`bundle-baseline.json`](./bundle-baseline.json):

```sh
pnpm benchmark:check
pnpm benchmark:update-baseline
```

Update the baseline only after reviewing the built files and confirming that a
size change is intentional. The check permits 3% or 512 bytes, whichever is
larger. It rejects external package-version or chart/tier matrix drift before
comparing bytes. TanStack workspace releases may advance without rewriting
unchanged measurements; its source revision must exactly match the last commit
that changed core source or a transitive TanStack comparison input;
documentation-only commits do not stale the evidence. It also requires normal
comparison artifacts to contain zero bytes from the stress-probe modules;
optional measurement machinery must disappear through direct build-time
feature gates. It does not gate browser timings because those are
hardware-sensitive. Every check writes
`.benchmark-output/results/bundle-baseline.candidate.json` with all measured
cases. CI uploads that candidate when the baseline fails; a manual workflow run
can request it explicitly. This keeps exact Ubuntu measurements available
without overwriting the tracked baseline or the full comparison report.

## Protocol

Every library and chart type is exercised at three capability tiers:

- `basic`: one series, axes, and grid;
- `interactive`: basic plus a legend and pointer-driven tooltip;
- `advanced`: interactive plus two series and chart-specific composition:
  smoothing for line, stacking for bar and area, and variable point size for
  scatter.

Every case uses:

- an 800×400 chart with deterministic same-shape updates;
- fixed numeric domains, axes, and grid lines;
- stable datum identities where the library supports them;
- device pixel ratio 1 for canvas renderers.

Selection, animation frame completion, and responsive resize are listed in the
report's capability coverage table but are not timed. They need event-driven
protocols with explicit completion conditions. Animations are disabled for all
timed fixtures. Renderer and framework rows describe documented package
boundaries rather than timed behavior.

The chart-specific point counts are defined by profiles in
[`compare-chart-libraries.mjs`](../../scripts/compare-chart-libraries.mjs).
Bars use lower counts because each datum is an independent mark.

Bundle cases are minified ESM browser consumers built independently with
esbuild. Full size includes every cold-page dependency. Incremental size
externalizes React and React DOM for React-first libraries, representing an
application that already ships React. Both gzip and Brotli are recorded.

Browser timing runs in isolated pages. Mount measures the synchronous library
call plus forced layout after module loading. Update measures a same-shape data
change plus forced layout after setup. Paint, network transfer, module parsing,
and animation frames are intentionally excluded. Reported output complexity
includes DOM element count, serialized SVG bytes, and canvas pixels.

Bundle, mount, update, and output-complexity facets each include a normalized
summary followed by raw measurements. Bundle and timing summaries use geometric
means across matching scenarios and report ratios against TanStack Charts.
Output summaries report ranges because SVG element counts and canvas backing
stores are not directly equivalent.

Compare browser timings only from the same machine and browser build. Canvas
and SVG output metrics describe implementation cost; a canvas with one DOM
element is not equivalent to an SVG with one element.

## Extending the matrix

Library adapters live in [`libraries`](./libraries) and implement the small
contract in [`types.ts`](./types.ts). Add the library to the registry in the
runner, pin its version in the root package, implement all four chart exports,
then regenerate and review the bundle baseline.

The scheduled GitHub Actions workflow records all 60 tier/library/chart cases
with the `ci` profile and the `standard` stress profile as JSON and Markdown
artifacts. Pull requests run the deterministic bundle check and the `quick`
stress profile.
