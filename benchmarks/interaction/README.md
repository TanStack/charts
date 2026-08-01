# Pointer-resolution benchmark

The algorithm change is intentionally visible as two different selection
pipelines:

```text
CURRENT PRODUCTION (anchor-only)

pointer (x, y)
      |
      v
scan every point anchor ---------------- O(n), one pass
      |
      v
nearest dx^2 + dy^2
      |
      v
anchor within max distance? ----------- yes -> point
      |
      `--------------------------------- no  -> null

NEW OPTIMIZED GEOMETRY

pointer (x, y)
      |
      v
scan hit regions, topmost-first -------- O(n), allocation-free
      | exact containment
      `--------------------------------- yes -> first painted hit
      |
      | no exact hit
      v
all targets are ordinary points? ------- yes -> reuse nearest anchor from pass
      |
      | no (geometry or axis affinity exists)
      v
rank declared x / y / xy fallback ------ O(n), second pass only on miss
      |
      v
break axis ties by boundary distance
      |
      v
region within max distance? ------------ yes -> point; no -> null
```

Run the focused interaction benchmark with:

```sh
pnpm performance:pointer
```

It measures median and p95 time per pointer query for 10,000 point, rectangle,
stacked-rectangle, and circle targets plus 2,000 polygons. The benchmark runs
the former allocation-heavy geometry POC beside the optimized resolver and an
anchor-only production baseline. Before timing, it verifies that the POC and
optimized resolver select the same target for every non-overlap probe. The
anchor-only resolver is a speed baseline, not a correctness baseline for the
geometry rows: it cannot return the intended large-mark behavior.

The point-only section compares identical nearest-anchor targets on a
deterministic fixture against the selection loop from the installed Observable
Plot 0.6.17 pointer transform, D3 quadtree 3.0.1, and D3 Delaunay 6.0.4. Plot
timings intentionally exclude DOM coordinate conversion, mark rendering,
pooling, and event dispatch. D3 query timings exclude index construction, which
is reported separately; those indexes also do not reproduce hit-region
containment or mark affinity without additional candidate refinement.

The rectangle section additionally measures a source-equivalent lower bound
for Vega 5.2.1's first picking stage. Vega's Canvas picker traverses
topmost-first, rejects against stored bounds, and then runs mark-specific path
tests. The benchmark stops before that exact Canvas path test, so it is useful
for learning from cached bounds but is not reported as end-to-end Vega
performance.

The comparison follows the primary implementations and contracts documented by
[Observable Plot's pointer transform](https://observablehq.com/plot/interactions/pointer),
[D3 quadtree](https://d3js.org/d3-quadtree#quadtree_find),
[D3 Delaunay](https://d3js.org/d3-delaunay/delaunay#delaunay_find), and Vega's
[reverse visitor](https://github.com/vega/vega/blob/main/packages/vega-scenegraph/src/util/visit.js)
and [Canvas picker](https://github.com/vega/vega/blob/main/packages/vega-scenegraph/src/util/canvas/pick.js).

`pnpm bundle:check` reports isolated anchor-only and geometry resolver entries
beside the existing D3 quadtree and Delaunay kernels. The geometry resolver has
a 1 kB gzip ceiling; the historical anchor-only entry stays unbudgeted so the
comparison remains visible without treating removed behavior as a product.

The command exposes explicit garbage collection and rotates implementation
order between samples to reduce allocation and thermal bias. Results are
machine-specific evidence, not a portable CI timing threshold.
