# Changelog

## 0.6.5

### @tanstack/charts

#### Patch Changes

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

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/react-charts-catalog

#### Patch Changes

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

### @tanstack/react-native-charts

#### Patch Changes

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

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62)]:
  - @tanstack/charts@0.6.5

## 0.6.4

### @tanstack/charts

#### Patch Changes

- [#51](https://github.com/TanStack/charts/pull/51) [`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95) - Accept configured D3 scale instances for union-valued axes.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/react-native-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95)]:
  - @tanstack/charts@0.6.4

## 0.6.3

### @tanstack/charts

#### Patch Changes

- [#49](https://github.com/TanStack/charts/pull/49) [`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921) - Keep the built-in primary focus ring when authored focus marks are present, and
  add `focusRing: false` for charts that replace the indicator explicitly.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/react-native-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921)]:
  - @tanstack/charts@0.6.3

## 0.6.2

### @tanstack/charts

#### Patch Changes

- [#47](https://github.com/TanStack/charts/pull/47) [`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee) - Clarify that each chart host has one animation owner: the default SVG renderer
  uses `animate`, while `motion()` ignores it and uses definition-level motion
  declarations.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/react-native-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee)]:
  - @tanstack/charts@0.6.2

## 0.6.1

### @tanstack/charts

#### Patch Changes

- [#44](https://github.com/TanStack/charts/pull/44) [`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d) - Correct SVG pointer hit testing when the rendered viewport and chart scene use
  different aspect ratios.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/react-native-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d)]:
  - @tanstack/charts@0.6.1

## 0.6.0

### @tanstack/charts

#### Minor Changes

- [#41](https://github.com/TanStack/charts/pull/41) [`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7) - Add the optional `motion()` SVG renderer with tween and physical spring
  transitions, definition-local chart, mark, datum, guide, and focus timing,
  retained interruption velocity, reduced-motion handling, and aligned
  presentation geometry. Add the standalone `createChartSpring` sampler.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/react-native-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7)]:
  - @tanstack/charts@0.6.0

## 0.5.1

### @tanstack/charts

#### Patch Changes

- [#29](https://github.com/TanStack/charts/pull/29) [`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8) - Resolve default pointer focus against painted mark geometry before applying a
  mark's natural x, y, or two-dimensional fallback. Interaction metadata now
  lives on the resolved scene primitive, so built-in and custom marks share the
  same rectangle, circle, polygon, line, or area geometry used by renderers after
  layout, facets, transforms, clipping, and inline state resolution.

  Facet-local default markers now stay bound to the primary point even when
  another panel has identical channel values; explicit x/y focus marks remain the
  opt-in synchronized-cursor path. Animated bar inset states also preserve the
  quantitative axis and baseline while changing only categorical width or height.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/react-native-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8)]:
  - @tanstack/charts@0.5.1

## 0.5.0

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/react-native-charts

#### Minor Changes

- [#11](https://github.com/TanStack/charts/pull/11) [`710ffec`](https://github.com/TanStack/charts/commit/710ffecbad98810a6dacc47a46c64f9d8c0bf366) - Add the experimental React Native SVG host with responsive scene rendering,
  focus, selection, accessibility actions, and an optional native tooltip entry.
  Ship compiled ESM and declarations, and verify the packed package in bare React
  Native and Expo Metro consumers.

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies []:
  - @tanstack/charts@0.5.0

## 0.4.0

### @tanstack/charts

#### Minor Changes

- [#30](https://github.com/TanStack/charts/pull/30) [`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635) - Order grouped tooltip rows by rendered mark position by default: top-to-bottom
  for x groups and left-to-right for y groups. Add `visual` as an explicit sort
  policy while preserving color-domain, focus, and custom comparator ordering.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635)]:
  - @tanstack/charts@0.4.0

## 0.3.1

### @tanstack/charts

#### Patch Changes

- [#25](https://github.com/TanStack/charts/pull/25) [`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31) - Remove incidental `d3-array` usage from nearest-point lookup, quantile legend
  thresholds, and compact numeric ticks. These paths now use package-owned
  implementations with D3 parity coverage, and compact scales no longer have a
  production D3 dependency.

  Numeric-bin and stack transforms, polar and curve features, and geo features
  continue to own their tree-shakable `d3-array`, `d3-shape`, or `d3-geo`
  implementations as normal dependencies. No peer dependency, caller-supplied
  capability, or public API migration is required.

### @tanstack/charts-scales

#### Patch Changes

- [#25](https://github.com/TanStack/charts/pull/25) [`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31) - Remove incidental `d3-array` usage from nearest-point lookup, quantile legend
  thresholds, and compact numeric ticks. These paths now use package-owned
  implementations with D3 parity coverage, and compact scales no longer have a
  production D3 dependency.

  Numeric-bin and stack transforms, polar and curve features, and geo features
  continue to own their tree-shakable `d3-array`, `d3-shape`, or `d3-geo`
  implementations as normal dependencies. No peer dependency, caller-supplied
  capability, or public API migration is required.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31)]:
  - @tanstack/charts@0.3.1

## 0.3.0

### @tanstack/charts

#### Minor Changes

- [#15](https://github.com/TanStack/charts/pull/15) [`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7) - Replace the flat axis guide options with composable axis, grid, tick, and
  responsive label configuration. Add shared focus-layer marks, animated inline
  mark states, coordinate-based tooltip anchoring, and unified stack/group
  layouts with inferred stacking.
  Add data-first group, numeric/calendar/two-dimensional bin, window, cumulative,
  rank, normalize, select, and row-stack transforms. Results use named group
  fields, flat row extension, explicit reducers and ordering, source lineage,
  object-bag callbacks, ordinary-function escape hatches, and granular entry
  points.

- [#16](https://github.com/TanStack/charts/pull/16) [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f) - Allow `link` marks to resolve stroke width and opacity per datum and configure
  their line caps. This supports proportional D3 Sankey links through native mark
  composition instead of a custom scene renderer.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7), [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f)]:
  - @tanstack/charts@0.3.0

## 0.2.0

### @tanstack/charts

#### Minor Changes

- [#20](https://github.com/TanStack/charts/pull/20) [`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158) - Rename the environment-safe `/portable` entry from `0.1.0` to `/universal`.
  Replace `@tanstack/charts/portable` imports with `@tanstack/charts/universal`.
  The `/types` entry and browser-oriented root exports remain unchanged. The
  universal type surface now includes generic tooltip-extension token contracts
  for non-DOM hosts.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158)]:
  - @tanstack/charts@0.2.0

### Breaking changes

#### Universal entry

Replace `@tanstack/charts/portable` imports from `0.1.0` with
`@tanstack/charts/universal`. The browser-oriented `@tanstack/charts` root and
the environment-safe `@tanstack/charts/types` entry remain unchanged.

### Added

- `link` marks now accept data-driven `strokeWidth` and `strokeOpacity`
  channels plus configurable line caps. This supports responsive `d3-sankey`
  layouts through native `link`, `rect`, and `text` composition while keeping
  `d3-sankey` as a direct application dependency. The catalog and networks
  guide include basic and Apple FY22 income-statement examples.

## 0.1.0

### @tanstack/charts

#### Minor Changes

- [#8](https://github.com/TanStack/charts/pull/8) [`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9) - Add environment-safe `/portable` and `/types` entry points while preserving
  the existing browser-oriented root exports.

- Make native tooltips and tooltip portals explicit extensions. Import `tooltip`
  from `@tanstack/charts/tooltip`; replace `tooltip: true` with `tooltip`, dynamic
  booleans with `enabled ? tooltip : false`, and configured objects with
  `{ use: tooltip, ...options }`. Complete definition values use
  `ChartTooltipInput`; `ChartTooltipOptions` remains the options-only type.

  Import `portal` from `@tanstack/charts/tooltip/portal`; replace `portal: true`
  with `portal`, omit `portal: false`, and replace dynamic booleans with
  `enabled ? portal : undefined` inside the configured tooltip object.

### @tanstack/charts-scales

#### Minor Changes

- Add compact callable linear, band, point, and ordinal scales through the exact
  `@tanstack/charts-scales/linear`, `/band`, `/point`, and `/ordinal` entries.
  There is no package root export. Compact linear scales are numeric and two-stop;
  use `d3-scale` for time, transformed, piecewise, nonnumeric, locale-aware, and
  other full D3 behavior. Unsupported D3 behavior does not warn or fall back at
  runtime.

### @tanstack/react-charts

#### Minor Changes

- Move React tooltip-body composition to `@tanstack/react-charts/tooltip`.
  Consumers using `renderTooltipBody` must migrate root `Chart` to `Chart`,
  `/canvas` `Chart` to `CanvasChart`, and `/core` `Chart` to `RendererChart` from
  that entry. Move wrapper types to the matching `ChartProps`, `CanvasChartProps`,
  or `RendererChartProps` names and their `CommonProps` counterparts.

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

This section documents migration from `0.0.2` and supersedes tooltip examples
in the historical release entries below.

### Breaking changes

#### Tooltip extensions

Tooltips and tooltip portals are now explicit extensions:

```ts
import { tooltip, type ChartTooltipInput } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'

interface Datum {
  value: number
}

const configuredTooltip = {
  use: tooltip,
  portal,
  format(point) {
    return String(point.datum.value)
  },
} satisfies ChartTooltipInput<Datum>
```

Apply these replacements to chart definition options:

| `0.0.2` input      | `0.1.0` input                           |
| ------------------ | --------------------------------------- |
| `tooltip: true`    | `tooltip`                               |
| `tooltip: false`   | `tooltip: false`                        |
| `tooltip: enabled` | `tooltip: enabled ? tooltip : false`    |
| `tooltip: options` | `tooltip: { use: tooltip, ...options }` |
| `portal: true`     | `portal`                                |
| `portal: false`    | Omit `portal`                           |
| `portal: enabled`  | `portal: enabled ? portal : undefined`  |

`portal` remains a property of a configured tooltip object. `ChartTooltipOptions`
still describes only the options after `use`; it does not contain the extension
discriminator. Type a complete value assigned to `definition.tooltip` as
`ChartTooltipInput`, or wrap reusable `ChartTooltipOptions` with
`{ use: tooltip, ...options }`. The object containing `use: tooltip` is the
contextual typing boundary for inline tooltip callbacks.

#### React tooltip bodies

React consumers that provide `renderTooltipBody` must move the component and
matching prop-type imports to `@tanstack/react-charts/tooltip`:

| `0.0.2` import                          | `0.1.0` component | `0.1.0` prop types                               |
| --------------------------------------- | ----------------- | ------------------------------------------------ |
| `@tanstack/react-charts` `Chart`        | `Chart`           | `ChartProps`, `ChartCommonProps`                 |
| `@tanstack/react-charts/canvas` `Chart` | `CanvasChart`     | `CanvasChartProps`, `CanvasChartCommonProps`     |
| `@tanstack/react-charts/core` `Chart`   | `RendererChart`   | `RendererChartProps`, `RendererChartCommonProps` |

Do not rename `/canvas` or `/core` imports to `/tooltip` while retaining the
name `Chart`; that name selects the default SVG component in the new entry. The
base React entries retain native tooltips without including React DOM's portal
runtime. Other framework adapters retain their existing entry points and only
require the chart-definition migration above.

### Added

- Added the optional compact scale package:

  ```sh
  pnpm add @tanstack/charts-scales
  ```

  Import one exact family; there is no `@tanstack/charts-scales` root export:

  ```ts
  import { scaleLinear } from '@tanstack/charts-scales/linear'
  import { scaleBand } from '@tanstack/charts-scales/band'
  import { scalePoint } from '@tanstack/charts-scales/point'
  import { scaleOrdinal } from '@tanstack/charts-scales/ordinal'
  ```

  These scales are documented subsets, not complete D3 replacements. Compact
  linear scales are numeric and two-stop. Use `d3-scale` for time, UTC, log,
  power, symlog, radial, sequential, diverging, quantile, quantize, threshold,
  piecewise or nonnumeric interpolation, locale-aware format specifiers, and
  other full D3 behavior. Unsupported D3 behavior does not trigger a runtime
  warning or automatic fallback. See [Scales and D3](docs/concepts/scales-and-d3.md#compact-scales)
  for the compatibility boundary.

### Bundle impact

- The representative compact React line consumer is 14,227 bytes gzip
  (13.89 KiB), down from 25,708 bytes gzip (25.11 KiB). React, the React JSX
  runtime, and React DOM are external in both measurements.
- Opting into the tooltip extension produces 17,608 bytes gzip, an increase of
  3,381 bytes.
- Adding the portal extension produces 18,414 bytes gzip, another 806 bytes.

## 0.0.2

### @tanstack/charts

#### Patch Changes

- [#12](https://github.com/TanStack/charts/pull/12) [`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3) - Keep long Cartesian axis titles contained on compact charts.

### @tanstack/react-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/octane-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/preact-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/vue-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/solid-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/svelte-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/angular-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/lit-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

### @tanstack/alpine-charts

#### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2

## 0.0.1 (2026-07-30)

`0.0.1` is the first coordinated update after the public `0.0.0` release. The
verified `0.0.0` baseline is
`58ee1e28e469f8ab28f99877a6e0abc3958977a4`, not the initial repository
commit.

- npm published `@tanstack/charts@0.0.0` at
  `2026-07-29T18:42:40Z`, followed through `18:43:13Z` by the React, Octane,
  Preact, Vue, Solid, Svelte, Angular, Lit, and Alpine adapters.
- The published core and React README hashes, and the published core
  chart-definitions documentation hash, match commit `58ee1e2` exactly.
- No later commit existed before those packages were published.

The audited product implementation range ends at
`a91106c34d654ea625a2f540f647222bd72bc0fc` and contains exactly nine
commits. Release-preparation corrections in this branch update the
documentation, comparison fixture and baseline, and this changelog after that
implementation range.

[Compare the audited product range.](https://github.com/TanStack/charts/compare/58ee1e28e469f8ab28f99877a6e0abc3958977a4...a91106c34d654ea625a2f540f647222bd72bc0fc)

### Release scope and verification

- `0.0.1` publishes `@tanstack/charts` and the React, Octane, Preact, Vue,
  Solid, Svelte, Angular, Lit, and Alpine adapters as one versioned set. Every
  adapter depends exactly on `@tanstack/charts@0.0.1`.
- The comparison bundle review confirmed that basic TanStack line, bar, area,
  and scatter consumers now measure 24.19–24.81 KiB gzip. The increase comes
  from the reviewed definition-behavior, key-inference, scale-inference, and
  portal-tooltip code rather than an accidental dependency. The comparison
  fixture now configures behavior on the definition instead of the removed
  host boundary, and the refreshed baseline passed the full pull-request
  validation, comparison, conformance, and stress workflow.
- TanStack.com deployed the schema-v4 catalog consumer before the Charts
  release reached `main`. After the release artifact was live and verified,
  TanStack.com commit `c4687bf` removed schema-v2 compatibility, pinned the
  site to the exact `0.0.1` packages, and published the final landing-page
  copy.
- Release merge `15dcb156a32db361678f4cffeb116a2bd0fc0e79` passed the
  package, documentation, bundle, comparison, catalog, stress, and conformance
  gates in main workflow `30591789823`. Annotated tag `v0.0.1`, the GitHub
  release, release workflow `30592985603`, and all ten npm provenance
  statements identify that exact merge. The release workflow reran formatting,
  documentation, type, test, and release-artifact checks before publication
  and registry verification.
- `@charts-poc/demo-data` remains private. It is a catalog, example, and
  validation fixture package, not a production dependency or release target.
- `@tanstack/charts-d3` remains a private superseded experiment and is not a
  release target.

### Package impact

All product packages in this table already existed at the published baseline.
This range updates them; it does not introduce new adapters.

| Package                    | 0.0.1 update                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@tanstack/charts`         | Definition-owned reactivity and behavior, inferred keys and scale domains, portal tooltips, typed data |
| `@tanstack/react-charts`   | Updated definition contract, composed tooltip bodies, portal mounting, and a `react-dom` peer          |
| `@tanstack/octane-charts`  | Updated definition contract across SVG, Canvas, and renderer entries, plus composed tooltip bodies     |
| `@tanstack/preact-charts`  | Updated definition contract, SVG adoption behavior, and composed tooltip bodies                        |
| `@tanstack/vue-charts`     | Updated definition contract, SSR forwarding fixes, and a scoped tooltip-body slot                      |
| `@tanstack/solid-charts`   | Updated definition contract, stable SSR IDs, and composed tooltip bodies                               |
| `@tanstack/svelte-charts`  | Updated definition contract, hydration behavior, and a tooltip-body snippet                            |
| `@tanstack/angular-charts` | Updated definition contract and a typed projected tooltip template directive                           |
| `@tanstack/lit-charts`     | Updated definition contract and composed tooltip rendering through options                             |
| `@tanstack/alpine-charts`  | Updated definition contract and DOM tooltip-body rendering                                             |

## Breaking changes and migrations

### Definition identity is now the application reactivity boundary

The runtime no longer accepts formal chart input, prepares data, or compares
input values. A definition captures the application values it uses. Recreate
or memoize the complete definition when those values change. A responsive
builder still reruns when its surface size or build-time theme changes.

Before:

```tsx
const definition = defineChart<readonly Row[]>()({
  prepare: (rows) => summarize(rows),
  prepareEqual: Object.is,
  inputEqual: Object.is,
  chart: ({ input, prepared, width, height, theme }) => ({
    marks: createMarks(input, prepared),
    x: createXScale(width),
    y: createYScale(height, theme),
  }),
})

<Chart definition={definition} input={rows} ariaLabel="Revenue" />
```

After:

```tsx
function createRevenueDefinition(rows: readonly Row[]) {
  const prepared = summarize(rows)

  return defineChart({
    marks: createMarks(rows, prepared),
    x: { scale: scaleUtc, nice: true },
    y: { scale: scaleLinear, nice: true },
  })
}

const definition = useMemo(() => createRevenueDefinition(rows), [rows])

<Chart definition={definition} ariaLabel="Revenue" />
```

Migration details:

- Remove `input` from DOM-host and framework-adapter options.
- Move transforms beside `defineChart`, or into the framework memo or computed
  primitive that creates the definition.
- Replace `prepare`, `prepareEqual`, and `inputEqual`. Prepared-data caching
  and the preparation `AbortSignal` no longer exist.
- Remove uses of `ChartPrepareContext`, `chartInputsEqual`, and
  `shallowInputEqual`.
- Replace `StaticChartHostOptions`, `DynamicChartHostOptions`,
  `StaticChartProps`, and `DynamicChartProps` with the unified host and adapter
  contracts.
- Read only `width`, `height`, and `theme` from `ChartBuildContext`.
- Call `runtime.render(definition, size, layout?)`; the runtime no longer
  accepts an input argument.
- Update low-level generic arguments. `ChartDefinition`,
  `DynamicChartDefinition`, `ChartRuntime`, hosts, adapters, and points now
  describe datum, x-value, and y-value types rather than input and
  prepared-data types.
- For vanilla updates, create the next definition and pass it through
  `host.update`.
- For framework updates, memoize the complete definition against every
  application value it captures.

`DynamicChartConfig` remains public. It combines a responsive
`chart(context)` builder with definition-owned behavior options.

### Chart behavior moved from hosts into definitions

Focus, tooltip, animation, keyboard, focus-distance, and spatial-index policy
are reusable chart behavior. Hosts and framework components no longer accept
`focus`, `maxFocusDistance`, `spatialIndex`, `animate`, `keyboard`, or
`tooltip`.

Before:

```tsx
<Chart
  definition={definition}
  focus={focusX}
  tooltip={{ sticky: true }}
  animate={{ duration: 180 }}
  keyboard
  ariaLabel="Revenue"
/>
```

After:

```tsx
const interactiveDefinition = defineChart(definition, {
  focus: 'nearest-x',
  tooltip: true,
  animate: { duration: 180 },
  keyboard: true,
})

<Chart definition={interactiveDefinition} ariaLabel="Revenue" />
```

Static definitions may declare behavior directly. Responsive definitions place
behavior beside `chart`. `defineChart(existingDefinition, options)` creates a
separately configured definition without moving surface policy back into the
adapter.

The host still owns:

- dimensions and aspect ratio;
- accessible labels and descriptions;
- surface class names and styles;
- focus, grouped-focus, selection, render, and tooltip-body callbacks;
- text measurement;
- renderer selection.

The `focus` option now accepts `nearest`, `nearest-x`, `nearest-y`, `group-x`,
and `group-y`, as well as a custom focus strategy.

Enabled tooltips are pinnable by default. Click, Enter, or Space pins the
current tooltip; Escape or a composed body's `dismiss` callback clears it. Set
`tooltip: { sticky: false }` for transient-only behavior.

### Resize animation is opt-in

`ChartAnimationOptions.resize` now defaults to `false`.

- Definition changes may still animate.
- Responsive observation and explicit size changes commit immediately unless
  `animate.resize` is `true`.
- Incompatible layout changes never interpolate.
- Interrupted animations still begin from currently painted geometry.
- Renderer completion is associated with the render reason so an older
  animation cannot overwrite a newer immediate resize.

Applications that deliberately animate size changes must opt in:

```ts
const definition = defineChart(chart, {
  animate: {
    duration: 180,
    resize: true,
  },
})
```

### Built-in marks infer stable identity

Built-in marks no longer fall back immediately to row index. Identity resolves
in this order:

1. An explicit `key`
2. A unique primitive `datum.id`
3. A unique primitive `datum.data.id`
4. A unique mark-specific positional candidate
5. Row index

Mark-specific candidates:

- bars use their categorical channel;
- lines and areas use their independent axis;
- rects and cells use the complete x/y interval tuple;
- dots and text try x, then y, then the x/y tuple;
- polar lines, areas, and rules use angle;
- D3 pie-backed polar arcs can recover nested source identity.

A candidate must be complete and unique inside its interaction group.
Development builds warn once per mark instance when a positional candidate is
missing or duplicated and identity falls back to row position.

Remove redundant keys when an ID or semantic position already identifies the
datum. Keep an explicit key when position can change independently of entity
identity. Use `key: (_datum, index) => index` only when positional identity is
intentional.

### D3 scale factories now request domain inference

Positional, color, radius, and polar scale options distinguish a factory from
a configured instance.

```ts
const inferred = {
  x: { scale: scaleUtc, nice: true },
  y: { scale: scaleLinear, nice: true },
}

const configured = {
  x: { scale: scaleUtc().domain(fixedDateDomain) },
  y: { scale: scaleLinear().domain([0, fixedMaximum]) },
}
```

Migration rules:

- Pass `scaleLinear`, `scaleUtc`, or another zero-argument D3 factory when the
  domain should follow mark channels.
- Use a wrapper such as `() => scaleBand<string>().padding(0.2)` when the
  factory needs pre-domain configuration.
- Continue passing a configured D3 instance when the application owns a fixed
  domain.
- Do not pass `scaleLinear()` and expect data inference. It is a configured
  instance and retains D3's default domain until the application changes it.
- Move nicening for inferred axes to `nice?: boolean | number`.
- Keep every granular `d3-*` module imported by application source as a direct
  application dependency.

Inference behavior:

- continuous and temporal axes use the finite extent of every materialized
  channel on that axis;
- band and point axes retain distinct values in first-seen order;
- implicit bar and area baselines contribute zero;
- empty channels retain the scale factory's native domain;
- configured instances are copied and never mutated;
- TanStack Charts owns responsive ranges, y orientation, reversal, band
  centering, guide layout, and final tick placement.

Validation is stricter:

- inferred quantitative and temporal scales reject incompatible semantic
  values instead of coercing them;
- an inferred log domain rejects zero or a domain that crosses zero;
- a bar or area with an implicit zero baseline cannot use an inferred log
  scale;
- required-axis checks follow each mark's materialized dimensions;
- configuring an unused phantom axis is rejected.

Color factories now infer ordinal, continuous, quantize, quantile, or threshold
domains and expose semantic scale kind and thresholds to legends. Radius
factories infer `[0, maximum]` while preserving configured output ranges.
Polar angle and radius scales use the same factory-versus-instance contract.

### Point and scale types are more precise

- `ChartPoint.xValue` and `yValue` preserve inferred `Date`, numeric, or
  categorical values.
- `ChartMarkPointX` and `ChartMarkPointY` describe interaction anchors.
- `ChartMarkScaleX` and `ChartMarkScaleY` describe values materialized into
  scales.
- `ChartMarkX` and `ChartMarkY` remain deprecated compatibility aliases.
- Rectangle and cell interval scale values are independent from their
  interaction anchors.
- Custom marks whose interaction and scale values differ use
  `createMarkWithScaleValues` from `@tanstack/charts/mark/scale-values`.
- Positionless polar and geo definitions may omit Cartesian axes.
- A one-dimensional mark requires only the dimension it materializes.

## Core updates

### Channel, interval, and layout refinements

- Added an independent semantic `color` channel across existing Cartesian,
  polar, and geographic marks.
- `z` remains geometry and interaction grouping. It is the color fallback when
  `color` is omitted.
- For lines and areas, `color` groups paths only when `z` is absent. When both
  exist, `z` groups geometry and `color` supplies scale semantics.
- Grouped bars use `z`, or `color` when no `z` is present.
- Final `fill` and `stroke` accessors remain paint overrides.
- Interaction-point colors now match the fill or stroke actually painted.
- Interval points now expose `x1Value`, `x2Value`, `y1Value`, `y2Value`, and
  `xInterval` or `yInterval` range and difference semantics.
- Channel field types reject datum fields incompatible with the mark channel.
- Inference carries datum and coordinate types through focus, tooltip,
  spatial-index, selection, adapter, and renderer callbacks.
- Custom marks may provide `layoutLabels`, allowing data-bound labels,
  including polar and geographic labels, to contribute to automatic margins.

### Tooltip, focus, and interaction refinements

The native tooltip model now provides structured content rather than only
plain text:

- safe titles;
- ordered rows and swatches;
- channel and datum items;
- derived items;
- interval ranges and differences;
- `content`, `items`, `sort`, `anchor`, `placement`, and `offset` options;
- compatibility with existing `format` and `formatGroup` callbacks.

Grouped tooltip rows can sort by color-domain order, focus order, or a custom
comparator. Anchors can follow the point, pointer, group center, or a custom
coordinate. Eight placements and ordered fallbacks support viewport collision
handling.

`tooltip.portal` moves the native surface out of clipped stacking contexts.
The host uses the browser Popover top layer when available and a fixed
body-level fallback otherwise. Both paths:

- map scene anchors to client coordinates;
- collide against the viewport;
- reposition on scroll, viewport resize, chart resize, and tooltip-content
  resize;
- target the chart's owner document;
- clean up when the definition, renderer, or chart host changes.

Framework adapters can compose native framework content into the core-owned
tooltip body. The body context contains `points`, structured `content`,
`defaultBody`, `pinned`, and `dismiss`. Transient custom bodies remain inert;
pinned bodies become nonmodal dialogs and may contain selectable or
interactive content.

The renderer-neutral host exposes `onTooltipBodyChange` and
`ChartTooltipBodyTarget` for lower-level integrations.

Additional interaction corrections:

- duplicate public keys no longer collapse distinct observations during path
  hover or responsive repaint;
- spatial-index option changes repaint active focus and tooltip state.

## Framework adapter updates

Every existing adapter moved to the definition-identity update contract and
removed formal input and host-owned behavior props. Callback types continue to
infer from the complete definition, and committed callbacks remain fresh
without forcing a new definition.

- Shared adapter prerendering preserves `className`; Vue declares and forwards
  it on both server and client paths.

Adapter-specific tooltip composition:

- React, Octane, Preact, and Solid expose `renderTooltipBody`.
- Vue exposes a scoped `#tooltipBody` slot.
- Svelte exposes a `tooltipBody` snippet.
- Angular exports `ChartTooltipBodyDirective`, with the definition as its
  strict type witness.
- Lit accepts `options.renderTooltipBody`.
- Alpine accepts `renderTooltipBody` returning DOM content.

React now declares `react-dom ^19.0.0` as a peer because composed tooltip bodies
use React portals. React and Octane preserve the existing default SVG,
`/canvas`, and renderer-neutral `/core` entry boundaries.

## Catalog, demo data, and publication artifact

The catalog already contained 100 cases at the published `0.0.0` baseline.
This range changes the data and publication model without claiming a catalog
count expansion.

### Source-shaped demo data

- Added the private `@charts-poc/demo-data` workspace package with 27 pinned
  Observable datasets and a metadata subpath.
- Every dataset has an exact subpath export and records source URL, upstream
  revision, record count, schema, byte size, license note, and SHA-256.
- Small snapshots are emitted as typed rows.
- Large CSV snapshots remain compact and parse only when their exact subpath is
  imported. Sibling datasets and the CSV parser stay out of unrelated chunks.
- All 100 existing catalog cases were migrated away from case-local `data.ts`
  fixtures and now import source-shaped data through exact subpaths.
- Case selection, sampling, joins, derived channels, normalization, layout, and
  transforms remain visible in `selection.ts`, `transform.ts`, `layout.ts`, or
  model modules.
- Only two authored interaction-state fixtures remain. They are explicitly
  named `scenario.ts`, not observation data.
- React, Octane, and sandbox showcases now use pinned source-shaped datasets
  instead of synthetic Stats-shaped fixtures.
- Demo data is externalized from renderer bundle measurement and is not a
  production dependency of any Charts package.
- Deterministic sync, metadata, schema, hash, exact-subpath, and compact-CSV
  tests cover the package.

### Schema-v4 source and asset closures

The existing generated-content publication pipeline now emits a schema-v4
catalog artifact.

- The artifact records the exact Charts revision, source repository, route and
  embed contracts, renderer module contract, implementation counts, datasets,
  authored-source metadata, and asset graph.
- Each case records TanStack and reference source closures by entry, support,
  fixture, and harness role.
- Authored-source totals include transitive implementation and transform code
  while excluding harness code and raw dataset rows.
- Published modules are recursively allowlisted with SHA-256, byte size, static
  imports, and dynamic imports.
- Validation rejects unsafe paths, oversized or unreferenced assets,
  inconsistent closures, and public comparison modules.
- The catalog source viewer exposes the same closure and dataset provenance
  used by artifact validation.
- Loading checks preserve the existing contract: the normal catalog and embed
  routes load only TanStack code; competitor code remains opt-in.

TanStack.com deployed and verified the schema-v4 consumer before release, then
retired its schema-v2 compatibility path in commit `c4687bf`. During `0.0.1`
production verification, the public manifest identified tagged release
`15dcb156`, contained 100 cases, 430 hash-verified assets, and 25 datasets, and
served the list, detail, comparison, and embed routes from the native site.
Later catalog publications intentionally advance with `main`; the `v0.0.1`
Git tag and published `0.0.1` npm versions remain immutable.

## Documentation, comparison, and lineage

### Lineage

- Acknowledgements now distinguish implementation lineage from conceptual
  lineage.
- Public concepts, overview, and marketing material credit the
  grammar-of-graphics tradition and its development through Leland Wilkinson,
  ggplot2, Vega-Lite, and Observable Plot.
- Observable Plot remains identified as the closest API influence for
  mark-local data, channels, and layered composition.

### Public documentation gaps

- Expanded the existing canonical documentation from 71 to 81 pages.
- Added the evidence-backed comparison page.
- Added missing framework adapter references and completed renderer,
  controller, scale, color, tooltip, and public-type contracts.
- Documented definition identity, framework memoization, inferred stable keys,
  D3 factory ownership, inferred domains, structured and portaled tooltips,
  point-versus-scale types, SSR, hydration, and migration requirements.
- Corrected shared SSR `className` forwarding and documented the exact adapter
  support boundary.

Documentation validation now:

- parses typed code fences;
- resolves TanStack imports through package manifests;
- verifies named value and type imports against the selected public entry;
- checks local heading fragments, including duplicate-heading suffixes;
- rejects name-only API inventories as reference coverage;
- typechecks designated standalone examples;
- compiles the Octane quick start in client and server modes;
- verifies generated package docs and both `llms.txt` indexes remain in sync.

### Reproducible comparison evidence

- The public comparison is generated from shared capability evidence rather
  than a handwritten feature matrix.
- Bundle evidence covers Chart.js `4.5.1`, Apache ECharts `6.1.0`, Recharts
  `3.10.1`, Observable Plot `0.6.17`, and TanStack Charts across line, bar,
  area, and scatter at basic, interactive, and advanced tiers.
- Source accounting follows each implementation's transitive authored closure
  and keeps dataset provenance separate from authored chart code.
- The current baseline records the reviewed 24.19–28.20 KiB complete-chart
  range. Pull-request CI reproduced the bundle and comparison gates before the
  release version was prepared.

## Verification added or updated in the audited product range

- Runtime, host, renderer, and framework tests cover definition identity,
  behavior ownership, resize render reasons, animation interruption, key
  inference, duplicate-key focus, tooltip pinning, portal placement, and
  cleanup.
- Type-contract tests cover mark channels, point and scale value separation,
  required axes, factory inference, configured instances, callback inference,
  and adapter props.
- Scale tests cover quantitative, temporal, band, point, log, color, radius,
  and polar inference, including empty and invalid domains.
- Packed-consumer tests cover the revised core, DOM, React, Octane, and adapter
  declaration contracts without casts or private imports.
- Documentation checks cover 81 canonical pages, executable examples, public
  package entries, exports, links, and generated mirrors.
- Catalog checks cover all 100 cases, source roles, exact dataset subpaths,
  schema-v4 asset closures, source-view parity, and TanStack-only production
  loading.
- The full catalog and interaction evidence completed during this range.

## 0.0.1 release-preparation corrections

- Updated the canonical docs, public READMEs, generated package mirrors, and
  `llms.txt` indexes for the `0.0.1` API.
- Replaced temporary unreleased-source warnings with `0.0.1` installation
  guidance, including the React DOM runtime and type peers required by the
  React adapter.
- Replaced private demo-data imports in public examples with small,
  self-contained typed datasets.
- Fixed the comparison fixture to configure behavior on definitions instead of
  the removed host boundary.
- Refreshed the reviewed bundle baseline and recorded the TanStack workspace
  revision separately from pinned competitor package versions.
- Updated the offline chart-authoring evaluation to target the `0.0.1`
  definition, behavior, and scale contracts.
- Added this baseline-verified changelog and the required tanstack.com
  consumer-before-catalog deployment order.

## Audited product commit inventory

1. `9d23a50` (2026-07-29), **Credit grammar-of-graphics lineage**:
   clarified implementation and conceptual lineage across acknowledgements,
   concepts, overview, and marketing.
2. `d2c4d44` (2026-07-29), **Close public documentation gaps**:
   expanded the canonical reference, added evidence-backed comparison content,
   tightened documentation contracts, and fixed public host, focus, export,
   scale, and adapter gaps discovered while documenting the API.
3. `dc4bc70` (2026-07-29), **Make definition identity the chart reactivity
   boundary**: removed formal input, preparation, equality, and cache APIs and
   migrated runtimes, hosts, adapters, examples, and all catalog cases to
   captured application values.
4. `235455f` (2026-07-29), **Disable chart animation during resize**:
   classified render reasons, made responsive and explicit resize immediate by
   default, and added `animate.resize` opt-in.
5. `b9e1886` (2026-07-29), **Move chart behavior into definitions**:
   moved focus, tooltip, animation, keyboard, focus distance, and spatial
   indexing out of hosts; added focus presets, pinnable tooltips, and richer
   structured tooltip behavior.
6. `f07fdf2` (2026-07-29), **Infer stable chart keys**:
   added ID and mark-specific positional identity inference, development
   diagnostics, and reconciliation, animation, and focus coverage.
7. `de65652` (2026-07-29), **Infer scale domains from marks**:
   added direct D3 factories, domain inference, axis nicening, strict value
   validation, and corresponding positional, color, radius, and polar scale
   behavior.
8. `4b940ed` (2026-07-30), **Add composable portal tooltips**:
   added top-layer and fixed portal positioning, framework-native tooltip
   bodies, pinned dialog behavior, and adapter-specific composition APIs.
9. `a91106c` (2026-07-30), **Improve chart inference and catalog data**:
   completed point and scale typing, required-axis inference, independent color
   channels, interval metadata, source-shaped demo data, visible transform
   roles, source closures, and the schema-v4 catalog artifact.
