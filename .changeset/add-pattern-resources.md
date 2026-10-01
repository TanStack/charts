---
'@tanstack/charts': minor
'@tanstack/react-native-charts': minor
---

Add renderer-neutral pattern resources. Declare repeating tiles in a chart's
`patterns` list and reference them from `fill` or `stroke` as `url(#id)`.
`linePattern()` and `dotPattern()` build hatch and dot tiles whose paint
accepts CSS variables. SVG, Canvas, standalone export, and React Native draw
the same tile, with resource IDs scoped by `idPrefix`.
