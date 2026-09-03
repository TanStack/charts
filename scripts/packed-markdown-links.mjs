import { posix } from 'node:path'

export function extractMarkdownLinks(source) {
  const masked = maskMarkdownCode(source)
  const links = []

  for (let index = 0; index < masked.length; index++) {
    if (masked[index] !== '[') continue
    const labelEnd = findLabelEnd(masked, index)
    if (labelEnd === -1) continue

    let open = labelEnd + 1
    while (masked[open] === ' ' || masked[open] === '\t') open++
    if (masked[open] !== '(') continue

    const close = findClosingParenthesis(masked, open)
    if (close === -1) continue
    const destination = parseInlineDestination(source.slice(open + 1, close))
    if (destination !== null) {
      links.push(linkRecord(source, destination, open + 1))
    }
    index = close
  }

  const definitionPattern =
    /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*(?:<([^>\n]*)>|((?:\\.|[^\s])+))/gm
  for (const match of masked.matchAll(definitionPattern)) {
    const destination = match[1] ?? match[2]
    if (destination === undefined) continue
    const offset = (match.index ?? 0) + match[0].indexOf(destination)
    links.push(linkRecord(source, destination, offset))
  }

  return links.sort((left, right) => left.index - right.index)
}

export function validatePackedMarkdownLinks({
  packageName,
  packedFiles,
  markdownSources,
}) {
  const files = new Set([...packedFiles].map(normalizePackedPath))
  const failures = []

  for (const [markdownPath, source] of markdownSources) {
    const normalizedMarkdownPath = normalizePackedPath(markdownPath)
    if (!files.has(normalizedMarkdownPath)) {
      failures.push(
        `${packageName} staged Markdown is absent from its tarball: ${normalizedMarkdownPath}`,
      )
      continue
    }

    for (const link of extractMarkdownLinks(source)) {
      let target
      try {
        target = resolvePackedMarkdownTarget(
          normalizedMarkdownPath,
          link.destination,
        )
      } catch (error) {
        failures.push(
          `${packageName} ${normalizedMarkdownPath}:${link.line} ${error.message}`,
        )
        continue
      }
      if (target === null) continue
      if (target.outside) {
        failures.push(
          `${packageName} ${normalizedMarkdownPath}:${link.line} links outside its tarball: ${link.destination}`,
        )
      } else if (!files.has(target.path)) {
        failures.push(
          `${packageName} ${normalizedMarkdownPath}:${link.line} links to a missing packed file: ${link.destination} -> ${target.path}`,
        )
      }
    }
  }

  if (failures.length) {
    throw new Error(
      `Packed Markdown link check failed:\n${failures.join('\n')}`,
    )
  }
}

export function resolvePackedMarkdownTarget(markdownPath, destination) {
  const unescaped = unescapeMarkdownDestination(destination.trim())
  if (
    unescaped.startsWith('#') ||
    unescaped.startsWith('?') ||
    unescaped.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(unescaped)
  ) {
    return null
  }

  const separator = unescaped.search(/[?#]/)
  const pathname = separator === -1 ? unescaped : unescaped.slice(0, separator)
  if (pathname === '') {
    return { outside: false, path: normalizePackedPath(markdownPath) }
  }

  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    throw new Error(`has an invalid encoded link destination: ${destination}`)
  }
  if (posix.isAbsolute(decoded)) {
    return { outside: true, path: decoded }
  }

  const path = posix.normalize(
    posix.join(posix.dirname(normalizePackedPath(markdownPath)), decoded),
  )
  return {
    outside: path === '..' || path.startsWith('../'),
    path,
  }
}

function parseInlineDestination(content) {
  const trimmed = content.trimStart()
  if (trimmed.startsWith('<')) {
    const close = findUnescaped(trimmed, '>', 1)
    return close === -1 ? null : trimmed.slice(1, close)
  }
  if (trimmed === '' || trimmed.startsWith(')')) return ''

  let escaped = false
  let depth = 0
  for (let index = 0; index < trimmed.length; index++) {
    const character = trimmed[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\') {
      escaped = true
      continue
    }
    if (character === '(') depth++
    else if (character === ')' && depth > 0) depth--
    else if (/\s/.test(character) && depth === 0) {
      return trimmed.slice(0, index)
    }
  }
  return trimmed
}

function findLabelEnd(source, start) {
  let depth = 1
  let escaped = false
  for (let index = start + 1; index < source.length; index++) {
    const character = source[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\') {
      escaped = true
      continue
    }
    if (character === '[') depth++
    if (character === ']' && --depth === 0) return index
  }
  return -1
}

function findClosingParenthesis(source, start) {
  let depth = 1
  let escaped = false
  let angleDestination = false
  for (let index = start + 1; index < source.length; index++) {
    const character = source[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\') {
      escaped = true
      continue
    }
    if (character === '<' && depth === 1) angleDestination = true
    if (character === '>' && angleDestination) angleDestination = false
    if (angleDestination) continue
    if (character === '(') depth++
    if (character === ')' && --depth === 0) return index
  }
  return -1
}

function findUnescaped(source, expected, start) {
  let escaped = false
  for (let index = start; index < source.length; index++) {
    if (escaped) {
      escaped = false
      continue
    }
    if (source[index] === '\\') {
      escaped = true
      continue
    }
    if (source[index] === expected) return index
  }
  return -1
}

function linkRecord(source, destination, index) {
  return {
    destination,
    index,
    line: source.slice(0, index).split('\n').length,
  }
}

export function maskMarkdownCode(source) {
  const characters = source.split('')
  let offset = 0
  let fence = null

  for (const line of source.match(/[^\n]*(?:\n|$)/g) ?? []) {
    if (line === '') continue
    const marker = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/)
    const closesFence =
      fence !== null &&
      marker?.[1]?.[0] === fence.character &&
      marker[1].length >= fence.length &&
      line.slice(marker[0].length).trim() === ''
    if (fence !== null || marker) {
      maskRange(characters, offset, offset + line.length)
    }
    if (fence === null && marker) {
      fence = { character: marker[1][0], length: marker[1].length }
    } else if (closesFence) {
      fence = null
    }
    offset += line.length
  }

  const fenced = characters.join('')
  for (let index = 0; index < fenced.length; index++) {
    if (fenced[index] !== '`') continue
    let length = 1
    while (fenced[index + length] === '`') length++
    const marker = '`'.repeat(length)
    const close = fenced.indexOf(marker, index + length)
    if (close === -1) {
      index += length - 1
      continue
    }
    maskRange(characters, index, close + length)
    index = close + length - 1
  }

  return characters.join('')
}

function maskRange(characters, start, end) {
  for (let index = start; index < end; index++) {
    if (characters[index] !== '\n') characters[index] = ' '
  }
}

function normalizePackedPath(path) {
  return posix.normalize(path.replaceAll('\\', '/')).replace(/^\.\//, '')
}

function unescapeMarkdownDestination(destination) {
  return destination.replace(/\\([!\"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-])/g, '$1')
}
