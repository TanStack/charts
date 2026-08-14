export interface RadialDatum {
  browser: 'safari'
  visitors: number
  ring: 'visitors'
}

export const radialData: readonly RadialDatum[] = [
  { browser: 'safari', visitors: 200, ring: 'visitors' },
]

export const radialCenterLabels = [
  { id: 'value', angle: 0, radius: 0, text: '200' },
  { id: 'label', angle: 0, radius: 0, text: 'Visitors' },
]
