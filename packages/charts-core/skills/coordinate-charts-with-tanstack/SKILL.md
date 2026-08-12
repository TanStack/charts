---
name: coordinate-charts-with-tanstack
description: >
  Coordinate TanStack Charts with TanStack Table data grids, TanStack DB live
  queries and sync engines, TanStack Query server state, Store, Router,
  Virtual, Pacer, Start, and Form without duplicating ownership. Load for
  chart-grid linking, shared filtering or selection, live synchronized data,
  optimistic updates, URL-restorable chart state, virtualized detail views,
  paced streams, or dashboard-wide state.
metadata:
  type: composition
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/interactions-and-selections.md'
  - 'TanStack/charts:docs/guides/transforms-and-reactivity.md'
  - 'TanStack/charts:docs/guides/dynamic-data-and-animation.md'
  - 'https://tanstack.com/table/latest/docs/guide/row-models'
  - 'https://tanstack.com/db/latest/docs/guides/live-queries'
  - 'https://tanstack.com/db/latest/docs/guides/mutations'
  - 'https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults'
---

# Coordinate Charts With TanStack

Run **trigger → inspect → decide → build → verify** across the complete product state graph. Assign one owner to each row projection, semantic key, filter, selection, viewport, revision, transaction, and timing policy before connecting libraries.

## Setup

### Inspect the ownership graph

Record these boundaries before writing adapters:

| Concern                                                   | Normal owner                                   | Chart input                                                       |
| --------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Remote fetching, cache, freshness, retry                  | Query                                          | resolved semantic snapshot plus status                            |
| Normalized records, live queries, optimistic transactions | DB or sync collection                          | keyed projection plus sync state                                  |
| Grid filtering, sorting, grouping, pagination             | Table when grid-local; application when shared | explicitly chosen row-model frontier                              |
| Visual encoding, focus, scene, renderer                   | Charts                                         | prepared rows and committed behavior options                      |
| Shared client intent                                      | Store or application state                     | semantic filters, keys, and domains                               |
| Restorable navigation state                               | Router search                                  | validated compact intent, never pixels or row objects             |
| Mounted grid window                                       | Virtual                                        | no analytical effect unless “visible rows” is the stated question |
| Burst, queue, or batch policy                             | Pacer                                          | paced source revisions or committed actions                       |
| Draft controls and validation                             | Form or local state                            | committed, valid intent                                           |
| SSR request and hydration                                 | Start or framework lifecycle                   | deterministic data revision, locale, and initial geometry         |

Fail condition: two libraries can independently change the same semantic state, or the chart receives rows without a named scope and revision.

### Name each row projection

Do not pass “the rows” between surfaces. Name the analytical frontier:

- `sourceRows`: canonical records available to this client.
- `eligibleRows`: records after shared business filters.
- `summaryRows`: chart grain after aggregation or binning.
- `detailRows`: grid grain before presentation-only sorting or pagination.
- `visibleRows`: currently mounted virtual items; usually presentation only.
- `selectedRows`: rows resolved from stable semantic keys.

Document whether grid sorting, filtering, grouping, pagination, or selection changes the chart question. Use the [Table and data-grid reference](references/table-and-data-grid.md) for row-model choices.

## Core Patterns

### Derive once, project deliberately

Use one semantic projection owner, then expose separate summary and detail outputs:

```ts
const analysis = projectOrders(sourceRows, sharedIntent)

const tableData = analysis.detailRows
const chartDefinition = defineChart({
  marks: [
    lineY(analysis.summaryRows, {
      x: 'day',
      y: 'revenue',
      color: 'region',
      key: ({ datum }) => `${datum.region}:${datum.day.toISOString()}`,
    }),
  ],
  x: { scale: scaleUtc },
  y: { scale: scaleLinear },
})
```

Do not independently restate eligibility, aggregation, or metric formulas in Table accessors and chart transforms. Presentation-only table sort and pagination may remain grid-owned.

### Synchronize semantic intent, not component internals

Share values such as:

- entity IDs or aggregate bucket keys;
- validated filters and comparison periods;
- committed scale domains or time windows;
- selected metric and grouping dimension;
- data revision and “as of” status.

Keep DOM nodes, row indexes, chart pixels, virtual indexes, tooltip bodies, and Table row objects inside their owning surface.

### Separate transient, committed, and persisted state

Use three phases where interaction can write data:

1. **Transient**: hover, pointer position, drag preview, and active handle remain local and cheap.
2. **Committed**: selection, accepted brush domain, and submitted filters update shared application or URL state once.
3. **Persisted**: DB or server writes expose pending, confirmed, failed, and rollback states explicitly.

Do not write every pointer frame to Router, Query, a sync engine, or a database transaction. Read [Query, DB, and sync](references/query-db-and-sync.md) when records are live or writable.

### Pace at the expensive boundary

Choose timing by semantics:

- debounce draft search or filters that should wait for intent;
- throttle disposable visual previews that need bounded frequency;
- queue writes when every operation must persist;
- batch compatible mutations, telemetry, or source revisions;
- preserve latest-wins correctness for chart presentation even when writes are lossless.

Do not add a second scheduler around work already bounded by the chart host, live-query engine, or framework.

### Verify the full synchronization sequence

1. Load one named data revision into both surfaces.
2. Apply a shared filter and prove summary totals reconcile with detail rows.
3. Sort and paginate the grid; prove the chart changes only when intended.
4. Select from chart and grid; prove both resolve the same semantic keys.
5. Apply an optimistic update; distinguish pending from confirmed output.
6. Roll back or receive a remote update; preserve surviving selection and clear missing keys.
7. Restore URL state, hydrate, resize, virtualize, and destroy without duplicate subscriptions or writes.

## Common Mistakes

### CRITICAL Charting the final rendered row model accidentally

Wrong: feed the chart whatever rows the grid currently renders.

Correct: choose the filtered, grouped, pre-pagination, page, or selected frontier because it matches the stated comparison.

Table row models can include sorting, grouping, expansion, and pagination. The final grid row model is a presentation result, not an automatically valid analytical dataset.

Source: TanStack Table row-model guide

### CRITICAL Keying coordination by row or virtual index

Wrong: synchronize `row.index`, array position, or virtual item index.

Correct: define an application-level entity or aggregate key and adapt both Table and Charts to it.

Indexes change under sorting, filtering, pagination, streaming, and virtualization. Grouped Table row IDs may also contain presentation suffixes.

Source: TanStack Table rows guide; `API-FRICTION.md` F-120, F-131, and F-239

### CRITICAL Duplicating filtering and aggregation

Wrong: implement the KPI in a Table aggregation function and again in chart preparation.

Correct: derive one named semantic projection that can feed the grid, chart, table alternative, export, and tests.

Independent pipelines drift on null policy, denominators, time boundaries, and later product changes.

Source: `docs/guides/transforms-and-reactivity.md`; `API-FRICTION.md` F-128 and F-163

### CRITICAL Creating a bidirectional state loop

Wrong: chart selection sets a Table filter whose change recreates chart selection and writes the URL again.

Correct: assign one owner, normalize one event into semantic intent, and let every surface derive from that state without echoing equivalent updates.

Feedback loops cause redundant renders, history spam, flicker, and state that cannot settle.

Source: Charts interaction ownership; TanStack Router search-state guidance

### HIGH Treating optimistic rows as confirmed history

Wrong: animate an optimistic mutation into the ordinary historical series with no pending state.

Correct: carry sync or transaction status into the semantic projection, differentiate pending values when decision-relevant, and verify rollback.

TanStack DB applies optimistic state before persistence and can replace or roll it back after synchronization.

Source: TanStack DB mutations and live-query guides

### CRITICAL Persisting every interaction frame

Wrong: write every brush, handle, resize, or pointer update through Router, Query invalidation, or a sync transaction.

Correct: preview locally, pace expensive derivation if necessary, and commit one semantic value at the interaction boundary.

Frame-rate state is presentation. Persistence needs validation, cancellation, ordering, and conflict semantics.

Source: Charts interaction guides; TanStack Pacer timing guidance

### HIGH Treating virtualization as analytical filtering

Wrong: chart only mounted grid rows because Virtual currently exposes them.

Correct: chart the intended source or filtered projection; use mounted rows only for an explicitly viewport-scoped question.

Virtual controls render work, not dataset meaning.

Source: TanStack Virtual virtualizer reference

## References

- [Table and data grids](references/table-and-data-grid.md)
- [Query, DB, and sync engines](references/query-db-and-sync.md)
- [TanStack application state and lifecycle](references/tanstack-application-state.md)

See also: `prepare-chart-data/SKILL.md`, `build-chart-interactions/SKILL.md`, `update-and-animate-charts/SKILL.md`, and `debug-and-verify-charts/SKILL.md`.
