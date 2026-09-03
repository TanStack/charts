# React Adapter

Use `Chart` from `@tanstack/charts/react`. Use `/canvas` for the Canvas host, `/core` for an injected renderer, and `/tooltip` variants only when React-owned tooltip content is required.

## Ownership

- Keep fixed definitions at module scope.
- Wrap definitions that capture props/state in `useMemo` with every captured semantic value.
- Put focus, tooltip, keyboard, cursor, selection, controls, and animation on the definition.
- Put `height`, `width`/`initialWidth`, `ariaLabel`, `ariaDescription`, `className`, `style`, and callbacks on `Chart`.
- Use `renderTooltipBody` only for framework-owned body content; render controls only when pinned.

## SSR

React emits complete SVG at `initialWidth`; Canvas emits a deterministic accessible shell. Keep data, definitions, dimensions, formatters, renderer choice, and component tree identical for server and first client render. Generated resource IDs use React identity; supply `idPrefix` for coordinated roots.

## Failure Checks

- Fresh definition on every render.
- Tooltip behavior on props instead of the definition.
- Browser-only values captured during server render.
- Switching the entire component only because `window` is absent.
- Rich transient tooltip controls entering tab order before pinning.
- Missing cleanup from application-owned overlays outside the adapter.

Source: `docs/framework/react/adapter.md`; `docs/framework/react/reference/chart.md`
