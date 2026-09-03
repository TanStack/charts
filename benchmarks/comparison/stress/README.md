# Cross-library stress testing

This suite compares TanStack Charts, Chart.js, Apache ECharts, Recharts, and
Observable Plot under large-data, rapid-update, interaction, resize, dashboard,
and lifecycle pressure.

It answers two different questions:

1. How far can a renderer carry a direct representation before it stops being
   useful?
2. How quickly can it render a sensible representation of a much larger
   source dataset?

Those results stay separate. Rendering one million SVG circles is not treated
as a product goal, and aggregating one million rows into bounded visible marks
is not reported as if only those marks existed.

## Commands

```sh
# Fast local and pull-request coverage
pnpm benchmark:stress:quick

# Normal cross-library investigation
pnpm benchmark:stress:standard

# Largest source counts and longest soaks
pnpm benchmark:stress:full

# Select a profile or narrow the matrix
pnpm benchmark:stress -- --profile=standard
pnpm benchmark:stress -- --profile=quick --library=tanstack,echarts
pnpm benchmark:stress -- --profile=quick --workload=raw-line,pixel-envelope
pnpm benchmark:stress -- --profile=quick --workload=rolling-keyed-window
```

Profiles, source counts, update shapes, output limits, and workload features
are declared in [`workloads.json`](./workloads.json).

Unfiltered results are written to the canonical
`.benchmark-output/stress/results/stress-<profile>.{json,md}` paths. Filtered
runs use deterministic suffixes such as
`stress-quick--libraries-chartjs--workloads-stats-multi-series-line.{json,md}`
so a focused investigation cannot replace the complete profile report. Filter
order does not affect the name, and long filter lists use a bounded digest.
The JSON `filters` metadata records the resolved library and workload filters;
an empty list means that dimension was unfiltered. JSON retains raw samples,
while Markdown is the review summary.

An outer timeout or browser-context infrastructure failure may receive one
immediate retry in a fresh browser context. Renderer, adapter, page, protocol,
and correctness failures are never retried. A recovered retry is recorded in
JSON and in a dedicated Markdown table; it is never silently counted as a
clean first attempt. Both errors from a failed retry are retained in JSON and
Markdown. This absorbs isolated browser stalls without allowing a flaky
correctness defect to pass on a second attempt.

## Workload lanes

| Lane         | Workloads                                                                                           | Purpose                                                          |
| ------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Raw frontier | raw line, raw scatter                                                                               | Find the useful crossover for direct paths and addressable marks |
| Product      | interactive scatter, Stats-shaped multi-series history, rolling keyed window, multi-chart dashboard | Exercise workloads an application could reasonably ship          |
| Encoded      | density, pixel envelope, controlled viewport, histogram, top + Other                                | Keep every source row represented while bounding visible marks   |

Encoded workloads prepare one canonical input and give that same input to
every library. Preparation cost is measured separately from rendering. The
report records source rows, prepared rows, output nodes, and canvas pixels
separately, so data work cannot disappear behind a small output count.
Deterministic source generation and validation-only digest hashing are outside
the preparation timer.

The encoded cases preserve an explicit semantic invariant:

- occupied cells in a fixed density grid account for every row without
  materializing empty marks;
- the line envelope preserves each pixel bucket's first, minimum, maximum, and
  last candidates, including the global extrema;
- histogram bins account for every row;
- top-category rollup retains the leading categories and accounts for the
  remainder as `Other`.

## Measurement boundaries

Each library runs as an independently built, production-minified browser
consumer in Chromium. Timed work excludes module loading and deterministic
source generation.

The suite reports separate phases instead of one ambiguous render number:

- preparation;
- synchronous mount or update work;
- first animation frame;
- fully settled output;
- output complexity;
- controlled numeric-domain updates that isolate viewport rendering from
  gesture-controller policy;
- trusted inactive-to-active tooltip response plus active-to-active state
  changes across a sustained cursor sweep;
- sustained update behavior;
- monotonic rolling-window updates and synchronous latest-wins bursts;
- mount/update/destroy soak behavior.

Update shapes include a true no-op, same-key values, append, replacement,
reorder, controlled viewport, a five-percent keyed-window roll, and resize
where they apply. The viewport case reuses the exact same bounded line geometry
while alternating only the numeric x domain. It measures the renderer's
crop/zoom commit cost; it deliberately does not claim to measure wheel, drag,
brush, or controller semantics. Every library crosses the same frame barriers;
a renderer's own completion signal is an additional requirement where one is
available.

The rolling workload preallocates one deterministic immutable feed outside all
timers. Its 1,000, 5,000, or 10,000-row active window advances by exactly five
percent. Every overlap row must retain object identity, while the renderer
probe must expose the exact ordered key, x, y, series, and category values.
Frame-paced streaming advances monotonically and awaits every returned
operation. The burst scenario synchronously enqueues 16, 48, or 96 revisions,
then awaits the final first frame, final settle, and every superseded operation.
The final output must remain stable through idle frames and an idempotent
replay. TanStack additionally gates exact surviving keyed SVG-node reuse;
physical reuse from other SVG renderers is reported only when observable.

Canvas and SVG output are intentionally reported in their native units. A
canvas with one DOM node is not equivalent to an SVG with one element per
datum.

Every stress adapter also exposes a correctness probe. TanStack inspects its
compiled scene, Chart.js inspects controller metadata and the live scale,
ECharts inspects its current renderer model and projects endpoints into pixel
space, and the SVG libraries inspect serialized marks and path geometry.
Recharts reports its exact live x domain through its public chart-context hook.
Rolling adapters additionally expose renderer-owned logical datum state rather
than trusting the input alone. A cell is rejected if it loses required items,
vertices, datum ownership, numeric endpoints, or output dimensions.

## Gates and interpretation

The run fails on protocol and correctness errors: mismatched prepared inputs,
unaccounted source rows, output-limit violations, missing output, lost extrema,
clipped numeric endpoints, ignored resize dimensions, stale or unchanged
pointer state, page errors, or an operation that never settles. Append retains
the original source prefix and must increase rendered data evidence; update
and streaming inputs are source-accounted independently.

Multi-series output gates exact ordered series identity, stable color
ownership, explicit x-domain changes, and per-series vertex counts. Trusted
pointer checks validate the exact focused x and every series value on the
initial chart and again after reorder, append, and visibility updates. Pointer
activation timing starts only after two consecutive inactive animation frames.

Cross-library timing rank is informational. Browser timing, long tasks, and
retained-memory deltas are meaningful only within the same run, machine, and
browser build.
CI keeps those measurements as artifacts but does not fail a change because
one library moved ahead of another.

The `full` profile is an investigation tool, not a claim that every raw case is
a good visualization. Product and encoded workloads are the primary decision
surface. Raw workloads locate the point where the right fix is less rendering,
not a faster way to draw an unreadable chart.

## CI

Pull requests and pushes run the `quick` profile. The weekly and manually
dispatched workflow runs `standard`. Both run the deterministic workload
invariant tests, gate browser correctness, and archive the complete result.
Run `full` deliberately on stable local hardware when investigating a renderer
frontier or a regression.
