# Alpine Adapter

Register `charts` from `@tanstack/charts/alpine`, then pass a complete chart options value through the directive. Alpine is a browser-only adapter contract.

## Ownership

- The directive creates the shared host after Alpine starts, forwards complete option changes, and destroys the runtime during directive cleanup.
- Keep focus, tooltip, selection, controls, cursor, and animation in the definition.
- Use the documented Alpine tooltip body callback only for framework-owned content.

## Server Policy

Render a server shell or separate static SVG through application infrastructure, then start Alpine in the browser. Do not expect the directive to hydrate chart geometry.

## Failure Checks

- Starting before a real browser element exists.
- Passing a partially mutated options object.
- Leaving directive cleanup disconnected from DOM removal.
- Putting buttons in transient tooltip content before pinning.

Source: `docs/framework/alpine/adapter.md`; `docs/framework/alpine/reference/chart.md`
