import { useMemo, useState } from 'react'
import { motion } from '@tanstack/charts/motion'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import {
  flareAggregateValue,
  flareHasChildren,
  flareLabel,
  flareParentId,
  flarePreviewRootId,
  formatFlareValue,
} from './model'
import type { FlareRow } from '@tanstack/charts-data/flare'
import type { ChartPoint } from '@tanstack/charts'
import type { SunburstNode } from '@tanstack/charts/hierarchy/sunburst'
import { defineChart } from '@tanstack/charts'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import { polar } from '@tanstack/charts/polar'
import { tooltip } from '@tanstack/charts/tooltip'
import {
  flareNodeColor,
  flareRows,
  flareVisibleDepth,
  flareVisibleRingCount,
} from './model'
type DrillDatum = SunburstNode<FlareRow>

const tau = Math.PI * 2

const ringPadding = 2

export function drillableSunburstDefinition(rootId: string) {
  const ringCount = flareVisibleRingCount(rootId)

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.92,
        startAngle: Math.PI / 2,
        endAngle: Math.PI / 2 - tau,
        marks: [
          sunburst(flareRows(), {
            id: 'drillable-sunburst-arcs',
            path: 'name',
            delimiter: '.',
            value: 'size',
            rootId,
            visibleDepth: flareVisibleDepth(rootId),
            sort: (left, right) =>
              right.value - left.value || left.name.localeCompare(right.name),
            innerRadius: ({ radius }) => radius * 0.32,
            outerRadius: ({ radius }) => {
              const innerRadius = radius * 0.32
              return (
                innerRadius +
                ((radius - innerRadius) * ringCount) / (ringCount + 1) +
                Math.max(0, ringCount - 1) * ringPadding
              )
            },
            ringPadding,
            fill: (node) => flareNodeColor(node.id),
            stroke: 'Canvas',
            strokeOpacity: 0.9,
            strokeWidth: 2,
            motion(context) {
              return {
                delay:
                  context.phase === 'enter'
                    ? Math.min(context.datumIndex * 18, 160)
                    : 0,
                transition:
                  context.phase === 'exit'
                    ? { type: 'tween', duration: 320, easing: 'ease-out' }
                    : undefined,
              }
            },
          }),
        ],
      }),
    ],
    motion: {
      transition: { type: 'tween', duration: 720, easing: 'ease-in-out' },
    },
    tooltip: {
      use: tooltip,
      format: ({ datum }) => `${datum.name} · ${formatFlareValue(datum.value)}`,
    },
    keyboard: true,
    margin: 0,
  })
}

export default function Example() {
  const [rootId, setRootId] = useState(flarePreviewRootId)
  const definition = useMemo(
    () => drillableSunburstDefinition(rootId),
    [rootId],
  )
  const renderer = useMemo(() => motion({ initial: 'always' }), [])
  const parentId = flareParentId(rootId)

  const drill = (point: ChartPoint<DrillDatum> | null) => {
    if (point && flareHasChildren(point.datum.id)) setRootId(point.datum.id)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 480 }}>
      <RendererChart
        definition={definition}
        renderer={renderer}
        height={480}
        ariaLabel="Drillable Flare hierarchy"
        ariaDescription="Use arrow keys to inspect segments and Enter or Space to drill into a branch. Use the center button to move up."
        onSelect={drill}
      />
      <button
        type="button"
        disabled={!parentId}
        aria-label={
          parentId
            ? `Back to ${flareLabel(parentId)}`
            : `${flareLabel(rootId)}, ${formatFlareValue(flareAggregateValue(rootId))}`
        }
        onClick={() => parentId && setRootId(parentId)}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 120,
          height: 72,
          transform: 'translate(-50%, -50%)',
          border: 0,
          borderRadius: 999,
          background: 'transparent',
          color: 'CanvasText',
          cursor: parentId ? 'pointer' : 'default',
          font: '600 12px/1.35 ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <span style={{ display: 'block', fontWeight: 700 }}>
          {flareLabel(rootId)}
        </span>
        <span style={{ display: 'block', fontSize: 10, opacity: 0.7 }}>
          {parentId
            ? `↑ ${flareLabel(parentId)}`
            : formatFlareValue(flareAggregateValue(rootId))}
        </span>
      </button>
    </div>
  )
}
