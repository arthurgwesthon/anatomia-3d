import { Box3 } from 'three'

// zid (chave do catálogo) -> Set de meshes carregadas. Usado para enquadrar a câmera e
// para o contorno de seleção. `version` muda a cada sistema (des)registrado.
const registry = new Map()
const listeners = new Set()
let version = 0

function changed() {
  version++
  for (const l of listeners) l()
}

export function registerMeshes(meshes) {
  for (const m of meshes) {
    const zid = m.userData.zid
    if (!registry.has(zid)) registry.set(zid, new Set())
    registry.get(zid).add(m)
  }
  changed()
}

export function unregisterMeshes(meshes) {
  for (const m of meshes) registry.get(m.userData.zid)?.delete(m)
  changed()
}

/** Para useSyncExternalStore. */
export const subscribeRegistry = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getRegistryVersion = () => version

export function meshesFor(keys) {
  const out = []
  for (const k of keys) for (const m of registry.get(k) ?? []) out.push(m)
  return out
}

/** Caixa envolvente das meshes visíveis das chaves dadas (null se nada carregado). */
export function boxFor(keys) {
  const box = new Box3()
  for (const mesh of meshesFor(keys)) {
    if (mesh.visible) box.expandByObject(mesh)
  }
  return box.isEmpty() ? null : box
}
