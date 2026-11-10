import { useEffect, useState } from 'react'
import { ancestors, getNode, getSystem, loadTexts } from '../../lib/catalog'
import { useAnatomyStore } from '../../store/useAnatomyStore'

function useText(systemId, name) {
  const [state, setState] = useState({ loading: true, text: null })
  useEffect(() => {
    if (!systemId || !name) return
    let alive = true
    setState({ loading: true, text: null })
    loadTexts(systemId).then((texts) => alive && setState({ loading: false, text: texts[name] ?? null }))
    return () => {
      alive = false
    }
  }, [systemId, name])
  return state
}

/** Texto estilo Wikipedia: "== Título ==" vira subtítulo, linhas em branco separam parágrafos. */
function Article({ text }) {
  const blocks = text.split(/\n\s*\n/)
  return blocks.map((block, i) => {
    const heading = block.trim().match(/^(={2,})\s*(.+?)\s*=+$/)
    if (heading) {
      const Tag = heading[1].length <= 2 ? 'h3' : 'h4'
      return <Tag key={i}>{heading[2]}</Tag>
    }
    return <p key={i}>{block.trim()}</p>
  })
}

export default function InfoPanel() {
  const selected = useAnatomyStore((s) => s.selected)
  const pin = useAnatomyStore((s) => s.pin)
  const isolated = useAnatomyStore((s) => s.isolated)
  const select = useAnatomyStore((s) => s.select)
  const isolate = useAnatomyStore((s) => s.isolate)
  const hide = useAnatomyStore((s) => s.hide)
  const focusOn = useAnatomyStore((s) => s.focusOn)
  const [expanded, setExpanded] = useState(false)

  const node = getNode(selected)
  const system = node && getSystem(node.s)
  const title = pin?.name ?? node?.n
  const { loading, text } = useText(node?.s, title)

  useEffect(() => setExpanded(false), [title])

  if (!node) {
    return (
      <div className="hint">
        Arraste para girar · Scroll/pinça para zoom · Botão direito para mover · Clique numa peça
      </div>
    )
  }

  const path = ancestors(selected)
  const isIsolated = isolated === selected

  return (
    <div className={`info ${expanded ? 'info--expanded' : ''}`} style={{ '--system-color': system?.color }}>
      <button className="icon-btn info__close" onClick={() => select(null)} aria-label="Fechar">✕</button>

      <nav className="info__path">
        {path.slice(-3).map((k) => (
          <button key={k} onClick={() => select(k, { focus: true })}>{getNode(k).n}</button>
        ))}
        {pin && <button onClick={() => select(selected)}>{node.n}</button>}
      </nav>
      <h2>{title}</h2>

      <div className="info__actions">
        <button className="tool" onClick={() => isolate(isIsolated ? null : selected)}>
          {isIsolated ? 'Sair do isolamento' : 'Isolar'}
        </button>
        <button className="tool" onClick={() => hide(selected)}>Ocultar</button>
        <button className="tool" onClick={() => focusOn(selected)}>Enquadrar</button>
      </div>

      <div className="info__body">
        {loading ? (
          <p className="muted">Carregando descrição…</p>
        ) : text ? (
          <>
            <article className={`article ${expanded ? '' : 'article--clamped'}`}>
              <Article text={expanded ? text : text.split(/\n\s*\n/)[0]} />
            </article>
            {(text.length > 220 || /\n\s*\n/.test(text)) && (
              <button className="link" onClick={() => setExpanded(!expanded)}>
                {expanded ? 'Mostrar menos' : 'Ler mais'}
              </button>
            )}
            <p className="source">Fonte: Wikipedia (CC BY-SA), via Z-Anatomy</p>
          </>
        ) : (
          <p className="muted">Sem descrição no atlas para esta estrutura.</p>
        )}
      </div>
    </div>
  )
}
