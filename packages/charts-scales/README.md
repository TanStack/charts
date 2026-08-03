<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png"
      alt="TanStack Charts"
      width="900"
    />
  </picture>
</div>

# TanStack Charts Scales

Small callable scales for TanStack Charts. Import only the required family:

```ts
import { scaleLinear } from '@tanstack/charts-scales/linear'
import { scaleBand } from '@tanstack/charts-scales/band'
```

The API covers the D3 scale methods used by Charts, but is not a complete
`d3-scale` replacement. Linear scales are numeric and two-stop. Formatting,
time, logarithmic, sequential, threshold, and generic interpolation semantics
remain application-owned or available from D3.
