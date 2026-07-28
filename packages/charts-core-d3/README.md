# Archived TanStack Charts D3 backend experiment

This private package is an API-compatible measurement fork of
`@tanstack/charts`. It keeps the TanStack mark, scene, reconciliation,
interaction, animation, SVG, and DOM layers while replacing mathematical
internals with direct imports from:

- `d3-array`
- `d3-format`
- `d3-scale`
- `d3-shape`

It never imports the `d3` umbrella package and gives D3 no DOM ownership.

The package compared output parity, bundle size, and performance against the
former native mathematical baseline. The product package now incorporates
granular D3 directly. This archive is not a publishing candidate or a second
public API. See the historical granular D3 backend section in
[`PLAN.md`](../../PLAN.md) for the measurements.
