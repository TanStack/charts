# Query, DB, and Sync Coordination

Load this reference when chart rows come from TanStack Query, TanStack DB, a DB collection backed by a sync engine, or optimistic mutations.

## Keep data responsibilities distinct

| Layer               | Owns                                                                  | Must not silently own                                         |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| Query               | request identity, fetching, cache, freshness, retry, cancellation     | chart selection, visual domain, metric definition             |
| DB collection       | normalized keyed records, synchronization boundary, mutation handlers | chart-specific geometry or formatter state                    |
| DB live query       | reactive filtering, joins, grouping, aggregation, projection          | grid pagination or chart pixels                               |
| Sync engine         | remote membership, replication, conflict and persistence contract     | application interpretation of pending versus confirmed values |
| Semantic projection | metric grain, eligibility, units, lineage, revision envelope          | remote retry or renderer lifecycle                            |
| Charts              | scales, marks, scene, focus, rendering                                | network cache or database transaction state                   |

Prefer one live projection that feeds both chart summaries and grid details when that query can preserve the required lineage. Use separate queries only when their scope is intentionally different and can be reconciled by revision.

## Carry a revision envelope

Do not expose only an array:

```ts
interface ChartDataset<Row> {
  rows: readonly Row[]
  revision: string
  asOf: Date
  completeness: 'complete' | 'partial' | 'stale'
  sync: 'confirmed' | 'mixed' | 'optimistic'
}
```

Adapt the fields to the actual backend contract. The point is to keep freshness and completeness out of incidental array identity.

Use the same envelope for chart, grid, title, source note, export, and verification. Do not render a newly fetched chart beside stale grid details without making the mixed state explicit.

## Respect live-query semantics

TanStack DB live queries update as their source collections change and may maintain joins and aggregates incrementally. Let that layer own reusable relational work when it is the product's canonical client projection.

Avoid:

- copying a live-query result into a second hand-synchronized store;
- rebuilding the entire chart definition for unrelated collection changes;
- flattening a one-to-many join and then counting parent rows;
- using a live result's array order as entity identity;
- starting a tooltip query for every pointer candidate;
- subscribing separately per mark, cell, or tooltip body.

Memoize chart preparation against the semantic result and options, not the top-level hook result object.

## Present optimistic changes honestly

DB mutations can apply locally before persistence, then become confirmed or roll back. Decide per metric whether optimistic values may enter:

- totals and operational previews may include them with a pending indicator;
- audited, financial, or externally reported series may wait for confirmation;
- comparisons may show pending and confirmed values separately;
- animation must handle rollback and server-normalized values without changing entity keys.

Do not label an optimistic aggregate “current confirmed revenue.” Do not celebrate success before the persistence contract completes.

For draft editing, separate the preview transaction from commit. A chart can preview a local scenario without persisting each field or drag update.

## Choose pressure semantics

High-frequency input requires an explicit loss policy:

| Work                    | Normal policy                                   | Reason                                       |
| ----------------------- | ----------------------------------------------- | -------------------------------------------- |
| Pointer or drag preview | throttle or animation-frame latest-wins         | intermediate frames are disposable           |
| Search/filter draft     | debounce                                        | wait for user intent                         |
| Live source revisions   | coalesce or batch when revisions remain ordered | reduce repeated preparation                  |
| Database writes         | queue or transactional batch                    | losing a write may corrupt state             |
| Telemetry               | bounded batch                                   | preserve useful evidence without blocking UI |

Never debounce a workflow that must preserve every mutation. Never queue unlimited visual frames that are already obsolete.

## Verify synchronization

- Initial load, background refetch, offline/stale, reconnect, and retry states.
- One-row live insert, update, delete, and join-key change.
- Optimistic apply, server normalization, persistence, conflict, and rollback.
- Shared chart/grid revision during partial sync and query switching.
- Stable keys and selections across array replacement and incremental updates.
- Bounded subscriptions, transformations, scene work, and teardown.
- No raw sensitive data in timing, transaction, or chart telemetry.

Official references:

- <https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults>
- <https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations>
- <https://tanstack.com/db/latest/docs/overview>
- <https://tanstack.com/db/latest/docs/guides/live-queries>
- <https://tanstack.com/db/latest/docs/guides/mutations>
- <https://tanstack.com/db/latest/docs/collections/query-collection>
