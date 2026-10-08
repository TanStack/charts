---
'@tanstack/charts': patch
---

Avoid repeating focus callbacks after scene updates when the focused datum and group have not changed. Continue repainting updated geometry and notifying changed data or group membership.
