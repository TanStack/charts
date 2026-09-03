export function formatFreeCursorValue(axis: string, value: number) {
  return `${axis} ${value.toLocaleString('en-US', {
    maximumFractionDigits: 1,
  })}`
}
