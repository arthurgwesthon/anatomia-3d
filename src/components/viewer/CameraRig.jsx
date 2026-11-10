import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box3, Vector3 } from 'three'
import { geometryKeys } from '../../lib/catalog'
import { boxFor } from '../../lib/meshRegistry'
import { useAnatomyStore, HOME_CAMERA, HOME_TARGET } from '../../store/useAnatomyStore'

const MAX_WAIT_FRAMES = 600 // ~10 s esperando o sistema baixar
const MARGIN = 1.35 // folga ao enquadrar (1 = peça encostando nas bordas)

/**
 * Anima alvo e posição da câmera quando `focus` muda no store.
 * Para { key }, espera as meshes do nó carregarem e enquadra a caixa envolvente;
 * o alvo do OrbitControls vira o centro da peça, então girar passa a ser em volta dela.
 * Qualquer toque/arraste do usuário cancela a animação na hora.
 */
export default function CameraRig() {
  const controls = useThree((s) => s.controls)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const focus = useAnatomyStore((s) => s.focus)
  const pending = useRef(null)
  const anim = useRef(null)

  useEffect(() => {
    if (!controls) return
    const cancel = () => {
      anim.current = null
      pending.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useEffect(() => {
    if (!focus) return
    anim.current = null
    pending.current = null
    if (focus.home) {
      anim.current = { target: new Vector3(...HOME_TARGET), position: new Vector3(...HOME_CAMERA) }
    } else {
      pending.current = { key: focus.key, object: focus.object, frames: 0 }
    }
  }, [focus])

  useFrame((_, delta) => {
    if (!controls) return

    if (pending.current) {
      const { key, object } = pending.current
      const box = object ? new Box3().setFromObject(object) : boxFor(geometryKeys(key))
      if (box) {
        const center = box.getCenter(new Vector3())
        const radius = box.getSize(new Vector3()).length() / 2
        // Usa o menor FOV (vertical ou horizontal) para caber também em tela retrato
        const vFov = (camera.fov * Math.PI) / 180
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / size.height))
        const distance = Math.max((radius * MARGIN) / Math.sin(Math.min(vFov, hFov) / 2), 0.12)
        const dir = camera.position.clone().sub(controls.target).normalize()
        anim.current = { target: center, position: center.clone().addScaledVector(dir, distance) }
        pending.current = null
      } else if (++pending.current.frames > MAX_WAIT_FRAMES) {
        pending.current = null
      }
    }

    if (!anim.current) return
    const t = 1 - Math.exp(-delta * 5)
    const { target, position } = anim.current
    controls.target.lerp(target, t)
    camera.position.lerp(position, t)
    controls.update()
    if (controls.target.distanceTo(target) < 0.0005 && camera.position.distanceTo(position) < 0.0005) {
      anim.current = null
    }
  })

  return null
}
