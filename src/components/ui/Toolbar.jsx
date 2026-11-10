import { useAnatomyStore } from '../../store/useAnatomyStore'

export default function Toolbar({ menuOpen, onMenu }) {
  const xray = useAnatomyStore((s) => s.xray)
  const showPins = useAnatomyStore((s) => s.showPins)
  const toggleXray = useAnatomyStore((s) => s.toggleXray)
  const togglePins = useAnatomyStore((s) => s.togglePins)
  const resetCamera = useAnatomyStore((s) => s.resetCamera)
  const showAll = useAnatomyStore((s) => s.showAll)

  return (
    <div className="toolbar">
      <button
        className={`tool tool--menu ${menuOpen ? 'tool--on' : ''}`}
        onClick={onMenu}
        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuOpen}
      >
        ☰ Estruturas
      </button>
      <button className={`tool ${xray ? 'tool--on' : ''}`} onClick={toggleXray} aria-pressed={xray}>
        Raio-X
      </button>
      <button className={`tool ${showPins ? 'tool--on' : ''}`} onClick={togglePins} aria-pressed={showPins}>
        Pins
      </button>
      <button className="tool" onClick={showAll}>Mostrar tudo</button>
      <button className="tool" onClick={resetCamera}>Centralizar</button>
    </div>
  )
}
