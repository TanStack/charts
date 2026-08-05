# @tanstack/react-native-charts

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
