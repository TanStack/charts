export const comparisonAvailabilityIcons = {
  firstParty: '✅',
  composed: '🟡',
  unavailable: '🔴',
}

export const comparisonChartTypes = ['line', 'bar', 'area', 'scatter']
export const comparisonTiers = ['basic', 'interactive', 'advanced']

export const comparisonOfficialSources = {
  chartjs: 'https://www.chartjs.org/docs/latest/',
  echarts:
    'https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/',
  recharts: 'https://recharts.github.io/en-US/',
  'observable-plot': 'https://observablehq.com/plot/features/plots',
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
