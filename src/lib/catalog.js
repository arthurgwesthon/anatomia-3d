// Acesso ao catálogo gerado por tools/export_zanatomy.py (public/zanatomy/catalog.json).
//
// Formato de cada nó (chave "sistema/Nome"):
//   n: nome   s: sistema   p?: pai   c?: filhos   g?: 1 se tem geometria própria
//   pins?: [[nome, x, y, z], ...]  acidentes/partes rotulados (coords do three.js)

export const ASSET_BASE = `${import.meta.env.BASE_URL}zanatomy/`

let catalog = null

export async function loadCatalog() {
  const res = await fetch(`${ASSET_BASE}catalog.json`)
  if (!res.ok) throw new Error(`catalog.json: HTTP ${res.status}`)
  catalog = await res.json()
  return catalog
}

export const getNode = (key) => catalog?.nodes[key]
export const getSystem = (id) => catalog?.systems.find((s) => s.id === id)

const geometryCache = new Map()
/** Chaves com geometria no nó e em todos os descendentes. */
export function geometryKeys(key) {
  if (!key) return []
  let out = geometryCache.get(key)
  if (out) return out
  out = []
  const seen = new Set()
  const stack = [key]
  while (stack.length) {
    const k = stack.pop()
    if (seen.has(k)) continue
    seen.add(k)
    const n = catalog.nodes[k]
    if (!n) continue
    if (n.g) out.push(k)
    if (n.c) stack.push(...n.c)
  }
  geometryCache.set(key, out)
  return out
}

const ancestorCache = new Map()
/** Caminho da raiz até o pai do nó. */
export function ancestors(key) {
  let out = ancestorCache.get(key)
  if (out) return out
  out = []
  const seen = new Set([key])
  let p = catalog.nodes[key]?.p
  while (p && !seen.has(p)) {
    seen.add(p)
    out.unshift(p)
    p = catalog.nodes[p]?.p
  }
  ancestorCache.set(key, out)
  return out
}

const normalize = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
let searchIndex = null

/** Busca por nome em estruturas e pins. Prefixos aparecem primeiro. */
export function search(query, limit = 80) {
  const q = normalize(query.trim())
  if (q.length < 2) return []
  if (!searchIndex) {
    searchIndex = []
    for (const [key, n] of Object.entries(catalog.nodes)) {
      searchIndex.push({ key, name: n.n, norm: normalize(n.n) })
      for (const [name] of n.pins ?? []) {
        searchIndex.push({ key, name, pin: name, norm: normalize(name) })
      }
    }
  }
  const starts = []
  const contains = []
  for (const item of searchIndex) {
    const i = item.norm.indexOf(q)
    if (i === 0) starts.push(item)
    else if (i > 0) contains.push(item)
  }
  return [...starts, ...contains].slice(0, limit)
}

const textCache = new Map()
/** Textos (inglês, Wikipedia) de um sistema, carregados sob demanda. */
export function loadTexts(systemId) {
  if (!textCache.has(systemId)) {
    const system = getSystem(systemId)
    textCache.set(
      systemId,
      fetch(`${ASSET_BASE}${system.text}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    )
  }
  return textCache.get(systemId)
}
