# TanStack Application State and Lifecycle

Load this reference when Charts coordinates with Router, Store, Virtual, Pacer, Start, Form, or other TanStack application infrastructure.

## Route state by lifetime

| State                           | Owner                             | Examples                                                           |
| ------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Ephemeral presentation          | Charts or component               | hover, pointer coordinate, open tooltip, drag preview              |
| Shared session intent           | Store or lifted application state | selected IDs, active metric, linked-view domain                    |
| Restorable navigation           | Router search                     | validated filters, comparison period, grouping, committed viewport |
| Server state                    | Query                             | fetched records, freshness, errors, retries                        |
| Synchronized records and writes | DB                                | live collections, optimistic transactions, persistence             |
| Draft input                     | Form or local state               | uncommitted thresholds, date input, scenario parameters            |

Promote state only when another consumer or lifecycle needs it. Do not mirror the same value in Chart behavior, Table state, Store, and Router.

## Router

Put compact, semantic, validated intent in search parameters:

- metric and grouping identifiers;
- filter values;
- selected stable IDs when safe to share;
- committed time domain;
- comparison mode.

Do not serialize pixels, DOM state, tooltip content, entire row objects, huge selections, unvalidated expressions, or sensitive values. Replace high-frequency intermediate navigation rather than adding history entries, and commit a deliberate state when the interaction ends.

Verify back/forward navigation, invalid URLs, schema migrations, permissions, and SSR hydration.

## Store

Use Store for shared client state that is neither server data nor navigation state. Keep subscriptions narrow and derive view-specific values instead of hand-synchronizing copies.

Good candidates:

- selected semantic keys shared by chart and grid;
- linked crosshair value across coordinated views;
- dashboard comparison mode;
- transient draft state shared across sibling controls.

Keep high-frequency state local unless another mounted surface truly consumes it. Normalize equivalent updates before publishing them to prevent echo loops.

## Virtual

Virtual owns which grid rows or dashboard lanes are mounted and their scroll measurements. It does not redefine the data population.

- Use source or filtered rows for an overall chart.
- Use the virtual window only for a chart explicitly summarizing visible rows.
- Keep selected offscreen keys in semantic state.
- Coordinate scroll-to-row by stable key, resolving the current index only at the Virtual boundary.
- Do not create one active chart runtime for every unmounted dashboard lane.

## Pacer

Pace the expensive boundary with the correct loss semantics:

- debounce draft filters and scenario inputs;
- throttle disposable previews;
- queue required writes;
- batch compatible changes and telemetry;
- flush or cancel on commit, navigation, and teardown as appropriate.

Surface pending or queued state when it affects user expectations. Do not stack unrelated debounce policies across Form, Router, Query, DB, and chart preparation.

## Start and SSR

Resolve one deterministic request snapshot for chart and grid. Keep locale, time zone, filter schema, data revision, and initial chart geometry consistent across server render and hydration.

Protect private data at the server function or route that serves it; route UI guards are not the authorization boundary. Avoid streaming partial chart and grid states that appear directly comparable unless completeness is visible.

## Form

Use Form or local draft state when chart controls require validation, linked fields, cancellation, or an explicit apply action. Preview valid draft values locally, then commit one semantic intent or DB transaction.

Do not let an invalid date range, logarithmic bound, denominator, or scenario parameter reach chart scales or synchronized state merely because a field changed.

## Verify the product workflow

- Restore a deep link and reproduce the same metric, filters, revision, and domain.
- Traverse chart, grid, and controls by keyboard without competing shortcuts.
- Scroll and virtualize without changing analytical totals.
- Type quickly into filters and prove obsolete requests and projections cannot win.
- Commit, cancel, retry, navigate, and destroy with no pending timer or subscription leak.
- Hydrate with the same locale, time zone, data status, and geometry used by the server.

Official references:

- <https://tanstack.com/router/latest/docs/framework/react/guide/search-params>
- <https://tanstack.com/store/latest>
- <https://tanstack.com/virtual/latest/docs/api/virtualizer>
- <https://tanstack.com/pacer/latest>
- <https://tanstack.com/start/latest/docs/framework/react/guide/server-functions>
- <https://tanstack.com/form/latest/docs/framework/react/guides/linked-fields>
