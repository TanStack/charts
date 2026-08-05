# TanStack React Native Charts

Experimental React Native SVG host for `@tanstack/charts` definitions and
scene graphs.

## Install

```sh
npm install @tanstack/react-native-charts @tanstack/charts @tanstack/charts-scales
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
import { scaleLinear } from '@tanstack/charts-scales/linear'
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

The bare fixture uses React Native 0.86.2 with `react-native-svg` 15.15.5. The
Expo 57 fixture uses `react-native-svg` 15.15.4 and renders in Expo Go on an iOS
simulator. It remains experimental: bare-native and Android simulators,
physical devices, gestures, accessibility, release builds, and performance
still need validation.
