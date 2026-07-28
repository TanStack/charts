# Portable chart specifications

Some users need to communicate an entire visualization as JSON. TanStack
Charts is close to declarative already, but a chart definition still contains
live functions: marks, accessors, scales, curves, formatters, legends, and
dynamic builders. Those functions cannot be reliably recovered from a runtime
object.

## Proposal

Introduce a versioned portable chart format that compiles into the existing
`ChartDefinition` API. Function values are represented as typed calls resolved
through an explicit registry.

```json
{
  "$schema": "https://tanstack.com/charts/spec/v1",
  "data": {
    "main": [
      { "date": { "$date": "2026-01-01T00:00:00Z" }, "value": 42 }
    ]
  },
  "chart": {
    "marks": [
      {
        "$call": "mark.lineY@1",
        "args": {
          "data": { "$ref": "data.main" },
          "x": "date",
          "y": "value",
          "curve": { "$call": "curve.monotoneX@1" }
        }
      }
    ],
    "x": {
      "scale": {
        "$call": "scale.utc@1",
        "args": {
          "domain": [
            { "$date": "2026-01-01T00:00:00Z" },
            { "$date": "2026-12-31T00:00:00Z" }
          ]
        }
      }
    },
    "y": {
      "scale": {
        "$call": "scale.linear@1",
        "args": { "domain": [0, 100], "nice": 5 }
      }
    }
  }
}
```

The consumer supplies the implementations it permits:

```ts
const definition = hydrateChart(spec, {
  registry: {
    'mark.lineY@1': markLineYEntry,
    'scale.utc@1': utcScaleEntry,
    'scale.linear@1': linearScaleEntry,
    'curve.monotoneX@1': monotoneXEntry,
    'app.formatRevenue@1': revenueFormatterEntry,
  },
})
```

Registry entries would own argument validation and hydration. They should be
stable semantic adapters, not direct lookups of arbitrary JavaScript exports.
For example, `scale.linear@1` could accept `{ domain, nice }` and perform the
necessary D3 calls internally.

## Boundaries

- Portable JSON is the source of truth; arbitrary runtime closures are not
  reverse-serialized.
- Calls are allowlisted. There is no code evaluation or JSON-controlled dynamic
  import.
- Call IDs are namespaced and versioned.
- Dates and other non-JSON values use explicit tagged representations.
- Unknown calls, invalid arguments, and unresolved references fail with an
  exact JSON path.
- Host callbacks such as `onSelect` stay outside the chart spec, or use
  semantic action IDs resolved by the host.

An initial package could cover static charts, field channels, inline and
referenced data, core marks, common scales, standard curves, and formatters.
Dynamic preparation and arbitrary expressions can remain registered
application capabilities until there is evidence for a portable language.

The main correctness test is simple: a portable spec and its equivalent
TypeScript definition should produce identical scenes at several sizes.
