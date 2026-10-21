import * as React from 'react'
import { createRoot } from 'react-dom/client'
import {
  CityMap,
  type CityDatum,
  type CityChartHandle,
} from '@tanstack/charts/react/city'
import '@tanstack/charts/react/city/styles.css'

const categories = [
  { value: 'retail', label: 'Retail' },
  { value: 'online', label: 'Online' },
  { value: 'wholesale', label: 'Wholesale' },
]
const records: CityDatum[] = Array.from({ length: 140 }, (_, index) => ({
  id: `store-${index}`,
  name: `Store ${String(index + 1).padStart(3, '0')}`,
  metric: { label: 'Orders', value: ((index * 397) % 5000) + 100 },
  categories: categories.filter((_, bit) => ((index % 7) + 1) & (1 << bit)),
  status:
    index % 9 === 0 ? 'critical' : index % 5 === 0 ? 'warning' : 'healthy',
}))

function App() {
  const [selected, setSelected] = React.useState<CityDatum | null>(null)
  const [mounted, setMounted] = React.useState(true)
  const handle = React.useRef<CityChartHandle>(null)
  return (
    <main
      style={{ margin: '24px auto', maxWidth: 1200, fontFamily: 'system-ui' }}
    >
      <h1>Store health city</h1>
      <p>
        Building height represents orders. Districts show category
        intersections.
      </p>
      <button onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount city' : 'Mount city'}
      </button>
      <button
        onClick={() => handle.current?.select(records[0]!, { focus: true })}
      >
        Focus first store
      </button>
      <p role="status" data-selected-record>
        {selected?.name ?? 'No store selected'}
      </p>
      {mounted && (
        <CityMap
          ref={handle}
          data={records}
          title="Store health"
          ariaLabel="Store health city"
          onSelect={setSelected}
          showEnvironmentControls
        />
      )}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
