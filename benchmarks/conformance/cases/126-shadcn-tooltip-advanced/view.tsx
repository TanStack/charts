import { ShadcnChartCard } from '../../shared/shadcn-chart-card'
import type { ConformanceInput } from '../../types'

export function AdvancedTooltipCard({
  input,
  children,
}: {
  input: ConformanceInput
  children: Parameters<typeof ShadcnChartCard>[0]['children']
}) {
  return (
    <ShadcnChartCard
      input={input}
      title="Tooltip - Advanced"
      description="Tooltip with custom formatter and total."
    >
      {children}
    </ShadcnChartCard>
  )
}
