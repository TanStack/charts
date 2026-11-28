---
'@tanstack/charts': patch
---

Redraw container-responsive charts synchronously when the page enters or leaves print layout, so printed pages and `page.pdf()` exports use the print container width instead of a scaled screen drawing.
