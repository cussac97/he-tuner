import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { hid } from './lib/hid'
import { loadLayoutMap } from './lib/layout'
import { store } from './lib/store'
import './styles.css'

store.load()
loadLayoutMap()
hid.autoConnect()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
