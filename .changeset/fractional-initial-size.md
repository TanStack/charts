---
'@tanstack/charts': patch
---

Accept the first resize observer's measurement precision when layout and CSS content dimensions are unchanged, avoiding a spurious resize that cancels entrance motion. Continue responding to actual fractional resizes.
