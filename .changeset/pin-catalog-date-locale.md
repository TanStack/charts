---
'@tanstack/react-charts-catalog': patch
---

Format dates and numbers in catalog cases with an explicit `en-US` locale so
rendered output is identical on every host. Cases such as
`86-streaming-window-preservation` previously took axis tick labels from the
machine's locale.
