import {
  ShadcnChartCard,
  ShadcnTrendFooter,
} from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

export function RadialTextCard({
  input,
  children,
}: {
  input: ConformanceInput
  children: Parameters<typeof ShadcnChartCard>[0]['children']
}) {
  return (
    <ShadcnChartCard
      input={input}
      title="Radial Chart - Text"
      description="January - June 2024"
      chartShape="square"
      centered
      footer={<ShadcnTrendFooter centered />}
    >
      {children}
    </ShadcnChartCard>
  )
}
