import {
  ShadcnChartCard,
  ShadcnTrendFooter,
} from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

export function RadarMultipleCard({
  input,
  children,
}: {
  input: ConformanceInput
  children: Parameters<typeof ShadcnChartCard>[0]['children']
}) {
  return (
    <ShadcnChartCard
      input={input}
      title="Radar Chart - Multiple"
      description="Showing total visitors for the last 6 months"
      chartShape="square"
      centered
      headerInsetBottom={input.height >= 400 ? 16 : 0}
      footer={<ShadcnTrendFooter centered note="January - June 2024" />}
    >
      {children}
    </ShadcnChartCard>
  )
}
