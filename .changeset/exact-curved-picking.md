---
'@tanstack/charts': patch
'@tanstack/react-native-charts': patch
---

Resolve curved line and area focus against the same recorded path geometry used
by SVG, Canvas, and React Native renderers. Built-in D3 curves and custom
`scenePath` marks now preserve subpixel containment and stroke-distance behavior
instead of falling back to straight source-point chords or polygons.
