import { useMemo, useRef } from 'react'
import { barY, defineChart, stack } from '@tanstack/charts'
import { RendererChart as TooltipChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  activities,
  activityColors,
  activityPoints,
  weekday,
  type ActivityPoint,
} from './data'
import { AdvancedTooltipCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import { tanstackCase } from '../../shared/mount'
import { createShadcnSpringRenderer } from '../../shared/shadcn-motion'
import type { ChartPoint, ChartTooltipOptions } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

export const advancedTooltipDefinition = defineChart({
  marks: [
    barY(activityPoints, {
      id: 'activity-bars',
      x: 'date',
      y: 'calories',
      z: 'activity',
      color: 'activity',
      key: (row) => `${row.date}:${row.activity}`,
      layout: stack({ order: activities }),
      radius: 4,
    }),
  ],
  x: {
    scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
    axis: {
      line: false,
      ticks: {
        size: 0,
        padding: 10,
        format: (value) => weekday.format(new Date(value)),
      },
    },
  },
  y: { scale: scaleLinear().domain([0, 1_000]), axis: false },
  color: { domain: activities, range: activityColors },
  margin: { top: 0, right: 7, bottom: 32, left: 7 },
  theme: { foreground: 'var(--muted-foreground, var(--muted))' },
})

const activityTooltip: ChartTooltipOptions<ActivityPoint> = {
  className: 'sc-chart-tooltip',
  anchor: (_points, context) => ({
    x: context.surface.width * 0.271,
    y: context.surface.height * 0.554,
  }),
  placement: 'bottom-right',
  offset: 0,
  sort: 'color-domain',
  content: () => ({ rows: [] }),
}

function AdvancedTooltipBody({
  points,
}: {
  points: readonly ChartPoint<ActivityPoint>[]
}) {
  const ordered = [...points].sort(
    (left, right) =>
      activities.indexOf(left.datum.activity) -
      activities.indexOf(right.datum.activity),
  )
  const total = ordered.reduce((sum, point) => sum + point.datum.calories, 0)
  return (
    <div className="sc-advanced-tooltip">
      {ordered.map((point) => (
        <div className="sc-advanced-row" key={point.datum.activity}>
          <span
            className="sc-advanced-swatch"
            style={{
              background:
                point.datum.activity === 'running'
                  ? 'var(--chart-1)'
                  : 'var(--chart-2)',
            }}
          />
          <span>
            {point.datum.activity === 'running' ? 'Running' : 'Swimming'}
          </span>
          <span className="sc-advanced-value">
            {point.datum.calories}
            <span className="sc-advanced-unit">kcal</span>
          </span>
        </div>
      ))}
      <div className="sc-advanced-total">
        Total
        <span className="sc-advanced-value">
          {total}
          <span className="sc-advanced-unit">kcal</span>
        </span>
      </div>
    </div>
  )
}

function TanStackView({ input }: { input: ConformanceInput }) {
  const focused = useRef(false)
  const renderer = useMemo(
    () => createShadcnSpringRenderer<ActivityPoint, string, number>(),
    [],
  )
  const definition = useMemo(
    () =>
      defineChart(advancedTooltipDefinition, {
        svgAnimation: false,
        focus: 'group-x',
        keyboard: true,
        tooltip: { use: tooltip, ...activityTooltip },
      }),
    [],
  )
  return (
    <AdvancedTooltipCard input={input}>
      {({ width, height }) => (
        <TooltipChart
          definition={definition}
          renderer={renderer}
          initialWidth={width}
          height={height}
          ariaLabel="Daily running and swimming calories"
          onRender={({ scene, interaction }) => {
            if (focused.current) return
            const point = scene.points.find(
              (candidate) => candidate.datum.date === '2024-07-16',
            )
            if (!point) return
            focused.current = true
            interaction.setControlledFocus(point, { source: 'programmatic' })
          }}
          renderTooltipBody={({ points }) => (
            <AdvancedTooltipBody points={points} />
          )}
        />
      )}
    </AdvancedTooltipCard>
  )
}

export const catalogCase = tanstackCase(
  () => advancedTooltipDefinition,
  'Daily running and swimming calories',
  activityTooltip,
  { margin: true },
)
export const tanstackMount = shadcnChartMount(TanStackView)
