import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { barY, defineChart, dot } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'
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
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { CompletePenguin, NestedTooltipId } from './model'

const NestedTooltipExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function NestedTooltipExample({ input, idPrefix }, ref) {
  const generatedTitleId = `tanstack-nested-tooltip-${useId().replaceAll(':', '')}`
  const titleId = idPrefix ? `${idPrefix}-tooltip-title` : generatedTitleId
  const viewRef = useRef<HTMLDivElement>(null)
  const chartSurfaceRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLElement>(null)
  const miniSurfaceRef = useRef<HTMLDivElement>(null)
  const hoveredIdRef = useRef<NestedTooltipId | null>(null)
  const restorePointRef = useRef<NestedTooltipId | null>(null)
  const renderedMainRef = useRef<{
    scene: ChartScene<CompletePenguin, number, number>
    svg: SVGSVGElement
  } | null>(null)
  const [pinnedId, setPinnedId] = useState<NestedTooltipId | null>(null)
  const [placement, setPlacement] = useState<'left' | 'right' | 'panel' | null>(
    null,
  )
  const rows = useMemo(
    () => nestedTooltipRows(penguins, input.revision),
    [input.revision],
  )
  const pinnedDatum = rows.find((row) => penguinTooltipId(row) === pinnedId)
  const cohort = useMemo(
    () => (pinnedDatum ? penguinCohort(penguins, pinnedDatum) : []),
    [pinnedDatum],
  )
  const narrowLayout = input.width < 520
  const panelHeight = Math.max(
    96,
    Math.min(154, Math.round(input.height * 0.42)),
  )
  const mainHeight =
    narrowLayout && pinnedDatum
      ? Math.max(1, input.height - panelHeight - 8)
      : input.height
  const miniDimensions = {
    width: narrowLayout ? Math.max(1, input.width - 32) : 208,
    height: narrowLayout ? Math.max(48, panelHeight - 60) : 106,
  }
  const mainDefinition = useMemo(() => {
    const selectedRows = rows.filter(
      (row) => penguinTooltipId(row) === pinnedId,
    )
    return defineChart(
      defineChart({
        marks: [
          dot(rows, {
            id: 'penguins',
            x: 'flipper_length_mm',
            y: 'body_mass_g',
            r: 5,
            fill: '#2563eb',
            stroke: '#ffffff',
            strokeWidth: 1,
          }),
          ...(selectedRows.length
            ? [
                dot(selectedRows, {
                  id: 'pinned-penguin',
                  x: 'flipper_length_mm',
                  y: 'body_mass_g',
                  r: 9,
                  fill: '#f97316',
                  stroke: '#ffffff',
                  strokeWidth: 3,
                }),
              ]
            : []),
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
      { animate: false, keyboard: true },
    )
  }, [pinnedId, rows])
  const miniDefinition = useMemo(
    () =>
      defineChart(
        defineChart({
          marks: [
            barY(cohort, {
              x: (row) => String(row.flipper_length_mm),
              y: 'body_mass_g',
              fill: '#8b5cf6',
              inset: 1,
            }),
          ],
          x: {
            scale: () =>
              scaleBand<string>().paddingInner(0.18).paddingOuter(0.08),
          },
          y: { scale: scaleLinear, axis: false },
          margin: { top: 6, right: 6, bottom: 24, left: 6 },
        }),
        { animate: false, keyboard: false },
      ),
    [cohort],
  )

  const closePinned = () => {
    if (!pinnedId) return
    restorePointRef.current = pinnedId
    setPinnedId(null)
  }

  useLayoutEffect(() => {
    const restorePoint = restorePointRef.current
    if (pinnedId !== null || !restorePoint) return
    const svg = renderedMainRef.current?.svg
    if (!svg) return
    svg.dataset.restoredPoint = restorePoint
    svg.focus()
    restorePointRef.current = null
  }, [pinnedId])

  useLayoutEffect(() => {
    if (!pinnedDatum) {
      setPlacement(null)
      return
    }
    if (narrowLayout) {
      setPlacement('panel')
      return
    }
    const rendered = renderedMainRef.current
    const tooltip = tooltipRef.current
    if (!rendered || !tooltip) return
    const point = rendered.scene.points.find(
      (candidate) =>
        candidate.markId === 'penguins' &&
        penguinTooltipId(candidate.datum) === pinnedId,
    )
    if (!point) return
    const width = tooltip.offsetWidth || 224
    const edge = 8
    const gap = 14
    setPlacement(point.x + gap + width <= input.width - edge ? 'right' : 'left')
  }, [input.height, input.width, narrowLayout, pinnedDatum, pinnedId])

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.anchor === 'tooltip:close' && pinnedDatum) {
          const button = tooltipRef.current?.querySelector<HTMLElement>(
            '[data-tooltip-close]',
          )
          return button ? center(button) : null
        }
        const pointId = pointFromTarget(target)
        if (!pointId) return null
        return pointCoordinate(renderedMainRef.current, pointId)
      },
      readState() {
        const rendered = renderedMainRef.current
        const miniSurface = miniSurfaceRef.current
        const chartSurface = chartSurfaceRef.current
        return {
          hoveredId: hoveredIdRef.current,
          focusedPoint:
            rendered &&
            rendered.svg.ownerDocument.activeElement === rendered.svg
              ? (rendered.svg.dataset.restoredPoint ?? null)
              : null,
          tooltip: {
            visible: Boolean(pinnedDatum),
            pinnedId,
            miniBarCount: pinnedDatum
              ? (miniSurface?.querySelectorAll('.ts-chart__bar rect').length ??
                0)
              : 0,
            chartCount: pinnedDatum
              ? (miniSurface?.querySelectorAll('svg.ts-chart').length ?? 0)
              : 0,
            selectedOverlayCount:
              chartSurface?.querySelectorAll(
                '.ts-chart__dot[data-ts-key="pinned-penguin"] circle',
              ).length ?? 0,
            flipperLabelCount: pinnedDatum
              ? (miniSurface?.querySelectorAll('[data-ts-key^="x-tick-label:"]')
                  .length ?? 0)
              : 0,
            placement,
            closeVisible: Boolean(pinnedDatum),
          },
        }
      },
    }),
    [pinnedDatum, pinnedId, placement],
  )

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix ? `${idPrefix}-main` : undefined}
        definition={mainDefinition}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Selectable penguin measurement chart"
        ariaDescription="Use arrow keys to choose a penguin and Enter or Space to pin a same-species comparison."
      />
    )
  }

  const tooltipPosition = tooltipStyle(
    input.width,
    input.height,
    mainHeight,
    panelHeight,
    placement,
    pinnedId,
    renderedMainRef.current,
    tooltipRef.current,
  )

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      role="region"
      aria-label="Penguin measurements with a pinned nested-chart tooltip"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.stopPropagation()
        closePinned()
      }}
      style={{ position: 'relative', width: input.width, height: input.height }}
    >
      <div ref={chartSurfaceRef}>
        <Chart
          idPrefix={idPrefix ? `${idPrefix}-main` : undefined}
          definition={mainDefinition}
          width={input.width}
          height={mainHeight}
          ariaLabel="Selectable penguin measurement chart"
          ariaDescription="Use arrow keys to choose a penguin and Enter or Space to pin a same-species comparison."
          onFocusChange={(point) => {
            hoveredIdRef.current = point ? penguinTooltipId(point.datum) : null
          }}
          onSelect={(point) => {
            const selectedId = point ? penguinTooltipId(point.datum) : null
            const svg = renderedMainRef.current?.svg
            if (svg) delete svg.dataset.restoredPoint
            setPinnedId((current) =>
              current === selectedId ? null : selectedId,
            )
          }}
          onRender={({ scene, svg }) => {
            renderedMainRef.current = { scene, svg }
          }}
        />
      </div>
      {pinnedDatum ? (
        <aside
          ref={tooltipRef}
          data-external-tooltip="pinned"
          data-placement={placement ?? undefined}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={{
            position: 'absolute',
            zIndex: 2,
            boxSizing: 'border-box',
            padding: 8,
            border: '1px solid rgb(100 116 139 / 0.35)',
            borderRadius: 8,
            background: 'Canvas',
            color: 'CanvasText',
            boxShadow: '0 8px 28px rgb(15 23 42 / 0.16)',
            font: '600 12px/1.3 system-ui, sans-serif',
            pointerEvents: 'auto',
            ...tooltipPosition,
          }}
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
            <strong id={titleId}>
              {penguinTooltipLabel(pinnedDatum)}:{' '}
              {pinnedDatum.body_mass_g.toLocaleString()} g
            </strong>
            <button
              type="button"
              data-tooltip-close
              aria-label="Close pinned penguin details"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={closePinned}
              style={{
                width: 44,
                minWidth: 44,
                height: 44,
                flex: '0 0 44px',
                padding: 0,
                border:
                  '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
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
          <div
            ref={miniSurfaceRef}
            style={{
              width: miniDimensions.width,
              height: miniDimensions.height,
            }}
          >
            <Chart
              idPrefix={idPrefix ? `${idPrefix}-nested` : undefined}
              definition={miniDefinition}
              width={miniDimensions.width}
              height={miniDimensions.height}
              ariaLabel="Body mass for nearby penguins of the same species"
              ariaDescription={cohort
                .map(
                  (row) =>
                    `${row.flipper_length_mm} millimeter flipper: ${row.body_mass_g} grams`,
                )
                .join('. ')}
            />
          </div>
          <div style={visuallyHiddenStyle}>
            {cohort
              .map(
                (row) =>
                  `${row.flipper_length_mm} millimeter flipper: ${row.body_mass_g} grams`,
              )
              .join('. ')}
          </div>
        </aside>
      ) : null}
    </div>
  )
})

export const catalogComponent = NestedTooltipExample
export const mount = reactMount(NestedTooltipExample)

const visuallyHiddenStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
} as const

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
      penguinTooltipId(candidate.datum) === id,
  )
  if (!point) return null
  const bounds = rendered.svg.getBoundingClientRect()
  return {
    x: bounds.left + (point.x / rendered.scene.width) * bounds.width,
    y: bounds.top + (point.y / rendered.scene.height) * bounds.height,
    focusElement: rendered.svg,
  }
}

function tooltipStyle(
  width: number,
  height: number,
  mainHeight: number,
  panelHeight: number,
  placement: 'left' | 'right' | 'panel' | null,
  pinnedId: NestedTooltipId | null,
  rendered: {
    scene: ChartScene<CompletePenguin, number, number>
    svg: SVGSVGElement
  } | null,
  tooltip: HTMLElement | null,
) {
  if (placement === 'panel') {
    return {
      left: 8,
      top: mainHeight + 4,
      width: Math.max(1, width - 16),
      height: panelHeight,
    }
  }
  const point = rendered?.scene.points.find(
    (candidate) =>
      candidate.markId === 'penguins' &&
      penguinTooltipId(candidate.datum) === pinnedId,
  )
  if (!point) return { width: 224, left: 8, top: 8 }
  const edge = 8
  const gap = 14
  const tooltipWidth = tooltip?.offsetWidth || 224
  const tooltipHeight = tooltip?.offsetHeight || 150
  const left =
    placement === 'right' ? point.x + gap : point.x - gap - tooltipWidth
  return {
    left: Math.max(edge, left),
    top: Math.max(
      edge,
      Math.min(height - tooltipHeight - edge, point.y - tooltipHeight / 2),
    ),
    width: 224,
    height: 'auto',
  }
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
