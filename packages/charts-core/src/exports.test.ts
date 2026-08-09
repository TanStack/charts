import { describe, expect, expectTypeOf, it } from 'vitest'
import packageJson from '../package.json'
import type {
  CreateDotLayoutOptions as RootCreateDotLayoutOptions,
  DotLayout as RootDotLayout,
  DotLayoutResolveContext as RootDotLayoutResolveContext,
} from '@tanstack/charts'
import type {
  CreateDotLayoutOptions as UniversalCreateDotLayoutOptions,
  DotLayout as UniversalDotLayout,
  DotLayoutResolveContext as UniversalDotLayoutResolveContext,
} from '@tanstack/charts/universal'

const typeOnlySpecifiers = new Set(['@tanstack/charts/types'])
const specializedLoaderSpecifiers = new Set([
  '@tanstack/charts/angular',
  '@tanstack/charts/octane',
  '@tanstack/charts/octane/canvas',
  '@tanstack/charts/octane/core',
  '@tanstack/charts/react-native',
  '@tanstack/charts/react-native/tooltip',
  '@tanstack/charts/svelte',
])

describe('public package exports', () => {
  it('keeps public dot-layout types aligned across authoring barrels', () => {
    expectTypeOf<UniversalCreateDotLayoutOptions<'y', 'row'>>().toEqualTypeOf<
      RootCreateDotLayoutOptions<'y', 'row'>
    >()
    expectTypeOf<UniversalDotLayout<'y', 'row'>>().toEqualTypeOf<
      RootDotLayout<'y', 'row'>
    >()
    expectTypeOf<UniversalDotLayoutResolveContext>().toEqualTypeOf<RootDotLayoutResolveContext>()
  })

  it('resolves every manifest capability subpath supported by the generic loader', async () => {
    const specifiers = Object.keys(packageJson.exports).map((subpath) =>
      subpath === '.'
        ? '@tanstack/charts'
        : `@tanstack/charts${subpath.slice(1)}`,
    )
    const runtimeSpecifiers = specifiers.filter(
      (specifier) => !specializedLoaderSpecifiers.has(specifier),
    )
    const modules = await Promise.all(
      runtimeSpecifiers.map(
        (specifier) => import(/* @vite-ignore */ specifier),
      ),
    )

    expect(modules).toHaveLength(runtimeSpecifiers.length)
    expect(
      modules.every(
        (module, index) =>
          typeOnlySpecifiers.has(runtimeSpecifiers[index]!) ||
          Object.keys(module).length > 0,
      ),
    ).toBe(true)
  })

  it('keeps the universal barrel aligned with root authoring exports', async () => {
    const [root, universal] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
    ])
    const browserOnlyRootValues = new Set([
      'createChartAdapter',
      'createChartRendererAdapter',
      'mountChart',
      'resolveChartAdapterLayout',
    ])

    expect(Object.keys(universal).sort()).toEqual(
      Object.keys(root)
        .filter((name) => !browserOnlyRootValues.has(name))
        .sort(),
    )
  })

  it('keeps tooltip capabilities on exact subpaths', async () => {
    const [root, tooltipModule, portalModule] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/tooltip'),
      import('@tanstack/charts/tooltip/portal'),
    ])

    expect(root).not.toHaveProperty('tooltip')
    expect(root).not.toHaveProperty('portal')
    expect(tooltipModule.tooltip.id).toBe('tooltip')
    expect(portalModule.portal.id).toBe('portal')
  })

  it('keeps focus guide marks on their exact subpath', async () => {
    const [root, universal, guide] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/focus/guide'),
    ])

    for (const name of ['focusGuideX', 'focusGuideY']) {
      expect(root).not.toHaveProperty(name)
      expect(universal).not.toHaveProperty(name)
      expect(guide).toHaveProperty(name)
    }
  })

  it('keeps coordinated view composition on its exact subpath', async () => {
    const [root, universal, view] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/view'),
    ])

    for (const name of [
      'viewGrid',
      'composeViews',
      'fill',
      'grid',
      'layer',
      'inset',
      'shareX',
      'shareY',
      'alignX',
      'alignY',
    ]) {
      expect(root).not.toHaveProperty(name)
      expect(universal).not.toHaveProperty(name)
      expect(view).toHaveProperty(name)
    }
  })

  it('keeps controlled signals and interactive legends on exact subpaths', async () => {
    const [root, universal, signal, legend] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/interaction/signal'),
      import('@tanstack/charts/legend'),
    ])

    expect(root).not.toHaveProperty('controlledSignal')
    expect(root).not.toHaveProperty('interactiveColorLegend')
    expect(universal).not.toHaveProperty('controlledSignal')
    expect(universal).not.toHaveProperty('interactiveColorLegend')
    expect(signal).toHaveProperty('controlledSignal')
    expect(legend).toHaveProperty('interactiveColorLegend')
  })

  it('keeps horizontal brushing on its exact subpath', async () => {
    const [root, universal, brush] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/interaction/brush'),
    ])

    expect(root).not.toHaveProperty('brushX')
    expect(universal).not.toHaveProperty('brushX')
    expect(brush).toHaveProperty('brushX')
  })

  it('keeps continuous cursors on their exact subpath', async () => {
    const [root, universal, cursor] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/interaction/cursor'),
    ])

    expect(root).not.toHaveProperty('continuousCursor')
    expect(universal).not.toHaveProperty('continuousCursor')
    expect(cursor).toHaveProperty('continuousCursor')
  })

  it('keeps horizontal handles on their exact subpath', async () => {
    const [root, universal, handle] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/interaction/handle'),
    ])

    expect(root).not.toHaveProperty('handleX')
    expect(universal).not.toHaveProperty('handleX')
    expect(handle).toHaveProperty('handleX')
  })

  it('keeps horizontal zoom on its exact subpath', async () => {
    const [root, universal, zoom] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/interaction/zoom'),
    ])

    expect(root).not.toHaveProperty('zoomX')
    expect(universal).not.toHaveProperty('zoomX')
    expect(zoom).toHaveProperty('zoomX')
  })

  it('keeps controlled keyed selection on its exact subpath', async () => {
    const [root, universal, selection] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/selection'),
    ])

    for (const name of ['keyedSelection', 'whenSelected']) {
      expect(root).not.toHaveProperty(name)
      expect(universal).not.toHaveProperty(name)
      expect(selection).toHaveProperty(name)
    }
  })

  it('keeps decorative mark composition on its exact subpath', async () => {
    const [root, universal, mark] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/mark/decorative'),
    ])

    expect(root).not.toHaveProperty('decorative')
    expect(universal).not.toHaveProperty('decorative')
    expect(mark).toHaveProperty('decorative')
  })

  it('keeps polar value allocation on the polar subpath', async () => {
    const [root, universal, polar] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/polar'),
    ])

    expect(root).not.toHaveProperty('pie')
    expect(universal).not.toHaveProperty('pie')
    expect(polar).toHaveProperty('pie')
  })

  it('keeps radial bars on the polar subpath', async () => {
    const [root, universal, polar] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/polar'),
    ])

    for (const name of ['radialBarRadius', 'radialBarAngle']) {
      expect(root).not.toHaveProperty(name)
      expect(universal).not.toHaveProperty(name)
      expect(polar).toHaveProperty(name)
    }
  })

  it('keeps the optional hexbin algorithm on its exact spatial subpath', async () => {
    const [root, universal, spatial] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/spatial/hexbin'),
    ])

    expect(root).not.toHaveProperty('hexbin')
    expect(universal).not.toHaveProperty('hexbin')
    expect(spatial).toHaveProperty('hexbin')
  })

  it('keeps the optional Delaunay algorithm on its exact spatial subpath', async () => {
    const [root, universal, spatial] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/spatial/delaunay'),
    ])

    expect(root).not.toHaveProperty('delaunayLink')
    expect(universal).not.toHaveProperty('delaunayLink')
    expect(spatial).toHaveProperty('delaunayLink')
  })

  it('keeps the optional density algorithm on its exact spatial subpath', async () => {
    const [root, universal, spatial] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/spatial/density'),
    ])

    expect(root).not.toHaveProperty('densityContour')
    expect(universal).not.toHaveProperty('densityContour')
    expect(spatial).toHaveProperty('densityContour')
  })

  it('keeps the optional scalar contour algorithm on its exact spatial subpath', async () => {
    const [root, universal, spatial] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/spatial/contour'),
    ])

    expect(root).not.toHaveProperty('contour')
    expect(universal).not.toHaveProperty('contour')
    expect(spatial).toHaveProperty('contour')
  })

  it('keeps the optional Voronoi algorithm on its exact spatial subpath', async () => {
    const [root, universal, spatial] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/spatial/voronoi'),
    ])

    expect(root).not.toHaveProperty('voronoi')
    expect(universal).not.toHaveProperty('voronoi')
    expect(spatial).toHaveProperty('voronoi')
  })

  it('keeps the optional force algorithm on its exact network subpath', async () => {
    const [root, universal, network] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/network/force'),
    ])

    expect(root).not.toHaveProperty('forceLayout')
    expect(universal).not.toHaveProperty('forceLayout')
    expect(network).toHaveProperty('forceLayout')
  })

  it('keeps the optional Sankey mark on its exact network subpath', async () => {
    const [root, universal, network] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/network/sankey'),
    ])

    expect(root).not.toHaveProperty('sankeyDiagram')
    expect(universal).not.toHaveProperty('sankeyDiagram')
    expect(network).toHaveProperty('sankeyDiagram')
  })

  it('keeps the optional tree algorithm on its exact hierarchy subpath', async () => {
    const [root, universal, hierarchy] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/hierarchy/tree'),
    ])

    expect(root).not.toHaveProperty('treeLayout')
    expect(universal).not.toHaveProperty('treeLayout')
    expect(hierarchy).toHaveProperty('treeLayout')
  })

  it('keeps the optional treemap mark on its exact hierarchy subpath', async () => {
    const [root, universal, hierarchy] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/hierarchy/treemap'),
    ])

    expect(root).not.toHaveProperty('treemap')
    expect(universal).not.toHaveProperty('treemap')
    expect(hierarchy).toHaveProperty('treemap')
  })

  it('keeps the optional sunburst mark on its exact hierarchy subpath', async () => {
    const [root, universal, hierarchy] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/hierarchy/sunburst'),
    ])

    expect(root).not.toHaveProperty('sunburst')
    expect(universal).not.toHaveProperty('sunburst')
    expect(hierarchy).toHaveProperty('sunburst')
  })

  it('keeps waffle marks available from barrels and the exact subpath', async () => {
    const [root, universal, waffle] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/waffle'),
    ])

    for (const module of [root, universal, waffle]) {
      expect(module).toHaveProperty('waffleX')
      expect(module).toHaveProperty('waffleY')
    }
  })

  it('keeps ridgeline marks available from barrels and the exact subpath', async () => {
    const [root, universal, ridgeline] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/ridgeline'),
    ])

    for (const module of [root, universal, ridgeline]) {
      expect(module).toHaveProperty('ridgelineX')
      expect(module).toHaveProperty('ridgelineY')
    }
  })

  it('keeps violin marks available from barrels and the exact subpath', async () => {
    const [root, universal, violin] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/violin'),
    ])

    for (const module of [root, universal, violin]) {
      expect(module).toHaveProperty('violinX')
      expect(module).toHaveProperty('violinY')
    }
  })

  it('keeps box marks available from barrels and the exact subpath', async () => {
    const [root, universal, box] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/box'),
    ])

    for (const module of [root, universal, box]) {
      expect(module).toHaveProperty('boxRows')
      expect(module).toHaveProperty('boxX')
      expect(module).toHaveProperty('boxY')
    }
  })

  it('keeps composite marks available from barrels and the exact subpath', async () => {
    const [root, universal, composite] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/mark/composite'),
    ])

    for (const module of [root, universal, composite]) {
      expect(module).toHaveProperty('compositeMark')
    }
  })

  it('keeps dodge layouts available from barrels and the exact subpath', async () => {
    const [root, universal, dodge] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/dodge'),
    ])

    for (const module of [root, universal, dodge]) {
      expect(module).toHaveProperty('createDotLayout')
      expect(module).toHaveProperty('dodgeX')
      expect(module).toHaveProperty('dodgeY')
    }
  })

  it('keeps fold available from barrels and the exact transform subpath', async () => {
    const [root, universal, transform] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/transform/fold'),
    ])

    for (const module of [root, universal, transform]) {
      expect(module).toHaveProperty('fold')
    }
  })

  it('keeps both mosaic orientations available from barrels and the exact transform subpath', async () => {
    const [root, universal, transform] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/transform/mosaic'),
    ])

    for (const module of [root, universal, transform]) {
      expect(module).toHaveProperty('mosaicX')
      expect(module).toHaveProperty('mosaicY')
    }
  })

  it('keeps waterfall available from barrels and the exact transform subpath', async () => {
    const [root, universal, transform] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/transform/waterfall'),
    ])

    for (const module of [root, universal, transform]) {
      expect(module).toHaveProperty('waterfall')
    }
  })

  it('keeps both line orientations available from barrels and the exact subpath', async () => {
    const [root, universal, line] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/line'),
    ])

    for (const module of [root, universal, line]) {
      expect(module).toHaveProperty('lineX')
      expect(module).toHaveProperty('lineY')
    }
  })

  it('keeps regression marks available from barrels and the exact subpath', async () => {
    const [root, universal, regression] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/regression'),
    ])

    for (const module of [root, universal, regression]) {
      expect(module).toHaveProperty('linearRegressionRowsX')
      expect(module).toHaveProperty('linearRegressionRowsY')
      expect(module).toHaveProperty('linearRegressionX')
      expect(module).toHaveProperty('linearRegressionY')
    }
  })

  it('keeps difference marks available from barrels and the exact subpath', async () => {
    const [root, universal, difference] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/difference'),
    ])

    for (const module of [root, universal, difference]) {
      expect(module).toHaveProperty('differenceX')
      expect(module).toHaveProperty('differenceY')
    }
  })

  it('keeps the cursor controller on its exact subpath', async () => {
    const [root, universal, cursorModule, cursorHostModule] = await Promise.all(
      [
        import('@tanstack/charts'),
        import('@tanstack/charts/universal'),
        import('@tanstack/charts/cursor'),
        import('@tanstack/charts/cursor/host'),
      ],
    )

    expect(root).not.toHaveProperty('createChartCursor')
    expect(universal).not.toHaveProperty('createChartCursor')
    expect(Object.keys(cursorModule).sort()).toEqual([
      'createChartCursor',
      'cursorHost',
    ])
    expect(Object.keys(cursorHostModule).sort()).toEqual([
      'createChartCursorHostSession',
      'createFocusChartCursorState',
      'createFreeChartCursorState',
      'cursorHost',
      'resolveChartCursorFocus',
      'resolveChartCursorPresentation',
      'resolveChartFocusStrategy',
      'resolveChartPointerFocus',
      'resolveFocusPresentation',
      'resolveMarkStateScene',
      'restoreChartFocusPoint',
      'sameChartPointIdentity',
    ])
  })

  it('keeps crosshair resolution on the optional mark subpath', async () => {
    const [root, universal, crosshairModule] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/crosshair'),
    ])

    expect(root).not.toHaveProperty('resolveCrosshairGuide')
    expect(universal).not.toHaveProperty('resolveCrosshairGuide')
    expect(Object.keys(crosshairModule).sort()).toEqual([
      'crosshair',
      'resolveCrosshairGuide',
    ])
  })

  it('keeps D3 curve bridges available from barrels and exact subpaths', async () => {
    const [root, universal, shape, areaX] = await Promise.all([
      import('@tanstack/charts'),
      import('@tanstack/charts/universal'),
      import('@tanstack/charts/d3/shape'),
      import('@tanstack/charts/d3/area-x'),
    ])

    expect(root).toHaveProperty('d3Curve')
    expect(root).toHaveProperty('d3AreaXCurve')
    expect(universal).toHaveProperty('d3Curve')
    expect(universal).toHaveProperty('d3AreaXCurve')
    expect(shape).toHaveProperty('d3Curve')
    expect(areaX).toHaveProperty('d3AreaXCurve')
  })
})
