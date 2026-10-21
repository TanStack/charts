---
title: 3D city map
description: Render metric-driven buildings with categorical districts, selection, camera controls, lighting, and weather in React.
---

The city map represents records as buildings. Building height encodes a nonnegative
metric, districts encode intersections of up to three categories, and health status
controls the building effects. It supports orbit, pan, zoom, selection, search,
district labels, day/night lighting, rain, snow, and reduced motion.

The city module is optional. Ordinary chart imports do not load Three.js or city
styles. Install `three@^0.180.0` alongside React and TanStack Charts, then import
the city entry and its stylesheet in your client component:

```tsx
'use client'

import { CityMap, type CityDatum } from '@tanstack/charts/react/city'
import '@tanstack/charts/react/city/styles.css'

const records: CityDatum[] = [
  {
    id: 'store-1',
    name: 'North store',
    metric: { label: 'Orders', value: 1200 },
    categories: [{ label: 'Retail', value: 'retail' }],
    status: 'healthy',
  },
  {
    id: 'store-2',
    name: 'South store',
    metric: { label: 'Orders', value: 700 },
    categories: [{ label: 'Retail', value: 'retail' }],
    status: 'critical',
  },
]

export default function Stores() {
  return (
    <CityMap data={records} ariaLabel="Store health" onSelect={console.log} />
  )
}
```

The compatibility entry is `@tanstack/react-charts/city`; its styles are at
`@tanstack/react-charts/city/styles.css`.

Each row needs a unique string or numeric `id`, a `name`, a metric with a nonempty
label and a finite nonnegative value, and a `status` of `healthy`, `warning`, or
`critical`. Supply one to three `{ value, label }` categories per row, with consistent
labels across rows. There may be at most three distinct categories in the dataset.
Alternatively, supply a district `mask` from 1 to 7. Empty data is supported.
Optional `updatedAt` and `statusChangedAt` fields accept ISO 8601 timestamps with
a timezone. Rows are never mutated; selection returns the original datum.

## Composition

`CityMap` includes the controls, search, details, and critical-record monitor.
`CityChart` accepts a memoized `defineCityChart(data)` definition and renders the
surface, tooltip, and optional district labels. Its selection callback uses the
usual TanStack `ChartPoint`; `CityMap.onSelect` receives the datum instead.
`cityMark`, `cityFocus`, and `createCityRenderer` are also exported for composition
with the existing custom renderer host. Use one city mark per renderer surface.
Definitions can be shared across mounted charts; each mount owns its camera,
WebGL context, focus resolver, and resource lifetime.

## Controls and appearance

Use `view="iso"` or `view="top"`, `weather="none" | "rain" | "snow"`, and
`lightingMode="auto" | "day" | "twilight" | "night"`. Automatic lighting follows
the local clock. Weather is supplied by the application; the package makes no
weather or data requests.

`life`, `effects`, `autoRotate`, and `showDistrictLabels` have optional change
callbacks for controlled use. `showControls`, `showSearch`, `showDetails`,
`showMonitor`, `showCompass`, and `showInstructions` control the included UI.
`showEnvironmentControls` enables the lighting and weather selectors.
`busy` disables interactions while the application updates its data.

Pass a `CityChartHandle` ref for `zoom`, `view`, `select`, `deselect`, `cancel`,
`capture`, `play`, `scrollIntoView`, and `stats`. Selection accepts an options bag:
`ref.current?.select(record, { focus: true, maxZoom: true })`.

The stylesheet supplies default theme variables. Override `--atlas-city-*`
properties in your own CSS, or import `city/theme-tailwind.css` and set
`theme="tailwind"` to use host Tailwind theme variables. Set `theme={null}` to
provide all variables yourself. The map needs a container with a measurable width
and reserves at least 520 pixels of height.

## Rendering and accessibility

Use a client boundary for React Server Components. Server rendering outputs an
accessible placeholder; WebGL is allocated only when the chart mounts in a browser.
WebGL initialization or context loss produces a visible error message. The map
honors reduced motion, exposes keyboard focus/selection through the chart host,
and supports `+`/`-` for zoom, `0` for the isometric view, and Escape to clear
selection. Controls and descriptions follow the browser language (`en-US` and
`pt-BR`; other languages use English).

Dispose charts by unmounting them. Unmounting releases observers, listeners,
animations, geometry, materials, textures, and the WebGL renderer.

## Local example

Run `pnpm dev:charts-react` from the repository root and open `/city/` to try
the complete map, including search, selection, weather, and mount/unmount controls.
Run `node scripts/check-city-map.mjs` for the Chromium interaction check.

## Component and engine contracts

| Type                       | Contract                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `CityMapProps<T>`          | Full-map data, controlled settings, visibility flags, datum selection, and ref.                                          |
| `CityChartProps<T>`        | Definition, selected datum, renderer settings, callbacks, and render-prop children.                                      |
| `CityChartState`           | Render-prop state containing readiness, localized error, environment controls, and weather override.                     |
| `CityDefinitionOptions<T>` | Definition options plus an optional precomputed city layout.                                                             |
| `CityLayout<T>`            | Positioned copies of the input rows, district bounds and anchors, road bounds, and city center.                          |
| `CityEngine<T>`            | Mounted renderer service passed to lifecycle callbacks; owns activity, view, zoom, focus, selection, data, and disposal. |
| `CityRendererOptions<T>`   | Initial view/activity settings and mount, data, destroy, error, hover, projection, and frame callbacks.                  |
| `CityStats`                | Draw calls, triangles, point count, lighting, and weather diagnostics returned by the handle.                            |
| `CityView`                 | Isometric (`iso`) or overhead (`top`) camera view.                                                                       |
| `CityWeather`              | Application-supplied `none`, `rain`, or `snow` effect.                                                                   |
| `CityLighting`             | Local-clock `auto` mode, or fixed `day`, `twilight`, or `night`.                                                         |
| `EnvironmentControlsProps` | Controlled lighting/weather values, change callbacks, and an optional disabled state.                                    |

`EnvironmentControls` renders the lighting and weather selectors independently of
the full map. Its callbacks receive the next mode. `CityRendererOptions.onData`
receives the mounted engine and `{ resetView }`; `hover` receives the datum and an
optional `{ event }` context. Other lifecycle callbacks receive one engine or error.

Stylesheet entry points are
`@tanstack/charts/react/city/styles.css`,
`@tanstack/charts/react/city/theme-default.css`, and
`@tanstack/charts/react/city/theme-tailwind.css`.
