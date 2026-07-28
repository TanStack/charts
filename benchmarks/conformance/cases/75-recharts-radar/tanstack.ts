import { createMark, defineChart } from '@tanstack/charts'
import { radarData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { RadarDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { SceneNode } from '@tanstack/charts'

const maximumScore = 150
const ringValues = [30, 60, 90, 120, 150] as const
const angleLabelOffset = 8
const radialAxisAngle = 30

function polarPointAtAngle(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
): readonly [number, number] {
  const angle = (-angleDegrees * Math.PI) / 180
  return [
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius,
  ]
}

function polarPoint(
  centerX: number,
  centerY: number,
  radius: number,
  index: number,
  count: number,
): readonly [number, number] {
  return polarPointAtAngle(centerX, centerY, radius, 90 - (index / count) * 360)
}

function closedPolygon(
  centerX: number,
  centerY: number,
  radius: number,
  count: number,
): readonly (readonly [number, number])[] {
  const points = Array.from({ length: count }, (_, index) =>
    polarPoint(centerX, centerY, radius, index, count),
  )
  const first = points[0]
  return first === undefined ? points : [...points, first]
}

function radarMark(data: readonly RadarDatum[]) {
  return createMark<RadarDatum, never, never>(({ markIndex }) => {
    const id = `radar-${markIndex}`

    return {
      id,
      channels: {},
      render: ({ chart }) => {
        const centerX = chart.x + chart.width / 2
        const centerY = chart.y + chart.height / 2
        const radius = Math.min(chart.width, chart.height) * 0.4
        const count = data.length
        const gridNodes: SceneNode[] = ringValues.map((value) => ({
          kind: 'polyline',
          key: `${id}:ring:${value}`,
          points: closedPolygon(
            centerX,
            centerY,
            radius * (value / maximumScore),
            count,
          ),
          style: {
            fill: 'none',
            stroke: '#cbd5e1',
            strokeWidth: 1,
          },
        }))

        for (let index = 0; index < count; index++) {
          const endpoint = polarPoint(centerX, centerY, radius, index, count)
          gridNodes.push({
            kind: 'rule',
            key: `${id}:spoke:${index}`,
            x1: centerX,
            y1: centerY,
            x2: endpoint[0],
            y2: endpoint[1],
            style: { stroke: '#cbd5e1', strokeWidth: 1 },
          })
        }

        const profile = data.map((row, index) =>
          polarPoint(
            centerX,
            centerY,
            radius * (row.score / maximumScore),
            index,
            count,
          ),
        )
        const labels: SceneNode[] = data.map((row, index) => {
          const position = polarPoint(
            centerX,
            centerY,
            radius + angleLabelOffset,
            index,
            count,
          )
          const horizontal = position[0] - centerX
          const vertical = position[1] - centerY
          const polarAngle =
            (-Math.PI / 2 + (index / count) * Math.PI * 2) % (Math.PI * 2)
          const topOrBottom = Math.abs(Math.cos(polarAngle)) <= Math.SQRT1_2
          const verticalTextAdjustment = topOrBottom
            ? vertical > 0
              ? -1.1
              : 0
            : 1.1

          return {
            kind: 'label',
            key: `${id}:label:${row.subject}`,
            x: position[0],
            y: position[1] + verticalTextAdjustment,
            text: row.subject,
            anchor:
              Math.abs(horizontal) < 1
                ? 'middle'
                : horizontal < 0
                  ? 'end'
                  : 'start',
            baseline: topOrBottom
              ? vertical > 0
                ? 'hanging'
                : 'auto'
              : 'middle',
            fontSize: 12,
            style: { fill: '#808080' },
          }
        })
        const radialLabels: SceneNode[] = ringValues.map((value) => {
          const position = polarPointAtAngle(
            centerX,
            centerY,
            radius * (value / maximumScore),
            radialAxisAngle,
          )

          return {
            kind: 'label',
            key: `${id}:radius:${value}`,
            x: position[0],
            y: position[1],
            text: String(value),
            anchor: 'start',
            baseline: 'auto',
            rotate: 90 - radialAxisAngle,
            fontSize: 12,
            style: { fill: '#cccccc' },
          }
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: `${id}:grid`,
              ariaHidden: true,
              children: gridNodes,
            },
            {
              kind: 'group',
              key: `${id}:profile`,
              className: 'ts-chart__radar',
              ariaHidden: true,
              children: [
                {
                  kind: 'area',
                  key: `${id}:profile-area`,
                  points: profile,
                  style: {
                    fill: '#8884d8',
                    fillOpacity: 0.6,
                    stroke: '#8884d8',
                    strokeWidth: 2,
                    lineJoin: 'round',
                  },
                },
              ],
            },
            {
              kind: 'group',
              key: `${id}:labels`,
              className: 'ts-chart__text',
              ariaHidden: true,
              children: [...labels, ...radialLabels],
            },
          ],
        }
      },
    }
  })
}

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [radarMark(radarData(input.revision))],
  x: null,
  y: null,
  guides: false,
  margin: 20,
}))

export const mount = tanstackMount(definition, 'Simple radar chart')
