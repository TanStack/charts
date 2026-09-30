---
'@tanstack/charts': minor
---

Add opt-in series hover and keyboard emphasis to interactive color legends.
Inline states use an independent legend source while interaction focus,
tooltips, crosshairs, and pinned selection retain their existing owner. Extend
the SVG, Canvas, and motion renderer protocols to support independent state
focus, and export the browser control extension types.

Preserve dot series ownership for legend visibility when `z` supplies the
default color channel, without filtering independent per-point colors as series.
