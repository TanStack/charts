// Scoped presentation owned by the React renderer.
export const cityStyles = `/* Zero specificity: a consumer class can override tokens in any import order. */
:where(.atlas-city-theme-default) {
  --atlas-city-background: #e9ede4;
  --atlas-city-card: #fff;
  --atlas-city-text: #0f172a;
  --atlas-city-border: #e2e8f0;
  --atlas-city-muted: #1e293b;
  --atlas-city-overlay-text: #000;
  --atlas-city-surface-tint: #e2e8f0;
  --atlas-city-surface-background: color-mix(
    in srgb,
    var(--atlas-city-surface-tint) 68%,
    transparent
  );
  --atlas-city-surface-hover-background: color-mix(
    in srgb,
    var(--atlas-city-surface-tint) 78%,
    transparent
  );
  --atlas-city-surface-blur: 10px;
  --atlas-city-selected-background: color-mix(
    in srgb,
    color-mix(in srgb, var(--atlas-city-accent) 70%, #000) 88%,
    transparent
  );
  --atlas-city-selected-hover-background: color-mix(
    in srgb,
    var(--atlas-city-accent-hover) 88%,
    transparent
  );
  --atlas-city-accent: #1f72ea;
  --atlas-city-accent-hover: color-mix(
    in srgb,
    var(--atlas-city-accent) 60%,
    #000
  );
  --atlas-city-on-accent: #fff;
  --atlas-city-tooltip-background: var(--atlas-city-surface-background);
  --atlas-city-tooltip-text: #0f172a;
  --atlas-city-font-family:
    system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --atlas-city-font-size: 12px;
  --atlas-city-radius: 6px;
  --atlas-city-panel-radius: 8px;
  --atlas-city-shadow: 0 4px 6px #0001;
  --atlas-city-control-padding: 8px 12px;
  --atlas-city-height: 560px;
  --atlas-city-region-1: #4b91ef;
  --atlas-city-region-2: #e281af;
  --atlas-city-region-3: #ab7cdd;
  --atlas-city-region-4: #ecc456;
  --atlas-city-region-5: #47b8b2;
  --atlas-city-region-6: #e99b55;
  --atlas-city-region-7: #7777ca;
}



.atlas-city-chart,
.atlas-city-map {
  position: relative;
  min-width: 0;
  color: var(--atlas-city-text);
  font-family: var(--atlas-city-font-family);
  font-size: var(--atlas-city-font-size);
  line-height: 1.5;
  background: var(--atlas-city-background);
}
.atlas-city-chart {
  flex: 1;
  min-height: 520px;
  overflow: hidden;
}
.atlas-city-chart:has(> .atlas-map-layout) {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  min-height: min-content;
}
.atlas-map-layout {
  min-height: 520px;
}
.atlas-city-map {
  min-height: var(--atlas-city-height);
}
.atlas-city-map > .atlas-city-chart {
  display: flex;
  flex-direction: column;
  min-height: var(--atlas-city-height);
}
.atlas-city-map:fullscreen {
  width: 100%;
  height: 100%;
}
.atlas-city-viewport,
.atlas-city-labels {
  position: absolute;
  inset: 0;
}
.atlas-city-viewport {
  touch-action: none;
  outline: none;
}
.atlas-city-viewport canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.atlas-city-labels {
  pointer-events: none;
  overflow: hidden;
}
.atlas-city-labels[hidden] {
  display: none;
}
.atlas-city-label {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 6px;
  transform: translate(-50%, -50%);
  padding: 6px 8px;
  border: 1px solid var(--atlas-city-border);
  border-radius: var(--atlas-city-radius);
  background: var(--atlas-city-surface-background);
  box-shadow: var(--atlas-city-shadow);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.atlas-city-label-dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
}
.atlas-city-label small {
  color: var(--atlas-city-muted);
  font-size: 9px;
  font-weight: 400;
}
.atlas-city-label-name {
  color: var(--atlas-city-text);
}
.atlas-city-chart .text-muted-foreground,
.atlas-city-chart .section-label {
  color: var(--atlas-city-muted);
}
.atlas-city-title,
.atlas-map-heading,
.atlas-map-heading .text-muted-foreground,
.atlas-city-chart .atlas-map-instructions,
.atlas-city-chart .atlas-map-compass,
.atlas-map-footer-text {
  color: var(--atlas-city-overlay-text);
}
.atlas-city-chart [data-variant='default'] {
  background: var(--atlas-city-selected-background);
  color: var(--atlas-city-on-accent);
}
.atlas-city-chart [data-variant='default']:enabled:hover,
.atlas-city-map button[aria-pressed='true']:enabled:hover {
  background: var(--atlas-city-selected-hover-background);
}
.atlas-city-tooltip {
  position: absolute;
  z-index: 50;
  max-width: min(256px, calc(100% - 24px));
  padding: var(--atlas-city-control-padding);
  border: 1px solid var(--atlas-city-border);
  border-radius: var(--atlas-city-radius);
  background: var(--atlas-city-tooltip-background);
  color: var(--atlas-city-tooltip-text);
  box-shadow: var(--atlas-city-shadow);
  font-family: var(--atlas-city-font-family);
  font-size: 11px;
  pointer-events: auto;
}
.atlas-city-tooltip small {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  color: var(--atlas-city-muted);
}
.atlas-city-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--atlas-city-control-padding);
  border: 1px solid var(--atlas-city-border);
  border-radius: var(--atlas-city-radius);
  background: var(--atlas-city-surface-background);
  color: var(--atlas-city-text);
  font-size: var(--atlas-city-font-size);
  pointer-events: auto;
}
.atlas-city-control:has(:disabled) {
  opacity: 0.5;
}
.atlas-city-select {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--atlas-city-text);
  font: inherit;
  cursor: pointer;
}
.atlas-city-environment,
.atlas-city-scene-controls {
  position: absolute;
  right: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  pointer-events: none;
}
.atlas-city-map button,
.atlas-city-map input,
.atlas-city-map fieldset {
  box-sizing: border-box;
  margin: 0;
  font: inherit;
}
.atlas-city-map button,
.atlas-city-search input {
  padding: var(--atlas-city-control-padding);
  border: 1px solid var(--atlas-city-border);
  border-radius: var(--atlas-city-radius);
  background: var(--atlas-city-surface-background);
  color: var(--atlas-city-text);
}
.atlas-city-search-input::placeholder {
  color: var(--atlas-city-muted);
  opacity: 1;
}
.atlas-city-map button {
  cursor: pointer;
}
.atlas-city-map button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.atlas-city-map button:focus-visible,
.atlas-city-map input:focus-visible,
.atlas-city-select:focus-visible {
  outline: 2px solid var(--atlas-city-accent);
  outline-offset: 2px;
}
.atlas-city-map button[aria-pressed='true'] {
  background: var(--atlas-city-selected-background);
  color: var(--atlas-city-on-accent);
}
.atlas-city-top-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  left: 16px;
  z-index: 11;
  display: flex;
  flex-direction: column;
  gap: var(--atlas-city-overlay-gap, 12px);
  pointer-events: none;
}
.atlas-city-top-controls[hidden],
.atlas-city-scene-controls[hidden] {
  display: none;
}
.atlas-city-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--atlas-city-overlay-gap, 12px);
}
.atlas-city-title {
  min-width: 0;
  overflow-wrap: anywhere;
}
.atlas-city-search {
  position: relative;
  flex-shrink: 0;
  width: min(240px, 55%);
  pointer-events: auto;
}
.atlas-city-search input {
  width: 100%;
}
.atlas-city-results {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  padding: 4px;
  border: 1px solid var(--atlas-city-border);
  border-radius: var(--atlas-city-radius);
  background: var(--atlas-city-surface-background);
}
.atlas-city-results button {
  display: block;
  width: 100%;
  text-align: left;
}
.atlas-city-perspectives {
  align-self: flex-start;
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 0;
  pointer-events: auto;
  border-radius: var(--atlas-city-radius);
  background: var(--atlas-city-surface-background);
  backdrop-filter: blur(var(--atlas-city-surface-blur));
}
.atlas-city-perspectives legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.atlas-city-zoom {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 16px;
  z-index: 10;
  display: grid;
  gap: 4px;
}
.atlas-city-zoom button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 22px;
}
.atlas-city-control input {
  width: 16px;
  height: 16px;
  accent-color: var(--atlas-city-accent);
}
.atlas-city-details,
.atlas-city-message {
  align-self: flex-start;
  max-width: min(280px, calc(100% - 64px));
  box-sizing: border-box;
  padding: 16px;
  border: 1px solid var(--atlas-city-border);
  border-radius: var(--atlas-city-panel-radius);
  background: var(--atlas-city-surface-background);
  pointer-events: auto;
}
.atlas-city-message {
  margin: 0;
}
.atlas-city-details > button:first-child {
  float: right;
  margin-left: 8px;
}
.atlas-city-loading {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  place-content: center;
  padding: 24px;
  background: var(--atlas-city-surface-background);
  text-align: center;
}
@media (min-width: 1024px) {
  .atlas-city-chart {
    min-height: 460px;
  }
  .atlas-map-layout {
    min-height: 460px;
  }
}

.atlas-city-host {
  /* Override the TanStack host's inline 320px placeholder; fill our viewport. */
  height: 100% !important;
}
.atlas-city-label[hidden] {
  display: none;
}
.atlas-city-label[data-dimmed='true'] {
  opacity: 0.2;
}
.atlas-city-label-dot {
  background: currentColor;
}
.atlas-city-label--1 {
  color: var(--atlas-city-region-1);
}
.atlas-city-label--2 {
  color: var(--atlas-city-region-2);
}
.atlas-city-label--3 {
  color: var(--atlas-city-region-3);
}
.atlas-city-label--4 {
  color: var(--atlas-city-region-4);
}
.atlas-city-label--5 {
  color: var(--atlas-city-region-5);
}
.atlas-city-label--6 {
  color: var(--atlas-city-region-6);
}
.atlas-city-label--7 {
  color: var(--atlas-city-region-7);
}

.atlas-city-tooltip-anchor {
  position: absolute;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
.atlas-city-tooltip-arrow {
  position: absolute;
  overflow: visible;
  fill: var(--atlas-city-tooltip-background);
  stroke: var(--atlas-city-border);
}
.atlas-city-chart .city-slide-snapshot {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: var(--atlas-city-background);
  overflow: hidden;
}
.atlas-city-chart .city-slide-snapshot > canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.atlas-city-chart .city-slide-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.atlas-city-chart.city-sliding .city-chart-viewport {
  pointer-events: none;
}

.atlas-city-label,
.atlas-city-tooltip,
.atlas-city-control,
.atlas-city-search-input,
.atlas-city-results,
.atlas-city-camera-button,
.atlas-city-details,
.atlas-city-message,
.atlas-city-loading {
  backdrop-filter: blur(var(--atlas-city-surface-blur));
}
.atlas-city-map .atlas-city-perspective-button,
.atlas-city-map .atlas-city-search-result,
.atlas-city-map .atlas-city-details-close {
  background: transparent;
}
.atlas-city-map button:enabled:hover {
  background: var(--atlas-city-surface-hover-background);
}
.atlas-city-map .atlas-city-perspective-button[aria-pressed='true'] {
  background: var(--atlas-city-selected-background);
}
.atlas-city-map
  .atlas-city-perspective-button[aria-pressed='true']:enabled:hover {
  background: var(--atlas-city-selected-hover-background);
}
.atlas-city-select-option {
  background: var(--atlas-city-card);
  color: var(--atlas-city-text);
}
.atlas-city-chart
  :is(
    .atlas-map-search-input,
    .atlas-map-perspectives,
    .atlas-map-zoom,
    .atlas-map-toggle,
    .atlas-map-details,
    .atlas-map-message,
    .atlas-map-loading,
    .atlas-map-loading-card
  ) {
  background: var(--atlas-city-surface-background);
  backdrop-filter: blur(var(--atlas-city-surface-blur));
  color: var(--atlas-city-text);
}
.atlas-city-chart .atlas-map-search-input::placeholder {
  color: var(--atlas-city-muted);
  opacity: 1;
}
.atlas-city-chart .atlas-map-perspective-option {
  color: var(--atlas-city-muted);
}
.atlas-city-chart .atlas-map-perspectives input:checked + span {
  background: var(--atlas-city-selected-background);
  color: var(--atlas-city-on-accent);
}
.atlas-city-chart .atlas-map-camera-button:enabled:hover,
.atlas-city-chart .atlas-map-details [data-variant='ghost']:enabled:hover {
  background: var(--atlas-city-surface-hover-background);
  color: var(--atlas-city-text);
}
.atlas-city-chart .atlas-map-compass-arrow {
  transform: rotate(var(--atlas-city-north-angle, 0rad));
}
.atlas-city-chart .atlas-map-compass {
  color: var(--atlas-city-monitor-text, var(--atlas-city-overlay-text));
}

.atlas-company-monitor {
  align-self: flex-start;
  width: 272px;
  max-width: calc(100% - 56px);
  color: var(--atlas-city-monitor-text, var(--atlas-city-overlay-text));
  pointer-events: auto;
}
.atlas-monitor-clock {
  display: grid;
  gap: 2px;
  font-size: 10px;
  color: inherit;
}
.atlas-monitor-clock > time {
  font-family: ui-monospace, monospace;
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.05em;
  color: inherit;
}
.atlas-monitor-metrics,
.atlas-monitor-alerts {
  border-top: 1px solid currentColor;
  margin-top: 12px;
  padding-top: 12px;
}
.atlas-monitor-metrics {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}
.atlas-monitor-alerts h2 {
  font-size: 12px;
  font-weight: 600;
}
.atlas-monitor-caption,
.atlas-monitor-empty {
  font-size: 10px;
  line-height: 1.5;
  color: inherit;
  margin-top: 4px;
}
.atlas-monitor-alerts ol {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, auto);
  grid-auto-flow: column;
  gap: 8px 12px;
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.atlas-monitor-alerts li {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 2px;
  border-left: 2px solid var(--atlas-city-risk-critical, #db654d);
  padding-left: 8px;
  font-size: 11px;
}
.atlas-monitor-alerts li strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.atlas-monitor-alerts li time {
  font-size: 10px;
  color: inherit;
}

.atlas-monitor-metrics p {
  margin: 0;
  font-size: 10px;
}
.atlas-monitor-total {
  display: block;
  margin: 4px 0;
  font-size: 36px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.05em;
}
.atlas-monitor-statuses {
  display: grid;
  gap: 8px;
}
.atlas-monitor-status {
  display: flex;
  align-items: center;
  gap: 6px;
}
.atlas-monitor-status > span {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--atlas-city-risk-healthy, #4c9878);
}
.atlas-monitor-status--warning > span {
  background: var(--atlas-city-risk-warning, #c28b29);
}
.atlas-monitor-status--critical > span {
  background: var(--atlas-city-risk-critical, #db654d);
}
.atlas-city-layout {
  position: relative;
  z-index: 10;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
  min-height: var(--atlas-city-height);
  padding: 16px 16px 44px;
  pointer-events: none;
}
.atlas-city-layout > .atlas-city-top-controls {
  position: relative;
  inset: auto;
  flex-shrink: 0;
}
.atlas-city-monitor-layout {
  flex-shrink: 0;
}
.atlas-city-monitor-layout .atlas-company-monitor {
  max-width: calc(100% - 56px);
}
.atlas-city-monitor-layout .atlas-monitor-alerts h2 {
  margin: 0;
}
.atlas-city-bottom-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}
.atlas-city-selection:empty {
  display: none;
}
.atlas-city-selection .atlas-city-details {
  width: min(310px, calc(100% - 56px));
  max-width: none;
  margin-left: auto;
  margin-right: 56px;
}
.atlas-city-details-dates {
  font-size: 10px;
}
.atlas-city-details-dates dd {
  margin: 0 0 8px;
}
.atlas-city-map .atlas-city-compass {
  align-self: flex-start;
  flex-shrink: 0;
  pointer-events: auto;
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 4px;
  border: 0;
  background: transparent;
  font-size: 9px;
}
.atlas-city-compass .atlas-map-compass-arrow {
  font-size: 30px;
  line-height: 1;
}
.atlas-city-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 6px 16px;
  border-top: 1px solid var(--atlas-city-border);
  background: var(--atlas-city-surface-background);
  color: var(--atlas-city-text);
  font-size: 9px;
  pointer-events: none;
}
.atlas-city-map .atlas-city-scene-controls {
  position: static;
  flex-shrink: 0;
}
.atlas-city-scene-controls[data-controls-visible='false'] {
  visibility: hidden;
}
.atlas-city-map:fullscreen > .atlas-city-chart {
  min-height: 100%;
}
.atlas-city-map:fullscreen .atlas-city-layout {
  min-height: 100vh;
}
.atlas-city-map:fullscreen {
  overflow: auto;
}
@media (min-width: 640px) {
  .atlas-city-layout {
    padding: 24px 24px 44px;
  }
  .atlas-city-zoom {
    right: 24px;
  }
}
@media (max-width: 639px) {
  .atlas-city-header {
    flex-direction: column;
  }
  .atlas-city-search {
    width: 100%;
  }
}
`
