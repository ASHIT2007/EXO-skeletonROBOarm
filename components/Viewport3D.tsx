import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Grid,
  OrbitControls,
  RoundedBox,
  Cylinder,
  Box,
  Sphere,
  Environment as DreiEnvironment,
} from '@react-three/drei';
import * as THREE from 'three';
import { SystemStatus, ViewMode, JointState, GestureMode } from '../types';

interface Viewport3DProps {
  joints: JointState;
  ghostJoints?: JointState;
  status: SystemStatus;
  power: boolean;
  viewMode: ViewMode;
  pressure: number;
  threshold: number;
  isTactileMode: boolean;
  gestureMode: GestureMode;
  lastInputTime?: number;
  orbitAzimuth?: number;
}

const COLOR_BODY_REAL = "#222222"; // Industrial Dark Gray
const COLOR_ACCENT_REAL = "#facc15"; // Safety Yellow (hex bolts / highlights)
const COLOR_METAL = "#444444";
const COLOR_HYDRAULIC = "#888888";

const COLOR_HOLO_CYAN = "#00f0ff";
const COLOR_HOLO_RED = "#ff003c";
const COLOR_HOLO_DIM = "#003344";

const HoloMaterial: React.FC<{ color: string, opacity?: number, blink?: boolean }> = ({ color, opacity = 0.6, blink = false }) => {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (blink && ref.current) {
      ref.current.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 10) * 0.2;
    }
  });
  return (
    <meshBasicMaterial
      ref={ref}
      color={color}
      wireframe
      transparent
      opacity={opacity}
      toneMapped={false}
      blending={THREE.AdditiveBlending}
      side={THREE.DoubleSide}
    />
  );
};

const Robot: React.FC<{
  mode: ViewMode;
  joints: JointState;
  isCritical: boolean;
  hasPower: boolean;
  isTactileMode: boolean;
  opacity?: number;
}> = ({ mode, joints, isCritical, hasPower, isTactileMode, opacity = 1.0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const isWireframe = mode === 'wireframe';

  // Mapping
  // Mapping - Strict Rotational Axes (Degrees to Radians)
  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  
  const j1Rot = degToRad((joints.j1 ?? 90) - 90);
  const j2Rot = degToRad((joints.j2 ?? 90) - 90);
  const j3Rot = degToRad((joints.j3 ?? 90) - 90);
  const j4Pinch = (joints.j4 ?? 0) / 180;

  const holoMain = isCritical ? COLOR_HOLO_RED : (hasPower ? COLOR_HOLO_CYAN : COLOR_HOLO_DIM);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isCritical) {
      groupRef.current.position.x = (Math.random() - 0.5) * 0.05;
      groupRef.current.position.z = (Math.random() - 0.5) * 0.05;
    } else {
        groupRef.current.position.x = 0;
        groupRef.current.position.z = 0;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {/* ELEVATED BASE CHASSIS (Industrial with wheels) */}
      <group position={[0, 0.4, 0]}>
        {isWireframe ? (
          <Box args={[5, 0.8, 5]}>
            <HoloMaterial color={holoMain} opacity={opacity * 0.2} />
          </Box>
        ) : (
          <group>
            {/* Main Plate */}
            <Box args={[4.5, 0.6, 4.5]}>
              <meshStandardMaterial color={COLOR_BODY_REAL} metalness={0.9} roughness={0.1} />
            </Box>
            {/* 4 Wheels/Legs */}
            {[[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]].map((pos, i) => (
              <group key={i} position={[pos[0], -0.2, pos[1]]}>
                <Cylinder args={[0.5, 0.5, 0.4, 16]} rotation={[0, 0, Math.PI / 2]}>
                  <meshStandardMaterial color="#111" metalness={0.5} roughness={0.8} />
                </Cylinder>
              </group>
            ))}
          </group>
        )}
      </group>

      {/* ROTATING BASE PEDESTAL - [STATIC_POS, DYNAMIC_ROT] */}
      <group position={[0, 1.2, 0]} rotation={[0, -j1Rot, 0]}>
        {isWireframe ? (
          <Cylinder args={[1.5, 1.8, 1, 16]}>
            <HoloMaterial color={holoMain} opacity={opacity * 0.3} />
          </Cylinder>
        ) : (
          <Cylinder args={[1.2, 1.4, 1, 32]}>
            <meshStandardMaterial color={COLOR_BODY_REAL} metalness={0.8} roughness={0.2} />
          </Cylinder>
        )}

        {/* SHOULDER ASSEMBLY - [STATIC_POS, DYNAMIC_ROT] */}
        <group position={[0, 1, 0]} rotation={[j2Rot, 0, 0]}>
          {/* Main Joint Hub */}
          <group rotation={[0, 0, Math.PI / 2]}>
             {isWireframe ? (
               <Cylinder args={[0.8, 0.8, 2.2, 8]}>
                 <HoloMaterial color={holoMain} opacity={opacity} />
               </Cylinder>
             ) : (
               <group>
                 <Cylinder args={[0.7, 0.7, 2, 32]}>
                   <meshStandardMaterial color="#333" metalness={1} roughness={0.1} />
                 </Cylinder>
                 {/* Yellow Hex Bolt Details */}
                 <Cylinder args={[0.2, 0.2, 2.2, 6]} position={[0, 0, 0]}>
                   <meshStandardMaterial color={COLOR_ACCENT_REAL} emissive={COLOR_ACCENT_REAL} emissiveIntensity={0.5} />
                 </Cylinder>
               </group>
             )}
          </group>

          {/* LOWER ARM (HYDRAULIC LOOK) */}
          <group position={[0, 1.5, 0]}>
            {isWireframe ? (
              <Box args={[0.8, 3, 0.8]}><HoloMaterial color={holoMain} opacity={opacity * 0.4} /></Box>
            ) : (
              <group>
                <RoundedBox args={[0.7, 3.2, 1.2]} radius={0.05} smoothness={4}>
                  <meshStandardMaterial color={COLOR_BODY_REAL} />
                </RoundedBox>
                {/* Visual Hydraulic Cylinder */}
                <group position={[0, -1, 0.7]} rotation={[-0.2, 0, 0]}>
                   <Cylinder args={[0.15, 0.15, 2, 16]}>
                     <meshStandardMaterial color={COLOR_HYDRAULIC} metalness={1} roughness={0.1} />
                   </Cylinder>
                </group>
              </group>
            )}

            {/* J3: ELBOW - [STATIC_POS, DYNAMIC_ROT] */}
            <group position={[0, 1.6, 0]} rotation={[j3Rot, 0, 0]}>
              <group rotation={[0, 0, Math.PI / 2]}>
                <Cylinder args={[0.5, 0.5, 1.4, 16]}>
                   <meshStandardMaterial color={isWireframe ? holoMain : "#222"} transparent opacity={opacity} />
                </Cylinder>
              </group>
              
              {/* UPPER ARM / FOREARM */}
              <group position={[0, 1.5, 0]}>
                {isWireframe ? (
                  <Cylinder args={[0.4, 0.5, 3, 12]}><HoloMaterial color={holoMain} opacity={opacity * 0.5} /></Cylinder>
                ) : (
                  <group>
                    <Cylinder args={[0.3, 0.4, 3, 24]}>
                      <meshStandardMaterial color={COLOR_BODY_REAL} metalness={0.7} />
                    </Cylinder>
                    {/* Metal Rod Detail */}
                    <Cylinder args={[0.1, 0.1, 3.2, 8]} position={[0, 0, 0.3]}>
                       <meshStandardMaterial color={COLOR_HYDRAULIC} metalness={1} />
                    </Cylinder>
                  </group>
                )}

                {/* WRIST / GRIPPER END EFFECTOR */}
                <group position={[0, 1.5, 0]}>
                  <Sphere args={[0.45, 16, 16]}>
                    <meshStandardMaterial color={isWireframe ? holoMain : "#111"} metalness={1} />
                  </Sphere>

                  {/* INDUSTRIAL GRIPPER */}
                  <group position={[0, 0.6, 0]}>
                    {[1, -1].map((side, i) => (
                      <group key={i} position={[side * 0.3 * (1 - j4Pinch), 0.2, 0]} rotation={[0, 0, side * 0.4 * j4Pinch]}>
                        <group>
                           {/* Finger Clamp */}
                           <Box args={[0.15, 1, 0.4]}>
                             <meshStandardMaterial color={COLOR_METAL} metalness={1} />
                           </Box>
                           {/* Yellow Tip */}
                           <Box args={[0.16, 0.2, 0.41]} position={[0, 0.4, 0]}>
                             <meshStandardMaterial color={COLOR_ACCENT_REAL} />
                           </Box>
                        </group>
                      </group>
                    ))}
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};



const SceneObjects: React.FC<Viewport3DProps> = (props) => {
  const { viewMode, joints, ghostJoints, gestureMode } = props;
  const isWireframe = viewMode === 'wireframe';
  const gridColor = isWireframe ? "#004455" : "#222";
  const orbitRef = useRef<any>(null);

  return (
    <>
      <Grid infiniteGrid fadeDistance={40} sectionColor={gridColor} cellColor={gridColor} sectionThickness={1.5} />
      <Robot mode={viewMode} joints={joints} isCritical={props.status === SystemStatus.CRITICAL} hasPower={props.power} isTactileMode={props.isTactileMode} />
      {gestureMode === 'SHADOW' && ghostJoints && (
        <Robot mode={viewMode} joints={ghostJoints} isCritical={false} hasPower={true} isTactileMode={false} opacity={0.3} />
      )}
      <OrbitControls ref={orbitRef} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2} minDistance={5} maxDistance={60} />
    </>
  );
};

export const Viewport3D: React.FC<Viewport3DProps> = (props) => {
  const isWireframe = props.viewMode === 'wireframe';
  const bgColor = isWireframe ? "#020202" : "#0a0a0a";

  return (
    <div className="w-full h-full bg-black relative overflow-hidden rounded-lg border border-cyan-900/30">
      <Canvas shadows camera={{ position: [12, 8, 12], fov: 35 }}>
        <color attach="background" args={[bgColor]} />
        <ambientLight intensity={isWireframe ? 0.3 : 1.2} />
        <pointLight position={[10, 10, 10]} intensity={2.5} color="#ffffff" />
        <pointLight position={[-15, 5, -10]} intensity={1.5} color="#00f0ff" />
        <spotLight position={[5, 20, 5]} angle={0.4} penumbra={1} intensity={10} castShadow />
        {!isWireframe && <DreiEnvironment preset="studio" />}
        <SceneObjects {...props} />
      </Canvas>

      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="flex flex-col gap-1 border-l-2 border-cyan-500 pl-3">
          <div className="text-[10px] text-cyan-500/70 font-black tracking-[0.4em] uppercase font-mono">Industrial System</div>
          <div className="text-2xl font-black text-white tracking-widest font-mono">
            {isWireframe ? 'CORE_DEBUG' : 'PHYS_LINK_01'}
          </div>
        </div>
      </div>
    </div>
  );
};
