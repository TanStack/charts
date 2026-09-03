import * as Plot from '@observablehq/plot'
import {
  paletteMatrixRows,
  palettePaint,
  paletteTreatments,
  paletteValue,
  paletteVariable,
} from './model'
import type { ConformanceInput, ConformanceMount } from '../../types'
import type { PaletteTreatment } from './model'

const svgNamespace = 'http://www.w3.org/2000/svg'
let referenceInstance = 0

export const mount: ConformanceMount = (container, input) => {
  const root = container.ownerDocument.createElement('div')
  const prefix = `theme-palette-plot-${referenceInstance++}`
  let currentInput = input
  container.append(root)

  const render = (nextInput: ConformanceInput) => {
    currentInput = nextInput
    root.replaceChildren()
    root.dataset.conformanceView = 'main'
    root.setAttribute('role', 'region')
    root.setAttribute('aria-label', 'Theme palette matrix')
    Object.assign(root.style, {
      boxSizing: 'border-box',
      display: 'grid',
      gap: `${nextInput.preview ? 4 : 10}px`,
      width: `${nextInput.width}px`,
      height: `${nextInput.height}px`,
      padding: nextInput.preview ? '0' : '12px',
    })

    const rows = paletteMatrixRows(nextInput.revision)
    const gap = nextInput.preview ? 4 : 10
    const padding = nextInput.preview ? 0 : 12
    const panelHeight = Math.max(
      1,
      (nextInput.height - padding * 2 - gap * 2) / 3,
    )
    const labelWidth = nextInput.width < 440 ? 120 : 124
    const chartWidth = nextInput.preview
      ? nextInput.width
      : Math.max(1, nextInput.width - padding * 2 - labelWidth)
    const panelWidth = nextInput.width - padding * 2
    root.style.gridTemplateRows = `repeat(3, ${panelHeight}px)`
    if (nextInput.preview) {
      root.dataset.catalogPreviewComposition = 'theme-palette-matrix'
    } else {
      root.removeAttribute('data-catalog-preview-composition')
    }

    for (const treatment of paletteTreatments) {
      root.append(
        renderPanel(
          container.ownerDocument,
          treatment,
          rows,
          panelWidth,
          chartWidth,
          panelHeight,
          labelWidth,
          nextInput.preview === true,
          `${prefix}-${treatment.id}-area`,
        ),
      )
    }
  }

  render(input)

  return {
    update: render,
    driver: {
      resolveTarget() {
        return null
      },
      readState() {
        return {
          revision: currentInput.revision,
          rowCount: paletteMatrixRows(currentInput.revision).length,
          paletteCount: paletteTreatments.length,
          svgCount: root.querySelectorAll('svg').length,
          palettes: paletteTreatments.map((treatment) => treatment.id),
        }
      },
    },
    destroy() {
      root.remove()
    },
  }
}

function renderPanel(
  document: Document,
  treatment: PaletteTreatment,
  rows: ReturnType<typeof paletteMatrixRows>,
  panelWidth: number,
  chartWidth: number,
  panelHeight: number,
  labelWidth: number,
  preview: boolean,
  gradientId: string,
) {
  const primary = palettePaint(treatment, 'primary')
  const secondary = palettePaint(treatment, 'secondary')
  const surface = palettePaint(treatment, 'surface')
  const panel = document.createElement('section')
  panel.dataset.paletteTreatment = treatment.id
  panel.setAttribute('aria-label', `${treatment.label} palette`)
  for (const token of Object.keys(treatment.tokens)) {
    panel.style.setProperty(
      paletteVariable(treatment, token as keyof PaletteTreatment['tokens']),
      paletteValue(treatment, token as keyof PaletteTreatment['tokens']),
    )
  }
  Object.assign(panel.style, {
    boxSizing: 'border-box',
    colorScheme: 'light dark',
    display: preview ? 'block' : 'grid',
    gridTemplateColumns: preview ? undefined : `${labelWidth}px minmax(0, 1fr)`,
    alignItems: 'center',
    minWidth: '0',
    width: `${panelWidth}px`,
    height: `${panelHeight}px`,
    overflow: 'hidden',
    border: preview
      ? undefined
      : `1px solid ${palettePaint(treatment, 'grid')}`,
    borderRadius: preview ? undefined : '14px',
    color: palettePaint(treatment, 'foreground'),
    background: surface,
  })

  if (!preview) {
    const label = document.createElement('div')
    Object.assign(label.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: '0',
      paddingInline: labelWidth < 124 ? '10px' : '14px',
      color: 'inherit',
      font: '650 12px/1.2 system-ui, sans-serif',
    })
    const swatch = document.createElement('span')
    swatch.setAttribute('aria-hidden', 'true')
    Object.assign(swatch.style, {
      width: '8px',
      height: '8px',
      flex: '0 0 auto',
      borderRadius: '999px',
      background: primary,
    })
    const text = document.createElement('span')
    text.textContent = treatment.label
    Object.assign(text.style, {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    })
    label.append(swatch, text)
    panel.append(label)
  }

  const plot = Plot.plot({
    width: chartWidth,
    height: panelHeight,
    ariaLabel: `${treatment.label} revenue trend`,
    ...(preview
      ? { margin: 5 }
      : { marginTop: 12, marginRight: 14, marginBottom: 10, marginLeft: 14 }),
    x: {
      axis: null,
      domain: rows.map((row) => row.period),
      padding: 0.12,
    },
    y: { axis: null, domain: [20, 100] },
    clip: true,
    marks: [
      Plot.areaY(rows, {
        x: 'period',
        y: 'value',
        fill: `url(#${gradientId})`,
      }),
      Plot.lineY(rows, {
        x: 'period',
        y: 'value',
        stroke: primary,
        strokeWidth: preview ? 2 : 2.5,
      }),
      Plot.lineY(rows, {
        x: 'period',
        y: 'comparison',
        stroke: secondary,
        strokeOpacity: 0.8,
        strokeWidth: preview ? 1 : 1.5,
        strokeDasharray: '3 4',
      }),
      Plot.dot(rows.slice(-1), {
        x: 'period',
        y: 'value',
        r: preview ? 2 : 3.5,
        fill: primary,
        stroke: surface,
        strokeWidth: preview ? 1 : 2,
      }),
    ],
  })
  plot.style.background = 'transparent'
  const svg =
    plot.tagName.toLowerCase() === 'svg'
      ? (plot as SVGSVGElement)
      : plot.querySelector<SVGSVGElement>('svg')
  if (svg) svg.prepend(createGradient(document, gradientId, primary))
  panel.append(plot)

  return panel
}

function createGradient(document: Document, id: string, color: string) {
  const defs = document.createElementNS(svgNamespace, 'defs')
  const gradient = document.createElementNS(svgNamespace, 'linearGradient')
  gradient.id = id
  gradient.setAttribute('x1', '0')
  gradient.setAttribute('y1', '1')
  gradient.setAttribute('x2', '0')
  gradient.setAttribute('y2', '0')

  for (const [offset, opacity] of [
    [0, 0.02],
    [0.55, 0.16],
    [1, 0.52],
  ] as const) {
    const stop = document.createElementNS(svgNamespace, 'stop')
    stop.setAttribute('offset', String(offset))
    stop.setAttribute('stop-color', color)
    stop.setAttribute('stop-opacity', String(opacity))
    gradient.append(stop)
  }

  defs.append(gradient)
  return defs
}
