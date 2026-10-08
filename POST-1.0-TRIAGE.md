# Post-1.0 batch

Reviewed on October 8, 2026. The base includes the approved research-package
removals and private-workspace renames. Public package names are unchanged.
All work remains local.

## Changes and verification

| Report         | Result                                                                                                                                                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #168 / PR #169 | Custom tooltip bodies own their card styling. Returning to the built-in body restores its styles. Chromium, Firefox, and WebKit verify transparent custom backgrounds, no border/padding/shadow, restored default styles, and transparent native popover backdrops.                                                                 |
| #170 / PR #173 | Dragging preserves candidate count at plot edges, avoids large jumps across uneven gaps, and cancels mouse ownership when an origin candidate disappears. Tests cover forward/reverse positions and changing candidates.                                                                                                            |
| PR #171        | Candidate lookup uses a key map and binary search. Tests cover reversed positions, nearest ties, singleton sets, Dates, absent keys, and invalid candidates.                                                                                                                                                                        |
| PR #172        | Accessible brush formatters receive start/end handle context. Existing one-argument formatters remain compatible.                                                                                                                                                                                                                   |
| #174           | Opt-in dodge compression fits offsets to available space while preserving radii and the measured coordinate. All six anchors, variable radii, unchanged roomy layouts, empty input, and impossible circle diameters are tested. Compression can overlap dots; impossible diameters throw a clear error.                             |
| #175           | Documented and tested application-owned client-only mounting with Strict Mode hydration and teardown. No new prerender prop.                                                                                                                                                                                                        |
| #176           | React client directives and published-entry verification, with Next.js client-boundary documentation. A separate Next.js application build was not run.                                                                                                                                                                             |
| #177           | Retain the scale returned by immutable range setters. Mapping, inversion, tick placement, responsive widths, and source immutability are tested. Approved size exception is included.                                                                                                                                               |
| #178           | Suppress unchanged focus notifications without skipping geometry repaint. Tests cover reentrant callbacks, cursor focus, replaced data, and changed group membership.                                                                                                                                                               |
| #179           | Document the requested alternative: inline states defer during data/entrance motion, while separate whenFocused marks update immediately. A regression proves the focus dot appears without interrupting the path animation. Independent tooltip timing is documented. Concurrent inline-state animation itself is not implemented. |
| #180           | Add ticks.line styling or false to hide stubs independently. Both axes and default output are covered. Existing ticks:false semantics remain documented.                                                                                                                                                                            |
| #181           | Document the requested resolved-position alternative using onRender, scene scales, and plot bounds. React coverage verifies alignment with SVG ticks across size changes and reversed axes. Framework slots, automatic HTML measurement, and HTML inclusion in SVG exports are not added.                                           |
| #182           | Accept first observer measurement precision only if both container bounds and CSS content dimensions stayed unchanged. Repeated first reports, transformed border boxes, and real fractional resizes are covered. All three browser engines preserve entrance motion.                                                               |
| #183           | Migration documentation covers the reported defaults and the compatible remedies above. This experience report is broader than one bug.                                                                                                                                                                                             |

Behavioral regressions fail before the corresponding fixes and pass afterward.
The new tick, dodge, and resize behavior preserves existing defaults.

## Size review

All figures use decimal kB and equivalent production builds. Each row measures
that change separately, without subtracting unrelated savings.

| Change                             | Maximum additional gzip |
| ---------------------------------- | ----------------------: |
| Immutable scale range              |      0.002 kB, approved |
| Focus notifications                |                0.125 kB |
| Axis lookups                       |                0.048 kB |
| Brush formatter context            |                0.006 kB |
| Brush translation and review fixes |                0.293 kB |
| Custom tooltip card ownership      |                0.096 kB |
| Tick-stub styling                  |                0.036 kB |
| Initial observer precision         |                0.122 kB |
| Bounded dodge                      |                0.203 kB |

Combined increases are not the sum of those maxima. Against the original
public runtime baseline, the largest measured consumer increase is 0.530 kB
gzip for the optional brush consumer. React increases by 0.219 kB; the larger
React Stats consumer increases by 0.352 kB. See
[the complete measured changes](./POST-1.0-BUNDLE-DELTA.md).

The user approved the complete measured increases on October 8. The 35 ceilings
that needed room now include their measured growth, preserving prior headroom.
The 10 exact universal baselines and 60 comparison cases were refreshed using
the repository commands. The new measurements exactly match the reviewed batch.

## Performance evidence

With 120,000 candidates and seven repeated measured runs, 1,000 valueAt/indexOf
lookup pairs took a median 306.20 ms in 1.0 and 0.30 ms with PR #171.
Initialization medians were 22.81 ms and 20.32 ms.

For 500 crowded 100-point dodge layouts, seven measured samples after warmup
gave medians of 391.62 ms before, 363.37 ms after with default overflow, and
362.72 ms with compression. These are local timing samples, not a claimed
speedup. No slowdown was observed in that workload. Compression adds two
linear passes only when requested; its existing packer still dominates this
case. Brush center selection is logarithmic, not a full candidate scan.

Unchanged focus pointer paths still return early. Initial precision handling
adds a bounds/style read on the first observer delivery and avoids a redundant
scene rebuild. Later observer updates retain exact size comparisons. Tick
styling adds no extra layout pass. No runtime dependencies or CI jobs were added.

## Validation

The full validation pass passed unit/framework tests, TypeScript, documentation,
catalog examples/index, adapter checks, packed exports/declarations, and
React Native/Expo consumer checks. All four maintained web example builds pass.

Full `pnpm validate` passes with the approved bundle limits and refreshed
comparison baseline. All 188 previews pass. Only the
custom nested-tooltip preview changed visually, as expected from removing its
outer card styles.

## V2 proposals excluded

- Changing ticks:false to leave labels visible.
- Changing the default focus distance from 48 pixels.
- Changing global tooltip motion inheritance.

No push, PR update, issue closure, merge, publish, or deployment was performed.
