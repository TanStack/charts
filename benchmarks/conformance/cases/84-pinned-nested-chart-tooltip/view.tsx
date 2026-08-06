import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { barY, defineChart, dot } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { Chart } from '@tanstack/react-charts'
import { Chart as TooltipChart } from '@tanstack/react-charts/tooltip'
import { penguins } from '@charts-poc/demo-data/penguins'
import { scaleBand, scaleLinear } from 'd3-scale'
import { reactMount } from '../../shared/react-mount'
import {
  isNestedTooltipId,
  nestedTooltipRows,
  penguinCohort,
  penguinTooltipId,
  penguinTooltipLabel,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { CompletePenguin, NestedTooltipId } from './model'

const miniWidth = 208
const miniHeight = 106

const NestedTooltipExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function NestedTooltipExample({ input }, ref) {
  const chartSurfaceRef = useRef<HTMLDivElement>(null)
  const hoveredIdRef = useRef<NestedTooltipId | null>(null)
  const renderedMainRef = useRef<{
    scene: ChartScene<CompletePenguin, number, number>
    svg: SVGSVGElement
  } | null>(null)
  const rows = useMemo(
    () => nestedTooltipRows(penguins, input.revision),
    [input.revision],
  )
  const definition = useMemo(() => pinnedNestedTooltipDefinition(rows), [rows])

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.anchor === 'tooltip:close') {
          const button = tooltipBody(
            renderedMainRef.current?.svg,
          )?.querySelector<HTMLElement>('[data-tooltip-close]')
          return button ? center(button) : null
        }
        const pointId = pointFromTarget(target)
        return pointId
          ? pointCoordinate(renderedMainRef.current, pointId)
          : null
      },
      readState() {
        const rendered = renderedMainRef.current
        const body = tooltipBody(rendered?.svg)
        const nativeTooltip = body?.closest<HTMLElement>('.ts-chart-tooltip')
        const chartFocused = Boolean(
          rendered?.svg.contains(rendered.svg.ownerDocument.activeElement),
        )
        return {
          hoveredId: hoveredIdRef.current,
          chartFocused,
          tooltip: {
            visible: Boolean(body),
            pinnedId: body?.dataset.pinnedId ?? null,
            miniBarCount:
              body?.querySelectorAll('.ts-chart__bar rect').length ?? 0,
            chartCount: body?.querySelectorAll('svg.ts-chart').length ?? 0,
            pinnedMarkCount:
              chartSurfaceRef.current?.querySelectorAll(
                '.ts-chart__dot circle[fill="#f97316"][r="9"]',
              ).length ?? 0,
            flipperLabelCount:
              body?.querySelectorAll('[data-ts-key^="x-tick-label:"]').length ??
              0,
            placement: nativeTooltip?.dataset.placement ?? null,
            closeVisible: Boolean(body?.querySelector('[data-tooltip-close]')),
          },
        }
      },
    }),
    [],
  )

  return (
    <div
      data-conformance-view="main"
      role="region"
      aria-label="Penguin measurements with a pinned nested-chart tooltip"
      style={{ position: 'relative', width: input.width, height: input.height }}
    >
      <div ref={chartSurfaceRef}>
        <TooltipChart
          definition={definition}
          width={input.width}
          height={input.height}
          ariaLabel="Selectable penguin measurement chart"
          ariaDescription="Use arrow keys to choose a penguin and Enter or Space to pin a same-species comparison."
          onFocusChange={(point) => {
            hoveredIdRef.current = point ? requiredTooltipId(point.datum) : null
          }}
          onRender={({ scene, svg }) => {
            renderedMainRef.current = { scene, svg }
          }}
          renderTooltipBody={({ points, pinned, dismiss }) => {
            const datum = points[0]?.datum
            if (!pinned || !datum) return null
            return <PinnedTooltipBody datum={datum} dismiss={dismiss} />
          }}
        />
      </div>
    </div>
  )
})

export function pinnedNestedTooltipDefinition(
  rows: readonly CompletePenguin[],
) {
  return defineChart(
    defineChart({
      marks: [
        dot(rows, {
          id: 'penguins',
          key: requiredTooltipId,
          x: 'flipper_length_mm',
          y: 'body_mass_g',
          r: 5,
          fill: '#2563eb',
          stroke: '#ffffff',
          strokeWidth: 1,
          states: [
            {
              when: { focus: 'primary', pinned: true },
              style: {
                r: 9,
                fill: '#f97316',
                stroke: '#ffffff',
                strokeWidth: 3,
              },
            },
          ],
        }),
      ],
      x: {
        scale: scaleLinear().domain([170, 235]),
        axis: { label: 'Flipper length (mm)' },
      },
      y: {
        scale: scaleLinear().domain([3000, 6000]),
        grid: true,
        axis: { ticks: { count: 5 }, label: 'Body mass (g)' },
      },
      margin: { top: 18, right: 24, bottom: 42, left: 68 },
    }),
    {
      animate: false,
      keyboard: true,
      tooltip: {
        use: tooltip,
        portal,
        visibility: 'pinned',
        sticky: true,
        placement: ['right', 'left', 'top', 'bottom'],
        offset: 14,
        content: (points) => {
          const datum = points[0]?.datum
          return datum
            ? {
                title: `${penguinTooltipLabel(datum)}: ${datum.body_mass_g.toLocaleString()} g`,
                rows: [
                  {
                    label: 'Flipper length',
                    value: `${datum.flipper_length_mm} mm`,
                  },
                  {
                    label: 'Body mass',
                    value: `${datum.body_mass_g.toLocaleString()} g`,
                  },
                ],
              }
            : { rows: [] }
        },
      },
    },
  )
}

function PinnedTooltipBody({
  datum,
  dismiss,
}: {
  datum: CompletePenguin
  dismiss: () => void
}) {
  const id = requiredTooltipId(datum)
  const cohort = useMemo(() => penguinCohort(penguins, datum), [datum])
  const definition = useMemo(() => nestedChartDefinition(cohort), [cohort])
  const description = cohort
    .map(
      (row) =>
        `${row.flipper_length_mm} millimeter flipper: ${row.body_mass_g} grams`,
    )
    .join('. ')

  return (
    <div
      data-external-tooltip="pinned"
      data-pinned-id={id}
      style={{ width: miniWidth, font: '600 12px/1.3 system-ui, sans-serif' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 44,
        }}
      >
        <strong>
          {penguinTooltipLabel(datum)}: {datum.body_mass_g.toLocaleString()} g
        </strong>
        <button
          type="button"
          data-tooltip-close
          aria-label="Close pinned penguin details"
          onClick={dismiss}
          style={{
            width: 44,
            minWidth: 44,
            height: 44,
            flex: '0 0 44px',
            padding: 0,
            border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
            borderRadius: 6,
            background: 'Canvas',
            color: 'CanvasText',
            cursor: 'pointer',
            font: '700 20px/1 system-ui, sans-serif',
          }}
        >
          ×
        </button>
      </div>
      <div style={{ width: miniWidth, height: miniHeight }}>
        <Chart
          definition={definition}
          width={miniWidth}
          height={miniHeight}
          ariaLabel="Body mass for nearby penguins of the same species"
          ariaDescription={description}
        />
      </div>
    </div>
  )
}

function nestedChartDefinition(cohort: readonly CompletePenguin[]) {
  return defineChart(
    defineChart({
      marks: [
        barY(cohort, {
          id: 'nearby-penguins',
          key: (row) => row.flipper_length_mm,
          x: (row) => String(row.flipper_length_mm),
          y: 'body_mass_g',
          fill: '#8b5cf6',
          inset: 1,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.18).paddingOuter(0.08),
      },
      y: { scale: scaleLinear, axis: false },
      margin: { top: 6, right: 6, bottom: 24, left: 6 },
    }),
    { animate: false, keyboard: false },
  )
}

export const mount = reactMount(NestedTooltipExample)

function pointFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'point' && isNestedTooltipId(id) ? id : null
}

function pointCoordinate(
  rendered: {
    scene: ChartScene<CompletePenguin, number, number>
    svg: SVGSVGElement
  } | null,
  id: NestedTooltipId,
) {
  if (!rendered) return null
  const point = rendered.scene.points.find(
    (candidate) =>
      candidate.markId === 'penguins' &&
      requiredTooltipId(candidate.datum) === id,
  )
  if (!point) return null
  const bounds = rendered.svg.getBoundingClientRect()
  return {
    x: bounds.left + (point.x / rendered.scene.width) * bounds.width,
    y: bounds.top + (point.y / rendered.scene.height) * bounds.height,
    focusElement: rendered.svg,
  }
}

function tooltipBody(svg: SVGSVGElement | undefined) {
  return svg?.ownerDocument.querySelector<HTMLElement>(
    '[data-external-tooltip="pinned"]',
  )
}

function requiredTooltipId(row: CompletePenguin): NestedTooltipId {
  const id = penguinTooltipId(row)
  if (!id) throw new Error('Expected a catalog penguin tooltip identity')
  return id
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
