import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getShadcnCatalogSpec,
  shadcnActivities,
  shadcnBrowsers,
  shadcnColors,
  shadcnMonths,
  type ShadcnCatalogSpec,
} from './shadcn-catalog-data'
import {
  ShadcnChartCard,
  ShadcnTrendFooter,
  shadcnChartMount,
} from './shadcn-chart-card'
import type { ReactNode } from 'react'
import type { ConformanceInput } from '../types'

export function createShadcnRechartsExample(name: string) {
  const spec = getShadcnCatalogSpec(name)

  function RechartsView({ input }: { input: ConformanceInput }) {
    return (
      <ShadcnChartCard
        input={input}
        title={spec.title}
        description={spec.description}
        chartShape={spec.square ? 'square' : 'wide'}
        centered={spec.square}
        chartFooter={spec.legend ? <RechartsLegend spec={spec} /> : undefined}
        footer={
          spec.family === 'tooltip' ? undefined : (
            <ShadcnTrendFooter note={spec.footerNote} />
          )
        }
      >
        {({ width, height }) => renderRechartsChart(spec, width, height)}
      </ShadcnChartCard>
    )
  }

  return { mount: shadcnChartMount(RechartsView) }
}

function renderRechartsChart(
  spec: ShadcnCatalogSpec,
  width: number,
  height: number,
): ReactNode {
  if (spec.family === 'area') return areaChart(spec, width, height)
  if (spec.family === 'bar') return barChart(spec, width, height)
  if (spec.family === 'line') return lineChart(spec, width, height)
  if (spec.family === 'pie') return pieChart(spec, width, height)
  if (spec.family === 'radar') return radarChart(spec, width, height)
  if (spec.family === 'radial') return radialChart(spec, width, height)
  return tooltipChart(spec, width, height)
}

function areaChart(spec: ShadcnCatalogSpec, width: number, height: number) {
  const multi =
    spec.variant === 'axes' ||
    spec.variant === 'gradient' ||
    spec.variant === 'icons' ||
    spec.variant === 'interactive' ||
    spec.variant === 'legend' ||
    spec.variant.startsWith('stacked')
  const type =
    spec.variant === 'linear'
      ? 'linear'
      : spec.variant === 'step'
        ? 'step'
        : 'natural'
  return (
    <AreaChart width={width} height={height} data={shadcnMonths}>
      {spec.variant === 'gradient' ? (
        <defs>
          <linearGradient
            id="recharts-area-desktop"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="5%" stopColor={shadcnColors[0]} stopOpacity={0.8} />
            <stop offset="95%" stopColor={shadcnColors[0]} stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="recharts-area-mobile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={shadcnColors[1]} stopOpacity={0.8} />
            <stop offset="95%" stopColor={shadcnColors[1]} stopOpacity={0.08} />
          </linearGradient>
        </defs>
      ) : null}
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="month"
        tickLine={false}
        axisLine={false}
        tickFormatter={shortMonth}
      />
      {spec.variant === 'axes' ? (
        <YAxis tickLine={false} axisLine={false} />
      ) : null}
      <Tooltip cursor={false} />
      <Area
        dataKey="desktop"
        type={type}
        stackId={multi ? 'visitors' : undefined}
        fill={
          spec.variant === 'gradient'
            ? 'url(#recharts-area-desktop)'
            : shadcnColors[0]
        }
        fillOpacity={spec.variant === 'gradient' ? 1 : 0.42}
        stroke={shadcnColors[0]}
        isAnimationActive={false}
      />
      {multi ? (
        <Area
          dataKey="mobile"
          type={type}
          stackId="visitors"
          fill={
            spec.variant === 'gradient'
              ? 'url(#recharts-area-mobile)'
              : shadcnColors[1]
          }
          fillOpacity={spec.variant === 'gradient' ? 1 : 0.42}
          stroke={shadcnColors[1]}
          isAnimationActive={false}
        />
      ) : null}
      {spec.variant === 'stacked-expand' ? (
        <Area
          dataKey="tablet"
          type={type}
          stackId="visitors"
          fill={shadcnColors[2]}
          fillOpacity={0.42}
          stroke={shadcnColors[2]}
          isAnimationActive={false}
        />
      ) : null}
      {spec.legend ? <Legend /> : null}
    </AreaChart>
  )
}

function barChart(spec: ShadcnCatalogSpec, width: number, height: number) {
  const horizontal =
    spec.variant === 'horizontal' ||
    spec.variant === 'label-custom' ||
    spec.variant === 'mixed'
  const negativeData = shadcnMonths.map((row, index) => ({
    ...row,
    desktop: index === 2 || index === 4 ? -row.desktop : row.desktop,
  }))
  const data = spec.variant === 'negative' ? negativeData : shadcnMonths
  if (horizontal) {
    return (
      <BarChart width={width} height={height} data={data} layout="vertical">
        <XAxis type="number" hide />
        <YAxis
          dataKey="month"
          type="category"
          tickLine={false}
          axisLine={false}
          width={68}
          tickFormatter={shortMonth}
        />
        <Tooltip cursor={false} />
        <Bar
          dataKey="desktop"
          fill={shadcnColors[0]}
          radius={4}
          isAnimationActive={false}
        >
          {spec.variant === 'label-custom' ? (
            <LabelList
              dataKey="desktop"
              position="insideRight"
              fill="var(--background)"
            />
          ) : null}
        </Bar>
      </BarChart>
    )
  }
  return (
    <BarChart width={width} height={height} data={data}>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="month"
        tickLine={false}
        axisLine={false}
        tickFormatter={shortMonth}
      />
      <Tooltip cursor={false} />
      <Bar
        dataKey="desktop"
        stackId={spec.variant === 'stacked' ? 'visitors' : undefined}
        fill={shadcnColors[0]}
        radius={4}
        isAnimationActive={false}
      >
        {spec.variant === 'active'
          ? data.map((row) => (
              <Cell
                key={row.month}
                fill={
                  row.month === 'January' ? shadcnColors[1] : shadcnColors[0]
                }
              />
            ))
          : null}
        {spec.variant === 'label' ? (
          <LabelList dataKey="desktop" position="top" />
        ) : null}
      </Bar>
      {spec.variant === 'multiple' || spec.variant === 'stacked' ? (
        <Bar
          dataKey="mobile"
          stackId={spec.variant === 'stacked' ? 'visitors' : undefined}
          fill={shadcnColors[1]}
          radius={4}
          isAnimationActive={false}
        />
      ) : null}
      {spec.legend ? <Legend /> : null}
    </BarChart>
  )
}

function lineChart(spec: ShadcnCatalogSpec, width: number, height: number) {
  const type =
    spec.variant === 'linear'
      ? 'linear'
      : spec.variant === 'step'
        ? 'step'
        : 'natural'
  const dots = spec.variant.includes('dots')
  const labels = spec.variant.includes('label')
  const multiple = spec.variant === 'multiple' || spec.variant === 'interactive'
  return (
    <LineChart width={width} height={height} data={shadcnMonths}>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="month"
        tickLine={false}
        axisLine={false}
        tickFormatter={shortMonth}
      />
      <Tooltip cursor={false} />
      <Line
        dataKey="desktop"
        type={type}
        stroke={shadcnColors[0]}
        strokeWidth={2}
        dot={dots ? { r: spec.variant === 'dots-custom' ? 5 : 4 } : false}
        isAnimationActive={false}
      >
        {labels ? (
          <LabelList
            dataKey={spec.variant === 'label-custom' ? 'month' : 'desktop'}
            position="top"
          />
        ) : null}
      </Line>
      {multiple ? (
        <Line
          dataKey="mobile"
          type={type}
          stroke={shadcnColors[1]}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      ) : null}
    </LineChart>
  )
}

function pieChart(spec: ShadcnCatalogSpec, width: number, height: number) {
  const donut = spec.variant.includes('donut') || spec.variant === 'stacked'
  const labels = spec.variant.includes('label')
  return (
    <PieChart width={width} height={height}>
      <Tooltip />
      <Pie
        data={shadcnBrowsers}
        dataKey="visitors"
        nameKey="browser"
        innerRadius={donut ? 58 : 0}
        outerRadius={90}
        strokeWidth={spec.variant === 'separator-none' ? 0 : 4}
        label={labels}
        isAnimationActive={false}
      >
        {shadcnBrowsers.map((row, index) => (
          <Cell key={row.browser} fill={shadcnColors[index]} />
        ))}
      </Pie>
      {spec.variant === 'donut-text' ? (
        <>
          <text
            x={width / 2}
            y={height / 2 - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--foreground)"
            fontSize={30}
            fontWeight={700}
          >
            1,125
          </text>
          <text
            x={width / 2}
            y={height / 2 + 19}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--muted-foreground)"
            fontSize={14}
          >
            Visitors
          </text>
        </>
      ) : null}
      {spec.legend ? <Legend /> : null}
    </PieChart>
  )
}

function radarChart(spec: ShadcnCatalogSpec, width: number, height: number) {
  const multiple = spec.variant === 'multiple' || spec.variant === 'legend'
  return (
    <RadarChart width={width} height={height} data={shadcnMonths}>
      {spec.variant === 'grid-none' ? null : (
        <PolarGrid
          gridType={spec.variant.includes('circle') ? 'circle' : 'polygon'}
          radialLines={spec.variant !== 'grid-circle-no-lines'}
        />
      )}
      <PolarAngleAxis dataKey="month" tickFormatter={shortMonth} />
      <Tooltip cursor={false} />
      <Radar
        dataKey="desktop"
        fill={shadcnColors[0]}
        fillOpacity={spec.variant === 'lines-only' ? 0 : 0.5}
        stroke={shadcnColors[0]}
        isAnimationActive={false}
      />
      {multiple ? (
        <Radar
          dataKey="mobile"
          fill={shadcnColors[1]}
          fillOpacity={0.42}
          stroke={shadcnColors[1]}
          isAnimationActive={false}
        />
      ) : null}
      {spec.legend ? <Legend /> : null}
    </RadarChart>
  )
}

function radialChart(spec: ShadcnCatalogSpec, width: number, height: number) {
  const data =
    spec.variant === 'simple' || spec.variant === 'text'
      ? shadcnBrowsers.slice(1, 2)
      : shadcnBrowsers
  const startAngle = spec.variant === 'shape' ? 180 : 200
  const endAngle = spec.variant === 'shape' ? 0 : -50
  return (
    <RadialBarChart
      width={width}
      height={height}
      data={data}
      innerRadius={30}
      outerRadius={100}
      startAngle={startAngle}
      endAngle={endAngle}
    >
      <Tooltip />
      <RadialBar
        dataKey="visitors"
        background={spec.variant === 'grid'}
        cornerRadius={spec.variant === 'shape' ? 0 : 10}
        isAnimationActive={false}
      >
        {data.map((row, index) => (
          <Cell key={row.browser} fill={shadcnColors[index]} />
        ))}
        {spec.variant === 'label' ? (
          <LabelList dataKey="visitors" position="insideStart" />
        ) : null}
      </RadialBar>
      {spec.variant === 'text' ? (
        <>
          <text
            x={width / 2}
            y={height / 2 - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--foreground)"
            fontSize={36}
            fontWeight={700}
          >
            200
          </text>
          <text
            x={width / 2}
            y={height / 2 + 19}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--muted-foreground)"
            fontSize={14}
          >
            Visitors
          </text>
        </>
      ) : null}
    </RadialBarChart>
  )
}

function tooltipChart(spec: ShadcnCatalogSpec, width: number, height: number) {
  return (
    <div className="sc-tooltip-demo" style={{ width, height }}>
      <BarChart width={width} height={height} data={tooltipRows()}>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={shortDate}
        />
        <Bar
          dataKey="running"
          stackId="activity"
          fill={shadcnColors[0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="swimming"
          stackId="activity"
          fill={shadcnColors[1]}
          isAnimationActive={false}
        />
      </BarChart>
      <RechartsStaticTooltip variant={spec.variant} />
    </div>
  )
}

function tooltipRows() {
  return [...new Set(shadcnActivities.map((row) => row.date))].map((date) => ({
    date,
    running:
      shadcnActivities.find(
        (row) => row.date === date && row.activity === 'running',
      )?.value ?? 0,
    swimming:
      shadcnActivities.find(
        (row) => row.date === date && row.activity === 'swimming',
      )?.value ?? 0,
  }))
}

function RechartsLegend({ spec }: { spec: ShadcnCatalogSpec }) {
  const labels =
    spec.family === 'pie' || spec.family === 'radial'
      ? shadcnBrowsers.map((row) => row.browser)
      : ['desktop', 'mobile']
  return (
    <>
      {labels.map((label, index) => (
        <span className="sc-legend-item" key={label}>
          <span
            className="sc-legend-dot"
            style={{ background: shadcnColors[index] }}
          />
          {titleCase(label)}
        </span>
      ))}
    </>
  )
}

function RechartsStaticTooltip({ variant }: { variant: string }) {
  const noLabel = variant === 'label-none'
  const noIndicator = variant === 'indicator-none'
  const lineIndicator = variant === 'indicator-line'
  const formatted = variant === 'formatter' || variant === 'advanced'
  return (
    <div className="sc-static-tooltip">
      {noLabel ? null : (
        <strong>
          {variant === 'label-formatter'
            ? 'Tuesday, July 16'
            : variant === 'label-custom'
              ? 'Running & Swimming'
              : 'Jul 16'}
        </strong>
      )}
      {['running', 'swimming'].map((activity, index) => (
        <div className="sc-static-tooltip-row" key={activity}>
          {noIndicator ? null : (
            <span
              className={lineIndicator ? 'sc-static-line' : 'sc-static-dot'}
              style={{ background: shadcnColors[index] }}
            />
          )}
          <span>
            {variant === 'icons'
              ? `${index === 0 ? '●' : '◆'} ${titleCase(activity)}`
              : titleCase(activity)}
          </span>
          <b>
            {formatted
              ? `${index === 0 ? 380 : 420} kcal`
              : index === 0
                ? '380'
                : '420'}
          </b>
        </div>
      ))}
      {variant === 'advanced' ? (
        <div className="sc-static-tooltip-total">
          <span>Total</span>
          <b>800 kcal</b>
        </div>
      ) : null}
    </div>
  )
}

function shortMonth(value: string) {
  return value.slice(0, 3)
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
