# Public API harmonization roadmap

This roadmap tracks the pre-alpha API audit. Complete an item only after its
runtime, types, documentation, migration notes, and focused verification agree.

## Correctness

- [x] **AHR-001 — Compact scale contracts**
  - Reject positional domains and ranges that do not contain exactly two finite
    numbers.
  - Make ordinal unknown and empty-range output honest in its callable type.
  - Add focused runtime and type regressions.
- [x] **AHR-002 — Host-refined tooltip definitions**
  - Keep chart specs portable until a host-specific tooltip extension is added.
  - Reject web/native tooltip token mismatches in host types instead of at render
    time.
  - Remove the claim that a definition containing a web tooltip token renders
    unchanged through React Native.
  - Done: token branding, portable undecorated specs, exact DOM and React
    Native host types, and widened-value runtime guards.
- [x] **AHR-003 — Composable definition contract**
  - Represent the subset accepted by view composition in public types.
  - Remove runtime-only rejection for configurations the type system can reject.
  - Let responsive children resolve against their allocated view frames, or
    document and type the deliberate static boundary.

## Grammar and lifecycle

- [x] **AHR-004 — Responsive definition terminology**
  - Rename `DynamicChartConfig`, `DynamicChartDefinition`, and
    `isDynamicChartDefinition` to `Responsive*` equivalents.
  - Rename build-context `theme` to `defaultTheme` unless the builder receives
    the fully resolved definition theme.
- [x] **AHR-005 — Callback shape harmony**
  - Use `(datum, { index, data })` for transform accessors, matching channels.
  - Keep object-only callbacks only where there is no distinct primary payload.
- [x] **AHR-006 — Interaction ownership**
  - Replace the overly broad `behaviors` name with the narrower concept it owns,
    or introduce one typed `interactions` group without weakening optional
    capability boundaries.
  - Keep crosshair presentation, shared cursor state, selection, tooltip, and
    interactive legends discoverable from the same interaction reference.
- [x] **AHR-007 — Color resolver ownership**
  - Replace `color.type` with `color.resolver`, or include the custom resolver in
    the `scale` union.
- [x] **AHR-008 — Focus strategy names**
  - Rename grouped `focusX`/`focusY` strategies to `focusGroupX`/`focusGroupY` so
    names match the `group-x`/`group-y` presets.

## Renderer and utility names

- [x] **AHR-009 — Animation ownership names**
  - Make the default-SVG-only `animate` option renderer-specific in name, or
    converge it with renderer-neutral motion policy.
  - Preserve one animation owner per host.
- [x] **AHR-010 — Image export names**
  - Rename `RenderChartPngOptions` to `RenderChartImageOptions`.
- [x] **AHR-011 — Transform namespace clarity**
  - Replace the browser-global-shadowing `window` transform name.
  - Remove confusing reducer/mark collisions or confine reducers to the exact
    reduce entry.
  - Make row-producing transform names follow one documented rule.

## Platform parity

- [x] **AHR-012 — Shared native interaction policy**
  - Extract renderer-neutral focus restoration, tooltip content, anchor, and
    ordering behavior used by DOM and React Native hosts.
  - Support authored focus/state layers through the same scene-state resolver.
- [x] **AHR-013 — Platform theme and typography**
  - Add a runtime platform-default theme used by responsive builders and final
    scene merging.
  - Complete text measurement with family, style, stretch, spacing, direction,
    locale, and native font-scale policy.
  - Use synchronous deterministic metrics with complete host typography;
    hosts own font readiness and re-render when metrics change.

## Documentation and governance

- [x] **AHR-014 — Canonical generated import map**
  - Generate or verify the reference import map from package export maps.
  - Cover every public entry, including transforms, tooltip, and handle.
- [x] **AHR-015 — Executable API examples**
  - Replace stale axis option names and undeclared helpers.
  - Typecheck every API-bearing example, not only selected complete examples.
  - Done: stale names and undeclared ranking helpers were removed; all 503
    typed fences receive syntax and import validation; 18 complete examples
    receive full TypeScript compilation.
  - Decision: contextual snippets that intentionally omit setup remain syntax
    and import checked. Examples presented as complete or executable must pass
    full TypeScript compilation; CI does not invent hidden declarations for
    fragments.
- [x] **AHR-016 — Built-in behavior terminology**
  - Replace ambiguous “native tooltip/focus” prose with “built-in”,
    “chart-owned”, or an explicitly named host.
- [x] **AHR-017 — Public surface tiers**
  - Identify ordinary authoring, optional capability, and adapter/renderer
    extension entries in the reference.
  - Keep the ordinary path short without hiding supported extension boundaries.

## Release tracking

- [x] Add one coordinated minor changeset covering every user-visible package
      contract change.
- [x] Maintain an `Unreleased` migration in the root changelog while this work
      spans commits.
- [x] Run focused tests after each item, then the full type, test, docs, package,
      and bundle gates.
