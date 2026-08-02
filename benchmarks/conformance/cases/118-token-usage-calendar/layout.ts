import { calendarWeekCount } from './model'

export const calendarBandPaddingInner = 0.08
export const calendarBandPaddingOuter = 0
export const calendarMargin = {
  top: 4,
  right: 0,
  bottom: 30,
  left: 0,
} as const

export function calendarGridHeight(width: number): number {
  const plotWidth = Math.max(
    1,
    width - calendarMargin.left - calendarMargin.right,
  )
  const xStep =
    plotWidth /
    (calendarWeekCount -
      calendarBandPaddingInner +
      calendarBandPaddingOuter * 2)
  return xStep * (7 - calendarBandPaddingInner + calendarBandPaddingOuter * 2)
}

export function calendarChartHeight(width: number): number {
  return Math.ceil(
    calendarMargin.top + calendarGridHeight(width) + calendarMargin.bottom,
  )
}

export function calendarBottomMargin(width: number, height: number): number {
  return Math.max(
    calendarMargin.bottom,
    height - calendarMargin.top - calendarGridHeight(width),
  )
}
