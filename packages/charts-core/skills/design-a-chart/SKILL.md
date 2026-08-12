---
name: design-a-chart
description: >
  Choose an honest visualization from a user story, metric, comparison,
  projection, target, or explanatory goal before selecting TanStack Charts
  marks. Load whenever a user asks to graph, chart, visualize, compare,
  forecast, project, explain, or communicate data.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/choosing-a-chart.md'
  - 'TanStack/charts:docs/examples/*.md'
  - 'TanStack/charts:docs/reference/transforms.md'
---

# Design a Chart From a User Goal

Use this scenario loop: **trigger → inspect → decide → build → verify**. Do not begin with a chart type, even when the request names one.

## Setup

Turn the request into this brief before writing chart code:

```ts
interface ChartBrief {
  question: string
  decision: string
  observation: string
  metric: { value: string; unit: string; denominator?: string }
  comparison:
    'time' | 'category' | 'distribution' | 'relationship' | 'composition'
  evidence: readonly string[]
}

export const brief: ChartBrief = {
  question:
    'Which acquisition channel improved conversion without losing volume?',
  decision: 'Choose where to increase next-month spend',
  observation: 'one row per channel and month',
  metric: { value: 'conversionRate', unit: '%', denominator: 'sessions' },
  comparison: 'time',
  evidence: ['conversion rate', 'sessions', 'month', 'channel'],
}
```

If the question, observation, unit, denominator, or decision is unknown, inspect the data and surrounding product before choosing marks.

## Core Patterns

### Match the form to the reader's comparison

- Change over ordered time → line; discrete periods → bars.
- Named-category magnitude → sorted horizontal bars or dots.
- Distribution → histogram, ECDF, box, violin, or faceted histograms.
- Relationship → scatterplot; add size only for a meaningful third quantity.
- Composition → stack for totals, normalized stack for proportions, mosaic for two categorical dimensions.
- Flow, hierarchy, network, or spatial questions → use their first-party layouts only when topology is the question.

Read [the visual-task matrix](references/visual-task-matrix.md) for the full routing table.

### Separate observed, target, and projected values

```ts
import { areaY, defineChart, lineY, ruleY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'

const rows = [
  { month: 'Jan', actual: 82, forecast: null, low: null, high: null },
  { month: 'Feb', actual: 91, forecast: null, low: null, high: null },
  { month: 'Mar', actual: null, forecast: 96, low: 88, high: 106 },
  { month: 'Apr', actual: null, forecast: 103, low: 90, high: 119 },
]

export const chart = defineChart({
  marks: [
    areaY(rows, { x: 'month', y1: 'low', y2: 'high', fillOpacity: 0.15 }),
    lineY(rows, { x: 'month', y: 'actual', strokeWidth: 2.5 }),
    lineY(rows, { x: 'month', y: 'forecast', strokeDasharray: '5 4' }),
    ruleY([100], { strokeDasharray: '2 3' }),
  ],
  x: { scale: scalePoint },
  y: { scale: scaleLinear, axis: { label: 'Indexed revenue' } },
})
```

Use different channels for status and uncertainty. A continuous unqualified line implies equal epistemic status.

### Define proof before polish

For every chart, verify:

- the visual answers the stated question;
- axes, legend, title, or adjacent copy identify units and comparison;
- ordering, aggregation, missing-value policy, and baseline are deliberate;
- exact-value tasks have a table or textual equivalent;
- the smallest supported container preserves the important comparison;
- pointer, keyboard, updates, and empty states tell the same story.

## Common Mistakes

### CRITICAL Starting with the requested chart type

Wrong: implement “make this a pie chart” before identifying the comparison.

Correct: restate the decision and recommend the form that makes that comparison perceptually direct. If the user retains a weaker form, state its analytical limitation and preserve the underlying semantics.

A familiar chart can answer a different question than the user needs.

Source: `docs/guides/choosing-a-chart.md`

### HIGH Showing a rate without its denominator

Wrong: show conversion rate alone.

Correct: keep sessions or eligible population in the prepared row and expose it beside the rate or in the tooltip.

Normalized values can reverse interpretation when volume changes.

Source: `API-FRICTION.md` F-217; `docs/reference/transforms.md`

### CRITICAL Rendering projections as observed history

Wrong: connect actuals and forecasts with one undifferentiated line.

Correct: encode the forecast boundary, projected segment, and uncertainty explicitly.

Continuous treatment implies equal certainty.

Source: `docs/examples/lines-and-areas.md`; `docs/reference/marks/difference.md`

### HIGH Choosing area or angle for precise ranking

Wrong: rank close values with wedges, bubbles, or interior stack layers.

Correct: use aligned position or length when exact ordering is the reader's task.

Area and angle emphasize shape or part-to-whole relationships, not precise rank.

Source: `docs/guides/choosing-a-chart.md`; `docs/examples/bars-and-rankings.md`

### HIGH Tension: analytical honesty versus visual simplicity

Simplifying aggregation can hide denominators, lineage, uncertainty, or missing-value policy. Preserve the evidence needed to interpret the result before reducing visual detail.

See also: `prepare-chart-data/SKILL.md` § Common Mistakes

## References

- [Analytical task and visual-form matrix](references/visual-task-matrix.md)

See also: `prepare-chart-data/SKILL.md` and `compose-marks-and-views/SKILL.md` — the analytical task determines both the transform and mark composition.
