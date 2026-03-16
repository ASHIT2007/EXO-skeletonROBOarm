import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Cylinder, Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface RoboticHandProps {
  fingerAngles: number[][]; // [5 fingers][3 segments]
  wristAngle: number;
  baseRotation: number;
  wireframe: boolean;
  opacity?: number;
  lastInputTime?: number; // For idle detection
}

const COLORS = {
  MAIN: "#7ec8c8",
  JOINT: "#1a1a1a",
  TIP: "#5bb8b8",
  ACCENT: "#2a3a3a",
  EMISSIVE: "#00ffff",
};

const FingerSegment: React.FC<{
  length: number;
  radiusBottom: number;
  radiusTop: number;
  angle: number;
  wireframe: boolean;
  isTip?: boolean;
  opacity: number;
  idleOscillation: number;
  children?: React.ReactNode;
}> = ({ length, radiusBottom, radiusTop, angle, wireframe, isTip, opacity, idleOscillation, children }) => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (ref.current) {
      const targetRotation = THREE.MathUtils.degToRad(angle + idleOscillation);
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRotation, 0.1);
    }
  });

  return (
    <group ref={ref}>
      {/* Joint Sphere (Actuator Knob) */}
      <mesh>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial 
          color={COLORS.JOINT} 
          metalness={1} 
          roughness={0.05} 
          emissive={COLORS.EMISSIVE}
          emissiveIntensity={0.2}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Segment Body */}
      <mesh position={[0, length / 2, 0]}>
        {isTip ? (
          <Sphere args={[radiusBottom, 16, 16]} scale={[1, length / radiusBottom, 1]}>
            <meshStandardMaterial 
              color={COLORS.TIP} 
              metalness={0.4} 
              roughness={0.5} 
              wireframe={wireframe}
              transparent={opacity < 1}
              opacity={opacity}
            />
          </Sphere>
        ) : (
          <Cylinder args={[radiusTop, radiusBottom, length, 16]}>
            <meshStandardMaterial 
              color={COLORS.MAIN} 
              metalness={0.85} 
              roughness={0.2} 
              wireframe={wireframe}
              transparent={opacity < 1}
              opacity={opacity}
            />
          </Cylinder>
        )}
      </mesh>

      {/* Next Segment Anchor */}
      <group position={[0, length, 0]}>
        {children}
      </group>
    </group>
  );
};

export const RoboticHand: React.FC<RoboticHandProps> = ({ 
  fingerAngles, 
  wristAngle, 
  baseRotation, 
  wireframe, 
  opacity = 1,
  lastInputTime = Date.now()
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);

  const isIdle = Date.now() - lastInputTime > 3000;

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const idleOsc = isIdle ? Math.sin(time * 2) * 1 : 0; // ±1°

    if (wristRef.current) {
      const targetWristX = THREE.MathUtils.degToRad(wristAngle + (isIdle ? idleOsc * 0.5 : 0));
      wristRef.current.rotation.z = THREE.MathUtils.lerp(wristRef.current.rotation.z, targetWristX, 0.1);
    }
    if (groupRef.current) {
        const targetBaseY = THREE.MathUtils.degToRad(baseRotation - 180);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetBaseY, 0.1);
    }
  });

  const getIdleOsc = (state: any) => isIdle ? Math.sin(state.clock.elapsedTime * 2) * 1 : 0;

  // Finger Knuckle X positions (left to right): [-0.13, -0.043, 0.043, 0.13]
  // Z = -0.10 (front edge)
  const fingerParams = [
    { name: 'Index', pos: [-0.13, 0.03, -0.10], lengths: [0.08, 0.06, 0.04] },
    { name: 'Middle', pos: [-0.043, 0.03, -0.10], lengths: [0.09, 0.07, 0.05] },
    { name: 'Ring', pos: [0.043, 0.03, -0.10], lengths: [0.08, 0.06, 0.04] },
    { name: 'Pinky', pos: [0.13, 0.03, -0.10], lengths: [0.06, 0.05, 0.04] },
  ];

  const radii = [
    { bottom: 0.028, top: 0.022 }, // Proximal
    { bottom: 0.022, top: 0.018 }, // Middle
    { bottom: 0.018, top: 0.012 }, // Distal
  ];

  return (
    <group ref={groupRef}>
      {/* Forearm (Shortened) */}
      <mesh position={[0, -0.25, 0]}>
        <Cylinder args={[0.08, 0.1, 0.35, 32]} />
        <meshStandardMaterial color={COLORS.ACCENT} metalness={0.9} roughness={0.15} wireframe={wireframe} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      {/* Wrist Connector */}
      <mesh position={[0, -0.045, 0]}>
        <Cylinder args={[0.09, 0.12, 0.06, 32]} />
        <meshStandardMaterial color={COLORS.ACCENT} metalness={0.9} roughness={0.15} wireframe={wireframe} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      {/* Palm Support / Wrist Unit */}
      <group ref={wristRef} position={[0, 0, 0]}>
        {/* Palm Body: width 0.35, height 0.06, depth 0.28 */}
        <group position={[0, 0.03, 0]}>
          <Box args={[0.35, 0.06, 0.28]}>
            <meshStandardMaterial color={COLORS.MAIN} metalness={0.85} roughness={0.2} wireframe={wireframe} transparent={opacity < 1} opacity={opacity} />
          </Box>
          
          {/* Palm Detail Panels */}
          {[ -0.06, 0, 0.06 ].map((zOffset, i) => (
            <Box key={i} args={[0.25, 0.005, 0.02]} position={[0, 0.031, zOffset]}>
              <meshStandardMaterial color={COLORS.ACCENT} metalness={0.9} roughness={0.15} wireframe={wireframe} transparent={opacity < 1} opacity={opacity} />
            </Box>
          ))}

          {/* Thumb: (x=-0.17, y=0, z=-0.02), rotated 35° outward on Z */}
          <group position={[-0.17, 0, -0.02]} rotation={[0, 0.5, 0.6]}> {/* ~35 deg outward */}
            <FingerSegment length={0.07} radiusBottom={0.028} radiusTop={0.022} angle={fingerAngles[0][0]} wireframe={wireframe} opacity={opacity} idleOscillation={0}>
              <FingerSegment length={0.06} radiusBottom={0.022} radiusTop={0.018} angle={fingerAngles[0][1]} wireframe={wireframe} opacity={opacity} idleOscillation={0}>
                 <FingerSegment length={0.04} radiusBottom={0.018} radiusTop={0.012} angle={fingerAngles[0][2]} wireframe={wireframe} isTip opacity={opacity} idleOscillation={0} />
              </FingerSegment>
            </FingerSegment>
          </group>

          {/* Other 4 Fingers */}
          {fingerParams.map((finger, i) => {
             const fIdx = i + 1;
             return (
              <group key={i} position={finger.pos as any} rotation={[-Math.PI / 2, 0, 0]}>
                <FingerSegment length={finger.lengths[0]} radiusBottom={radii[0].bottom} radiusTop={radii[0].top} angle={fingerAngles[fIdx][0]} wireframe={wireframe} opacity={opacity} idleOscillation={0}>
                  <FingerSegment length={finger.lengths[1]} radiusBottom={radii[1].bottom} radiusTop={radii[1].top} angle={fingerAngles[fIdx][1]} wireframe={wireframe} opacity={opacity} idleOscillation={0}>
                    <FingerSegment length={finger.lengths[2]} radiusBottom={radii[2].bottom} radiusTop={radii[2].top} angle={fingerAngles[fIdx][2]} wireframe={wireframe} isTip opacity={opacity} idleOscillation={0} />
                  </FingerSegment>
                </FingerSegment>
              </group>
             );
          })}
        </group>
      </group>
    </group>
  );
};
