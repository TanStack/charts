import { describe, expect, it } from 'vitest'
import {
  extractMarkdownLinks,
  resolvePackedMarkdownTarget,
  validatePackedMarkdownLinks,
} from './packed-markdown-links.mjs'

describe('packed Markdown links', () => {
  it('extracts inline, image, and reference destinations outside code', () => {
    const links = extractMarkdownLinks(`
[Guide](./docs/guide.md#usage)
![Diagram](./docs/chart%20flow.svg)
[Nested](./docs/name(with-parentheses).md "Title")
[Reference][guide]

[guide]: ./docs/reference.md

\`[inline code](./missing-inline.md)\`

\`\`\`md
[fenced code](./missing-fence.md)
\`\`\`
`)

    expect(links.map((link) => link.destination)).toEqual([
      './docs/guide.md#usage',
      './docs/chart%20flow.svg',
      './docs/name(with-parentheses).md',
      './docs/reference.md',
    ])
  })

  it('resolves package-local paths and passes URL-only destinations', () => {
    expect(
      resolvePackedMarkdownTarget('docs/guide.md', '../README.md#start'),
    ).toEqual({ outside: false, path: 'README.md' })
    expect(
      resolvePackedMarkdownTarget('README.md', './docs/chart%20flow.svg'),
    ).toEqual({ outside: false, path: 'docs/chart flow.svg' })
    expect(resolvePackedMarkdownTarget('README.md', '#usage')).toBeNull()
    expect(resolvePackedMarkdownTarget('README.md', '?view=full')).toBeNull()
    expect(
      resolvePackedMarkdownTarget('README.md', 'https://example.com/docs'),
    ).toBeNull()
    expect(
      resolvePackedMarkdownTarget('README.md', 'mailto:team@example.com'),
    ).toBeNull()
    expect(
      resolvePackedMarkdownTarget('README.md', '//cdn.example.com/chart.svg'),
    ).toBeNull()
  })

  it('accepts links to files shipped in the same tarball', () => {
    expect(() =>
      validatePackedMarkdownLinks({
        packageName: '@tanstack/charts',
        packedFiles: new Set([
          'README.md',
          'LICENSE',
          'docs/guide.md',
          'docs/chart flow.svg',
        ]),
        markdownSources: new Map([
          [
            'README.md',
            [
              '[Guide](./docs/guide.md#usage)',
              '![Chart](./docs/chart%20flow.svg)',
              '[License](./LICENSE)',
              '[Site](https://tanstack.com/)',
            ].join('\n'),
          ],
          ['docs/guide.md', '[Back](../README.md)'],
        ]),
      }),
    ).not.toThrow()
  })

  it('rejects missing, escaping, root-relative, and malformed targets', () => {
    expect(() =>
      validatePackedMarkdownLinks({
        packageName: '@tanstack/charts',
        packedFiles: new Set(['README.md']),
        markdownSources: new Map([
          [
            'README.md',
            [
              '[Missing](./docs/missing.md)',
              '[Escape](../PLAN.md)',
              '[Root](/repository-only.md)',
              '[Malformed](./bad%ZZ.md)',
            ].join('\n'),
          ],
        ]),
      }),
    ).toThrowError(
      /README\.md:1 links to a missing packed file[\s\S]*README\.md:2 links outside its tarball[\s\S]*README\.md:3 links outside its tarball[\s\S]*README\.md:4 has an invalid encoded link destination/,
    )
  })
})
