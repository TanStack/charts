const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function formatDifferenceMonth(value: Date): string {
  return monthLabels[value.getUTCMonth()] ?? ''
}
