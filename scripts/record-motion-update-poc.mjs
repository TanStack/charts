import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '.benchmark-output/motion-update-poc')
const frames = resolve(output, 'frames')
const bundle = resolve(output, 'motion-update-poc.js')
await rm(frames, { recursive: true, force: true })
await mkdir(frames, { recursive: true })
await build({
  entryPoints: [resolve(root, 'benchmarks/motion/update-poc.ts')],
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
    viewport: { width: 840, height: 470 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  })
  await page.clock.install({ time: 0 })
  await page.goto(server.url, { waitUntil: 'load' })
  const captureDurationMs = await page.evaluate(async () => {
    const module = await import('/motion-update-poc.js')
    globalThis.__motionPoc = module.mount(document.body)
    await document.fonts?.ready
    return globalThis.__motionPoc.captureDurationMs
  })

  const frameStepMs = 16
  const frameCount = Math.ceil(captureDurationMs / frameStepMs) + 3
  const samples = []
  for (let frame = 0; frame < frameCount; frame++) {
    const name = String(frame).padStart(3, '0')
    await page.screenshot({ path: resolve(frames, `frame-${name}.png`) })
    samples.push(await sampleUpdate(page, frame, frame * frameStepMs))
    if (frame < frameCount - 1) await page.clock.runFor(frameStepMs)
  }
  const summary = summarize(samples)
  await writeFile(
    resolve(output, 'motion-update-samples.json'),
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
    resolve(output, 'motion-update-poc.webm'),
  ])
  await run('ffmpeg', [
    '-y',
    '-framerate',
    '60',
    '-i',
    resolve(frames, 'frame-%03d.png'),
    '-vf',
    `${contactSheetSelection(frameCount)},scale=420:-1,tile=5x2:padding=0:margin=0`,
    '-frames:v',
    '1',
    '-update',
    '1',
    resolve(output, 'motion-update-contact-sheet.png'),
  ])
  assertUpdateConformance(summary)
  console.log(JSON.stringify({ output, summary }, null, 2))
} finally {
  await browser.close()
  await server.close()
}

async function sampleUpdate(page, frame, elapsedMs) {
  return page.evaluate(
    ({ sampleFrame, sampleElapsed }) => {
      const root = document.querySelector('.motion-update-poc')
      const svg = root?.querySelector('svg.ts-chart')
      const bars = [
        ...(svg?.querySelectorAll('g.ts-chart__bar-y > rect') ?? []),
      ].map((bar) => ({
        key: bar.getAttribute('data-ts-key'),
        x: Number(bar.getAttribute('x')),
        y: Number(bar.getAttribute('y')),
        width: Number(bar.getAttribute('width')),
        height: Number(bar.getAttribute('height')),
      }))
      return {
        frame: sampleFrame,
        elapsedMs: sampleElapsed,
        stage: root?.getAttribute('data-stage') ?? 'initial',
        motionState: svg?.getAttribute('data-ts-motion-state'),
        motionProgress: Number(
          svg?.getAttribute('data-ts-motion-progress') ?? 0,
        ),
        activeRoles: svg?.querySelectorAll('[data-ts-motion-role]').length ?? 0,
        interruptionDelta: Number(
          root?.getAttribute('data-interruption-delta') ?? 0,
        ),
        bars,
        interaction: globalThis.__motionPoc.probeInteraction(),
      }
    },
    { sampleFrame: frame, sampleElapsed: elapsedMs },
  )
}

function summarize(samples) {
  let maximumFrameDelta = 0
  let maximumFrameDeltaAt = null
  let maximumStageBoundaryDelta = 0
  let maximumStageBoundaryDeltaAt = null
  let interactionFailures = 0
  let momentumReversals = 0
  for (let index = 1; index < samples.length; index++) {
    const previous = new Map(
      samples[index - 1].bars.map((bar) => [bar.key, bar]),
    )
    for (const bar of samples[index].bars) {
      const before = previous.get(bar.key)
      if (!before) continue
      const delta = Math.max(
        Math.abs(bar.x - before.x),
        Math.abs(bar.y - before.y),
        Math.abs(bar.width - before.width),
        Math.abs(bar.height - before.height),
      )
      if (delta > maximumFrameDelta) {
        maximumFrameDelta = delta
        maximumFrameDeltaAt = { frame: samples[index].frame, key: bar.key }
      }
      if (
        samples[index - 1].stage !== samples[index].stage &&
        delta > maximumStageBoundaryDelta
      ) {
        maximumStageBoundaryDelta = delta
        maximumStageBoundaryDeltaAt = {
          frame: samples[index].frame,
          key: bar.key,
          from: samples[index - 1].stage,
          to: samples[index].stage,
        }
      }
    }
  }
  const boundaryIndex = samples.findIndex(
    (sample, index) =>
      index > 0 &&
      samples[index - 1].stage === 'first-update' &&
      sample.stage === 'interrupted-update',
  )
  if (boundaryIndex >= 0 && samples[boundaryIndex + 1]) {
    const boundary = new Map(
      samples[boundaryIndex].bars.map((bar) => [bar.key, bar]),
    )
    const next = new Map(
      samples[boundaryIndex + 1].bars.map((bar) => [bar.key, bar]),
    )
    const final = new Map(samples.at(-1).bars.map((bar) => [bar.key, bar]))
    for (const [key, atBoundary] of boundary) {
      const after = next.get(key)
      const target = final.get(key)
      if (!after || !target) continue
      const incomingDirection = Math.sign(after.y - atBoundary.y)
      const targetDirection = Math.sign(target.y - atBoundary.y)
      if (incomingDirection * targetDirection < 0) momentumReversals += 1
    }
  }
  for (const sample of samples) {
    const interaction = sample.interaction
    if (
      interaction.expectedId &&
      (interaction.expectedId !== interaction.focusedId ||
        interaction.error === null ||
        interaction.error > 0.01)
    ) {
      interactionFailures += 1
    }
  }
  const final = samples.at(-1)
  return {
    maximumFrameDelta,
    maximumFrameDeltaAt,
    maximumStageBoundaryDelta,
    maximumStageBoundaryDeltaAt,
    interactionFailures,
    momentumReversals,
    synchronousInterruptionDelta: Math.max(
      ...samples.map((sample) => sample.interruptionDelta),
    ),
    stages: [...new Set(samples.map((sample) => sample.stage))],
    finalState: final?.motionState,
    finalActiveRoles: final?.activeRoles,
    finalBarCount: final?.bars.length,
  }
}

function assertUpdateConformance(summary) {
  const failures = []
  if (summary.synchronousInterruptionDelta > 0.05) {
    failures.push(
      `synchronous interruption jumped ${summary.synchronousInterruptionDelta}px`,
    )
  }
  if (summary.interactionFailures) {
    failures.push(`${summary.interactionFailures} interaction probes missed`)
  }
  if (summary.momentumReversals < 1) {
    failures.push('no retained momentum was observed after target reversal')
  }
  if (
    !summary.stages.includes('first-update') ||
    !summary.stages.includes('interrupted-update')
  ) {
    failures.push('the complete update sequence did not run')
  }
  if (summary.finalState !== 'finished') {
    failures.push(`motion ended in ${summary.finalState}`)
  }
  if (summary.finalActiveRoles !== 0) {
    failures.push(`${summary.finalActiveRoles} motion probes remained active`)
  }
  if (summary.finalBarCount !== 8) {
    failures.push(`final bar count was ${summary.finalBarCount}`)
  }
  if (failures.length) {
    throw new Error(`Motion update POC failed: ${failures.join('; ')}`)
  }
}

function contactSheetSelection(frameCount) {
  const indexes = Array.from({ length: 10 }, (_, index) =>
    Math.round((index * (frameCount - 1)) / 9),
  )
  return `select='${indexes.map((index) => `eq(n\\,${index})`).join('+')}'`
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
