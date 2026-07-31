import { binTimeX } from '@tanstack/charts/transform/bin-time'
const day = {
  floor: (date: Date) =>
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    ),
  offset: (date: Date, step = 1) =>
    new Date(date.getTime() + step * 86_400_000),
  range(start: Date, stop: Date, step = 1) {
    const result: Date[] = []
    for (let date = start; date < stop; date = this.offset(date, step))
      result.push(date)
    return result
  },
}
export const output = binTimeX([{ date: new Date() }], {
  value: 'date',
  interval: day,
})
