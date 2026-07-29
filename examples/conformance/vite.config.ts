import { defineConfig } from 'vite'

export default defineConfig({
  base: normalizeBasePath(process.env.CATALOG_BASE_PATH ?? '/'),
  build: {
    manifest: true,
    target: 'es2022',
  },
})

function normalizeBasePath(value: string): string {
  const leadingSlash = value.startsWith('/') ? value : `/${value}`
  return leadingSlash.endsWith('/') ? leadingSlash : `${leadingSlash}/`
}
