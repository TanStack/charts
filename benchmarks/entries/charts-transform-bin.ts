import { binX } from '@tanstack/charts/transform/bin'
const rows = [{ value: 1 }, { value: 2 }, { value: 3 }]
export const output = binX(rows, { value: 'value', thresholds: 2 })
