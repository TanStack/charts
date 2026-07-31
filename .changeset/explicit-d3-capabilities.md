---
'@tanstack/charts': patch
'@tanstack/charts-scales': patch
---

Remove incidental `d3-array` usage from nearest-point lookup, quantile legend
thresholds, and compact numeric ticks. These paths now use package-owned
implementations with D3 parity coverage, and compact scales no longer have a
production D3 dependency.

Numeric-bin and stack transforms, polar and curve features, and geo features
continue to own their tree-shakable `d3-array`, `d3-shape`, or `d3-geo`
implementations as normal dependencies. No peer dependency, caller-supplied
capability, or public API migration is required.
