import { createHash } from 'node:crypto'

const maximumReadableFilterLength = 72

export function stressArtifactStem(profileName, filters = {}) {
  const parts = [`stress-${safeToken(profileName)}`]
  const libraries = normalizedValues(filters.libraries)
  const workloads = normalizedValues(filters.workloads)
  if (libraries.length) parts.push(filterPart('libraries', libraries))
  if (workloads.length) parts.push(filterPart('workloads', workloads))
  return parts.join('--')
}

function filterPart(label, values) {
  const readable = values.map(safeToken).join('+')
  return readable.length <= maximumReadableFilterLength
    ? `${label}-${readable}`
    : `${label}-${values.length}-${digest(values.join('\0'))}`
}

function normalizedValues(values) {
  return [...new Set(values ?? [])].sort()
}

function safeToken(value) {
  const source = String(value)
  const readable = source
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
  const token = readable || 'value'
  return token === source ? token : `${token}-${digest(source)}`
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}
