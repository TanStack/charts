# Migrate From Observable Plot

Observable Plot and TanStack Charts both use marks, channels, transforms, scales, and facets, but their ownership boundaries differ. Translate the meaning of each Plot mark rather than copying its generated SVG or expecting every option name to match.

## Inventory

| Plot concern        | Inspect                                     | TanStack destination                                        |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| `Plot.plot` options | dimensions, margins, style, scales, legends | chart definition plus host sizing/theme                     |
| mark constructor    | source rows, channels, mark-local transform | first-party mark or composition                             |
| Plot transform      | output row grain and ordering               | eager TanStack/application transform or mark layout         |
| scale option        | inferred/fixed domain, clamp, nice, reverse | factory versus configured instance; no authored pixel range |
| facet               | shared/independent axes and domains         | `facetChart`, `facet`, or named views                       |
| pointer tip         | grouping, nearest policy, content           | focus strategy, tooltip, crosshair, optional portal         |
| generated SVG       | accessibility and application overlays      | renderer output; never migration input                      |

## Sequence

1. Capture the rows passed to every Plot mark after application preparation.
2. Record mark order and which layer owns interaction.
3. Separate Plot transforms into reusable data work versus geometry-only layout.
4. Recreate factories or configured scale domains; omit positional ranges.
5. Build the smallest equivalent mark composition.
6. Add focus grouping and tooltip content from semantic points.
7. Compare facets, empty values, inferred domains, and responsive guide margins.

## High-Risk Differences

- Plot convenience marks may combine multiple TanStack layers; preserve semantics, not constructor count.
- Plot's generated SVG classes and nodes are not a stable contract. Do not query or move them.
- A Plot transform may change row grain or retain source records differently. Assert output rows and tooltip lineage.
- Plot dimensions often live in the plot options. In TanStack Charts, container width and host height are separate from definition semantics.
- Plot pointer interactions may infer a presentation that needs explicit `focus`, tooltip, crosshair, or controlled state.

## Parity Cases

- Same fixture at narrow and wide containers.
- Missing positional values and explicit intervals.
- Facet domain policy and outer versus cell axes.
- Grouped tooltip order and keyboard focus.
- Exported static SVG without source-library DOM dependencies.

Source: `docs/guides/migrating.md`; `packages/charts-core-d3/docs/observable-plot-migration.md`
