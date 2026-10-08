---
'@tanstack/charts': patch
---

Use the scale returned by its range setter so immutable custom scales receive the chart's pixel range without changing their source.
