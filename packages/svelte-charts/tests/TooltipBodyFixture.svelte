<script lang="ts">
  import Chart from '../src/Chart.svelte'
  import type { ChartDefinition } from '@tanstack/charts'
  import type { ChartTooltipBodySnippetContext } from '../src/types'

  interface Row {
    id: string
    x: number
    y: number
  }

  let {
    definition,
    nestedDefinition,
  }: {
    definition: ChartDefinition<Row, number, number>
    nestedDefinition: ChartDefinition<Row, number, number>
  } = $props()
</script>

{#snippet tooltipBody(
  context: ChartTooltipBodySnippetContext<Row, number, number>,
)}
  <div data-testid="rich-tooltip">
    {@render context.defaultBody()}
    <span data-testid="tooltip-point">{context.points[0]?.datum.id}</span>
    <span data-testid="tooltip-pinned">{String(context.pinned)}</span>
    <Chart
      definition={nestedDefinition}
      width={120}
      height={80}
      ariaLabel="January trend"
    />
    <button type="button" onclick={context.dismiss}>Close</button>
  </div>
{/snippet}

<Chart
  {definition}
  width={480}
  height={260}
  ariaLabel="Revenue"
  {tooltipBody}
/>
