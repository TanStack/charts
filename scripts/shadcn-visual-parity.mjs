import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import path from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const catalog = JSON.parse(
  await readFile(
    path.join(root, 'benchmarks/conformance/shadcn/catalog.json'),
    'utf8',
  ),
)
const explicitBaseUrl = optionValue('--url')
const requestedNames = optionValue('--case')?.split(',').filter(Boolean)
const minimumSimilarity = Number(optionValue('--minimum') ?? 0.9)
const minimumChartSimilarity = Number(optionValue('--minimum-chart') ?? 0.7)
const reportOnly = process.argv.includes('--report-only')
const entries = requestedNames
  ? catalog.cases.filter((entry) => requestedNames.includes(entry.name))
  : catalog.cases
const referenceDirectory = path.join(
  root,
  'benchmarks/conformance/shadcn/reference',
)
const outputDirectory = path.join(root, '.benchmark-output/shadcn')
const localDirectory = path.join(outputDirectory, 'local')
const diffDirectory = path.join(outputDirectory, 'diff')
await Promise.all([
  mkdir(localDirectory, { recursive: true }),
  mkdir(diffDirectory, { recursive: true }),
])

const managedServer = explicitBaseUrl ? null : await startConformanceServer()
const baseUrl = explicitBaseUrl ?? managedServer.url
const browser = await chromium.launch({ headless: true })
const results = []

try {
  for (const [index, entry] of entries.entries()) {
    const page = await browser.newPage({
      viewport: { width: 640, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    })
    try {
      await page.goto(`${baseUrl}/embed/${entry.localCaseId}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })
      await page.waitForTimeout(250)
      await page.evaluate(async () => {
        await document.fonts.ready
        document.getAnimations().forEach((animation) => animation.finish())
      })
      const card = page.locator('.sc-card').first()
      await card.waitFor({ state: 'visible' })
      const localPath = path.join(localDirectory, `${entry.name}.png`)
      await card.screenshot({ path: localPath, animations: 'disabled' })
      const referencePath = path.join(referenceDirectory, `${entry.name}.png`)
      const comparison = await comparePng(referencePath, localPath, entry)
      const result = {
        name: entry.name,
        id: entry.localCaseId,
        ...comparison,
        pass:
          comparison.similarity >= minimumSimilarity &&
          (comparison.chartSimilarity === null ||
            comparison.chartSimilarity >= minimumChartSimilarity),
      }
      results.push(result)
      if (!result.pass) {
        await writeFile(
          path.join(diffDirectory, `${entry.name}.png`),
          PNG.sync.write(comparison.diff),
        )
      }
      process.stdout.write(
        `\rCompared ${String(index + 1).padStart(2)}/${entries.length}: ${entry.name} ${formatPercent(result.similarity)}${result.chartSimilarity === null ? '' : ` / chart ${formatPercent(result.chartSimilarity)}`}`,
      )
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
  await managedServer?.stop()
  process.stdout.write('\n')
}

const report = {
  schemaVersion: 3,
  minimumSimilarity,
  minimumChartSimilarity,
  source: baseUrl,
  cases: results.map(({ diff: _diff, ...result }) => result),
}
await writeFile(
  path.join(outputDirectory, 'report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
await writeFile(
  path.join(outputDirectory, 'report.md'),
  `${[
    '# shadcn visual parity',
    '',
    `Minimum: ${formatPercent(minimumSimilarity)}`,
    `Chart-region foreground minimum: ${formatPercent(minimumChartSimilarity)}`,
    '',
    '| Case | Similarity | Chart foreground | Size | Result |',
    '| --- | ---: | ---: | --- | --- |',
    ...results
      .sort((left, right) => left.similarity - right.similarity)
      .map(
        (result) =>
          `| ${result.name} | ${formatPercent(result.similarity)} | ${result.chartSimilarity === null ? '—' : formatPercent(result.chartSimilarity)} | ${result.referenceWidth}×${result.referenceHeight} / ${result.localWidth}×${result.localHeight} | ${result.pass ? 'pass' : 'fail'} |`,
      ),
    '',
  ].join('\n')}\n`,
)

const failed = results.filter((result) => !result.pass)
console.log(
  `${results.length - failed.length}/${results.length} meet ${formatPercent(minimumSimilarity)}; mean ${formatPercent(results.reduce((total, result) => total + result.similarity, 0) / results.length)}.`,
)
if (failed.length && !reportOnly) process.exitCode = 1

async function comparePng(referencePath, localPath, entry) {
  const reference = PNG.sync.read(await readFile(referencePath))
  const local = PNG.sync.read(await readFile(localPath))
  const width = Math.max(reference.width, local.width)
  const height = Math.max(reference.height, local.height)
  const paddedReference = padPng(reference, width, height)
  const paddedLocal = padPng(local, width, height)
  const diff = new PNG({ width, height })
  const differentPixels = pixelmatch(
    paddedReference.data,
    paddedLocal.data,
    diff.data,
    width,
    height,
    { threshold: 0.1, includeAA: false },
  )
  const chartSimilarity = compareChartForeground(
    paddedReference,
    paddedLocal,
    entry.family,
  )
  return {
    similarity: 1 - differentPixels / (width * height),
    chartSimilarity,
    differentPixels,
    referenceWidth: reference.width,
    referenceHeight: reference.height,
    localWidth: local.width,
    localHeight: local.height,
    diff,
  }
}

function compareChartForeground(reference, local, family) {
  const square = family === 'pie' || family === 'radar' || family === 'radial'
  const requestedSize = family === 'pie' ? 300 : square ? 250 : undefined
  const width = Math.min(
    requestedSize ?? 592,
    reference.width - (square ? 0 : 48),
    local.width - (square ? 0 : 48),
  )
  const height = Math.min(
    requestedSize ?? 340,
    reference.height - 88,
    local.height - 88,
  )
  const x = Math.max(0, Math.floor((reference.width - width) / 2))
  const y = 88
  const referenceCrop = cropPng(reference, x, y, width, height)
  const localCrop = cropPng(local, x, y, width, height)
  const diff = new PNG({ width, height })
  const differentPixels = pixelmatch(
    referenceCrop.data,
    localCrop.data,
    diff.data,
    width,
    height,
    { threshold: 0.1, includeAA: false },
  )
  let foregroundPixels = 0
  for (let index = 0; index < referenceCrop.data.length; index += 4) {
    const referenceDistance =
      765 -
      referenceCrop.data[index] -
      referenceCrop.data[index + 1] -
      referenceCrop.data[index + 2]
    const localDistance =
      765 -
      localCrop.data[index] -
      localCrop.data[index + 1] -
      localCrop.data[index + 2]
    if (referenceDistance > 15 || localDistance > 15) foregroundPixels += 1
  }
  return foregroundPixels === 0 ? 1 : 1 - differentPixels / foregroundPixels
}

function cropPng(source, x, y, width, height) {
  const output = new PNG({ width, height })
  PNG.bitblt(source, output, x, y, width, height, 0, 0)
  return output
}

function padPng(source, width, height) {
  if (source.width === width && source.height === height) return source
  const output = new PNG({ width, height, fill: true })
  output.data.fill(255)
  PNG.bitblt(source, output, 0, 0, source.width, source.height, 0, 0)
  return output
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function optionValue(name) {
  const inline = process.argv.find((argument) =>
    argument.startsWith(`${name}=`),
  )
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function startConformanceServer() {
  const port = await availablePort()
  const child = spawn(
    'pnpm',
    [
      'exec',
      'vite',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: path.join(root, 'examples/conformance'),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  const url = `http://127.0.0.1:${port}`
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Conformance server exited early:\n${output}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) {
        return {
          url,
          stop: () => stopProcess(child),
        }
      }
    } catch {
      // Wait for Vite to bind the selected local port.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100))
  }
  child.kill('SIGTERM')
  throw new Error(`Timed out starting conformance server:\n${output}`)
}

function availablePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new TypeError('Unable to allocate a local conformance port.'))
        return
      }
      server.close((error) => {
        if (error) reject(error)
        else resolvePromise(address.port)
      })
    })
  })
}

function stopProcess(child) {
  if (child.exitCode !== null) return Promise.resolve()
  return new Promise((resolvePromise) => {
    child.once('exit', resolvePromise)
    child.kill('SIGTERM')
  })
}
