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

Exports: `charts`, `ChartOptions`, `DynamicChartOptions`,
`StaticChartOptions`, `ChartDefinition`, and `ChartPoint`.
