export const chartLibraries = [
  {
    id: 'tanstack',
    label: 'TanStack Charts',
    packageName: '@tanstack/charts',
    packagePath: './packages/charts-core/package.json',
    sources: {
      line: './libraries/tanstack/line.ts',
      bar: './libraries/tanstack/bar.ts',
      area: './libraries/tanstack/area.ts',
      scatter: './libraries/tanstack/scatter.ts',
    },
  },
  {
    id: 'chartjs',
    label: 'Chart.js',
    packageName: 'chart.js',
    source: './libraries/chartjs.ts',
  },
  {
    id: 'echarts',
    label: 'Apache ECharts',
    packageName: 'echarts',
    source: './libraries/echarts.ts',
  },
  {
    id: 'recharts',
    label: 'Recharts',
    packageName: 'recharts',
    source: './libraries/recharts.tsx',
    sharedExternals: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
    ],
  },
  {
    id: 'observable-plot',
    label: 'Observable Plot',
    packageName: '@observablehq/plot',
    source: './libraries/observable-plot.ts',
  },
]
