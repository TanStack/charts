import {
  ShadcnChartCard,
  ShadcnTrendFooter,
} from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

export function BarMultipleCard({
  input,
  children,
}: {
  input: ConformanceInput
  children: Parameters<typeof ShadcnChartCard>[0]['children']
}) {
  return (
    <ShadcnChartCard
      input={input}
      title="Bar Chart - Multiple"
      description="January - June 2024"
      footer={<ShadcnTrendFooter />}
    >
      {children}
    </ShadcnChartCard>
  )
}
