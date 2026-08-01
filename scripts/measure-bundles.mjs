import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { basename, dirname, resolve } from 'node:path'
import { build } from 'esbuild'

const root = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(root, '.bundle-output')
const baselinePath = resolve(
  root,
  'benchmarks/bundle-size/universal-baseline.json',
)
const args = new Set(process.argv.slice(2))
if (args.has('--check') && args.has('--update-baseline')) {
  throw new Error('Choose either --check or --update-baseline, not both.')
}
const rendererBoundaryModules = {
  canvas: [
    'packages/charts-core/src/canvas.ts',
    'packages/react-charts/src/CanvasChart.tsx',
    'packages/react-charts/src/canvas.ts',
  ],
  svg: [
    'packages/charts-core/src/reconcile.ts',
    'packages/charts-core/src/svg-renderer.ts',
    'packages/charts-core/src/svg-resources.ts',
    'packages/charts-core/src/svg-surface.ts',
    'packages/charts-core/src/svg.ts',
    'packages/react-charts/src/Chart.tsx',
  ],
  native: [
    'packages/react-native-charts/src/Chart.tsx',
    'packages/react-native-charts/src/FocusOverlay.tsx',
    'packages/react-native-charts/src/SvgScene.tsx',
    'packages/react-native-charts/src/Tooltip.tsx',
  ],
  browser: [
    'packages/charts-core/src/adapter.ts',
    'packages/charts-core/src/adapter-renderer.ts',
    'packages/charts-core/src/canvas.ts',
    'packages/charts-core/src/dom.ts',
    'packages/charts-core/src/dom-text.ts',
    'packages/charts-core/src/export.ts',
    'packages/charts-core/src/reconcile.ts',
    'packages/charts-core/src/renderer.ts',
    'packages/charts-core/src/svg-resources.ts',
    'packages/charts-core/src/svg-surface.ts',
    'packages/react-charts/src/CanvasChart.tsx',
    'packages/react-charts/src/Chart.tsx',
    'packages/react-charts/src/RendererChart.tsx',
  ],
}
const retainedInputGroups = {
  compactLinear: [/(?:^|\/)packages\/charts-scales\/src\/linear\.ts$/u],
  compactBandEntry: [/(?:^|\/)packages\/charts-scales\/src\/band\.ts$/u],
  compactPointEntry: [/(?:^|\/)packages\/charts-scales\/src\/point\.ts$/u],
  compactBandKernel: [
    /(?:^|\/)packages\/charts-scales\/src\/band-kernel\.ts$/u,
  ],
  compactOrdinal: [/(?:^|\/)packages\/charts-scales\/src\/ordinal\.ts$/u],
  coreTooltipRuntime: [
    /(?:^|\/)packages\/charts-core\/src\/tooltip\.ts$/u,
    /(?:^|\/)packages\/charts-core\/src\/tooltip-position\.ts$/u,
  ],
  reactTooltipBridge: [/(?:^|\/)packages\/react-charts\/src\/tooltip\.tsx$/u],
  tooltipRuntime: [
    /(?:^|\/)packages\/charts-core\/src\/tooltip\.ts$/u,
    /(?:^|\/)packages\/charts-core\/src\/tooltip-position\.ts$/u,
    /(?:^|\/)packages\/react-charts\/src\/tooltip\.tsx$/u,
  ],
  tooltipExtension: [/(?:^|\/)packages\/charts-core\/src\/tooltip\.ts$/u],
  tooltipPortal: [/(?:^|\/)packages\/charts-core\/src\/tooltip-portal\.ts$/u],
  transformRuntime: [
    /(?:^|\/)packages\/charts-core\/src\/transform(?:-[^/]+)?\.ts$/u,
  ],
  transformBin: [/(?:^|\/)packages\/charts-core\/src\/transform-bin\.ts$/u],
  transformBinXY: [
    /(?:^|\/)packages\/charts-core\/src\/transform-bin-xy\.ts$/u,
  ],
  transformBinTime: [
    /(?:^|\/)packages\/charts-core\/src\/transform-bin-time\.ts$/u,
  ],
  transformGroup: [/(?:^|\/)packages\/charts-core\/src\/transform-group\.ts$/u],
  transformWindow: [
    /(?:^|\/)packages\/charts-core\/src\/transform-window\.ts$/u,
  ],
  transformCumulative: [
    /(?:^|\/)packages\/charts-core\/src\/transform-cumulative\.ts$/u,
  ],
  transformRank: [/(?:^|\/)packages\/charts-core\/src\/transform-rank\.ts$/u],
  transformNormalize: [
    /(?:^|\/)packages\/charts-core\/src\/transform-normalize\.ts$/u,
  ],
  transformSelect: [
    /(?:^|\/)packages\/charts-core\/src\/transform-select\.ts$/u,
  ],
  transformStack: [/(?:^|\/)packages\/charts-core\/src\/transform-stack\.ts$/u],
  transformReduce: [
    /(?:^|\/)packages\/charts-core\/src\/transform-reduce\.ts$/u,
  ],
  nativeTooltip: [
    /(?:^|\/)packages\/react-native-charts\/src\/Tooltip\.tsx$/u,
    /(?:^|\/)packages\/react-native-charts\/src\/tooltip-entry\.ts$/u,
  ],
  d3Array: [/(?:^|\/)node_modules\/d3-array\//u],
  d3Shape: [/(?:^|\/)node_modules\/d3-shape\//u],
  d3ScaleRuntime: [
    /(?:^|\/)node_modules\/d3-scale\//u,
    /(?:^|\/)node_modules\/d3-format\//u,
    /(?:^|\/)node_modules\/d3-interpolate\//u,
    /(?:^|\/)node_modules\/d3-color\//u,
    /(?:^|\/)node_modules\/internmap\//u,
  ],
  d3GeometryRuntime: [/(?:^|\/)node_modules\/(?:d3-geo|d3-shape)\//u],
  d3Runtime: [/(?:^|\/)node_modules\/(?:d3-[^/]+|internmap)\//u],
}
const granularTransformInputGroups = [
  'transformBin',
  'transformBinXY',
  'transformBinTime',
  'transformGroup',
  'transformWindow',
  'transformCumulative',
  'transformRank',
  'transformNormalize',
  'transformSelect',
  'transformStack',
  'transformReduce',
]
const nativeExternals = [
  'react',
  'react/jsx-runtime',
  'react-native',
  'react-native/*',
  'react-native-svg',
  'react-native-svg/*',
]
const entries = [
  measured('Core host', 'benchmarks/entries/core.ts', {
    inputBoundary: { forbid: ['d3GeometryRuntime'] },
  }),
  budgeted(
    'Granular data transform suite',
    'benchmarks/entries/charts-transform-suite.ts',
    6.35,
    {
      inputBoundary: transformSuiteBoundary(),
    },
  ),
  budgeted(
    'Transform: numeric bin',
    'benchmarks/entries/charts-transform-bin.ts',
    3.05,
    {
      inputBoundary: granularTransformBoundary('transformBin', {
        allowD3Array: true,
      }),
    },
  ),
  budgeted(
    'Transform: 2D bin',
    'benchmarks/entries/charts-transform-bin-xy.ts',
    2.9,
    {
      inputBoundary: granularTransformBoundary('transformBinXY', {
        allowD3Array: true,
      }),
    },
  ),
  budgeted(
    'Transform: calendar bin',
    'benchmarks/entries/charts-transform-bin-time.ts',
    1.45,
    { inputBoundary: granularTransformBoundary('transformBinTime') },
  ),
  budgeted(
    'Transform: group',
    'benchmarks/entries/charts-transform-group.ts',
    1.05,
    {
      inputBoundary: granularTransformBoundary('transformGroup'),
    },
  ),
  budgeted(
    'Transform: window',
    'benchmarks/entries/charts-transform-window.ts',
    1.35,
    { inputBoundary: granularTransformBoundary('transformWindow') },
  ),
  budgeted(
    'Transform: cumulative',
    'benchmarks/entries/charts-transform-cumulative.ts',
    1.2,
    { inputBoundary: granularTransformBoundary('transformCumulative') },
  ),
  budgeted(
    'Transform: rank',
    'benchmarks/entries/charts-transform-rank.ts',
    0.9,
    {
      inputBoundary: granularTransformBoundary('transformRank'),
    },
  ),
  budgeted(
    'Transform: normalize',
    'benchmarks/entries/charts-transform-normalize.ts',
    0.95,
    { inputBoundary: granularTransformBoundary('transformNormalize') },
  ),
  budgeted(
    'Transform: select',
    'benchmarks/entries/charts-transform-select.ts',
    0.9,
    { inputBoundary: granularTransformBoundary('transformSelect') },
  ),
  budgeted(
    'Transform: stack',
    'benchmarks/entries/charts-transform-stack.ts',
    2.1,
    {
      inputBoundary: granularTransformBoundary('transformStack', {
        allowD3Shape: true,
      }),
    },
  ),
  budgeted(
    'Transform: advanced reducers',
    'benchmarks/entries/charts-transform-reduce.ts',
    0.55,
    { inputBoundary: granularTransformBoundary('transformReduce') },
  ),
  locked('D3-scale line scene', 'benchmarks/entries/charts-core.ts', {
    inputBoundary: {
      forbid: ['transformRuntime', 'tooltipRuntime', 'd3GeometryRuntime'],
    },
  }),
  locked('D3-scale line + static SVG', 'benchmarks/entries/charts-svg.ts', {
    rendererBoundary: 'svg',
    inputBoundary: { forbid: ['d3GeometryRuntime'] },
  }),
  budgeted(
    'D3-scale UTC line + static SVG',
    'benchmarks/entries/charts-time-svg.ts',
    20.9,
  ),
  budgeted(
    'D3-scale histogram + static SVG',
    'benchmarks/entries/charts-histogram-svg.ts',
    18.7,
  ),
  budgeted(
    'D3-scale facets + static SVG',
    'benchmarks/entries/charts-facet-svg.ts',
    18.8,
  ),
  budgeted(
    'D3-scale arrows + static SVG',
    'benchmarks/entries/charts-arrow-svg.ts',
    16.35,
  ),
  budgeted(
    'D3-scale areaX + static SVG',
    'benchmarks/entries/charts-area-x-svg.ts',
    19.8,
  ),
  budgeted('Frame + static SVG', 'benchmarks/entries/charts-frame-svg.ts', 7.9),
  budgeted(
    'Custom mark scale-value factory',
    'benchmarks/entries/charts-mark-scale-values.ts',
    0.25,
  ),
  budgeted(
    'D3-scale hexagons + static SVG',
    'benchmarks/entries/charts-hexagon-svg.ts',
    16.3,
  ),
  budgeted(
    'D3-scale link + static SVG',
    'benchmarks/entries/charts-link-svg.ts',
    16.25,
  ),
  budgeted(
    'D3-scale ticks + static SVG',
    'benchmarks/entries/charts-tick-svg.ts',
    16.6,
  ),
  budgeted(
    'D3-scale vectors + static SVG',
    'benchmarks/entries/charts-vector-svg.ts',
    16.45,
  ),
  budgeted(
    'D3 geo shape + static SVG',
    'benchmarks/entries/charts-geo-svg.ts',
    13.85,
  ),
  budgeted(
    'Polar arc + static SVG',
    'benchmarks/entries/charts-polar-arc-svg.ts',
    11.75,
  ),
  budgeted(
    'D3 pie + polar arc + static SVG',
    'benchmarks/entries/charts-polar-pie-svg.ts',
    12.2,
  ),
  budgeted(
    'Polar gauge composition + static SVG',
    'benchmarks/entries/charts-polar-gauge-svg.ts',
    20.55,
  ),
  budgeted(
    'Polar line + scatter composition + static SVG',
    'benchmarks/entries/charts-polar-line-scatter-svg.ts',
    21.8,
  ),
  locked('Representative marks', 'benchmarks/entries/charts-representative.ts'),
  measured(
    'Renderer-neutral DOM host',
    'benchmarks/entries/charts-renderer.ts',
    {
      rendererBoundary: 'neutral',
      inputBoundary: {
        forbid: ['tooltipRuntime', 'tooltipPortal'],
      },
    },
  ),
  measured('Canvas DOM host', 'benchmarks/entries/charts-canvas.ts', {
    rendererBoundary: 'canvas',
  }),
  locked('TanStack DOM host', 'benchmarks/entries/charts-dom.ts', {
    rendererBoundary: 'svg',
    inputBoundary: {
      forbid: ['tooltipRuntime', 'tooltipPortal', 'd3GeometryRuntime'],
    },
  }),
  measured(
    'React renderer-neutral adapter',
    'benchmarks/entries/charts-react-core.ts',
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'neutral',
      inputBoundary: {
        forbid: ['tooltipRuntime', 'tooltipPortal'],
      },
    },
  ),
  measured(
    'React Canvas adapter',
    'benchmarks/entries/charts-react-canvas.ts',
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'canvas',
    },
  ),
  locked('React adapter', 'benchmarks/entries/charts-react.ts', {
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    rendererBoundary: 'svg',
    inputBoundary: {
      forbid: ['tooltipRuntime', 'tooltipPortal', 'd3GeometryRuntime'],
    },
  }),
  locked('React line consumer', 'benchmarks/entries/charts-react-line.ts', {
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    inputBoundary: { forbid: ['d3GeometryRuntime'] },
  }),
  measured(
    'React Native SVG host',
    'benchmarks/entries/charts-react-native.ts',
    {
      external: nativeExternals,
      rendererBoundary: 'native',
      inputBoundary: {
        forbid: [
          'nativeTooltip',
          'tooltipRuntime',
          'tooltipPortal',
          'd3Runtime',
        ],
      },
      platform: 'neutral',
      conditions: ['react-native', 'import'],
    },
  ),
  measured(
    'React Native host + universal static SVG boundary',
    'benchmarks/entries/charts-react-native-universal-boundary.ts',
    {
      external: nativeExternals,
      rendererBoundary: 'native',
      platform: 'neutral',
      conditions: ['react-native', 'import'],
    },
  ),
  measured(
    'React Native SVG host + tooltip',
    'benchmarks/entries/charts-react-native-tooltip.ts',
    {
      external: nativeExternals,
      rendererBoundary: 'native',
      inputBoundary: {
        require: ['nativeTooltip'],
        forbid: ['tooltipRuntime', 'tooltipPortal', 'd3Runtime'],
        addedFrom: 'React Native SVG host',
        allowAdded: ['nativeTooltip'],
      },
      platform: 'neutral',
      conditions: ['react-native', 'import'],
    },
  ),
  measured(
    'React Native line consumer',
    'benchmarks/entries/charts-react-native-line.ts',
    {
      external: nativeExternals,
      rendererBoundary: 'native',
      inputBoundary: {
        forbid: [
          'nativeTooltip',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      platform: 'neutral',
      conditions: ['react-native', 'import'],
    },
  ),
  lockedBudgeted(
    'Compact-scale line scene',
    'benchmarks/entries/charts-compact-linear-scene.ts',
    8.1,
    {
      inputBoundary: {
        require: ['compactLinear'],
        forbid: [
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'tooltipRuntime',
          'tooltipPortal',
          'transformRuntime',
          'd3Runtime',
        ],
      },
    },
  ),
  lockedBudgeted(
    'React compact-scale line consumer',
    'benchmarks/entries/charts-react-compact-line.ts',
    16.8,
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['compactLinear'],
        forbid: [
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'tooltipRuntime',
          'tooltipPortal',
          'transformRuntime',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'Tooltip extension kernel',
    'benchmarks/entries/charts-tooltip-kernel.ts',
    5,
    {
      inputBoundary: {
        require: ['tooltipExtension'],
        forbid: [
          'tooltipPortal',
          'compactLinear',
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'compactOrdinal',
          'reactTooltipBridge',
          'transformRuntime',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'Tooltip portal transport kernel',
    'benchmarks/entries/charts-tooltip-portal-kernel.ts',
    2,
    {
      inputBoundary: {
        require: ['tooltipPortal'],
        forbid: [
          'tooltipExtension',
          'compactLinear',
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'compactOrdinal',
          'reactTooltipBridge',
          'transformRuntime',
          'd3Runtime',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'React compact-scale line + tooltip',
    'benchmarks/entries/charts-react-compact-line-tooltip.ts',
    'React compact-scale line consumer',
    4.5,
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['compactLinear', 'tooltipExtension'],
        forbid: [
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'tooltipPortal',
          'reactTooltipBridge',
          'd3Runtime',
        ],
        addedFrom: 'React compact-scale line consumer',
        allowAdded: ['coreTooltipRuntime'],
      },
    },
  ),
  incrementalBudgeted(
    'React compact-scale line + tooltip portal',
    'benchmarks/entries/charts-react-compact-line-tooltip-portal.ts',
    'React compact-scale line + tooltip',
    2,
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['compactLinear', 'tooltipExtension', 'tooltipPortal'],
        forbid: [
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'reactTooltipBridge',
          'd3Runtime',
        ],
        addedFrom: 'React compact-scale line + tooltip',
        allowAdded: ['tooltipPortal'],
      },
    },
  ),
  budgeted(
    'Stats parity surface',
    'benchmarks/entries/charts-stats-parity.ts',
    40.5,
  ),
  locked(
    'Custom-scale line scene',
    'benchmarks/entries/charts-custom-scale-scene.ts',
    {
      inputBoundary: {
        forbid: [
          'compactLinear',
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'tooltipRuntime',
          'tooltipPortal',
          'd3Runtime',
        ],
      },
    },
  ),
  locked(
    'D3 linear-scale line scene',
    'benchmarks/entries/charts-d3-linear-scene.ts',
  ),
  budgeted(
    'D3 curved line scene',
    'benchmarks/entries/charts-d3-curved-line-scene.ts',
    17.45,
  ),
  budgeted(
    'D3 time-scale line scene',
    'benchmarks/entries/charts-d3-time-scene.ts',
    19.8,
  ),
  budgeted(
    'Direct D3 monotone + TanStack SVG',
    'benchmarks/entries/charts-d3-curve-svg.ts',
    18.5,
  ),
  budgeted(
    'Direct D3 transforms + TanStack histogram',
    'benchmarks/entries/charts-d3-transform-histogram.ts',
    17.5,
  ),
  budgeted(
    'Direct D3 time + TanStack UTC line',
    'benchmarks/entries/charts-d3-time-svg.ts',
    20.9,
  ),
  budgeted(
    'Direct D3 quadtree + TanStack DOM host',
    'benchmarks/entries/charts-d3-quadtree-dom.ts',
    25.9,
  ),
  budgeted(
    'Direct D3 Delaunay + TanStack DOM host',
    'benchmarks/entries/charts-d3-delaunay-dom.ts',
    31.2,
  ),
  measured('D3 array numeric kernel', 'benchmarks/entries/d3-array-kernel.ts'),
  measured(
    'D3 compact format kernel',
    'benchmarks/entries/d3-format-kernel.ts',
  ),
  measured('D3 calendar tick kernel', 'benchmarks/entries/d3-time-kernel.ts'),
  budgeted(
    'D3 linear scale kernel',
    'benchmarks/entries/d3-linear-kernel.ts',
    8.2,
  ),
  budgeted('D3 band scale kernel', 'benchmarks/entries/d3-band-kernel.ts', 1.2),
  budgeted(
    'D3 point scale kernel',
    'benchmarks/entries/d3-point-kernel.ts',
    1.25,
  ),
  budgeted(
    'D3 ordinal scale kernel',
    'benchmarks/entries/d3-ordinal-kernel.ts',
    0.75,
  ),
  budgeted(
    'D3 UTC scale kernel',
    'benchmarks/entries/d3-time-scale-kernel.ts',
    10.3,
  ),
  measured('D3 log scale kernel', 'benchmarks/entries/d3-log-kernel.ts'),
  measured(
    'D3 scale family kernel',
    'benchmarks/entries/d3-scale-family-kernel.ts',
  ),
  budgeted(
    'TanStack compact linear scale kernel',
    'benchmarks/entries/charts-scale-linear-kernel.ts',
    1.5,
    {
      inputBoundary: {
        require: ['compactLinear'],
        forbid: [
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'compactOrdinal',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'TanStack compact band scale kernel',
    'benchmarks/entries/charts-scale-band-kernel.ts',
    1,
    {
      inputBoundary: {
        require: ['compactBandEntry', 'compactBandKernel'],
        forbid: [
          'compactLinear',
          'compactPointEntry',
          'compactOrdinal',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'TanStack compact point scale kernel',
    'benchmarks/entries/charts-scale-point-kernel.ts',
    1,
    {
      inputBoundary: {
        require: ['compactPointEntry', 'compactBandKernel'],
        forbid: [
          'compactLinear',
          'compactBandEntry',
          'compactOrdinal',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'TanStack compact ordinal scale kernel',
    'benchmarks/entries/charts-scale-ordinal-kernel.ts',
    0.75,
    {
      inputBoundary: {
        require: ['compactOrdinal'],
        forbid: [
          'compactLinear',
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'TanStack compact scale family kernel',
    'benchmarks/entries/charts-scale-family-kernel.ts',
    2.5,
    {
      inputBoundary: {
        require: [
          'compactLinear',
          'compactBandEntry',
          'compactPointEntry',
          'compactBandKernel',
          'compactOrdinal',
        ],
        forbid: ['d3Runtime'],
      },
    },
  ),
  budgeted('D3 curve kernel', 'benchmarks/entries/d3-curve-kernel.ts', 2.25),
  budgeted(
    'D3 transform kernel',
    'benchmarks/entries/d3-transform-kernel.ts',
    2.65,
  ),
  budgeted(
    'D3 quadtree kernel',
    'benchmarks/entries/d3-quadtree-kernel.ts',
    2.1,
  ),
  budgeted(
    'D3 Delaunay kernel',
    'benchmarks/entries/d3-delaunay-kernel.ts',
    7.3,
  ),
  measured(
    'Anchor-only pointer resolver baseline',
    'benchmarks/entries/charts-pointer-anchor-kernel.ts',
  ),
  budgeted(
    'Geometry pointer resolver kernel',
    'benchmarks/entries/charts-pointer-geometry-kernel.ts',
    1,
  ),
  budgeted(
    'D3 brush controller kernel',
    'benchmarks/entries/d3-brush-kernel.ts',
    16.5,
  ),
  budgeted(
    'D3 zoom controller kernel',
    'benchmarks/entries/d3-zoom-kernel.ts',
    16.5,
  ),
  measured(
    'TanStack easing helper',
    'benchmarks/entries/native-ease-kernel.ts',
  ),
  measured('D3 easing kernel', 'benchmarks/entries/d3-ease-kernel.ts'),
  measured(
    'D3 interpolation kernel',
    'benchmarks/entries/d3-interpolate-kernel.ts',
  ),
  measured('D3 polygon kernel', 'benchmarks/entries/d3-polygon-kernel.ts'),
  measured('D3 polar kernel', 'benchmarks/entries/d3-polar-kernel.ts'),
  measured('D3 hierarchy kernel', 'benchmarks/entries/d3-hierarchy-kernel.ts'),
  measured('D3 force kernel', 'benchmarks/entries/d3-force-kernel.ts'),
  measured('D3 contour kernel', 'benchmarks/entries/d3-contour-kernel.ts'),
  measured('D3 geo kernel', 'benchmarks/entries/d3-geo-kernel.ts'),
  budgeted(
    'React Stats parity surface',
    'benchmarks/entries/charts-react-stats-parity.tsx',
    41.5,
    { external: ['react', 'react/jsx-runtime', 'react-dom'] },
  ),
  measured('Plot renderer integration', 'benchmarks/entries/plot-renderer.ts'),
  measured('Stateful Plot renderer', 'benchmarks/entries/stateful-plot.ts'),
  measured('React host', 'benchmarks/entries/react-host.ts'),
  measured('React + Plot adapter', 'benchmarks/entries/react-observable.ts'),
  measured('Plot minimal line', 'benchmarks/entries/minimal-line.ts'),
  measured(
    'Plot representative marks',
    'benchmarks/entries/representative-chart.ts',
  ),
  measured('Escaped Plot namespace', 'benchmarks/entries/full-namespace.ts'),
]

await mkdir(outputDirectory, { recursive: true })

const rows = []
for (const {
  label,
  entry,
  external,
  alias,
  policy,
  rendererBoundary,
  inputBoundary,
  platform,
  conditions,
} of entries) {
  const outfile = resolve(
    outputDirectory,
    `${basename(entry, '.ts').replaceAll(/[^a-z0-9-]/gi, '-')}.js`,
  )
  const result = await build({
    entryPoints: [resolve(root, entry)],
    outfile,
    bundle: true,
    minify: true,
    treeShaking: true,
    platform: platform ?? 'browser',
    format: 'esm',
    target: 'es2022',
    legalComments: 'none',
    logLevel: 'silent',
    external,
    alias,
    conditions,
    metafile: true,
  })
  const retainedInputs = collectRetainedInputs(result.metafile)
  assertRendererBoundary(label, retainedInputs, rendererBoundary)
  assertRetainedInputBoundary(label, retainedInputs, inputBoundary, rows)
  const contents = await readFile(outfile)
  rows.push({
    label,
    bytes: contents.byteLength,
    gzip: gzipSync(contents).byteLength,
    policy,
    retainedInputs,
  })
}

for (const [label, directory] of [
  ['React proof application', 'examples/react/dist/assets'],
  ['Octane proof application', 'examples/octane/dist/assets'],
  ['Dynamic sandbox application', 'examples/sandbox/dist/assets'],
  ['React TanStack proof application', 'examples/charts-react/dist/assets'],
  ['Octane TanStack proof application', 'examples/charts-octane/dist/assets'],
]) {
  const absoluteDirectory = resolve(root, directory)
  try {
    const files = (await readdir(absoluteDirectory)).filter((file) =>
      file.endsWith('.js'),
    )
    const contents = await Promise.all(
      files.map((file) => readFile(resolve(absoluteDirectory, file))),
    )
    rows.push({
      label,
      bytes: contents.reduce((total, content) => total + content.byteLength, 0),
      gzip: contents.reduce(
        (total, content) => total + gzipSync(content).byteLength,
        0,
      ),
    })
  } catch {
    // Example builds are optional when measuring package-level entries.
  }
}

console.log('| Bundle | Minified | Gzip |')
console.log('| --- | ---: | ---: |')
for (const row of rows) {
  console.log(
    `| ${row.label} | ${formatBytes(row.bytes)} | ${formatBytes(row.gzip)} |`,
  )
}

if (args.has('--check')) {
  const failures = [
    ...checkBudgets(rows),
    ...(await checkUniversalBaseline(rows)),
  ]
  if (failures.length) {
    console.error(`\nBundle size policy failed:\n${failures.join('\n')}`)
    process.exitCode = 1
  } else {
    console.log('\nBundle size policy passed.')
  }
}

if (args.has('--update-baseline')) {
  await writeUniversalBaseline(rows)
  console.log(
    `\nUpdated ${baselinePath.slice(root.length + 1)} after measuring ${lockedRows(rows).length} universal bundles.`,
  )
}

function measured(label, entry, options = {}) {
  return createEntry(label, entry, { kind: 'measure' }, options)
}

function granularTransformBoundary(
  required,
  { allowD3Array = false, allowD3Shape = false } = {},
) {
  return {
    require: [required],
    forbid: [
      ...granularTransformInputGroups.filter((group) => group !== required),
      ...(allowD3Array ? [] : ['d3Array']),
      'd3ScaleRuntime',
      ...(allowD3Shape ? [] : ['d3Shape']),
    ],
  }
}

function transformSuiteBoundary() {
  const required = granularTransformInputGroups.filter(
    (group) => group !== 'transformBinTime' && group !== 'transformReduce',
  )
  return {
    require: required,
    forbid: ['transformBinTime', 'transformReduce', 'd3ScaleRuntime'],
  }
}

function locked(label, entry, options = {}) {
  return createEntry(label, entry, { kind: 'locked' }, options)
}

function lockedBudgeted(label, entry, maxGzipKib, options = {}) {
  return createEntry(
    label,
    entry,
    { kind: 'locked', maxGzipBytes: maxGzipKib * 1024 },
    options,
  )
}

function budgeted(label, entry, maxGzipKib, options = {}) {
  return createEntry(
    label,
    entry,
    { kind: 'budget', maxGzipBytes: maxGzipKib * 1024 },
    options,
  )
}

function incrementalBudgeted(
  label,
  entry,
  relativeTo,
  maxGzipKib,
  options = {},
) {
  return createEntry(
    label,
    entry,
    {
      kind: 'budget',
      maxGzipBytes: maxGzipKib * 1024,
      relativeTo,
    },
    options,
  )
}

function createEntry(label, entry, policy, options) {
  return {
    label,
    entry,
    policy,
    external: options.external,
    alias: options.alias,
    rendererBoundary: options.rendererBoundary,
    inputBoundary: options.inputBoundary,
    platform: options.platform,
    conditions: options.conditions,
  }
}

function assertRendererBoundary(label, inputs, boundary) {
  if (!boundary) return
  const paths = inputs.map((input) => input.replaceAll('\\', '/'))
  const canvas = matchingModules(paths, rendererBoundaryModules.canvas)
  const svg = matchingModules(paths, rendererBoundaryModules.svg)
  const native = matchingModules(paths, rendererBoundaryModules.native)
  const browser = matchingModules(paths, rendererBoundaryModules.browser)
  const reactDom = paths.filter((input) => input.includes('/react-dom/'))
  const failures = []

  if (boundary === 'neutral') {
    if (canvas.length) failures.push(`included Canvas: ${canvas.join(', ')}`)
    if (svg.length) failures.push(`included SVG: ${svg.join(', ')}`)
  } else if (boundary === 'canvas') {
    if (!canvas.length) failures.push('did not include the Canvas renderer')
    if (svg.length) failures.push(`included SVG: ${svg.join(', ')}`)
  } else if (boundary === 'svg') {
    if (!svg.length) failures.push('did not include the SVG renderer')
    if (canvas.length) failures.push(`included Canvas: ${canvas.join(', ')}`)
  } else if (boundary === 'native') {
    if (!native.length) failures.push('did not include the native SVG host')
    if (browser.length) {
      failures.push(`included browser modules: ${browser.join(', ')}`)
    }
    if (reactDom.length) {
      failures.push(`included react-dom: ${reactDom.join(', ')}`)
    }
  } else {
    failures.push(`uses unknown renderer boundary ${boundary}`)
  }

  if (failures.length) {
    throw new Error(`${label} renderer boundary failed: ${failures.join('; ')}`)
  }
}

function matchingModules(inputs, suffixes) {
  return inputs.filter((input) =>
    suffixes.some((suffix) => input.endsWith(suffix)),
  )
}

function collectRetainedInputs(metafile) {
  const retained = new Set()
  for (const output of Object.values(metafile.outputs)) {
    for (const [input, contribution] of Object.entries(output.inputs)) {
      if (contribution.bytesInOutput > 0) {
        retained.add(input.replaceAll('\\', '/'))
      }
    }
  }
  return [...retained].sort()
}

function assertRetainedInputBoundary(label, inputs, boundary, measuredRows) {
  if (!boundary) return
  const failures = []

  for (const group of boundary.require ?? []) {
    if (!matchingRetainedInputs(inputs, group).length) {
      failures.push(`did not retain ${group}`)
    }
  }
  for (const group of boundary.forbid ?? []) {
    const matches = matchingRetainedInputs(inputs, group)
    if (matches.length) {
      failures.push(`retained forbidden ${group}: ${matches.join(', ')}`)
    }
  }

  if (boundary.addedFrom) {
    const reference = measuredRows.find(
      (row) => row.label === boundary.addedFrom,
    )
    if (!reference) {
      failures.push(
        `references unmeasured input boundary ${boundary.addedFrom}`,
      )
    } else {
      const previousInputs = new Set(reference.retainedInputs)
      const addedInputs = inputs.filter(
        (input) =>
          !previousInputs.has(input) &&
          !/(?:^|\/)benchmarks\/entries\//u.test(input),
      )
      const unexpected = addedInputs.filter(
        (input) =>
          !(boundary.allowAdded ?? []).some(
            (group) => matchingRetainedInputs([input], group).length,
          ),
      )
      if (unexpected.length) {
        failures.push(
          `added inputs outside ${boundary.allowAdded?.join(', ') || 'the empty allowlist'}: ${unexpected.join(', ')}`,
        )
      }
    }
  }

  if (failures.length) {
    throw new Error(
      `${label} retained-input boundary failed: ${failures.join('; ')}`,
    )
  }
}

function matchingRetainedInputs(inputs, group) {
  const patterns = retainedInputGroups[group]
  if (!patterns) {
    throw new Error(`Unknown retained-input group ${group}`)
  }
  return inputs.filter((input) =>
    patterns.some((pattern) => pattern.test(input)),
  )
}

function checkBudgets(measuredRows) {
  const rowsByLabel = new Map(measuredRows.map((row) => [row.label, row]))
  return measuredRows.flatMap((row) => {
    if (row.policy?.maxGzipBytes === undefined) {
      return []
    }
    const reference = row.policy.relativeTo
      ? rowsByLabel.get(row.policy.relativeTo)
      : undefined
    if (row.policy.relativeTo && !reference) {
      return [
        `${row.label}: missing incremental bundle reference ${row.policy.relativeTo}`,
      ]
    }
    const measuredGzip = row.gzip - (reference?.gzip ?? 0)
    if (measuredGzip <= row.policy.maxGzipBytes) return []
    const description = reference
      ? `increment over ${reference.label}`
      : row.policy.kind === 'locked'
        ? 'locked product'
        : 'isolated'
    return [
      `${row.label}: ${formatBytes(measuredGzip)} exceeds its ${description} ${formatBytes(row.policy.maxGzipBytes)} gzip budget`,
    ]
  })
}

async function checkUniversalBaseline(measuredRows) {
  let baseline
  try {
    baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
  } catch {
    return [
      `Missing ${baselinePath.slice(root.length + 1)}. Run pnpm bundle:update-baseline after reviewing the locked entries.`,
    ]
  }

  if (baseline.schemaVersion !== 1 || typeof baseline.bundles !== 'object') {
    return [`${baselinePath.slice(root.length + 1)} has an unsupported schema.`]
  }

  const failures = []
  const current = new Map(
    lockedRows(measuredRows).map((row) => [row.label, row]),
  )
  const expected = new Map(Object.entries(baseline.bundles))

  for (const label of expected.keys()) {
    if (!current.has(label)) {
      failures.push(`${label}: locked baseline entry is no longer measured`)
    }
  }
  for (const [label, row] of current) {
    const expectedRow = expected.get(label)
    if (!expectedRow) {
      failures.push(
        `${label}: missing locked baseline; run pnpm bundle:update-baseline after review`,
      )
      continue
    }
    for (const metric of ['bytes', 'gzip']) {
      if (row[metric] === expectedRow[metric]) continue
      const delta = row[metric] - expectedRow[metric]
      failures.push(
        `${label} ${metric}: ${formatSignedBytes(delta)} from the locked ${formatBytes(expectedRow[metric])} baseline`,
      )
    }
  }

  return failures
}

async function writeUniversalBaseline(measuredRows) {
  const bundles = Object.fromEntries(
    lockedRows(measuredRows).map((row) => [
      row.label,
      {
        bytes: row.bytes,
        gzip: row.gzip,
      },
    ]),
  )
  await mkdir(dirname(baselinePath), { recursive: true })
  await writeFile(
    baselinePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        policy:
          'Exact minified and gzip output for entries that optional features must not affect. Review every change before updating.',
        bundles,
      },
      null,
      2,
    )}\n`,
  )
}

function lockedRows(measuredRows) {
  return measuredRows.filter((row) => row.policy?.kind === 'locked')
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

function formatSignedBytes(bytes) {
  const sign = bytes > 0 ? '+' : ''
  return `${sign}${bytes} B`
}
