import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Lightformer,
  Loader,
  OrbitControls,
  PerformanceMonitor,
} from '@react-three/drei'
import { useAnatomyStore, HOME_CAMERA, HOME_TARGET } from '../../store/useAnatomyStore'
import SystemModel from './SystemModel'
import ModelErrorBoundary from './ModelErrorBoundary'
import Pins from './Pins'
import CameraRig from './CameraRig'
import Effects from './Effects'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** Iluminação de estúdio gerada localmente (sem baixar HDRI): softboxes que viram reflexos. */
function StudioLighting() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#fff4ea" position={[0, 4, 3]} scale={[6, 2, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#dfe8ff" position={[-5, 2, 1]} scale={[3, 6, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe2d0" position={[5, 1.5, -2]} scale={[3, 6, 1]} target={[0, 1, 0]} />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 2, -6]} scale={3} target={[0, 1, 0]} />
      </Environment>
      <directionalLight position={[2, 4, 3]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
      <hemisphereLight args={['#ffffff', '#30261f', 0.25]} />
    </>
  )
}

export default function Viewer() {
  const catalog = useAnatomyStore((s) => s.catalog)
  const visibleSystems = useAnatomyStore((s) => s.visibleSystems)
  const select = useAnatomyStore((s) => s.select)
  // Começa em alta qualidade; o PerformanceMonitor rebaixa se o FPS cair (ex.: iPad antigo)
  const [quality, setQuality] = useState('high')
  const [dpr, setDpr] = useState(isTouch ? 1.5 : 2)

  // Um sistema só é baixado quando ligado pela 1ª vez; depois fica montado (oculto) para religar rápido
  const [loaded, setLoaded] = useState({})
  useEffect(() => {
    setLoaded((prev) => {
      const next = { ...prev }
      for (const [id, on] of Object.entries(visibleSystems)) if (on) next[id] = true
      return next
    })
  }, [visibleSystems])

  return (
    <>
      <Canvas
        shadows
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: HOME_CAMERA, fov: 35, near: 0.01, far: 50 }}
        onPointerMissed={(e) => e.type === 'click' && select(null)}
      >
        <PerformanceMonitor
          onDecline={() => {
            setQuality('low')
            setDpr(1)
          }}
          flipflops={2}
        />
        <color attach="background" args={['#202a38']} />
        <StudioLighting />

        {catalog.systems
          .filter((system) => loaded[system.id])
          .map((system) => (
            <ModelErrorBoundary key={system.id} label={system.name}>
              <Suspense fallback={null}>
                <SystemModel system={system} />
              </Suspense>
            </ModelErrorBoundary>
          ))}
        <Pins />

        <ContactShadows position={[0, -0.075, 0]} opacity={0.55} scale={3} blur={2.2} far={1.2} resolution={512} />
        <OrbitControls
          makeDefault
          target={HOME_TARGET}
          enableDamping
          dampingFactor={0.08}
          zoomToCursor
          zoomSpeed={isTouch ? 1.2 : 0.8}
          rotateSpeed={isTouch ? 0.8 : 0.7}
          minDistance={0.05}
          maxDistance={6}
        />
        <CameraRig />
        <Effects quality={quality} />
      </Canvas>
      <Loader />
    </>
  )
}
