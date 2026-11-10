import { useEffect, useState } from 'react'
import Sidebar from './components/ui/Sidebar'
import Toolbar from './components/ui/Toolbar'
import InfoPanel from './components/ui/InfoPanel'
import Viewer from './components/viewer/Viewer'
import { loadCatalog } from './lib/catalog'
import { useAnatomyStore } from './store/useAnatomyStore'

// Em telas largas a barra lateral começa aberta; em iPad/celular começa recolhida
const WIDE = typeof window !== 'undefined' && window.matchMedia('(min-width: 1200px)').matches

export default function App() {
  const [menuOpen, setMenuOpen] = useState(WIDE)
  const [error, setError] = useState(null)
  const catalog = useAnatomyStore((s) => s.catalog)
  const setCatalog = useAnatomyStore((s) => s.setCatalog)
  const select = useAnatomyStore((s) => s.select)

  useEffect(() => {
    loadCatalog().then(setCatalog).catch(setError)
  }, [setCatalog])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && select(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])

  if (error) {
    return (
      <div className="splash">
        <strong>Não consegui carregar o atlas.</strong>
        <p>Rode o exportador (veja o README) para gerar <code>public/zanatomy/</code>.</p>
        <code>{String(error.message ?? error)}</code>
      </div>
    )
  }
  if (!catalog) return <div className="splash">Carregando atlas…</div>

  return (
    <div className={`app ${menuOpen ? 'app--menu' : ''}`}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
      <main className="stage">
        <Viewer />
        <Toolbar menuOpen={menuOpen} onMenu={() => setMenuOpen(!menuOpen)} />
        <InfoPanel />
      </main>
    </div>
  )
}
