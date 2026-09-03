import { createElement, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { SunburstChart } from 'recharts'
import { applyRechartsAccessibility } from '../../shared/recharts-mount'
import {
  styleSunburstCenterControl,
  sunburstCenterLabels,
  updateSunburstCenterControl,
} from './center'
import {
  flareHasChildren,
  flareParentId,
  flarePreviewRootId,
  flareSunburstTree,
} from './model'
import type { ConformanceInput, ConformanceMount } from '../../types'
import type { SunburstData } from 'recharts'

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  const surface = container.ownerDocument.createElement('div')
  const root = createRoot(surface)
  container.append(surface)

  const render = () => {
    flushSync(() => root.render(createElement(DrillableRecharts, currentInput)))
    applyRechartsAccessibility(surface, 'Drillable Flare hierarchy')
  }
  render()

  return {
    update(nextInput) {
      currentInput = nextInput
      render()
    },
    destroy() {
      flushSync(() => root.unmount())
      surface.remove()
    },
  }
}

function DrillableRecharts(input: ConformanceInput) {
  const [rootId, setRootId] = useState(flarePreviewRootId)
  const radius = Math.min(input.width, input.height) * 0.46
  const innerRadius = radius * 0.32
  const labels = sunburstCenterLabels(rootId)
  const parentId = flareParentId(rootId)

  return createElement(
    'div',
    {
      'data-conformance-view': 'main',
      style: {
        position: 'relative',
        width: input.width,
        height: input.height,
        color: 'CanvasText',
      },
    },
    createElement(
      SunburstChart,
      {
        width: input.width,
        height: input.height,
        data: flareSunburstTree(rootId),
        cx: input.width / 2,
        cy: input.height / 2,
        innerRadius,
        outerRadius: radius,
        startAngle: 0,
        endAngle: 360,
        padding: 2,
        ringPadding: 2,
        stroke: 'Canvas',
        textOptions: { display: 'none' },
        onClick: (node: SunburstData) => {
          const id = typeof node.id === 'string' ? node.id : null
          if (id && flareHasChildren(id)) setRootId(id)
        },
      },
      ...labels.map((label, index) =>
        createElement(
          'text',
          {
            key: label.id,
            x: input.width / 2,
            y: input.height / 2 + label.dy,
            fill: 'CanvasText',
            fontSize: index === 0 ? 12 : 10,
            fontWeight: index === 0 ? 700 : 500,
            textAnchor: 'middle',
            dominantBaseline: 'middle',
            pointerEvents: 'none',
          },
          label.text,
        ),
      ),
    ),
    createElement(RechartsCenterControl, {
      rootId,
      width: input.width,
      height: input.height,
      onBack: () => {
        if (parentId) setRootId(parentId)
      },
    }),
  )
}

function RechartsCenterControl({
  rootId,
  width,
  height,
  onBack,
}: {
  rootId: string
  width: number
  height: number
  onBack: () => void
}) {
  const ref = (element: HTMLButtonElement | null) => {
    if (element) {
      styleSunburstCenterControl(element)
      updateSunburstCenterControl(element, rootId, width, height)
    }
  }
  return createElement('button', {
    ref,
    type: 'button',
    'data-conformance-sunburst-back': '',
    onClick: onBack,
  })
}
