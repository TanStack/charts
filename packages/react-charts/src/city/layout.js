// Renderer metadata lives on the mark's scene group, never on user data.
// A symbol survives scene-node copies without becoming an SVG/DOM attribute.
export const cityLayout = Symbol('cityLayout')

export function readCityLayout(nodes) {
  for (const node of nodes) {
    if (node[cityLayout]) return node[cityLayout]
    if (node.children) {
      const layout = readCityLayout(node.children)
      if (layout) return layout
    }
  }
}
