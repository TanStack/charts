---
title: Alpine Adapter
description: Mount TanStack Charts with an Alpine directive.
---

```sh
pnpm add @tanstack/charts @tanstack/alpine-charts alpinejs d3-scale
```

```ts
import Alpine from 'alpinejs'
import { charts } from '@tanstack/alpine-charts'

Alpine.plugin(charts)
Alpine.start()
```

```html
<div x-data="{ chartOptions }" x-chart="chartOptions"></div>
```

The directive element owns its contents. Alpine effects forward option changes
to the shared host and directive cleanup destroys the runtime.

## Lifecycle

`charts` registers `x-chart`. The directive evaluates its expression inside an
Alpine effect, creates one shared adapter controller, and forwards each
complete `ChartOptions` value. Cleanup destroys the controller, removes the
surface, and restores the element's prior inline layout and host class.

## Browser-only contract

The directive requires Alpine and normal DOM APIs. It does not prerender a
server shell or provide a hydration path. Start it in the browser after
registering `Alpine.plugin(charts)`.

## Presentation and rendering

The directive element itself becomes `.ts-chart-host`; normal HTML class and
style attributes own its presentation. The `className` chart option applies
to the rendered SVG surface. The package exposes the SVG directive only; use
`renderSvg` to replace SVG serialization without replacing the shared host.

Exports: `charts`, `ChartOptions`, `ChartDefinition`, and `ChartPoint`.

See the [`x-chart` reference](./reference/chart.md) and
[Chart Definition API](../../reference/chart-definitions.md).
