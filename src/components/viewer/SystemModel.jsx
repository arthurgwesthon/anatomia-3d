import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh'
import { ASSET_BASE, geometryKeys } from '../../lib/catalog'
import { registerMeshes, unregisterMeshes } from '../../lib/meshRegistry'
import { useAnatomyStore } from '../../store/useAnatomyStore'
import { ghostOf, hoverOf, realisticMaterial, selectedOf } from './materials'

const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`
const noRaycast = () => {}

/** Prepara a cena uma única vez: chave por mesh, material realista, BVH para cliques rápidos. */
function prepare(scene) {
  if (scene.userData.prepared) return scene.userData.meshes
  const meshes = []
  scene.traverse((o) => {
    if (!o.isMesh) return
    // Malhas com vários materiais viram filhos de um Group que guarda os extras
    o.userData.zid = o.userData.zid ?? o.parent?.userData.zid
    o.userData.baseMaterial = realisticMaterial(o.material)
    o.geometry.computeBoundsTree = computeBoundsTree
    o.geometry.computeBoundsTree()
    o.castShadow = true
    o.receiveShadow = true
    meshes.push(o)
  })
  scene.userData.prepared = true
  scene.userData.meshes = meshes
  return meshes
}

/** Aplica visibilidade e destaque a partir do estado global, sem re-render do React. */
function applyState(meshes, systemId, s) {
  const systemOn = !!s.visibleSystems[systemId]
  const selected = s.selected ? new Set(geometryKeys(s.selected)) : null
  const hovered = s.hovered ? new Set(geometryKeys(s.hovered)) : null
  const isolated = s.isolated ? new Set(geometryKeys(s.isolated)) : null

  for (const mesh of meshes) {
    const k = mesh.userData.zid
    const visible = systemOn && !s.hidden[k] && (!isolated || isolated.has(k))
    mesh.visible = visible
    mesh.raycast = visible ? acceleratedRaycast : noRaycast
    if (!visible) continue

    const base = mesh.userData.baseMaterial
    const isSelected = selected?.has(k)
    if (isSelected) mesh.material = selectedOf(base)
    else if (hovered?.has(k)) mesh.material = hoverOf(base)
    else if (s.xray) mesh.material = ghostOf(base)
    else mesh.material = base
    mesh.castShadow = !(s.xray && !isSelected)
  }
}

export default function SystemModel({ system }) {
  const { scene } = useGLTF(`${ASSET_BASE}${system.file}`, DRACO_PATH)
  const meshes = useMemo(() => prepare(scene), [scene])
  const select = useAnatomyStore((s) => s.select)
  const hover = useAnatomyStore((s) => s.hover)
  const unhover = useAnatomyStore((s) => s.unhover)

  useEffect(() => {
    registerMeshes(meshes)
    applyState(meshes, system.id, useAnatomyStore.getState())
    const unsubscribe = useAnatomyStore.subscribe((s) => applyState(meshes, system.id, s))
    return () => {
      unsubscribe()
      unregisterMeshes(meshes)
    }
  }, [meshes, system.id])

  return (
    <primitive
      object={scene}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta > 6) return // foi um arraste para girar, não um toque
        select(e.object.userData.zid, { focusObject: e.object })
      }}
      onPointerMove={(e) => {
        // Hover só com mouse: no iPad o "hover" ficaria preso depois do toque
        if (e.pointerType !== 'mouse') return
        e.stopPropagation()
        hover(e.object.userData.zid)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        unhover(e.object.userData.zid)
        document.body.style.cursor = 'auto'
      }}
    />
  )
}
