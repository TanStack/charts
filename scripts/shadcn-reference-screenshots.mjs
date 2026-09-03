import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const catalogPath = path.join(
  root,
  'benchmarks/conformance/shadcn/catalog.json',
)
const outputDirectory = path.join(
  root,
  'benchmarks/conformance/shadcn/reference',
)
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const requestedNames = optionValue('--case')?.split(',').filter(Boolean)
const entries = requestedNames
  ? catalog.cases.filter((entry) => requestedNames.includes(entry.name))
  : catalog.cases

await mkdir(outputDirectory, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 640, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
})

try {
  for (const [index, entry] of entries.entries()) {
    const url = `https://ui.shadcn.com/view/new-york-v4/${entry.name}`
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForTimeout(1_800)
    await page.evaluate(async () => {
      await document.fonts.ready
      document.getAnimations().forEach((animation) => animation.finish())
    })
    const card = page.locator('[data-slot="card"]').first()
    await card.waitFor({ state: 'visible' })
    await card.screenshot({
      path: path.join(outputDirectory, `${entry.name}.png`),
      animations: 'disabled',
    })
    process.stdout.write(
      `\rCaptured ${String(index + 1).padStart(2)}/${entries.length}: ${entry.name}`,
    )
  }
  process.stdout.write('\n')
  await writeFile(
    path.join(outputDirectory, 'manifest.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        viewport: { width: 640, deviceScaleFactor: 1, theme: 'light' },
        source: 'https://ui.shadcn.com/view/new-york-v4/{name}',
        capturedAt: new Date().toISOString(),
        cases: entries.map((entry) => entry.name),
      },
      null,
      2,
    )}\n`,
  )
} finally {
  await browser.close()
}

function optionValue(name) {
  const inline = process.argv.find((argument) =>
    argument.startsWith(`${name}=`),
  )
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}
