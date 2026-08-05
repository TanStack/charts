---
'@tanstack/charts': minor
'@tanstack/react-charts-catalog': patch
'@tanstack/react-native-charts': patch
---

Expose pinned state to tooltip content and item callbacks so built-in and
framework-rendered tooltips can expand with additional detail when pinned.
Keep dismissing clicks owned by the tooltip when a framework body unmounts
during event propagation.

Standardize public callback parameters as primary data plus a context bag.
Tooltip `format` and `formatGroup` now receive the same content context as
`content`; channel accessors use `(datum, { index, data })`; facet, focus,
legend, and spatial-index extension callbacks move their supporting values
into named context objects.

Update the published pinned-tooltip catalog case to show the energy overview,
compact hover summary, and animated pinned detail.

Preserve distinct source rows in the linear-regression and framed-scatter
catalog examples when car names and years repeat.
