---
'@tanstack/charts': patch
'@tanstack/angular-charts': patch
---

Preserve server-rendered Angular chart nodes during hydration instead of
replacing them through the initial markup binding. Keep reactive updates and
teardown owned by the mounted chart renderer.

Keep the default tooltip template compatible with Angular 19 AOT linking by
placing the structured-content alias on the primary conditional block.
