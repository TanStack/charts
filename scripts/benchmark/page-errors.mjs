export function attachPageErrorCollector(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return {
    assertNone() {
      if (errors.length) {
        throw new Error(`Page errors: ${[...new Set(errors)].join(' | ')}`)
      }
    },
  }
}

export function contextPageErrorFailure(context) {
  return new Promise((_, reject) => {
    const observe = (page) => {
      page.on('pageerror', (error) => {
        reject(new Error(`Page errors: ${error.message}`))
      })
      page.on('console', (message) => {
        if (message.type() === 'error') {
          reject(new Error(`Page errors: ${message.text()}`))
        }
      })
    }
    for (const page of context.pages()) observe(page)
    context.on('page', observe)
  })
}
