import { defineChart } from '@tanstack/charts'
import { treemap } from '@tanstack/charts/hierarchy/treemap'
import { flare } from '@charts-poc/demo-data/flare'
import { selectTreemapData } from './selection'
import { tanstackMount } from '../../shared/mount'

const colors = ['#2563eb', '#8b5cf6', '#10b981']

const rows = selectTreemapData(flare)

export const treemapDefinition = () =>
  defineChart({
    marks: [
      treemap(rows, {
        id: 'treemap-cells',
        path: 'name',
        delimiter: '.',
        value: 'size',
        ratio: 4 / 3,
        round: true,
        color: (node) => node.ancestorIds.at(-1) ?? node.id,
        inset: 1,
        stroke: '#ffffff',
        strokeWidth: 1,
        label: 'name',
        labelFill: '#ffffff',
        labelFontSize: 8,
        labelFontWeight: 600,
      }),
    ],
    color: { range: colors },
    guides: false,
    margin: 0,
  })

export const mount = tanstackMount(treemapDefinition, 'Flare analytics treemap')
