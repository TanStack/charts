import { describe, expect, it } from 'vitest'
import { loadCatalogSourceClosure } from './catalog-loader'

describe('loadCatalogSourceClosure', () => {
  it('loads the entry and its case-local source dependencies', async () => {
    const modules = {
      './cases/example/tanstack.ts': async () =>
        "import { rows } from './data'\nimport { mount } from '../../shared/mount'\nexport { rows, mount }",
      './cases/example/data.ts': async () =>
        "import { derive } from './transform'\nexport const rows = derive([1, 2, 3])",
      './cases/example/transform.ts': async () =>
        'export const derive = (rows: number[]) => rows',
      './shared/mount.ts': async () => 'export const mount = () => {}',
    }

    await expect(
      loadCatalogSourceClosure(modules, './cases/example/tanstack.ts'),
    ).resolves.toEqual([
      {
        path: 'tanstack.ts',
        source:
          "import { rows } from './data'\nimport { mount } from '../../shared/mount'\nexport { rows, mount }",
      },
      {
        path: 'data.ts',
        source:
          "import { derive } from './transform'\nexport const rows = derive([1, 2, 3])",
      },
      {
        path: 'transform.ts',
        source: 'export const derive = (rows: number[]) => rows',
      },
    ])
  })
})
