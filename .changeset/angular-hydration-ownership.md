---
'@tanstack/charts': patch
'@tanstack/angular-charts': patch
---

Preserve server-rendered Angular chart nodes during hydration instead of
replacing them through the initial markup binding. Keep reactive updates and
teardown owned by the mounted chart renderer.
