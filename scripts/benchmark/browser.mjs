import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium } from 'playwright'

export async function launchBenchmarkBrowser() {
  const launchOptions = {
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--force-device-scale-factor=1',
      '--js-flags=--expose-gc',
    ],
  }

  try {
    return await chromium.launch(launchOptions)
  } catch (error) {
    throw new Error(
      'Playwright Chromium failed to launch. Install the matching headless browser with "pnpm browser:install".',
      { cause: error },
    )
  }
}

export async function startBenchmarkServer(
  directory,
  { width = 1100, height = 600 } = {},
) {
  const absoluteDirectory = resolve(directory)
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/' || url.pathname === '/index.html') {
        response.setHeader('content-type', 'text/html; charset=utf-8')
        response.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body { margin: 0; font: 12px system-ui, sans-serif; }
      body { width: ${width}px; min-height: ${height}px; color: #18181b; background: white; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body></body>
</html>`)
        return
      }
      if (url.pathname === '/favicon.ico') {
        response.statusCode = 204
        response.end()
        return
      }

      const path = resolve(absoluteDirectory, `.${url.pathname}`)
      if (!path.startsWith(`${absoluteDirectory}${sep}`)) {
        response.statusCode = 403
        response.end('Forbidden')
        return
      }
      const file = await readFile(path)
      response.setHeader(
        'content-type',
        extname(path) === '.js'
          ? 'text/javascript; charset=utf-8'
          : 'application/octet-stream',
      )
      response.end(file)
    } catch {
      response.statusCode = 404
      response.end('Not found')
    }
  })

  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Benchmark server did not receive a TCP port.')
  }

  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()))
      }),
  }
}
