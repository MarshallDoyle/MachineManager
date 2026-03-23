import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'

interface PointCloudData {
  positions: Float32Array  // x, y, z interleaved
  colors: Float32Array     // r, g, b interleaved
  count: number
  stats: { min: number; max: number; mean: number; rms: number }
}

// Generate demo data: 100x100 grid with slight Z deviation
export function generateDemoData(gridSize: number = 100, plateWidth: number = 200, plateHeight: number = 200): PointCloudData {
  const count = gridSize * gridSize
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  let sumZ = 0
  let sumZ2 = 0
  let minZ = Infinity
  let maxZ = -Infinity

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const idx = (i * gridSize + j) * 3
      const x = (i / (gridSize - 1) - 0.5) * plateWidth
      const y = (j / (gridSize - 1) - 0.5) * plateHeight

      // Simulate a slightly warped build plate
      const z = Math.sin(x * 0.02) * 0.3 + Math.cos(y * 0.015) * 0.2 + (Math.random() - 0.5) * 0.1

      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z

      sumZ += z
      sumZ2 += z * z
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
  }

  const mean = sumZ / count
  const rms = Math.sqrt(sumZ2 / count)

  // Color by Z deviation: blue (low) → green (nominal) → red (high)
  const range = maxZ - minZ || 1
  for (let i = 0; i < count; i++) {
    const z = positions[i * 3 + 2]
    const t = (z - minZ) / range

    if (t < 0.5) {
      colors[i * 3] = 0
      colors[i * 3 + 1] = t * 2
      colors[i * 3 + 2] = 1 - t * 2
    } else {
      colors[i * 3] = (t - 0.5) * 2
      colors[i * 3 + 1] = 1 - (t - 0.5) * 2
      colors[i * 3 + 2] = 0
    }
  }

  return { positions, colors, count, stats: { min: minZ, max: maxZ, mean, rms } }
}

function PointCloud({ data }: { data: PointCloudData }) {
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    return geo
  }, [data])

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial vertexColors size={1.5} sizeAttenuation />
    </points>
  )
}

function Scene({ data }: { data: PointCloudData }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={0.5} />
      <PointCloud data={data} />
      <Grid
        args={[200, 200]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#333"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#555"
        fadeDistance={400}
        position={[0, 0, -1]}
      />
      <axesHelper args={[50]} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
    </>
  )
}

export function PointCloudCanvas({ data }: { data: PointCloudData }) {
  return (
    <Canvas
      camera={{ position: [150, 150, 100], fov: 50, near: 0.1, far: 2000 }}
      style={{ background: '#0a0a0a' }}
    >
      <Scene data={data} />
    </Canvas>
  )
}

export type { PointCloudData }
