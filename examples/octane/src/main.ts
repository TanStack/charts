import { createRoot } from 'octane'
import '@plot-poc/host-core/styles.css'
import '@plot-poc/fixtures/styles.css'
import { App } from './App.tsrx'

const target = document.getElementById('root')
if (!target) throw new Error('Missing #root')

createRoot(target).render(App)
