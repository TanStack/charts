import type { ChartSize, ChartSizing } from './types'

export function chartSizingStyle(
  sizing: ChartSizing,
): Record<string, string | number> {
  if (sizing.fill === true) {
    return {
      width: '100%',
      height: '100%',
      minWidth: 0,
      minHeight: 0,
    }
  }

  if (typeof sizing.aspectRatio === 'number') {
    return {
      width: '100%',
      aspectRatio: String(sizing.aspectRatio),
      minWidth: 0,
      ...(sizing.minHeight === undefined
        ? null
        : { minHeight: sizing.minHeight }),
      ...(sizing.maxHeight === undefined
        ? null
        : { maxHeight: sizing.maxHeight }),
    }
  }

  return {
    width: '100%',
    minHeight: sizing.height,
    minWidth: 0,
  }
}

export function resolveChartSize(
  available: ChartSize,
  sizing: ChartSizing | undefined,
): ChartSize {
  if (!sizing || sizing.fill === true) return available

  if (typeof sizing.aspectRatio === 'number') {
    return {
      width: available.width,
      height: Math.round(
        Math.min(
          sizing.maxHeight ?? Number.POSITIVE_INFINITY,
          Math.max(sizing.minHeight ?? 0, available.width / sizing.aspectRatio),
        ),
      ),
    }
  }

  return {
    width: available.width,
    height: sizing.height,
  }
}
