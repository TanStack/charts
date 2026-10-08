# Post-1.0 issue pass

Reviewed on October 8, 2026. Base: `d7ca749e`, including the approved local
research-package cleanup. Public runtime output at this base matches the 1.0
runtime. Nothing in this pass has been pushed, merged, published, or deployed.

## Implemented compatible changes

### Expanded batch checkpoint

This checkpoint supersedes the earlier prototype and validation status below.
The expanded batch is not release-ready. No external writes were made.

| Report         | Local implementation                                                   | Maximum additional gzip cost |
| -------------- | ---------------------------------------------------------------------- | ---------------------------: |
| #177           | Approved scale fix, commit `c76566f1`                                  |           0.002 kB, approved |
| #178           | Stable callbacks, with changed-data and group-membership regressions   |   0.125 kB, pending approval |
| PR #171        | Key map and binary search, reverse, tie, singleton and Date coverage   |   0.048 kB, pending approval |
| PR #172        | Compatible handle context for accessible formatters                    |   0.006 kB, pending approval |
| #170 / PR #173 | Preserve count, avoid uneven-gap jumps, cancel removed-origin gestures |   0.293 kB, pending approval |
| #168 / PR #169 | Custom card ownership and default-style restoration                    |   0.096 kB, pending approval |

Costs were measured separately with equivalent production builds, not offset
against reductions elsewhere. Only #177's ceiling adjustments and universal
baseline changes are approved. Other limits remain unchanged.

For 120,000 candidates, seven repeated runs measured a median 306.20 ms for
1,000 lookup pairs in 1.0 and 0.30 ms with PR #171. Initialization medians were
22.81 ms and 20.32 ms. This is focused evidence, not a whole-chart performance
claim. The brush center search is logarithmic, not a scan per pointer event.

All unit-test targets passed, including 2,202 default tests before three
additional interaction regressions. Root TypeScript and all four maintained
web example builds passed. Full validation, browser verification, and final
preview regeneration remain pending. The comparison baseline refresh is now
authorized, but needs rerunning after source is stable and numeric changes
are approved. Its current working copy is not final provenance.

#174, #179, #180's tick styling, #181, and #182 still need implementation or
verification. They have not been silently moved to v2. The v2-only default
changes listed below remain excluded.

### Earlier pass

- #176: React public entries and implementations declare `use client`.
  Seven compilation regressions fail on the base and pass with the directives.
  The existing packed-package gate checks every React import entry, including
  entries copied into the unified package. Next.js setup documents data-only
  RSC props and client-owned definitions. A full Next.js application build has
  not been run.
- #175: document the requested application-owned mount-after-hydration
  alternative, without adding a `prerender` prop. A Strict Mode regression
  verifies empty server output, reserved space, hydration without recoverable
  errors, frame reuse, mounted SVG, and teardown.
- #180, documentation portion: explain `ticks: false` versus `ticks.size: 0`
  and the separate baseline. Tick-stub styling is still an open feature.
- #183, documentation portion: add a Recharts migration guide covering
  observed defaults, option mappings, missing-value focus rows, and short
  tooltip motion. The experience report is not a single resolved bug.

## Budget-blocked prototype

#177 is reproduced and fixed on local branch `taren/post-1.0-scale-range`,
commit `27c93088`. `range()` can return a new scale, so the host must retain
that result for mapping, inversion, and tick placement. The authored instance
stays unchanged across responsive widths. All 30 configured-scale tests and
root TypeScript pass on that branch.

The direct two-line fix adds 0.002 kB minified to affected consumer bundles.
Across those bundles, gzip changes range from -0.001 to +0.002 kB. Several
ceilings and exact baseline locks fail. A separate-constant implementation
was also measured, it reduced minified size but increased gzip more, so it was
not retained. Neither implementation changes the number of scale calls or
its asymptotic work. No timing benchmark is claimed for this prototype.

Keep the prototype out of the ready branch until a compliant implementation
or an explicitly reviewed budget exception is approved. Do not change size
limits or hide its cost behind unrelated optimizations.

## Remaining 1.x work

| Report                                   | Existing work       | Next step                                                                                                                                                  |
| ---------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #168, custom tooltip portal chrome       | PR #169, `07bf993c` | Fix style ownership and custom-to-default restoration, add browser coverage. The proposed reset does not restore built-in card styles.                     |
| #170, brush selection shrinks            | PR #173, `4861e96c` | Preserve cardinality without jumping across uneven value gaps; handle candidate changes during a gesture. Both review findings apply to the proposed code. |
| PR #171, large-axis performance          | `d73c50c0`          | Verify forward/reverse axes, ties, singleton and Date inputs, and lookup costs before accepting the map and binary-search implementation.                  |
| PR #172, accessible brush formatter      | `2ca53e42`          | Additive second-argument context is compatible with one-argument formatters; verify packed types, allocations, and size.                                   |
| #174, bounded dodge layouts              | No PR found         | Keep overflow as the default, investigate an opt-in bounded layout and define what happens when fixed radii cannot fit.                                    |
| #178, repeated focus callbacks           | No PR found         | Add a feedback-loop regression and distinguish unchanged focus from changed group membership and changed data. Preserve geometry repainting.               |
| #179, focus during entrance motion       | No PR found         | Reproduce concurrent motion and focus before changing transition ownership. Do not silently change the documented tooltip motion inheritance.              |
| #180, tick-stub paint                    | No PR found         | Investigate opt-in styling without changing default paint or the meaning of `ticks: false`.                                                                |
| #181, framework tick content             | No PR found         | Investigate an additive render slot or a documented resolved-position overlay. Framework DOM must not silently change Canvas, Native, or export behavior.  |
| #182, fractional resize cancels entrance | No PR found         | Reproduce CSS serialization versus ResizeObserver precision, then normalize measurement without ignoring real resizes.                                     |

These are not all fixed, tested, or ready to merge. Additive features do not
need v2 merely because they require more work. New features must remain
opt-in and tree-shaken, and routine CI must stay fast.

## V2-only behavior changes

- Reinterpreting `ticks: false` to leave labels visible would change existing
  1.x output. Keep the current behavior in 1.x and consider that semantic
  change only for v2. The existing `size: 0` option needs no breaking change.
- Changing the default focus distance from 48 pixels to an adaptive distance
  changes when empty space clears focus. Keep explicit distance options in
  1.x, consider a new default only for v2.
- Changing documented tooltip motion inheritance globally would change
  existing chart behavior. Keep explicit tooltip motion overrides in 1.x.

No breaking runtime or public-type change is included in the ready branch.

## Measurement setup

Node 24.18.0, pnpm 11.15.1, esbuild 0.27.7, production ESM, ES2022, minification
and tree shaking enabled. No runtime dependencies or benchmark limits changed.
All 146 maintained size entries pass their existing gate. Their output matches
the starting output; the five removed research entries are not reinstated.
The 60 library-comparison bundles also match the recorded size metrics, limits,
and tolerances exactly. The official preview generator regenerated all 188
previews, with only their source fingerprint changing and no SVG changes.

Full validation is not yet green. Its final pass fails only
`charts-workspace:benchmark-check` on the stale source fingerprint. The
approval checker rejected the official
comparison-baseline refresh twice, including after read-only proof that every
numeric measurement and limit is unchanged. Its source fingerprint remains
stale. Human approval is needed to refresh only source provenance, timestamp,
and the already-released version metadata. The committed comparison baseline
has not been modified. This is separate from #177's real bundle growth.

The first validation pass ran 2,191 default tests across 285 files successfully,
along with framework tests, packed packages, bare and Expo Metro consumers,
documentation, formatting, and TypeScript. All four maintained web example
builds pass. No timing benchmark is claimed, the compatible changes leave
measured minified browser instructions byte-identical to the base.

Refreshed the selected reports and all four PR heads once after the review.
No changed PR head or new post-1.0 report was found in that refresh.
