# Mark Selection and Composition Matrix

Choose by semantic ownership, not visual resemblance. Read the corresponding mark reference for exact channels.

| Need                             | Start with                         | Compose when                                      | Ownership check                                             |
| -------------------------------- | ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| Trend                            | `lineY` / `lineX`                  | add dots, interval area, target rule, annotations | input order is path order; `z` partitions paths             |
| Range or uncertainty             | `areaY` / `areaX`                  | add boundary lines and observed/projected status  | explicit endpoints carry interval meaning                   |
| Difference between paths         | `differenceY` / `differenceX`      | add source lines and zero rule                    | difference owns crossover geometry                          |
| Category magnitude               | `barX` / `barY`                    | add target rule, labels, selected overlay         | zero baseline and stack/group policy                        |
| General interval or heatmap cell | `rect` / `cell`                    | add labels or boundaries                          | both endpoints materialize scales                           |
| Relationship or observation      | `dot` / `hexagon`                  | regression, density, selected overlay             | one stable point per observation                            |
| Distribution summary             | `boxX` / `boxY`, violin, ridgeline | facets for groups, raw dots when useful           | composite retains quartiles/outliers/lineage                |
| Threshold or baseline            | `ruleX` / `ruleY`                  | text label or interval band                       | usually decorative unless it is selectable data             |
| Annotation                       | `text`, dot, rule, rect, link      | prepare sparse annotation rows                    | selection rule belongs in data preparation                  |
| Directed relation                | `arrow`, `link`, `vector`          | nodes, labels, edge emphasis                      | endpoints and direction are explicit channels               |
| Polar comparison                 | polar capability marks             | center labels, reference rings                    | angle, radius, and cyclic order are semantic                |
| Geographic shape                 | `geoShape` and geo capability      | points, labels, graticule                         | projection and spatial unit are explicit                    |
| Density/partition                | hexbin, contour, density           | raw samples only when readable                    | final bounds can change topology                            |
| Hierarchy                        | treemap, sunburst, hierarchy tree  | sparse labels and selection                       | parent-child integrity and root policy                      |
| Flow                             | Sankey                             | node/edge labels and controlled selection         | conservation, source/target identity                        |
| Network                          | force/link primitives              | selected neighborhood or matrix alternative       | link semantics and stable node keys                         |
| Repeated comparison              | `facetChart` / `facet`             | shared guides and explicit domain policy          | same question and panel grammar                             |
| Distinct coordinated roles       | `composeViews`                     | `shareX/Y` or `alignX/Y` links                    | one figure if one accessible task; separate hosts otherwise |

## Layer Order

1. Background regions and filled areas.
2. Reference bands and rules.
3. Primary bars, paths, or cells.
4. Highlight points, ticks, links, or vectors.
5. Labels and annotations.

## Interaction Ownership

For layered marks representing the same observation:

1. Pick the layer whose geometry best represents the selectable datum.
2. Keep its stable `id` and datum `key`.
3. Wrap always-painted supporting layers in `decorative`.
4. Use focused/selected conditional marks for state presentation without duplicate points.
5. Verify pointer and keyboard traversal report one semantic observation once.

## Facet Versus View

| Condition                                          | Use                              |
| -------------------------------------------------- | -------------------------------- |
| Same grammar repeated by one grouping field        | facet                            |
| Same positional meaning must compare across panels | shared configured domains        |
| Independent domains reveal local structure         | cell axes plus explicit labeling |
| Panels have different roles or mark grammars       | named views                      |
| Panels need independent tooltips or labels         | separate hosts                   |

Source: `docs/concepts/marks-and-layering.md`; `docs/guides/faceting-and-composition.md`
