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

The private `@tanstack/react-native-charts` package includes:

- a generic React Native `Chart` component that owns `createChartRuntime`;
- responsive sizing from explicit dimensions, aspect ratio, or `onLayout`;
- a direct keyed `ChartScene` visitor using `react-native-svg`;
- groups, rules, polylines, areas, dots, rectangles, labels, linear gradients,
  nested translation, and rectangular clips;
- current-color and CSS-variable-fallback paint resolution;
- nearest, axis-nearest, and grouped focus;
- tap selection, sticky pinning, focus restoration, and accessibility actions;
- a separate SVG focus overlay;
- an optional native tooltip subpath with point, pointer, group-center, and
  custom anchors, collision-aware placement, custom content, and a custom
  React body;
- an optional injected text measurer;
- a Metro fixture using React Native 0.86.0 and `react-native-svg` 15.15.5;
- source-map checks that reject browser renderer code in iOS and Android
  bundles.

The host imports runtime values from narrow core subpaths. It does not import
the root barrel, `react-dom`, a browser adapter, the DOM renderer, the Canvas
host, or the SVG string/reconciliation pipeline. The narrow imports keep this
measurement bundle-sensitive; application definitions can instead use the
environment-safe `@tanstack/charts/universal` barrel.

That distinction matters to shared application source. A Metro probe using
`defineChart` and `lineY` from the browser-oriented root
`@tanstack/charts` barrel traversed the DOM renderer, DOM text, reconciliation,
SVG surface, and adapters. The prerequisite universal-barrel PR adds
`@tanstack/charts/universal` for normal environment-neutral authoring while
retaining granular entries for tighter bundles.

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

const definition = defineChart(
  {
    marks: [lineY([4, 9, 7])],
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
  { tooltip: { use: tooltip, sticky: true } },
)

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
| React Native SVG host              | 23.26 kB |  8.93 kB |
| React Native SVG host with tooltip | 28.04 kB | 10.57 kB |
| React Native line consumer         | 45.30 kB | 17.68 kB |
| Shared line scene                  | 34.29 kB | 13.44 kB |
| Existing React web adapter         | 32.66 kB | 12.03 kB |
| Existing React web line consumer   | 54.50 kB | 20.78 kB |

The native host entry includes the host plus every shared runtime and D3 module
reachable from exporting `Chart`; it is not isolated adapter-only overhead.
The base host and line consumer omit `Tooltip.tsx`. Importing the tooltip
subpath adds 4.78 kB minified and 1.65 kB gzip. The native line consumer
additionally includes the line mark and D3 scale code while leaving platform
peers external. It is the closest comparison to the existing React line entry,
but the two platforms do not have identical runtime baselines. The native
entries are informational measurements, not locked budgets.

### Metro application deltas

React Native production bundles were minified for both platforms. Each row is
measured against a blank React Native application built with the same Metro
configuration.

| Platform | Full chart minified JS delta | `react-native-svg` gzip delta | Core line gzip delta | Full chart gzip delta | Full chart module delta |
| -------- | ---------------------------: | ----------------------------: | -------------------: | --------------------: | ----------------------: |
| iOS      |                   309.42 KiB |                     27.75 KiB |            37.78 KiB |             72.53 KiB |                     281 |
| Android  |                   309.56 KiB |                     27.69 KiB |            37.81 KiB |             72.62 KiB |                     281 |

The full iOS bundle was 1,200,921 bytes and 288,655 bytes gzip, versus 884,080
and 214,381 for blank. Android was 1,206,437 and 289,754, versus 889,448 and
215,395 for blank.

These are JavaScript bundle measurements, not Hermes bytecode or installed
application sizes. They exclude the native iOS and Android code linked by
`react-native-svg`. A clean release-binary before/after comparison is still
required.

The full-chart source maps include the native host and exclude every guarded
browser module: adapters, DOM host, DOM text measurement, renderer, Canvas,
reconciliation, SVG serialization/surface code, `react-dom`, React web charts,
and Octane charts.

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
  content, anchor, and placement are private functions inside the DOM renderer.
  The POC had to reproduce those policies. A supported package must extract
  the pure behavior and make both hosts consume it.
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

This proof adds a separate private React Native package, base component
contract, and optional tooltip subpath.

Additive changes likely required before release:

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
- claiming compatibility outside the tested React Native 0.86.0 and
  `react-native-svg` 15.15.5 pair;
- adding Skia before an on-device density/performance crossover is measured.

The root type API remains compatible. Consumers that want a DOM-free
declaration graph can opt into `@tanstack/charts/types`. Shared definitions can
replace browser-root imports with `@tanstack/charts/universal`; granular entries
remain the bundle-sensitive option. Neither path changes existing published
web behavior.

The private package is not publishable as it stands. Metro resolves its
workspace source, and the package has no production build or published export
map. A native-specific build, declaration, tarball, install,
conditional-export, and Metro-consumer gate is part of productionization.

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
- Current interaction and tooltip ownership must be refactored out of a mature
  DOM renderer without regressing web behavior.
- A publishable native package needs a separate packed-declaration gate because
  React Native and DOM global declarations conflict in the current web fixture.

## Verification performed

- 16 focused POC tests cover every scene primitive, gradients, clips, paint
  resolution, focus modes, point restoration, placement, chart compilation,
  extension ownership, and no-speculative-size behavior. Component mapping
  tests use React DOM server rendering with native modules mocked; they are
  structural tests, not native renderer tests.
- The native package and the normal React Native application configuration
  typecheck.
- The repository-wide typecheck passes with the native dependency graph.
- The prerequisite PR's packed gate validates both environment-safe entries without
  changing the browser root.
- Existing locked web bundle baselines remain unchanged.
- Production Metro bundles complete for iOS and Android.
- Source-map gates prove the full native entries do not include guarded browser
  implementation files, including the web tooltip and portal runtimes.
- Retained-input gates prove the base native host and line consumer omit the
  optional native tooltip implementation.

A strict native consumer with `skipLibCheck: false` now gets past the Charts
DOM boundary and stops in `@types/d3-array`, whose `blurImage` declaration
references the browser global `ImageData`. An automated diagnostic accepts
only those two known errors, or a clean result after the upstream declaration
is fixed. The POC does not add a fake global or pull DOM libraries into native
to hide the upstream declaration problem.

The native declaration check and isolated esbuild boundary run in the normal
validation workflow. The eight-build iOS/Android Metro measurement remains a
local spike command rather than a mandatory CI gate.

Not performed:

- simulator or physical-device rendering;
- native component interaction tests;
- visual comparison against the conformance corpus;
- Hermes execution or profiling;
- 1k/10k-point interaction and memory tests;
- release application binary comparison;
- VoiceOver and TalkBack validation;
- Expo managed-workflow validation;
- motion, export, or Skia implementation.

## Production path

### Phase 1: shared behavior and a releasable SVG host

Extract interaction and tooltip policy, add native theme ownership, complete
the typography contract, replace the proof's responder policy, and add a
native-specific package gate. Keep the package scoped to the tested RN/RNSVG
pair.

Estimated effort: 3–5 engineering weeks.

### Phase 2: device confidence

Add bare and Expo fixtures, iOS and Android release builds, a platform-neutral
definition corpus, screenshot/geometry comparison, VoiceOver/TalkBack flows,
binary-size measurement, and sustained interaction benchmarks.

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
package private if the immediate goal is only optional ecosystem coverage.

Do not start a NativeScript adapter in parallel. The earlier
[native platform support spike](./NATIVE-PLATFORM-SUPPORT-SPIKE.md) remains the
architecture comparison; this proof increases confidence specifically for
React Native because its runtime, Metro pipeline, SVG implementation, and
interaction surface were exercised.

## Primary platform references

- [React Native 0.86 release](https://reactnative.dev/blog/2026/06/11/react-native-0.86)
- [React Native version support status](https://reactnative.dev/versions.html)
- [React Native layout events](https://reactnative.dev/docs/layoutevent)
- [React Native accessibility](https://reactnative.dev/docs/accessibility)
- [`react-native-svg` support and compatibility](https://github.com/software-mansion/react-native-svg)
- [Metro package exports and the `react-native` condition](https://metrobundler.dev/docs/package-exports/)
