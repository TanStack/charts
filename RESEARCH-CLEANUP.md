# Research cleanup, October 4, 2026

Local branch: `taren/remove-unused-research`.

## Removed

- `packages/octane`, the private `@plot-poc/octane-host` adapter. Its only
  consumers were its own tests and `examples/octane`. The supported
  `packages/octane-charts` adapter and its server, client, and packed-consumer
  checks remain.
- `examples/react` and `examples/octane`, the historical host demos. Their
  optional application-size rows and development commands were removed too.
  Current React and Octane examples remain in `examples/charts-react` and
  `examples/charts-octane`.
- Their workspace lock entries and obsolete Octane test and cache wiring.

These tracked files remain recoverable from the parent commit. No published
package, release allowlist, supported API, CI workflow, or bundle limit changed.

## Still used

- `packages/core`, `packages/plot`, and `packages/react` supply five historical
  entries in `scripts/measure-bundles.mjs`: host core, Plot integration,
  stateful Plot, React host, and React Plot adapter.
- `packages/core`, `packages/plot`, and `packages/fixtures` supply historical
  rendering and update measurements in `benchmarks/rendering.ts`, run by
  `pnpm performance`. Removing them requires separating the maintained product
  measurements from the historical measurements first.
- `packages/charts-core-d3` supplies historical fork measurements in the same
  rendering benchmark and bundle comparisons. It is private, not the supported
  Charts core. Its removal needs a separate comparison-coverage decision.
- `packages/charts-fixtures` supplies the product statistics-parity bundle
  entries. `packages/react-18-compat` supplies the packed React 18 compatibility
  check. Both stay.
- The catalog, sandbox, native and Expo fixtures stay. Observable Plot itself
  stays as an external comparison library and conformance reference.

No package was kept or deleted just because its name contains `poc`.

## Verification

- Frozen offline workspace installation passes, without dependency upgrades.
- `pnpm validate` passes all 19 targets. The default suite still passes 2,231
  tests in 301 files, and the supported Octane server and client suites pass.
- Packed core, React, React Native, bare Metro, Expo, seven framework adapters,
  and the unified artifact gates pass.
- `pnpm build` passes for all remaining web examples.
- All 151 approved bundle outputs remain byte-identical.
- Official preview generation and validation pass for all 188 cases. The SVG
  assets are unchanged; only the manifest source digest changed.
- The release allowlist still contains exactly the same twelve packages at
  1.0.0. No obsolete Octane or removed-demo references remain in executable
  scripts, manifests, lock entries, cache configuration, or test configuration.

No push, PR, merge, deployment, npm publication, or website change was made.
