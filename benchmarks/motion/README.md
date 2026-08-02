# Motion POC

Run `pnpm motion:poc` to record a deterministic side-by-side animation.
Run `pnpm motion:update:poc` to record a keyed update that is interrupted after
400 ms while interaction probes follow presentation geometry.

- Reference: Bklit bar timing and easing at commit
  `c57f66bfa7c3198edb677b567ce08cbf364ae159`.
- Candidate: `motion()` with bar grow, bounded
  staggering, line reveal, and custom timing for one datum and the line series.
- Output: `.benchmark-output/motion-poc/` contains the full timing envelope as
  PNG frames, a WebM, a contact sheet, and sampled SVG geometry.
- Round-one gate: both timelines finish, bar drift stays within 2 px, and line
  reveal drift stays within 4 px. The tolerance covers independent animation
  frame start times; final geometry must still match.

Round two adds retained SVG presentation points, keyed enter/update/exit,
reordering, and interrupted transitions. Canvas and framework-native motion
remain outside the spike.

Motion is isolated behind the `@tanstack/charts/motion` subpath. The complete
tween-and-spring SVG renderer is 30.63 kB minified / 10.55 kB gzip. The
standalone spring sampler is 1.42 kB minified / 0.70 kB gzip. Renderer-neutral
scene consumers retain 94 minified bytes / 42–54 gzip bytes for the internal
definition source seam. The complete default DOM host delta is 254 minified /
128 gzip bytes, including presentation-point lookup for pointer hit-testing.

Compatible line paths morph; topology changes still commit immediately and
need a crossfade policy. The low-level driver/context types remain internal.

Next reference cohort: Vizzu for state morphing, ECharts and AntV G2 for
keyed/per-series transitions, and AG Charts for polished default enter/update
behavior. Highcharts and amCharts remain manual visual references unless their
licenses permit automated fixtures.
