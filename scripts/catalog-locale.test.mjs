import { describe, expect, it } from 'vitest'
import { catalogLocaleProblems } from './catalog-locale.mjs'

describe('catalog locale formatting', () => {
  it('rejects locale methods that inherit the process locale', () => {
    const problems = catalogLocaleProblems(
      `
const count = value.toLocaleString()
const day = date.toLocaleDateString(undefined, { day: 'numeric' })
const time = date.toLocaleTimeString(
  undefined,
  { timeZone: 'UTC' },
)
`,
      'example.tsx',
    )

    expect(
      problems.map(({ formatter, line }) => ({ formatter, line })),
    ).toEqual([
      { formatter: 'toLocaleString', line: 2 },
      { formatter: 'toLocaleDateString', line: 3 },
      { formatter: 'toLocaleTimeString', line: 4 },
    ])
  })

  it('recognizes optional chains and computed locale methods', () => {
    const problems = catalogLocaleProblems(`
const first = value?.toLocaleString()
const second = value.toLocaleString?.()
const third = value['toLocaleString']()
const fourth = (value.toLocaleString)()
const fifth = value.toLocaleString(locale)
const sixth = value.toLocaleDateString!()
const seventh = left.localeCompare(right)
const eighth = left.localeCompare(right, undefined)
const ninth = date['toLocaleDateString' as const]()
`)

    expect(problems.map(({ formatter }) => formatter)).toEqual([
      'toLocaleString',
      'toLocaleString',
      'toLocaleString',
      'toLocaleString',
      'toLocaleString',
      'toLocaleDateString',
      'localeCompare',
      'localeCompare',
      'toLocaleDateString',
    ])
  })

  it('rejects Intl formatters without a fixed locale', () => {
    const problems = catalogLocaleProblems(`
const number = new Intl.NumberFormat()
const date = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC' })
const callable = Intl.NumberFormat(locale)
const computed = new Intl['DateTimeFormat']()
const parenthesized = new (Intl.NumberFormat)()
const wrappedReceiver = new (Intl).DateTimeFormat()
const wrappedKey = new Intl['NumberFormat' as const]()
const globalReceiver = new globalThis.Intl.NumberFormat()
const browserReceiver = new window['Intl'].DateTimeFormat()
`)

    expect(problems.map(({ formatter }) => formatter)).toEqual([
      'Intl.NumberFormat',
      'Intl.DateTimeFormat',
      'Intl.NumberFormat',
      'Intl.DateTimeFormat',
      'Intl.NumberFormat',
      'Intl.DateTimeFormat',
      'Intl.NumberFormat',
      'Intl.NumberFormat',
      'Intl.DateTimeFormat',
    ])
  })

  it('accepts fixed locale literals and unrelated methods', () => {
    expect(
      catalogLocaleProblems(`
value.toLocaleString('en-US')
date.toLocaleDateString(\`en-US\`, { timeZone: 'UTC' })
date.toLocaleTimeString(['en-US', 'en'], { timeZone: 'UTC' })
new Intl.NumberFormat('en-US')
new Intl.DateTimeFormat(['en-US'])
left.localeCompare(right, 'en-US')
`),
    ).toEqual([])
  })
})
