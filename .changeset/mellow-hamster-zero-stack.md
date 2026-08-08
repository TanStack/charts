---
'@tanstack/charts': patch
---

Stacked marks no longer collapse a zero-valued cell to the axis. The default diverging offset now keeps zeros on their series' running baseline, so a stacked area with a zero data point renders a flat segment instead of a spike to zero.
