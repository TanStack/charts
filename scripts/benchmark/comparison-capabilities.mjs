export const comparisonAvailabilityIcons = {
  firstParty: '✅',
  composed: '🟡',
  unavailable: '🔴',
}

export const comparisonChartTypes = ['line', 'bar', 'area', 'scatter']
export const comparisonTiers = ['basic', 'interactive', 'advanced']

export const comparisonOfficialSources = {
  'ag-charts': 'https://www.ag-grid.com/charts/javascript/installation/',
  'ag-charts-license': 'https://www.ag-grid.com/charts/javascript/licensing/',
  'ag-charts-modules':
    'https://www.ag-grid.com/charts/javascript/module-registry/',
  apexcharts: 'https://apexcharts.com/docs/installation/',
  'apexcharts-bundle-survey':
    'https://apexcharts.com/blog/state-of-javascript-charting-2026/',
  'apexcharts-license': 'https://apexcharts.com/license/community/',
  bklit: 'https://bklit.com/docs/installation',
  'bklit-license': 'https://github.com/bklit/bklit-ui#license',
  chartjs: 'https://www.chartjs.org/docs/latest/',
  echarts:
    'https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/',
  highcharts:
    'https://www.highcharts.com/docs/getting-started/system-requirements',
  'highcharts-license': 'https://shop.highcharts.com/license-16.0.pdf',
  'lightweight-charts': 'https://tradingview.github.io/lightweight-charts/',
  nivo: 'https://nivo.rocks/about/',
  recharts: 'https://recharts.github.io/en-US/',
  'observable-plot': 'https://observablehq.com/plot/features/plots',
  plotly: 'https://plotly.com/javascript/',
  'plotly-bundle-size': 'https://plotly.com/graphs/',
  uplot: 'https://github.com/leeoniya/uPlot',
  'vega-lite': 'https://vega.github.io/vega-lite/',
  victory: 'https://commerce.nearform.com/open-source/victory/',
  visx: 'https://github.com/airbnb/visx',
}

export function formatComparisonImplementation(implementation) {
  return `${comparisonAvailabilityIcons[implementation.availability]} ${formatComparisonImplementationDetail(implementation, true)}`
}

export function formatComparisonImplementationDetail(
  implementation,
  markdown = false,
) {
  const detail =
    markdown && implementation.code
      ? `\`${implementation.detail}\``
      : implementation.detail
  return `${implementation.prefix ?? ''}${detail}`
}

export const comparisonCapabilityCoverage = [
  {
    capability: 'Axes and grid',
    measured: 'basic and above',
    implementations: {
      tanstack: firstParty('Built in'),
      chartjs: firstParty('Built in'),
      echarts: firstParty('Components'),
      recharts: firstParty('Components'),
      'observable-plot': firstParty('Marks and scales'),
    },
  },
  {
    capability: 'Legend',
    measured: 'interactive and above',
    implementations: {
      tanstack: firstParty('Built in'),
      chartjs: firstParty('Plugin'),
      echarts: firstParty('Component'),
      recharts: firstParty('Component'),
      'observable-plot': firstParty('Legend API'),
    },
  },
  {
    capability: 'Pointer tooltip',
    measured: 'interactive and above',
    implementations: {
      tanstack: firstParty('Built in'),
      chartjs: firstParty('Plugin'),
      echarts: firstParty('Component'),
      recharts: firstParty('Component'),
      'observable-plot': firstParty('Tip mark'),
    },
  },
  {
    capability: 'Multi-series composition',
    measured: 'advanced',
    implementations: {
      tanstack: firstParty('Built in'),
      chartjs: firstParty('Datasets'),
      echarts: firstParty('Series'),
      recharts: firstParty('Components'),
      'observable-plot': firstParty('Marks and transforms'),
    },
  },
  {
    capability: 'Selection',
    measured: 'not timed',
    implementations: {
      tanstack: firstParty('onSelect', true),
      chartjs: firstParty('Event API'),
      echarts: firstParty('Event API'),
      recharts: firstParty('Event props'),
      'observable-plot': composed('Host composition'),
    },
  },
  {
    capability: 'Animation',
    measured: 'not timed',
    implementations: {
      tanstack: firstParty('Built in'),
      chartjs: firstParty('Built in'),
      echarts: firstParty('Built in'),
      recharts: firstParty('Built in'),
      'observable-plot': composed('Host-owned'),
    },
  },
  {
    capability: 'Responsive resize',
    measured: 'not timed',
    implementations: {
      tanstack: firstParty('Observed'),
      chartjs: firstParty('Observed'),
      echarts: composed('resize()', true, 'Explicit '),
      recharts: firstParty('ResponsiveContainer', true),
      'observable-plot': composed('Host rerender'),
    },
  },
  {
    capability: 'SVG output',
    measured: 'documented renderer',
    implementations: {
      tanstack: firstParty('Default'),
      chartjs: unavailable('Canvas only'),
      echarts: firstParty('Optional renderer'),
      recharts: firstParty('Default'),
      'observable-plot': firstParty('Default'),
    },
  },
  {
    capability: 'Canvas output',
    measured: 'documented renderer',
    implementations: {
      tanstack: firstParty('Optional renderer'),
      chartjs: firstParty('Default'),
      echarts: firstParty('Default'),
      recharts: unavailable('No first-party renderer'),
      'observable-plot': unavailable('No first-party renderer'),
    },
  },
  {
    capability: 'Framework-neutral core',
    measured: 'documented package boundary',
    implementations: {
      tanstack: firstParty('Core + adapters'),
      chartjs: firstParty('Yes'),
      echarts: firstParty('Yes'),
      recharts: unavailable('React only'),
      'observable-plot': firstParty('Yes'),
    },
  },
]

function firstParty(detail, code = false, prefix = '') {
  return { availability: 'firstParty', code, detail, prefix }
}

function composed(detail, code = false, prefix = '') {
  return { availability: 'composed', code, detail, prefix }
}

function unavailable(detail) {
  return { availability: 'unavailable', code: false, detail, prefix: '' }
}
