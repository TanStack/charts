---
'@tanstack/charts': minor
---

Add a shared `hover: 'capture' | 'passthrough'` option to `brushX` and `zoomX`. With `passthrough`, idle hover over the plot still focuses points and shows the tooltip, so brush or zoom can live on the same plot as point tooltips. Drags, clicks, wheel, keyboard input, and the brush selection and handles stay with the control. The default `capture` keeps the current behavior.
