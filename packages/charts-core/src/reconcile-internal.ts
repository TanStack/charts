/** Optional animation callbacks around the shared keyed SVG tree walk. */
export interface SvgReconcileHooks {
  update: (current: Element, next: Element) => void
  enter: (current: Element, next: Element) => void
  exit: (current: Element) => void
  /** Motion retains exiting resource nodes; ordinary reconciliation replaces them. */
  replaceDefinitions?: boolean
}

export function reconcileSvgMarkup(
  container: HTMLElement,
  markup: string,
  hooks?: SvgReconcileHooks,
): () => void {
  const template = container.ownerDocument.createElement('template')
  template.innerHTML = markup
  const nextRoot = template.content.firstElementChild
  if (!nextRoot) return () => {}

  const currentRoot = container.firstElementChild
  if (
    !currentRoot ||
    currentRoot.namespaceURI !== nextRoot.namespaceURI ||
    currentRoot.localName !== nextRoot.localName
  ) {
    container.replaceChildren(nextRoot)
    return () => {}
  }

  reconcileElement(currentRoot, nextRoot, hooks)
  return () => {}
}

/** Reconciles one keyed SVG subtree without reparsing or walking the chart. */
export function reconcileSvgFragment(
  currentRoot: SVGElement,
  markup: string,
  hooks?: SvgReconcileHooks,
): () => void {
  const template = currentRoot.ownerDocument.createElement('template')
  template.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`
  const wrapper = template.content.firstElementChild
  const nextRoot = wrapper?.firstElementChild
  if (!nextRoot) return () => {}

  if (
    currentRoot.namespaceURI !== nextRoot.namespaceURI ||
    currentRoot.localName !== nextRoot.localName
  ) {
    currentRoot.replaceWith(nextRoot)
    return () => {}
  }

  reconcileElement(currentRoot, nextRoot, hooks)
  return () => {}
}

export function reconcileElement(
  current: Element,
  next: Element,
  hooks?: SvgReconcileHooks,
) {
  if (hooks) hooks.update(current, next)
  else syncAttributes(current, next)

  if (!next.firstElementChild) {
    if (current.firstElementChild) {
      for (const child of [...current.children]) {
        if (hooks) hooks.exit(child)
        else child.remove()
      }
    } else if (current.textContent !== next.textContent) {
      current.textContent = next.textContent
    }
    return
  }

  const currentChildren = [...current.children]
  const nextChildren = [...next.children]
  const currentByIdentity = indexChildren(currentChildren)
  const nextIdentities = identities(nextChildren)
  const retained = new Set<Element>()
  let cursor = current.firstElementChild

  nextChildren.forEach((nextChild, index) => {
    const identity = nextIdentities[index]
    const matched = currentByIdentity.get(identity)
    let rendered: Element

    if (
      matched &&
      matched.namespaceURI === nextChild.namespaceURI &&
      matched.localName === nextChild.localName
    ) {
      rendered = matched
      retained.add(matched)
      if (rendered !== cursor) current.insertBefore(rendered, cursor)
      reconcileElement(rendered, nextChild, hooks)
    } else if (
      matched &&
      current.localName === 'defs' &&
      hooks?.replaceDefinitions !== false
    ) {
      rendered = nextChild.cloneNode(true) as Element
      matched.replaceWith(rendered)
      if (matched !== cursor) current.insertBefore(rendered, cursor)
    } else {
      rendered = nextChild.cloneNode(true) as Element
      current.insertBefore(rendered, cursor)
      hooks?.enter(rendered, nextChild)
    }

    cursor = rendered.nextElementSibling
  })

  for (const child of currentChildren) {
    if (!retained.has(child) && child.parentElement === current) {
      if (hooks) hooks.exit(child)
      else child.remove()
    }
  }
}

function syncAttributes(current: Element, next: Element) {
  const nextNames = new Set(next.getAttributeNames())
  for (const name of current.getAttributeNames()) {
    if (!nextNames.has(name)) current.removeAttribute(name)
  }

  for (const name of nextNames) {
    const target = next.getAttribute(name)
    if (target !== null && target !== current.getAttribute(name)) {
      current.setAttribute(name, target)
    }
  }
}

function indexChildren(children: readonly Element[]) {
  const result = new Map<string, Element>()
  identities(children).forEach((identity, index) => {
    result.set(identity, children[index])
  })
  return result
}

function identities(children: readonly Element[]) {
  const counts = new Map<string, number>()
  return children.map((child) => {
    const explicit = child.getAttribute('data-ts-key')
    if (explicit) return `key:${explicit}`
    const count = counts.get(child.localName) ?? 0
    counts.set(child.localName, count + 1)
    return `tag:${child.localName}:${count}`
  })
}
