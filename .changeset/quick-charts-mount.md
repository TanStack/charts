---
'@tanstack/charts': patch
'@tanstack/react-charts': patch
---

Reduce chart mounting work by creating default SVG focus indicators only when needed and avoiding duplicate React client rendering. Speed up SVG serialization and categorical domain inference while preserving server rendering, hydration, chart appearance, and interactions.
