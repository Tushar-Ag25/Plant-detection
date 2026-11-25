import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Center, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function FloatingIntroLeaf({ progress }) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/leaf.glb')

  const { clone, autoScale } = useMemo(() => {
    const cloned = scene.clone()
    cloned.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          child.material.side = THREE.DoubleSide
          child.material.needsUpdate = true
          if (child.material.roughness !== undefined) {
            child.material.roughness = 0.35
          }
        }
      }
    })

    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const computedScale = maxDim > 0 ? 3.0 / maxDim : 0.45

    return { clone: cloned, autoScale: computedScale }
  }, [scene])

  // Move smoothly across the screen horizontally from left (-4.5) to right (+4.5)
  useFrame((state) => {
    if (groupRef.current) {
      const normalizedP = (progress || 0) / 100 // 0 to 1
      const targetX = -4.2 + normalizedP * 8.4
      const time = state.clock.elapsedTime

      // Natural gentle bobbing and fluttering in the air
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.1)
      groupRef.current.position.y = Math.sin(time * 2.5) * 0.35
      groupRef.current.position.z = Math.cos(time * 1.8) * 0.2

      // Gentle tumble & rotation as it floats along
      groupRef.current.rotation.x = 0.35 + Math.sin(time * 1.5) * 0.25
      groupRef.current.rotation.y = time * 0.9
      groupRef.current.rotation.z = Math.sin(time * 2.0) * 0.35
    }
  })

  return (
    <group ref={groupRef} position={[-4.2, 0, 0]}>
      <Center>
        <primitive object={clone} scale={autoScale} />
      </Center>
    </group>
  )
}

useGLTF.preload('/models/leaf.glb')

export default function Intro3DPreloader({ progress }) {
  return (
    <div className="w-full h-[220px] relative pointer-events-none select-none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.5], fov: 45 }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 5]} intensity={1.8} color="#FFFFFF" />
        <directionalLight position={[-5, -2, -3]} intensity={1.2} color="#86EFAC" />
        <pointLight position={[0, 2, 3]} intensity={0.8} color="#BBF7D0" />

        <Suspense fallback={null}>
          <FloatingIntroLeaf progress={progress} />
        </Suspense>
      </Canvas>
    </div>
  )
}
