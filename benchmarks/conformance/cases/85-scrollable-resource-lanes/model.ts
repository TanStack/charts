export function timelineDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}
