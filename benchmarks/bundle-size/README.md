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
may add only its transport module over the tooltip consumer. Ordinary line,
compact-scale, and tooltip kernels also reject all transform modules.

The compact linear scene and React consumer are both locked and budgeted. The
scene has a 10.55 KiB gzip ceiling. The React compact-scale line consumer has a
27.05 KiB ceiling with React and React DOM external. `d3-array` tick helpers are
allowed only in the compact linear path; categorical compact-scale kernels
reject every D3 runtime input. All compact fixtures reject `d3-scale`,
`d3-format`, `d3-interpolate`, `d3-color`, and `internmap`.

Painted-geometry interaction is part of the default scene and host contract
across DOM, Canvas, and native rendering. Its isolated resolver has a 2.25 KiB
gzip ceiling. The locked shared-host entries record the reviewed integration
cost, while noninteractive consumers retain only the small scene-compiler
portion of that contract.

Continuous viewports and the controlled interaction controller are also part
of the default scene and host contracts. Default static SVG consumes scene
clips and gradients. Their reviewed shared-path cost is recorded in the locked
entries and the corresponding complete-consumer budgets. Rolling path planning
remains confined to the opt-in motion renderer, whose complete SVG budget is
20.75 KiB gzip.

Every public transform family has an isolated budget and retained-input
allowlist. Numeric and 2D bins may retain `d3-array`, and row stacks may retain
`d3-shape`. Other transform entries reject those dependencies, while every
granular entry rejects unrelated transform families. The suite fixture proves
the common families still compose without pulling calendar bins or advanced
reducers into the default set.

Non-cartesian capability subpaths follow the same policy. Polar and geographic
entries measure complete scenes through static SVG: a minimal arc, first-party
pie allocation, full scale-backed gauge composition, a scale-backed polar line
and scatter composition, and projected GeoJSON. Atlas datasets remain
application-owned inputs rather than chart-package dependencies. The locked
Cartesian entries prove those D3 geometry modules remain opt-in.

The advanced custom-mark scale-value factory follows the same rule: its
subpath has a dedicated budget, while ordinary chart entries must retain zero
bytes from it.

The optional interaction measurements include the practical granular imports:
`d3-brush` or `d3-zoom` together with `d3-selection`. The standalone kernels
remain comparison baselines. The exact `interaction/brush` fixture measures
the first-party behavior over the ordinary DOM host and proves its D3 runtime
does not enter root, universal, or unrelated host consumers. It adds 19.70 KiB
gzip under a 20 KiB incremental cap.

The exact `interaction/zoom` fixture adds 20.24 KiB gzip over the ordinary DOM
host under a 20.25 KiB incremental cap. It retains the controlled signal, shared
interaction axis and range kernels, the zoom controller, and private D3 Zoom
runtime. Root, universal, cursor, brush, native, and unrelated consumers retain
no zoom code.

The exact `interaction/cursor` fixture also measures over the ordinary DOM
host. It adds 3.71 KiB gzip under a 5 KiB incremental cap. It requires only the
controlled signal, shared scale-interaction axis, cursor controller, and
guide-node kernel. It rejects the datum focus guide, brush and D3 runtimes,
tooltip, legend, and selection modules.

The exact `interaction/handle` fixture adds 3.65 KiB gzip over the ordinary
DOM host under a 5 KiB incremental cap. It retains only the controlled signal,
shared candidate-axis and value-cloning kernels, and handle controller. Root,
universal, cursor, brush, zoom, native, and unrelated consumers retain no
handle code or D3 runtime.

The controlled-signal fixture measures 0.09 KiB gzip against a 0.25 KiB cap.
The interactive categorical legend fixture adds 2.53 KiB gzip over the DOM
host and has a 2.6 KiB incremental cap. Both retain only their declared exact
subpath modules.

The static categorical legend fixtures measure the default legend separately
from the tree-shakeable `colorLegendItems()` presentation. The configured
fixture covers centered flow layout, custom label paint, and mixed square and
line-dot indicators through the exact `@tanstack/charts/legend` subpath. Their
retained-input gates reject the interactive legend, host renderers,
interactions, and D3 geometry. The default fixture has a 1.8 KiB gzip ceiling;
item presentation may add at most 1.15 KiB gzip.

Update the universal baseline only after reviewing why a shared path changed:

```sh
pnpm bundle:update-baseline
pnpm bundle:check
```

A decrease also requires an update. This prevents a later regression from
silently consuming size that an optimization recovered.
