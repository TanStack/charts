# AG Charts AI and ecosystem notes

**Retrieved**: 2026-07-26  
**Sources**:

- https://www.ag-grid.com/charts/react/skills/
- https://www.ag-grid.com/javascript-data-grid/integrated-charts/
- https://www.ag-grid.com/studio/

## Coding-agent skills

- AG is building skills for Claude, Codex, and other coding agents.
- The only published skill in this snapshot is `ag-update`, which analyses a
  repository and prepares a version-upgrade change plan.
- AG states that more skills are planned.

This overlaps directly with TanStack Charts’ agent-oriented documentation and
future Intent skill strategy, although AG’s current public skill is about
upgrades rather than chart authoring.

## AG Grid

- AG Charts powers Integrated Charts.
- Grid sorting and filtering can update a chart automatically.
- End users can create charts from grid selections.
- The Enterprise Bundle joins the two paid products.

## AG Studio

- AG Studio is a commercial embedded-analytics toolkit built on AG Grid and AG
  Charts.
- It combines dashboards, charts, grids, filters, KPI widgets, drag-and-drop
  layout, cross-filtering, and an AI assistant.
- It supports JavaScript, React, Angular, and Vue.

## Strategic meaning

AG Charts has upstream and downstream distribution:

1. AG Grid creates an installed base and an integrated use case.
2. Standalone AG Charts serves application developers directly.
3. AG Studio packages Charts and Grid into a higher-level analytics product.
4. Skills reduce maintenance and adoption cost for coding-agent users.

TanStack Charts competes most directly with layer 2. It should avoid drifting
into a dashboard builder or data-query runtime merely because AG owns those
adjacent layers.
