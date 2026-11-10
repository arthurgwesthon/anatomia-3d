import { useEffect, useRef, useState } from 'react'
import { ancestors, geometryKeys, getNode, search } from '../../lib/catalog'
import { useAnatomyStore } from '../../store/useAnatomyStore'

export default function Sidebar({ open, onClose }) {
  const catalog = useAnatomyStore((s) => s.catalog)
  const [query, setQuery] = useState('')
  const results = query.trim().length >= 2 ? search(query) : null
  // Em modo gaveta (iPad/celular) fecha ao escolher algo, para mostrar o zoom na peça
  const onPick = () => {
    if (!window.matchMedia('(min-width: 1200px)').matches) onClose()
  }

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <header className="sidebar__header">
        <h1>Anatomia 3D</h1>
        <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Fechar menu">✕</button>
      </header>

      <input
        className="search"
        type="search"
        placeholder="Buscar (ex.: femur, aorta, biceps)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {results ? (
        <SearchResults results={results} onPick={onPick} />
      ) : (
        <nav className="systems">
          {catalog.systems.map((system) => (
            <SystemGroup key={system.id} system={system} onPick={onPick} />
          ))}
        </nav>
      )}

      <footer className="credits">{catalog.credits}</footer>
    </aside>
  )
}

function SearchResults({ results, onPick }) {
  const select = useAnatomyStore((s) => s.select)
  const selectPin = useAnatomyStore((s) => s.selectPin)

  if (results.length === 0) return <p className="empty">Nada encontrado.</p>
  return (
    <ul className="results">
      {results.map((r) => {
        const node = getNode(r.key)
        const parent = r.pin ? node : getNode(node.p)
        return (
          <li key={`${r.key}:${r.pin ?? ''}`}>
            <button
              onClick={() => {
                select(r.key, { focus: true })
                if (r.pin) selectPin(r.key, r.pin)
                onPick()
              }}
            >
              <span>{r.name}</span>
              {parent && <small>{r.pin ? `em ${parent.n}` : parent.n}</small>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function SystemGroup({ system, onPick }) {
  const [expanded, setExpanded] = useState(false)
  const visible = useAnatomyStore((s) => !!s.visibleSystems[system.id])
  // Abre o sistema automaticamente quando algo dele é selecionado
  const containsSelection = useAnatomyStore((s) => getNode(s.selected)?.s === system.id)
  const toggleSystem = useAnatomyStore((s) => s.toggleSystem)
  const isOpen = expanded || containsSelection

  return (
    <section className={`system ${visible ? '' : 'system--off'}`} style={{ '--system-color': system.color }}>
      <div className="system__header">
        <button className="system__title" onClick={() => setExpanded(!isOpen)} aria-expanded={isOpen}>
          <span className={`chevron ${isOpen ? 'chevron--open' : ''}`}>▸</span>
          <span className="system__swatch" />
          <span>
            {system.name}
            <small>{(system.bytes / 1e6).toFixed(1)} MB</small>
          </span>
        </button>
        <VisibilityToggle on={visible} onClick={() => toggleSystem(system.id)} label={system.name} />
      </div>

      {isOpen && (
        <ul className="tree">
          {system.roots.map((key) => (
            <TreeNode key={key} nodeKey={key} depth={0} onPick={onPick} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TreeNode({ nodeKey, depth, onPick }) {
  const node = getNode(nodeKey)
  const [expanded, setExpanded] = useState(depth === 0)
  const selected = useAnatomyStore((s) => s.selected === nodeKey)
  const onSelectedPath = useAnatomyStore((s) => !!s.selected && ancestors(s.selected).includes(nodeKey))
  const hidden = useAnatomyStore((s) => geometryKeys(nodeKey).every((k) => s.hidden[k]))
  const select = useAnatomyStore((s) => s.select)
  const toggleHidden = useAnatomyStore((s) => s.toggleHidden)
  const hover = useAnatomyStore((s) => s.hover)
  const unhover = useAnatomyStore((s) => s.unhover)
  const rowRef = useRef(null)

  const hasChildren = !!node.c?.length
  const isOpen = hasChildren && (expanded || onSelectedPath)

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <li>
      <div
        ref={rowRef}
        className={`node ${selected ? 'node--selected' : ''} ${hidden ? 'node--hidden' : ''}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onMouseEnter={() => hover(nodeKey)}
        onMouseLeave={() => unhover(nodeKey)}
      >
        <button
          className={`node__chevron ${hasChildren ? '' : 'node__chevron--leaf'}`}
          onClick={() => setExpanded(!isOpen)}
          tabIndex={hasChildren ? 0 : -1}
          aria-label={isOpen ? 'Recolher' : 'Expandir'}
        >
          {hasChildren ? <span className={`chevron ${isOpen ? 'chevron--open' : ''}`}>▸</span> : '·'}
        </button>
        <button
          className="node__name"
          onClick={() => {
            select(nodeKey, { focus: true })
            onPick()
          }}
        >
          {node.n}
          {hasChildren && <small>{node.c.length}</small>}
        </button>
        <VisibilityToggle on={!hidden} onClick={() => toggleHidden(nodeKey)} label={node.n} />
      </div>
      {isOpen && (
        <ul className="tree">
          {node.c.map((k) => (
            <TreeNode key={k} nodeKey={k} depth={depth + 1} onPick={onPick} />
          ))}
        </ul>
      )}
    </li>
  )
}

function VisibilityToggle({ on, onClick, label }) {
  return (
    <button
      className={`icon-btn eye ${on ? '' : 'eye--off'}`}
      onClick={onClick}
      aria-pressed={on}
      title={on ? `Ocultar ${label}` : `Mostrar ${label}`}
    >
      {on ? '👁' : '◌'}
    </button>
  )
}
