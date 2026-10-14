export interface RadialLabelInput {
  /** Polar angle in radians, clockwise from 12 o'clock. */
  readonly angle: number
  /**
   * Labels with lower priority are hidden first when space runs out. On equal
   * priority, the later input label is hidden first.
   */
  readonly priority: number
  /** Measured text width in pixels. */
  readonly width: number
}

export interface RadialLabelLayoutOptions {
  /** Pixel radius where connectors start. */
  readonly radius: number
  /** Pixel gap between `radius` and the connector elbow. */
  readonly offset: number
  /** Horizontal connector length after the elbow. */
  readonly elbow: number
  /** Pixel gap between the connector end and the label text. */
  readonly padding: number
  /** Vertical pixel space reserved for one label. */
  readonly lineHeight: number
  /** Center-relative edges of the space for label boxes. */
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly right: number
  /** Largest vertical move from the ideal position before a label is hidden. */
  readonly maxShift: number
}

export type RadialLabelPlacement =
  | { readonly visible: false }
  | {
      readonly visible: true
      readonly x: number
      readonly y: number
      /** Physical side of the pie: text grows away from the center. */
      readonly side: 'left' | 'right'
      readonly connector: readonly (readonly [number, number])[]
    }

interface Block {
  readonly members: readonly number[]
  /** Sum of `ideal[k] - k * lineHeight` over members. */
  readonly sum: number
  readonly start: number
}

/**
 * Places labels in two vertical stacks beside a pie. Each side keeps labels in
 * angular order, pushes overlapping labels apart as little as possible, and
 * hides the lowest-priority labels until the rest fit. Labels whose text would
 * cross the left or right edge are hidden too.
 */
export function layoutRadialLabels(
  labels: readonly RadialLabelInput[],
  options: RadialLabelLayoutOptions,
): RadialLabelPlacement[] {
  const elbowRadius = options.radius + options.offset
  const placements: RadialLabelPlacement[] = labels.map(() => ({
    visible: false,
  }))
  const sides = { left: [] as number[], right: [] as number[] }
  labels.forEach((label, index) => {
    if (!Number.isFinite(label.angle)) return
    sides[Math.sin(label.angle) < -1e-9 ? 'left' : 'right'].push(index)
  })

  for (const side of ['left', 'right'] as const) {
    const ideal = (index: number) =>
      -Math.cos(labels[index]!.angle) * elbowRadius
    const direction = side === 'left' ? -1 : 1
    const place = (index: number, y: number) => {
      const angle = labels[index]!.angle
      const elbow = point(angle, elbowRadius)
      const circleX = Math.sqrt(Math.max(elbowRadius ** 2 - y ** 2, 0))
      const end = Math.max(circleX, Math.abs(elbow[0])) + options.elbow
      return {
        visible: true as const,
        x: direction * (end + options.padding),
        y,
        side,
        connector: [point(angle, options.radius), elbow, [direction * end, y]],
      } satisfies RadialLabelPlacement
    }
    const fits = (index: number, x: number) =>
      side === 'left'
        ? x - labels[index]!.width >= options.left
        : x + labels[index]!.width <= options.right

    let kept = [...sides[side]].sort((a, b) => ideal(a) - ideal(b) || a - b)
    for (;;) {
      const placed = [...placeSide(kept, ideal, labels, options)].map(
        ([index, y]) => [index, place(index, y)] as const,
      )
      const overflow = new Set(
        placed.flatMap(([index, label]) =>
          fits(index, label.x) ? [] : [index],
        ),
      )
      if (overflow.size === 0) {
        for (const [index, label] of placed) placements[index] = label
        break
      }
      kept = kept.filter((index) => !overflow.has(index))
    }
  }

  return placements
}

function placeSide(
  ordered: readonly number[],
  ideal: (index: number) => number,
  labels: readonly RadialLabelInput[],
  options: RadialLabelLayoutOptions,
): Map<number, number> {
  const capacity = Math.max(
    0,
    Math.floor((options.bottom - options.top) / options.lineHeight),
  )
  let kept = ordered
  while (kept.length > capacity) kept = withoutLowest(kept, kept, labels)

  for (;;) {
    const blocks = spread(kept, ideal, options)
    const positions = new Map<number, number>()
    let worst: { shift: number; block: Block } | undefined
    for (const block of blocks) {
      block.members.forEach((index, k) => {
        const y = block.start + k * options.lineHeight
        positions.set(index, y)
        const shift = Math.abs(y - ideal(index))
        if (!worst || shift > worst.shift) worst = { shift, block }
      })
    }
    if (!worst || worst.shift <= options.maxShift) return positions
    kept = withoutLowest(kept, worst.block.members, labels)
  }
}

/**
 * Pushes overlapping labels apart. Touching labels form a block whose start
 * minimizes the squared distance of each member from its ideal position.
 */
function spread(
  ordered: readonly number[],
  ideal: (index: number) => number,
  { lineHeight, top, bottom }: RadialLabelLayoutOptions,
): Block[] {
  const first = top + lineHeight / 2
  const last = bottom - lineHeight / 2
  const blocks: Block[] = []
  for (const index of ordered) {
    let block = createBlock([index], ideal(index), first, last, lineHeight)
    for (;;) {
      const previous = blocks.at(-1)
      if (
        !previous ||
        previous.start + previous.members.length * lineHeight <= block.start
      ) {
        break
      }
      blocks.pop()
      block = createBlock(
        [...previous.members, ...block.members],
        previous.sum +
          block.sum -
          block.members.length * previous.members.length * lineHeight,
        first,
        last,
        lineHeight,
      )
    }
    blocks.push(block)
  }
  return blocks
}

function createBlock(
  members: readonly number[],
  sum: number,
  first: number,
  last: number,
  lineHeight: number,
): Block {
  const latestStart = last - (members.length - 1) * lineHeight
  const start = Math.min(Math.max(sum / members.length, first), latestStart)
  return { members, sum, start }
}

function withoutLowest(
  kept: readonly number[],
  candidates: readonly number[],
  labels: readonly RadialLabelInput[],
): number[] {
  const lowest = candidates.reduce((current, index) => {
    const difference = labels[index]!.priority - labels[current]!.priority
    return difference < 0 || (difference === 0 && index > current)
      ? index
      : current
  })
  return kept.filter((index) => index !== lowest)
}

function point(angle: number, radius: number): [number, number] {
  return [Math.sin(angle) * radius, -Math.cos(angle) * radius]
}
