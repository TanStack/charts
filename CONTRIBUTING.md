# Contributing

## Setup

Use the Node.js version in [`.nvmrc`](./.nvmrc) and run commands from the
repository root.

```sh
corepack enable
pnpm install
```

Workspace packages and examples use local `workspace:*` dependencies. Do not
install dependencies from an individual package or example.

## Validation

CI checks are Nx targets. Nx caches deterministic results in `.nx/cache`, so
unchanged local tasks and later CI runs can replay them.

```sh
pnpm run validate
```

Run a narrower target while developing:

```sh
pnpm test
pnpm typecheck
pnpm docs:check
pnpm package:check
pnpm bundle:check
```

The unit suite inventories callback surfaces from every published package.
Public callbacks use primary data plus one context/options bag and never exceed
two arguments. New external-protocol or service-method exceptions require an
explicit classification in the contract, not a broader allowlist.

Pull-request CI runs the cached Nx target graph, the locked comparison bundle
gate, and these uncached browser matrices in parallel:

- four chart-library comparison shards;
- four stress-workload shards.

Conformance runs as regression monitoring outside normal validation. One
deterministically rotated standard shard runs nightly, all eight standard
shards run weekly, and a manual run can select all shards or reproduce one
exact shard. Add the `full-conformance` label to a risky pull request to run
the complete standard matrix against that pull request; later commits rerun
it while the label remains.

Browser measurements are not cached because their results depend on the browser
environment.
Install Chromium before running a browser suite locally:

```sh
pnpm browser:install
pnpm conformance:quick -- --shard=1/8
pnpm benchmark -- --profile=ci --chart=line
pnpm benchmark:stress:quick -- --workload=raw-line
```

## Runnable documentation

Runnable examples are virtual projects assembled from fenced code blocks. The
entry fence declares the project group and execution environment:

````md
```tsx group=letter-frequency env=charts-react file=/src/App.tsx entry
export default function App() {
  return <div />
}
```

```ts group=letter-frequency file=/src/data.ts collapsed
export const rows = []
```
````

- `group` identifies every file in one project.
- `env` selects the dependency, bootstrap, and rendering contract. Charts docs
  use `charts`, `charts-react`, or `charts-octane`.
- `file` is the virtual project path.
- `entry` marks the one visible file loaded by the environment.
- `collapsed` keeps supporting source inspectable without making it the active
  file. Do not put `hidden` on an authored fence; environments alone may add
  invariant hidden files.

Declare `env` only on the entry fence. A `charts` entry default-exports a chart
definition from a `.ts` or `.tsx` file. A `charts-react` entry default-exports a
React component from a `.tsx` file. A `charts-octane` entry default-exports an
Octane component from a `.tsrx` file. All three environments support additional
inspectable `.ts` and `.tsx` files; Octane groups may also contain `.tsrx`
components.

Project-relative imports must stay within `/src`. Each environment exposes an
explicit dependency set:

- `charts`: `@tanstack/charts`, `@tanstack/charts-scales`, `d3-geo`,
  `d3-scale`, and `d3-shape`.
- `charts-react`: the Charts dependencies plus `@tanstack/react-charts`,
  `react`, and `react-dom`.
- `charts-octane`: the Charts dependencies plus `@tanstack/octane-charts` and
  `octane`.

Keep data preparation, scale choices, definitions, and application behavior
in inspectable files. The environment may hide only invariant bootstrap such
as HTML, the DOM root, package metadata, and error handling.

Plain code fences remain intentional excerpts or API signatures and do not get
run controls. `pnpm docs:check` validates grouped metadata, relative imports,
entry exports, strict types, public package imports, and Octane client/server
compilation.

## Changesets

Add and commit a changeset for every user-visible package change:

```sh
pnpm changeset
```

Choose the release impact and write the summary that should appear in the
changelog. All twelve public Charts packages form one fixed release group, so
one package change advances every package to the same version. Documentation,
tests, benchmarks, and build-only changes do not need a changeset unless they
alter the published package contract.

Do not edit package versions, generated package changelogs, or release tags by
hand. The automated version pull request owns those changes.

## Release flow

Every push to `main` starts the release workflow:

1. When pending changesets exist, Changesets creates or updates
   `ci: Version Packages`. The generated pull request does not repeat the
   browser benchmark matrix.
2. Review and merge that pull request when the release is ready. It updates all
   public package versions, consumes the changesets, synchronizes the root and
   package changelogs, updates release-facing docs, and refreshes the lockfile.
3. The merge starts the same workflow again. With no pending changesets, the
   publisher checks npm and builds fresh, consumer-tested tarballs only when
   the coordinated version is unpublished.
4. npm trusted publishing uses the workflow's OIDC identity to publish core,
   then React, before compact scales and the remaining nine adapters with
   provenance. The repository has no long-lived npm token.
5. After all twelve registry entries report the expected integrity and
   attestations, the workflow creates one annotated `vX.Y.Z` tag and GitHub
   release from the root changelog.

The chart comparison, stress, and catalog-index checks still run on `main`, but
they are independent from npm publication. Scheduled conformance monitoring is
also independent from release publication. User-visible package
work must pass normal validation in its feature pull request before merging.

Never move or reuse a release tag. If publishing succeeds but tag or GitHub
release creation fails, rerun the failed `Release` workflow; its registry
preflight resumes finalization without republishing existing versions.

Changing the repository name or
`.github/workflows/release.yml` requires updating the trusted-publisher
configuration for all twelve packages on npm.
