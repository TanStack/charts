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

Pull-request CI runs the cached Nx target graph, the locked comparison bundle
gate, and these uncached browser matrices in parallel:

- four chart-library comparison shards;
- eight conformance shards;
- four stress-workload shards.

Browser measurements and the revision-stamped catalog artifact are not cached
because their results depend on the browser environment or exact Git commit.
Install Chromium before running a browser suite locally:

```sh
pnpm browser:install
pnpm conformance:quick -- --shard=1/8
pnpm benchmark -- --profile=ci --chart=line
pnpm benchmark:stress:quick -- --workload=raw-line
```

## Changesets

Add and commit a changeset for every user-visible package change:

```sh
pnpm changeset
```

Choose the release impact and write the summary that should appear in the
changelog. All ten public Charts packages form one fixed release group, so one
package change advances every package to the same version. Documentation,
tests, benchmarks, and build-only changes do not need a changeset unless they
alter the published package contract.

Do not edit package versions, generated package changelogs, or release tags by
hand. The automated version pull request owns those changes.

## Release flow

After a push to `main` passes the complete CI workflow:

1. Changesets creates or updates `ci: Version Packages` from the pending
   changesets.
2. Merging that pull request updates all public package versions, consumes the
   changesets, synchronizes the root changelog, and updates the lockfile.
3. CI validates the exact merge commit. The release workflow then creates an
   annotated version tag when that version is not already released.
4. The tag-scoped workflow rebuilds and checks all ten package artifacts.
5. Only the publish job receives `id-token: write`. npm trusted publishing uses
   that OIDC identity to publish with provenance; the repository does not use a
   long-lived npm token.
6. A separate job installs the published packages and verifies their
   integrity, signatures, and provenance before GitHub creates the release.

Never move or reuse a release tag. If publishing succeeds but final
verification or GitHub release creation fails, rerun the release workflow
against the existing tag.

Changing the repository name or
`.github/workflows/release.yml` requires updating the trusted-publisher
configuration for all ten packages on npm.
