# Changesets

Add a changeset for every user-visible package change:

```sh
pnpm changeset
```

All ten public Charts packages release as one fixed version. Documentation,
tests, benchmarks, and build-only changes do not need a changeset unless they
change the published package contract.
