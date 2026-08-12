---
name: update-and-animate-charts
description: >
  Update TanStack Charts through stable definition and datum identity,
  configure SVG motion, and preserve correctness during resize,
  interruption, streaming, and rolling windows. Load for reactive data,
  animation, reordering, enter/exit, or stale interaction state.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/dynamic-data-and-animation.md'
  - 'TanStack/charts:docs/reference/motion.md'
  - 'TanStack/charts:docs/reference/chart-definitions.md'
---

# Update and Animate Charts

Use **trigger → inspect → decide → build → verify**. Definition identity is the application update boundary; mark and datum identities determine what survives it.

## Setup

Create a new definition only when captured data or visual policy changes, then update the host with that definition:

```ts
import { barX, defineChart, mountChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

interface Row {
  id: string
  label: string
  value: number
}

function createRanking(rows: readonly Row[]) {
  const ranked = [...rows].sort((left, right) => right.value - left.value)

  return defineChart({
    svgAnimation: { duration: 280, easing: 'ease-out' },
    marks: [barX(ranked, { id: 'ranking', x: 'value', y: 'label', key: 'id' })],
    x: { scale: scaleLinear, nice: true },
    y: { scale: () => scaleBand<string>().padding(0.1) },
  })
}

const element = document.querySelector<HTMLElement>('#ranking')
if (!element) throw new Error('Missing #ranking')

const firstRows: readonly Row[] = [
  { id: 'core', label: 'Core', value: 82 },
  { id: 'react', label: 'React', value: 74 },
]

const options = {
  definition: createRanking(firstRows),
  height: 280,
  ariaLabel: 'Package ranking',
}

export const host = mountChart(element, options)

export function updateRanking(rows: readonly Row[]) {
  host.update({ ...options, definition: createRanking(rows) })
}
```

Framework adapters use their native memoization primitive around the complete definition.

## Core Patterns

### Stabilize three identities

1. **Definition identity** — stable until captured values change.
2. **Mark `id`** — stable across conditional layers and reorder.
3. **Datum `key`** — stable entity identity, independent of row position or mutable metrics.

Verify that focus, selection, tooltip pinning, and exit motion follow the semantic entity after reorder.

### Choose the smallest motion contract

- `svgAnimation: true` for lightweight keyed SVG tweening.
- `svgAnimation` options for duration, easing, and reduced-motion policy.
- `motion()` renderer only when spring continuity, a timing cascade, or rolling path behavior is part of the product contract.
- No animation for static export, server output, or changes where transition would imply false continuity.

Resize animation defaults off. Keep it off for ordinary observed containers.

### Bound streaming work

Keep source history outside the chart, pass a bounded visible window, preserve keys for retained samples, keep viewport state controlled, and coalesce upstream updates when only the latest state matters.

### Verify interruption, not only endpoints

Apply an update during enter, update, exit, focus motion, resize, and rolling movement. The latest accepted definition must win; focused or selected semantic identity must not jump to another row.

## Common Mistakes

### CRITICAL Creating a fresh definition every render

Wrong: call the definition factory during every unrelated application render.

Correct: keep the definition stable until a captured row or visual-policy value changes; use the framework's native memoization primitive or update it deliberately in a vanilla owner.

Unnecessary identity changes invalidate work and can reset presentation state.

Source: definition-identity migration in `CHANGELOG.md`; `docs/guides/dynamic-data-and-animation.md`

### CRITICAL Keying entities by row position

Wrong:

```ts
barX(rows, { x: 'value', y: 'name', key: (_row, index) => index })
```

Correct:

```ts
barX(rows, { x: 'value', y: 'name', key: 'id' })
```

Insertion, deletion, and reorder retarget geometry, focus, and exit motion when index is identity.

Source: `API-FRICTION.md` F-131, F-239; `docs/guides/dynamic-data-and-animation.md`

### HIGH Animating every responsive resize

Wrong:

```ts
svgAnimation: {
  resize: true
}
```

Correct:

```ts
svgAnimation: true
```

Container observation can repeatedly restart transitions and leave layout behind the actual panel.

Source: `API-FRICTION.md` F-129; `docs/guides/responsive-charts.md`

### HIGH Morphing rolling samples by index

Wrong: key a shifting time window by array index.

Correct: key each observation by stable timestamp or event ID and let removed/added samples exit and enter at the window edges.

Index identity turns old times into different samples instead of preserving retained observations.

Source: `API-FRICTION.md` F-240; `docs/guides/dynamic-data-and-animation.md`

### HIGH Tension: motion continuity versus current-state correctness

Visual continuity cannot make stale state acceptable. Verify rapid retargeting, interrupted exits, active focus, and resize while motion is in flight.

See also: `design-responsive-charts/SKILL.md` and `debug-and-verify-charts/SKILL.md`

See also: `build-chart-interactions/SKILL.md` and `coordinate-charts-with-tanstack/SKILL.md` — stable mark and datum identity preserves controlled interaction across local, synchronized, and optimistic updates.
