---
'@tanstack/charts': minor
---

Add `gridSpatialIndex` at `@tanstack/charts/spatial/grid-index`, an opt-in `spatialIndex` factory for dense point charts. It returns exactly the point a linear anchor scan returns, including the earliest-point tie and the `maxDistance` limit, and finds the nearest point center rather than testing mark shapes. Charts that do not import it do not grow.
