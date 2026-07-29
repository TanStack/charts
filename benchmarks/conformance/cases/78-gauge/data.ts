export interface GaugeDatum {
  id: 'value' | 'remainder'
  label: string
  value: number
  fill: string
}

export function gaugeData(revision = 0): readonly GaugeDatum[] {
  const value = revision % 2 === 0 ? 72 : 84

  return [
    { id: 'value', label: 'Value', value, fill: '#ef4444' },
    {
      id: 'remainder',
      label: 'Remainder',
      value: 100 - value,
      fill: '#e2e8f0',
    },
  ]
}
