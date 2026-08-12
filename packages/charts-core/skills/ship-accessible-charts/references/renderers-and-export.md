# Renderers and Export

## Renderer Decision

| Requirement                                         | Choose                       | Tradeoff to verify                                                   |
| --------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| Visible server geometry, vector output, DOM styling | default SVG                  | scene node count and DOM interaction cost                            |
| Large paint workload, raster-first presentation     | Canvas                       | first pixels after client mount; no vector/accessibility descendants |
| Deterministic server or file output                 | `renderChartSvg`             | explicit dimensions, text metrics, resource IDs                      |
| Spring/timing cascade                               | injected `motion()` renderer | bundle, reduced motion, interruption                                 |
| Native application                                  | React Native SVG host        | device, typography, gestures, accessibility, Metro                   |
| Custom platform                                     | renderer/host extension      | scene contract, lifecycle, fallback, cleanup                         |

## Export Decision

| Need                                       | Path                                             |
| ------------------------------------------ | ------------------------------------------------ |
| DOM-free SVG from a definition/scene       | `createChartScene` or runtime + `renderChartSvg` |
| Mounted SVG with computed browser styles   | `serializeChartSvg` / `downloadChartSvg`         |
| PNG, JPEG, or WebP from mounted SVG/Canvas | `renderChartImage` / `downloadChartImage`        |
| Raw Canvas base bitmap only                | selected Canvas surface bitmap APIs              |

## Artifact Policy

- Set explicit output dimensions; browser responsiveness is not a file-size policy.
- Set theme and raster background for the destination medium.
- Scope gradients/clips with `idPrefix` when artifacts share a document.
- Decide whether focused/selected presentation belongs in the artifact.
- Embed or inline fonts, images, and CSS when the consumer cannot reach application resources.
- Give the exported state its own meaningful name and description.
- Pair Canvas or static artifacts with text/table context when interaction was essential.

## Lifecycle Verification

1. Server/static render has no DOM dependency.
2. Browser host adopts or paints the intended surface.
3. Resize preserves semantic domains and current state.
4. Renderer replacement cleans up its previous host controls.
5. Export after update/focus includes exactly the intended scene layers.
6. Destroy releases observers, listeners, tooltip mounts, animation frames, and renderer resources.

Source: `docs/guides/exporting.md`; `docs/guides/ssr-and-hydration.md`; `docs/reference/rendering-and-export.md`
