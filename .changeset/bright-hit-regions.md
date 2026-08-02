---
'@tanstack/charts': patch
---

Resolve default pointer focus against painted mark geometry before applying a
mark's natural x, y, or two-dimensional fallback. Interaction metadata now
lives on the resolved scene primitive, so built-in and custom marks share the
same rectangle, circle, polygon, line, or area geometry used by renderers after
layout, facets, transforms, clipping, and inline state resolution.

Facet-local default markers now stay bound to the primary point even when
another panel has identical channel values; explicit x/y focus marks remain the
opt-in synchronized-cursor path. Animated bar inset states also preserve the
quantitative axis and baseline while changing only categorical width or height.
