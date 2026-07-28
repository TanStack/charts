import {
  createChartScene,
  defineChart,
  lineY,
  type ChartScale,
} from '@tanstack/charts'

function fixedLinearScale(
  domain: readonly [number, number],
  tickValues: readonly number[],
): ChartScale {
  return {
    id: 'fixed-linear',
    resolve(context) {
      const map = (value: unknown) => {
        const ratio =
          (Number(value) - domain[0]) / Math.max(1, domain[1] - domain[0])
        return context.range[0] + ratio * (context.range[1] - context.range[0])
      }
      return {
        id: context.id,
        type: 'linear',
        domain,
        map,
        ticks: tickValues.map((value) => ({
          value,
          position: map(value),
          label: String(value),
        })),
        bandwidth: 0,
      }
    },
  }
}

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  x: { scale: fixedLinearScale([0, 2], [0, 1, 2]) },
  y: { scale: fixedLinearScale([0, 10], [0, 5, 10]) },
})

export const scene = createChartScene(definition, {
  width: 640,
  height: 320,
})
