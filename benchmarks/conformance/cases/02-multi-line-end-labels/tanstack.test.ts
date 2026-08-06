import { industries } from '@charts-poc/demo-data/industries'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { loadTanStackSources } from '../../native-catalog'
import { industryNames, selectMultiLineData } from './selection'
import { multiLineEndLabelsDefinition } from './tanstack'
import type { MultiLineDatum } from './selection'

describe('multi-line end labels', () => {
  it('selects each newest dated observation when source order changes', () => {
    const rows = selectMultiLineData(industries, 0)
    const reordered = [...rows].reverse()
    const scene = createChartRuntime<MultiLineDatum, Date, number>().render(
      multiLineEndLabelsDefinition(reordered),
      { width: 720, height: 480 },
    )
    const linePoints = scene.points.filter(
      ({ markId }) => markId === 'industry-lines',
    )
    const labels = scene.points.filter(
      ({ markId }) => markId === 'industry-end-labels',
    )

    expect(linePoints).toHaveLength(rows.length)
    expect(labels).toHaveLength(industryNames.length)

    for (const industry of industryNames) {
      const expected = rows
        .filter((row) => row.industry === industry)
        .reduce((newest, row) =>
          row.date.getTime() > newest.date.getTime() ? row : newest,
        )
      const label = labels.find(({ datum }) => datum.industry === industry)

      expect(label?.datum).toBe(expected)
      expect(label?.xValue).toBe(expected.date)
      expect(label?.yValue).toBe(expected.unemployed)
    }
  })

  it('keeps grouped newest-value selection in the authored source closure', async () => {
    const closure = await loadTanStackSources('02-multi-line-end-labels')
    const source = closure.files.map((file) => file.source).join('\n')

    expect(source).toContain('const endpoints = select(rows, {')
    expect(source).toContain("by: 'industry'")
    expect(source).toContain('datum.date.getTime()')
    expect(source).toContain("select: 'max'")
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('lastBySeries')
  })
})
