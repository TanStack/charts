import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const server = await createServer({
  root: resolve(root, 'examples/charts-react'),
  server: { host: '127.0.0.1', port: 0 },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
    reducedMotion: 'reduce',
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${server.resolvedUrls.local[0]}city/`)
  const map = page.locator('.atlas-city-map')
  await map.locator('canvas').waitFor()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).waitFor()
  await page.waitForFunction(
    () =>
      !document.querySelector('.atlas-city-camera-button--zoom-in')?.disabled,
  )
  await page.getByRole('button', { name: 'Focus first store' }).click()
  await page.getByText('Store 001', { exact: true }).first().waitFor()
  assert.equal(
    await page.locator('[data-selected-record]').textContent(),
    'Store 001',
  )
  await map.locator('input[type="search"]').fill('Store 010')
  await map.locator('.atlas-city-search-result').click()
  assert.equal(
    await page.locator('[data-selected-record]').textContent(),
    'Store 010',
  )
  await page.getByRole('button', { name: 'Top view', exact: true }).click()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await map.locator('select').last().selectOption('snow')
  await page.getByRole('button', { name: 'Hide controls', exact: true }).click()
  assert.equal(
    await map
      .locator('.atlas-city-scene-controls')
      .evaluate((node) => node.inert),
    true,
  )
  await page.getByRole('button', { name: 'Show controls', exact: true }).click()
  assert.equal(
    await map
      .locator('.atlas-city-scene-controls')
      .evaluate((node) => node.inert),
    false,
  )
  await mkdir(resolve(root, '.benchmark-output'), { recursive: true })
  await page.screenshot({
    path: resolve(root, '.benchmark-output/city-map.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Unmount city', exact: true }).click()
  assert.equal(await page.locator('canvas').count(), 0)
  await page.getByRole('button', { name: 'Mount city', exact: true }).click()
  await map.locator('canvas').waitFor()
  assert.deepEqual(errors, [])
  console.log(
    'City browser check passed: Strict Mode, WebGL, selection, search, camera, weather, unmount, remount.',
  )
} finally {
  await browser?.close()
  await server.close()
}
