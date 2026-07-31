# Bundle-size policy

`pnpm bundle:check` applies three explicit policies:

- **Locked** entries are ordinary TanStack Charts consumers that optional
  features must not affect. Their minified and gzip bytes must match
  [`universal-baseline.json`](./universal-baseline.json) exactly.
- **Budgeted** entries isolate an optional chart feature or D3 capability and
  enforce a feature-specific gzip ceiling. An incremental budget compares two
  complete consumers so shared compression is represented honestly.
- **Measured** entries are comparison libraries, applications, or exploratory
  D3 kernels. They are reported without defining a TanStack product ceiling.

Every package entry in
[`measure-bundles.mjs`](../../scripts/measure-bundles.mjs) declares one policy.
New marks and optional capabilities need an isolated budgeted entry. They must
leave the locked entries byte-identical.

The retained-input gate reads esbuild's output contributions rather than its
parsed input list. This distinguishes code that contributes bytes from a
zero-byte re-export. The compact-scale fixtures require their exact subpaths
and reject sibling scale implementations. The React base rejects tooltip and
portal code, the tooltip consumer rejects portal code, and the portal consumer
may add only its transport module over the tooltip consumer.

The compact linear scene and React consumer are both locked and budgeted. The
scene has a 7 KiB gzip ceiling. The React line consumer has a 15 KiB ceiling
with React and React DOM external. `d3-array` tick helpers are allowed only in
the compact linear path; categorical compact-scale kernels reject every D3
runtime input. All compact fixtures reject `d3-scale`, `d3-format`,
`d3-interpolate`, `d3-color`, and `internmap`.

Non-cartesian capability subpaths follow the same policy. Polar and geographic
entries measure complete scenes through static SVG: a minimal arc, D3 pie,
full scale-backed gauge composition, a scale-backed polar line and scatter
composition, and projected GeoJSON. Atlas datasets remain application-owned
inputs rather than chart-package dependencies. The locked Cartesian entries
prove those D3 geometry modules remain opt-in.

The advanced custom-mark scale-value factory follows the same rule: its
subpath has a dedicated budget, while ordinary chart entries must retain zero
bytes from it.

The optional interaction measurements include the practical granular imports:
`d3-brush` or `d3-zoom` together with `d3-selection`. They are controller
kernels, not dependencies of TanStack Charts or its ordinary DOM host.

Update the universal baseline only after reviewing why a shared path changed:

```sh
pnpm bundle:update-baseline
pnpm bundle:check
```

A decrease also requires an update. This prevents a later regression from
silently consuming size that an optimization recovered.
