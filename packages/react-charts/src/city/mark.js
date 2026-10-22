import { createMark } from '@tanstack/charts'
import { categoryLabel, metricFor, layoutCity } from './engine/model.js'
import { validateCityData } from './data.js'
import { cityLayout } from './layout.js'

// A city is a spatial mark: x/z locate each company and a metric encodes height.
// The semantic scene also remains usable by TanStack's SVG renderer (top view).
/**
 * @template {import('./data.js').CityDatum} TDatum
 * @param {readonly TDatum[]} data Original application rows, never mutated.
 * @param {{ id?: string, layout?: ReturnType<typeof layoutCity> }} [options]
 * @returns {import('@tanstack/charts').ChartMark<TDatum, number, number>}
 */
export function cityMark(data, { id = 'companies', layout } = {}) {
  const rows = validateCityData(data)
  layout ??= layoutCity(rows)
  return createMark(() => ({
    id,
    channels: {
      x: { scale: 'x', values: layout.companies.map((c) => c.x) },
      y: { scale: 'y', values: layout.companies.map((c) => c.z) },
      color: { scale: 'color', values: layout.companies.map((c) => c.mask) },
      height: { values: layout.companies.map((c) => metricFor(c).value) },
      health: { values: layout.companies.map((c) => c.status) },
    },
    render({ scales, color }) {
      const points = layout.companies.map((company, datumIndex) => ({
        key: `${id}:${company.id}`,
        markId: id,
        group: company.mask,
        groupLabel: categoryLabel(company),
        datum: data[datumIndex],
        datumIndex,
        xValue: company.x,
        yValue: company.z,
        x: scales.x.map(company.x),
        y: scales.y.map(company.z),
        color: color(company.mask),
      }))
      return {
        points,
        nodes: [
          {
            kind: 'group',
            className: 'ts-chart__rect',
            ariaHidden: true,
            key: `${id}:layout`,
            [cityLayout]: layout,
            children: points.map((point) => ({
              kind: 'rect',
              key: point.key,
              x: point.x - 3,
              y: point.y - 3,
              width: 6,
              height: 6,
              radius: 1,
              style: { fill: point.color },
              interaction: { point, affinity: 'geometry' },
            })),
          },
        ],
      }
    },
  }))
}
