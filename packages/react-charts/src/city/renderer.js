import { getBrowserMapLocale, getMapI18n } from './i18n.js'
import { City } from './engine/city.js'
import { readCityLayout } from './layout.js'
import { mapTooltipAnchor } from './engine/lib/map-tooltip.js'
import { bindCityPoints } from './interaction.js'

const escapeAttribute = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  )

/**
 * TanStack ChartRenderer backed by one Three.js city per mounted surface.
 * Pass this renderer to Chart from @tanstack/charts/react/core or to
 * mountChartRenderer. Data, color scales, focus, tooltips and selection remain
 * TanStack contracts; only painting and exact spatial hit testing are 3D.
 */
export function createCityRenderer({
  view = 'iso',
  life = true,
  autoRotate = false,
  effects = true,
  onMount,
  onData,
  onDestroy,
  onError,
  ...callbacks
} = {}) {
  const renderer = {
    id: 'atlas-city-3d',
    prerender(_scene, options) {
      return `<div data-city-surface role="group" aria-roledescription="${getMapI18n('en-US').t('chartRole')}" aria-label="${escapeAttribute(options.ariaLabel)}" style="width:100%;height:100%"></div>`
    },
    mount(container) {
      const element =
        container.querySelector('[data-city-surface]') ||
        container.ownerDocument.createElement('div')
      element.dataset.citySurface = ''
      element.style.width = '100%'
      element.style.height = '100%'
      if (!element.parentNode) container.append(element)
      let city
      let scene
      let sourcePoints = []
      let presentationPoints = []
      let cameraKey
      let dataKey
      let hitCache
      let pointsById = new Map()
      let pointerDown
      let dragging = false
      let destroyed = false
      const listeners = new Set()

      const pickAt = (clientX, clientY) => {
        const box = element.getBoundingClientRect()
        const key = [
          Math.round((clientX - box.left) * 1e6),
          Math.round((clientY - box.top) * 1e6),
          box.width,
          box.height,
          city.cameraRevision,
        ].join(':')
        if (hitCache?.key !== key)
          hitCache = { key, company: city.pick({ clientX, clientY }) }
        return hitCache.company
      }
      const resolveHit = (x, y) => {
        if (destroyed || !city || !scene || dragging || !city.controls.enabled)
          return []
        const box = element.getBoundingClientRect()
        const company = pickAt(
          box.left + (x * box.width) / scene.width,
          box.top + (y * box.height) / scene.height,
        )
        const point = company && pointsById.get(company.id)
        return point ? [point] : []
      }
      const updatePresentation = () => {
        if (!city || !scene) return
        const nextKey = [scene.width, scene.height, city.cameraRevision].join(
          ',',
        )
        if (cameraKey === nextKey) return
        cameraKey = nextKey
        presentationPoints = sourcePoints.map((point) => {
          const company = city.companies[point.datumIndex]
          const projected = city.project(company.x, company.roofTop, company.z)
          const anchor = mapTooltipAnchor(projected, scene.width, scene.height)
          return { ...point, x: anchor?.x ?? -1e6, y: anchor?.y ?? -1e6 }
        })
        pointsById = new Map(presentationPoints.map((p) => [p.datum.id, p]))
        bindCityPoints(presentationPoints, resolveHit)
        for (const listener of listeners) listener(presentationPoints)
        callbacks.projection?.(city)
      }
      const pointerStart = (event) => {
        pointerDown = { x: event.clientX, y: event.clientY }
        dragging = false
      }
      const pointerMove = (event) => {
        if (
          event.buttons &&
          pointerDown &&
          Math.hypot(
            event.clientX - pointerDown.x,
            event.clientY - pointerDown.y,
          ) >= 5
        )
          dragging = true
        // OrbitControls has already handled this event on the canvas.
        if (event.buttons) event.stopPropagation()
        else if (city) {
          const company = pickAt(event.clientX, event.clientY)
          element.style.cursor = company ? 'pointer' : 'grab'
          callbacks.hover?.(company, { event })
        }
      }
      const pointerLeave = () => callbacks.hover?.(null)
      const click = (event) => {
        if (dragging || !city?.controls.enabled) event.stopPropagation()
        dragging = false
        pointerDown = null
      }
      element.addEventListener('pointerdown', pointerStart)
      element.addEventListener('pointermove', pointerMove)
      element.addEventListener('pointerleave', pointerLeave)
      element.addEventListener('click', click)
      try {
        city = new City(element, {
          ...callbacks,
          frame(value) {
            updatePresentation()
            callbacks.frame?.(value)
          },
        })
        city.setActivity({ life, effects })
        city.setAutoRotate(autoRotate)
        onMount?.(city)
      } catch (error) {
        city?.dispose()
        city = null
        if (!onError) {
          element.remove()
          throw error
        }
        onError(error)
      }
      return {
        renderer,
        element,
        render(nextScene, options) {
          scene = nextScene
          sourcePoints = scene.points
          if (new Set(sourcePoints.map((point) => point.markId)).size > 1)
            throw new TypeError(
              'CityRenderer aceita uma cityMark por superfície.',
            )
          element.setAttribute('role', 'group')
          element.setAttribute(
            'aria-roledescription',
            getMapI18n(getBrowserMapLocale()).t('chartRole'),
          )
          element.setAttribute('aria-label', options.ariaLabel)
          element.tabIndex = options.tabIndex ?? 0
          if (options.ariaDescription)
            element.setAttribute('aria-description', options.ariaDescription)
          else element.removeAttribute('aria-description')
          if (!city) return
          const sharedLayout = readCityLayout(scene.nodes)
          if (!sharedLayout)
            throw new TypeError('CityRenderer requer uma cityMark.')
          const nextKey = JSON.stringify([
            sharedLayout.roadBounds,
            sharedLayout.anchors,
            sharedLayout.center,
            sourcePoints.map((point, i) => [
              point.datum.id,
              point.datum.name,
              point.datum.metric,
              point.datum.users,
              point.datum.categories,
              sharedLayout.companies[i].mask,
              point.datum.mask,
              point.datum.status,
              point.color,
              sharedLayout.companies[i].x,
              sharedLayout.companies[i].z,
              sharedLayout.companies[i].col,
              sharedLayout.companies[i].row,
            ]),
          ])
          if (nextKey !== dataKey) {
            try {
              // Copy only engine rows; both mounts share the immutable layout.
              const layout = {
                ...sharedLayout,
                companies: sourcePoints.map((p, i) => ({
                  ...p.datum,
                  ...sharedLayout.companies[i],
                  x: sharedLayout.companies[i].x,
                  z: sharedLayout.companies[i].z,
                  col: sharedLayout.companies[i].col,
                  row: sharedLayout.companies[i].row,
                })),
              }
              const resetView = city.updateCompanies(
                layout,
                new Map(
                  sourcePoints.map((p, i) => [
                    sharedLayout.companies[i].mask,
                    p.color,
                  ]),
                ),
              )
              if (resetView) city.view(view, true)
              dataKey = nextKey
              hitCache = null
              onData?.(city, { resetView })
            } catch (error) {
              if (!onError) throw error
              onError(error)
            }
          }
          city.resize()
          cameraKey = null
          updatePresentation()
        },
        clientToScene(currentScene, clientX, clientY) {
          const box = element.getBoundingClientRect()
          if (!box.width || !box.height) return null
          return {
            x: ((clientX - box.left) * currentScene.width) / box.width,
            y: ((clientY - box.top) * currentScene.height) / box.height,
          }
        },
        getPresentationPoints() {
          updatePresentation()
          return presentationPoints
        },
        subscribePresentationPoints(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        paintFocus(focus) {
          if (focus?.source === 'keyboard' && city) {
            const company = city.companiesById.get(focus.primary?.datum.id)
            if (company) city.select(company)
          }
        },
        destroy() {
          if (destroyed) return
          destroyed = true
          listeners.clear()
          element.removeEventListener('pointerdown', pointerStart)
          element.removeEventListener('pointermove', pointerMove)
          element.removeEventListener('pointerleave', pointerLeave)
          element.removeEventListener('click', click)
          if (city) {
            onDestroy?.(city)
            city.dispose()
            city = null
          }
          sourcePoints = []
          presentationPoints = []
          pointsById.clear()
          hitCache = null
          scene = null
          element.remove()
        },
      }
    },
  }
  return renderer
}
