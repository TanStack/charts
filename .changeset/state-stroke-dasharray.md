---
'@tanstack/charts': patch
---

Allow `strokeDasharray` in dot, bar, rect, area, and text mark state styles. Every renderer already applied a state dash to these marks; only the state style types rejected it.
