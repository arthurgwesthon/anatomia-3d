import { Color, MeshPhysicalMaterial } from 'three'

// O exportador gera um material por cor, com nome "z#rrggbb". Aqui cada um vira um
// MeshPhysicalMaterial com acabamento conforme o tecido: osso fosco, tecido mole "úmido".
const FINISH = {
  bone: { roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.6 },
  muscle: { roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35, sheen: 0.6, sheenRoughness: 0.5, sheenColor: '#ff9a8a' },
  vessel: { roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 },
  nerve: { roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4 },
  organ: { roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.3, sheen: 0.4, sheenRoughness: 0.5, sheenColor: '#ffd0c0' },
  pale: { roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45 }, // ligamentos, cartilagem, tendões
}

const TISSUE_BY_COLOR = {
  '#e3d6bc': 'bone', '#f2efe6': 'bone', '#e8dcc0': 'bone', '#efe6cf': 'bone', '#cbb894': 'bone',
  '#b44a3f': 'muscle', '#b03a33': 'muscle',
  '#c0392b': 'vessel', '#2e5fa8': 'vessel',
  '#e8c547': 'nerve', '#e0a040': 'nerve',
  '#a9c8d8': 'pale', '#d9cfae': 'pale', '#b9a6d6': 'pale', '#a7c7e7': 'pale', '#e6e1d3': 'pale', '#d8c3b0': 'pale',
}

const upgraded = new Map() // uuid do material original -> material físico

export function realisticMaterial(original) {
  let m = upgraded.get(original.uuid)
  if (m) return m
  const hex = original.name?.startsWith('z#') ? original.name.slice(1).toLowerCase() : null
  const { sheenColor, ...finish } = FINISH[TISSUE_BY_COLOR[hex] ?? 'organ']
  m = new MeshPhysicalMaterial({ name: original.name, color: original.color, metalness: 0, ...finish })
  if (sheenColor) m.sheenColor.set(sheenColor)
  upgraded.set(original.uuid, m)
  return m
}

// Variações por material-base
const cache = { hover: new WeakMap(), ghost: new WeakMap(), selected: new WeakMap() }

function variant(kind, base, make) {
  let m = cache[kind].get(base)
  if (!m) {
    m = base.clone()
    make(m)
    cache[kind].set(base, m)
  }
  return m
}

export const hoverOf = (base) =>
  variant('hover', base, (m) => {
    m.emissive = new Color('#ffffff')
    m.emissiveIntensity = 0.12
  })

// A seleção mantém a cor do tecido com um brilho dourado (o contorno vem do pós-processamento)
export const selectedOf = (base) =>
  variant('selected', base, (m) => {
    m.emissive = new Color('#ffb020')
    m.emissiveIntensity = 0.25
  })

export const ghostOf = (base) =>
  variant('ghost', base, (m) => {
    m.transparent = true
    m.opacity = 0.12
    m.depthWrite = false
    m.clearcoat = 0
    m.sheen = 0
  })
