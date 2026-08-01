# React Native host proof of concept

Research and implementation date: 2026-07-30

## Decision

A React Native SVG host is viable. The chart grammar, D3 scales, marks,
responsive scene compiler, gradients, clips, polar and geographic paths, point
identity, and most focus algorithms can run unchanged. The current web
`ChartRenderer` cannot be the native abstraction: its public contract requires
DOM elements, string prerendering, client coordinates, and browser-owned
surface lifecycle.

The proof should advance only as a separate package and host:

```text
definition + D3 scales + marks
             │
             ▼
  shared @tanstack/charts runtime
             │
             ▼
          ChartScene
             │
             ▼
 React Native interaction + react-native-svg
```

This can remain additive for current consumers. Do not generalize
`ChartRenderer` or remove DOM types from the root API to make native fit.

The POC establishes technical feasibility, package isolation, approximate
JavaScript cost, and the main API boundaries. It does not establish device
visual parity, application binary cost, Hermes runtime performance, or
production support.

## Implemented proof

The publishable experimental `@tanstack/react-native-charts` package includes:

- a generic React Native `Chart` component that owns `createChartRuntime`;
- responsive sizing from explicit dimensions, aspect ratio, or `onLayout`;
- a direct keyed `ChartScene` visitor using `react-native-svg`;
- groups, rules, polylines, areas, dots, rectangles, labels, linear gradients,
  nested translation, and rectangular clips;
- current-color and CSS-variable-fallback paint resolution;
- nearest, axis-nearest, and grouped focus;
- tap selection, sticky pinning, focus restoration, and accessibility actions;
- a separate SVG focus overlay;
- inactive shared focus-layer groups are omitted from the base scene;
- an optional native tooltip subpath with point, pointer, group-center, and
  custom anchors, collision-aware placement, custom content, and a custom
  React body;
- an optional injected text measurer;
- a bare Metro fixture using React Native 0.86.2 and `react-native-svg`
  15.15.5;
- an Expo 57 Metro fixture using Expo's `react-native-svg` 15.15.4;
- source-map checks that reject browser renderer code in iOS and Android
  bundles.

The host imports runtime values from narrow core subpaths. It does not import
the root barrel, `react-dom`, a browser adapter, the DOM renderer, the Canvas
host, or the SVG string/reconciliation pipeline. The full-chart Metro fixture
imports its application definition from `@tanstack/charts/universal`; the core
line control keeps granular imports for a tighter comparison.

That distinction matters to shared application source. A Metro probe using
`defineChart` and `lineY` from the browser-oriented root
`@tanstack/charts` barrel traversed the DOM renderer, DOM text, reconciliation,
SVG surface, and adapters. The prerequisite universal-barrel PR adds
`@tanstack/charts/universal` for normal environment-neutral authoring while
retaining granular entries for tighter bundles.

Metro 0.84 retains every runtime module re-exported by `/universal`, including
unused marks and the environment-neutral static SVG string serializer. It does
not retain the guarded DOM or browser host modules. The broad entry is the
simplest supported authoring path; bundle-sensitive native applications can
use granular mark, runtime, and scene entries until Metro can eliminate those
unused re-exports.

That prerequisite also adds `@tanstack/charts/types`, exports the generic
tooltip and portal token interfaces for host-adapter authors, and moves DOM
host types to an internal `dom-types.ts` module while preserving their root
re-exports. This POC adds no further core public API.

Minimum usage keeps the browser-oriented root unchanged and selects the native
host and tooltip explicitly:

```tsx
import { scaleLinear } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts/universal'
import { Chart } from '@tanstack/react-native-charts'
import { tooltip } from '@tanstack/react-native-charts/tooltip'

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 10]) },
  tooltip: { use: tooltip, sticky: true },
})

export function RevenueChart() {
  return (
    <Chart
      definition={definition}
      accessibilityLabel="Revenue"
      aspectRatio={1.5}
    />
  )
}
```

The tooltip token makes that configured definition native-specific. A shared
application can keep the chart spec and tooltip options universal, then attach
the web or native token in its platform entry.

## Bundle measurements

### Isolated esbuild entries

Production, minified ESM; React, React Native, and `react-native-svg` are
external in the native entries.

| Entry                              | Minified |     Gzip |
| ---------------------------------- | -------: | -------: |
| React Native SVG host              | 26.95 kB | 10.22 kB |
| React Native SVG host with tooltip | 32.50 kB | 12.10 kB |
| React Native line consumer         | 49.18 kB | 19.03 kB |
| Shared line scene                  | 38.17 kB | 14.82 kB |
| Existing React web adapter         | 39.98 kB | 14.57 kB |
| Existing React web line consumer   | 62.03 kB | 23.41 kB |

The native host entry includes the host plus every shared runtime and D3 module
reachable from exporting `Chart`; it is not isolated adapter-only overhead.
The base host and line consumer omit `Tooltip.tsx`. Importing the tooltip
subpath adds 5.55 kB minified and 1.88 kB gzip. The native line consumer
additionally includes the line mark and D3 scale code while leaving platform
peers external. It is the closest comparison to the existing React line entry,
but the two platforms do not have identical runtime baselines. The native
entries are informational measurements, not locked budgets.

### Metro application deltas

React Native production bundles were minified for both platforms. Each row is
measured against a blank React Native application built with the same Metro
configuration. The full chart uses `/universal`; the core line control uses
granular entries.

| Platform | Full `/universal` chart minified JS delta | `react-native-svg` gzip delta | Core line gzip delta | Full `/universal` chart gzip delta | Full chart module delta |
| -------- | ----------------------------------------: | ----------------------------: | -------------------: | ---------------------------------: | ----------------------: |
| iOS      |                                434.28 KiB |                     27.75 KiB |            38.95 KiB |                         102.94 KiB |                     384 |
| Android  |                                434.42 KiB |                     27.69 KiB |            38.94 KiB |                         102.99 KiB |                     384 |

The full iOS bundle was 1,328,782 bytes and 319,792 bytes gzip, versus 884,080
and 214,381 for blank. Android was 1,334,298 and 320,860, versus 889,448 and
215,395 for blank. Compared with the otherwise identical granular fixture,
`/universal` retains another 119.06 KiB minified and 28.91 KiB gzip on both iOS
and Android, plus 102 modules per platform under this Metro version.

These are JavaScript bundle measurements, not Hermes bytecode or installed
application sizes. They exclude the native iOS and Android code linked by
`react-native-svg`. A clean release-binary before/after comparison is still
required.

The full-chart source maps require `/universal` and include its static SVG
serializer. They exclude every guarded browser module: adapters, DOM host, DOM
text measurement, DOM renderer, Canvas, reconciliation, SVG resources/surface,
`react-dom`, React web charts, and Octane charts.

## Parity and boundaries

| Capability                             | POC result                                 | Production boundary                                                            |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| Definitions, D3 scales, marks, layout  | Shared unchanged                           | High confidence                                                                |
| Cartesian, facet, polar, geo geometry  | Shared scene paths                         | Needs device conformance                                                       |
| All seven scene node kinds             | Implemented                                | Needs iOS/Android visual tests                                                 |
| Linear gradients and rectangular clips | Implemented                                | Device and nested-clip tests remain                                            |
| Responsive sizing                      | `onLayout`, explicit size, aspect ratio    | Scroll/layout integration remains                                              |
| Paint                                  | `currentColor` and CSS fallback resolution | Dynamic definitions still see the web default theme                            |
| Text                                   | SVG text plus injected core measurer       | Exact native typography and async measurement are unresolved                   |
| Nearest and grouped focus              | Implemented                                | Logic is duplicated from the DOM renderer                                      |
| Focus presentation                     | Generic native overlay                     | Authored focus marks and mark states are not applied                           |
| Tap, selection, sticky tooltip         | Implemented                                | Responder ownership may conflict with scrolling and gestures                   |
| Tooltip                                | Native in-tree overlay                     | Web `className`, portal semantics, and full item formatting are not equivalent |
| Accessibility                          | Labeled adjustable root and actions        | No per-point native accessibility tree or data-table escape                    |
| Motion                                 | Not implemented                            | Requires a renderer-neutral transition model                                   |
| SVG/PNG export                         | Not implemented                            | Needs native snapshot/share APIs                                               |
| Large-data renderer                    | Not measured                               | SVG node pressure may require an optional Skia host                            |
| SSR and hydration                      | Intentionally absent                       | Web-only behavior                                                              |

### Rendering details that are not exact

- SVG `arcs` and `miter-clip` joins are explicitly normalized to `round` and
  `miter`, respectively, because the React Native SVG type surface does not
  expose them.
- The native paint resolver can consume CSS variable fallbacks, but it cannot
  evaluate application CSS. A production host needs concrete native theme
  values before scene compilation.
- The current text-measure contract does not carry font family, font style,
  letter spacing, direction, or locale. Passing `fontFamily` to the painter
  cannot make guide layout measure the same font.
- `react-native-svg` supports the required primitive family and Fabric, but
  SVG compatibility must be verified on real iOS and Android renderers rather
  than inferred from server-rendered component markup.

### Interaction details that are not exact

- Focus preset resolution, point restoration, navigation order, tooltip
  content, anchor, and placement remain private across the DOM renderer and
  tooltip implementation. The POC had to reproduce those policies. A supported
  package must extract the pure behavior and make both hosts consume it.
- Shared focus-layer groups are hidden from the base native scene so they are
  not painted permanently. The proof uses its generic native overlay instead;
  authored focus marks and inline mark states need a shared scene-state
  resolver before they can be supported accurately.
- The POC does not implement the complete `tooltip.items` channel, datum, and
  derived-row contract. Custom `content`, `format`, `formatGroup`, and a custom
  React body work, but default structured content is only partial.
- The shared definition type accepts environment-neutral extension tokens, so
  a web tooltip token typechecks in native application code and fails when the
  native `Chart` resolves it. Compile-time host rejection would require a
  refined native definition type before release.
- The root `View` currently claims touch responder ownership on press.
  `ScrollView`, pan, brush, zoom, and application gestures require an explicit
  arbitration model, likely through Pressability or Gesture Handler rather
  than more responder callbacks.
- Native accessibility cannot reuse DOM focus and ARIA. The adjustable-root
  behavior proves a useful minimum, not parity with keyboard traversal or a
  complete accessible data representation.
- The chart is one accessible root. Nested controls in a custom pinned tooltip
  may be hidden by platform accessibility grouping, and
  `accessibilityLiveRegion` is Android-specific. This needs VoiceOver and
  TalkBack design rather than prop translation.
- A local absolute tooltip cannot escape clipped native ancestors. Native
  portal/modal behavior needs a separate definition from the browser top-layer
  implementation.

## API and compatibility impact

No existing public call needs to break for an SVG-native release.

Prerequisite changes delivered by the universal-barrel PR:

- additive `@tanstack/charts/universal` export;
- additive `@tanstack/charts/types` export, including generic tooltip and portal
  token contracts;
- mechanical split between universal and DOM host types, with root re-exports
  preserved.

This proof adds a separate React Native package, base component contract, and
optional tooltip subpath.

Additive changes likely required before a supported release:

- a shared, renderer-neutral interaction state module;
- a shared tooltip content/anchor/placement model;
- a runtime option for platform default themes;
- a complete typography and text-measurement contract;
- structured paint references or a host paint-resolution contract;
- native-specific tooltip overlay and gesture integration points.

Changes to avoid:

- making the current `ChartRenderer` union over DOM and native surfaces;
- making string prerendering optional inside that renderer contract;
- importing React Native from the core package;
- shipping CSS tokens to native and silently substituting arbitrary colors;
- claiming compatibility outside the tested Expo 57 and bare React Native
  0.86.2 lanes or the `react-native-svg` 15.15.4–15.15.5 pair;
- adding Skia before an on-device density/performance crossover is measured.

The root type API remains compatible. Consumers that want a DOM-free
declaration graph can opt into `@tanstack/charts/types`. Shared definitions can
replace browser-root imports with `@tanstack/charts/universal`; granular entries
remain the bundle-sensitive option. Neither path changes existing published
web behavior.

The package now ships compiled ESM and declarations for the root and optional
tooltip entries. Published exports put `types` first, select explicit native
shims through the `react-native` condition, and retain `import` fallbacks. The
release gate builds and packs the adapter with the fixed package set, then
installs the core and native tarballs into isolated bare React Native and Expo
consumers. Their default Metro configurations must resolve installed `dist`
files rather than workspace source.

## Pros and cons

### Advantages

- Most data-to-geometry behavior remains one implementation.
- Existing definitions, accessors, D3 scales, custom marks, polar charts, and
  geographic paths remain usable.
- The direct scene visitor is small and avoids an SVG XML parse/reconcile step.
- `react-native-svg` provides one renderer across iOS and Android and supports
  the current React Native architecture.
- Native callbacks receive the original datum objects because the scene and
  interaction model stay in one JavaScript runtime.
- The separate package keeps native dependencies and platform assumptions out
  of web bundles.

### Costs

- Rendering parity is only the easy half; text, input, tooltips, animation,
  accessibility, and export are host products.
- `react-native-svg` adds both JavaScript and native binary code.
- Many SVG nodes can become expensive before the shared scene compiler does.
- Native support needs devices, release builds, TalkBack/VoiceOver testing,
  and two platform-specific failure surfaces.
- Current interaction and tooltip ownership must be refactored out of mature
  DOM host implementations without regressing web behavior.
- The native package needs its separate packed-declaration program because
  React Native and DOM global declarations conflict in one TypeScript program.

## Verification performed

- 21 focused POC tests cover every scene primitive, gradients, clips, paint
  resolution, focus modes, point and callback restoration, tooltip ordering,
  placement, chart compilation, extension ownership, inactive focus layers,
  and no-speculative-size behavior. Component mapping tests use React DOM with
  native modules mocked; they are structural tests, not native renderer tests.
- The native package and the normal React Native application configuration
  typecheck.
- Packed root and tooltip declarations typecheck in isolated bare and Expo
  consumers. Normal and `react-native` conditional resolution both select the
  installed `dist` files.
- The repository-wide typecheck passes with the native dependency graph.
- The prerequisite PR's packed gate validates the supported environment-safe
  entries without changing the browser root.
- Existing locked web bundle baselines remain unchanged.
- Production Metro bundles complete for iOS and Android, and the full-chart
  variants must resolve `/universal`.
- Packed bare React Native and Expo consumers produce iOS and Android bundles
  without workspace aliases. Their source maps include the native conditional
  entries and exclude workspace source and guarded browser modules.
- Source-map gates prove the full native entries do not include guarded browser
  implementation files, including the web tooltip and portal runtimes.
- Retained-input gates prove the base native host and line consumer omit the
  optional native tooltip implementation, all native entries omit web tooltip
  and portal code, the base host retains no D3 runtime, and the line consumer
  retains no D3 geometry runtime.

A strict native consumer with `skipLibCheck: false` now gets past the Charts
DOM boundary and stops in `@types/d3-array`, whose `blurImage` declaration
references the browser global `ImageData`. An automated diagnostic accepts
only those two known errors, or a clean result after the upstream declaration
is fixed. The POC does not add a fake global or pull DOM libraries into native
to hide the upstream declaration problem.

The isolated esbuild boundary and packed bare/Expo Metro gate run in
`pnpm validate`. GitHub also runs the source native declaration check as a
separate workflow step. The ten-build comparative Metro measurement remains a
local spike command rather than a mandatory CI gate.

Not performed:

- simulator or physical-device rendering;
- native component interaction tests;
- visual comparison against the conformance corpus;
- Hermes execution or profiling;
- 1k/10k-point interaction and memory tests;
- release application binary comparison;
- VoiceOver and TalkBack validation;
- Expo prebuild, simulator, or device validation;
- motion, export, or Skia implementation.

## Production path

### Phase 1: shared behavior and a supported SVG host

Extract interaction and tooltip policy, add native theme ownership, complete
the typography contract, and replace the proof's responder policy. Maintain
the native-specific package gate and keep the package scoped to tested
RN/RNSVG lanes.

Estimated effort: 3–5 engineering weeks.

### Phase 2: device confidence

Add generated native projects for bare and Expo applications, iOS and Android
release builds, a platform-neutral definition corpus, screenshot/geometry
comparison, VoiceOver/TalkBack flows, binary-size measurement, and sustained
interaction benchmarks.

Estimated effort: 3–5 engineering weeks.

### Phase 3: broader parity

Add renderer-neutral motion, native export/share, advanced gesture recipes,
and a Skia renderer only if measured SVG node pressure justifies it. Expand the
supported version matrix from evidence.

Estimated effort: 4–10 engineering weeks, strongly dependent on motion,
accessibility, and dense-data requirements.

An honest SVG-native MVP is therefore roughly 6–10 weeks. Broad parity with
the current web product is closer to 10–20 weeks. These are engineering ranges,
not schedule commitments.

## Recommendation

Proceed to Phase 1 if a real React Native product is planned. The architecture
is sound and the JavaScript cost is reasonable for a charting package. Keep the
published package experimental until the device-confidence work is complete.

Do not start a NativeScript adapter in parallel. The earlier
[native platform support spike](./NATIVE-PLATFORM-SUPPORT-SPIKE.md) remains the
architecture comparison; this proof increases confidence specifically for
React Native because its runtime, Metro pipeline, SVG implementation, and
interaction surface were exercised.

## Primary platform references

- [React Native 0.86 release](https://reactnative.dev/blog/2026/06/11/react-native-0.86)
- [React Native version support status](https://reactnative.dev/versions.html)
- [Expo SDK version matrix](https://docs.expo.dev/versions/latest/)
- [Expo 57 SVG renderer](https://docs.expo.dev/versions/v57.0.0/sdk/svg/)
- [React Native layout events](https://reactnative.dev/docs/layoutevent)
- [React Native accessibility](https://reactnative.dev/docs/accessibility)
- [`react-native-svg` support and compatibility](https://github.com/software-mansion/react-native-svg)
- [Metro package exports and the `react-native` condition](https://metrobundler.dev/docs/package-exports/)
