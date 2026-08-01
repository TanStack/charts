---
'@tanstack/charts': patch
---

Resolve default pointer focus against painted mark geometry before applying a
mark's natural x, y, or two-dimensional fallback. Built-in bars, bands, dots,
rectangles, and hexagons now expose their hit regions, while custom marks can
provide rectangle, circle, or polygon regions directly on scene points.
