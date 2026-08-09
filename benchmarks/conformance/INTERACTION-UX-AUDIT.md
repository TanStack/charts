# Interaction UX audit

Date: 2026-07-27

Scope: conformance cases 80–92.

The current interaction scenarios prove that the intended state transitions
work under idealized input. They do not yet prove that each interaction is
discoverable, readable, accessible, resilient to real input, or visually
correct after the interaction.

All thirteen cases pass their current conformance checks. Several are still
below production quality.

## Method

The audit combined:

- hands-on use in the live catalog at 320 and 640 px;
- retained visual coverage at 320, 640, and 960 px, light and dark, initial and
  revised data;
- pointer, keyboard, drag, wheel, scroll, resize, and edge-position checks;
- source review of the TanStack and reference implementations;
- comparison of scenario assertions with the rendered evidence they omit.

References are comparison inputs, not product-quality authorities. Some
Recharts and ECharts examples have their own accessibility, responsive, and
interaction defects.

## Summary

| Case | Severity | Primary failure                                                  |
| ---- | -------- | ---------------------------------------------------------------- |
| 80   | High     | Grouped tooltip escapes the chart and focus can remain stale     |
| 81   | High     | Legend contrast, focus retention, and touch targets are weak     |
| 82   | High     | Linked selection is pointer-only and one-way                     |
| 83   | High     | The overview is pointer-only and can exceed a short container    |
| 84   | High     | Pin state is not persistent visually; the tooltip obstructs data |
| 85   | High     | Lane labels scroll away, destroying schedule context             |
| 86   | Medium   | A successful append looks like a failed action                   |
| 87   | High     | Sparse-date cursor dead zones and unreadable linked state        |
| 88   | High     | The free cursor exposes no values or non-pointer control         |
| 89   | High     | The brush is not actually revisable or accessible                |
| 90   | High     | Wheel handling traps scroll and lacks practical alternatives     |
| 91   | High     | “Playback” is an inaccessible pointer-only scrubber              |
| 92   | High     | The editable handle is pointer-only and underspecified           |

The main ownership split is:

- **Case/application:** visible affordances, feedback, semantic controls,
  responsive composition, and cancellation policy.
- **Documentation/skills:** choosing `maxFocusDistance`, composing D3
  interaction utilities, and providing accessible alternatives.
- **Tooling:** proving rendered interactive state, focus, accessibility, touch,
  cancellation, and edge behavior.
- **Charts core:** focus cleanup on blur/cancel and per-axis guide visibility.

## 80 — Snapped axis pointer with grouped tooltip

What works:

- `focusGroupX` returns one point per series.
- The tooltip has rich rows, swatches, locale formatting, and a polite live
  region.
- Pointer leave and keyboard date navigation work.

Problems:

- At 320 px, the August tooltip extends 46.75 px beyond the chart. Its
  position is always centered on the focused x coordinate without clamping or
  alignment flipping.
- Moving keyboard focus to another control can leave the crosshair and tooltip
  visible. The host listens for focus-in and keys, but does not clear unpinned
  focus on focus-out.
- At wider sizes, the default 48 px focus distance can create empty pointer
  zones between sparse x values.
- The chart provides no legend or visible keyboard instruction before use.

Correct fix:

- Measure and clamp or flip the external tooltip at both horizontal edges.
- Clear transient host focus on focus-out and pointer cancellation.
- Set an explicit axis-pointer distance policy, based on half the maximum
  interval or continuous nearest-x behavior.
- Add a compact legend and interaction description.

Missing gates:

- first and last x positions;
- midpoint behavior at 960 px;
- rendered tooltip bounds and content;
- rendered crosshair coordinates;
- keyboard blur, tap, and revision preservation.

## 81 — Interactive series legend

What works:

- Native buttons expose `aria-pressed`.
- Pointer and Enter toggle the intended series.
- The y domain remains fixed while a series is hidden.

Problems:

- Orange text on white is about 2.80:1. Applying `opacity: 0.45` to the hidden
  control reduces contrast further.
- Native keyboard use can lose focus when the legend is rebuilt, requiring the
  user to tab back before continuing.
- The controls are about 23 px tall, use the default cursor, and have little
  hover or focus-visible treatment.
- Both series may be hidden without an empty-state explanation.
- TanStack and Recharts use different tick intervals despite the case
  emphasizing a fixed quantitative frame.

Correct fix:

- Keep stable button nodes and update their pressed state in place.
- Keep text in `CanvasText`; use a color swatch, strike, or explicit off icon
  rather than low opacity.
- Provide at least a 44 px hit area and clear pointer, hover, and focus-visible
  states.
- Decide and communicate whether hiding every series is allowed.

Missing gates:

- repeated keyboard toggles without refocusing;
- Space activation and focus retention;
- contrast and target size;
- rendered y-domain/ticks rather than the case-owned domain constant.

## 82 — Linked chart and data table selection

What works:

- Pointer selection paints a selected point and sets `aria-selected` on the
  matching row.
- Stable IDs correctly link the chart and table.

Problems:

- TanStack explicitly disables chart keyboard behavior. Recharts points are
  also non-focusable.
- The table is a passive output. Rows cannot select their matching points, so
  the link is one-way.
- Selection does not move focus or announce the chosen period, region, and
  value.
- Visible dots are about 9 px across. TanStack nearest-point resolution helps,
  but the reference still depends on the small circle.
- Table spacing and numeric alignment are browser defaults.

Correct fix:

- Enable Charts keyboard navigation and Enter/Space selection.
- Make rows keyboard- and pointer-selectable, with shared selection state.
- Add a polite selection summary and visible focus treatment.
- Provide larger transparent hit targets and deliberate table layout.

Missing gates:

- keyboard selection and row-to-chart selection;
- deselection and revision updates;
- rendered selected-point overlay;
- live announcement and focus state;
- touch target size.

## 83 — Focus and context time window

What works:

- Clicking the overview snaps to a stable month.
- The four-month detail window and update persistence are correct.
- The selected band moves with the controlled window.

Problems:

- The overview is pointer-only and has no semantic value, keyboard path,
  handles, or direct range editing.
- It has no visible ticks, instruction, selected-date marker, or pointer
  cursor. Its accessible name is the only interaction hint.
- At a requested height of 180 px, hard minimums produce 276 px of content,
  placing the overview 96 px outside the container.
- The local driver derives the expected detail state from the source data; it
  does not prove that the detail domain or band actually updated.

Correct fix:

- Use an optional injected `d3-brush` for direct manipulation or expose an
  equivalent semantic range control.
- Add arrow/Home/End behavior, current range text, focus styling, and visible
  instructions.
- Define a real minimum height or switch to a compact layout that can collapse
  the overview.

Missing gates:

- keyboard, touch, drag, and handles;
- rendered detail domain and selection-band geometry after interaction;
- short-height containment;
- visible current range and focus state.

## 84 — Pinned tooltip with a nested chart

What works:

- Hover and pinned state are separate.
- Click, second click, and Escape update the controlled pinned ID.
- The nested chart host is mounted and destroyed correctly.

Problems:

- After pointer focus leaves, the pinned main point is no longer visually
  selected. The tooltip persists without a persistent chart anchor.
- At 320 px, the fixed top-right tooltip can cover the selected point and a
  meaningful portion of the chart.
- `pointer-events: none` makes the nested chart presentation-only. There is no
  close button or click-outside dismissal.
- The mini chart uses `guides: false`, so all period context disappears.
  Charts currently cannot keep the x guide while hiding only the y guide.
- The nested chart name does not expose its period/value data.
- Escape is attached to `document`, so an unrelated control can dismiss this
  component.

Correct fix:

- Include `pinnedId` in the main definition and render a persistent selected
  overlay.
- Use collision-aware placement or a dedicated narrow-layout panel.
- Add a close button, scoped Escape handling, and appropriate tooltip
  interaction.
- Add per-axis guide visibility in core so the mini chart can retain x labels.
- Supply semantic history text or a compact table.

Missing gates:

- selected-point styling after pointer leave;
- tooltip bounds at every point and narrow width;
- close button, keyboard pinning, and scoped dismissal;
- title, period labels, bar values, and update preservation;
- an interaction-state screenshot with the tooltip open.

## 85 — Scrollable resource timeline lanes

What works:

- Native horizontal overflow works.
- The viewport is keyboard-scrollable when focused.
- Scroll position survives in-place data updates.

Problems:

- At 320 px and `scrollLeft = 260`, every lane label is fully offscreen. The
  visible tasks can no longer be mapped to resources.
- Three ticks across 960 px of content provide almost no date precision in the
  initial viewport.
- Task names exist in the data but are never rendered.
- Status is color-only with no legend or tooltip. Several fills are below 3:1
  against white.
- Hidden scrollbars and clipped bars provide weak overflow discovery.
- The geometry gate samples only part of the task set and never samples the
  scrolled state.

Correct fix:

- Render a fixed or sticky HTML lane rail while only the time plot scrolls.
- Use responsive weekly tick density and let the declared viewport own
  clipping.
- Add task labels or rich details, a redundant status legend, an overflow cue,
  and an accessible schedule alternative.
- Either disable generic point focus intentionally or implement a real task
  tooltip and keyboard path.

Missing gates:

- lane-label visibility after scroll;
- scrolled task geometry and date context;
- keyboard and touch scroll;
- task names, status meaning, overflow cues, and color-independent state.

## 86 — Streaming window preservation

What works:

- Stable keys and locked-domain state are correct.
- The append button is native and keyboard-operable.
- The sample count is exposed through a polite live region.

Problems:

- Appending Jan 13 leaves the Jan 5–12 chart byte-for-byte unchanged. The
  counter changes, but the interface never explains that the new point is
  outside the locked viewport.
- There is no “Follow latest,” unlock, or navigation action.
- The default button is about 109 × 21 px, and the fixed one-row control layout
  is fragile for longer locale strings.
- The chart has no keyboard inspection or data alternative.

Correct fix:

- Announce the added date and why it is not visible.
- Add “Follow latest” and “Unlock viewport” controls.
- Use a wrapping control row and comfortable touch targets.
- Enable keyboard focus/tooltips or provide a compact data table.

Missing gates:

- rendered live-region text;
- Enter/Space, focus retention, and target size;
- follow-latest/unlock behavior;
- rendered revision changes, not only state values.

## 87 — Synchronized cursors across views

What works:

- Exact-date pointer movement updates both rendered crosshair lines.
- The two charts retain independent quantitative domains.
- Shared state survives data revisions.

Problems:

- At 960 px, adjacent April and May points are 111.6 px apart. Their midpoint
  is 55.8 px from either point, beyond the host default
  `maxFocusDistance = 48`; both cursors disappear instead of snapping.
- Both charts set `keyboard: false`.
- Two vertical lines are the only feedback. There is no shared date, pair of
  values, secondary active point, or live announcement.
- The chart images are named separately but do not explain that they are
  linked.
- Pointer cancellation is not handled by the core host.

Correct fix:

- Configure a continuous nearest-x distance for the axis cursor and bound
  interaction to the plot.
- Enable keyboard navigation and link its focus callback across both hosts.
- Add one shared date/value panel and active markers in both views.
- Add tap-to-pin/Escape behavior and a linked-view group description.
- Document the relationship between `focusGroupX` and `maxFocusDistance`.

Missing gates:

- midpoints between sparse dates and edge positions;
- secondary-view-originated interaction;
- keyboard, touch, pinning, and cancellation;
- rendered date/value content and complete crosshair extents.

## 88 — Free two-dimensional cursor

What works:

- Pointer coordinates are normalized correctly.
- The DOM-only overlay paints without rerendering the chart.
- The documented D3 scale-copy/invert pattern is sufficient.

Problems:

- The cursor displays no x or y value. It is visually precise but
  informationally empty.
- `keyboard: false`, `focusDisabled`, and an `aria-hidden` overlay leave no
  focusable controller or announced value.
- There is no tap/pin path, pointer-cancel cleanup, instruction, or cursor
  affordance.
- The reference intentionally hides its labels too; parity is not an adequate
  quality bar.

Correct fix:

- Invert the resolved D3 scales and render edge badges plus a polite x/y
  summary.
- Add a focusable 2D controller with arrow steps and `aria-valuetext`, or
  paired semantic sliders.
- Support deliberate tap-to-pin and Escape/second-tap release.
- Add a short visible instruction and intersection marker.

Missing gates:

- rendered crosshair position and extents;
- rendered and announced x/y values;
- keyboard, touch, pinning, cancellation, resize, and active update behavior.

## 89 — Drag brush range selection

What works:

- Forward and reverse drags normalize correctly.
- D3 scale inversion and persistent range state are correct.

Problems:

- “Revise” means redrawing the range. There are no endpoint handles or band
  dragging.
- A click collapses the selection to a one-pixel band.
- There is no range summary, endpoint label, point count, cursor, instruction,
  or accessible value.
- At 320 px, exact day selection is physically impossible through pointer
  pixels alone.
- There is no touch-action policy, primary-pointer tracking, or rollback on
  `pointercancel`.
- Captured drags freeze outside the plot rather than clamping.
- The ECharts toolbox is visible but not synchronized with the case state.

Correct fix:

- Inject `d3-brush` as an optional case dependency and measure its isolated
  bundle.
- Add semantic start/end slider handles, keyboard day steps, labels, and a
  live range summary.
- Add `touch-action: pan-y`, movement thresholds, clamped capture, active
  pointer tracking, and cancel rollback.
- Hide the reference toolbox or fully synchronize it.

Missing gates:

- rendered band and handle geometry after interaction;
- handle revision, keyboard, touch, cancellation, and outside bounds;
- exact-value feedback and update persistence;
- toolbox/state consistency.

## 90 — Wheel zoom and pan time window

What works:

- Pointer anchoring, clamping, and viewport persistence are mathematically
  correct.
- The x label provides a basic instruction.

Problems:

- Every wheel event over the surface calls `preventDefault()` before plot
  hit-testing. Ordinary page scrolling is swallowed over axes and margins.
- The code uses only delta sign. Every event halves/doubles or pans 25%,
  ignoring magnitude, `deltaMode`, and multi-event trackpad streams.
- Horizontal wheel is mostly a trackpad affordance. Shift+wheel can be
  interpreted as zoom.
- There are no reset, zoom, or pan buttons; keyboard support; drag pan; or
  touch pinch.
- Current range, zoom level, and restored state are not shown or announced.

Correct fix:

- Prefer an optional injected `d3-zoom` controller with an explicit input
  filter and isolated bundle measurement.
- Hit-test before consuming the event. Use an explicit activation policy such
  as Ctrl/Meta-wheel for zoom.
- Normalize and coalesce wheel input.
- Add Zoom in/out, Pan left/right, and Reset controls with keyboard and touch
  equivalents.
- Show and announce the current date range.

Missing gates:

- page-scroll preservation and plot hit-testing;
- realistic wheel streams, magnitude, `deltaMode`, and Shift+wheel;
- keyboard, buttons, drag, pinch, and reset;
- rendered axis/series evidence after every viewport change.

## 91 — Timeline playback scrubber

What works:

- Pointer drag, frame snapping, and controlled index persistence work.
- The playhead and status pill update.

Problems:

- The case says “playback,” but has no play/pause, timer, previous/next, or
  playback state.
- The overlay is `aria-hidden`; keyboard is disabled; the target is a
  non-focusable div.
- The effective target is 36 px high and the visual handle is smaller.
- `pointercancel` commits and increments the scrub count instead of rolling
  back.
- The track is about 1.48:1 and the orange control about 2.80:1 against white.
- The driver synthesizes expected overlay geometry instead of measuring the
  rendered overlay.

Correct fix:

- Use a native range input or equivalent `role="slider"` with min/max/step,
  arrow/Home/End support, `aria-valuetext`, a focus ring, and a 44 px target.
- Add real playback controls or rename the case to “Timeline scrubber.”
- Expose the status outside `aria-hidden`.
- Separate pointer-up commit from pointer-cancel rollback.

Missing gates:

- semantic role, value, keyboard behavior, and live status;
- actual track, handle, and label geometry;
- touch target and contrast;
- playback behavior or an accurate case name;
- cancellation.

## 92 — Editable event range

What works:

- Daily snapping, stable event identity, and controlled update persistence are
  correct.
- The selected Release interval resizes with pointer movement.

Problems:

- The handle and status overlay are `aria-hidden`; keyboard and focus are
  disabled.
- Bars do not contain event labels. Three blue events are anonymous.
- The visual handle is 16 px and the hit radius is 36 px.
- At 320 px, precise dates need a keyboard or date-input alternative.
- Captured movement outside the plot freezes instead of clamping.
- `pointercancel` commits the edit.
- Feedback shows only the end date, not start, duration, constraints, edit
  state, commit, or cancel.

Correct fix:

- Make the end handle a semantic slider with day/week steps, a start-derived
  minimum, domain maximum, `aria-valuetext`, focus styling, and a 44 px target.
- Add event labels and a date-field alternative.
- Show the complete range and duration.
- Clamp captured movement and roll back on cancellation.

Missing gates:

- rendered interval width, handle position, and status text;
- role, value, keyboard, touch, constraints, and focus;
- outside-bounds drag and cancellation;
- event labels and color-independent identity.

## Cross-case conformance gaps

### Driver state is not rendered evidence

Most scenarios assert JSON returned from a case-owned driver. Several values
are regenerated from source data or constants. An overlay can fail to paint,
an axis can fail to update, or an accessible announcement can remain empty
while the scenario passes.

Interaction cases need checkpoint assertions for:

- visible DOM text and state attributes;
- actual overlay and mark geometry;
- focus owner and keyboard continuation;
- live-region output;
- viewport scroll and page scroll;
- chart bounds after responsive interaction.

### Initial screenshots miss the interaction

The visual matrix captures the initial state. Tooltips, brushes, cursors,
selected points, handles, zoomed domains, and edited intervals are usually
absent.

Each interaction scenario should be able to request a screenshot and visual
inspection at meaningful checkpoints.

### Accessibility checks are chart-root checks

The current gate verifies a named `role="img"` or `role="application"` and
rejects duplicate roots. It does not verify:

- focusability;
- interactive roles, names, values, and descriptions;
- keyboard operation;
- focus retention;
- live announcements;
- data alternatives;
- target size or non-text contrast.

### The input grammar is idealized

Current scenarios support mouse-style movement, click, drag, wheel, and key
input. They do not express:

- touch;
- pointer down/move/up as separate steps;
- pointer cancellation;
- captured movement outside bounds;
- realistic wheel streams and modes;
- page-scroll preservation;
- midpoint and edge probes.

## Recommended implementation order

### Gate 1 — Make green interactions meaningful

1. Add rendered DOM, geometry, focus, accessibility, and scroll assertions.
2. Add interaction screenshots at scenario checkpoints.
3. Add touch, cancellation, captured-pointer, wheel-stream, midpoint, and edge
   scenarios.
4. Stop treating a named chart root as proof of interactive accessibility.

### Gate 2 — Fix broken operation

1. Case 90 scroll trapping and input normalization.
2. Cases 87 and 80 sparse-focus and edge-tooltip behavior.
3. Cases 82, 83, 89, 91, and 92 semantic keyboard controls.
4. Case 85 fixed lane context.
5. Case 83 short-height layout.

### Gate 3 — Complete feedback and recovery

1. Values and announcements for cases 87 and 88.
2. Visible append outcome and “Follow latest” for case 86.
3. Persistent pin styling and scoped dismissal for case 84.
4. Range summaries, handles, reset, cancel, and empty states.

### Gate 4 — Reuse proven interaction machinery

- Use granular, optional `d3-brush` for cases 83 and 89.
- Use granular, optional `d3-zoom` for case 90.
- Use native semantic range controls for cases 91 and 92.
- Keep those imports outside the Charts core and measure each isolated case
  bundle.

This preserves the current architecture: Charts owns rendering and semantic
focus; D3 or native controls own specialized interaction algorithms; the
application owns product policy.

## Implementation follow-through — 2026-07-27

The audit above is preserved as the before-state. The current working tree
addresses its case, core, and conformance-tooling findings without moving D3
interaction code into Charts core.

### Shared fixes

- The interaction grammar now covers phased pointer input, touch taps and
  drags, cancellation, multi-step wheel input with pixel/line/page delta modes,
  bounded waits, in-place revision updates, and named checkpoint screenshots.
- Rendered assertions now inspect role/name queries or selectors for text,
  attributes, focus, visibility, counts, dimensions, containment, and element
  or page scroll state. This closes the driver-state-only gap for the states
  each case declares.
- Charts clears transient focus on focus-out and pointer cancellation, including
  cross-realm DOM nodes. Per-axis guide visibility lets nested charts retain
  useful x context without an unwanted y guide.
- `d3-brush`, `d3-selection`, and `d3-zoom` remain granular case dependencies.
  The practical brush-plus-selection and zoom-plus-selection kernels measure
  16.20 and 15.91 kB gzip respectively. The Charts runtime stays independent
  of them; native controls provide the semantic keyboard path.

### Case outcomes

| Case | Implemented application behavior and executable evidence                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 80   | The grouped tooltip clamps and flips at chart edges; a visible legend and keyboard instruction were added; sparse dates use continuous nearest-x focus. Scenarios now check tooltip content and bounds, an open-state screenshot, edge focus, leave, touch cancellation, and focus cleanup.                                                                                                                      |
| 81   | Stable 44 px native legend buttons retain focus across Enter and Space toggles. `CanvasText`, filled/outlined swatches, and strike-through replace opacity-only state; hiding every series produces an explicit empty state. Rendered gates cover pressed state, focus, target height, and one correctly scoped interactive region.                                                                              |
| 82   | Chart and table selection are now bidirectional. Keyboard-selectable 44 px row controls, a persistent selected-point overlay, a live period/region/value summary, deliberate numeric table layout, and a 44 px clear control share one selection state. Gates cover row focus, overlay paint, clearing without focus loss, and revision preservation.                                                            |
| 83   | Both implementations use a real optional `d3-brush` with visible selection and handles, plus a native month slider and live four-month range. The compact layout budgets detail, overview, and controls inside the requested height. Pointer, touch, cancellation, keyboard, rendered brush geometry, short-container containment, screenshots, and revision persistence are exercised.                          |
| 84   | A pinned point keeps a persistent chart anchor. The tooltip flips around the selected point and becomes a contained panel at narrow widths; it is a labelled dialog with a 44 px close button, scoped Escape handling, focus restoration, unique IDs, x-axis period labels, and semantic history text. Gates cover the open screenshot, bounds, close control, anchor, nested bars/periods, and dismissal paths. |
| 85   | A fixed resource rail preserves lane context while only the time surface scrolls. The shell adds a status legend, overflow cue, task details, and a complete accessible schedule list. Keyboard task focus scrolls an offscreen task into view; wheel, lane visibility, rendered details, scrolled geometry, screenshots, and update-time scroll retention are gated.                                            |
| 86   | Append, Follow latest, and Show all are 44 px native controls. Appending outside a locked domain now explains why the chart did not move; follow-latest and unlocked modes expose their state and preserve it through data updates. The scenario checks rendered status, viewport/domain changes, focusable controls, and the offscreen-update screenshot.                                                       |
| 87   | Both linked charts support keyboard nearest-date focus, activation from either view, continuous sparse-date resolution, tap-to-pin, Escape release, active markers, and one shared date/throughput/error summary. Gates cover midpoint and edge dates, both crosshair geometries, rendered values, focus, pinning, leave behavior, the linked-state screenshot, and revised values.                              |
| 88   | The free cursor now renders x/y edge badges, an intersection marker, and a live coordinate summary. Paired 44 px native sliders provide keyboard control; tap pins the position and pointer cancellation clears transient state. Scenarios verify fractional geometry, rendered values, slider focus, pin/release behavior, touch activation, and an active-state screenshot.                                    |
| 89   | The brush now snaps to observed UTC months, uses an isolated `d3-brush`, and exposes semantic start/end slider handles with Arrow, Home, and End behavior. The visible summary includes exact range, point count, and average. Forward/reverse drag, handle focus and bounds, touch/pointer rollback, rendered geometry, screenshot, and revision-aware summary are gated.                                       |
| 90   | Wheel input is consumed only after explicit chart focus, preserving ordinary page scroll. Pixel, line, and page deltas are normalized; optional `d3-zoom`, drag/touch pan, keyboard controls, visible range/zoom status, and a 44 px reset control share one viewport. Gates cover page-scroll preservation, capture, pan/zoom/reset, screenshot, touch, and revision persistence.                               |
| 91   | The playhead is backed by a native range input with a 44 px target, keyboard semantics, measured track/handle geometry, and cancellation rollback. Play/pause drives a real timer and exposes current-frame state without continuously flooding the live region. Bounded waits prove end and restart behavior; scenarios also cover focus and revision persistence.                                              |
| 92   | The release end is editable through a native range input and a required, constrained date input, with 44 px targets and rollback on cancellation. The UI shows start/end/duration, validates a cleared date, labels events when space permits, and always provides a color-independent accessible event list. Gates measure the real track/handle/range, focus, validation, labels, and revision persistence.    |

### Remaining documentation and skills work

The implementations now provide the source material for problem-oriented
guidance. Documentation should explain how to choose a focus-distance policy,
when to use external HTML versus chart-owned interaction state, how to pair a
visual gesture with native semantic controls, and how to keep D3 brush/zoom
imports optional and measurable. The generated skills should turn those
patterns into task recipes and point back to D3 and renderer documentation for
primitive details rather than duplicating those references.

The full 79-case standard matrix passes across both renderers, revisions,
320/640/960 px, and light/dark themes. All 16 interaction cases pass every
declared scenario; strict case sources produce zero diagnostics, assertions,
or suppressions. The complete regression measures 97.9% mean diagnostic
geometry similarity.
