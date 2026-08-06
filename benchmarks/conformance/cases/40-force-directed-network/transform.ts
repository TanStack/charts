import type { MiserablesGraph } from '@charts-poc/demo-data/miserables'

export function forceNetworkData(source: MiserablesGraph): MiserablesGraph {
  const nodes = source.nodes.slice(0, 13)
  const nodeIds = new Set(nodes.map((node) => node.id))

  return {
    nodes,
    links: source.links.filter(
      (link) => nodeIds.has(link.source) && nodeIds.has(link.target),
    ),
  }
}
