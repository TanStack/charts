# `@tanstack/preact-charts`

Preact lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/preact-charts preact d3-scale
```

```tsx
import { Chart } from '@tanstack/preact-charts'

;<Chart definition={definition} ariaLabel="Revenue by month" tooltip />
```

The adapter renders SVG on the server and adopts it on the client. Chart
definitions, rendering, interaction, and animation remain in
`@tanstack/charts`.
