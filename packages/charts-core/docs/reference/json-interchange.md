---
title: Chart JSON
description: Author, validate, and render the fixed TanStack Charts JSON interchange format.
---

Chart JSON is a callback-free interchange format for common Cartesian and
circular charts. The schema and interpreter ship from `@tanstack/charts/json`.

## Example

```json
{
  "$schema": "https://unpkg.com/@tanstack/charts@0.14.0/schemas/chart.json",
  "chartsVersion": "0.14.0",
  "spec": {
    "marks": [
      {
        "$call": "tanstack.mark.bar-y",
        "data": { "$data": "rows" },
        "x": "category",
        "y": "value"
      }
    ],
    "x": { "scale": { "$call": "tanstack.scale.band" } },
    "y": {
      "scale": { "$call": "tanstack.scale.linear" },
      "nice": true,
      "grid": true
    }
  },
  "data": {
    "rows": [
      { "category": "Alpha", "value": 8 },
      { "category": "Beta", "value": 13 },
      { "category": "Gamma", "value": 5 }
    ]
  },
  "metadata": {
    "title": "Category totals",
    "description": "Values for Alpha, Beta, and Gamma."
  }
}
```

The envelope is closed:

| Property        | Contract                                                        |
| --------------- | --------------------------------------------------------------- |
| `$schema`       | Optional canonical schema URL for the authored `chartsVersion`  |
| `chartsVersion` | Required TanStack Charts SemVer                                 |
| `spec`          | Required marks; Cartesian specs also require `x` and `y` axes   |
| `data`          | Optional named JSON row arrays used by mark `data` references   |
| `metadata`      | Optional `title` and `description` for host-accessible labeling |

There is one envelope. A producer may bundle `data`; a host may supply or
replace it when interpreting the same source.

## Expressions

`$data` reads a named row array. It is valid only as a mark's `data` argument:

```json
{ "$data": "rows" }
```

`$call` invokes one fixed operation. Arguments are sibling properties, not a
nested `args` object:

```json
{
  "$call": "tanstack.mark.line-y",
  "data": { "$data": "rows" },
  "x": {
    "$call": "tanstack.accessor.iso-date",
    "field": "recordedAt"
  },
  "y": "revenue"
}
```

Expression objects are exact. Ordinary expression keys cannot start with `$`.
Objects inside `data` are opaque and may contain reserved-looking keys.

## Fixed operations

The fixed dialect contains 16 operations:

| ID                           | Produces                       |
| ---------------------------- | ------------------------------ |
| `tanstack.accessor.iso-date` | Strict ISO-date field accessor |
| `tanstack.legend.color`      | Categorical color legend       |
| `tanstack.layout.group`      | Grouped interval layout        |
| `tanstack.mark.area-y`       | Vertical area mark             |
| `tanstack.mark.bar-x`        | Horizontal bar mark            |
| `tanstack.mark.bar-y`        | Vertical bar mark              |
| `tanstack.mark.dot`          | Dot mark                       |
| `tanstack.mark.line-y`       | Vertical line mark             |
| `tanstack.mark.pie`          | Pie or donut mark              |
| `tanstack.mark.rule-x`       | Vertical full-plot rule        |
| `tanstack.mark.rule-y`       | Horizontal full-plot rule      |
| `tanstack.mark.text`         | Positioned text labels         |
| `tanstack.scale.band`        | Band scale                     |
| `tanstack.scale.linear`      | Linear scale                   |
| `tanstack.scale.point`       | Point scale                    |
| `tanstack.scale.utc`         | UTC time scale                 |

`chartJsonSchema` is the authoritative contract for each operation's named
arguments and allowed placement. Unknown calls and arguments are rejected.

`rule-x` draws a vertical rule at each x value, while `rule-y` draws a
horizontal rule at each y value. Layer `text` with either rule and supply its
label coordinates as ordinary data. Targets, event dates, and label rows are
prepared data; the operations do not calculate them.

A spec is either Cartesian or circular. A circular spec contains one
`tanstack.mark.pie` mark and omits `x`, `y`, and `guides`; it cannot mix the pie
mark with Cartesian marks. Set `innerRadiusRatio` to `0` for a pie or greater
than `0` and less than `1` for a donut.

## Interpret JSON

```ts
import {
  ChartJsonError,
  chartFromJson,
  chartJsonSchema,
} from '@tanstack/charts/json'
import { createChartScene } from '@tanstack/charts'
import { renderChartSvg } from '@tanstack/charts/svg'

try {
  const definition = chartFromJson(jsonText)
  const scene = createChartScene(definition, { width: 640, height: 400 })
  const svg = renderChartSvg(scene, {
    ariaLabel: definition.metadata?.title ?? 'Chart',
  })
} catch (error) {
  if (error instanceof ChartJsonError) {
    console.error(error.issues)
  } else {
    throw error
  }
}
```

`chartFromJson()` accepts JSON text and returns an ordinary `ChartDefinition`.
It parses, validates, and evaluates the fixed operations synchronously. A
`ChartJsonError` contains structured issues with a stable code and JSON Pointer
path. Its human-readable message is diagnostic text, not a compatibility key.

Host data replaces bundled values with the same name:

```ts
const definition = chartFromJson(jsonText, {
  data: { rows: preparedRows },
})
```

This boundary keeps filtering, joins, database work, and application objects
in host code. The host may also add callbacks and interactions to the returned
definition:

```ts
const parsed = chartFromJson(jsonText, { data: { rows: preparedRows } })
const definition = {
  ...parsed,
  focus: 'nearest-x' as const,
  pointer: true,
  keyboard: true,
}
```

Navigation, mutation handlers, controlled state, portal targets, and custom
renderers are not part of Chart JSON.

## Give the contract to a model

Send `chartJsonSchema` with the analytical question and field meanings. Ask
for one JSON value without Markdown or commentary, and require the schema's
exact `chartsVersion`.

```ts
const modelInput = {
  question: 'Show daily revenue over time.',
  fields: {
    recordedAt: 'ISO 8601 UTC timestamp',
    revenue: 'US dollars',
  },
  schema: chartJsonSchema,
}

const definition = chartFromJson(modelResponseText, {
  data: { rows: revenueRows },
})
```

Structural validation cannot determine whether a chart answers the analytical
question. The receiving application remains responsible for reviewing the
chosen fields, encodings, accessible description, and host behavior.

## Versions

`chartsVersion` follows the `@tanstack/charts` package version. By default,
the reader accepts supported earlier dialect versions and rejects future
versions. Before 1.0, author and reader versions must both use major `0`;
after 1.0, their majors must match.

Use exact matching when the producer and reader must run the same release:

```ts
const definition = chartFromJson(jsonText, { exactVersion: true })
```

The published schema is also available as `chartJsonSchema`; its `$id` is the
immutable release URL.

## Public API

Runtime values are `chartFromJson`, `chartJsonSchema`, `chartJsonVersion`, and
`ChartJsonError`. Public types are `ChartJson`, `ChartJsonDefinition`,
`ChartFromJsonOptions`, `ChartJsonMetadata`, `ChartJsonIssue`,
and `ChartJsonIssueCode`.

## Workbench

Run the editable React workbench:

```sh
pnpm --filter @charts-poc/conformance-example dev
```

Open `http://localhost:5194/json/`. The workbench keeps the last valid preview
after rejected edits and demonstrates host data replacement.
