// Keep only one live WebGL city; the departing city is a temporary snapshot.
export class CitySlider {
  constructor(city, panel, labels) {
    this.city = city
    this.panel = panel
    this.labels = labels
    this.state = null
    this.onResize = () => this.cancel()
    window.addEventListener('resize', this.onResize)
  }
  get active() {
    return this.state !== null
  }
  dispose() {
    this.cancel()
    window.removeEventListener('resize', this.onResize)
  }
  capture() {
    this.cancel()
    if (this.city.reduceMotion || !this.panel.animate) return
    const renderer = this.city.renderer,
      source = renderer.domElement
    const canvas = document.createElement('canvas')
    canvas.width = source.clientWidth || source.width
    canvas.height = source.clientHeight || source.height
    const context = canvas.getContext('2d')
    if (!context) return
    renderer.render(this.city.scene, this.city.camera)
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const overlay = document.createElement('div')
    overlay.className = 'city-slide-snapshot'
    overlay.setAttribute('aria-hidden', 'true')
    const labels = this.labels.cloneNode(true)
    labels.removeAttribute('id')
    labels.className = 'city-slide-labels'
    overlay.append(canvas, labels)
    // Freeze the old labels' CSS positions while the live stylesheet moves
    // to the next layout. The more specific rules leave the live labels alone.
    const projectionSheet = this.panel.querySelector?.(
      'style[data-atlas-city-projections]',
    )?.sheet
    if (projectionSheet) {
      const style = document.createElement('style')
      style.textContent = Array.from(projectionSheet.cssRules, (rule) =>
        rule.cssText.replace(
          ' .atlas-city-label[',
          ' .city-slide-labels .atlas-city-label[',
        ),
      ).join('\n')
      overlay.append(style)
    }
    this.panel.append(overlay)
    this.state = { overlay, canvas, animations: [] }
    this.city.controls.enabled = false
    this.panel.classList.add('city-sliding')
  }
  async play(direction) {
    const state = this.state
    if (!state) return
    const options = {
      duration: 650,
      easing: 'cubic-bezier(.22,.68,.2,1)',
      fill: 'both',
    }
    const incoming = [
      { transform: `translateX(${direction * 100}%)` },
      { transform: 'translateX(0)' },
    ]
    this.city.renderer.render(this.city.scene, this.city.camera)
    state.animations = [
      state.overlay.animate(
        [
          { transform: 'translateX(0)' },
          { transform: `translateX(${-direction * 100}%)` },
        ],
        options,
      ),
      this.city.renderer.domElement.animate(incoming, options),
      this.labels.animate(incoming, options),
    ]
    await Promise.allSettled(
      state.animations.map((animation) => animation.finished),
    )
    if (this.state === state) this.cancel()
  }
  cancel() {
    if (!this.state) return
    const state = this.state
    this.state = null
    for (const animation of state.animations) animation.cancel()
    state.animations.length = 0
    state.overlay.remove()
    state.overlay.replaceChildren()
    state.canvas.width = 0
    state.canvas.height = 0
    this.panel.classList.remove('city-sliding')
    this.city.controls.enabled = true
    this.city.invalidate?.()
  }
}
