import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, Sparkles } from '@react-three/drei';
import { Box } from '@mui/material';
import * as THREE from 'three';

const ComplexCrystalScene = () => {
  const groupRef = useRef();
  const ringsRef = useRef();
  const shardsRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate the entire crystal group around the Y-axis (left to right)
      groupRef.current.rotation.y += delta * 0.4;
    }
    if (ringsRef.current) {
      // Swirling rings rotate slightly faster and on a tilted axis
      ringsRef.current.rotation.y -= delta * 0.6;
      ringsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (shardsRef.current) {
      // Small shards orbiting
      shardsRef.current.rotation.y += delta * 0.8;
    }
  });

  const crystalMaterial = new THREE.MeshPhysicalMaterial({
    color: "#c084fc",
    emissive: "#a855f7",
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.2,
    transmission: 0.95, // Glass-like transparency
    thickness: 1.0, 
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: "#d8b4fe",
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  return (
    <group position={[0, -1, 0]}>
      {/* The main hovering crystal */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
        <mesh ref={groupRef} position={[0, 2, 0]} scale={[1.2, 2.2, 1.2]} material={crystalMaterial}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
      </Float>

      {/* Orbiting shards */}
      <group ref={shardsRef} position={[0, 2, 0]}>
        {[0, 1, 2].map((i) => (
          <Float key={i} speed={3} rotationIntensity={2} floatIntensity={1}>
            <mesh 
              position={[Math.cos(i * Math.PI * 0.66) * 2.5, Math.sin(i) * 0.5, Math.sin(i * Math.PI * 0.66) * 2.5]} 
              scale={[0.2, 0.3, 0.2]} 
              material={crystalMaterial}
            >
              <octahedronGeometry args={[1, 0]} />
            </mesh>
          </Float>
        ))}
      </group>

      {/* Swirling energy rings */}
      <group ref={ringsRef} position={[0, 1.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.01, 16, 100]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2.1, 0.1, 0]} position={[0, 0.5, 0]}>
          <torusGeometry args={[2.2, 0.008, 16, 100]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 1.9, -0.1, 0]} position={[0, -0.5, 0]}>
          <torusGeometry args={[2.5, 0.005, 16, 100]} />
          <meshBasicMaterial color="#e9d5ff" transparent opacity={0.2} />
        </mesh>
      </group>

      {/* Glowing Pedestal Base */}
      <group position={[0, -0.5, 0]}>
        {/* Top glow surface */}
        <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.2, 32]} />
          <meshBasicMaterial color="#d8b4fe" transparent opacity={0.8} />
        </mesh>
        
        {/* Upper tier */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[1.2, 1.4, 0.2, 32]} />
          <meshStandardMaterial color="#2e1065" roughness={0.4} metalness={0.8} />
        </mesh>
        
        {/* Middle glowing ring */}
        <mesh position={[0, 0.0, 0]}>
          <cylinderGeometry args={[1.35, 1.35, 0.1, 32]} />
          <meshBasicMaterial color="#a855f7" />
        </mesh>
        
        {/* Lower tier */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[1.4, 1.5, 0.3, 32]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.6} metalness={0.6} />
        </mesh>

        {/* Base glow pool */}
        <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3, 32]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.15} />
        </mesh>
      </group>

      {/* Ambient sparkles / starry dust */}
      <Sparkles count={50} scale={6} size={2} speed={0.4} color="#e9d5ff" position={[0, 1.5, 0]} />
    </group>
  );
};

const Crystal3D = () => {
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas camera={{ position: [0, 1.5, 7], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} color="#d8b4fe" />
        <directionalLight position={[-5, -5, -5]} intensity={1.5} color="#818cf8" />
        <pointLight position={[0, 0, 0]} intensity={2} color="#a855f7" distance={5} />
        
        <ComplexCrystalScene />
        
        <Environment preset="city" />
      </Canvas>
    </Box>
  );
};

export default Crystal3D;
