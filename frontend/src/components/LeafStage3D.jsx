import React, { useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  ContactShadows,
  Float,
  Center,
  useGLTF
} from '@react-three/drei'
import * as THREE from 'three'

// Clean Model Component loading user's realistic leaf.glb with normalized bounding-box sizing
function GlbModel({ url = '/models/leaf.glb' }) {
  const { scene } = useGLTF(url)

  const { clone, autoScale } = useMemo(() => {
    const cloned = scene.clone()
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          child.material.side = THREE.DoubleSide
          child.material.needsUpdate = true
          if (child.material.roughness !== undefined) {
            child.material.roughness = Math.min(child.material.roughness, 0.45)
          }
        }
      }
    })

    // Compute bounding box to automatically normalize size regardless of raw GLB dimensions
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    
    // Fit cleanly into a comfortable 2.2 unit viewing envelope
    const targetDim = 2.2
    const computedScale = maxDim > 0 ? targetDim / maxDim : 0.35

    return { clone: cloned, autoScale: computedScale }
  }, [scene])

  return (
    <Center>
      <primitive
        object={clone}
        scale={autoScale}
        rotation={[0.35, 0.15, -0.05]}
      />
    </Center>
  )
}

useGLTF.preload('/models/leaf.glb')

function ModelLoader() {
  return null
}

export default function LeafStage3D() {
  return (
    <div className="relative w-full h-[400px] sm:h-[460px] cursor-grab active:cursor-grabbing select-none flex items-center justify-center">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 7.5], fov: 36 }}
        shadows
      >
        {/* Studio Lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[5, 8, 6]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-6, 3, -4]} intensity={1.1} color="#DCFCE7" />
        <directionalLight position={[0, -4, 2]} intensity={0.5} color="#FEF08A" />
        <pointLight position={[0, 4, 3]} intensity={0.7} color="#FFFFFF" />

        {/* Gentle, Lifelike Idle Floating */}
        <Float
          speed={2.0}
          rotationIntensity={0.18}
          floatIntensity={0.2}
          floatingRange={[-0.05, 0.05]}
        >
          <Suspense fallback={<ModelLoader />}>
            <GlbModel url="/models/leaf.glb" />
          </Suspense>
        </Float>

        {/* Grounded Soft Contact Shadow */}
        <ContactShadows
          position={[0, -1.6, 0]}
          opacity={0.35}
          scale={5.0}
          blur={2.4}
          far={3.5}
          color="#14532D"
        />

        {/* Smooth 360 Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          enablePan={false}
          minDistance={3.5}
          maxDistance={12.0}
          autoRotate={true}
          autoRotateSpeed={1.2}
        />
      </Canvas>
    </div>
  )
}
