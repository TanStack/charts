---
'@tanstack/charts': patch
---

Reserve the correct gutter for a positioned axis in a right-to-left container.
A y scale with `side: 'right'` anchored its tick labels for a left-to-right
inline direction, so an RTL host painted them across the plot instead of beside
it. Text estimation now mirrors with the same direction the DOM measurer
already reports, keeping a host without one on the same layout.
