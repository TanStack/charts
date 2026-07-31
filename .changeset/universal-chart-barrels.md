---
'@tanstack/charts': minor
---

Rename the environment-safe `/portable` entry from `0.1.0` to `/universal`.
Replace `@tanstack/charts/portable` imports with `@tanstack/charts/universal`.
The `/types` entry and browser-oriented root exports remain unchanged. The
universal type surface now includes generic tooltip-extension token contracts
for non-DOM hosts.
