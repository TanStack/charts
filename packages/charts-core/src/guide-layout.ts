import type {
  ChartBounds,
  ChartMargin,
  ChartTextMeasurer,
  ChartTextMeasureOptions,
  ChartTextMetrics,
  SceneGroup,
  SceneLabel,
  SceneNode,
} from './types'

const defaultFontSize = 16
const defaultFontWeight = 400
const defaultOuterInset = 4

export interface GuideMarginOptions {
  inset?: number
  measureText?: ChartTextMeasurer
}

export function estimateSceneText(
  text: string,
  style: ChartTextMeasureOptions,
): ChartTextMetrics {
  const fontSize = finiteNonNegative(style.fontSize, defaultFontSize)
  const fontWeight = finiteNonNegative(style.fontWeight, defaultFontWeight)

  if (!text || fontSize === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let emWidth = 0
  for (const character of text) {
    emWidth += estimateCharacterWidth(character)
  }

  const clampedWeight = Math.min(900, Math.max(100, fontWeight))
  const weightFactor = 1 + (clampedWeight - 400) / 12_500

  const width = emWidth * fontSize * weightFactor
  const height = fontSize
  const x =
    style.anchor === 'middle' ? -width / 2 : style.anchor === 'end' ? -width : 0
  const y =
    style.baseline === 'middle'
      ? -height / 2
      : style.baseline === 'hanging'
        ? 0
        : -fontSize * 0.8

  return { x, y, width, height }
}

export function measureSceneLabelBounds(
  label: SceneLabel,
  measureText: ChartTextMeasurer = estimateSceneText,
): ChartBounds {
  const fontSize = finiteNonNegative(label.fontSize, defaultFontSize)
  const anchor = label.anchor ?? 'start'
  const baseline = label.baseline ?? 'auto'
  const measured =
    label.text.length === 0
      ? { x: 0, y: 0, width: 0, height: 0 }
      : measureText(label.text, {
          fontSize,
          fontWeight: label.fontWeight,
          anchor,
          baseline,
        })
  const x = finiteNumber(measured.x, 0)
  const y = finiteNumber(measured.y, 0)
  const width = finiteNonNegative(measured.width, 0)
  const height = finiteNonNegative(measured.height, 0)
  const bounds = {
    x: label.x + x,
    y: label.y + y,
    width,
    height,
  }

  if (!label.rotate) {
    return bounds
  }

  return rotateBounds(bounds, label.x, label.y, label.rotate)
}

export function resolveGuideMargins(
  axes: SceneGroup,
  plot: ChartBounds,
  options: GuideMarginOptions = {},
): ChartMargin {
  const inset = finiteNonNegative(options.inset, defaultOuterInset)
  const measureText = options.measureText ?? estimateSceneText
  let top = inset
  let right = inset
  let bottom = inset
  let left = inset

  visitLabels(axes, 0, 0, (label, translateX, translateY) => {
    if (!label.text) return

    const bounds = measureSceneLabelBounds(label, measureText)
    const boundsLeft = bounds.x + translateX
    const boundsTop = bounds.y + translateY
    const boundsRight = boundsLeft + bounds.width
    const boundsBottom = boundsTop + bounds.height
    const plotRight = plot.x + plot.width
    const plotBottom = plot.y + plot.height

    top = Math.max(top, plot.y - boundsTop + inset)
    right = Math.max(right, boundsRight - plotRight + inset)
    bottom = Math.max(bottom, boundsBottom - plotBottom + inset)
    left = Math.max(left, plot.x - boundsLeft + inset)
  })

  return { top, right, bottom, left }
}

function visitLabels(
  node: SceneNode,
  translateX: number,
  translateY: number,
  visit: (label: SceneLabel, translateX: number, translateY: number) => void,
): void {
  if (node.kind === 'label') {
    visit(node, translateX, translateY)
    return
  }

  if (node.kind !== 'group') return

  const childTranslateX = translateX + (node.translateX ?? 0)
  const childTranslateY = translateY + (node.translateY ?? 0)
  for (const child of node.children) {
    visitLabels(child, childTranslateX, childTranslateY, visit)
  }
}

function rotateBounds(
  bounds: ChartBounds,
  originX: number,
  originY: number,
  degrees: number,
): ChartBounds {
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const centerX = bounds.x + bounds.width / 2 - originX
  const centerY = bounds.y + bounds.height / 2 - originY
  const width = Math.abs(bounds.width * cosine) + Math.abs(bounds.height * sine)
  const height =
    Math.abs(bounds.width * sine) + Math.abs(bounds.height * cosine)
  const rotatedCenterX = centerX * cosine - centerY * sine + originX
  const rotatedCenterY = centerX * sine + centerY * cosine + originY

  return {
    x: rotatedCenterX - width / 2,
    y: rotatedCenterY - height / 2,
    width,
    height,
  }
}

function estimateCharacterWidth(character: string): number {
  if (/\s/u.test(character)) return 0.33
  if (/[\u0300-\u036f]/u.test(character)) return 0
  if (/[ilI1|!.,:;'`]/u.test(character)) return 0.28
  if (/[mwMW@#%&]/u.test(character)) return 0.9
  if (/[A-Z]/u.test(character)) return 0.64
  if (/[0-9]/u.test(character)) return 0.56
  if (character.codePointAt(0)! > 0x7f) return 1
  return 0.54
}

function finiteNonNegative(
  value: number | undefined,
  fallback: number,
): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback
}
