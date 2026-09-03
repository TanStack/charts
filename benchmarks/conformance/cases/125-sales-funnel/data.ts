export interface FunnelStage {
  id: string
  label: string
  value: number
}

const revisions: readonly (readonly FunnelStage[])[] = [
  [
    { id: 'visitors', label: 'Visitors', value: 12_400 },
    { id: 'leads', label: 'Leads', value: 6_800 },
    { id: 'qualified', label: 'Qualified', value: 3_200 },
    { id: 'proposals', label: 'Proposals', value: 1_500 },
    { id: 'closed', label: 'Closed', value: 620 },
  ],
  [
    { id: 'visitors', label: 'Visitors', value: 12_400 },
    { id: 'leads', label: 'Leads', value: 7_100 },
    { id: 'qualified', label: 'Qualified', value: 3_500 },
    { id: 'proposals', label: 'Proposals', value: 1_720 },
    { id: 'closed', label: 'Closed', value: 690 },
  ],
]

export function funnelStagesForRevision(
  revision: number,
): readonly FunnelStage[] {
  return revisions[revision % revisions.length] ?? revisions[0] ?? []
}
