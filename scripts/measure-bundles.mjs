import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { basename, dirname, resolve } from 'node:path'
import { build } from 'esbuild'
import { readBundleConcurrency } from './measure-bundles-options.mjs'
import { runWithConcurrency } from './run-with-concurrency.mjs'

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
    'packages/charts-core/src/svg-focus-guide-layer.ts',
    'packages/charts-core/src/svg-focus-guide-serializer.ts',
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
    'packages/charts-core/src/svg-focus-guide-layer.ts',
    'packages/charts-core/src/svg-focus-guide-serializer.ts',
    'packages/charts-core/src/svg-resources.ts',
    'packages/charts-core/src/svg-surface.ts',
    'packages/react-charts/src/CanvasChart.tsx',
    'packages/react-charts/src/Chart.tsx',
    'packages/react-charts/src/RendererChart.tsx',
  ],
}
const retainedInputGroups = {
  crosshairRuntime: [
    /(?:^|\/)packages\/charts-core\/src\/crosshair(?:-resolver)?\.ts$/u,
  ],
  cursorRuntime: [/(?:^|\/)packages\/charts-core\/src\/cursor\.ts$/u],
  focusPresentationRuntime: [
    /(?:^|\/)packages\/charts-core\/src\/focus-layer\.ts$/u,
  ],
  platformRendererRuntime: [
    /(?:^|\/)packages\/charts-core\/src\/(?:adapter(?:-renderer)?|canvas|dom(?:-text)?|export|reconcile|renderer|svg(?:-focus-guide-(?:layer|serializer)|-renderer|-resources|-surface)?)\.ts$/u,
    /(?:^|\/)packages\/(?:react-charts|react-native-charts)\/src\//u,
  ],
  compactLinear: [/(?:^|\/)packages\/charts-scales\/src\/linear\.ts$/u],
  compactBandEntry: [/(?:^|\/)packages\/charts-scales\/src\/band\.ts$/u],
  compactPointEntry: [/(?:^|\/)packages\/charts-scales\/src\/point\.ts$/u],
  compactBandKernel: [
    /(?:^|\/)packages\/charts-scales\/src\/band-kernel\.ts$/u,
  ],
  compactOrdinal: [/(?:^|\/)packages\/charts-scales\/src\/ordinal\.ts$/u],
  coreTooltipRuntime: [
    /(?:^|\/)packages\/charts-core\/src\/tooltip\.ts$/u,
    /(?:^|\/)packages\/charts-core\/src\/tooltip-(?:model|placement)\.ts$/u,
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
  motionRuntime: [/(?:^|\/)packages\/charts-core\/src\/motion\.ts$/u],
  sceneMotionContract: [
    /(?:^|\/)packages\/charts-core\/src\/scene-motion-internal\.ts$/u,
  ],
  motionDefinition: [
    /(?:^|\/)packages\/charts-core\/src\/motion-definition\.ts$/u,
  ],
  springRuntime: [/(?:^|\/)packages\/charts-core\/src\/spring\.ts$/u],
  focusGuide: [/(?:^|\/)packages\/charts-core\/src\/focus-guide\.ts$/u],
  focusMark: [/(?:^|\/)packages\/charts-core\/src\/focus-mark\.ts$/u],
  guideNodes: [
    /(?:^|\/)packages\/charts-core\/src\/guide-nodes-internal\.ts$/u,
  ],
  interactionSignal: [
    /(?:^|\/)packages\/charts-core\/src\/interaction-signal\.ts$/u,
  ],
  interactionBrush: [
    /(?:^|\/)packages\/charts-core\/src\/interaction-brush\.ts$/u,
  ],
  interactionCursor: [
    /(?:^|\/)packages\/charts-core\/src\/interaction-cursor\.ts$/u,
  ],
  interactionHandle: [
    /(?:^|\/)packages\/charts-core\/src\/interaction-handle\.ts$/u,
  ],
  interactionZoom: [
    /(?:^|\/)packages\/charts-core\/src\/interaction-zoom\.ts$/u,
  ],
  interactionAxis: [
    /(?:^|\/)packages\/charts-core\/src\/interaction-axis-internal\.ts$/u,
  ],
  interactionRange: [
    /(?:^|\/)packages\/charts-core\/src\/interaction-range-internal\.ts$/u,
  ],
  interactiveLegend: [
    /(?:^|\/)packages\/charts-core\/src\/interactive-legend\.ts$/u,
  ],
  keyedSelection: [/(?:^|\/)packages\/charts-core\/src\/selection\.ts$/u],
  decorativeMarkPublic: [
    /(?:^|\/)packages\/charts-core\/src\/mark-decorative\.ts$/u,
  ],
  decorativeMarkLifecycle: [
    /(?:^|\/)packages\/charts-core\/src\/mark-decorative-internal\.ts$/u,
  ],
  markSceneFilter: [
    /(?:^|\/)packages\/charts-core\/src\/mark-scene-filter-internal\.ts$/u,
  ],
  categoricalLegendLayout: [
    /(?:^|\/)packages\/charts-core\/src\/legend-layout-internal\.ts$/u,
  ],
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
    /(?:^|\/)packages\/charts-core\/src\/transform-rolling-window\.ts$/u,
  ],
  transformCumulative: [
    /(?:^|\/)packages\/charts-core\/src\/transform-cumulative\.ts$/u,
  ],
  transformFold: [/(?:^|\/)packages\/charts-core\/src\/transform-fold\.ts$/u],
  transformMosaic: [
    /(?:^|\/)packages\/charts-core\/src\/transform-mosaic\.ts$/u,
  ],
  transformRank: [/(?:^|\/)packages\/charts-core\/src\/transform-rank\.ts$/u],
  transformNormalize: [
    /(?:^|\/)packages\/charts-core\/src\/transform-normalize\.ts$/u,
  ],
  transformSelect: [
    /(?:^|\/)packages\/charts-core\/src\/transform-select\.ts$/u,
  ],
  transformStack: [/(?:^|\/)packages\/charts-core\/src\/transform-stack\.ts$/u],
  transformWaterfall: [
    /(?:^|\/)packages\/charts-core\/src\/transform-waterfall\.ts$/u,
  ],
  transformReduce: [
    /(?:^|\/)packages\/charts-core\/src\/transform-reduce\.ts$/u,
  ],
  transformInternal: [
    /(?:^|\/)packages\/charts-core\/src\/transform-internal\.ts$/u,
  ],
  proportionalInterval: [
    /(?:^|\/)packages\/charts-core\/src\/proportional-interval-internal\.ts$/u,
  ],
  spatialHexbin: [/(?:^|\/)packages\/charts-core\/src\/spatial-hexbin\.ts$/u],
  spatialDensity: [/(?:^|\/)packages\/charts-core\/src\/spatial-density\.ts$/u],
  spatialContour: [
    /(?:^|\/)packages\/charts-core\/src\/spatial-contour(?:-internal)?\.ts$/u,
  ],
  spatialGrouping: [
    /(?:^|\/)packages\/charts-core\/src\/spatial-group-internal\.ts$/u,
  ],
  spatialDelaunay: [
    /(?:^|\/)packages\/charts-core\/src\/spatial-delaunay(?:-internal)?\.ts$/u,
  ],
  spatialVoronoi: [
    /(?:^|\/)packages\/charts-core\/src\/spatial-voronoi(?:-internal)?\.ts$/u,
  ],
  resolvedLayoutChild: [
    /(?:^|\/)packages\/charts-core\/src\/resolved-layout-child\.ts$/u,
  ],
  compositeMarkPublic: [
    /(?:^|\/)packages\/charts-core\/src\/mark-composite\.ts$/u,
  ],
  compositeMarkKernel: [
    /(?:^|\/)packages\/charts-core\/src\/mark-composite-internal\.ts$/u,
  ],
  scenePointOwnership: [
    /(?:^|\/)packages\/charts-core\/src\/scene-point-ownership-internal\.ts$/u,
  ],
  boxMark: [/(?:^|\/)packages\/charts-core\/src\/box\.ts$/u],
  regressionMark: [/(?:^|\/)packages\/charts-core\/src\/regression\.ts$/u],
  differenceMark: [/(?:^|\/)packages\/charts-core\/src\/difference\.ts$/u],
  viewComposition: [
    /(?:^|\/)packages\/charts-core\/src\/view(?:-layout)?\.ts$/u,
  ],
  sceneEmbed: [
    /(?:^|\/)packages\/charts-core\/src\/scene-embed-internal\.ts$/u,
  ],
  sceneNamespace: [
    /(?:^|\/)packages\/charts-core\/src\/scene-child-id-internal\.ts$/u,
  ],
  facetMark: [/(?:^|\/)packages\/charts-core\/src\/facet\.ts$/u],
  areaYMark: [/(?:^|\/)packages\/charts-core\/src\/area\.ts$/u],
  areaXMark: [/(?:^|\/)packages\/charts-core\/src\/area-x\.ts$/u],
  stackInternal: [/(?:^|\/)packages\/charts-core\/src\/stack-internal\.ts$/u],
  transformStatistics: [
    /(?:^|\/)packages\/charts-core\/src\/transform-statistics-internal\.ts$/u,
  ],
  waffleMark: [/(?:^|\/)packages\/charts-core\/src\/waffle\.ts$/u],
  ridgelineMark: [/(?:^|\/)packages\/charts-core\/src\/ridgeline\.ts$/u],
  violinMark: [/(?:^|\/)packages\/charts-core\/src\/violin\.ts$/u],
  mappedSpacing: [
    /(?:^|\/)packages\/charts-core\/src\/mapped-spacing-internal\.ts$/u,
  ],
  resolvedLayoutProjection: [
    /(?:^|\/)packages\/charts-core\/src\/resolved-layout-position\.ts$/u,
  ],
  dodgeLayout: [
    /(?:^|\/)packages\/charts-core\/src\/dodge(?:-internal)?\.ts$/u,
  ],
  networkForce: [
    /(?:^|\/)packages\/charts-core\/src\/network-force(?:-internal)?\.ts$/u,
  ],
  networkGraph: [
    /(?:^|\/)packages\/charts-core\/src\/network-graph-internal\.ts$/u,
  ],
  networkSankey: [/(?:^|\/)packages\/charts-core\/src\/network-sankey\.ts$/u],
  compositeMotion: [
    /(?:^|\/)packages\/charts-core\/src\/composite-motion-internal\.ts$/u,
  ],
  hierarchyFlat: [
    /(?:^|\/)packages\/charts-core\/src\/hierarchy-flat-internal\.ts$/u,
  ],
  hierarchyTree: [/(?:^|\/)packages\/charts-core\/src\/hierarchy-tree\.ts$/u],
  hierarchyTreemap: [
    /(?:^|\/)packages\/charts-core\/src\/hierarchy-treemap\.ts$/u,
  ],
  hierarchySunburst: [
    /(?:^|\/)packages\/charts-core\/src\/hierarchy-sunburst\.ts$/u,
  ],
  polarMarks: [/(?:^|\/)packages\/charts-core\/src\/polar\.ts$/u],
  polarMarkInfrastructure: [
    /(?:^|\/)packages\/charts-core\/src\/polar-mark-internal\.ts$/u,
  ],
  polarSector: [
    /(?:^|\/)packages\/charts-core\/src\/polar-sector-internal\.ts$/u,
  ],
  polarPie: [/(?:^|\/)packages\/charts-core\/src\/polar-pie\.ts$/u],
  markInfrastructure: [
    /(?:^|\/)packages\/charts-core\/src\/(?:guide-layout|mark|mark-with-scale-values|materialized-channel-internal|scales)\.ts$/u,
  ],
  rectMark: [/(?:^|\/)packages\/charts-core\/src\/rect\.ts$/u],
  nativeTooltip: [
    /(?:^|\/)packages\/charts-core\/src\/tooltip-(?:model|placement)\.ts$/u,
    /(?:^|\/)packages\/react-native-charts\/src\/Tooltip\.tsx$/u,
    /(?:^|\/)packages\/react-native-charts\/src\/tooltip-entry\.ts$/u,
  ],
  d3Array: [/(?:^|\/)node_modules\/d3-array\//u],
  d3Shape: [/(?:^|\/)node_modules\/d3-shape\//u],
  d3Path: [/(?:^|\/)node_modules\/d3-path\//u],
  d3Hexbin: [/(?:^|\/)node_modules\/d3-hexbin\//u],
  d3Contour: [/(?:^|\/)node_modules\/d3-contour\//u],
  d3Geo: [/(?:^|\/)node_modules\/d3-geo\//u],
  d3Delaunay: [
    /(?:^|\/)node_modules\/(?:d3-delaunay|delaunator|robust-predicates)\//u,
  ],
  d3Force: [/(?:^|\/)node_modules\/d3-force\//u],
  d3Sankey: [/(?:^|\/)node_modules\/d3-sankey\//u],
  d3Hierarchy: [/(?:^|\/)node_modules\/d3-hierarchy\//u],
  d3Brush: [/(?:^|\/)node_modules\/d3-brush\//u],
  d3Zoom: [/(?:^|\/)node_modules\/d3-zoom\//u],
  d3Selection: [/(?:^|\/)node_modules\/d3-selection\//u],
  d3BrushRuntime: [
    /(?:^|\/)node_modules\/(?:d3-brush|d3-color|d3-dispatch|d3-drag|d3-ease|d3-interpolate|d3-selection|d3-timer|d3-transition)\//u,
  ],
  d3ZoomRuntime: [
    /(?:^|\/)node_modules\/(?:d3-color|d3-dispatch|d3-drag|d3-ease|d3-interpolate|d3-selection|d3-timer|d3-transition|d3-zoom)\//u,
  ],
  d3ScaleRuntime: [
    /(?:^|\/)node_modules\/d3-scale\//u,
    /(?:^|\/)node_modules\/d3-format\//u,
    /(?:^|\/)node_modules\/d3-interpolate\//u,
    /(?:^|\/)node_modules\/d3-color\//u,
    /(?:^|\/)node_modules\/internmap\//u,
  ],
  d3GeometryRuntime: [
    /(?:^|\/)node_modules\/(?:d3-contour|d3-delaunay|d3-geo|d3-hexbin|d3-shape|delaunator|robust-predicates)\//u,
  ],
  d3Runtime: [/(?:^|\/)node_modules\/(?:d3-[^/]+|internmap)\//u],
}
const granularTransformInputGroups = [
  'transformBin',
  'transformBinXY',
  'transformBinTime',
  'transformGroup',
  'transformWindow',
  'transformCumulative',
  'transformFold',
  'transformMosaic',
  'transformRank',
  'transformNormalize',
  'transformSelect',
  'transformStack',
  'transformWaterfall',
  'transformReduce',
]
const optionalHierarchyInputGroups = [
  'hierarchyFlat',
  'hierarchyTree',
  'hierarchyTreemap',
  'hierarchySunburst',
  'd3Hierarchy',
]
const optionalSankeyInputGroups = ['networkSankey', 'd3Sankey']
const optionalFocusInputGroups = ['focusGuide']
const optionalGuideNodeInputGroups = ['guideNodes']
const optionalInteractionInputGroups = [
  'interactionSignal',
  'interactiveLegend',
  'keyedSelection',
  'decorativeMarkPublic',
  'decorativeMarkLifecycle',
  'markSceneFilter',
]
const optionalInteractionAxisInputGroups = ['interactionAxis']
const optionalInteractionRangeInputGroups = ['interactionRange']
const optionalCursorInputGroups = ['interactionCursor']
const optionalHandleInputGroups = ['interactionHandle']
const optionalBrushInputGroups = ['interactionBrush', 'd3Brush', 'd3Selection']
const optionalZoomInputGroups = ['interactionZoom', 'd3Zoom']
const nativeExternals = [
  'react',
  'react/jsx-runtime',
  'react-native',
  'react-native/*',
  'react-native-svg',
  'react-native-svg/*',
]
const entries = [
  measured('Legacy Plot POC host core', 'benchmarks/entries/core.ts', {
    inputBoundary: { forbid: ['d3GeometryRuntime'] },
  }),
  budgeted(
    'Granular data transform suite',
    'benchmarks/entries/charts-transform-suite.ts',
    8.7,
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
    'benchmarks/entries/charts-transform-rolling-window.ts',
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
    'Transform: fold',
    'benchmarks/entries/charts-transform-fold.ts',
    0.5,
    { inputBoundary: granularTransformBoundary('transformFold') },
  ),
  budgeted(
    'Transform: mosaic',
    'benchmarks/entries/charts-transform-mosaic.ts',
    2.1,
    {
      inputBoundary: {
        ...granularTransformBoundary('transformMosaic'),
        require: [
          'transformMosaic',
          'transformInternal',
          'proportionalInterval',
        ],
      },
    },
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
    2.65,
    {
      inputBoundary: granularTransformBoundary('transformStack', {
        allowD3Shape: true,
      }),
    },
  ),
  budgeted(
    'Transform: waterfall',
    'benchmarks/entries/charts-transform-waterfall.ts',
    1.1,
    { inputBoundary: granularTransformBoundary('transformWaterfall') },
  ),
  budgeted(
    'Transform: advanced reducers',
    'benchmarks/entries/charts-transform-reduce.ts',
    0.55,
    { inputBoundary: granularTransformBoundary('transformReduce') },
  ),
  measured('D3 force kernel', 'benchmarks/entries/d3-force-kernel.ts'),
  incrementalBudgeted(
    'Network force layout',
    'benchmarks/entries/charts-network-force.ts',
    'D3 force kernel',
    2.5,
    {
      inputBoundary: {
        require: ['networkForce', 'networkGraph', 'd3Force'],
        addedFrom: 'D3 force kernel',
        allowAdded: ['networkForce', 'networkGraph', 'transformInternal'],
      },
    },
  ),
  measured('D3 Sankey kernel', 'benchmarks/entries/d3-sankey-kernel.ts', {
    inputBoundary: { require: ['d3Sankey'] },
  }),
  incrementalBudgeted(
    'Network Sankey mark',
    'benchmarks/entries/charts-network-sankey.ts',
    'D3 Sankey kernel',
    6.24,
    {
      inputBoundary: {
        require: [
          'networkSankey',
          'networkGraph',
          'resolvedLayoutChild',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
          'd3Sankey',
        ],
        addedFrom: 'D3 Sankey kernel',
        allowAdded: [
          'networkSankey',
          'networkGraph',
          'resolvedLayoutChild',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
          'markInfrastructure',
          'rectMark',
          'transformInternal',
        ],
      },
    },
  ),
  measured(
    'D3 hierarchy tree kernel',
    'benchmarks/entries/d3-hierarchy-tree-kernel.ts',
  ),
  incrementalBudgeted(
    'Hierarchy tree layout',
    'benchmarks/entries/charts-hierarchy-tree.ts',
    'D3 hierarchy tree kernel',
    2.5,
    {
      inputBoundary: {
        require: ['hierarchyFlat', 'hierarchyTree', 'd3Hierarchy'],
        addedFrom: 'D3 hierarchy tree kernel',
        allowAdded: ['hierarchyFlat', 'hierarchyTree', 'transformInternal'],
      },
    },
  ),
  measured(
    'D3 hierarchy treemap kernel',
    'benchmarks/entries/d3-hierarchy-treemap-kernel.ts',
    {
      inputBoundary: { require: ['d3Hierarchy'] },
    },
  ),
  incrementalBudgeted(
    'Hierarchy treemap mark',
    'benchmarks/entries/charts-hierarchy-treemap.ts',
    'D3 hierarchy treemap kernel',
    3.74,
    {
      inputBoundary: {
        require: ['hierarchyFlat', 'hierarchyTreemap', 'd3Hierarchy'],
        forbid: ['hierarchyTree'],
        addedFrom: 'D3 hierarchy treemap kernel',
        allowAdded: [
          'hierarchyFlat',
          'hierarchyTreemap',
          'markInfrastructure',
          'transformInternal',
        ],
      },
    },
  ),
  measured(
    'D3 hierarchy partition kernel',
    'benchmarks/entries/d3-hierarchy-partition-kernel.ts',
    {
      inputBoundary: { require: ['d3Hierarchy'] },
    },
  ),
  incrementalBudgeted(
    'Hierarchy sunburst mark',
    'benchmarks/entries/charts-hierarchy-sunburst.ts',
    'D3 hierarchy partition kernel',
    5.45,
    {
      inputBoundary: {
        require: [
          'hierarchyFlat',
          'hierarchySunburst',
          'sceneMotionContract',
          'polarMarkInfrastructure',
          'polarSector',
          'd3Hierarchy',
          'd3Shape',
        ],
        forbid: ['hierarchyTree', 'hierarchyTreemap', 'polarPie'],
        addedFrom: 'D3 hierarchy partition kernel',
        allowAdded: [
          'hierarchyFlat',
          'hierarchySunburst',
          'sceneMotionContract',
          'polarMarkInfrastructure',
          'polarSector',
          'markInfrastructure',
          'transformInternal',
          'd3Shape',
          'd3Path',
        ],
      },
    },
  ),
  locked('D3-scale line scene', 'benchmarks/entries/charts-core.ts', {
    inputBoundary: {
      forbid: [
        'transformRuntime',
        'tooltipRuntime',
        'd3GeometryRuntime',
        'networkForce',
        'd3Force',
        ...optionalHierarchyInputGroups,
        'spatialContour',
        'spatialGrouping',
        'spatialVoronoi',
        'scenePointOwnership',
      ],
    },
  }),
  locked('D3-scale line + static SVG', 'benchmarks/entries/charts-svg.ts', {
    rendererBoundary: 'svg',
    inputBoundary: {
      forbid: [
        'd3GeometryRuntime',
        'networkForce',
        'd3Force',
        ...optionalHierarchyInputGroups,
        'spatialContour',
        'spatialGrouping',
        'spatialVoronoi',
        'scenePointOwnership',
      ],
    },
  }),
  incrementalBudgeted(
    'Decorative line + static SVG',
    'benchmarks/entries/charts-decorative-line-svg.ts',
    'D3-scale line + static SVG',
    0.5,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
        ],
        forbid: [
          'interactionSignal',
          'interactiveLegend',
          'keyedSelection',
          'categoricalLegendLayout',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'D3-scale line + static SVG',
        allowAdded: [
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
        ],
      },
    },
  ),
  budgeted(
    'D3-scale lineX + static SVG',
    'benchmarks/entries/charts-line-x-svg.ts',
    20.24,
  ),
  budgeted(
    'D3-scale UTC line + static SVG',
    'benchmarks/entries/charts-time-svg.ts',
    24.9,
  ),
  budgeted(
    'D3-scale histogram + static SVG',
    'benchmarks/entries/charts-histogram-svg.ts',
    22.78,
  ),
  budgeted(
    'D3-scale facets + static SVG',
    'benchmarks/entries/charts-facet-svg.ts',
    23.94,
  ),
  budgeted(
    'D3-scale arrows + static SVG',
    'benchmarks/entries/charts-arrow-svg.ts',
    20.2,
  ),
  budgeted(
    'D3-scale areaX + static SVG',
    'benchmarks/entries/charts-area-x-svg.ts',
    24.23,
  ),
  budgeted(
    'D3-scale dots + static SVG',
    'benchmarks/entries/charts-dot-svg.ts',
    20.67,
    {
      inputBoundary: {
        forbid: [
          'dodgeLayout',
          'networkForce',
          'd3Force',
          ...optionalHierarchyInputGroups,
          'spatialDensity',
          'spatialContour',
          'spatialGrouping',
          'd3Contour',
          'spatialDelaunay',
          'spatialVoronoi',
          'd3Delaunay',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Focus guide + static SVG',
    'benchmarks/entries/charts-focus-guide.ts',
    'D3-scale dots + static SVG',
    2,
    {
      inputBoundary: {
        require: ['focusGuide', 'focusMark', 'guideNodes'],
        forbid: [
          'motionRuntime',
          'springRuntime',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'D3-scale dots + static SVG',
        allowAdded: ['focusGuide', 'focusMark', 'guideNodes'],
      },
    },
  ),
  incrementalBudgeted(
    'Tick-label accessors + static SVG',
    'benchmarks/entries/charts-tick-label-accessors.ts',
    'D3-scale line + static SVG',
    0.75,
    {
      inputBoundary: {
        forbid: [
          'focusGuide',
          'focusMark',
          'motionRuntime',
          'springRuntime',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'D3-scale line + static SVG',
        allowAdded: [],
      },
    },
  ),
  budgeted(
    'Frame + static SVG',
    'benchmarks/entries/charts-frame-svg.ts',
    11.63,
  ),
  incrementalBudgeted(
    'Spatial density contours + static SVG',
    'benchmarks/entries/charts-spatial-density-svg.ts',
    'D3-scale dots + static SVG',
    3,
    {
      inputBoundary: {
        require: [
          'spatialDensity',
          'spatialContour',
          'spatialGrouping',
          'd3Contour',
          'resolvedLayoutProjection',
        ],
        addedFrom: 'D3-scale dots + static SVG',
        allowAdded: [
          'spatialDensity',
          'spatialContour',
          'spatialGrouping',
          'd3Contour',
          'd3Array',
          'resolvedLayoutProjection',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Spatial scalar contours + static SVG',
    'benchmarks/entries/charts-spatial-contour-svg.ts',
    'Frame + static SVG',
    3,
    {
      inputBoundary: {
        require: ['spatialContour', 'd3Contour'],
        forbid: ['spatialDensity', 'spatialGrouping', 'd3Geo'],
        addedFrom: 'Frame + static SVG',
        allowAdded: ['spatialContour', 'd3Contour', 'd3Array'],
      },
    },
  ),
  incrementalBudgeted(
    'Spatial Voronoi cells + static SVG',
    'benchmarks/entries/charts-spatial-voronoi-svg.ts',
    'D3-scale dots + static SVG',
    9,
    {
      inputBoundary: {
        require: [
          'spatialVoronoi',
          'spatialGrouping',
          'd3Delaunay',
          'resolvedLayoutProjection',
        ],
        forbid: ['resolvedLayoutChild'],
        addedFrom: 'D3-scale dots + static SVG',
        allowAdded: [
          'spatialVoronoi',
          'spatialGrouping',
          'spatialDelaunay',
          'd3Delaunay',
          'resolvedLayoutProjection',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Dodge dots + static SVG',
    'benchmarks/entries/charts-dodge-svg.ts',
    'D3-scale dots + static SVG',
    2,
    {
      inputBoundary: {
        require: ['dodgeLayout'],
        forbid: ['d3Force'],
        addedFrom: 'D3-scale dots + static SVG',
        allowAdded: ['dodgeLayout'],
      },
    },
  ),
  incrementalBudgeted(
    'Waffle + static SVG',
    'benchmarks/entries/charts-waffle-svg.ts',
    'Frame + static SVG',
    2,
    {
      inputBoundary: {
        require: ['waffleMark'],
        forbid: ['d3GeometryRuntime'],
      },
    },
  ),
  incrementalBudgeted(
    'Ridgeline + static SVG',
    'benchmarks/entries/charts-ridgeline-svg.ts',
    'D3-scale line + static SVG',
    0.75,
    {
      inputBoundary: {
        require: ['ridgelineMark', 'mappedSpacing', 'transformInternal'],
        forbid: [
          'compositeMarkPublic',
          'compositeMarkKernel',
          'resolvedLayoutChild',
          'transformBin',
          'transformNormalize',
          'd3GeometryRuntime',
        ],
        addedFrom: 'D3-scale line + static SVG',
        allowAdded: ['ridgelineMark', 'mappedSpacing', 'transformInternal'],
      },
    },
  ),
  incrementalBudgeted(
    'Violin + static SVG',
    'benchmarks/entries/charts-violin-svg.ts',
    'D3-scale line + static SVG',
    0.75,
    {
      inputBoundary: {
        require: ['violinMark', 'mappedSpacing', 'transformInternal'],
        forbid: [
          'ridgelineMark',
          'areaXMark',
          'compositeMarkPublic',
          'compositeMarkKernel',
          'resolvedLayoutChild',
          ...granularTransformInputGroups,
          'd3GeometryRuntime',
        ],
        addedFrom: 'D3-scale line + static SVG',
        allowAdded: ['violinMark', 'mappedSpacing', 'transformInternal'],
      },
    },
  ),
  budgeted(
    'Composite mark + static SVG',
    'benchmarks/entries/charts-composite-mark.ts',
    27.71,
    {
      inputBoundary: {
        require: [
          'compositeMarkPublic',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
        ],
        forbid: ['boxMark', 'transformStatistics'],
      },
    },
  ),
  incrementalBudgeted(
    'Box mark + static SVG',
    'benchmarks/entries/charts-box-svg.ts',
    'Composite mark + static SVG',
    1.1,
    {
      inputBoundary: {
        require: [
          'boxMark',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
          'transformStatistics',
          'transformInternal',
        ],
        forbid: ['compositeMarkPublic'],
        addedFrom: 'Composite mark + static SVG',
        allowAdded: ['boxMark', 'transformStatistics', 'transformInternal'],
      },
    },
  ),
  incrementalBudgeted(
    'Linear regression + static SVG',
    'benchmarks/entries/charts-regression-svg.ts',
    'D3-scale line + static SVG',
    6.54,
    {
      inputBoundary: {
        require: [
          'regressionMark',
          'areaYMark',
          'stackInternal',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
          'd3Shape',
        ],
        forbid: ['compositeMarkPublic', 'boxMark', 'transformStatistics'],
        addedFrom: 'D3-scale line + static SVG',
        allowAdded: [
          'regressionMark',
          'areaYMark',
          'stackInternal',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
          'transformInternal',
          'd3Shape',
          'd3Path',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Difference mark + static SVG',
    'benchmarks/entries/charts-difference-svg.ts',
    'D3-scale line + static SVG',
    6.98,
    {
      inputBoundary: {
        require: [
          'differenceMark',
          'areaYMark',
          'areaXMark',
          'stackInternal',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
          'resolvedLayoutChild',
          'd3Shape',
        ],
        forbid: [
          'compositeMarkPublic',
          'boxMark',
          'regressionMark',
          'transformStatistics',
        ],
        addedFrom: 'D3-scale line + static SVG',
        allowAdded: [
          'differenceMark',
          'areaYMark',
          'areaXMark',
          'stackInternal',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'scenePointOwnership',
          'resolvedLayoutChild',
          'transformInternal',
          'd3Shape',
          'd3Path',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Coordinated views + static SVG',
    'benchmarks/entries/charts-view-composition.ts',
    'D3-scale dots + static SVG',
    5.4,
    {
      inputBoundary: {
        require: [
          'viewComposition',
          'sceneEmbed',
          'sceneNamespace',
          'compositeMotion',
        ],
        forbid: [
          'facetMark',
          'compositeMarkPublic',
          'compositeMarkKernel',
          'resolvedLayoutChild',
          'd3GeometryRuntime',
        ],
        addedFrom: 'D3-scale dots + static SVG',
        allowAdded: [
          'viewComposition',
          'sceneEmbed',
          'sceneNamespace',
          'compositeMotion',
        ],
      },
    },
  ),
  budgeted(
    'Custom mark scale-value factory',
    'benchmarks/entries/charts-mark-scale-values.ts',
    0.39,
  ),
  measured(
    'Crosshair mark extension',
    'benchmarks/entries/charts-crosshair-kernel.ts',
    {
      rendererBoundary: 'neutral',
      inputBoundary: {
        require: ['crosshairRuntime'],
        forbid: [
          'cursorRuntime',
          'focusPresentationRuntime',
          'platformRendererRuntime',
          'tooltipRuntime',
          'tooltipPortal',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'D3-scale hexagons + static SVG',
    'benchmarks/entries/charts-hexagon-svg.ts',
    20.12,
    { inputBoundary: { forbid: ['d3Hexbin'] } },
  ),
  incrementalBudgeted(
    'Spatial hexbin + static SVG',
    'benchmarks/entries/charts-spatial-hexbin-svg.ts',
    'D3-scale hexagons + static SVG',
    2,
    {
      inputBoundary: {
        require: [
          'spatialHexbin',
          'd3Hexbin',
          'resolvedLayoutProjection',
          'resolvedLayoutChild',
        ],
        addedFrom: 'D3-scale hexagons + static SVG',
        allowAdded: [
          'spatialHexbin',
          'd3Hexbin',
          'transformRuntime',
          'resolvedLayoutProjection',
          'resolvedLayoutChild',
        ],
      },
    },
  ),
  budgeted(
    'D3-scale link + static SVG',
    'benchmarks/entries/charts-link-svg.ts',
    20.1,
    {
      inputBoundary: {
        forbid: [
          'spatialGrouping',
          'spatialDelaunay',
          'spatialVoronoi',
          'd3Delaunay',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Spatial Delaunay links + static SVG',
    'benchmarks/entries/charts-spatial-delaunay-svg.ts',
    'D3-scale link + static SVG',
    8.25,
    {
      inputBoundary: {
        require: [
          'spatialDelaunay',
          'spatialGrouping',
          'd3Delaunay',
          'resolvedLayoutProjection',
          'resolvedLayoutChild',
        ],
        addedFrom: 'D3-scale link + static SVG',
        allowAdded: [
          'spatialDelaunay',
          'spatialGrouping',
          'd3Delaunay',
          'resolvedLayoutProjection',
          'resolvedLayoutChild',
        ],
      },
    },
  ),
  budgeted(
    'D3-scale ticks + static SVG',
    'benchmarks/entries/charts-tick-svg.ts',
    21.13,
  ),
  budgeted(
    'D3-scale vectors + static SVG',
    'benchmarks/entries/charts-vector-svg.ts',
    20.31,
  ),
  budgeted(
    'D3 geo shape + static SVG',
    'benchmarks/entries/charts-geo-svg.ts',
    17.58,
  ),
  budgeted(
    'Polar arc + static SVG',
    'benchmarks/entries/charts-polar-arc-svg.ts',
    16.56,
    { inputBoundary: { forbid: ['polarPie'] } },
  ),
  incrementalBudgeted(
    'Polar pie allocation + static SVG',
    'benchmarks/entries/charts-polar-pie-svg.ts',
    'Polar arc + static SVG',
    1.1,
    {
      inputBoundary: {
        require: ['polarPie', 'proportionalInterval'],
        addedFrom: 'Polar arc + static SVG',
        allowAdded: ['polarPie', 'proportionalInterval', 'transformInternal'],
      },
    },
  ),
  budgeted(
    'Polar gauge composition + static SVG',
    'benchmarks/entries/charts-polar-gauge-svg.ts',
    25.69,
  ),
  budgeted(
    'Radial labels + static SVG',
    'benchmarks/entries/charts-radial-label-svg.ts',
    22.2,
    { inputBoundary: { forbid: ['polarPie'] } },
  ),
  budgeted(
    'Polar radial bars + static SVG',
    'benchmarks/entries/charts-radial-bar-svg.ts',
    25.7,
    {
      inputBoundary: {
        require: ['polarMarks', 'd3ScaleRuntime', 'd3Shape'],
        forbid: ['polarPie', 'hierarchySunburst', 'd3Hierarchy'],
      },
    },
  ),
  budgeted(
    'Polar line + scatter composition + static SVG',
    'benchmarks/entries/charts-polar-line-scatter-svg.ts',
    26.8,
  ),
  locked(
    'Representative marks',
    'benchmarks/entries/charts-representative.ts',
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        forbid: [
          'dodgeLayout',
          'networkForce',
          'd3Force',
          ...optionalHierarchyInputGroups,
          'spatialDensity',
          'spatialContour',
          'spatialGrouping',
          'd3Contour',
          'spatialDelaunay',
          'spatialVoronoi',
          'd3Delaunay',
        ],
      },
    },
  ),
  budgeted(
    'Representative marks + mark Canvas renderer',
    'benchmarks/entries/charts-representative-mark-canvas.ts',
    35.8,
    {
      rendererBoundary: 'mixed',
      inputBoundary: {
        forbid: [
          'dodgeLayout',
          'networkForce',
          'd3Force',
          ...optionalHierarchyInputGroups,
          'spatialDensity',
          'spatialContour',
          'spatialGrouping',
          'd3Contour',
          'spatialDelaunay',
          'spatialVoronoi',
          'd3Delaunay',
        ],
      },
    },
  ),
  measured(
    'Renderer-neutral DOM host',
    'benchmarks/entries/charts-renderer.ts',
    {
      rendererBoundary: 'neutral',
      inputBoundary: {
        forbid: ['tooltipRuntime', 'tooltipPortal', 'spatialVoronoi'],
      },
    },
  ),
  measured('Canvas DOM host', 'benchmarks/entries/charts-canvas.ts', {
    rendererBoundary: 'canvas',
    inputBoundary: { forbid: ['spatialVoronoi'] },
  }),
  locked('TanStack DOM host', 'benchmarks/entries/charts-dom.ts', {
    rendererBoundary: 'svg',
    inputBoundary: {
      forbid: [
        'tooltipRuntime',
        'tooltipPortal',
        'd3GeometryRuntime',
        'spatialVoronoi',
      ],
    },
  }),
  budgeted(
    'Controlled interaction signal',
    'benchmarks/entries/charts-interaction-signal.ts',
    0.25,
    {
      inputBoundary: {
        require: ['interactionSignal'],
        forbid: [
          'interactiveLegend',
          'keyedSelection',
          'markSceneFilter',
          'categoricalLegendLayout',
        ],
      },
    },
  ),
  budgeted(
    'Controlled keyed selection',
    'benchmarks/entries/charts-keyed-selection.ts',
    0.5,
    {
      rendererBoundary: 'neutral',
      inputBoundary: {
        require: ['interactionSignal', 'keyedSelection'],
        forbid: [
          'interactiveLegend',
          'markSceneFilter',
          'categoricalLegendLayout',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Selected overlay + static SVG',
    'benchmarks/entries/charts-selected-overlay-svg.ts',
    'D3-scale dots + static SVG',
    1.6,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'keyedSelection',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'scenePointOwnership',
        ],
        forbid: [
          'interactiveLegend',
          'categoricalLegendLayout',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'D3-scale dots + static SVG',
        allowAdded: [
          'interactionSignal',
          'keyedSelection',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'scenePointOwnership',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Interactive legend + DOM host',
    'benchmarks/entries/charts-interactive-legend.ts',
    'TanStack DOM host',
    2.6,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactiveLegend',
          'markSceneFilter',
          'scenePointOwnership',
          'categoricalLegendLayout',
        ],
        forbid: [
          'keyedSelection',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'TanStack DOM host',
        allowAdded: [
          'interactionSignal',
          'interactiveLegend',
          'markSceneFilter',
          'scenePointOwnership',
          'categoricalLegendLayout',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Continuous cursor + DOM host',
    'benchmarks/entries/charts-continuous-cursor.ts',
    'TanStack DOM host',
    5,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionCursor',
          'interactionAxis',
          'guideNodes',
        ],
        forbid: [
          'interactionBrush',
          'd3Brush',
          'd3Selection',
          'focusGuide',
          'focusMark',
          'interactiveLegend',
          'keyedSelection',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'TanStack DOM host',
        allowAdded: [
          'interactionSignal',
          'interactionCursor',
          'interactionAxis',
          'guideNodes',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Horizontal handle + DOM host',
    'benchmarks/entries/charts-scale-handle.ts',
    'TanStack DOM host',
    5,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionHandle',
          'interactionAxis',
          'interactionRange',
        ],
        forbid: [
          'interactionBrush',
          'interactionCursor',
          'interactionZoom',
          'd3Brush',
          'd3Zoom',
          'd3Selection',
          'focusGuide',
          'focusMark',
          'guideNodes',
          'interactiveLegend',
          'keyedSelection',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'TanStack DOM host',
        allowAdded: [
          'interactionSignal',
          'interactionHandle',
          'interactionAxis',
          'interactionRange',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Horizontal brush + DOM host',
    'benchmarks/entries/charts-brush-x.ts',
    'TanStack DOM host',
    20,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionBrush',
          'interactionAxis',
          'interactionRange',
          'd3Brush',
          'd3Selection',
        ],
        forbid: [
          'interactiveLegend',
          'keyedSelection',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'TanStack DOM host',
        allowAdded: [
          'interactionSignal',
          'interactionBrush',
          'interactionAxis',
          'interactionRange',
          'd3BrushRuntime',
        ],
      },
    },
  ),
  incrementalBudgeted(
    'Horizontal zoom + DOM host',
    'benchmarks/entries/charts-zoom-x.ts',
    'TanStack DOM host',
    20.35,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionZoom',
          'interactionAxis',
          'interactionRange',
          'd3Zoom',
          'd3Selection',
        ],
        forbid: [
          'interactionBrush',
          'interactionCursor',
          'd3Brush',
          'interactiveLegend',
          'keyedSelection',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltipRuntime',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
        addedFrom: 'TanStack DOM host',
        allowAdded: [
          'interactionSignal',
          'interactionZoom',
          'interactionAxis',
          'interactionRange',
          'd3ZoomRuntime',
        ],
      },
    },
  ),
  measured(
    'React renderer-neutral adapter',
    'benchmarks/entries/charts-react-core.ts',
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'neutral',
      inputBoundary: {
        forbid: ['tooltipRuntime', 'tooltipPortal', 'spatialVoronoi'],
      },
    },
  ),
  measured(
    'React Canvas adapter',
    'benchmarks/entries/charts-react-canvas.ts',
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'canvas',
      inputBoundary: { forbid: ['spatialVoronoi'] },
    },
  ),
  locked('React adapter', 'benchmarks/entries/charts-react.ts', {
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    rendererBoundary: 'svg',
    inputBoundary: {
      forbid: [
        'tooltipRuntime',
        'tooltipPortal',
        'd3GeometryRuntime',
        'spatialVoronoi',
      ],
    },
  }),
  locked('React line consumer', 'benchmarks/entries/charts-react-line.ts', {
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    rendererBoundary: 'svg',
    inputBoundary: { forbid: ['d3GeometryRuntime', 'spatialVoronoi'] },
  }),
  budgeted(
    'React line consumer + mark Canvas renderer',
    'benchmarks/entries/charts-react-line-mark-canvas.ts',
    41.8,
    {
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'mixed',
      inputBoundary: { forbid: ['d3GeometryRuntime', 'spatialVoronoi'] },
    },
  ),
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
          'spatialVoronoi',
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
      inputBoundary: { forbid: ['spatialVoronoi'] },
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
        forbid: [
          'tooltipRuntime',
          'tooltipPortal',
          'd3Runtime',
          'spatialVoronoi',
        ],
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
          'spatialVoronoi',
        ],
      },
      platform: 'neutral',
      conditions: ['react-native', 'import'],
    },
  ),
  lockedBudgeted(
    'Compact-scale line scene',
    'benchmarks/entries/charts-compact-linear-scene.ts',
    11.68,
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
    28.41,
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
          'motionRuntime',
          'springRuntime',
          'transformRuntime',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'Motion timing utilities',
    'benchmarks/entries/charts-motion-definition.ts',
    0.5,
    {
      inputBoundary: {
        require: ['motionDefinition'],
        forbid: [
          'motionRuntime',
          'springRuntime',
          'tooltipExtension',
          'tooltipPortal',
          'transformRuntime',
          'd3Runtime',
        ],
      },
    },
  ),
  budgeted(
    'Motion SVG renderer',
    'benchmarks/entries/charts-motion-svg-renderer.ts',
    20.91,
    {
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['motionRuntime', 'sceneMotionContract', 'springRuntime'],
        forbid: [
          'tooltipExtension',
          'tooltipPortal',
          'transformRuntime',
          'd3Array',
          'd3ScaleRuntime',
          'd3Shape',
          'd3Path',
          'polarSector',
          ...optionalHierarchyInputGroups,
        ],
      },
    },
  ),
  budgeted(
    'Spring physics kernel',
    'benchmarks/entries/charts-spring-kernel.ts',
    1.5,
    {
      inputBoundary: {
        require: ['springRuntime'],
        forbid: [
          'motionRuntime',
          'tooltipExtension',
          'tooltipPortal',
          'transformRuntime',
          'd3Array',
          'd3ScaleRuntime',
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
    52.72,
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
    20.9,
  ),
  budgeted(
    'D3 time-scale line scene',
    'benchmarks/entries/charts-d3-time-scene.ts',
    23.21,
  ),
  budgeted(
    'Direct D3 monotone + TanStack SVG',
    'benchmarks/entries/charts-d3-curve-svg.ts',
    22.61,
  ),
  budgeted(
    'Direct D3 transforms + TanStack histogram',
    'benchmarks/entries/charts-d3-transform-histogram.ts',
    21.5,
  ),
  budgeted(
    'Direct D3 time + TanStack UTC line',
    'benchmarks/entries/charts-d3-time-svg.ts',
    24.9,
  ),
  budgeted(
    'Direct D3 quadtree + TanStack DOM host',
    'benchmarks/entries/charts-d3-quadtree-dom.ts',
    36.79,
  ),
  budgeted(
    'Direct D3 Delaunay + TanStack DOM host',
    'benchmarks/entries/charts-d3-delaunay-dom.ts',
    42.01,
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
    2.25,
  ),
  measured(
    'Application cursor controller',
    'benchmarks/entries/charts-cursor-controller.ts',
    {
      rendererBoundary: 'neutral',
      inputBoundary: {
        require: ['cursorRuntime'],
        forbid: [
          'crosshairRuntime',
          'focusPresentationRuntime',
          'platformRendererRuntime',
          'tooltipRuntime',
          'tooltipPortal',
          'd3Runtime',
        ],
      },
    },
  ),
  measured(
    'Cursor host policy',
    'benchmarks/entries/charts-cursor-host-policy.ts',
    {
      rendererBoundary: 'neutral',
      inputBoundary: {
        require: ['cursorRuntime', 'focusPresentationRuntime'],
        forbid: [
          'crosshairRuntime',
          'platformRendererRuntime',
          'tooltipRuntime',
          'tooltipPortal',
          'd3Runtime',
        ],
      },
    },
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
  measured('D3 contour kernel', 'benchmarks/entries/d3-contour-kernel.ts'),
  measured('D3 geo kernel', 'benchmarks/entries/d3-geo-kernel.ts'),
  budgeted(
    'React Stats parity surface',
    'benchmarks/entries/charts-react-stats-parity.tsx',
    53.61,
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

const bundleConcurrency = readBundleConcurrency(
  process.env.BUNDLE_BUILD_CONCURRENCY,
  4,
)
const entryRows = new Array(entries.length)
await runWithConcurrency(
  entries,
  bundleConcurrency,
  async (
    {
      label,
      entry,
      external,
      alias,
      policy,
      rendererBoundary,
      inputBoundary,
      platform,
      conditions,
    },
    index,
  ) => {
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
      define: { 'process.env.NODE_ENV': '"production"' },
      legalComments: 'none',
      logLevel: 'silent',
      external,
      alias,
      conditions,
      metafile: true,
    })
    const retainedInputs = collectRetainedInputs(result.metafile)
    const contents = await readFile(outfile)
    entryRows[index] = {
      label,
      bytes: contents.byteLength,
      gzip: gzipSync(contents).byteLength,
      policy,
      retainedInputs,
      rendererBoundary,
      inputBoundary,
    }
  },
)

const rows = []
for (const row of entryRows) {
  assertRendererBoundary(row.label, row.retainedInputs, row.rendererBoundary)
  assertRetainedInputBoundary(
    row.label,
    row.retainedInputs,
    row.inputBoundary,
    rows,
  )
  rows.push(row)
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
    inputBoundary: optionalSubpathIsolatedBoundary(
      entry,
      options.inputBoundary,
    ),
    platform: options.platform,
    conditions: options.conditions,
  }
}

function optionalSubpathIsolatedBoundary(entry, boundary = {}) {
  if (!entry.startsWith('benchmarks/entries/charts-')) return boundary

  const hierarchyRequired = (boundary.require ?? []).some((group) =>
    optionalHierarchyInputGroups.includes(group),
  )
  const sankeyRequired = (boundary.require ?? []).some((group) =>
    optionalSankeyInputGroups.includes(group),
  )
  const focusRequired = (boundary.require ?? []).some((group) =>
    optionalFocusInputGroups.includes(group),
  )
  const guideNodesRequired = (boundary.require ?? []).some((group) =>
    optionalGuideNodeInputGroups.includes(group),
  )
  const interactionRequired = (boundary.require ?? []).some((group) =>
    optionalInteractionInputGroups.includes(group),
  )
  const interactionAxisRequired = (boundary.require ?? []).some((group) =>
    optionalInteractionAxisInputGroups.includes(group),
  )
  const interactionRangeRequired = (boundary.require ?? []).some((group) =>
    optionalInteractionRangeInputGroups.includes(group),
  )
  const cursorRequired = (boundary.require ?? []).some((group) =>
    optionalCursorInputGroups.includes(group),
  )
  const handleRequired = (boundary.require ?? []).some((group) =>
    optionalHandleInputGroups.includes(group),
  )
  const brushRequired = (boundary.require ?? []).some((group) =>
    optionalBrushInputGroups.includes(group),
  )
  const zoomRequired = (boundary.require ?? []).some((group) =>
    optionalZoomInputGroups.includes(group),
  )

  return {
    ...boundary,
    forbid: [
      ...new Set([
        ...(boundary.forbid ?? []),
        ...(hierarchyRequired ? [] : optionalHierarchyInputGroups),
        ...(sankeyRequired ? [] : optionalSankeyInputGroups),
        ...(focusRequired ? [] : optionalFocusInputGroups),
        ...(guideNodesRequired ? [] : optionalGuideNodeInputGroups),
        ...(interactionRequired ? [] : optionalInteractionInputGroups),
        ...(interactionAxisRequired ? [] : optionalInteractionAxisInputGroups),
        ...(interactionRangeRequired
          ? []
          : optionalInteractionRangeInputGroups),
        ...(cursorRequired ? [] : optionalCursorInputGroups),
        ...(handleRequired ? [] : optionalHandleInputGroups),
        ...(brushRequired ? [] : optionalBrushInputGroups),
        ...(zoomRequired ? [] : optionalZoomInputGroups),
      ]),
    ],
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
  } else if (boundary === 'mixed') {
    if (!canvas.length) failures.push('did not include the Canvas renderer')
    if (!svg.length) failures.push('did not include the SVG renderer')
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
