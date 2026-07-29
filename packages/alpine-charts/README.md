# `@tanstack/alpine-charts`

Alpine directive adapter for `@tanstack/charts`.

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

The `x-chart` element owns its chart contents. Reactive option changes update
the shared host without rebuilding the SVG.
