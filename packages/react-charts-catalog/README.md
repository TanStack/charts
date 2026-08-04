# `@tanstack/react-charts-catalog`

Server-renderable React components for every published TanStack Charts catalog
case.

Import each chart from its case subpath so the application loads only the
chart it renders:

```tsx
import GroupedReducerBars from '@tanstack/react-charts-catalog/cases/59-grouped-reducer-bars'

;<GroupedReducerBars
  initialWidth={640}
  height={360}
  idPrefix="landing-grouped-reducer-bars"
/>
```

The component renders its complete SVG during SSR. `initialWidth` controls the
server-rendered layout when `width` is not fixed. `revision` changes seeded
sample data, and `interactive` enables the chart's keyboard and tooltip
behavior.

`catalogCases` from the package root lists all published case IDs, order, titles,
and families.

Licensed under [MIT](./LICENSE).
Bundled dataset attribution is in
[Third-party notices](./THIRD_PARTY_NOTICES.md).
