export const shadcnDashboardStyles = `
  .shadcn-dashboard {
    --sd-background: oklch(1 0 0);
    --sd-foreground: oklch(0.145 0 0);
    --sd-card: oklch(1 0 0);
    --sd-card-foreground: oklch(0.145 0 0);
    --sd-primary: oklch(0.205 0 0);
    --sd-primary-foreground: oklch(0.985 0 0);
    --sd-secondary: oklch(0.97 0 0);
    --sd-muted: oklch(0.97 0 0);
    --sd-muted-foreground: oklch(0.556 0 0);
    --sd-accent: oklch(0.97 0 0);
    --sd-border: oklch(0.922 0 0);
    --sd-input: oklch(0.922 0 0);
    --sd-sidebar: oklch(0.985 0 0);
    --sd-sidebar-accent: oklch(0.97 0 0);
    --sd-radius: 0.625rem;
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: var(--sd-foreground);
    background: var(--sd-background);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.45;
    text-rendering: geometricPrecision;
  }

  :root[data-theme='dark'] .shadcn-dashboard {
    --sd-background: oklch(0.145 0 0);
    --sd-foreground: oklch(0.985 0 0);
    --sd-card: oklch(0.205 0 0);
    --sd-card-foreground: oklch(0.985 0 0);
    --sd-primary: oklch(0.922 0 0);
    --sd-primary-foreground: oklch(0.205 0 0);
    --sd-secondary: oklch(0.269 0 0);
    --sd-muted: oklch(0.269 0 0);
    --sd-muted-foreground: oklch(0.708 0 0);
    --sd-accent: oklch(0.269 0 0);
    --sd-border: oklch(1 0 0 / 10%);
    --sd-input: oklch(1 0 0 / 15%);
    --sd-sidebar: oklch(0.205 0 0);
    --sd-sidebar-accent: oklch(0.269 0 0);
  }

  .shadcn-dashboard,
  .shadcn-dashboard * {
    box-sizing: border-box;
  }

  .shadcn-dashboard :where(button, select, input) {
    min-height: 0;
    color: inherit;
    font: inherit;
  }

  .sd-viewport {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: auto;
    background: var(--sd-sidebar);
  }

  .sd-sidebar {
    position: sticky;
    top: 0;
    display: flex;
    flex: 0 0 256px;
    height: 100%;
    flex-direction: column;
    border-right: 1px solid var(--sd-border);
    background: var(--sd-sidebar);
  }

  .sd-sidebar-inner {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: var(--sd-sidebar);
  }

  .sd-brand,
  .sd-user {
    display: flex;
    min-height: 48px;
    align-items: center;
    gap: 10px;
    padding: 8px;
  }

  .sd-brand {
    min-height: 49px;
    border-bottom: 1px solid var(--sd-border);
  }

  .sd-brand-mark {
    width: 20px;
    height: 20px;
    color: var(--sd-foreground);
  }

  .sd-brand-name {
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sd-nav {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 18px;
    overflow: auto;
    padding: 4px 8px 12px;
  }

  .sd-nav-group {
    display: grid;
    gap: 2px;
  }

  .sd-nav-label {
    padding: 6px 8px 3px;
    color: var(--sd-muted-foreground);
    font-size: 12px;
    font-weight: 500;
  }

  .sd-nav-bottom {
    margin-top: auto;
  }

  .sd-nav-item {
    display: flex;
    width: 100%;
    height: 32px;
    align-items: center;
    gap: 9px;
    padding: 0 8px;
    border: 0;
    border-radius: 6px;
    color: var(--sd-foreground);
    background: transparent;
    cursor: default;
    text-align: left;
  }

  .sd-nav-item:hover,
  .sd-nav-item[data-active='true'] {
    background: var(--sd-sidebar-accent);
  }

  .sd-nav-item svg,
  .sd-user svg,
  .sd-header svg,
  .sd-toolbar svg,
  .sd-badge svg {
    width: 16px;
    height: 16px;
    flex: none;
  }

  .sd-nav-more {
    margin-left: auto;
    color: var(--sd-muted-foreground);
  }

  .sd-user {
    border-top: 1px solid transparent;
  }

  .sd-avatar {
    display: grid;
    width: 32px;
    height: 32px;
    flex: none;
    place-items: center;
    border-radius: 8px;
    color: var(--sd-primary-foreground);
    background: var(--sd-primary);
    font-size: 11px;
    font-weight: 650;
  }

  .sd-user-copy {
    min-width: 0;
  }

  .sd-user-copy strong,
  .sd-user-copy span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sd-user-copy strong {
    font-size: 13px;
    font-weight: 600;
  }

  .sd-user-copy span {
    color: var(--sd-muted-foreground);
    font-size: 11px;
  }

  .sd-main {
    min-width: 0;
    flex: 1;
    margin: 0;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: var(--sd-background);
  }

  .sd-main-scroll {
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  .sd-header {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    height: 49px;
    align-items: center;
    gap: 10px;
    padding: 0 24px;
    border-bottom: 1px solid var(--sd-border);
    background: color-mix(in srgb, var(--sd-background) 94%, transparent);
    backdrop-filter: blur(8px);
  }

  .sd-icon-button {
    display: inline-grid;
    width: 32px;
    height: 32px;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
  }

  .sd-separator {
    display: none;
    width: 1px;
    height: 16px;
    margin: 0 6px;
    background: var(--sd-border);
  }

  .sd-menu-button {
    display: none;
  }

  .sd-header h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .sd-quick-create {
    display: inline-flex;
    height: 32px;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    padding: 0 11px;
    border: 0;
    border-radius: 6px;
    color: var(--sd-primary-foreground);
    background: var(--sd-primary);
    font-size: 13px;
    font-weight: 600;
  }

  .shadcn-dashboard .sd-quick-create {
    color: var(--sd-primary-foreground);
  }

  .sd-content {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
  }

  .sd-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .sd-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--sd-border);
    border-radius: var(--sd-radius);
    color: var(--sd-card-foreground);
    background:
      linear-gradient(to top, color-mix(in srgb, var(--sd-primary) 5%, transparent), transparent 45%),
      var(--sd-card);
    box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
  }

  :root[data-theme='dark'] .sd-card {
    background: var(--sd-card);
  }

  .sd-stat-card {
    min-height: 200px;
    padding: 23px 23px 20px;
  }

  .sd-stat-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 3px 12px;
  }

  .sd-stat-label,
  .sd-chart-description {
    color: var(--sd-muted-foreground);
    font-size: 14px;
  }

  .sd-stat-value {
    grid-column: 1;
    margin: 0;
    font-size: clamp(24px, 2.35cqw, 30px);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }

  .sd-badge {
    display: inline-flex;
    height: 23px;
    align-items: center;
    gap: 4px;
    padding: 0 7px;
    border: 1px solid var(--sd-border);
    border-radius: 7px;
    color: var(--sd-foreground);
    background: transparent;
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .sd-stat-foot {
    display: grid;
    gap: 3px;
    margin-top: 30px;
    font-size: 14px;
  }

  .sd-stat-trend {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 7px;
    overflow: hidden;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sd-stat-trend svg {
    width: 16px;
    height: 16px;
    flex: none;
  }

  .sd-stat-detail {
    overflow: hidden;
    color: var(--sd-muted-foreground);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sd-chart-card {
    height: 392px;
    background: var(--sd-card);
  }

  .sd-chart-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 16px;
    align-items: start;
    padding: 24px 24px 0;
  }

  .sd-chart-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .sd-chart-description {
    grid-column: 1;
  }

  .sd-range-buttons {
    grid-column: 2;
    grid-row: 1 / span 2;
    display: inline-flex;
    height: 32px;
    overflow: hidden;
    border: 1px solid var(--sd-border);
    border-radius: 8px;
  }

  .sd-range-button {
    height: 30px;
    padding: 0 16px;
    border: 0;
    border-left: 1px solid var(--sd-border);
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  .sd-range-button:first-child {
    border-left: 0;
  }

  .sd-range-button:hover,
  .sd-range-button[data-active='true'] {
    background: var(--sd-accent);
  }

  .sd-range-select {
    display: none;
    grid-column: 2;
    grid-row: 1 / span 2;
    width: 160px;
    height: 32px;
    padding: 0 30px 0 10px;
    border: 1px solid var(--sd-border);
    border-radius: 8px;
    background: var(--sd-background);
    font-size: 13px;
  }

  .sd-chart-stage {
    position: relative;
    width: 100%;
    height: 274px;
    margin-top: 24px;
    padding: 8px 24px 0;
  }

  .sd-chart-stage > * {
    width: 100%;
    height: 100%;
  }

  .sd-chart-stage .ts-chart-host {
    color: var(--sd-muted-foreground);
    font-size: 12px;
  }

  .sd-chart-stage .ts-chart__grid line {
    stroke: var(--sd-border);
  }

  .sd-chart-stage .ts-chart__axis text {
    fill: var(--sd-muted-foreground);
  }

  .ts-chart-tooltip.sd-chart-tooltip {
    min-width: 138px !important;
    padding: 8px 10px !important;
    border: 1px solid var(--sd-border) !important;
    border-radius: 8px !important;
    color: var(--sd-card-foreground) !important;
    background: var(--sd-card) !important;
    box-shadow: 0 2px 6px rgb(0 0 0 / 8%) !important;
    font: 12px/1.45 Inter, ui-sans-serif, system-ui, sans-serif !important;
  }

  .ts-chart-tooltip.sd-chart-tooltip .ts-chart-tooltip__title {
    margin-bottom: 5px !important;
    font-weight: 500 !important;
  }

  .ts-chart-tooltip.sd-chart-tooltip .ts-chart-tooltip__row {
    grid-template-columns: 8px minmax(0, 1fr) auto !important;
    column-gap: 7px !important;
  }

  .ts-chart-tooltip.sd-chart-tooltip .ts-chart-tooltip__swatch {
    width: 8px !important;
    height: 8px !important;
    border-radius: 999px !important;
  }

  .sd-recharts-tooltip {
    min-width: 138px;
    padding: 8px 10px;
    border: 1px solid var(--sd-border);
    border-radius: 8px;
    color: var(--sd-card-foreground);
    background: var(--sd-card);
    box-shadow: 0 2px 6px rgb(0 0 0 / 8%);
    font-size: 12px;
    line-height: 1.45;
  }

  .sd-recharts-tooltip-date {
    margin-bottom: 5px;
    font-weight: 500;
  }

  .sd-recharts-tooltip-row {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto;
    align-items: center;
    gap: 7px;
  }

  .sd-recharts-tooltip-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--sd-primary);
  }

  .sd-table-section {
    display: grid;
    gap: 24px;
  }

  .sd-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sd-tabs {
    display: inline-flex;
    height: 36px;
    align-items: center;
    padding: 3px;
    border-radius: 9px;
    background: var(--sd-muted);
  }

  .sd-tab {
    height: 30px;
    padding: 0 11px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    font-size: 13px;
  }

  .sd-tab[data-active='true'] {
    border: 1px solid var(--sd-border);
    background: var(--sd-background);
    box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  }

  .sd-toolbar-actions {
    display: flex;
    gap: 8px;
  }

  .sd-button {
    display: inline-flex;
    height: 32px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 11px;
    border: 1px solid var(--sd-border);
    border-radius: 8px;
    background: var(--sd-background);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  .sd-table-wrap {
    overflow: hidden;
    border: 1px solid var(--sd-border);
    border-radius: 9px;
  }

  .sd-table-scroll {
    overflow-x: auto;
  }

  .sd-table {
    width: 100%;
    min-width: 860px;
    border-collapse: collapse;
    font-size: 13px;
  }

  .sd-table th,
  .sd-table td {
    height: 48px;
    padding: 0 12px;
    border-bottom: 1px solid var(--sd-border);
    text-align: left;
    white-space: nowrap;
  }

  .sd-table th {
    height: 40px;
    color: var(--sd-muted-foreground);
    background: var(--sd-muted);
    font-weight: 500;
  }

  .sd-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .sd-grip {
    color: var(--sd-muted-foreground);
    letter-spacing: -3px;
  }

  .sd-checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--sd-primary);
  }

  .sd-table-link {
    color: var(--sd-foreground);
    font-weight: 500;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--sd-muted-foreground) 45%, transparent);
    text-underline-offset: 4px;
  }

  .sd-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .sd-status-dot {
    width: 8px;
    height: 8px;
    border: 1.5px solid currentColor;
    border-radius: 999px;
  }

  .sd-status[data-done='true'] .sd-status-dot {
    border-color: #22c55e;
    background: #22c55e;
    box-shadow: inset 0 0 0 1.5px var(--sd-card);
  }

  .sd-number-input {
    width: 64px;
    height: 32px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    text-align: right;
  }

  .sd-number-input:hover {
    background: color-mix(in srgb, var(--sd-input) 30%, transparent);
  }

  .sd-table-footer {
    display: flex;
    min-height: 36px;
    align-items: center;
    gap: 24px;
    color: var(--sd-muted-foreground);
    font-size: 13px;
  }

  .sd-pagination {
    display: flex;
    margin-left: auto;
    align-items: center;
    gap: 8px;
    color: var(--sd-foreground);
    font-weight: 500;
  }

  @container (min-width: 1000px) {
    .sd-cards {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @container (max-width: 540px) {
    .sd-cards {
      grid-template-columns: 1fr;
    }

    .sd-stat-card {
      min-height: 132px;
    }

    .sd-tabs {
      display: none;
    }

    .sd-toolbar::before {
      content: 'Outline';
      display: inline-flex;
      height: 32px;
      align-items: center;
      padding: 0 10px;
      border: 1px solid var(--sd-border);
      border-radius: 8px;
      font-size: 13px;
    }
  }

  @container (max-width: 767px) {
    .sd-range-buttons {
      display: none;
    }

    .sd-range-select {
      display: block;
    }
  }

  @media (max-width: 767px) {
    .sd-sidebar {
      display: none;
    }

    .sd-main {
      margin: 0;
      border: 0;
      border-radius: 0;
    }

    .sd-header,
    .sd-content {
      padding-inline: 16px;
    }

    .sd-menu-button {
      display: inline-grid;
    }

    .sd-separator {
      display: block;
    }

    .sd-quick-create {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .sd-chart-card {
      height: 414px;
    }

    .sd-chart-header {
      grid-template-columns: 1fr;
    }

    .sd-range-select {
      grid-column: 1;
      grid-row: 3;
      margin-top: 8px;
    }

    .sd-chart-stage {
      padding-inline: 8px;
    }

    .sd-button span {
      display: none;
    }
  }
`
