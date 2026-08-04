---
'@tanstack/charts': minor
---

Add renderer-native crosshair guides and shared focus/free cursor controllers across SVG, Canvas, motion, and React Native rendering. Focus-filtered rule marks now use non-interactive semantic anchors, so `whenFocused(ruleX(...))` and `whenFocused(ruleY(...))` work without adding hit targets. Built-in axis focus modes now select the painted mark under the pointer before applying axis grouping or snapping.
