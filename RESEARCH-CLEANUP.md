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

## Expanded removal

Tanner approved removing the historical benchmark dependencies too, after the
initial cleanup commit `2cdc1b13`.

- `packages/core`, `packages/plot`, `packages/react`, and `packages/fixtures`,
  including their private manifests, implementation, styles, and tests.
- `packages/charts-core-d3`, including the superseded backend, its tests, and
  archived documentation. This is not the supported Charts core.
- The five historical bundle entries: host core, Plot integration, stateful
  Plot, React host, and React Plot adapter, plus their entry files.
- `benchmarks/rendering.ts`, `scripts/measure-rendering.mjs`, and the associated
  `pnpm performance` command. This was the old mixed product and research
  rendering comparison. Current pointer performance, library comparisons, and
  stress measurements remain.
- Removed workspace dependencies, lock entries, Octane cache inputs, README
  references, and skill-authoring metadata links to the deleted research docs.

## Retained

- `packages/charts-fixtures` supplies the product statistics-parity bundle
  entries. `packages/react-18-compat` supplies the packed React 18 compatibility
  check. Both stay.
- The catalog, sandbox, native and Expo fixtures stay. Observable Plot itself
  stays as an external comparison library and conformance reference.

No package was kept or deleted just because its name contains `poc`.

## Initial verification, commit 2cdc1b13

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

## Expanded cleanup verification

- `pnpm validate` passes all 19 targets. The default suite passes 2,171 tests
  in 284 files. The removed research packages account for the reduction of
  60 tests in 17 files; supported adapter tests remain.
- Packed core, React, React Native, bare Metro, Expo, seven framework adapters,
  and unified-package checks pass. The twelve-package release allowlist and
  all 1.0.0 versions are unchanged.
- All maintained web examples build. Catalog example and metadata checks pass
  for 188 cases. Official preview generation and validation pass for all 188
  cases with unchanged SVGs and a refreshed source digest.
- All 146 retained approved bundle outputs remain byte-identical. The five
  removed outputs belong only to the deleted research packages. No maintained
  budget or locked baseline changed.
- Frozen offline installation passes. The lockfile only removes workspace
  entries, with no dependency upgrades.
- No active source, manifest, lock, test, cache, or skill-authoring metadata
  references remain to the deleted research packages or rendering command.
- Current pointer performance, chart-library comparisons, stress checks,
  conformance coverage, active fixtures, supported APIs, release checks, and CI
  workflows remain. Historical dated audit records remain as evidence.

Both cleanup commits are local on the same branch. Deleted files remain
recoverable from Git. No push, PR, merge, release, or deployment occurred.
