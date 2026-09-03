# React Native Adapter

Use the experimental SVG host from `@tanstack/charts/react-native` only when the inspected application targets React Native. Keep claims scoped to devices and configurations actually tested.

## Exact Imports

Prefer exact subpaths to protect Metro's bundle and declarations:

```tsx
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { Chart } from '@tanstack/charts/react-native'
import { tooltip } from '@tanstack/charts/react-native/tooltip'
```

Use `@tanstack/charts/universal` only when one definition source intentionally trades bundle floor for cross-platform portability.

## Native Ownership

- `react-native-svg` paints the scene; install the SDK-compatible version for Expo or the documented peer range for bare native.
- Native layout supplies dimensions or aspect ratio.
- Typography and synchronous `measureText` must reflect native font family, style, stretch, letter spacing, direction, locale, and font scale.
- Gesture responder and accessibility actions replace DOM pointer/key plumbing.
- Application state owns rich controls and equivalent semantic inputs.

## Required Validation

- Target iOS and Android versions, simulator and physical device where supported.
- Bare and/or Expo release build matching the application.
- Font loading and dynamic type/font scale.
- VoiceOver/TalkBack names, actions, traversal, and dismissal.
- Touch target size, tooltip pinning, gesture cancellation, and linked controls.
- Rotation, layout changes, large data, memory, and sustained interaction performance.
- Metro bundle contents from the packed package.

Do not generalize from the current iOS simulator fixtures to broad native support.

Source: `packages/react-native-charts/README.md`; `NATIVE-PLATFORM-SUPPORT-SPIKE.md`; `API-FRICTION.md` F-154, F-171, F-173, F-256
