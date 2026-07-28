export type ConformanceReferenceRenderer =
  'observable-plot' | 'recharts' | 'echarts'

export type ConformanceRenderer = ConformanceReferenceRenderer | 'tanstack'

export type ConformanceSupport = 'native' | 'composed' | 'gap' | 'deferred'

export type ConformanceGeometryRole =
  | 'area'
  | 'arrow'
  | 'bar'
  | 'cell'
  | 'contour'
  | 'delaunay'
  | 'density'
  | 'dot'
  | 'frame'
  | 'geo'
  | 'hexagon'
  | 'line'
  | 'link'
  | 'rect'
  | 'radar'
  | 'regression'
  | 'rule'
  | 'text'
  | 'tick'
  | 'vector'
  | 'voronoi'
  | 'waffle'

export interface ConformanceInput {
  width: number
  height: number
  revision: number
}

export interface ConformanceHandle {
  update: (input: ConformanceInput) => void
  driver?: ConformanceTestDriver
  destroy: () => void
}

export type ConformanceMount = (
  container: HTMLElement,
  input: ConformanceInput,
) => ConformanceHandle

export interface ConformanceGeometryExpectation {
  id?: string
  view?: string
  role: ConformanceGeometryRole
  count: number
  maxCount?: number
  rendererRoles?: Partial<Record<ConformanceRenderer, ConformanceGeometryRole>>
}

export type ConformanceAxis = 'x' | 'y' | 'fx' | 'fy'

export interface ConformanceGuideExpectation {
  id: string
  axis:
    | ConformanceAxis
    | (Record<'tanstack', ConformanceAxis> &
        Partial<Record<ConformanceReferenceRenderer, ConformanceAxis>>)
  sequence?: readonly string[]
  maxRepeat?: number
}

export type ConformanceJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly ConformanceJsonValue[]
  | ConformanceJsonObject

export interface ConformanceJsonObject {
  readonly [key: string]: ConformanceJsonValue
}

export interface ConformanceTarget {
  view?: string
  anchor: string
}

export interface ConformanceResolvedTarget {
  /** Viewport-relative client coordinate used by Playwright mouse input. */
  x: number
  /** Viewport-relative client coordinate used by Playwright mouse input. */
  y: number
  /** Optional element to focus before a real Playwright keyboard action. */
  focusElement?: HTMLElement | SVGElement
}

export interface ConformanceGeometryQuery {
  view?: string
  role: ConformanceGeometryRole
}

export interface ConformanceGeometrySample {
  /** Viewport-relative client box, matching getBoundingClientRect coordinates. */
  x: number
  y: number
  width: number
  height: number
  paint?: string
}

export interface ConformanceTestDriver {
  /**
   * Benchmark-only semantic bridge. Case metadata names anchors; each renderer
   * resolves those anchors without exposing renderer-specific selectors.
   */
  resolveTarget: (target: ConformanceTarget) => ConformanceResolvedTarget | null
  readState: () => ConformanceJsonObject
  geometry?: (
    query: ConformanceGeometryQuery,
  ) => readonly ConformanceGeometrySample[]
  /**
   * Viewport-relative logical view bounds. Multi-grid renderers may expose
   * independent views without separate DOM roots.
   */
  viewBounds?: (view?: string) => ConformanceGeometrySample | null
  settle?: () => void | Promise<void>
}

export type ConformanceStateAssertion =
  | {
      path: string
      equals: ConformanceJsonValue
    }
  | {
      path: string
      includes: ConformanceJsonValue
    }
  | {
      path: string
      approx: number
      tolerance: number
    }

export type ConformanceInteractionStep =
  | {
      type: 'pointerMove'
      target: ConformanceTarget
    }
  | {
      type: 'pointerLeave'
      view?: string
    }
  | {
      type: 'update'
      revision: number
    }
  | {
      type: 'click'
      target: ConformanceTarget
    }
  | {
      type: 'key'
      key: string
      target?: ConformanceTarget
    }
  | {
      type: 'drag'
      from: ConformanceTarget
      to: ConformanceTarget
      steps?: number
    }
  | {
      type: 'wheel'
      target: ConformanceTarget
      deltaX?: number
      deltaY?: number
    }
  | {
      type: 'assert'
      assertions: readonly ConformanceStateAssertion[]
    }

export interface ConformanceInteractionScenario {
  id: string
  steps: readonly ConformanceInteractionStep[]
}

export interface ConformanceCaseMeta {
  schemaVersion: 1
  referenceRenderer?: ConformanceReferenceRenderer
  order: number
  id: string
  title: string
  family: string
  intent: string
  support: ConformanceSupport
  features: readonly string[]
  geometry: readonly ConformanceGeometryExpectation[]
  minimumGeometrySimilarity?: number
  guideAssertions?: readonly ConformanceGuideExpectation[]
  interactionScenarios?: readonly ConformanceInteractionScenario[]
  source: {
    title: string
    url: string
  }
  ai: {
    create: string
    maintain: string
  }
}

export interface ConformanceImplementationModule {
  mount: ConformanceMount
}
