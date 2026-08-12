# @tanstack/react-native-charts

## 0.11.1

### Patch Changes

- Updated dependencies [[`11b37ab`](https://github.com/TanStack/charts/commit/11b37ab7ffa9e71a8ec3376ccfeac9797b130768)]:
  - @tanstack/charts@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [[`38ad7e5`](https://github.com/TanStack/charts/commit/38ad7e5749d5480045bbd80b0be4259071570ed8)]:
  - @tanstack/charts@0.11.0

## 0.10.0

### Patch Changes

- Updated dependencies [[`39242bd`](https://github.com/TanStack/charts/commit/39242bd95f6d502a8a3e0e17679fc9389ac5a38e)]:
  - @tanstack/charts@0.10.0

## 0.9.0

### Patch Changes

- [#76](https://github.com/TanStack/charts/pull/76) [`667dd4c`](https://github.com/TanStack/charts/commit/667dd4cd5e7949b9dfac864f416d1686395d6dc7) - Install `@tanstack/charts` once and import compact scales and framework adapters
  from exact package subpaths. Existing package names remain supported for
  compatibility.
- Updated dependencies [[`667dd4c`](https://github.com/TanStack/charts/commit/667dd4cd5e7949b9dfac864f416d1686395d6dc7)]:
  - @tanstack/charts@0.9.0

## 0.8.0

### Minor Changes

- [#73](https://github.com/TanStack/charts/pull/73) [`35832f7`](https://github.com/TanStack/charts/commit/35832f753fd0e17b5215c76529dd7e4bbc222282) - Harmonize the pre-alpha public API: tighten compact scales, rename responsive,
  control, focus, color, SVG animation, export, reducer, and rolling-window
  contracts, standardize transform callbacks, type composable views and
  host-owned tooltip tokens, share DOM/native interaction policy, and add one
  platform-default runtime theme. DOM and React Native definitions now reject
  cross-host tooltip tokens, while synchronous text measurement receives the
  complete host typography and font scale. Every DOM adapter now exposes the
  host-refined definition type at its chart boundary.

### Patch Changes

- Updated dependencies [[`35832f7`](https://github.com/TanStack/charts/commit/35832f753fd0e17b5215c76529dd7e4bbc222282)]:
  - @tanstack/charts@0.8.0

## 0.7.2

### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.7.2

## 0.7.1

### Patch Changes

- [#64](https://github.com/TanStack/charts/pull/64) [`c3f1548`](https://github.com/TanStack/charts/commit/c3f15488bb072e446af61c3e7b04797384c5aca5) - Document React Native parity for shared focus and free-cursor state,
  renderer-native focus and state layers, selection activation, pinned tooltip
  context, viewport-filtered focus, polygon areas, and `NativePaintContext.canvas`.
- Updated dependencies [[`c3f1548`](https://github.com/TanStack/charts/commit/c3f15488bb072e446af61c3e7b04797384c5aca5)]:
  - @tanstack/charts@0.7.1

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

- Complete React Native host parity for shared focus and free-cursor state,
  renderer-native focus and state layers, selection activation, pinned tooltip
  context, viewport-filtered focus, polygon areas, and the public
  `NativePaintContext.canvas` surface.

- Updated dependencies [[`38cddc8`](https://github.com/TanStack/charts/commit/38cddc846c8f342aedcd237956a0057155022ae9), [`a5f9702`](https://github.com/TanStack/charts/commit/a5f97022f90043254e0e0dde174cdf2a63b6a198), [`4134429`](https://github.com/TanStack/charts/commit/4134429b49973cf64df1f36123ba8392571562eb), [`6fd52a8`](https://github.com/TanStack/charts/commit/6fd52a8910c9f933609dce14bffab5277f6325b2)]:
  - @tanstack/charts@0.7.0

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

## 0.6.4

### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

## 0.6.3

### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

## 0.6.2

### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

## 0.6.0

### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

## 0.5.1

### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

## 0.5.0

### Minor Changes

- [#11](https://github.com/TanStack/charts/pull/11) [`710ffec`](https://github.com/TanStack/charts/commit/710ffecbad98810a6dacc47a46c64f9d8c0bf366) - Add the experimental React Native SVG host with responsive scene rendering,
  focus, selection, accessibility actions, and an optional native tooltip entry.
  Ship compiled ESM and declarations, and verify the packed package in bare React
  Native and Expo Metro consumers.

### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

## 0.4.0

### Minor Changes

- Add the initial experimental React Native SVG host with responsive scene
  rendering, focus, selection, accessibility actions, and an optional native
  tooltip entry. Ship compiled ESM and declarations verified in packed bare
  React Native and Expo Metro consumers.
