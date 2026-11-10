import { create } from 'zustand'
import { geometryKeys, getNode } from '../lib/catalog'

export const HOME_CAMERA = [0, 0.95, 3.6]
export const HOME_TARGET = [0, 0.83, 0]

// Camadas que cobrem o que interessa (as fáscias envolvem os músculos como uma pele).
// Começam ocultas e "Mostrar tudo" volta a este estado; dá para ligar pelo olho na árvore.
const DEFAULT_HIDDEN_NODES = ['muscular/Fasciae']
const defaultHidden = () =>
  Object.fromEntries(DEFAULT_HIDDEN_NODES.flatMap((key) => geometryKeys(key)).map((k) => [k, true]))

export const useAnatomyStore = create((set) => ({
  catalog: null,
  visibleSystems: {},
  hidden: {}, // chave com geometria -> true
  isolated: null, // chave de nó
  selected: null, // chave de nó
  pin: null, // { name, owner } — acidente/parte selecionado num pin
  hovered: null, // chave de nó
  xray: false,
  showPins: true,
  // Pedido para a câmera: { key } enquadra um nó, { home: true } volta ao início
  focus: null,

  setCatalog: (catalog) =>
    set({
      catalog,
      visibleSystems: Object.fromEntries(catalog.systems.map((s) => [s.id, s.defaultVisible])),
      hidden: defaultHidden(),
    }),

  toggleSystem: (id) =>
    set((s) => ({ visibleSystems: { ...s.visibleSystems, [id]: !s.visibleSystems[id] } })),

  /** Mostra/oculta um nó e tudo abaixo dele. */
  toggleHidden: (key) =>
    set((s) => {
      const keys = geometryKeys(key)
      const allHidden = keys.every((k) => s.hidden[k])
      const hidden = { ...s.hidden }
      for (const k of keys) {
        if (allHidden) delete hidden[k]
        else hidden[k] = true
      }
      return { hidden }
    }),

  /**
   * `focus: true` enquadra o nó inteiro (ex.: os dois fêmures);
   * `focusObject` enquadra só a mesh tocada (ex.: o fêmur direito).
   */
  select: (key, { focus = false, focusObject = null } = {}) =>
    set((s) => {
      if (!key) return { selected: null, pin: null }
      const system = getNode(key)?.s
      return {
        selected: key,
        pin: null,
        // Selecionar algo de um sistema desligado (ex.: pela busca) liga o sistema
        visibleSystems: system ? { ...s.visibleSystems, [system]: true } : s.visibleSystems,
        focus: focus || focusObject ? { key, object: focusObject, nonce: Date.now() } : s.focus,
      }
    }),

  selectPin: (owner, name) => set({ selected: owner, pin: { owner, name } }),

  hover: (key) => set((s) => (s.hovered === key ? s : { hovered: key })),
  unhover: (key) => set((s) => (s.hovered === key ? { hovered: null } : s)),

  isolate: (key) => set({ isolated: key }),
  hide: (key) =>
    set((s) => {
      const hidden = { ...s.hidden }
      for (const k of geometryKeys(key)) hidden[k] = true
      return { hidden, selected: null, pin: null }
    }),
  showAll: () => set({ hidden: defaultHidden(), isolated: null }),

  toggleXray: () => set((s) => ({ xray: !s.xray })),
  togglePins: () => set((s) => ({ showPins: !s.showPins })),
  focusOn: (key) => set({ focus: { key, nonce: Date.now() } }),
  resetCamera: () => set({ focus: { home: true, nonce: Date.now() } }),
}))
