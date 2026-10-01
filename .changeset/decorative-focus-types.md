---
'@tanstack/charts': patch
---

Reject focus-filtered marks passed to decorative(), including nested composites,
in TypeScript instead of waiting for the existing runtime error.
