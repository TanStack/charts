---
'@tanstack/charts': patch
---

Clarify that each chart host has one animation owner: the default SVG renderer
uses `animate`, while `motion()` ignores it and uses definition-level motion
declarations.
