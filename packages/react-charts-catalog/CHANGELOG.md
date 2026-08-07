# @tanstack/react-charts-catalog

## 0.7.0

### Patch Changes

- [#60](https://github.com/TanStack/charts/pull/60) [`38cddc8`](https://github.com/TanStack/charts/commit/38cddc846c8f342aedcd237956a0057155022ae9) - Expose pinned state to tooltip content and item callbacks so built-in and
  framework-rendered tooltips can expand with additional detail when pinned.
  Keep dismissing clicks owned by the tooltip when a framework body unmounts
  during event propagation.

  Standardize public callback parameters as primary data plus a context bag.
  Tooltip `format` and `formatGroup` now receive the same content context as
  `content`; channel accessors use `(datum, { index, data })`; facet, focus,
  legend, and spatial-index extension callbacks move their supporting values
  into named context objects. Controlled signals now receive change reasons in
  `{ reason }`; keyed-selection keys and focus-guide label formatters receive
  their point in `{ point }`; interactive legend item labels receive
  `{ visible }`.

  `ruleX` and `ruleY` now expose axis-specific presentation-only focus anchors, so
  `whenFocused(..., { match: 'x' })` and `whenFocused(..., { match: 'y' })` can
  reveal focused guide rules without making them interaction or tooltip targets.

  Update the published pinned-tooltip catalog case to show the energy overview,
  compact hover summary, and animated pinned detail.

  Preserve distinct source rows in the linear-regression, framed-scatter, and
  many-point-scatter catalog examples when car names and years repeat.

  Keep React Native chart-host focusability aligned with the shared definition
  contract and toggle sticky activation exactly once per accessibility action.

- Publish the stacked-bar band-and-rule cursor as catalog case 119 and as an
  exact package subpath, bringing the published catalog to 110 cases. The case
  demonstrates mixed cursor presentation, labels, motion, and keyed updates.

- Updated dependencies [[`38cddc8`](https://github.com/TanStack/charts/commit/38cddc846c8f342aedcd237956a0057155022ae9), [`a5f9702`](https://github.com/TanStack/charts/commit/a5f97022f90043254e0e0dde174cdf2a63b6a198), [`4134429`](https://github.com/TanStack/charts/commit/4134429b49973cf64df1f36123ba8392571562eb), [`6fd52a8`](https://github.com/TanStack/charts/commit/6fd52a8910c9f933609dce14bffab5277f6325b2)]:
  - @tanstack/charts@0.7.0
  - @tanstack/react-charts@0.7.0

## 0.6.5

### Patch Changes

- [#59](https://github.com/TanStack/charts/pull/59) [`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62) - Publish the complete 109-case conformance catalog as per-case React components
  that render their complete SVG during SSR. Catalog data parsing is compatible
  with runtimes that prohibit string code generation, case-local D3 imports are
  declared runtime dependencies, and bundled datasets include source and license
  notices.

  Add `focus: false` for charts that should omit generated focus geometry and
  native focus work. Responsive definitions now retain outer definition options,
  and catalog descriptors and custom views respond to measured width changes
  after SSR. `d3-scale` is declared as a core runtime dependency.

  Catalog components accept the same responsive `aspectRatio` sizing contract as
  React Charts while retaining deterministic initial dimensions for SSR.
  React chart hosts serialize proportional CSS sizing as a unitless value.
  Legend-heavy preview definitions now dedicate their compact layout to the plot.

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5
  - @tanstack/react-charts@0.6.5
