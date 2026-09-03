export function formatFreeCursorValue(axis: string, value: number) {
  return `${axis} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}`
}
