# `@tanstack/solid-charts`

Solid lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/solid-charts solid-js d3-scale
```

```tsx
import { Chart } from '@tanstack/solid-charts'

;<Chart definition={definition} ariaLabel="Revenue by month" tooltip />
```

The adapter renders SVG during SSR and updates the shared chart host from
Solid's reactive owner.

Read the published
[Solid adapter guide](https://tanstack.com/charts/latest/docs/framework/solid/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/solid/reference/chart).
