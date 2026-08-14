import {
  ShadcnChartCard,
  ShadcnTrendFooter,
} from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

export function PieDonutTextCard({
  input,
  children,
}: {
  input: ConformanceInput
  children: Parameters<typeof ShadcnChartCard>[0]['children']
}) {
  return (
    <ShadcnChartCard
      input={input}
      title="Pie Chart - Donut with Text"
      description="January - June 2024"
      chartShape="square"
      centered
      footer={<ShadcnTrendFooter centered />}
    >
      {children}
    </ShadcnChartCard>
  )
}
