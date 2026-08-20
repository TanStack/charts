---
title: AI Authoring
description: Give coding agents a deterministic route from a visualization goal to typed TanStack Charts code, validation, and advanced extension.
---

TanStack Charts uses a small grammar so an agent can reason from data and
intent instead of selecting a monolithic chart component. The safest authoring
path is explicit and repeatable.

## Choose code or Chart JSON

Ask for TypeScript when the result must include application callbacks,
framework composition, or custom renderer code. Ask for Chart JSON when the
application should validate and interpret a model's output. Give the model the
fixed schema; see [Chart JSON](../reference/json-interchange.md).

## The authoring sequence

1. State the analytical question in one sentence.
2. Identify each field's semantic type: quantitative, temporal, ordinal, or
   identifier.
3. Choose the smallest mark composition that answers the question.
4. Choose compact scales for common positional and categorical color channels.
5. Decide which preparation belongs in application code, D3, SQL, or a server.
6. Add accessible labeling and the default focus/tooltip behavior.
7. Verify a static scene before adding animation or interaction.
8. Add custom behavior only at a documented extension boundary.

Start at [Choosing a Chart](./choosing-a-chart.md), then use the relevant
[example family](../examples/index.md).

## Canonical sources

Use one documentation owner for each decision:

- grammar and channel semantics:
  [Grammar of Graphics](../concepts/grammar-of-graphics.md);
- compact scales and D3 upgrade ownership:
  [Scales](../concepts/scales-and-d3.md);
- responsive layout:
  [Responsive Charts](./responsive-charts.md);
- focus and tooltip behavior:
  [Tooltips and Focus](./tooltips-and-focus.md);
- large-data representation:
  [Large Data](./large-data.md);
- exact signatures and options:
  [API Reference](../reference/index.md);
- fixed Chart JSON schema and interpreter:
  [Chart JSON](../reference/json-interchange.md).

Do not reconstruct an API from an example when the reference owns the
signature. Do not restate D3 behavior when the D3 bridge links to its
authoritative documentation.

## Choose the smallest scale

Use this order before adding `d3-scale`:

| Semantic need                                        | First choice                      |
| ---------------------------------------------------- | --------------------------------- |
| Numeric two-stop axis                                | `@tanstack/charts/scales/linear`  |
| Categorical intervals such as bars                   | `@tanstack/charts/scales/band`    |
| Categorical positions such as dots                   | `@tanstack/charts/scales/point`   |
| Categorical colors                                   | `@tanstack/charts/scales/ordinal` |
| Time, UTC, nonlinear, piecewise, or continuous color | Granular `d3-scale` import        |

Pass the compact factory itself when the rendered channels should determine
the domain. Return a configured scale from a zero-argument factory when it
needs padding or another option before inference. Pass an instance when the
domain is application state. Never assign a positional pixel range; Charts
owns the responsive range.

Upgrade only the scale whose semantics exceed the compact subset. For example,
a continuous UTC x axis may use D3 while a numeric y axis remains compact.
Using one D3 scale does not require replacing compact band, point, linear, or
ordinal scales elsewhere in the chart.

## Prefer complete, typed examples

Generated code should include:

- every import and its exact subpath;
- the datum and captured application-value interfaces;
- scale construction;
- a complete chart definition;
- complete adapter or host usage;
- a meaningful `ariaLabel`;
- stable inferred or explicit identity;
- empty and constant-domain policies when applicable.

For a compact chart, import exact `@tanstack/charts/scales/*` entries and do not
add `d3-scale` or `@types/d3-scale`. If an advanced scale requires D3, declare
the granular runtime and matching type package as direct application
dependencies and state which missing compact capability required the upgrade.

It should not require readers to invent undeclared variables, hidden imports,
casts, or CSS needed for correctness.

## Use the public boundary

Allowed building blocks are public package exports and documented external
modules. Never import a private source file because it appears convenient in
the repository.

If the requested result cannot be expressed:

1. Try built-in mark composition.
2. Use a public custom mark.
3. Use a custom focus strategy, spatial index, or SVG renderer when that is the
   actual missing boundary.
4. Reduce any remaining gap to a small failing example and record the API
   friction.

Do not hide a missing capability behind `any`, double casts, or manual DOM
mutation.

## Validate generated work

Run, in order:

1. Type checking with no unexpected suppression.
2. A deterministic scene assertion.
3. A browser interaction test when the chart is interactive.
4. Light and dark visual checks.
5. A narrow production bundle measurement when a new capability is imported.

For compact-scale work, verify that the bundle retains the selected family but
not `d3-scale`, `d3-format`, `d3-interpolate`, or sibling compact families.

For changing charts, also test reorder, resize, empty data, replacement data,
and a burst that must settle on the latest definition.

## Request template

Use this structure when asking an agent to build a chart:

```text
Question:
Data shape and semantic field types:
Required encodings:
Interaction and selection:
Responsive container:
Accessibility summary:
Expected update behavior:
Bundle constraints:
Acceptance checks:
```

When information is missing, choose documented defaults for presentation.
Ask before inventing analytical semantics, aggregations, or selection behavior
that would change the meaning of the data.

## Skills boundary

Data exploration, chart recommendation, anomaly investigation, and iterative
analysis belong in agent skills. The runtime remains a small deterministic
rendering library.

Skills should route back to these canonical pages and official data-tool
documentation. They should add problem-solving procedures and validation, not
copy the API reference into another source of truth.
