import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import { Box } from '@mui/material';

const Crystal = () => {
  const meshRef = useRef();

  // Slowly rotate the crystal on the Y axis
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <Float
      speed={2} // Animation speed
      rotationIntensity={0.2} // XYZ rotation intensity
      floatIntensity={0.5} // Up/down float intensity
    >
      <mesh ref={meshRef} scale={[1.2, 2.0, 1.2]}>
        {/* OctahedronGeometry gives us that 8-sided diamond/crystal shape */}
        <octahedronGeometry args={[1, 0]} />
        {/* A physical material allows for glass-like transmission and glowing emission */}
        <meshPhysicalMaterial 
          color="#c084fc"
          emissive="#a855f7"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.1}
          transmission={0.9} // Glass-like transparency
          thickness={0.5} // Volume for refraction
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent={true}
          opacity={0.9}
        />
      </mesh>
    </Float>
  );
};

const Crystal3D = () => {
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      {/* 
        We use alpha: true in gl to ensure the canvas has a transparent background 
      */}
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        {/* Purple highlight light from top right */}
        <directionalLight position={[5, 5, 5]} intensity={2} color="#d8b4fe" />
        {/* Blue highlight light from bottom left */}
        <directionalLight position={[-5, -5, -5]} intensity={1.5} color="#818cf8" />
        
        <Crystal />
        
        {/* Environment map for realistic reflections on the glass surface */}
        <Environment preset="city" />
      </Canvas>
    </Box>
  );
};

export default Crystal3D;
