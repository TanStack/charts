const autoTypeDate =
  /^([-+]\d{2})?\d{4}(-\d{2}(-\d{2})?)?(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[-+]\d{2}:\d{2})?)?$/

export function autoTypeValue(input) {
  const value = input.trim()
  if (!value) return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'NaN') return Number.NaN

  const number = Number(value)
  if (!Number.isNaN(number)) return number
  if (autoTypeDate.test(value)) return new Date(value)
  return input
}

export function parseCsvRows(source, convert) {
  const rows = []
  let row = []
  let value = ''
  let index = 0
  let quoted = false
  let pending = false

  const pushRow = () => {
    row.push(value)
    const next = convert ? convert(row, rows.length) : row
    if (next !== null && next !== undefined) rows.push(next)
    row = []
    value = ''
    pending = false
  }

  while (index < source.length) {
    const character = source[index]
    if (quoted) {
      if (character !== '"') {
        value += character
        index += 1
        continue
      }
      if (source[index + 1] === '"') {
        value += '"'
        index += 2
        continue
      }
      quoted = false
      index += 1
      continue
    }

    if (character === '"' && !pending) {
      quoted = true
      pending = true
      index += 1
      continue
    }
    if (character === ',') {
      row.push(value)
      value = ''
      pending = false
      index += 1
      continue
    }
    if (character === '\n' || character === '\r') {
      pushRow()
      index += character === '\r' && source[index + 1] === '\n' ? 2 : 1
      continue
    }

    value += character
    pending = true
    index += 1
  }

  if (pending || row.length) pushRow()
  return rows
}
