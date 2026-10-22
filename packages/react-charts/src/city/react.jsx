import { cityStyles } from './styles'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'
import { useMapI18n } from './use-map-i18n.js'
import { useId, useRef, useState } from 'react'
import { Chart } from '../core'
import { regionsFor, categoryLabel, metricFor } from './engine/model.js'
import { useCityChart } from './use-city-chart.js'
import { EnvironmentControls } from './environment-controls.jsx'

function DistrictLabels({ layout, labelsRef, labelNodes, visible }) {
  const { format } = useMapI18n()
  return (
    <div
      ref={labelsRef}
      hidden={!visible}
      className="atlas-city-labels"
      aria-hidden="true"
    >
      {regionsFor(layout.companies)
        .filter((region) => layout.anchors[region.mask])
        .map((region) => (
          <div
            key={region.mask}
            ref={(node) => {
              if (node) labelNodes.current.set(region.mask, node)
              else labelNodes.current.delete(region.mask)
            }}
            className={`district-label atlas-city-label atlas-city-label--${region.mask}`}
            data-region={region.mask}
          >
            <span className="atlas-city-label-dot" />
            <span className="atlas-city-label-name">{region.shortLabel}</span>
            <small className="atlas-city-label-count">
              {format(
                layout.companies.filter(
                  (company) => company.mask === region.mask,
                ).length,
              )}
            </small>
          </div>
        ))}
    </div>
  )
}
function CompanyHover({ tooltip, onPointerEnter, onPointerLeave }) {
  const { t, format } = useMapI18n()
  const anchorId = `atlas-city-hover-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const contentRef = useRef(null)
  const positionRef = useRef(null)
  const arrowRef = useRef(null)
  useIsomorphicLayoutEffect(() => {
    if (!tooltip || !contentRef.current) return
    const content = contentRef.current
    const update = () => {
      const width = content.parentElement.clientWidth
      const height = content.parentElement.clientHeight
      const box = content.getBoundingClientRect()
      const left = Math.max(
        12,
        Math.min(tooltip.x - 16, width - box.width - 12),
      )
      const above = tooltip.y - box.height - 5 >= 12
      const top = Math.max(
        12,
        Math.min(
          above ? tooltip.y - box.height - 5 : tooltip.y + 5,
          height - box.height - 12,
        ),
      )
      const rules = positionRef.current.sheet.cssRules
      rules[1].style.left = `${left}px`
      rules[1].style.top = `${top}px`
      rules[2].style.left = `${tooltip.x + 0.5 - left - content.clientLeft - 5}px`
      const bottomBorder =
        parseFloat(getComputedStyle(content).borderBottomWidth) || 0
      rules[2].style.top = above
        ? `calc(100% + ${bottomBorder}px)`
        : `${-5 - content.clientTop}px`
      arrowRef.current.setAttribute(
        'd',
        above ? 'M 0 -1 L 5 5 L 10 -1' : 'M 0 6 L 5 0 L 10 6',
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(content)
    return () => observer.disconnect()
  }, [tooltip])
  if (!tooltip) return null
  return (
    <>
      <style
        ref={positionRef}
      >{`#${anchorId} { left: ${Number(tooltip.x)}px; top: ${Number(tooltip.y)}px; } #${anchorId}-content {} #${anchorId}-content .atlas-city-tooltip-arrow {}`}</style>
      <span
        id={anchorId}
        className="atlas-city-tooltip-anchor"
        data-slot="tooltip-trigger"
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        id={`${anchorId}-content`}
        role="tooltip"
        data-slot="tooltip-content"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className="atlas-city-tooltip"
      >
        <span className="atlas-city-tooltip-name">{tooltip.company.name}</span>
        <small className="atlas-city-tooltip-summary">
          {categoryLabel(tooltip.company)} · {metricFor(tooltip.company).label}:{' '}
          {format(metricFor(tooltip.company).value)} ·{' '}
          {t(`status.${tooltip.company.status}`)}
        </small>
        <svg
          className="atlas-city-tooltip-arrow"
          width="10"
          height="5"
          viewBox="0 0 10 5"
          aria-hidden="true"
        >
          <path ref={arrowRef} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  )
}
// Standard TanStack definition and ChartPoint callbacks, with a Three.js surface.
export function CityChart({
  definition,
  id,
  viewportId,
  chartRef,
  onSelect,
  onFocusChange,
  view = 'iso',
  life = true,
  lightingMode = 'auto',
  weather = 'none',
  showEnvironmentControls = false,
  effects = true,
  autoRotate = false,
  showDistrictLabels = false,
  region = 'all',
  busy = false,
  selected = null,
  children,
  ariaLabel: ariaLabelProp,
  className = '',
  theme = 'default',
}) {
  const { t, locale } = useMapI18n()
  const ariaLabel = ariaLabelProp ?? t('chartLabel')
  const instanceId = useId()
  const projectionStyleRef = useRef(null)
  const panelRef = useRef(null)
  const viewportRef = useRef(null)
  const labelsRef = useRef(null)
  const labelNodes = useRef(new Map())
  const [tooltip, setTooltip] = useState(null)
  const [lightingOverride, setLightingOverride] = useState('auto')
  const [weatherOverride, setWeatherOverride] = useState('auto')
  const weatherMode = showEnvironmentControls ? weatherOverride : 'auto'
  const {
    renderer,
    layout,
    ready,
    error,
    onRender,
    onTooltipEnter,
    onTooltipLeave,
  } = useCityChart({
    definition,
    busy,
    selected,
    region,
    currentView: view,
    life,
    lightingMode:
      showEnvironmentControls && lightingOverride !== 'auto'
        ? lightingOverride
        : lightingMode,
    weather: weatherMode === 'auto' ? weather : weatherMode,
    effects,
    autoRotate,
    chartRef,
    panelRef,
    viewportRef,
    labelsRef,
    labelNodes,
    onHover: setTooltip,
    projectionStyleRef,
    instanceId,
  })
  const environmentControls = showEnvironmentControls ? (
    <EnvironmentControls
      lighting={lightingOverride}
      weather={weatherOverride}
      onLightingChange={setLightingOverride}
      onWeatherChange={setWeatherOverride}
      disabled={!life || busy || !ready || Boolean(error)}
    />
  ) : null
  return (
    <div
      lang={locale}
      ref={panelRef}
      id={id}
      className={`atlas-city-chart ${theme ? `atlas-city-theme-${theme}` : ''} ${className}`}
      data-atlas-city-instance={instanceId}
      aria-busy={busy || !ready}
    >
      <style>{cityStyles}</style>
      <div
        ref={viewportRef}
        id={viewportId}
        className="city-chart-viewport atlas-city-viewport"
        aria-label={t('viewportLabel')}
      >
        <Chart
          definition={definition}
          renderer={renderer}
          ariaLabel={ariaLabel}
          ariaDescription={t('chartDescription')}
          className="atlas-city-host"
          style={{ height: '100%' }}
          onSelect={onSelect}
          onFocusChange={onFocusChange}
          onRender={onRender}
        />
      </div>
      <style ref={projectionStyleRef} data-atlas-city-projections="" />
      <DistrictLabels
        visible={showDistrictLabels}
        layout={layout}
        labelsRef={labelsRef}
        labelNodes={labelNodes}
      />
      <CompanyHover
        key={tooltip?.company.id}
        tooltip={tooltip}
        onPointerEnter={onTooltipEnter}
        onPointerLeave={onTooltipLeave}
      />
      {typeof children === 'function' ? (
        children({ ready, error, environmentControls, weatherMode })
      ) : (
        <>
          {children}
          {environmentControls && (
            <div className="atlas-city-environment">{environmentControls}</div>
          )}
        </>
      )}
    </div>
  )
}
