import {
  binX,
  dot,
  lineY,
  pointerX,
  rectY,
  ruleY,
  tip,
} from '@observablehq/plot'
import { createPlotRenderer, definePlot } from '@plot-poc/observable'
import type { DownloadsRow, PenguinBodyMassRow } from './data'

const SPECIES_DOMAIN = ['Adelie', 'Chinstrap', 'Gentoo'] as const

export const downloadsPlot = definePlot<readonly DownloadsRow[], DownloadsRow>(
  ({ data, width, theme }) => ({
    ariaLabel: 'Daily @observablehq/cars downloads',
    ariaDescription:
      'Daily npm downloads for the Observable Cars package from November 2017 through February 2022.',
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
      label: width < 480 ? null : 'Daily downloads',
      grid: true,
    },
    marks: [
      ruleY([0], { stroke: theme.axis }),
      lineY(data, {
        x: 'date',
        y: 'downloads',
        stroke: theme.categorical[0],
        strokeWidth: 2.25,
        curve: 'monotone-x',
      }),
      dot(data, {
        x: 'date',
        y: 'downloads',
        stroke: theme.categorical[0],
        fill: theme.tooltipBackground,
        r: width < 420 ? 1.75 : 2.5,
      }),
      tip(
        data,
        pointerX({
          x: 'date',
          y: 'downloads',
          stroke: theme.categorical[0],
          title: (datum) =>
            `${datum.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}\n${datum.downloads.toLocaleString()} downloads`,
        }),
      ),
    ],
  }),
)

export const bodyMassDistributionPlot = definePlot<
  readonly PenguinBodyMassRow[],
  PenguinBodyMassRow
>(({ data, width, theme }) => {
  const vertical = width < 680

  return {
    ariaLabel: 'Penguin body-mass distributions by species',
    ariaDescription:
      'Faceted histograms compare body mass for Adelie, Chinstrap, and Gentoo penguins.',
    marginTop: 30,
    marginRight: 18,
    marginBottom: 42,
    marginLeft: width < 480 ? 42 : 54,
    facet: {
      data,
      ...(vertical ? { y: 'species' } : { x: 'species' }),
    },
    fx: { label: null },
    fy: { label: null },
    x: {
      label: 'Body mass (g)',
      grid: true,
      domain: [2500, 6500],
    },
    y: {
      label: vertical && width >= 480 ? 'Penguins' : null,
      grid: true,
    },
    color: {
      domain: SPECIES_DOMAIN,
      range: theme.categorical.slice(1, SPECIES_DOMAIN.length + 1),
      legend: false,
    },
    marks: [
      rectY(data, {
        ...binX(
          { y: 'count' },
          {
            x: 'body_mass_g',
            thresholds: 18,
          },
        ),
        fill: 'species',
        insetLeft: 0.75,
        insetRight: 0.75,
        tip: true,
      }),
    ],
  }
})

export const downloadsRenderer = createPlotRenderer(downloadsPlot)
export const bodyMassDistributionRenderer = createPlotRenderer(
  bodyMassDistributionPlot,
)
