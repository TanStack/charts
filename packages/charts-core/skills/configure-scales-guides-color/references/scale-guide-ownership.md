# Scale and Guide Ownership

## Scale Input Decision

| Requirement                                          | Supply                                           | Owner                                                    |
| ---------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Domain follows rendered mark channels                | scale factory                                    | Charts infers domain and assigns range                   |
| Configure padding before inferred categorical domain | zero-argument factory returning configured scale | application owns padding; Charts owns domain/range       |
| Domain is product state or shared comparison policy  | configured scale instance                        | application owns domain; Charts copies and assigns range |
| Reverse visual direction                             | axis `reverse`                                   | Charts reverses range without rewriting domain           |
| Nice inferred continuous domain                      | axis `nice`                                      | Charts applies after domain inference                    |
| Numeric or categorical basics                        | compact exact subpath                            | application chooses family                               |
| Elapsed time or nonlinear mapping                    | exact `d3-scale` family                          | application declares direct dependency                   |

Never assign positional pixel ranges in authored chart code.

## Scale Family Decision

| Meaning                            | Start with                           | Upgrade condition                                             |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| Numeric position                   | `@tanstack/charts/scales/linear`     | piecewise, nonnumeric interpolation, log/power/symlog/radial  |
| Categorical position with width    | `@tanstack/charts/scales/band`       | required behavior exceeds compact contract                    |
| Categorical position without width | `@tanstack/charts/scales/point`      | elapsed time matters                                          |
| Stable categorical paint           | `@tanstack/charts/scales/ordinal`    | sequential/diverging/quantile/threshold semantics             |
| Calendar time                      | `d3-scale` `scaleTime` or `scaleUtc` | always; point/band dates do not preserve elapsed duration     |
| Sequential/diverging quantity      | D3 color scale                       | center, interpolation, or statistical thresholds are semantic |

## Guide Decision

| Need                         | Configure                             | Verify                                                    |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------- |
| Fewer or more candidates     | `ticks.count` or `ticks.spacing`      | actual scale may return a different count                 |
| Exact semantic candidates    | `ticks.values`                        | kept labels outside candidates do not add grid/tick stubs |
| Collision policy             | `tickLabels.thin`                     | smallest supported width                                  |
| Rotated labels               | `tickLabels.rotate` and anchor policy | measured margins and readable baseline                    |
| Preserve endpoints or events | `thin.keep` / priority                | hard-kept labels may collide with each other              |
| Hide guide but retain scale  | `axis: false`                         | marks still materialize scale                             |
| Hide grid separately         | `grid: false`                         | guide and grid are independent                            |
| Shared comparison            | configured instances/domains          | filtering does not rescale meaning                        |

## Color Ownership

| Channel/config         | Meaning                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `z`                    | geometry and interaction group identity                     |
| mark `color`           | value sent through chart color scale and legend             |
| mark `fill` / `stroke` | final paint override; bypasses scale mapping for that paint |
| chart `color.scale`    | categorical or quantitative mapping                         |
| chart `color.legend`   | visual explanation of the resolved color scale              |

Use a stable configured ordinal domain when a product category must retain its color across filtering, reordering, sessions, or views. Use sequential color for ordered magnitude and diverging color only around a meaningful center. Keep essential state available without color.

## Failure Diagnosis Order

1. Confirm every materialized x/y channel has the matching axis scale.
2. Confirm the scale domain type matches channel values.
3. Distinguish factory inference from instance-owned domain.
4. Check finite values, log constraints, and missing endpoints.
5. Inspect the resolved domain and final range.
6. Inspect guide margins and clipping separately from the scale.

Source: `docs/concepts/scales-and-d3.md`; `docs/reference/scales-guides-and-color.md`; `docs/guides/legends-and-color.md`
