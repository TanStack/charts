import { readFile, readdir } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import ts from 'typescript'

export const callbackCategories = Object.freeze({
  callback: 'callback',
  comparator: 'comparator',
  pairedGeometry: 'paired-geometry',
  upstreamProtocol: 'upstream-protocol',
  serviceMethod: 'service-method',
})

const callbackInventory = {
  // Application callbacks: zero or one primary value, plus an optional object
  // named `context` or `options`.
  callback: [
    ['@tanstack/alpine-charts:src/index.ts:ChartOptions', 'renderTooltipBody'],
    [
      '@tanstack/charts:src/canvas.ts:CanvasChartRenderer',
      'mount.requestRender',
    ],
    [
      '@tanstack/charts:src/canvas.ts:UniversalCanvasChartRenderer',
      'mount.requestRender',
    ],
    ['@tanstack/charts:src/crosshair.ts:CrosshairLabelOptions', 'format'],
    [
      '@tanstack/charts:src/cursor-host-contract.ts:ChartCursorHostSession',
      'subscribe.listener',
    ],
    [
      '@tanstack/charts:src/area-x.ts:AreaXOptions',
      'color fill key stroke x x1 x2 y z',
    ],
    [
      '@tanstack/charts:src/area.ts:AreaYOptions',
      'color fill key stroke x y y1 y2 z',
    ],
    [
      '@tanstack/charts:src/arrow.ts:ArrowOptions',
      'color key stroke x1 x2 y1 y2 z',
    ],
    ['@tanstack/charts:src/band.ts:BandXOptions', 'color fill key x z'],
    ['@tanstack/charts:src/band.ts:BandYOptions', 'color fill key y z'],
    [
      '@tanstack/charts:src/bar.ts:BarXOptions',
      'color fill key stroke strokeDasharray x x1 x2 y z',
    ],
    [
      '@tanstack/charts:src/bar.ts:BarYOptions',
      'color fill key stroke strokeDasharray x y y1 y2 z',
    ],
    ['@tanstack/charts:src/box.ts:BoxOptions', 'key'],
    ['@tanstack/charts:src/box.ts:BoxXCallOptions', 'motion'],
    ['@tanstack/charts:src/box.ts:BoxXOptions', 'x y'],
    ['@tanstack/charts:src/box.ts:BoxYCallOptions', 'motion'],
    ['@tanstack/charts:src/box.ts:BoxYOptions', 'x y'],
    [
      '@tanstack/charts:src/difference.ts:DifferenceOptions',
      'comparisonStroke key negativeFill positiveFill stroke z',
    ],
    ['@tanstack/charts:src/difference.ts:DifferenceXOptions', 'x1 x2 y'],
    ['@tanstack/charts:src/difference.ts:DifferenceYOptions', 'x y1 y2'],
    ['@tanstack/charts:src/dodge.ts:CreateDotLayoutOptions', 'resolve'],
    [
      '@tanstack/charts:src/dom-types.ts:ChartHostCommonOptions',
      'measureText onFocusChange onFocusGroupChange onRender onSelect renderSvg',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartRendererHostCommonOptions',
      'measureText onFocusChange onFocusGroupChange onRender onSelect onTooltipBodyChange',
    ],
    ['@tanstack/charts:src/dom-types.ts:ChartRenderer', 'mount.requestRender'],
    [
      '@tanstack/charts:src/dom-types.ts:UniversalChartRenderer',
      'mount.requestRender',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartSurface',
      'subscribePresentationPoints.listener',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartTooltipExtensionContext',
      'bodyChange.$return',
    ],
    ['@tanstack/charts:src/dot-layout.ts:DotLayout', '__@resolveDotLayout'],
    ['@tanstack/charts:src/dot.ts:DotOptions', 'color key r x y z'],
    ['@tanstack/charts:src/facet.ts:FacetOptions', 'by chart label'],
    ['@tanstack/charts:src/facet.ts:FacetOptionsInput', 'chart motion'],
    [
      '@tanstack/charts:src/focus-disabled.ts:UniversalChartFocusStrategy',
      'group navigation resolve',
    ],
    ['@tanstack/charts:src/focus.ts:axisFocus', 'group navigation resolve'],
    [
      '@tanstack/charts:src/polar-focus-internal.ts:focusGroupAngle',
      'group navigation resolve',
    ],
    ['@tanstack/charts:src/geo.ts:GeoProjectionDescriptor', 'type'],
    ['@tanstack/charts:src/geo.ts:GeoProjectionInput', '$call'],
    [
      '@tanstack/charts:src/geo.ts:GeoShapeOptions',
      'anchor color fill key projection r stroke',
    ],
    [
      '@tanstack/charts:src/hexagon.ts:HexagonOptions',
      'color fill key r stroke x y z',
    ],
    [
      '@tanstack/charts:src/focus-guide.ts:FocusGuideLabelOptions',
      'background color format stroke',
    ],
    [
      '@tanstack/charts:src/focus-guide.ts:FocusGuideMarkerOptions',
      'fill fillOpacity radius stroke strokeOpacity strokeWidth',
    ],
    ['@tanstack/charts:src/focus-guide.ts:FocusGuideOptions', 'key z'],
    [
      '@tanstack/charts:src/focus-guide.ts:FocusGuideRuleOptions',
      'stroke strokeDasharray strokeOpacity strokeWidth',
    ],
    [
      '@tanstack/charts:src/hierarchy-sunburst.ts:SunburstParentOptions',
      'nodeId parentId',
    ],
    [
      '@tanstack/charts:src/hierarchy-sunburst.ts:SunburstPathOptions',
      'nodeId parentId path',
    ],
    [
      '@tanstack/charts:src/hierarchy-sunburst.ts:SunburstSharedOptions',
      'color fill innerRadius outerRadius stroke value z',
    ],
    [
      '@tanstack/charts:src/hierarchy-tree.ts:TreeLayoutParentOptions',
      'id parentId',
    ],
    [
      '@tanstack/charts:src/hierarchy-tree.ts:TreeLayoutPathOptions',
      'id parentId path',
    ],
    [
      '@tanstack/charts:src/hierarchy-treemap.ts:TreemapParentOptions',
      'nodeId parentId',
    ],
    [
      '@tanstack/charts:src/hierarchy-treemap.ts:TreemapPathOptions',
      'nodeId parentId path',
    ],
    [
      '@tanstack/charts:src/hierarchy-treemap.ts:TreemapSharedOptions',
      'color fill label labelFill stroke value',
    ],
    ['@tanstack/charts:src/interaction-brush.ts:BrushXBaseOptions', 'format'],
    [
      '@tanstack/charts:src/interaction-cursor.ts:ContinuousCursorLabelOptions',
      'format',
    ],
    ['@tanstack/charts:src/interaction-handle.ts:HandleXOptions', 'format'],
    [
      '@tanstack/charts:src/interaction-signal.ts:controlledSignal',
      '$call.onChange',
    ],
    ['@tanstack/charts:src/interaction-signal.ts:ControlledSignal', 'onChange'],
    [
      '@tanstack/charts:src/interaction-zoom.ts:ZoomXOptions',
      'format onActiveChange',
    ],
    [
      '@tanstack/charts:src/interactive-legend.ts:InteractiveColorLegendOptions',
      'format itemAriaLabel',
    ],
    [
      '@tanstack/charts:src/legend-static.ts:ColorGradientLegendOptions',
      'format',
    ],
    ['@tanstack/charts:src/legend-static.ts:ColorLegendOptions', 'format'],
    ['@tanstack/charts:src/line.ts:LineOptions', 'color key stroke z'],
    ['@tanstack/charts:src/line.ts:LineXOptions', 'x y'],
    ['@tanstack/charts:src/line.ts:LineYOptions', 'x y'],
    [
      '@tanstack/charts:src/link.ts:LinkOptions',
      'color key stroke strokeOpacity strokeWidth x1 x2 y1 y2 z',
    ],
    ['@tanstack/charts:src/network-force.ts:ForceCollideDescriptor', 'radius'],
    [
      '@tanstack/charts:src/network-force.ts:ForceLinkDescriptor',
      'distance strength',
    ],
    [
      '@tanstack/charts:src/network-force.ts:ForceManyBodyDescriptor',
      'strength',
    ],
    ['@tanstack/charts:src/network-force.ts:ForceXDescriptor', 'strength x'],
    ['@tanstack/charts:src/network-force.ts:ForceYDescriptor', 'strength y'],
    ['@tanstack/charts:src/network-force.ts:ForceFactory', '$call'],
    ['@tanstack/charts:src/network-force.ts:ForceFactoryDescriptor', 'create'],
    [
      '@tanstack/charts:src/network-sankey.ts:SankeyDiagramOptions',
      'inset linkKey marks nodePadding nodeWidth',
    ],
    ['@tanstack/charts:src/network-sankey.ts:SankeyLayoutValue', '$call'],
    ['@tanstack/charts:src/polar.ts:AngleGridOptions', 'format'],
    ['@tanstack/charts:src/polar.ts:PolarGuide', 'render'],
    ['@tanstack/charts:src/polar.ts:PolarGuideLabelOption', '$call'],
    [
      '@tanstack/charts:src/polar.ts:PolarGuideStyle',
      'labelAnchor labelBaseline labelDx labelDy labelRotate',
    ],
    ['@tanstack/charts:src/polar.ts:PolarLength', '$call'],
    ['@tanstack/charts:src/polar.ts:PolarMark', 'initialize motion'],
    ['@tanstack/charts:src/polar.ts:InitializedPolarMark', 'render'],
    [
      '@tanstack/charts:src/polar-mark-internal.ts:InitializedPolarMark',
      'motion',
    ],
    ['@tanstack/charts:src/polar-pie.ts:PieOptions', 'value'],
    [
      '@tanstack/charts:src/polar.ts:RadialArcOptions',
      'color cornerRadius endAngle fill generator innerRadius key outerRadius padAngle padRadius startAngle stroke z',
    ],
    [
      '@tanstack/charts:src/polar.ts:RadialAreaOptions',
      'curve fill radius1 stroke',
    ],
    ['@tanstack/charts:src/polar.ts:RadialDotOptions', 'fill r'],
    ['@tanstack/charts:src/polar.ts:RadialGridOptions', 'format'],
    ['@tanstack/charts:src/polar.ts:RadialLineOptions', 'curve stroke'],
    [
      '@tanstack/charts:src/polar.ts:RadialBarAngleOptions',
      'angle angle1 angle2 radius',
    ],
    [
      '@tanstack/charts:src/polar.ts:RadialBarBaseOptions',
      'color cornerRadius fill key stroke z',
    ],
    [
      '@tanstack/charts:src/polar.ts:RadialBarRadiusOptions',
      'angle radius radius1 radius2',
    ],
    [
      '@tanstack/charts:src/polar.ts:RadialPathOptions',
      'angle color key radius z',
    ],
    [
      '@tanstack/charts:src/polar.ts:RadialRuleOptions',
      'angle color key radius1 radius1Offset radius2 radius2Offset stroke z',
    ],
    [
      '@tanstack/charts:src/polar.ts:RadialTextOptions',
      'anchor baseline dx dy fill radiusOffset rotate text',
    ],
    ['@tanstack/charts:src/regression.ts:LinearRegressionOptions', 'z'],
    [
      '@tanstack/charts:src/regression.ts:LinearRegressionXCallOptions',
      'motion',
    ],
    ['@tanstack/charts:src/regression.ts:LinearRegressionXOptions', 'x y'],
    [
      '@tanstack/charts:src/regression.ts:LinearRegressionYCallOptions',
      'motion',
    ],
    ['@tanstack/charts:src/regression.ts:LinearRegressionYOptions', 'x y'],
    ['@tanstack/charts:src/rect.ts:RectOptions', 'color key x x1 x2 y y1 y2 z'],
    [
      '@tanstack/charts:src/ridgeline.ts:RidgelineOptions',
      'color fill height key stroke',
    ],
    ['@tanstack/charts:src/ridgeline.ts:RidgelineXOptions', 'x y'],
    ['@tanstack/charts:src/ridgeline.ts:RidgelineYOptions', 'x y'],
    ['@tanstack/charts:src/rule.ts:RuleXOptions', 'color stroke x'],
    ['@tanstack/charts:src/rule.ts:RuleYOptions', 'color stroke y'],
    ['@tanstack/charts:src/selection.ts:KeyedSelection', 'key'],
    ['@tanstack/charts:src/selection.ts:KeyedSelectionOptions', 'key'],
    [
      '@tanstack/charts:src/spatial-contour.ts:ContourOptions',
      'color fill stroke value',
    ],
    [
      '@tanstack/charts:src/spatial-delaunay.ts:DelaunayLinkOptions',
      'key x y z',
    ],
    [
      '@tanstack/charts:src/spatial-density.ts:DensityContourOptions',
      'color fill stroke weight x y z',
    ],
    ['@tanstack/charts:src/spatial-hexbin.ts:HexbinOptions', 'x y'],
    [
      '@tanstack/charts:src/spatial-voronoi.ts:VoronoiOptions',
      'color fill key stroke x y z',
    ],
    [
      '@tanstack/charts:src/text.ts:TextOptions',
      'anchor color dx dy fill key rotate text x y z',
    ],
    ['@tanstack/charts:src/tick.ts:TickXOptions', 'color key stroke x y z'],
    ['@tanstack/charts:src/tick.ts:TickYOptions', 'color key stroke x y z'],
    ['@tanstack/charts:src/transform-bin-time.ts:BinTimeOptions', 'value'],
    ['@tanstack/charts:src/transform-bin-xy.ts:BinXYOptions', 'x y'],
    ['@tanstack/charts:src/transform-bin.ts:BinOptionsBase', 'value'],
    ['@tanstack/charts:src/transform-normalize.ts:NormalizeOptions', 'basis'],
    ['@tanstack/charts:src/transform-rank.ts:RankOptions', 'value'],
    ['@tanstack/charts:src/transform-reduce.ts:quantile', '$call.$return'],
    ['@tanstack/charts:src/transform-reduce.ts:TransformOutputSpec', 'reduce'],
    ['@tanstack/charts:src/transform-reduce.ts:TransformOutputSpec', 'value'],
    ['@tanstack/charts:src/transform-reduce.ts:TransformReducer', '$call'],
    ['@tanstack/charts:src/transform-select.ts:SelectOptions', 'select value'],
    ['@tanstack/charts:src/transform-waterfall.ts:WaterfallOptions', 'value'],
    ['@tanstack/charts:src/transform.ts:TransformAccessor', '$call'],
    ['@tanstack/charts:src/transform.ts:TransformOrderOptions', 'orderBy'],
    ['@tanstack/charts:src/types.ts:ChannelAccessor', '$call'],
    ['@tanstack/charts:src/types.ts:ChartAnimationOptions', 'easing'],
    ['@tanstack/charts:src/types.ts:ChartAxisLabelOptions', 'motion'],
    ['@tanstack/charts:src/types.ts:ChartAxisPresentationOptions', 'motion'],
    [
      '@tanstack/charts:src/types.ts:ChartAxisTickLabelOptions',
      'anchor dx dy fontSize fontWeight motion opacity',
    ],
    ['@tanstack/charts:src/types.ts:ChartAxisTickLabelValue', '$call'],
    ['@tanstack/charts:src/types.ts:ChartAxisTickOptions', 'format motion'],
    ['@tanstack/charts:src/types.ts:ChartControl', 'resolve'],
    [
      '@tanstack/charts:src/types.ts:ChartColorLegend',
      'control filterMark height render seriesVisible',
    ],
    ['@tanstack/charts:src/types.ts:ChartColorScale', 'resolve'],
    ['@tanstack/charts:src/types.ts:ChartCursorAxisOptions', 'valueAt'],
    [
      '@tanstack/charts:src/types.ts:ChartCursorController',
      'setState.next subscribe.listener',
    ],
    ['@tanstack/charts:src/types.ts:ChartCursorStateUpdater', '$call'],
    [
      '@tanstack/charts:src/types.ts:ChartDefinitionOptions',
      'motion spatialIndex',
    ],
    [
      '@tanstack/charts:src/types.ts:ChartFocusStrategy',
      'group navigation resolve',
    ],
    ['@tanstack/charts:src/types.ts:ChartLayoutOptions', 'measureText'],
    ['@tanstack/charts:src/types.ts:ChartMark', 'initialize motion'],
    ['@tanstack/charts:src/types.ts:ChartMarkMotionOptions', 'motion'],
    ['@tanstack/charts:src/types.ts:ChartMarkState', 'when'],
    [
      '@tanstack/charts:src/types.ts:ChartMarkStateStyle',
      'dx dy fill fillOpacity fontSize fontWeight inset opacity r radius rotate stroke strokeDasharray strokeOpacity strokeWidth',
    ],
    ['@tanstack/charts:src/types.ts:ChartMarkStateValue', '$call'],
    ['@tanstack/charts:src/types.ts:ChartMotionDefinition', '$call'],
    ['@tanstack/charts:src/types.ts:ChartMotionTiming', 'delay'],
    ['@tanstack/charts:src/types.ts:ChartMotionTweenTransition', 'easing'],
    ['@tanstack/charts:src/types.ts:ChartScale', 'resolve'],
    ['@tanstack/charts:src/types.ts:ChartScaleResolver', '$call'],
    [
      '@tanstack/charts:src/types.ts:SceneFocusGuide',
      'measureText motion projectX projectY resolve',
    ],
    ['@tanstack/charts:src/types.ts:SceneFocusGuideLabel', 'format'],
    ['@tanstack/charts:src/types.ts:SceneFocusGuideResolver', '$call'],
    ['@tanstack/charts:src/types.ts:ChartSpatialIndexFactory', '$call'],
    ['@tanstack/charts:src/types.ts:ChartSvgRenderer', '$call'],
    ['@tanstack/charts:src/types.ts:ChartTextMeasurer', '$call'],
    ['@tanstack/charts:src/types.ts:ChartTooltipAnchor', '$call'],
    ['@tanstack/charts:src/types.ts:ChartTooltipDerivedItem', 'text'],
    ['@tanstack/charts:src/types.ts:ChartTooltipItemBase', 'text'],
    [
      '@tanstack/charts:src/types.ts:ChartTooltipOptions',
      'anchor content format formatGroup',
    ],
    ['@tanstack/charts:src/types.ts:ResponsiveChartConfig', 'chart'],
    ['@tanstack/charts:src/types.ts:ResponsiveChartDefinition', 'chart'],
    ['@tanstack/charts:src/scene.ts:DefinedResponsiveChart', 'chart'],
    [
      '@tanstack/charts:src/view.ts:ComposableResponsiveChartDefinition',
      'chart',
    ],
    ['@tanstack/charts:src/types.ts:InitializedMark', 'render resolveLayout'],
    [
      '@tanstack/charts:src/types.ts:InitializedMarkBase',
      'layoutLabels motion postDomain',
    ],
    [
      '@tanstack/charts:src/types.ts:ResolvedLayoutMarkInitialization',
      'resolveLayout',
    ],
    [
      '@tanstack/charts:src/types.ts:ResolvedMarkLayout',
      'layoutLabels postDomain render',
    ],
    [
      '@tanstack/charts:src/mark-with-scale-values.ts:createMarkWithScaleValues',
      '$call.initialize $call.motion',
    ],
    [
      '@tanstack/charts:src/mark.ts:createMark',
      '$call.initialize $call.motion',
    ],
    ['@tanstack/charts:src/reconcile.ts:reconcileChartSvg', '$call.$return'],
    [
      '@tanstack/charts:src/reconcile.ts:reconcileChartSvgFragment',
      '$call.$return',
    ],
    ['@tanstack/charts:src/scene.ts:defineChart', '$call.chart chart'],
    [
      '@tanstack/charts:src/svg-surface.ts:createSvgChartRenderer',
      '$call.renderSvg',
    ],
    [
      '@tanstack/charts:src/types.ts:StoredChartDefinitionOptions',
      'motion spatialIndex',
    ],
    [
      '@tanstack/charts:src/violin.ts:ViolinOptions',
      'color fill key stroke width',
    ],
    ['@tanstack/charts:src/violin.ts:ViolinXOptions', 'x y'],
    ['@tanstack/charts:src/violin.ts:ViolinYOptions', 'x y'],
    [
      '@tanstack/charts:src/vector.ts:VectorOptions',
      'color key length rotate stroke x y z',
    ],
    ['@tanstack/charts:src/waffle.ts:WaffleOptions', 'color fill key stroke z'],
    ['@tanstack/charts:src/waffle.ts:WaffleXOptions', 'x'],
    ['@tanstack/charts:src/waffle.ts:WaffleYOptions', 'y'],
    [
      '@tanstack/lit-charts:src/types.ts:ChartPresentationProps',
      'renderTooltipBody',
    ],
    [
      '@tanstack/octane-charts:src/renderer-types.ts:RendererChartCommonProps',
      'measureText onFocusChange onFocusGroupChange onRender onSelect renderTooltipBody',
    ],
    [
      '@tanstack/octane-charts:src/types.ts:ChartCommonProps',
      'measureText onFocusChange onFocusGroupChange onRender onSelect renderSvg renderTooltipBody',
    ],
    [
      '@tanstack/preact-charts:src/types.ts:ChartTooltipBodyRenderProps',
      'renderTooltipBody',
    ],
    [
      '@tanstack/react-charts:src/Chart.tsx:ChartCommonProps',
      'measureText onFocusChange onFocusGroupChange onRender onSelect renderSvg',
    ],
    [
      '@tanstack/react-charts:src/RendererChart.tsx:RendererChartCommonProps',
      'measureText onFocusChange onFocusGroupChange onRender onSelect',
    ],
    [
      '@tanstack/react-charts:src/tooltip.tsx:ChartTooltipBodyRenderProps',
      'renderTooltipBody',
    ],
    [
      '@tanstack/react-native-charts:src/Chart.tsx:ChartProps',
      'measureText onFocusChange onFocusGroupChange onRender onSelect renderTooltip resolvePaint',
    ],
    ['@tanstack/react-native-charts:src/paint.ts:NativePaintResolver', '$call'],
    [
      '@tanstack/react-native-charts:src/Tooltip.tsx:NativeChartTooltipProps',
      'render resolvePaint',
    ],
    [
      '@tanstack/solid-charts:src/types.ts:ChartTooltipBodyRenderProps',
      'renderTooltipBody',
    ],
    ['@tanstack/svelte-charts:src/types.ts:ChartCommonProps', 'tooltipBody'],
    ['@tanstack/svelte-charts:src/types.ts:ChartProps', 'tooltipBody'],
    ['@tanstack/vue-charts:src/Chart.ts:ChartComponent', 'tooltipBody'],
  ],
  // Standard comparators inherently receive the two values being compared.
  comparator: [
    [
      '@tanstack/charts:src/hierarchy-sunburst.ts:SunburstNodeComparator',
      '$call',
    ],
    [
      '@tanstack/charts:src/hierarchy-sunburst.ts:SunburstSharedOptions',
      'sort',
    ],
    [
      '@tanstack/charts:src/hierarchy-tree.ts:TreeLayoutSharedOptions',
      'separation sort',
    ],
    ['@tanstack/charts:src/hierarchy-tree.ts:TreeNodeComparator', '$call'],
    ['@tanstack/charts:src/hierarchy-tree.ts:TreeNodeSeparation', '$call'],
    [
      '@tanstack/charts:src/hierarchy-treemap.ts:TreemapNodeComparator',
      '$call',
    ],
    ['@tanstack/charts:src/hierarchy-treemap.ts:TreemapSharedOptions', 'sort'],
    [
      '@tanstack/charts:src/network-sankey.ts:SankeyDiagramOptions',
      'linkSort nodeSort',
    ],
    ['@tanstack/charts:src/network-sankey.ts:SankeyLinkComparator', '$call'],
    ['@tanstack/charts:src/network-sankey.ts:SankeyNodeComparator', '$call'],
    ['@tanstack/charts:src/types.ts:ChartTooltipOptions', 'sort'],
    ['@tanstack/charts:src/types.ts:ChartTooltipSort', '$call'],
    [
      '@tanstack/charts:src/tooltip-model.ts:orderChartTooltipPoints',
      '$call.sort',
    ],
  ],
  // Curve protocols inherently receive paired geometry collections.
  pairedGeometry: [
    ['@tanstack/charts:src/area-x.ts:AreaXCurve', 'areaX'],
    ['@tanstack/charts:src/types.ts:ChartCurve', 'area line'],
  ],
  // Exact D3-compatible protocols retain their upstream positional shape.
  upstreamProtocol: [
    [
      '@tanstack/alpine-charts:src/index.ts:AlpineDirectiveUtilities',
      'cleanup cleanup.callback effect effect.callback evaluateLater evaluateLater.$return evaluateLater.receiver',
    ],
    [
      '@tanstack/alpine-charts:src/index.ts:AlpineLike',
      'directive directive.callback',
    ],
    [
      '@tanstack/charts-scales:src/band-kernel.ts:BandScale',
      '$call align align.$return bandwidth copy copy.$return domain domain.$return padding padding.$return paddingInner paddingInner.$return paddingOuter paddingOuter.$return range range.$return rangeRound rangeRound.$return round round.$return step',
    ],
    [
      '@tanstack/charts-scales:src/band-kernel.ts:PointScale',
      '$call align align.$return bandwidth copy copy.$return domain domain.$return padding padding.$return range range.$return rangeRound rangeRound.$return round round.$return step',
    ],
    [
      '@tanstack/charts-scales:src/linear.ts:LinearScale',
      '$call clamp clamp.$return copy copy.$return domain domain.$return invert nice nice.$return range range.$return tickFormat tickFormat.$return ticks',
    ],
    [
      '@tanstack/charts-scales:src/ordinal.ts:OrdinalScale',
      '$call copy copy.$return domain domain.$return range range.$return unknown unknown.$return',
    ],
    ['@tanstack/charts-scales:src/band.ts:scaleBand', '$call.$return'],
    ['@tanstack/charts-scales:src/linear.ts:scaleLinear', '$call.$return'],
    ['@tanstack/charts-scales:src/ordinal.ts:scaleOrdinal', '$call.$return'],
    ['@tanstack/charts-scales:src/point.ts:scalePoint', '$call.$return'],
    ['@tanstack/charts:src/d3-area-x.ts:d3AreaXCurve', '$call.curve'],
    ['@tanstack/charts:src/d3-shape.ts:d3Curve', '$call.curve'],
    ['@tanstack/charts:src/geo.ts:GeoProjectionDescriptor', 'type.$return'],
    ['@tanstack/charts:src/geo.ts:GeoProjectionInput', '$call.$return'],
    [
      '@tanstack/charts:src/hierarchy-treemap.ts:TreemapSharedOptions',
      'method',
    ],
    ['@tanstack/charts:src/hierarchy-treemap.ts:TreemapTile', '$call'],
    ['@tanstack/charts:src/network-force.ts:ForceFactory', '$call.$return'],
    ['@tanstack/charts:src/network-sankey.ts:SankeyDiagramOptions', 'align'],
    ['@tanstack/charts:src/network-sankey.ts:SankeyNodeAligner', '$call'],
    [
      '@tanstack/charts:src/transform-bin-time.ts:TimeIntervalLike',
      'floor offset range',
    ],
    ['@tanstack/charts:src/transform-bin.ts:BinOptionsBase', 'thresholds'],
    ['@tanstack/charts:src/dot.ts:DotOptions', 'rScale'],
    ['@tanstack/charts:src/geo.ts:GeoShapeOptions', 'rScale'],
    ['@tanstack/charts:src/group.ts:GroupLayout', 'scale'],
    ['@tanstack/charts:src/group.ts:GroupOptions', 'scale'],
    ['@tanstack/charts:src/hexagon.ts:HexagonOptions', 'rScale'],
    ['@tanstack/charts:src/polar.ts:RadialDotOptions', 'rScale'],
    ['@tanstack/charts:src/polar.ts:RadialArcOptions', 'generator.$return'],
    ['@tanstack/charts:src/types.ts:ChartAxisOptions', 'scale'],
    ['@tanstack/charts:src/types.ts:ChartColorOptions', 'scale'],
    ['@tanstack/charts:src/types.ts:ChartNumericScale', '$call'],
    ['@tanstack/charts:src/types.ts:ChartNumericScaleOptions', 'scale'],
    [
      '@tanstack/charts:src/types.ts:ConfiguredColorScaleLike',
      '$call copy copy.$return domain range',
    ],
    [
      '@tanstack/charts:src/types.ts:ConfiguredScaleLike',
      '$call bandwidth copy copy.$return domain invert range range.$return tickFormat tickFormat.$return ticks',
    ],
    [
      '@tanstack/charts:src/types.ts:InferableColorScaleLike',
      '$call.$return domain invertExtent nice nice.$return quantiles range thresholds ticks',
    ],
    [
      '@tanstack/charts:src/types.ts:InferableScaleLike',
      '$call.$return domain',
    ],
  ],
  // Consumer-called handles and lifecycle/service protocols are methods, not
  // application callbacks.
  serviceMethod: [
    ['@tanstack/angular-charts:src/Chart.ts:Chart', 'ngOnChanges ngOnDestroy'],
    [
      '@tanstack/angular-charts:src/ChartTooltipBody.ts:ChartTooltipBodyDirective',
      'ngTemplateContextGuard',
    ],
    [
      '@tanstack/charts:src/adapter-shared.ts:ChartAdapter',
      'destroy getScene mount prerender update',
    ],
    [
      '@tanstack/charts:src/canvas.ts:CanvasChartHost',
      'destroy getScene update',
    ],
    ['@tanstack/charts:src/canvas.ts:CanvasChartRenderer', 'mount'],
    [
      '@tanstack/charts:src/canvas.ts:UniversalCanvasChartRenderer',
      'mount prerender',
    ],
    [
      '@tanstack/charts:src/cursor-host-contract.ts:ChartCursorHostExtension',
      'create',
    ],
    [
      '@tanstack/charts:src/cursor-host-contract.ts:ChartCursorHostSession',
      'clear clearOwnedTransient createFocusState createFreeState destroy getState owns publish resolveFocus resolvePresentation subscribe subscribe.$return',
    ],
    ['@tanstack/charts:src/dom-types.ts:ChartHost', 'destroy getScene update'],
    ['@tanstack/charts:src/dom-types.ts:ChartLayerRenderer', 'compose'],
    ['@tanstack/charts:src/dom-types.ts:ChartRenderer', 'mount prerender'],
    [
      '@tanstack/charts:src/dom-types.ts:ChartRendererTooltipMotionCapability',
      'createController transition',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartTooltipMotionController',
      'afterPaint beforePaint destroy hide hide.complete',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:UniversalChartRenderer',
      'mount prerender',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:UniversalChartLayerRenderer',
      'compose',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartRendererHost',
      'destroy getScene update',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartInteractionController',
      'clientToScene resolvePointer setControlledFocus',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartSurface',
      'clientToScene destroy getPresentationPoints paintFocus render subscribePresentationPoints subscribePresentationPoints.$return',
    ],
    ['@tanstack/charts:src/dom-types.ts:ChartTooltipExtension', 'create'],
    [
      '@tanstack/charts:src/dom-types.ts:ChartTooltipExtensionContext',
      'bodyChange dismiss',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartTooltipExtensionInstance',
      'contains destroy hide paint update',
    ],
    ['@tanstack/charts:src/dom-types.ts:ChartTooltipPortalExtension', 'create'],
    [
      '@tanstack/charts:src/dom-types.ts:ChartTooltipPortalExtensionContext',
      'schedulePosition',
    ],
    [
      '@tanstack/charts:src/dom-types.ts:ChartTooltipPortalExtensionInstance',
      'destroy hide position update',
    ],
    [
      '@tanstack/charts:src/polar-mark-internal.ts:PolarResolvedScale',
      'map ticks',
    ],
    ['@tanstack/charts:src/network-force.ts:ForceFactoryContext', 'nodeKey'],
    [
      '@tanstack/charts:src/polar-mark-internal.ts:PolarMarkRenderContext',
      'color',
    ],
    ['@tanstack/charts:src/selection.ts:KeyedSelection', 'matches'],
    ['@tanstack/charts:src/spring.ts:ChartSpring', 'sample'],
    [
      '@tanstack/charts:src/types.ts:ChartCursorController',
      'getState setState subscribe subscribe.$return',
    ],
    ['@tanstack/charts:src/types.ts:ChartMarkStateContext', 'matches'],
    ['@tanstack/charts:src/types.ts:ChartRuntime', 'destroy render'],
    ['@tanstack/charts:src/types.ts:ChartSelectionController', 'change'],
    ['@tanstack/charts:src/types.ts:ChartSpatialIndex', 'findNearest'],
    ['@tanstack/charts:src/types.ts:ChartTooltipBodyContext', 'dismiss'],
    [
      '@tanstack/charts:src/types.ts:ChartTooltipContentContext',
      'formatX formatY',
    ],
    ['@tanstack/charts:src/types.ts:MarkRenderContext', 'color'],
    ['@tanstack/charts:src/types.ts:ResolvedColorScale', 'map'],
    ['@tanstack/charts:src/types.ts:ResolvedScale', 'invert map'],
    ['@tanstack/charts:src/types.ts:ResolvedScaleViewport', 'map'],
    [
      '@tanstack/lit-charts:src/Chart.ts:Chart',
      'connectedCallback disconnectedCallback',
    ],
    [
      '@tanstack/react-native-charts:src/Tooltip.tsx:NativeChartTooltipComponent',
      '$call',
    ],
    [
      '@tanstack/react-native-charts:src/Tooltip.tsx:NativeChartTooltipExtension',
      'create create.$return',
    ],
    [
      '@tanstack/react-native-charts:src/Tooltip.tsx:NativeChartTooltipProps',
      'dismiss',
    ],
    [
      '@tanstack/react-native-charts:src/Tooltip.tsx:NativeChartTooltipRenderContext',
      'dismiss',
    ],
    [
      '@tanstack/svelte-charts:src/types.ts:ChartTooltipBodySnippetContext',
      'defaultBody',
    ],
    [
      '@tanstack/vue-charts:src/types.ts:ChartTooltipBodySlotContext',
      'defaultBody',
    ],
  ],
}

export const publicCallbackClassifications =
  createClassifications(callbackInventory)

/**
 * Inspect function-valued members reachable through every source export of
 * every published workspace package. Properties inherited from another
 * package are owned and checked by the package that declares them.
 */
export async function inspectPublicCallableSurfaces(repositoryRoot) {
  const packagesRoot = resolve(repositoryRoot, 'packages')
  const packages = []

  for (const entry of await readdir(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const root = resolve(packagesRoot, entry.name)
    const manifestPath = resolve(root, 'package.json')
    let manifest
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    if (manifest.private === true || !manifest.exports) continue
    packages.push({
      name: manifest.name,
      root,
      entries: [...new Set(exportSourcePaths(root, manifest.exports))],
    })
  }

  const configPath = resolve(repositoryRoot, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) {
    throw new Error(formatDiagnostic(config.error))
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    repositoryRoot,
    undefined,
    configPath,
  )
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map(formatDiagnostic).join('\n'))
  }

  const program = ts.createProgram({
    rootNames: [
      ...new Set([
        ...parsed.fileNames,
        ...packages.flatMap((workspacePackage) => workspacePackage.entries),
      ]),
    ],
    options: parsed.options,
  })
  const checker = program.getTypeChecker()
  const surfaces = []

  for (const workspacePackage of packages) {
    const exportedSymbols = new Map()
    for (const entryPath of workspacePackage.entries) {
      const sourceFile = program.getSourceFile(entryPath)
      const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile)
      if (!moduleSymbol) continue
      for (const exportedSymbol of checker.getExportsOfModule(moduleSymbol)) {
        const symbol = resolveAlias(checker, exportedSymbol)
        const names = exportedSymbols.get(symbol) ?? new Set()
        names.add(exportedSymbol.name)
        exportedSymbols.set(symbol, names)
      }
    }

    const packageSurfaces = new Map()
    for (const [symbol, exportedNames] of exportedSymbols) {
      const exportedThrough = [...exportedNames].sort()
      const seenTypes = new Set()
      for (const { publicType, recordDirectCall } of exportedSymbolTypes(
        checker,
        symbol,
      )) {
        const fallbackOwner = symbol.name

        if (recordDirectCall) {
          for (const signature of localCallableSignatures(
            publicType,
            workspacePackage.root,
          )) {
            const declaration = signature.getDeclaration()
            addSurface(packageSurfaces, {
              checker,
              declaration,
              exportedThrough,
              member: '$call',
              owner: declarationOwner(declaration, fallbackOwner),
              package: workspacePackage,
              repositoryRoot,
              signature,
            })
          }
        }

        visitReachableType({
          checker,
          exportedThrough,
          fallbackOwner,
          package: workspacePackage,
          repositoryRoot,
          seenTypes,
          surfaces: packageSurfaces,
          type: publicType,
        })
      }
    }
    surfaces.push(...packageSurfaces.values())
  }

  return surfaces.sort((left, right) => left.id.localeCompare(right.id))
}

function exportedSymbolTypes(checker, symbol) {
  const types = new Map()
  if (symbol.flags & ts.SymbolFlags.Type) {
    try {
      const type = checker.getDeclaredTypeOfSymbol(symbol)
      types.set(type, {
        publicType: type,
        recordDirectCall: Boolean(
          symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias),
        ),
      })
    } catch {
      // Some merged or synthetic symbols do not have a declared type side.
    }
  }
  if (symbol.flags & ts.SymbolFlags.Value) {
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
    if (declaration) {
      try {
        const type = checker.getTypeOfSymbolAtLocation(symbol, declaration)
        const existing = types.get(type)
        types.set(type, {
          publicType: type,
          recordDirectCall: existing?.recordDirectCall ?? false,
        })
      } catch {
        // A type-only export can have value flags through declaration merging.
      }
    }
  }
  return types.values()
}

function visitReachableType(state) {
  const {
    checker,
    exportedThrough,
    fallbackOwner,
    package: workspacePackage,
    repositoryRoot,
    seenTypes,
    surfaces,
    type,
  } = state
  if (!type || seenTypes.has(type)) return
  seenTypes.add(type)

  for (const signature of localCallableSignatures(
    type,
    workspacePackage.root,
  )) {
    visitSignatureTypes(signature, state)
  }
  for (const signature of type.getConstructSignatures()) {
    const declaration = signature.getDeclaration()
    if (!declaration || !isLocalDeclaration(declaration, workspacePackage)) {
      continue
    }
    visitSignatureTypes(signature, state)
  }

  for (const property of checker.getPropertiesOfType(type)) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0]
    if (
      !declaration ||
      !isLocalDeclaration(declaration, workspacePackage) ||
      !isPublicDeclaration(declaration)
    ) {
      continue
    }
    let propertyType
    try {
      propertyType = checker.getTypeOfSymbolAtLocation(property, declaration)
    } catch {
      continue
    }
    for (const signature of callableSignatures(propertyType)) {
      addSurface(surfaces, {
        checker,
        declaration,
        exportedThrough,
        member: canonicalMemberName(property.name),
        owner: declarationOwner(declaration, fallbackOwner),
        package: workspacePackage,
        repositoryRoot,
        signature,
      })
    }
    visitReachableType({ ...state, type: propertyType })
  }

  if (type.isUnionOrIntersection()) {
    for (const constituent of type.types) {
      visitReachableType({ ...state, type: constituent })
    }
  }
}

function canonicalMemberName(name) {
  // TypeScript appends a process-local numeric identity to escaped unique
  // symbol names. That identity changes with program construction order and
  // is not part of the authored public surface.
  const escapedUniqueSymbol = /^(__@.+)@\d+$/u.exec(name)
  return escapedUniqueSymbol?.[1] ?? name
}

function visitSignatureTypes(signature, state) {
  const {
    checker,
    exportedThrough,
    fallbackOwner,
    package: workspacePackage,
    repositoryRoot,
    surfaces,
  } = state
  const declaration = signature.getDeclaration()
  if (!declaration) return

  for (const parameter of signature.parameters) {
    const parameterDeclaration =
      parameter.valueDeclaration ?? parameter.declarations?.[0] ?? declaration
    let parameterType
    try {
      parameterType = checker.getTypeOfSymbolAtLocation(
        parameter,
        parameterDeclaration,
      )
    } catch {
      continue
    }
    const nestedSignatures = callableSignatures(parameterType)
    if (nestedSignatures.length > 0) {
      const member = `${callableMemberPath(declaration)}.${parameter.name}`
      for (const nestedSignature of nestedSignatures) {
        addSurface(surfaces, {
          checker,
          declaration: parameterDeclaration,
          exportedThrough,
          member,
          owner: declarationOwner(parameterDeclaration, fallbackOwner),
          package: workspacePackage,
          repositoryRoot,
          signature: nestedSignature,
        })
      }
    }
    visitReachableType({ ...state, type: parameterType })
  }

  const returnType = checker.getReturnTypeOfSignature(signature)
  const returnedSignatures = callableSignatures(returnType)
  if (returnedSignatures.length > 0) {
    const member = `${callableMemberPath(declaration)}.$return`
    for (const returnedSignature of returnedSignatures) {
      addSurface(surfaces, {
        checker,
        declaration,
        exportedThrough,
        member,
        owner: declarationOwner(declaration, fallbackOwner),
        package: workspacePackage,
        repositoryRoot,
        signature: returnedSignature,
      })
    }
  }
  visitReachableType({ ...state, type: returnType })
}

function localCallableSignatures(type, packageRoot) {
  return callableSignatures(type).filter((signature) => {
    const declaration = signature.getDeclaration()
    return (
      declaration && isInside(declaration.getSourceFile().fileName, packageRoot)
    )
  })
}

function isLocalDeclaration(declaration, workspacePackage) {
  return isInside(declaration.getSourceFile().fileName, workspacePackage.root)
}

function isPublicDeclaration(declaration) {
  const modifiers = ts.getCombinedModifierFlags(declaration)
  return !(modifiers & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected))
}

function callableMemberPath(declaration) {
  if (
    ts.isPropertySignature(declaration) ||
    ts.isPropertyDeclaration(declaration) ||
    ts.isPropertyAssignment(declaration) ||
    ts.isMethodSignature(declaration) ||
    ts.isMethodDeclaration(declaration)
  ) {
    return declarationName(declaration.name) ?? '$call'
  }
  if (
    ts.isCallSignatureDeclaration(declaration) ||
    ts.isFunctionDeclaration(declaration) ||
    ts.isFunctionExpression(declaration) ||
    ts.isArrowFunction(declaration)
  ) {
    return '$call'
  }
  if (ts.isConstructSignatureDeclaration(declaration)) return '$construct'
  if (ts.isFunctionTypeNode(declaration)) {
    for (let current = declaration.parent; current; current = current.parent) {
      if (
        ts.isPropertySignature(current) ||
        ts.isPropertyDeclaration(current) ||
        ts.isMethodSignature(current) ||
        ts.isMethodDeclaration(current)
      ) {
        return declarationName(current.name) ?? '$call'
      }
      if (
        ts.isCallSignatureDeclaration(current) ||
        ts.isFunctionDeclaration(current) ||
        ts.isTypeAliasDeclaration(current)
      ) {
        return '$call'
      }
    }
  }
  return '$call'
}

function declarationName(name) {
  if (!name) return undefined
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text
  if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text
  }
  return undefined
}

export function validatePublicCallableSurfaces(
  surfaces,
  classifications = publicCallbackClassifications,
) {
  const failures = []
  const observed = new Set()

  for (const surface of surfaces) {
    const category = classifications.get(surface.id)
    observed.add(surface.id)
    if (!category) {
      failures.push(
        `${surface.id} is an unclassified public callable surface (${surface.location})`,
      )
      continue
    }

    if (
      category === callbackCategories.upstreamProtocol ||
      category === callbackCategories.serviceMethod
    ) {
      continue
    }

    for (const parameters of surface.signatures) {
      if (parameters.length > 2) {
        failures.push(
          `${surface.id} has ${parameters.length} positional arguments; public callbacks accept at most two`,
        )
        continue
      }
      if (
        parameters.length === 2 &&
        category !== callbackCategories.comparator &&
        category !== callbackCategories.pairedGeometry
      ) {
        const context = parameters[1]
        if (!['context', 'options'].includes(context.name)) {
          failures.push(
            `${surface.id} names its second argument ${context.name}; use context or options`,
          )
        }
        if (!context.objectBag) {
          failures.push(
            `${surface.id} must use an object context/options bag for its second argument`,
          )
        }
      }
    }
  }

  for (const id of classifications.keys()) {
    if (!observed.has(id)) {
      failures.push(`${id} is classified but no longer exported`)
    }
  }

  return failures.sort()
}

export async function publicCallbackContractFailures(repositoryRoot) {
  return validatePublicCallableSurfaces(
    await inspectPublicCallableSurfaces(repositoryRoot),
  )
}

export function createClassifications(inventory) {
  const classifications = new Map()
  for (const [categoryName, groups] of Object.entries(inventory)) {
    const category = callbackCategories[categoryName]
    if (!category)
      throw new TypeError(`Unknown callback category ${categoryName}`)
    for (const [prefix, members] of groups) {
      for (const member of members.split(/\s+/).filter(Boolean)) {
        const id = `${prefix}.${member}`
        if (classifications.has(id)) {
          throw new TypeError(`Duplicate callback classification ${id}`)
        }
        classifications.set(id, category)
      }
    }
  }
  return classifications
}

function exportSourcePaths(packageRoot, exports) {
  const paths = []
  for (const target of Object.values(exports)) {
    const source = resolveExportSource(target)
    if (source && /\.[cm]?[jt]sx?$/u.test(source)) {
      paths.push(resolve(packageRoot, source))
    }
  }
  return paths
}

function resolveExportSource(target) {
  if (typeof target === 'string') return target
  if (!target || typeof target !== 'object') return undefined
  for (const condition of [
    'types',
    'react-native',
    'svelte',
    'solid',
    'import',
    'default',
  ]) {
    if (typeof target[condition] === 'string') return target[condition]
  }
  return undefined
}

function resolveAlias(checker, symbol) {
  if (!(symbol.flags & ts.SymbolFlags.Alias)) return symbol
  try {
    return checker.getAliasedSymbol(symbol)
  } catch {
    return symbol
  }
}

function callableSignatures(type, seen = new Set()) {
  if (!type || seen.has(type)) return []
  seen.add(type)
  const signatures = [...type.getCallSignatures()]
  if (type.isUnionOrIntersection()) {
    for (const constituent of type.types) {
      signatures.push(...callableSignatures(constituent, seen))
    }
  }
  return uniqueSignatures(signatures)
}

function uniqueSignatures(signatures) {
  const seen = new Set()
  return signatures.filter((signature) => {
    const declaration = signature.getDeclaration()
    const key = declaration
      ? `${declaration.getSourceFile().fileName}:${declaration.pos}:${declaration.end}`
      : signature.parameters.map((parameter) => parameter.name).join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function addSurface(
  surfaces,
  {
    checker,
    declaration,
    exportedThrough,
    member,
    owner,
    package: workspacePackage,
    repositoryRoot,
    signature,
  },
) {
  const sourceFile = declaration.getSourceFile()
  const source = slash(relative(workspacePackage.root, sourceFile.fileName))
  const id = `${workspacePackage.name}:${source}:${owner}.${member}`
  const position = sourceFile.getLineAndCharacterOfPosition(
    declaration.getStart(sourceFile),
  )
  const parameters = signature.parameters.map((parameter) => {
    const parameterDeclaration =
      parameter.valueDeclaration ?? parameter.declarations?.[0] ?? declaration
    let type
    try {
      type = checker.getTypeOfSymbolAtLocation(parameter, parameterDeclaration)
    } catch {
      return { name: parameter.name, objectBag: false }
    }
    return {
      name: parameter.name,
      objectBag: isObjectBag(checker, type),
    }
  })
  const existing = surfaces.get(id)
  if (existing) {
    if (!sameParameterListIn(existing.signatures, parameters)) {
      existing.signatures.push(parameters)
    }
    for (const name of exportedThrough) {
      if (!existing.exportedThrough.includes(name)) {
        existing.exportedThrough.push(name)
      }
    }
    existing.exportedThrough.sort()
    return
  }
  surfaces.set(id, {
    id,
    packageName: workspacePackage.name,
    source,
    owner,
    member,
    exportedThrough,
    location: `${slash(relative(repositoryRoot, sourceFile.fileName))}:${position.line + 1}`,
    signatures: [parameters],
  })
}

function sameParameterListIn(signatures, candidate) {
  return signatures.some(
    (parameters) =>
      parameters.length === candidate.length &&
      parameters.every(
        (parameter, index) =>
          parameter.name === candidate[index].name &&
          parameter.objectBag === candidate[index].objectBag,
      ),
  )
}

function isObjectBag(checker, type, seen = new Set()) {
  if (seen.has(type)) return true
  seen.add(type)
  if (type.isUnion()) {
    const values = type.types.filter(
      (constituent) =>
        !(constituent.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)),
    )
    return (
      values.length > 0 &&
      values.every((constituent) => isObjectBag(checker, constituent, seen))
    )
  }
  if (type.isIntersection()) {
    return type.types.every((constituent) =>
      isObjectBag(checker, constituent, seen),
    )
  }
  if (type.flags & ts.TypeFlags.TypeParameter) {
    const constraint = checker.getBaseConstraintOfType(type)
    return constraint ? isObjectBag(checker, constraint, seen) : false
  }
  if (!(type.flags & ts.TypeFlags.Object)) return false
  if (checker.isArrayType(type) || checker.isTupleType(type)) return false
  return type.getCallSignatures().length === 0
}

function declarationOwner(declaration, fallback) {
  for (let current = declaration.parent; current; current = current.parent) {
    if (
      (ts.isInterfaceDeclaration(current) ||
        ts.isTypeAliasDeclaration(current) ||
        ts.isClassDeclaration(current) ||
        ts.isFunctionDeclaration(current)) &&
      current.name
    ) {
      return current.name.text
    }
  }
  return fallback
}

function isInside(file, directory) {
  const path = resolve(file)
  const root = resolve(directory)
  return path === root || path.startsWith(`${root}${sep}`)
}

function formatDiagnostic(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
}

function slash(path) {
  return path.split(sep).join('/')
}
