export const chartJsonVersion = '0.14.0'

export function chartJsonSchemaUrl(version = chartJsonVersion): string {
  return `https://unpkg.com/@tanstack/charts@${version}/schemas/chart.json`
}
