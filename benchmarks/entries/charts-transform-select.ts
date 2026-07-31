import { select } from '@tanstack/charts/transform/select'
export const output = select([{ value: 1 }], { value: 'value', select: 'max' })
