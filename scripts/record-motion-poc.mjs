import { createServer } from 'node:http'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { extname, resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '.benchmark-output/motion-poc')
const frames = resolve(output, 'frames')
const bundle = resolve(output, 'motion-poc.js')
await rm(frames, { recursive: true, force: true })
await mkdir(frames, { recursive: true })
await build({
  entryPoints: [resolve(root, 'benchmarks/motion/poc.ts')],
  outfile: bundle,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  sourcemap: true,
})

const server = await startServer(output)
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--force-device-scale-factor=1',
  ],
})

try {
  const page = await browser.newPage({
    viewport: { width: 1_120, height: 390 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  })
  await page.clock.install({ time: 0 })
  await page.goto(server.url, { waitUntil: 'load' })
  const captureDurationMs = await page.evaluate(async () => {
    const module = await import('/motion-poc.js')
    globalThis.__motionPoc = module.mount(document.body)
    await document.fonts?.ready
    return globalThis.__motionPoc.captureDurationMs
  })

  const samples = []
  const frameStepMs = 16
  const frameCount = Math.ceil(captureDurationMs / frameStepMs) + 3
  for (let frame = 0; frame < frameCount; frame++) {
    const name = String(frame).padStart(3, '0')
    await page.screenshot({ path: resolve(frames, `frame-${name}.png`) })
    samples.push(await sampleGeometry(page, frame))
    if (frame < frameCount - 1) await page.clock.runFor(frameStepMs)
  }
  const summary = summarize(samples)
  await writeFile(
    resolve(output, 'motion-samples.json'),
    `${JSON.stringify({ summary, samples }, null, 2)}\n`,
  )
  await run('ffmpeg', [
    '-y',
    '-framerate',
    '60',
    '-i',
    resolve(frames, 'frame-%03d.png'),
    '-c:v',
    'libvpx-vp9',
    '-pix_fmt',
    'yuv420p',
    resolve(output, 'motion-poc.webm'),
  ])
  await run('ffmpeg', [
    '-y',
    '-framerate',
    '60',
    '-i',
    resolve(frames, 'frame-%03d.png'),
    '-vf',
    `${contactSheetSelection(frameCount)},scale=560:-1,tile=5x2:padding=0:margin=0`,
    '-frames:v',
    '1',
    '-update',
    '1',
    resolve(output, 'motion-contact-sheet.png'),
  ])
  assertConformance(summary)
  console.log(JSON.stringify({ output, summary }, null, 2))
} finally {
  await browser.close()
  await server.close()
}

function contactSheetSelection(frameCount) {
  const indexes = Array.from({ length: 10 }, (_, index) =>
    Math.round((index * (frameCount - 1)) / 9),
  )
  return `select='${indexes.map((index) => `eq(n\\,${index})`).join('+')}'`
}

async function sampleGeometry(page, frame) {
  return page.evaluate((sampleFrame) => {
    const panels = [...document.querySelectorAll('[data-motion-panel]')]
    const values = Object.fromEntries(
      panels.map((panel) => {
        const bars = [
          ...panel.querySelectorAll('g.ts-chart__bar-y > rect'),
        ].map((bar) => ({
          key: bar.getAttribute('data-ts-key'),
          x: Number(bar.getAttribute('x')),
          y: Number(bar.getAttribute('y')),
          width: Number(bar.getAttribute('width')),
          height: Number(bar.getAttribute('height')),
        }))
        const clip = panel.querySelector('g.ts-chart__line[clip-path]')
        const clipId = clip
          ?.getAttribute('clip-path')
          ?.match(/^url\(#(.+)\)$/)?.[1]
        const clipRectangle = clipId
          ? panel.querySelector(`clipPath[id="${clipId}"] rect`)
          : null
        return [
          panel.getAttribute('data-motion-panel'),
          {
            bars,
            motionState:
              panel.getAttribute('data-motion-panel') === 'reference'
                ? panel
                    .querySelector('svg')
                    ?.getAttribute('data-reference-motion-state')
                : panel
                    .querySelector('svg')
                    ?.getAttribute('data-ts-motion-state'),
            lineRevealWidth: clipRectangle
              ? Number(clipRectangle.getAttribute('width'))
              : null,
          },
        ]
      }),
    )
    return { frame: sampleFrame, ...values }
  }, frame)
}

function summarize(samples) {
  let maximumBarError = 0
  let maximumLineError = 0
  let maximumBarErrorAt = null
  let maximumLineErrorAt = null
  for (const sample of samples) {
    sample.reference.bars.forEach((bar, index) => {
      const candidate = sample.candidate.bars[index]
      if (!candidate) return
      for (const property of ['x', 'y', 'width', 'height']) {
        const error = Math.abs(bar[property] - candidate[property])
        if (error > maximumBarError) {
          maximumBarError = error
          maximumBarErrorAt = {
            frame: sample.frame,
            key: bar.key,
            property,
          }
        }
      }
    })
    if (
      sample.reference.lineRevealWidth !== null &&
      sample.candidate.lineRevealWidth !== null
    ) {
      const error = Math.abs(
        sample.reference.lineRevealWidth - sample.candidate.lineRevealWidth,
      )
      if (error > maximumLineError) {
        maximumLineError = error
        maximumLineErrorAt = { frame: sample.frame }
      }
    }
  }
  const final = samples.at(-1)
  return {
    maximumBarError,
    maximumBarErrorAt,
    maximumLineError,
    maximumLineErrorAt,
    finalStates: {
      reference: final?.reference.motionState,
      candidate: final?.candidate.motionState,
    },
  }
}

function assertConformance(summary) {
  const failures = []
  if (summary.maximumBarError > 2) {
    failures.push(`bar geometry drifted by ${summary.maximumBarError}px`)
  }
  if (summary.maximumLineError > 4) {
    failures.push(`line reveal drifted by ${summary.maximumLineError}px`)
  }
  for (const [panel, state] of Object.entries(summary.finalStates)) {
    if (state !== 'finished') failures.push(`${panel} ended in ${state}`)
  }
  if (failures.length) {
    throw new Error(`Motion POC conformance failed: ${failures.join('; ')}`)
  }
}

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('error', rejectRun)
    child.once('exit', (code) =>
      code === 0
        ? resolveRun()
        : rejectRun(new Error(`${command} exited with code ${code}`)),
    )
  })
}

function startServer(directory) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/') {
        response.setHeader('content-type', 'text/html; charset=utf-8')
        response.end(
          '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
        )
        return
      }
      const path = resolve(directory, `.${url.pathname}`)
      if (path !== directory && !path.startsWith(`${directory}/`)) {
        throw new Error('outside output')
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
  return new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        rejectServer(new Error('Server did not receive a TCP port'))
        return
      }
      resolveServer({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolveClose) => server.close(resolveClose)),
      })
    })
  })
}
