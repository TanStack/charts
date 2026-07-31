import { describe, expect, it } from 'vitest'
import {
  chartEmbedContract,
  createChartEmbedStatusMessage,
  isChartEmbedThemeCommand,
  parseChartEmbedHeight,
  parseChartEmbedRevision,
  parseChartEmbedTheme,
  readTrustedChartEmbedThemeCommand,
  resolveChartEmbedParentOrigin,
} from './embed-contract'

describe('catalog embed contract', () => {
  it('uses documented defaults when query parameters are absent or empty', () => {
    expect(parseChartEmbedHeight(null)).toBe(480)
    expect(parseChartEmbedHeight('')).toBe(480)
    expect(parseChartEmbedRevision(null)).toBe(0)
    expect(parseChartEmbedTheme(null)).toBe('system')
  })

  it('rounds and bounds numeric query parameters', () => {
    expect(parseChartEmbedHeight('119')).toBe(120)
    expect(parseChartEmbedHeight('421.6')).toBe(422)
    expect(parseChartEmbedHeight('1201')).toBe(1_200)
    expect(parseChartEmbedHeight('not-a-number')).toBe(480)
    expect(parseChartEmbedRevision('-1')).toBe(0)
    expect(parseChartEmbedRevision('10001')).toBe(10_000)
  })

  it('accepts only the declared themes', () => {
    expect(parseChartEmbedTheme('light')).toBe('light')
    expect(parseChartEmbedTheme('dark')).toBe('dark')
    expect(parseChartEmbedTheme('system')).toBe('system')
    expect(parseChartEmbedTheme('sepia')).toBe('system')
  })

  it('derives an exact safe parent origin from the document referrer', () => {
    expect(
      resolveChartEmbedParentOrigin(
        'https://tanstack.com/charts/latest/docs/framework/react/',
      ),
    ).toBe('https://tanstack.com')
    expect(resolveChartEmbedParentOrigin('http://localhost:3000/docs')).toBe(
      'http://localhost:3000',
    )
    expect(resolveChartEmbedParentOrigin('')).toBeNull()
    expect(resolveChartEmbedParentOrigin('not a url')).toBeNull()
    expect(
      resolveChartEmbedParentOrigin('https://user:secret@tanstack.com/docs'),
    ).toBeNull()
  })

  it('creates a namespaced, versioned status message', () => {
    expect(createChartEmbedStatusMessage('ready', '01-line-gaps', 360)).toEqual(
      {
        type: 'tanstack-charts:embed',
        version: 1,
        status: 'ready',
        caseId: '01-line-gaps',
        height: 360,
      },
    )
  })

  it('accepts theme commands only for this protocol version and case', () => {
    const valid = {
      type: chartEmbedContract.protocol.type,
      version: chartEmbedContract.protocol.version,
      command: 'set-theme',
      caseId: '01-line-gaps',
      theme: 'dark',
    }
    expect(isChartEmbedThemeCommand(valid, '01-line-gaps')).toBe(true)
    expect(
      isChartEmbedThemeCommand({ ...valid, version: 2 }, '01-line-gaps'),
    ).toBe(false)
    expect(
      isChartEmbedThemeCommand({ ...valid, caseId: 'other' }, '01-line-gaps'),
    ).toBe(false)
    expect(
      isChartEmbedThemeCommand({ ...valid, theme: 'sepia' }, '01-line-gaps'),
    ).toBe(false)
  })

  it('requires the exact parent source and origin for a theme command', () => {
    const parent = window
    const command = {
      type: chartEmbedContract.protocol.type,
      version: chartEmbedContract.protocol.version,
      command: 'set-theme',
      caseId: '01-line-gaps',
      theme: 'dark',
    }
    const event = {
      data: command,
      origin: 'https://tanstack.com',
      source: parent,
    }

    expect(
      readTrustedChartEmbedThemeCommand(
        event,
        parent,
        'https://tanstack.com',
        '01-line-gaps',
      ),
    ).toEqual(command)
    expect(
      readTrustedChartEmbedThemeCommand(
        { ...event, origin: 'https://example.com' },
        parent,
        'https://tanstack.com',
        '01-line-gaps',
      ),
    ).toBeNull()
    expect(
      readTrustedChartEmbedThemeCommand(
        { ...event, source: null },
        parent,
        'https://tanstack.com',
        '01-line-gaps',
      ),
    ).toBeNull()
    expect(
      readTrustedChartEmbedThemeCommand(event, parent, null, '01-line-gaps'),
    ).toBeNull()
  })
})
