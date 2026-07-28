import { createHash } from 'node:crypto'

const maximumReadableFilterLength = 72

export function conformanceArtifactStem(caseIds = []) {
  const cases = [...new Set(caseIds)].sort()
  if (!cases.length) return 'plot-catalog'

  const readable = cases.map(safeToken).join('+')
  const suffix =
    readable.length <= maximumReadableFilterLength
      ? readable
      : `${cases.length}-${digest(cases.join('\0'))}`
  return `plot-catalog--cases-${suffix}`
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
