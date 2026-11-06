import { finiteNonNegative, labelBox, svgLabelBox } from './label-box'
import type {
  ChartBounds,
  ChartMargin,
  ChartTextMeasurer,
  ChartTextMeasureOptions,
  ChartTextMetrics,
  ChartTextTypography,
  SceneGroup,
  SceneLabel,
  SceneNode,
} from './types'

const defaultFontSize = 16
const defaultFontWeight = 400
const defaultOuterInset = 4
const defaultTypography = {
  fontFamily: 'sans-serif',
  fontStyle: 'normal',
  fontStretch: 'normal',
  letterSpacing: 0,
  direction: 'inherit' as const,
  fontScale: 1,
}

export interface GuideMarginOptions {
  inset?: number
  measureText?: ChartTextMeasurer
}

export function estimateSceneText(
  text: string,
  style: ChartTextMeasureOptions,
): ChartTextMetrics {
  const fontScale = finitePositive(style.fontScale, 1)
  const fontSize =
    finiteNonNegative(style.fontSize, defaultFontSize) * fontScale
  const fontWeight = finiteNonNegative(style.fontWeight, defaultFontWeight)
  const letterSpacing = finiteNumber(style.letterSpacing, 0) * fontScale

  if (!text || fontSize === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let emWidth = 0
  let characterCount = 0
  for (const character of text) {
    emWidth += estimateCharacterWidth(character)
    characterCount++
  }

  const clampedWeight = Math.min(900, Math.max(100, fontWeight))
  const weightFactor = 1 + (clampedWeight - 400) / 12_500

  const width = Math.max(
    0,
    emWidth * fontSize * weightFactor +
      Math.max(0, characterCount - 1) * letterSpacing,
  )
  const height = fontSize
  return labelBox(width, height, style.anchor, style.baseline)
}

export function measureSceneLabelBounds(
  label: SceneLabel,
  measureText: ChartTextMeasurer = estimateSceneText,
): ChartBounds {
  const bounds = label.svg
    ? positionLabelBounds(label, svgLabelBox(label))
    : measureSceneTextLabelBounds(label, measureText)
  return label.rotate
    ? rotateBounds(bounds, label.x, label.y, label.rotate)
    : bounds
}

/** Unrotated text bounds for layout producers that author only text labels. */
export function measureSceneTextLabelBounds(
  label: SceneLabel,
  measureText: ChartTextMeasurer = estimateSceneText,
): ChartBounds {
  const measured =
    label.text.length === 0
      ? { x: 0, y: 0, width: 0, height: 0 }
      : measureText(label.text, {
          fontSize: finiteNonNegative(label.fontSize, defaultFontSize),
          fontWeight: label.fontWeight,
          ...defaultTypography,
          anchor: label.anchor ?? 'start',
          baseline: label.baseline ?? 'auto',
        })
  return positionLabelBounds(label, measured)
}

function positionLabelBounds(
  label: SceneLabel,
  measured: ChartTextMetrics,
): ChartBounds {
  return {
    x: label.x + finiteNumber(measured.x, 0),
    y: label.y + finiteNumber(measured.y, 0),
    width: finiteNonNegative(measured.width, 0),
    height: finiteNonNegative(measured.height, 0),
  }
}

export function withChartTextTypography(
  measureText: ChartTextMeasurer = estimateSceneText,
  typography: ChartTextTypography = {},
): ChartTextMeasurer {
  const resolved = {
    ...defaultTypography,
    ...typography,
    fontFamily: typography.fontFamily || defaultTypography.fontFamily,
    fontStyle: typography.fontStyle || defaultTypography.fontStyle,
    fontStretch: typography.fontStretch || defaultTypography.fontStretch,
    letterSpacing: finiteNumber(typography.letterSpacing, 0),
    fontScale: finitePositive(typography.fontScale, 1),
  }
  return (text, options) => measureText(text, { ...options, ...resolved })
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

function finiteNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value! : fallback
}

function finitePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! > 0 ? value! : fallback
}
