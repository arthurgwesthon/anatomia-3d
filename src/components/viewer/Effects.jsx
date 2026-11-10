import { useMemo, useSyncExternalStore } from 'react'
import { EffectComposer, N8AO, Outline, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { geometryKeys } from '../../lib/catalog'
import { getRegistryVersion, meshesFor, subscribeRegistry } from '../../lib/meshRegistry'
import { useAnatomyStore } from '../../store/useAnatomyStore'

/**
 * Pós-processamento: oclusão ambiente (frestas entre peças), contorno da seleção,
 * tone mapping cinematográfico e vinheta. `quality="low"` desliga o mais caro.
 */
export default function Effects({ quality }) {
  const selected = useAnatomyStore((s) => s.selected)
  const registryVersion = useSyncExternalStore(subscribeRegistry, getRegistryVersion)
  const selection = useMemo(
    () => (selected ? meshesFor(geometryKeys(selected)) : []),
    [selected, registryVersion],
  )
  const high = quality === 'high'

  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      {high && (
        <N8AO aoRadius={0.06} distanceFalloff={0.6} intensity={2.2} quality="medium" halfRes color="#1a0d08" />
      )}
      <Outline
        selection={selection}
        edgeStrength={4}
        visibleEdgeColor={0xffc040}
        hiddenEdgeColor={0x8a6418}
        blur
        xRay
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  )
}
