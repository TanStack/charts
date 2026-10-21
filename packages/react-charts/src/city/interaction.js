// A definition can be mounted in several charts. Associate each compiled point
// with its own mounted surface, never with a global camera or a datum ID.
const surfaces = new WeakMap()

export function bindCityPoints(points, resolve) {
  for (const point of points) surfaces.set(point, resolve)
}

export const cityFocus = {
  resolve(points, { x, y }) {
    return surfaces.get(points[0])?.(x, y) ?? []
  },
  group(_points, { point }) {
    return [point]
  },
  navigation(points) {
    return points
  },
}
