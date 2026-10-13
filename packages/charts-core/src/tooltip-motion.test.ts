import { describe, expect, it, vi } from 'vitest'
import { motion } from './motion'

function setup() {
  const element = document.createElement('div')
  const animations: Array<{
    cancel: ReturnType<typeof vi.fn>
    onfinish: (() => void) | null
  }> = []
  const animate = vi.fn(() => {
    const animation = { cancel: vi.fn(), onfinish: null }
    animations.push(animation)
    return animation
  })
  Object.defineProperty(element, 'animate', { value: animate })
  const controller = motion({
    transition: { type: 'tween', duration: 100 },
  }).capabilities?.tooltipMotion?.createController({
    container: element,
    transition: () => undefined,
  })
  if (!controller) throw new Error('Expected tooltip motion controller')
  const show = (left = 0) => {
    const snapshot = controller.beforePaint(element)
    element.hidden = false
    element.style.left = `${left}px`
    element.style.top = '0px'
    controller.afterPaint(element, snapshot, undefined)
  }
  element.hidden = true
  return { element, controller, animations, animate, show }
}

describe('tooltip motion lifecycle', () => {
  it('lets a repeated hide finish the existing exit', () => {
    const { element, controller, animations, show } = setup()
    show()
    const complete = vi.fn(() => {
      element.hidden = true
    })
    expect(controller.hide(element, undefined, complete)).toBe(true)
    const exit = animations.at(-1)!
    expect(controller.hide(element, undefined, complete)).toBe(true)
    expect(animations).toHaveLength(2)
    expect(exit.cancel).not.toHaveBeenCalled()
    exit.onfinish?.()
    expect(complete).toHaveBeenCalledOnce()
    expect(element.hidden).toBe(true)
    expect(exit.cancel).toHaveBeenCalledOnce()
    controller.destroy(element)
  })

  it('releases finished presence and movement effects', () => {
    const { element, controller, animations, show } = setup()
    show()
    const enter = animations[0]!
    enter.onfinish?.()
    expect(enter.cancel).toHaveBeenCalledOnce()
    show(40)
    const move = animations.at(-1)!
    move.onfinish?.()
    expect(move.cancel).toHaveBeenCalledOnce()
    expect(element.style.translate).toBe('')
    expect(element.style.opacity).toBe('')
    expect(element.style.transform).toBe('')
    controller.destroy(element)
    expect(move.cancel).toHaveBeenCalledOnce()
  })

  it('does not let a cancelled exit hide a newly shown tooltip', () => {
    const { element, controller, animations, show } = setup()
    show()
    const complete = vi.fn()
    controller.hide(element, undefined, complete)
    const exit = animations.at(-1)!
    show(40)
    expect(exit.cancel).toHaveBeenCalledOnce()
    exit.onfinish?.()
    expect(complete).not.toHaveBeenCalled()
    expect(element.hidden).toBe(false)
    controller.destroy(element)
  })

  it('honors disabled motion during an exit and invalidates its completion', () => {
    const { element, controller, animations, show } = setup()
    show()
    const complete = vi.fn()
    controller.hide(element, undefined, complete)
    const exit = animations.at(-1)!
    expect(controller.hide(element, false, complete)).toBe(false)
    expect(exit.cancel).toHaveBeenCalledOnce()
    exit.onfinish?.()
    expect(complete).not.toHaveBeenCalled()
    controller.destroy(element)
  })

  it('ignores exit completion after destruction', () => {
    const { element, controller, animations, show } = setup()
    show()
    const complete = vi.fn()
    controller.hide(element, undefined, complete)
    const exit = animations.at(-1)!
    controller.destroy(element)
    exit.onfinish?.()
    expect(complete).not.toHaveBeenCalled()
    expect(exit.cancel).toHaveBeenCalledOnce()
  })

  it('cleans up before a completion callback shows the tooltip again', () => {
    const { element, controller, animations, show } = setup()
    show()
    controller.hide(element, undefined, () => {
      element.hidden = true
      show(40)
    })
    animations.at(-1)!.onfinish?.()
    const enter = animations.at(-1)!
    expect(element.hidden).toBe(false)
    expect(enter.cancel).not.toHaveBeenCalled()
    controller.destroy(element)
    expect(enter.cancel).toHaveBeenCalledOnce()
  })
})
