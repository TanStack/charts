# Portable chart definitions

Some users need to communicate a visualization as JSON. A chart definition
currently contains live functions, so it cannot be serialized directly.

The portable format should contain only chart instructions. Data is supplied
when the definition is rendered.

```json
{
  "$schema": "https://tanstack.com/charts/schema/definition-v1.json",
  "definition": {
    "marks": [
      {
        "$call": ["lineY", { "$data": "rows" }, { "x": "date", "y": "value" }]
      }
    ],
    "x": {
      "scale": {
        "$call": [
          "scaleUtc",
          {
            "domain": {
              "$call": ["extent", { "$data": "rows" }, "date"]
            }
          }
        ]
      }
    },
    "y": {
      "scale": { "$call": ["scaleLinear", { "domain": [0, 100] }] },
      "format": {
        "$call": ["formatCurrency", { "currency": "USD" }]
      }
    }
  }
}
```

`defineChartDefinition` validates the spec and resolves calls through the core
registry plus any application extensions:

```tsx
const definition = defineChartDefinition(spec, {
  registry: { formatCurrency },
})

<Chart definition={definition} data={{ rows }} />
```

The definition is created once. `$data` references are resolved from the
current `data` prop, so changing time-series data does not reparse or recreate
the definition.

## Delivery

A definition can travel alone, or a self-contained document can bundle the
same definition and data:

```json
{
  "$schema": "https://tanstack.com/charts/schema/document-v1.json",
  "definition": {},
  "data": {}
}
```

The document is a transport convenience, not a different definition model.
Dashboards—with sources, queries, refresh behavior, layout, and multiple
panels—remain a separate layer.

## Rules and remaining edges

- `{ "$call": [name, ...args] }` and `{ "$data": name }` are reserved nodes.
  Ordinary arrays remain literals, avoiding Mapbox-style literal ambiguity.
- Calls may be nested. Static calls can resolve once; calls depending on data
  resolve during chart construction.
- Registry entries are synchronous, allowlisted contracts. Unknown calls,
  missing data, invalid arguments, and conflicting registrations fail with an
  exact JSON path.
- No code strings, evaluation, or JSON-controlled dynamic imports.
- External data may contain runtime values such as `Date` or typed arrays.
  Bundled document data must use JSON-compatible encodings.
- Formatter and accessor factories can come from the registry. Host effects
  such as navigation or application event handlers stay outside the definition.
- Streaming and incremental data updates are renderer concerns, not definition
  syntax.

Before v1, we should decide whether registry names need namespaces or versions,
and whether responsive definitions need a third reserved node for chart
context such as width, height, or theme.

## Prior art

- [deck.gl JSON](https://deck.gl/docs/api-reference/json/overview) validates the
  application-supplied registry model.
- [Mapbox expressions](https://docs.mapbox.com/style-spec/reference/expressions/)
  validate call-shaped JSON expressions and show why literal arrays must remain
  distinguishable.
- [Vega-Lite data](https://vega.github.io/vega-lite/docs/data.html) supports
  both inline data and named runtime-bound data.
- [Vega's View API](https://vega.github.io/vega/docs/api/view/) and
  [Plotly streaming](https://plotly.com/javascript/streaming/) keep incremental
  data updates separate from the original visualization description.
