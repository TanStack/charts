import { barX, colorLegend, defineChart, ruleX } from '@tanstack/charts'
import { group } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import { stack, stackOffsetDiverging } from 'd3-shape'
import { likertData, likertQuestions, likertResponses } from './data'
import type { LikertPoint, LikertResponse } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface LikertQuestion {
  question: string
  values: ReadonlyMap<LikertResponse, number>
}

interface LikertSegment {
  id: string
  question: string
  response: LikertResponse
  x1: number
  x2: number
}

const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const grouped = group(likertData(input.revision), (row) => row.question)
    const questions: LikertQuestion[] = likertQuestions.map((question) => ({
      question,
      values: new Map(
        (grouped.get(question) ?? []).map((row) => [
          row.response,
          row.signedValue,
        ]),
      ),
    }))
    const series = stack<LikertQuestion, LikertResponse>()
      .keys(likertResponses)
      .value((question, response) => question.values.get(response) ?? 0)
      .offset(stackOffsetDiverging)(questions)
    const segments: LikertSegment[] = series.flatMap((responseSeries) =>
      responseSeries.map((point) => ({
        id: `${point.data.question}:${responseSeries.key}`,
        question: point.data.question,
        response: responseSeries.key,
        x1: point[0],
        x2: point[1],
      })),
    )

    return {
      marks: [
        barX(segments, {
          x1: 'x1',
          x2: 'x2',
          y: 'question',
          z: 'response',
          color: 'response',
          key: 'id',
          inset: 0.75,
        }),
        ruleX([0], { stroke: '#64748b' }),
      ],
      x: {
        scale: scaleLinear().domain([-40, 80]),
        grid: true,
        label: 'Share of responses',
        format: (value) => `${Math.abs(value)}%`,
      },
      y: {
        scale: scaleBand<string>()
          .domain(likertQuestions)
          .paddingInner(0.14)
          .paddingOuter(0.08),
      },
      color: {
        scale: scaleOrdinal<LikertPoint['response'], string>()
          .domain(likertResponses)
          .range(colors),
        legend: colorLegend({ label: 'Response' }),
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Diverging Likert survey responses',
)
