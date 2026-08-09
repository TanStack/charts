---
'@tanstack/charts': minor
'@tanstack/charts-scales': minor
'@tanstack/react-charts': minor
'@tanstack/react-native-charts': minor
'@tanstack/octane-charts': minor
'@tanstack/preact-charts': minor
'@tanstack/vue-charts': minor
'@tanstack/solid-charts': minor
'@tanstack/svelte-charts': minor
'@tanstack/angular-charts': minor
'@tanstack/lit-charts': minor
'@tanstack/alpine-charts': minor
---

Harmonize the pre-alpha public API: tighten compact scales, rename responsive,
control, focus, color, SVG animation, export, reducer, and rolling-window
contracts, standardize transform callbacks, type composable views and
host-owned tooltip tokens, share DOM/native interaction policy, and add one
platform-default runtime theme. DOM and React Native definitions now reject
cross-host tooltip tokens, while synchronous text measurement receives the
complete host typography and font scale. Every DOM adapter now exposes the
host-refined definition type at its chart boundary.
