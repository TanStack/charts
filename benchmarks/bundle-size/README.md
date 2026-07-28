# Bundle-size policy

`pnpm bundle:check` applies three explicit policies:

- **Locked** entries are ordinary TanStack Charts consumers that optional
  features must not affect. Their minified and gzip bytes must match
  [`universal-baseline.json`](./universal-baseline.json) exactly.
- **Budgeted** entries isolate an optional chart feature or D3 capability and
  enforce a feature-specific gzip ceiling.
- **Measured** entries are comparison libraries, applications, or exploratory
  D3 kernels. They are reported without defining a TanStack product ceiling.

Every package entry in
[`measure-bundles.mjs`](../../scripts/measure-bundles.mjs) declares one policy.
New marks and optional capabilities need an isolated budgeted entry. They must
leave the locked entries byte-identical.

Update the universal baseline only after reviewing why a shared path changed:

```sh
pnpm bundle:update-baseline
pnpm bundle:check
```

A decrease also requires an update. This prevents a later regression from
silently consuming size that an optimization recovered.
