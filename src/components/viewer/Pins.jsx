import { Html } from '@react-three/drei'
import { getNode } from '../../lib/catalog'
import { useAnatomyStore } from '../../store/useAnatomyStore'

/** Pins dos acidentes/partes da estrutura selecionada (ex.: Femur -> Greater trochanter). */
export default function Pins() {
  const selected = useAnatomyStore((s) => s.selected)
  const activePin = useAnatomyStore((s) => s.pin?.name)
  const showPins = useAnatomyStore((s) => s.showPins)
  const systemOn = useAnatomyStore((s) => !!s.visibleSystems[getNode(s.selected)?.s])
  const selectPin = useAnatomyStore((s) => s.selectPin)

  const pins = getNode(selected)?.pins
  if (!showPins || !systemOn || !pins) return null

  // Pins na origem não têm posição conhecida no atlas (dependem do plugin do Z-Anatomy)
  return pins.filter(([, x, y, z]) => x || y || z).map(([name, x, y, z]) => (
    <Html key={name} position={[x, y, z]} center zIndexRange={[20, 0]}>
      <button
        className={`pin ${activePin === name ? 'pin--active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          selectPin(selected, name)
        }}
      >
        <span className="pin__dot" />
        <span className="pin__label">{name}</span>
      </button>
    </Html>
  ))
}
