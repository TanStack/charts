<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20React%20Native%20Charts&theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20React%20Native%20Charts"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png?title=TanStack%20React%20Native%20Charts"
      alt="TanStack React Native Charts"
      width="900"
    />
  </picture>
</div>

# TanStack React Native Charts

This compatibility package remains supported for existing applications. New
applications use the experimental React Native SVG host from
`@tanstack/charts/react-native`.

## Install

```sh
npm install @tanstack/charts
```

Expo applications also need the SDK-compatible SVG renderer:

```sh
npx expo install react-native-svg
```

Bare React Native applications can install it directly:

```sh
npm install react-native-svg@^15.15.4
```

Run `bundle exec pod install` from `ios/` after adding it to a bare iOS
application.

## Usage

```tsx
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'
import { Chart } from '@tanstack/charts/react-native'
import { tooltip } from '@tanstack/charts/react-native/tooltip'

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  scales: {
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
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

## Typography

`fontFamily`, `fontStyle`, `fontStretch`, `letterSpacing`, `direction`,
`locale`, and `fontScale` are passed to the synchronous `measureText` contract.
The SVG painter applies the corresponding family, style, stretch, spacing, and
font scale. If native font metrics become available asynchronously, keep them
in application state and render the chart again with an updated `measureText`
function or typography prop.

Exact core subpaths keep Metro from retaining unrelated universal-entry
exports. The `/universal` barrel remains valid when portability matters more
than the native bundle floor.

The bare fixture uses React Native 0.86.2 with `react-native-svg` 15.15.5. The
Expo 57 fixture uses `react-native-svg` 15.15.4 and renders in Expo Go on an iOS
simulator. It remains experimental: bare-native and Android simulators,
physical devices, gestures, accessibility, release builds, and performance
still need validation.
