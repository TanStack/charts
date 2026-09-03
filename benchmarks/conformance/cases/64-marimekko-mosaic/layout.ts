import { cumsum, group, rollup, sum } from 'd3-array'
import type { SurveyRow } from '@tanstack/charts-data/survey'
import { mosaicResponses } from './selection'

export { mosaicResponses } from './selection'

export interface MosaicCell {
  Question: string
  Response: string
  count: number
  x1: number
  x2: number
  y1: number
  y2: number
}

export interface MosaicLabel {
  Question: string
  x: number
  y: number
}

export function mosaicLayout(rows: readonly SurveyRow[]): {
  cells: readonly MosaicCell[]
  labels: readonly MosaicLabel[]
} {
  const byQuestion = group(rows, (row) => row.Question)
  const questions = Array.from(byQuestion.keys())
  const totals = questions.map(
    (question) => byQuestion.get(question)?.length ?? 0,
  )
  const grandTotal = sum(totals)
  if (grandTotal === 0) return { cells: [], labels: [] }

  const xEnds = cumsum(totals, (count) => count / grandTotal)
  const cells: MosaicCell[] = []
  const labels: MosaicLabel[] = []

  questions.forEach((Question, questionIndex) => {
    const questionRows = byQuestion.get(Question) ?? []
    const questionTotal = totals[questionIndex] ?? 0
    if (questionTotal === 0) return

    const responseCounts = rollup(
      questionRows,
      (values) => values.length,
      (row) => row.Response,
    )
    const x1 = questionIndex === 0 ? 0 : (xEnds[questionIndex - 1] ?? 0)
    const x2 = xEnds[questionIndex] ?? x1
    const ordered = mosaicResponses.map((Response) => ({
      Question,
      Response,
      count: responseCounts.get(Response) ?? 0,
    }))
    const yEnds = cumsum(ordered, (row) => row.count / questionTotal)

    ordered.forEach((row, responseIndex) => {
      cells.push({
        ...row,
        x1,
        x2,
        y1: responseIndex === 0 ? 0 : (yEnds[responseIndex - 1] ?? 0),
        y2: yEnds[responseIndex] ?? 0,
      })
    })
    labels.push({
      Question,
      x: (x1 + x2) / 2,
      y: 1.055,
    })
  })

  return { cells, labels }
}
