<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Alpine%20Charts&theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Alpine%20Charts"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png?title=TanStack%20Alpine%20Charts"
      alt="TanStack Alpine Charts"
      width="900"
    />
  </picture>
</div>

# `@tanstack/alpine-charts`

Alpine directive adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/charts-scales @tanstack/alpine-charts alpinejs
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

Read the published
[Alpine adapter guide](https://tanstack.com/charts/latest/docs/framework/alpine/adapter)
and
[`x-chart` reference](https://tanstack.com/charts/latest/docs/framework/alpine/reference/chart).
