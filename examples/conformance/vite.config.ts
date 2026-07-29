import { defineConfig, type Plugin } from 'vite'
import {
  catalogBuildGraphPath,
  catalogBuildGraphSchemaVersion,
} from '../../scripts/catalog-artifact.mjs'

export default defineConfig({
  base: normalizeBasePath(process.env.CATALOG_BASE_PATH ?? '/'),
  plugins: [catalogBuildGraphPlugin()],
  build: {
    manifest: true,
    target: 'es2022',
  },
})

function normalizeBasePath(value: string): string {
  const leadingSlash = value.startsWith('/') ? value : `/${value}`
  return leadingSlash.endsWith('/') ? leadingSlash : `${leadingSlash}/`
}

function catalogBuildGraphPlugin(): Plugin {
  return {
    name: 'catalog-build-graph',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .flatMap((output) => {
          if (output.type !== 'chunk') return []
          return [
            {
              fileName: output.fileName,
              facadeModuleId: output.facadeModuleId,
              isEntry: output.isEntry,
              isDynamicEntry: output.isDynamicEntry,
              imports: [...output.imports].sort(),
              dynamicImports: [...output.dynamicImports].sort(),
              modules: Object.keys(output.modules).sort(),
            },
          ]
        })
        .sort((left, right) =>
          left.fileName < right.fileName
            ? -1
            : left.fileName > right.fileName
              ? 1
              : 0,
        )

      this.emitFile({
        type: 'asset',
        fileName: catalogBuildGraphPath,
        source: `${JSON.stringify(
          {
            schemaVersion: catalogBuildGraphSchemaVersion,
            chunks,
          },
          null,
          2,
        )}\n`,
      })
    },
  }
}
