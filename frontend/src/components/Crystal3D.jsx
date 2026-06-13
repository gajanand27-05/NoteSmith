import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, Sparkles, Stars, MeshTransmissionMaterial } from '@react-three/drei';
import { Box } from '@mui/material';
import * as THREE from 'three';

const CinematicCrystalScene = () => {
  const mainCrystalRef = useRef();
  const shardsGroupRef = useRef();

  useFrame((state, delta) => {
    // Smooth cinematic rotation for the main crystal
    if (mainCrystalRef.current) {
      mainCrystalRef.current.rotation.y += delta * 0.2;
    }
    // Orbiting shards rotation
    if (shardsGroupRef.current) {
      shardsGroupRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={[0, -0.8, 0]}>
      {/* BACKGROUND: Space Void, Stars, and Nebula Dust */}
      <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={150} scale={12} size={3} speed={0.2} color="#c084fc" opacity={0.4} position={[0, 2, 0]} />

      {/* THE MAIN CRYSTAL */}
      <Float speed={2} rotationIntensity={0.05} floatIntensity={0.2}>
        <mesh ref={mainCrystalRef} position={[0, 2.5, 0]} scale={[1.4, 2.5, 1.4]}>
          <octahedronGeometry args={[1, 0]} />
          {/* Glass-like refraction and reflection */}
          <MeshTransmissionMaterial
            color="#d8b4fe"
            emissive="#7e22ce"
            emissiveIntensity={0.4}
            roughness={0.05}
            metalness={0.1}
            transmission={1}
            thickness={1.5}
            ior={1.5}
            chromaticAberration={0.04}
            backside={true}
            transparent={true}
            opacity={0.9}
          />
        </mesh>
      </Float>

      {/* ORBITING SHARDS & PATHS */}
      <group position={[0, 2.5, 0]}>
        {/* Faint glowing purple circular paths */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.015, 16, 100]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.2, 1.2, 1]}>
          <torusGeometry args={[3, 0.01, 16, 100]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.15} />
        </mesh>

        {/* The shards themselves */}
        <group ref={shardsGroupRef}>
          {[0, 1, 2, 3].map((i) => {
            const angle = (i * Math.PI) / 2;
            const radius = 3;
            return (
              <Float key={i} speed={3} rotationIntensity={2} floatIntensity={1}>
                <mesh 
                  position={[Math.cos(angle) * radius, Math.sin(angle * 2) * 0.4, Math.sin(angle) * radius]} 
                  scale={[0.25, 0.4, 0.25]} 
                >
                  <octahedronGeometry args={[1, 0]} />
                  <MeshTransmissionMaterial
                    color="#e9d5ff"
                    emissive="#9333ea"
                    emissiveIntensity={0.6}
                    roughness={0.1}
                    transmission={0.9}
                    thickness={0.5}
                  />
                </mesh>
              </Float>
            );
          })}
        </group>
      </group>

      {/* DARK FUTURISTIC PEDESTAL */}
      <group position={[0, 0, 0]}>
        {/* Core pillar */}
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[1.6, 1.8, 0.8, 64]} />
          <meshStandardMaterial color="#0f0b1a" roughness={0.7} metalness={0.5} />
        </mesh>

        {/* Illuminated top surface ring */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.3, 1.5, 64]} />
          <meshBasicMaterial color="#c084fc" />
        </mesh>

        {/* Center top glowing core */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.8, 32]} />
          <meshBasicMaterial color="#d8b4fe" transparent opacity={0.8} />
        </mesh>

        {/* Glowing concentric rings floating above pedestal */}
        {[0.2, 0.4, 0.6].map((h, i) => (
          <mesh key={i} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.4 - i * 0.2, 0.02, 16, 100]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.8 - i * 0.2} />
          </mesh>
        ))}

        {/* Ambient base glow */}
        <mesh position={[0, -0.79, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[4, 64]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.1} />
        </mesh>
      </group>

    </group>
  );
};

const Crystal3D = () => {
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      {/* Using a dark space background */}
      <Canvas camera={{ position: [0, 2, 9], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#d8b4fe" />
        <directionalLight position={[-5, 5, -5]} intensity={0.8} color="#818cf8" />
        <pointLight position={[0, 2.5, 0]} intensity={2.5} color="#c084fc" distance={8} />
        <pointLight position={[0, 0.5, 0]} intensity={2} color="#a855f7" distance={4} />
        
        <CinematicCrystalScene />
        
        <Environment preset="night" />
      </Canvas>
    </Box>
  );
};

export default Crystal3D;
