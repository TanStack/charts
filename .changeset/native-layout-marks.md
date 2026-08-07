---
'@tanstack/charts': minor
---

Add native waffle, optional spatial hexbin, Delaunay link, Voronoi,
scalar-grid contour, density contour, responsive treemap and sunburst marks,
responsive Sankey composition, dot dodge layouts, typed wide-to-long fold and
polar pie transforms, and optional static force-layout and tidy-tree
transforms. Polar charts add radius- and angle-extending bar marks, responsive
radius scale ranges, post-scale text and rule offsets, and automatic outside
text anchors. These marks, layouts, and transforms own their data- or
plot-space geometry, so examples no longer need to copy scales, author D3
paths, flip hierarchy coordinates, manually pivot metric fields, calculate
responsive label radii or bar rings, or hide hierarchy and settled network
coordinates in case utilities. The exact Sankey entry accepts semantic graph
rows and composes ordinary child marks over immutable final-pixel node and link
values without exposing D3 mutation cleanup.

Resolved dot placement is also extensible through `createDotLayout`, which
receives final plot bounds, measured coordinates, and radii while Charts keeps
row identity, interaction, state, and motion ownership. Treemap tiling, Sankey
alignment, and named static-force factories accept D3-compatible callables in
addition to the built-in shorthands; all operate over private layout copies and
retain validation, immutability, and source lineage.

Cartesian bars add an orientation-neutral `maxThickness` constraint that caps
their final painted categorical size after grouping and inset, without asking
definitions to estimate responsive chart bounds. Absolute inline-state inset
overrides retain their existing semantics without escaping the cap.

Add eager `boxRows` preparation plus raw-row `boxX` and `boxY` marks with Tukey
quartiles, observed whiskers, outlier lineage, transposed orientation, and one
summary interaction target per category. The marks reuse the public semantic
rows without exposing presentation keys. Add `compositeMark` for namespaced
composition of ordinary child marks with preserved datum, channel,
interaction, and motion ownership.

Stack layouts add inside-out series order and a zero-origin wiggle policy.
Areas, bars, and row transforms now share D3 inside-out ordering, dense sparse
cell handling, and a single global baseline translation, so streamgraphs can
consume tidy source rows without case-owned pivoting or interval generation.
Anchored stacks additionally translate ordered nonnegative series around a
named series fraction, so diverging Likert charts can keep counts in ordinary
bar definitions without manually materializing signed endpoints.

Add an eager `waterfall` transform for ordered signed contributions, cumulative
start/end intervals, increase/decrease classification, optional grouped net
totals, and direct source lineage.

Add eager `mosaicY` and `mosaicX` transforms for two-dimensional proportional
intervals over explicitly aggregated category pairs. They preserve semantic
categories, both normalization totals, stable source order, and direct lineage
for ordinary rectangle and text marks. Mosaic and pie share an overflow-safe
proportional interval allocator; waffle keeps its distinct rounded unit-fragment
and resolved packing policy.

Add `lineX` as the strict transposed counterpart to `lineY`, sharing grouping,
keys, gaps, styling, interaction, motion, and renderer-neutral path output.

Add eager `linearRegressionRowsY` and `linearRegressionRowsX` preparation plus
`linearRegressionY` and `linearRegressionX` composite marks with centered
least-squares fits, optional grouped Student-t confidence bands, semantic-domain
sampling, aggregate lineage, transposed geometry, and one interactive fitted
line per group. The marks reuse the public semantic rows without exposing
presentation keys.

Add `differenceY` and `differenceX` composite marks that split two source-row
series at exact interpolated crossings, paint stable positive and negative
lobes, preserve derived lineage, and keep both raw boundary lines interactive.

Add semantic `ridgelineY` / `ridgelineX` and `violinY` / `violinX` marks for
prepared normalized profiles. Both derive responsive displacement from complete
point or band category domains without numeric category surrogates. Ridgelines
own one-sided overlap and optional outlines; violins own mirrored envelopes
while binning, normalization, density estimation, and summaries remain explicit
definition concerns. Tick marks add an optional category-step-relative `span`
for responsive summary bars without authored endpoint coordinates.

Add exact-subpath focus guide marks with renderer-neutral rules, markers,
measured labels, raw datum identity, and stable retargeting keys. Retargetable
`whenFocused` marks now enter at the active geometry, update through ordinary
mark motion, preserve interrupted spring velocity, and exit on focus clear
across SVG, Canvas, and React Native surfaces. Candidate ownership is
collision-safe for delimiter-containing keys, primitive rows match by value
and source position, and mark-state transitions no longer override another
mark's focus motion.

Add an exact-subpath controlled signal and a controlled interactive categorical
legend. Applications retain the visible-series snapshot while Charts owns
domain-ordered toggling, post-domain geometry and focus filtering, responsive
top or bottom layout, stable native browser buttons, and static SVG fallback.
Static color and gradient legends also support top or bottom placement.

Add exact-subpath controlled keyed selection with `keyedSelection` and
`whenSelected`. Host activation maps ordinary chart points to application keys
through a controlled signal. Selected marks keep their complete domain
contribution, then paint only matching point-owned geometry as a decorative
overlay without duplicate focus or activation targets.

Add exact-subpath `decorative(mark)` composition. It keeps an ordinary or
resolved-layout mark's scale contribution, layout measurement, motion,
post-domain work, and painted geometry while removing interaction ownership and
exposing `never` point types. This lets one layer in a line-plus-dot composition
own focus, tooltips, and activation without changing pointer affinity.

Add exact-subpath `brushX` as a controlled chart behavior. It resolves against
the final x scale and plot bounds, owns D3 pointer/touch lifecycle, semantic
snapping, reverse normalization, cancellation, keyboard slider handles, host
teardown, and a renderer-neutral static fallback. Applications retain the
accepted range, fixed-window policy, linked-view layout, and persistence.

Add exact-subpath `continuousCursor` as a controlled chart behavior for an
unsnapped numeric or temporal x/y position. It resolves both final scales and
plot bounds, paints rules, a marker, and optional axis labels, owns transient
pointer/touch previews, click or tap pinning, leave/cancel cleanup, Escape and
toggle clearing, host teardown, and a renderer-neutral static fallback.
Applications retain semantic sliders, status text, formatting policy, and
persistence.

Add exact-subpath `zoomX` as a controlled continuous horizontal-window
behavior. It owns focus-gated pointer-anchored wheel zoom, horizontal-wheel and
drag pan, touch and pinch gestures, keyboard zoom/pan/reset, final-scale
inversion, clamping, cancellation, accessibility, and host teardown while D3
Zoom remains private to the optional subpath. Applications retain the accepted
semantic window, visible-row and y-domain policy, status, reset controls, and
persistence.

Add exact-subpath `handleX` as a controlled, candidate-bound horizontal scale
handle. It owns final-scale track, rule and handle painting, nearest-candidate
snapping, pointer and touch capture, preview, commit and cancellation, keyboard
slider semantics, resize synchronization, and host teardown without a D3
runtime. Applications retain playback or editing state, controls, validation,
status, and persistence.

Tooltip definitions add `visibility: 'pinned'` for focusable charts whose rich
detail should mount only after activation. Pointer pinning now repaints inline
pinned mark states, and SVG and Canvas restore base paint when tooltip
dismissal clears focus completely.

Facet definitions now preserve the datum type and identity emitted by their
child marks, type group rows as nonempty, and apply motion to the child datum.
Facets and the new exact-subpath `viewGrid` definition factory share one
full-chart scene adoption kernel with stable point and mark namespaces.
`viewGrid` arranges normal child definitions in named fixed/flexible tracks and
can align or strictly share resolved plot ranges without reserved-domain
coordinates or manual scene plotting.

Add exact-subpath `composeViews` for heterogeneous complete chart definitions.
Opaque `fill`, `grid`, `layer`, and anchored `inset` utilities compose responsive
frames, while `shareX`, `shareY`, `alignX`, and `alignY` keep scale coordination
separate from layout. `viewGrid` remains as concise grid syntax over the same
composition engine. Child pointer and cursor settings now fail explicitly
instead of disappearing at the adoption boundary; the outer definition owns
that lifecycle.

Controlled brush, cursor, and handle behaviors repaint the application-accepted
snapshot after a rejected terminal proposal. Continuous cursor axes invert the
resolved scale by default while retaining explicit value mapping and
coordinate-only overrides. Keyboard-disabled zoom no longer advertises or
enters focus for keyboard semantics it does not implement.

Interrupted motion removes exact stale exit nodes and presentation state while
preserving live replacements. Composite motion inheritance retains authored
path timing, including rolling-path policy.

Axis tick labels now accept per-candidate font size, font weight, opacity,
anchor, and x/y offset values. Accessors receive the semantic tick value,
stable pre-thinning index, resolved position, and bandwidth; resolved
presentation participates in thinning, automatic margins, facets, and motion.
