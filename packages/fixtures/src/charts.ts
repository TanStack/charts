import {
  binX,
  dot,
  lineY,
  pointerX,
  rectY,
  ruleX,
  ruleY,
  tip,
} from '@observablehq/plot'
import { createPlotRenderer, definePlot } from '@plot-poc/observable'
import type { DownloadPoint, LatencyPoint } from './data'

const PACKAGE_DOMAIN = ['Query', 'Router', 'Table'] as const
const PLAN_DOMAIN = ['Free', 'Pro', 'Enterprise'] as const

export const downloadsPlot = definePlot<DownloadPoint[], DownloadPoint>(
  ({ data, width, theme }) => ({
    ariaLabel: 'Weekly package downloads',
    ariaDescription:
      'Weekly downloads for TanStack Query, Router, and Table over six months.',
    marginTop: 18,
    marginRight: width < 480 ? 12 : 24,
    marginBottom: 42,
    marginLeft: width < 480 ? 48 : 66,
    x: {
      type: 'utc',
      label: null,
      ticks: width < 420 ? 4 : width < 720 ? 6 : 10,
    },
    y: {
      label: width < 480 ? null : 'Weekly downloads',
      grid: true,
      tickFormat: '~s',
    },
    color: {
      domain: PACKAGE_DOMAIN,
      range: theme.categorical.slice(0, PACKAGE_DOMAIN.length),
      legend: width >= 420,
    },
    marks: [
      ruleY([0], { stroke: theme.axis }),
      lineY(data, {
        x: 'date',
        y: 'downloads',
        stroke: 'package',
        strokeWidth: 2.25,
        curve: 'monotone-x',
      }),
      dot(data, {
        x: 'date',
        y: 'downloads',
        stroke: 'package',
        fill: theme.tooltipBackground,
        r: width < 420 ? 1.75 : 2.5,
      }),
      tip(
        data,
        pointerX({
          x: 'date',
          y: 'downloads',
          stroke: 'package',
          title: (datum) =>
            `${datum.package}\n${datum.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}\n${datum.downloads.toLocaleString()} downloads`,
        }),
      ),
    ],
  }),
)

export const latencyDistributionPlot = definePlot<LatencyPoint[], LatencyPoint>(
  ({ data, width, theme }) => {
    const vertical = width < 680

    return {
      ariaLabel: 'Request latency distributions by plan',
      ariaDescription:
        'Faceted histograms compare request latency for Free, Pro, and Enterprise plans.',
      marginTop: 30,
      marginRight: 18,
      marginBottom: 42,
      marginLeft: width < 480 ? 42 : 54,
      facet: {
        data,
        ...(vertical ? { y: 'plan' } : { x: 'plan' }),
      },
      fx: { label: null },
      fy: { label: null },
      x: {
        label: 'Request latency (ms)',
        grid: true,
        domain: [0, 500],
      },
      y: {
        label: vertical && width >= 480 ? 'Requests' : null,
        grid: true,
      },
      color: {
        domain: PLAN_DOMAIN,
        range: theme.categorical.slice(1, PLAN_DOMAIN.length + 1),
        legend: false,
      },
      marks: [
        rectY(data, {
          ...binX(
            { y: 'count' },
            {
              x: 'latency',
              thresholds: 18,
            },
          ),
          fill: 'plan',
          insetLeft: 0.75,
          insetRight: 0.75,
          tip: true,
        }),
        ruleX([200], {
          stroke: theme.warning,
          strokeWidth: 1.5,
          strokeDasharray: '4,4',
        }),
      ],
    }
  },
)

export const downloadsRenderer = createPlotRenderer(downloadsPlot)
export const latencyDistributionRenderer = createPlotRenderer(
  latencyDistributionPlot,
)
