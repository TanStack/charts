# Table and Data-Grid Coordination

Load this reference when a chart and TanStack Table or another data grid share rows, filters, grouping, selection, or drill-down.

## Choose the analytical frontier

| Desired chart meaning               | Grid frontier to consider                  | Warning                                                                    |
| ----------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| All records available to the client | core/source data                           | May still be only a server page or partial sync                            |
| Records matching shared filters     | filtered or application-owned projection   | Keep grid-only text filters separate when they should not change the chart |
| Group summaries                     | shared semantic aggregation                | Table grouping rows may contain presentation IDs and nested subrows        |
| Current page                        | paginated rows                             | Use only when the title says the chart covers the current page             |
| Selected records                    | semantic keys resolved against source data | Selected-row models may only resolve rows currently available to the table |
| Currently mounted rows              | never by default                           | Virtualization is a rendering window, not a data filter                    |

Name the chosen frontier in code and in tests. “Use the table rows” is incomplete.

## Coordinate filters

Classify each filter:

- **Business filter** changes metric eligibility and should normally affect chart, grid, export, and summary.
- **Presentation filter** helps find a detail row and may remain grid-local.
- **Cross-filter** originates from a visual selection and deliberately changes another view.
- **Highlight** changes emphasis but not eligibility or totals.

Do not turn every chart selection into a filter. Highlighting preserves context; filtering removes it.

Verify that clearing a filter restores the same semantic revision and that empty results distinguish “no eligible data” from “not loaded.”

## Coordinate selection

Use an application key independent of either library:

```ts
type EntityKey = string

interface CoordinatedSelection {
  keys: ReadonlySet<EntityKey>
  source: 'chart' | 'grid' | 'url' | 'application'
}
```

- Configure the table row ID from the entity key.
- Configure chart datum keys from the entity or aggregate key.
- Resolve grouped chart buckets to contributing entity keys only when drill-down requires it.
- Preserve selection when keys survive sorting, filtering, pagination, and live updates.
- Clear or explain keys that are no longer eligible or authorized.

Do not share Table row objects, ChartPoint objects, row indexes, or DOM references.

## Keep values semantic

Table accessors may return formatted strings, cached cell values, aggregates, or presentation metadata. Feed Charts the underlying numeric, temporal, categorical, or interval values.

Common errors:

- plotting a formatted currency string;
- sorting a time-series path by the current grid column;
- using an expanded group row and its children as independent observations;
- counting duplicated join rows as distinct entities;
- charting only a client page while labeling it as the full result;
- applying server pagination with client-only sorting or filtering and implying global order.

## Use chart and grid as complements

Prefer these product patterns:

- chart summary plus grid detail from one semantic projection;
- chart selection highlights matching grid rows without removing context;
- grid selection annotates or compares a bounded subset in the chart;
- chart brush commits a semantic time range used by both surfaces;
- grid expansion reveals lineage for one chart aggregate;
- chart and accessible data table share metric formatting and source notes.

## Verify reconciliation

- Aggregate detail rows independently and compare them with chart summaries.
- Test pre-filtered, filtered, grouped, pre-pagination, paginated, and selected scopes.
- Sort by an unrelated column and prove time-series topology remains correct.
- Paginate and virtualize without losing offscreen selection.
- Apply remote inserts, updates, and deletes while a row is selected.
- Test duplicate source entities and grouped rows with derived IDs.

Official references:

- <https://tanstack.com/table/latest/docs/guide/row-models>
- <https://tanstack.com/table/latest/docs/guide/rows>
- <https://tanstack.com/table/latest/docs/guide/sorting>
- <https://tanstack.com/table/latest/docs/guide/data>
