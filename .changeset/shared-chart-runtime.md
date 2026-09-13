---
'@tanstack/charts': patch
---

Reduce chart bundles by sharing Cartesian guide rendering, mark initialization,
stack ordering, motion tracks, SVG reconciliation, and hit-testing calculations.
Keep the motion renderer independent of the unused standalone tween engine.
