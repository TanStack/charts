export interface ChartRadiusScale {
  id: string
  resolve: (values: readonly number[]) => (value: number) => number
}

export interface RadiusScaleOptions {
  domain?: readonly [number, number]
  range?: readonly [number, number]
  clamp?: boolean
}

export function scaleRadius(
  options: RadiusScaleOptions = {},
): ChartRadiusScale {
  return {
    id: 'area',
    resolve(values) {
      const domain = resolveDomain(values, options.domain)
      const range = options.range ?? [2.5, 14]
      const startArea = range[0] * range[0]
      const endArea = range[1] * range[1]

      return (value) => {
        if (!Number.isFinite(value) || value < 0) return Number.NaN
        if (value === 0 && domain[0] === 0) return 0
        const raw = (value - domain[0]) / (domain[1] - domain[0])
        const ratio =
          options.clamp === false ? raw : Math.max(0, Math.min(1, raw))
        return Math.sqrt(startArea + (endArea - startArea) * ratio)
      }
    },
  }
}

function resolveDomain(
  values: readonly number[],
  requested: readonly [number, number] | undefined,
): readonly [number, number] {
  let min = requested?.[0] ?? 0
  let max = requested?.[1] ?? Math.max(0, ...values)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min > max) [min, max] = [max, min]
  if (min === max) max = min + (Math.abs(min) * 0.05 || 1)
  return [min, max]
}
