# TanStack Charts — Skill Spec

TanStack Charts is a typed, renderer-neutral visualization grammar for application charts. These skills teach agents how to make visualization decisions, compose the grammar, migrate existing charts, and verify behavior without copying the API reference into skill bodies.

Status: reviewed. The maintainer directed generation from repository evidence without further interview rounds.

## Authoring Contract

Every scenario uses the same compact sequence:

1. **Trigger** — state the user request or failure that loads the scenario.
2. **Inspect** — identify the data semantics, existing ownership, environment, and constraints.
3. **Decide** — choose the comparison, transform, mark, scale, behavior, or migration boundary.
4. **Build** — show only the non-obvious TanStack Charts composition.
5. **Verify** — name the evidence that proves the result.

Canonical documentation owns signatures and option inventories. Skills own judgment, sequencing, failure modes, migration strategy, and verification.

## Domains

| Domain                  | Description                                                                                                                     | Skills                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Frame the visualization | Turn a user question and metric into an honest visual task with explicit comparison and evidence goals.                         | `design-a-chart`                                                                                                       |
| Encode application data | Prepare semantic rows and express them through marks, scales, guides, color, and composed views.                                | `prepare-chart-data`, `compose-marks-and-views`, `configure-scales-guides-color`                                       |
| Adapt chart behavior    | Make charts respond correctly to containers, interaction, application state, updates, motion, and surrounding TanStack systems. | `design-responsive-charts`, `build-chart-interactions`, `update-and-animate-charts`, `coordinate-charts-with-tanstack` |
| Ship and evolve charts  | Migrate, integrate, extend, test, and deliver charts across renderers and frameworks.                                           | `migrate-to-tanstack-charts`, `ship-accessible-charts`, `debug-and-verify-charts`, `extend-tanstack-charts`            |

## Skill Inventory

| Skill                             | Type        | Domain                  | What it covers                                                                         | Failure modes |
| --------------------------------- | ----------- | ----------------------- | -------------------------------------------------------------------------------------- | ------------: |
| `design-a-chart`                  | core        | frame-the-visualization | User goals, metric semantics, task-to-visual mapping, projections, acceptance criteria |             4 |
| `prepare-chart-data`              | core        | encode-application-data | Ordering, aggregation, transforms, missing values, derived rows, lineage               |             4 |
| `compose-marks-and-views`         | core        | encode-application-data | Mark choice, layering, annotations, facets, coordinated views, point ownership         |             4 |
| `configure-scales-guides-color`   | core        | encode-application-data | Domains, ranges, axes, legends, label policy, grouping, paint                          |             4 |
| `design-responsive-charts`        | core        | adapt-chart-behavior    | Container sizing, information priority, margins, final bounds, topology                |             4 |
| `build-chart-interactions`        | core        | adapt-chart-behavior    | Focus, tooltips, selection, cursors, brush, zoom, keyboard parity                      |             4 |
| `update-and-animate-charts`       | core        | adapt-chart-behavior    | Definition identity, keys, animation, interruption, streaming                          |             4 |
| `coordinate-charts-with-tanstack` | composition | adapt-chart-behavior    | Table row scopes, Query/DB sync, shared state, virtualization, pacing, SSR             |             7 |
| `migrate-to-tanstack-charts`      | composition | ship-and-evolve-charts  | Semantic inventory, ownership translation, phased migration, parity                    |             4 |
| `ship-accessible-charts`          | lifecycle   | ship-and-evolve-charts  | Accessibility, SSR, adapters, renderers, export, package boundaries                    |             5 |
| `debug-and-verify-charts`         | lifecycle   | ship-and-evolve-charts  | Types, data, geometry, interactions, packed consumers, performance                     |             4 |
| `extend-tanstack-charts`          | core        | ship-and-evolve-charts  | Custom marks, resolved layouts, renderers, hosts, controls, views                      |             4 |

## Failure Mode Inventory

### Design a chart from a user goal (4)

|   # | Mistake                                    | Priority | Source                                              | Cross-skill? |
| --: | ------------------------------------------ | -------- | --------------------------------------------------- | ------------ |
|   1 | Starting with a requested chart type       | CRITICAL | `docs/guides/choosing-a-chart.md`                   | —            |
|   2 | Showing a rate without its denominator     | HIGH     | `API-FRICTION.md` F-217; transforms reference       | —            |
|   3 | Rendering projections as observed history  | CRITICAL | Lines and areas examples; difference mark reference | —            |
|   4 | Choosing area or angle for precise ranking | HIGH     | Chart-choice guide; bar and ranking examples        | —            |

### Prepare chart data (4)

|   # | Mistake                                             | Priority | Source                                              | Cross-skill? |
| --: | --------------------------------------------------- | -------- | --------------------------------------------------- | ------------ |
|   1 | Sorting a line after creating its mark              | CRITICAL | Line and area reference                             | —            |
|   2 | Running eager transforms inside responsive builders | HIGH     | Transform/reactivity guide; `API-FRICTION.md` F-128 | —            |
|   3 | Manually accumulating ordinary stacks               | HIGH     | GitHub issue 9; `API-FRICTION.md` F-163             | —            |
|   4 | Flattening derived rows without lineage             | HIGH     | Transforms reference and guide                      | —            |

### Compose marks and views (4)

|   # | Mistake                                             | Priority | Source                                         | Cross-skill?               |
| --: | --------------------------------------------------- | -------- | ---------------------------------------------- | -------------------------- |
|   1 | Encoding the whole chart as one custom path         | CRITICAL | Grammar and custom-mark guides                 | —                          |
|   2 | Expecting an area to draw its boundary line         | MEDIUM   | Line and area reference                        | —                          |
|   3 | Letting decorative layers own duplicate points      | HIGH     | `API-FRICTION.md` F-218; tooltip/focus guide   | `build-chart-interactions` |
|   4 | Rebuilding supported coordinate systems in userland | HIGH     | `API-FRICTION.md` F-117, F-199–F-208; examples | —                          |

### Configure scales, guides, and color (4)

|   # | Mistake                                               | Priority | Source                                           | Cross-skill?               |
| --: | ----------------------------------------------------- | -------- | ------------------------------------------------ | -------------------------- |
|   1 | Assigning positional pixel ranges in application code | CRITICAL | `API-FRICTION.md` F-002; scales guide            | `design-responsive-charts` |
|   2 | Using a default instance for inferred domains         | CRITICAL | 0.0.1 changelog migration; scales guide          | —                          |
|   3 | Using color as geometry identity accidentally         | HIGH     | `API-FRICTION.md` F-009, F-013; channels concept | —                          |
|   4 | Treating containment as collision avoidance           | HIGH     | `API-FRICTION.md` F-023, F-160; responsive guide | `design-responsive-charts` |

### Design responsive charts (4)

|   # | Mistake                                               | Priority | Source                                           | Cross-skill? |
| --: | ----------------------------------------------------- | -------- | ------------------------------------------------ | ------------ |
|   1 | Adapting to viewport width instead of container width | CRITICAL | Responsive guide                                 | —            |
|   2 | Using surface width as final plot width               | CRITICAL | `API-FRICTION.md` F-116, F-219; responsive guide | —            |
|   3 | Assuming resize only stretches existing geometry      | HIGH     | Waffle, treemap, Delaunay, and hexbin references | —            |
|   4 | Using fixed width for ordinary application charts     | HIGH     | Responsive guide; `API-FRICTION.md` F-111        | —            |

### Build chart interactions (4)

|   # | Mistake                                            | Priority | Source                                       | Cross-skill? |
| --: | -------------------------------------------------- | -------- | -------------------------------------------- | ------------ |
|   1 | Mutating rendered SVG for focus presentation       | CRITICAL | GitHub issue 9; `API-FRICTION.md` F-178      | —            |
|   2 | Focusing a point-less rule mark                    | HIGH     | GitHub issue 32; `API-FRICTION.md` F-237     | —            |
|   3 | Treating controlled callbacks as complete behavior | CRITICAL | `API-FRICTION.md` F-075; interactions guide  | —            |
|   4 | Keeping tooltips inside clipped ancestors          | HIGH     | `API-FRICTION.md` F-133; tooltip/focus guide | —            |

### Update and animate charts (4)

|   # | Mistake                                     | Priority | Source                                             | Cross-skill? |
| --: | ------------------------------------------- | -------- | -------------------------------------------------- | ------------ |
|   1 | Creating a fresh definition on every render | CRITICAL | Definition-identity migration; dynamic-data guide  | —            |
|   2 | Keying changing entities by row position    | CRITICAL | `API-FRICTION.md` F-131, F-239; dynamic-data guide | —            |
|   3 | Animating every responsive resize           | HIGH     | `API-FRICTION.md` F-129; responsive guide          | —            |
|   4 | Morphing rolling samples by array index     | HIGH     | `API-FRICTION.md` F-240; dynamic-data guide        | —            |

### Coordinate charts with TanStack (7)

|   # | Mistake                                            | Priority | Source                                            | Cross-skill?                |
| --: | -------------------------------------------------- | -------- | ------------------------------------------------- | --------------------------- |
|   1 | Charting the final rendered row model accidentally | CRITICAL | TanStack Table row-model guide                    | `prepare-chart-data`        |
|   2 | Keying coordination by row or virtual index        | CRITICAL | Table rows; `API-FRICTION.md` F-120, F-131, F-239 | `update-and-animate-charts` |
|   3 | Duplicating filtering and aggregation              | CRITICAL | Transform guide; `API-FRICTION.md` F-128, F-163   | `prepare-chart-data`        |
|   4 | Creating a bidirectional state loop                | CRITICAL | Chart interactions; Router search state           | `build-chart-interactions`  |
|   5 | Treating optimistic rows as confirmed history      | HIGH     | TanStack DB mutations and live queries            | `update-and-animate-charts` |
|   6 | Persisting every interaction frame                 | CRITICAL | Chart interactions; TanStack Pacer timing         | `build-chart-interactions`  |
|   7 | Treating virtualization as analytical filtering    | HIGH     | TanStack Virtual virtualizer                      | `design-responsive-charts`  |

### Migrate charts to TanStack Charts (4)

|   # | Mistake                                         | Priority | Source                                                 | Cross-skill? |
| --: | ----------------------------------------------- | -------- | ------------------------------------------------------ | ------------ |
|   1 | Translating component names one for one         | CRITICAL | Migration guide                                        | —            |
|   2 | Replacing transforms and renderer together      | CRITICAL | Migration guide; TanStack Stats migration notes        | —            |
|   3 | Calling screenshot similarity complete parity   | CRITICAL | `API-FRICTION.md` F-036, F-073, F-081; migration guide | —            |
|   4 | Reimplementing source-library internals blindly | HIGH     | Migration guide; `API-FRICTION.md` F-127               | —            |

### Ship accessible charts (5)

|   # | Mistake                                             | Priority | Source                                                           | Cross-skill? |
| --: | --------------------------------------------------- | -------- | ---------------------------------------------------------------- | ------------ |
|   1 | Using a generic accessible label                    | CRITICAL | Accessibility guide                                              | —            |
|   2 | Making the chart the only critical representation   | HIGH     | Accessibility guide; archived accessibility notes                | —            |
|   3 | Mounting the browser host during server rendering   | CRITICAL | GitHub issue 56; SSR guide                                       | —            |
|   4 | Putting chart behavior on adapter props             | HIGH     | Chart-behavior migration; React adapter reference                | —            |
|   5 | Importing the universal barrel on native by default | HIGH     | `API-FRICTION.md` F-154, F-171, F-173, F-256; native quick start | —            |

### Debug and verify charts (4)

|   # | Mistake                                            | Priority | Source                                               | Cross-skill? |
| --: | -------------------------------------------------- | -------- | ---------------------------------------------------- | ------------ |
|   1 | Casting a rejected chart definition                | CRITICAL | TypeScript guide and types reference                 | —            |
|   2 | Asserting only that an element exists              | CRITICAL | `API-FRICTION.md` F-036, F-073, F-081; testing guide | —            |
|   3 | Testing workspace source instead of packed exports | HIGH     | `API-FRICTION.md` F-090, F-139, F-167, F-224         | —            |
|   4 | Trusting one aggregate performance number          | HIGH     | `API-FRICTION.md` F-078–F-084; performance guide     | —            |

### Extend TanStack Charts (4)

|   # | Mistake                                             | Priority | Source                                                 | Cross-skill? |
| --: | --------------------------------------------------- | -------- | ------------------------------------------------------ | ------------ |
|   1 | Reading or mutating the DOM during scene generation | CRITICAL | Custom-mark guide; `packages/charts-core/src/mark.ts`  | —            |
|   2 | Inferring a private positional domain during render | CRITICAL | Custom-extension reference; archived custom-mark notes | —            |
|   3 | Conflating interaction and scale values             | HIGH     | `API-FRICTION.md` F-094; types reference               | —            |
|   4 | Running side effects in resolved-layout callbacks   | HIGH     | Hexbin and Sankey references                           | —            |

## Tensions

| Tension                                            | Skills                                                                                       | Agent implication                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Analytical honesty versus visual simplicity        | `design-a-chart` ↔ `prepare-chart-data`                                                      | Appearance wins before denominators, lineage, uncertainty, or comparison validity are preserved. |
| Responsive adaptation versus comparison stability  | `design-responsive-charts` ↔ `configure-scales-guides-color`                                 | A chart is made to fit by silently changing what position or color means.                        |
| Rich interaction versus portable rendering         | `build-chart-interactions` ↔ `ship-accessible-charts` ↔ `extend-tanstack-charts`             | DOM mutation is chosen before renderer-neutral marks, controls, or hosts.                        |
| Motion continuity versus current-state correctness | `update-and-animate-charts` ↔ `design-responsive-charts` ↔ `debug-and-verify-charts`         | Final frames pass while interruption leaves stale focus, guides, or geometry.                    |
| Local responsiveness versus synchronized truth     | `coordinate-charts-with-tanstack` ↔ `build-chart-interactions` ↔ `update-and-animate-charts` | Chart, grid, URL, and synchronized data can describe different accepted states.                  |

## Cross-References

| From                              | To                                                                                                       | Reason                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `design-a-chart`                  | `prepare-chart-data`, `compose-marks-and-views`                                                          | The analytical task determines the transform and mark composition.                                                |
| `prepare-chart-data`              | `configure-scales-guides-color`, `build-chart-interactions`                                              | Derived values determine domains, legends, tooltip content, and lineage.                                          |
| `compose-marks-and-views`         | `build-chart-interactions`, `extend-tanstack-charts`                                                     | Layering determines point ownership; native composition should precede extension.                                 |
| `configure-scales-guides-color`   | `design-responsive-charts`, `debug-and-verify-charts`                                                    | Final ranges depend on size, and blank charts often expose scale-contract failures.                               |
| `design-responsive-charts`        | `ship-accessible-charts`, `update-and-animate-charts`                                                    | Initial size and resize policy affect hydration, accessibility, and motion.                                       |
| `build-chart-interactions`        | `coordinate-charts-with-tanstack`, `ship-accessible-charts`, `update-and-animate-charts`                 | Interactions require explicit cross-surface ownership, keyboard parity, and stable update identity.               |
| `coordinate-charts-with-tanstack` | `prepare-chart-data`, `build-chart-interactions`, `update-and-animate-charts`, `debug-and-verify-charts` | Ecosystem coordination needs one semantic projection, intent owner, identity contract, and synchronization proof. |
| `migrate-to-tanstack-charts`      | `design-a-chart`, `debug-and-verify-charts`                                                              | Migration must restate the analytical task and prove parity beyond screenshots.                                   |
| `ship-accessible-charts`          | `debug-and-verify-charts`                                                                                | SSR, accessibility, renderer, and package claims need consumer-level proof.                                       |
| `extend-tanstack-charts`          | `compose-marks-and-views`, `debug-and-verify-charts`                                                     | Extensions need justification against native composition and cross-renderer proof.                                |

## Subsystems & Reference Candidates

| Skill                             | Subsystems                                                                       | Reference candidates                        |
| --------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| `prepare-chart-data`              | —                                                                                | Transform selection and output contracts    |
| `compose-marks-and-views`         | —                                                                                | Mark decision matrix                        |
| `configure-scales-guides-color`   | —                                                                                | Scale and guide ownership matrix            |
| `build-chart-interactions`        | —                                                                                | Interaction state machines                  |
| `coordinate-charts-with-tanstack` | Table and grids; Query, DB, and sync; Router, Store, Virtual, Pacer, Start, Form | Cross-library ownership and synchronization |
| `migrate-to-tanstack-charts`      | Observable Plot, Recharts, Chart.js, ECharts, D3                                 | Per-library ownership and parity mappings   |
| `ship-accessible-charts`          | DOM adapters, React Native, renderers and export                                 | Framework lifecycle deviations              |
| `extend-tanstack-charts`          | —                                                                                | Extension protocols                         |

## Resolved Policies

| Skill                        | Policy                                                                                                  | Status   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| `design-a-chart`             | Recommend a truthful form first; preserve an insisted form only with explicit analytical limitations.   | resolved |
| `migrate-to-tanstack-charts` | Generate five evidence-backed source-library references; use the shared semantic workflow for others.   | resolved |
| `ship-accessible-charts`     | Load React Native guidance only for an explicit native target and require application-level validation. | resolved |

## Recommended Skill File Structure

- **Core skills:** eight framework-neutral entry points cover chart design, data preparation, composition, scales, responsiveness, interaction, updates, and extension.
- **Framework guidance:** lifecycle deviations live under `ship-accessible-charts/references/`, split into one reference per adapter.
- **Lifecycle skills:** `ship-accessible-charts` and `debug-and-verify-charts` cover production delivery and evidence.
- **Composition skills:** `migrate-to-tanstack-charts` owns source-library mappings; `coordinate-charts-with-tanstack` owns cross-library data and state boundaries.
- **Reference files:** use references for transforms, mark selection, scales/guides, interactions, migrations, adapter lifecycle, and extension protocols. Keep each `SKILL.md` on the scenario contract and highest-risk failures.

## Composition Opportunities

| Library                                                         | Integration points                                                           | Composition skill needed?                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Observable Plot                                                 | Marks, transforms, scales, facets, pointer behavior, generated SVG           | Yes — `migrate-to-tanstack-charts` reference                             |
| Recharts                                                        | React components, implicit series data, shapes, axes, tooltip state          | Yes — `migrate-to-tanstack-charts` reference                             |
| Chart.js                                                        | Dataset configuration, plugins, Canvas lifecycle, imperative updates         | Yes — `migrate-to-tanstack-charts` reference                             |
| ECharts                                                         | Options, `dataZoom`, `axisPointer`, actions, renderer state                  | Yes — `migrate-to-tanstack-charts` reference                             |
| D3                                                              | Selections, scales, layouts, gestures, DOM lifecycle                         | Yes — `migrate-to-tanstack-charts` reference                             |
| React, Preact, Vue, Solid, Svelte, Angular, Lit, Alpine, Octane | Host mount, update, SSR, tooltip body composition, cleanup                   | No separate skill; targeted lifecycle references                         |
| React Native and `react-native-svg`                             | Native layout, text metrics, paint, accessibility actions, bundle boundaries | No separate skill; load its reference only for an explicit native target |
| TanStack Table and data grids                                   | Row scopes, filters, grouping, pagination, selection, drill-down             | Yes — `coordinate-charts-with-tanstack` table reference                  |
| TanStack Query, DB, and sync engines                            | Freshness, live projections, optimistic state, persistence, rollback         | Yes — `coordinate-charts-with-tanstack` data reference                   |
| TanStack Router, Store, Virtual, Pacer, Start, and Form         | Shared intent, URL state, render windows, scheduling, SSR, validated drafts  | Yes — `coordinate-charts-with-tanstack` application-state reference      |

## Documentation Checklist

All 100 canonical Markdown files under `docs/` were read. The generated `packages/charts-core/docs` copy was compared and deduplicated. All eight archived D3-core documents were read for migration evidence.

<details>
<summary>Canonical docs (100)</summary>

```text
docs/comparison.md
docs/concepts/chart-definitions.md
docs/concepts/data-and-channels.md
docs/concepts/grammar-of-graphics.md
docs/concepts/layout-axes-and-coordinates.md
docs/concepts/marks-and-layering.md
docs/concepts/scales-and-d3.md
docs/examples/annotations-and-overlays.md
docs/examples/bars-and-rankings.md
docs/examples/distributions.md
docs/examples/facets-and-multiple-views.md
docs/examples/heatmaps-and-densities.md
docs/examples/index.md
docs/examples/interactive-charts.md
docs/examples/intervals-and-financial.md
docs/examples/lines-and-areas.md
docs/examples/maps-and-spatial.md
docs/examples/networks-and-hierarchies.md
docs/examples/polar-and-radar.md
docs/examples/scatterplots-and-relationships.md
docs/examples/stacked-and-composition.md
docs/framework/alpine/adapter.md
docs/framework/alpine/reference/chart.md
docs/framework/angular/adapter.md
docs/framework/angular/reference/chart.md
docs/framework/lit/adapter.md
docs/framework/lit/reference/chart.md
docs/framework/octane/adapter.md
docs/framework/octane/quick-start.md
docs/framework/octane/reference/chart.md
docs/framework/preact/adapter.md
docs/framework/preact/reference/chart.md
docs/framework/react/adapter.md
docs/framework/react/quick-start.md
docs/framework/react/reference/chart.md
docs/framework/solid/adapter.md
docs/framework/solid/reference/chart.md
docs/framework/svelte/adapter.md
docs/framework/svelte/reference/chart.md
docs/framework/vue/adapter.md
docs/framework/vue/reference/chart.md
docs/guides/accessibility.md
docs/guides/ai-authoring.md
docs/guides/bundle-size-and-performance.md
docs/guides/choosing-a-chart.md
docs/guides/custom-marks-and-renderers.md
docs/guides/dynamic-data-and-animation.md
docs/guides/exporting.md
docs/guides/faceting-and-composition.md
docs/guides/interactions-and-selections.md
docs/guides/large-data.md
docs/guides/legends-and-color.md
docs/guides/migrating.md
docs/guides/responsive-charts.md
docs/guides/ssr-and-hydration.md
docs/guides/testing-and-debugging.md
docs/guides/themes-and-styling.md
docs/guides/tooltips-and-focus.md
docs/guides/transforms-and-reactivity.md
docs/guides/typescript.md
docs/installation.md
docs/overview.md
docs/quick-start.md
docs/reference/adapter-controller.md
docs/reference/chart-definitions.md
docs/reference/chart-spec.md
docs/reference/custom-extensions.md
docs/reference/dom-host.md
docs/reference/focus-and-interaction.md
docs/reference/index.md
docs/reference/marks/bar-and-rect.md
docs/reference/marks/box.md
docs/reference/marks/contour.md
docs/reference/marks/delaunay.md
docs/reference/marks/density.md
docs/reference/marks/difference.md
docs/reference/marks/dodge.md
docs/reference/marks/dot-and-hexagon.md
docs/reference/marks/focus-guide.md
docs/reference/marks/geo.md
docs/reference/marks/hexbin.md
docs/reference/marks/line-and-area.md
docs/reference/marks/polar.md
docs/reference/marks/regression.md
docs/reference/marks/ridgeline.md
docs/reference/marks/rules-links-arrows-vectors-and-ticks.md
docs/reference/marks/sankey.md
docs/reference/marks/sunburst.md
docs/reference/marks/text-frame-and-facet.md
docs/reference/marks/treemap.md
docs/reference/marks/violin.md
docs/reference/marks/voronoi.md
docs/reference/marks/waffle.md
docs/reference/motion.md
docs/reference/rendering-and-export.md
docs/reference/runtime-and-scene.md
docs/reference/scales-guides-and-color.md
docs/reference/transforms.md
docs/reference/types.md
docs/reference/view-composition.md
```

</details>

<details>
<summary>Archived D3-core docs (8)</summary>

```text
packages/charts-core-d3/docs/AI-GUIDE.md
packages/charts-core-d3/docs/bundle-and-performance.md
packages/charts-core-d3/docs/custom-marks.md
packages/charts-core-d3/docs/dynamic-charts.md
packages/charts-core-d3/docs/observable-plot-migration.md
packages/charts-core-d3/docs/recipes.md
packages/charts-core-d3/docs/responsive-theme-accessibility.md
packages/charts-core-d3/docs/tanstack-stats-migration.md
```

</details>

Additional evidence read: root and client package READMEs, adapter implementations, package manifests and peer constraints, `API-FRICTION.md` F-001–F-257, relevant `CHANGELOG.md` migrations, all ten public GitHub issues found for the repository, and current official TanStack Table, Query, DB, Router, Store, Virtual, Pacer, Start, and Form guidance needed for ecosystem coordination.
