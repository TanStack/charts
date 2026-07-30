# Demo data

Renderer-neutral observations for the catalog and example applications.

- `@observablehq/sample-datasets@1.0.1` is pinned at
  `732c0148de741469b2bcc03f53d93b0ad0b93f0a`.
- Additional snapshots come from Observable Plot `test/data` at
  `356f579b1d947ee05a914420eddff0f29cee300a`.
- Every dataset has an exact subpath export; there is no data-bearing root
  barrel.
- Generated modules preserve upstream field names and normalize non-finite CSV
  values to `null`.
- Large CSV snapshots remain compact source text and parse only when their
  exact subpath is loaded; smaller exports contain pre-parsed observations.
- `metadata` records schema, record count, source bytes, SHA-256, upstream
  source, revision, and license note.

Run `pnpm demo-data:check` in validation. Use `pnpm demo-data:sync` only when
intentionally refreshing generated modules from the pinned sources.
