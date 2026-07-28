export const easeLinear = (value: number) => value
export const easeQuadIn = (value: number) => value * value
export const easeQuadInOut = (value: number) =>
  value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2
export const easeCubicOut = (value: number) => 1 - Math.pow(1 - value, 3)
