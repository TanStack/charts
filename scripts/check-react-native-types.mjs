import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const tsc = resolve(root, 'node_modules/typescript/bin/tsc')
const passingConfigs = [
  'packages/react-native-charts/tsconfig.json',
  'examples/charts-react-native/tsconfig.json',
  'examples/charts-expo/tsconfig.json',
]

for (const config of passingConfigs) {
  const result = runTypeScript(config)
  if (result.status !== 0) {
    process.stderr.write(result.output)
    throw new Error(`TypeScript failed for ${config}`)
  }
}

const strictConfig = 'examples/charts-react-native/tsconfig.strict.json'
const strict = runTypeScript(strictConfig)
if (strict.status === 0) {
  console.log('React Native source and strict consumer typechecks passed.')
  process.exit(0)
}

const diagnostics = strict.output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
const expected = diagnostics.every(
  (line) =>
    line.includes('/@types/d3-array/') &&
    line.includes("Cannot find name 'ImageData'."),
)

if (!expected || diagnostics.length !== 2) {
  process.stderr.write(strict.output)
  throw new Error(
    'The strict React Native consumer has diagnostics beyond the known @types/d3-array ImageData boundary.',
  )
}

console.log(
  'React Native source and consumer typechecks passed; strict dependency checking reached only the two known @types/d3-array ImageData diagnostics.',
)

function runTypeScript(config) {
  const result = spawnSync(
    process.execPath,
    [tsc, '--noEmit', '-p', config, '--pretty', 'false'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  )
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  }
}
