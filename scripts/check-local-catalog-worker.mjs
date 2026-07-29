import { unstable_startWorker } from 'wrangler'
import { checkCatalogDeployment } from './check-catalog-deployment.mjs'

const worker = await unstable_startWorker({
  config: 'wrangler.catalog.jsonc',
  dev: {
    inspector: {
      hostname: '127.0.0.1',
      port: 0,
    },
    persist: false,
    server: {
      hostname: '127.0.0.1',
      port: 0,
      secure: false,
    },
  },
})

try {
  await worker.ready
  const result = await checkCatalogDeployment({
    fetchImplementation: worker.fetch,
  })
  console.log(
    `Verified local Worker with ${result.caseCount} cases and sample ${result.sampleId}.`,
  )
} finally {
  await worker.dispose()
}
