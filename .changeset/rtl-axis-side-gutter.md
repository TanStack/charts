---
'@tanstack/charts': patch
---

Reserve the correct gutter for a positioned axis in a right-to-left container.
A y scale with `side: 'right'` anchored its tick labels for a left-to-right
inline direction, so an RTL host painted them across the plot instead of beside
it. Automatic anchors, fallback measurement, Canvas, native rendering, and SVG
export now agree on logical `start` and `end` anchors for the host direction.
