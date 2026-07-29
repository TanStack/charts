import type {
  ConformanceAxis,
  ConformanceCaseMeta,
  ConformanceInteractionScenario,
  ConformanceInteractionStep,
  ConformanceJsonValue,
  ConformanceReferenceRenderer,
  ConformanceRenderedAssertion,
  ConformanceRenderedTarget,
  ConformanceRenderer,
  ConformanceStateAssertion,
  ConformanceTarget,
} from './types'

export function parseConformanceCaseMeta(
  value: unknown,
  path: string,
): ConformanceCaseMeta {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    ('referenceRenderer' in value &&
      !isReferenceRenderer(value.referenceRenderer)) ||
    !('order' in value) ||
    typeof value.order !== 'number' ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    !('family' in value) ||
    typeof value.family !== 'string' ||
    !('intent' in value) ||
    typeof value.intent !== 'string' ||
    !('support' in value) ||
    !isSupport(value.support) ||
    !('features' in value) ||
    !isStringArray(value.features) ||
    !('geometry' in value) ||
    !isGeometryArray(value.geometry) ||
    ('minimumGeometrySimilarity' in value &&
      !isGeometrySimilarity(value.minimumGeometrySimilarity)) ||
    ('guideAssertions' in value && !isGuideArray(value.guideAssertions)) ||
    ('interactionScenarios' in value &&
      !isInteractionScenarioArray(value.interactionScenarios)) ||
    !('source' in value) ||
    !isSource(value.source) ||
    !('ai' in value) ||
    !isAiTask(value.ai)
  ) {
    throw new TypeError(`Invalid conformance metadata in "${path}"`)
  }

  const referenceRenderer =
    'referenceRenderer' in value && isReferenceRenderer(value.referenceRenderer)
      ? value.referenceRenderer
      : undefined
  const guideAssertions =
    'guideAssertions' in value && isGuideArray(value.guideAssertions)
      ? value.guideAssertions
      : undefined
  const interactionScenarios =
    'interactionScenarios' in value &&
    isInteractionScenarioArray(value.interactionScenarios)
      ? value.interactionScenarios
      : undefined
  const minimumGeometrySimilarity =
    'minimumGeometrySimilarity' in value &&
    isGeometrySimilarity(value.minimumGeometrySimilarity)
      ? value.minimumGeometrySimilarity
      : undefined

  return {
    schemaVersion: 1,
    ...(referenceRenderer ? { referenceRenderer } : {}),
    order: value.order,
    id: value.id,
    title: value.title,
    family: value.family,
    intent: value.intent,
    support: value.support,
    features: value.features,
    geometry: value.geometry,
    ...(minimumGeometrySimilarity === undefined
      ? {}
      : { minimumGeometrySimilarity }),
    ...(guideAssertions ? { guideAssertions } : {}),
    ...(interactionScenarios ? { interactionScenarios } : {}),
    source: value.source,
    ai: value.ai,
  }
}

function isReferenceRenderer(
  value: unknown,
): value is ConformanceReferenceRenderer {
  return (
    value === 'observable-plot' || value === 'recharts' || value === 'echarts'
  )
}

function isSupport(value: unknown): value is ConformanceCaseMeta['support'] {
  return (
    value === 'native' ||
    value === 'composed' ||
    value === 'gap' ||
    value === 'deferred'
  )
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  )
}

function isSource(value: unknown): value is ConformanceCaseMeta['source'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    typeof value.title === 'string' &&
    'url' in value &&
    typeof value.url === 'string'
  )
}

function isAiTask(value: unknown): value is ConformanceCaseMeta['ai'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'create' in value &&
    typeof value.create === 'string' &&
    'maintain' in value &&
    typeof value.maintain === 'string'
  )
}

function isGeometry(
  value: unknown,
): value is ConformanceCaseMeta['geometry'][number] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'role' in value &&
    isGeometryRole(value.role) &&
    'count' in value &&
    isGeometryCount(value.count) &&
    (!('id' in value) || typeof value.id === 'string') &&
    (!('view' in value) || typeof value.view === 'string') &&
    (!('maxCount' in value) ||
      (isGeometryCount(value.maxCount) && value.maxCount >= value.count)) &&
    (!('rendererRoles' in value) || isRendererRoleMap(value.rendererRoles))
  )
}

function isGeometryCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isGeometrySimilarity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  )
}

function isGeometryArray(
  value: unknown,
): value is ConformanceCaseMeta['geometry'] {
  if (!Array.isArray(value) || !value.every(isGeometry)) return false
  const keys = value.map((entry) => entry.id ?? entry.role)
  return new Set(keys).size === keys.length
}

function isRendererRoleMap(
  value: unknown,
): value is NonNullable<
  ConformanceCaseMeta['geometry'][number]['rendererRoles']
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.entries(value).every(
      ([renderer, role]) =>
        isConformanceRenderer(renderer) && isGeometryRole(role),
    )
  )
}

function isGuideArray(
  value: unknown,
): value is NonNullable<ConformanceCaseMeta['guideAssertions']> {
  return Array.isArray(value) && value.every(isGuide)
}

function isGuide(
  value: unknown,
): value is NonNullable<ConformanceCaseMeta['guideAssertions']>[number] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'axis' in value &&
    (isAxis(value.axis) ||
      (typeof value.axis === 'object' &&
        value.axis !== null &&
        Object.entries(value.axis).every(
          ([renderer, axis]) => isConformanceRenderer(renderer) && isAxis(axis),
        ))) &&
    (!('sequence' in value) || isStringArray(value.sequence)) &&
    (!('maxRepeat' in value) || typeof value.maxRepeat === 'number')
  )
}

function isInteractionScenarioArray(
  value: unknown,
): value is readonly ConformanceInteractionScenario[] {
  return Array.isArray(value) && value.every(isInteractionScenario)
}

function isInteractionScenario(
  value: unknown,
): value is ConformanceInteractionScenario {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'steps' in value &&
    Array.isArray(value.steps) &&
    value.steps.length > 0 &&
    value.steps.every(isInteractionStep)
  )
}

function isInteractionStep(
  value: unknown,
): value is ConformanceInteractionStep {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false
  }

  if (
    value.type === 'pointerMove' ||
    value.type === 'pointerDown' ||
    value.type === 'pointerUp'
  ) {
    return (
      'target' in value &&
      isInteractionTarget(value.target) &&
      (!('steps' in value) ||
        (value.type === 'pointerMove' && isPositiveInteger(value.steps)))
    )
  }
  if (value.type === 'pointerCancel') {
    return true
  }
  if (value.type === 'click' || value.type === 'touchTap') {
    return 'target' in value && isInteractionTarget(value.target)
  }
  if (value.type === 'pointerLeave') {
    return !('view' in value) || typeof value.view === 'string'
  }
  if (value.type === 'update') {
    return (
      'revision' in value &&
      typeof value.revision === 'number' &&
      Number.isFinite(value.revision)
    )
  }
  if (value.type === 'key') {
    return (
      'key' in value &&
      typeof value.key === 'string' &&
      (!('target' in value) || isInteractionTarget(value.target))
    )
  }
  if (value.type === 'drag') {
    return (
      'from' in value &&
      isInteractionTarget(value.from) &&
      'to' in value &&
      isInteractionTarget(value.to) &&
      (!('steps' in value) || isPositiveInteger(value.steps))
    )
  }
  if (value.type === 'touchDrag') {
    return (
      'from' in value &&
      isInteractionTarget(value.from) &&
      'to' in value &&
      isInteractionTarget(value.to) &&
      (!('steps' in value) || isPositiveInteger(value.steps)) &&
      (!('cancel' in value) || typeof value.cancel === 'boolean')
    )
  }
  if (value.type === 'wheel') {
    return (
      'target' in value &&
      isInteractionTarget(value.target) &&
      ('deltaX' in value || 'deltaY' in value) &&
      (!('deltaX' in value) ||
        (typeof value.deltaX === 'number' && Number.isFinite(value.deltaX))) &&
      (!('deltaY' in value) ||
        (typeof value.deltaY === 'number' && Number.isFinite(value.deltaY))) &&
      (!('steps' in value) || isPositiveInteger(value.steps)) &&
      (!('deltaMode' in value) ||
        value.deltaMode === 'pixel' ||
        value.deltaMode === 'line' ||
        value.deltaMode === 'page')
    )
  }
  if (value.type === 'wait') {
    return (
      'durationMs' in value &&
      isPositiveInteger(value.durationMs) &&
      value.durationMs <= 5_000
    )
  }
  if (value.type === 'assert') {
    return (
      'assertions' in value &&
      Array.isArray(value.assertions) &&
      value.assertions.length > 0 &&
      value.assertions.every(isStateAssertion)
    )
  }
  if (value.type === 'assertRendered') {
    return (
      'assertions' in value &&
      Array.isArray(value.assertions) &&
      value.assertions.length > 0 &&
      value.assertions.every(isRenderedAssertion)
    )
  }
  if (value.type === 'screenshot') {
    return (
      'name' in value &&
      typeof value.name === 'string' &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.name) &&
      (!('view' in value) || typeof value.view === 'string')
    )
  }

  return false
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isInteractionTarget(value: unknown): value is ConformanceTarget {
  return (
    typeof value === 'object' &&
    value !== null &&
    'anchor' in value &&
    typeof value.anchor === 'string' &&
    (!('view' in value) || typeof value.view === 'string')
  )
}

function isRenderedTarget(value: unknown): value is ConformanceRenderedTarget {
  if (typeof value !== 'object' || value === null) return false

  const kinds = ['selector', 'role', 'root', 'page'].filter(
    (key) => key in value,
  )
  if (kinds.length !== 1) return false

  if ('root' in value) {
    return value.root === true && !('index' in value)
  }
  if ('page' in value) {
    return value.page === true && !('index' in value)
  }

  if (
    'index' in value &&
    (typeof value.index !== 'number' ||
      !Number.isInteger(value.index) ||
      value.index < 0)
  ) {
    return false
  }

  if ('selector' in value) {
    return typeof value.selector === 'string' && value.selector.length > 0
  }

  return (
    'role' in value &&
    typeof value.role === 'string' &&
    value.role.length > 0 &&
    (!('name' in value) || typeof value.name === 'string') &&
    (!('exact' in value) || typeof value.exact === 'boolean')
  )
}

function isRenderedAssertion(
  value: unknown,
): value is ConformanceRenderedAssertion {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('target' in value) ||
    !isRenderedTarget(value.target) ||
    !('property' in value) ||
    typeof value.property !== 'string'
  ) {
    return false
  }

  if (value.property === 'count') {
    return !('index' in value.target) && isRenderedNumberMatcher(value)
  }
  if (value.property === 'text') {
    return isRenderedStringMatcher(value)
  }
  if (value.property === 'attribute') {
    return (
      'attribute' in value &&
      typeof value.attribute === 'string' &&
      value.attribute.length > 0 &&
      isRenderedStringMatcher(value)
    )
  }
  if (value.property === 'visible' || value.property === 'focused') {
    return (
      'equals' in value &&
      typeof value.equals === 'boolean' &&
      !('includes' in value) &&
      !('approx' in value)
    )
  }
  if (
    value.property === 'scrollLeft' ||
    value.property === 'scrollTop' ||
    value.property === 'scrollWidth' ||
    value.property === 'scrollHeight' ||
    value.property === 'clientWidth' ||
    value.property === 'clientHeight' ||
    value.property === 'width' ||
    value.property === 'height'
  ) {
    return isRenderedNumberMatcher(value)
  }
  if (value.property === 'contained') {
    return (
      'equals' in value &&
      value.equals === true &&
      !('includes' in value) &&
      !('approx' in value) &&
      (!('within' in value) || isRenderedTarget(value.within)) &&
      (!('tolerance' in value) ||
        (typeof value.tolerance === 'number' &&
          Number.isFinite(value.tolerance) &&
          value.tolerance >= 0))
    )
  }

  return false
}

function isRenderedStringMatcher(value: object): boolean {
  const matchers = ['equals', 'includes'].filter((key) => key in value)
  if (matchers.length !== 1) return false
  if ('equals' in value) {
    return value.equals === null || typeof value.equals === 'string'
  }
  return 'includes' in value && typeof value.includes === 'string'
}

function isRenderedNumberMatcher(value: object): boolean {
  const matchers = ['equals', 'approx', 'atLeast', 'atMost'].filter(
    (key) => key in value,
  )
  if (matchers.length !== 1) return false
  if ('equals' in value) {
    return typeof value.equals === 'number' && Number.isFinite(value.equals)
  }
  if ('atLeast' in value) {
    return typeof value.atLeast === 'number' && Number.isFinite(value.atLeast)
  }
  if ('atMost' in value) {
    return typeof value.atMost === 'number' && Number.isFinite(value.atMost)
  }
  return (
    'approx' in value &&
    typeof value.approx === 'number' &&
    Number.isFinite(value.approx) &&
    'tolerance' in value &&
    typeof value.tolerance === 'number' &&
    Number.isFinite(value.tolerance) &&
    value.tolerance >= 0
  )
}

function isStateAssertion(value: unknown): value is ConformanceStateAssertion {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('path' in value) ||
    typeof value.path !== 'string'
  ) {
    return false
  }

  const assertionKinds = ['equals', 'includes', 'approx'].filter(
    (key) => key in value,
  )
  if (assertionKinds.length !== 1) return false

  if ('equals' in value) return isJsonValue(value.equals)
  if ('includes' in value) return isJsonValue(value.includes)
  return (
    'approx' in value &&
    typeof value.approx === 'number' &&
    Number.isFinite(value.approx) &&
    'tolerance' in value &&
    typeof value.tolerance === 'number' &&
    Number.isFinite(value.tolerance) &&
    value.tolerance >= 0
  )
}

function isJsonValue(value: unknown): value is ConformanceJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return true
  }
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isJsonValue)
  return typeof value === 'object' && Object.values(value).every(isJsonValue)
}

function isConformanceRenderer(value: string): value is ConformanceRenderer {
  return (
    value === 'observable-plot' ||
    value === 'recharts' ||
    value === 'echarts' ||
    value === 'tanstack'
  )
}

function isAxis(value: unknown): value is ConformanceAxis {
  return value === 'x' || value === 'y' || value === 'fx' || value === 'fy'
}

function isGeometryRole(
  value: unknown,
): value is ConformanceCaseMeta['geometry'][number]['role'] {
  return (
    value === 'arc' ||
    value === 'area' ||
    value === 'arrow' ||
    value === 'bar' ||
    value === 'cell' ||
    value === 'contour' ||
    value === 'delaunay' ||
    value === 'density' ||
    value === 'dot' ||
    value === 'frame' ||
    value === 'geo' ||
    value === 'hexagon' ||
    value === 'line' ||
    value === 'link' ||
    value === 'rect' ||
    value === 'radar' ||
    value === 'regression' ||
    value === 'rule' ||
    value === 'text' ||
    value === 'tick' ||
    value === 'vector' ||
    value === 'voronoi' ||
    value === 'waffle'
  )
}
