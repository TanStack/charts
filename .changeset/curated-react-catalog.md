---
'@tanstack/react-charts-catalog': patch
'@tanstack/charts': patch
'@tanstack/react-native-charts': patch
---

Publish the complete 109-case conformance catalog as per-case React components
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
