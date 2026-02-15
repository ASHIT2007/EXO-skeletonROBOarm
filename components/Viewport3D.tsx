import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Grid, 
  OrbitControls, 
  RoundedBox, 
  Cylinder,
  Box,
  Sphere,
  Environment,
  Text,
  Plane
} from '@react-three/drei';
import * as THREE from 'three';
import { SystemStatus, ViewMode } from '../types';

interface Viewport3DProps {
  angle: number;
  status: SystemStatus;
  power: boolean;
  viewMode: ViewMode;
  pressure: number;
  isTactileMode: boolean; 
  objectPosition: number; // Received from App
}

// ==========================================
// SHARED CONSTANTS
// ==========================================
const COLOR_BODY_REAL = "#151515";    
const COLOR_ACCENT_REAL = "#f1c40f";  
const COLOR_CHROME_REAL = "#b0b0b0"; 

const COLOR_HOLO_CYAN = "#00f0ff"; 
const COLOR_HOLO_RED = "#ff003c";
const COLOR_HOLO_ORANGE = "#ffaa00";
const COLOR_HOLO_DIM = "#003344";

// ==========================================
// MATERIALS
// ==========================================

const RealisticBodyMaterial = () => <meshStandardMaterial color={COLOR_BODY_REAL} metalness={0.6} roughness={0.4} />;
const RealisticAccentMaterial = () => <meshStandardMaterial color={COLOR_ACCENT_REAL} metalness={0.3} roughness={0.4} />;
const RealisticChromeMaterial = () => <meshStandardMaterial color={COLOR_CHROME_REAL} metalness={0.9} roughness={0.1} />;

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

// ==========================================
// HELPER GEOMETRIES
// ==========================================

const RealisticPiston: React.FC<{ length: number }> = ({ length }) => (
  <group>
    <mesh position={[0, length / 2, 0]}>
       <cylinderGeometry args={[0.15, 0.15, length, 16]} />
       <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, length + 0.5, 0]}>
       <cylinderGeometry args={[0.08, 0.08, length, 16]} />
       <RealisticChromeMaterial />
    </mesh>
  </group>
);

const RealisticJointCap: React.FC<{ position: [number, number, number], rotation?: [number, number, number] }> = ({ position, rotation = [0, 0, Math.PI/2] }) => (
  <mesh position={position} rotation={rotation}>
    <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
    <RealisticAccentMaterial />
  </mesh>
);

const WireframeJointNode: React.FC<{ color: string, scale?: number }> = ({ color, scale = 1 }) => (
  <mesh scale={scale}>
    <sphereGeometry args={[0.2, 16, 16]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
  </mesh>
);

// Hazard Wall - REPLACES HazardObstacle
const HazardWall: React.FC<{ isColliding: boolean, angle: number }> = ({ isColliding, angle }) => {
  // We use the same rotation multiplier as the shoulder (0.9) to sync the coordinate space.
  // Visual Offset: We add 8 degrees to ensure the wall sits physically outside the arm's mesh radius.
  // The arm has thickness, so we need gap + thickness.
  
  const rotationAngle = angle * 0.9; 
  const visualOffset = 8; 
  const rad = THREE.MathUtils.degToRad(rotationAngle + visualOffset); 
  
  // Radius increased to 8.5 to sit near end-effector/gripper path
  const radius = 8.5; 
  
  const y = 1 + radius * Math.cos(rad);
  const z = radius * Math.sin(rad);

  return (
    <group position={[0, y, z]} rotation={[-rad, 0, 0]}>
      {/* Wall Plate */}
      <Box args={[6, 4, 0.2]}> 
         <meshStandardMaterial 
            color={isColliding ? "#ff0000" : "#ff8800"} 
            emissive={isColliding ? "#ff0000" : "#ff4400"}
            emissiveIntensity={isColliding ? 2 : 0.5}
            transparent 
            opacity={0.4}
            metalness={0.8}
            roughness={0.2}
         />
      </Box>
      
      {/* Structural Frame */}
      <Box args={[6.2, 4.2, 0.1]} position={[0,0,-0.1]}>
         <meshStandardMaterial color="#333" />
      </Box>

      {/* Warning Stripes */}
      <Plane args={[6, 4]} position={[0, 0, 0.11]}>
         <meshBasicMaterial 
            color={isColliding ? "#ff0000" : "#ffaa00"} 
            transparent 
            opacity={0.2} 
            wireframe
         />
      </Plane>
      
      {/* Impact Flash Visual */}
      {isColliding && (
          <mesh position={[0, 0, -1]}>
              <sphereGeometry args={[1.5, 16, 16]} />
              <meshBasicMaterial color="white" transparent opacity={0.5} />
          </mesh>
      )}

      <Text 
        position={[0, 2.5, 0]} 
        fontSize={0.4} 
        color={isColliding ? "white" : "orange"}
        anchorX="center" 
        anchorY="middle"
      >
        {!isColliding ? "DANGER ZONE" : "IMPACT DETECTED"}
      </Text>
    </group>
  );
};

// ==========================================
// ROBOT IMPLEMENTATIONS
// ==========================================

const Robot: React.FC<{ 
  mode: ViewMode; 
  angle: number; 
  isCritical: boolean; 
  hasPower: boolean;
  isTactileMode: boolean;
}> = ({ mode, angle, isCritical, hasPower, isTactileMode }) => {
  const groupRef = useRef<THREE.Group>(null);
  const isWireframe = mode === 'wireframe';

  // --- Rotations ---
  const shoulderRotation = THREE.MathUtils.degToRad(angle * 0.9);
  const elbowRotation = THREE.MathUtils.degToRad(angle * 0.7);
  const wristRotation = THREE.MathUtils.degToRad(angle * 0.5);

  // --- Colors Update for Tactile Mode ---
  // If Tactile Mode is ON, use Orange as the main color, otherwise Cyan
  const baseColor = isTactileMode ? COLOR_HOLO_ORANGE : COLOR_HOLO_CYAN;
  
  const holoMain = isCritical ? COLOR_HOLO_RED : (hasPower ? baseColor : COLOR_HOLO_DIM);
  const holoAccent = isCritical ? "#ff5555" : (hasPower ? (isTactileMode ? "#ffcc00" : "#00ffff") : "#002233");

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = -2 + Math.sin(t * 0.5) * 0.05;
    if (isCritical) {
      groupRef.current.position.x = (Math.random() - 0.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {/* BASE */}
      <group>
        {isWireframe ? (
          <>
            <Cylinder args={[2.5, 3, 0.5, 8]} position={[0, 0.25, 0]}>
               <HoloMaterial color={holoMain} opacity={0.2} />
            </Cylinder>
            <Cylinder args={[2.55, 3.05, 0.5, 8]} position={[0, 0.25, 0]}>
               <HoloMaterial color={holoMain} opacity={0.5} />
            </Cylinder>
          </>
        ) : (
          <>
             <Box args={[4, 0.4, 4]} position={[0, 0.2, 0]}>
                <RealisticBodyMaterial />
             </Box>
          </>
        )}
      </group>

      {/* ARM ASSEMBLY */}
      <group position={[0, 1, 0]}>
         {isWireframe ? (
            <Cylinder args={[1, 1.2, 1.5, 16]}><HoloMaterial color={holoMain} /></Cylinder>
         ) : (
            <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.9, 1.0, 1.2, 32]} /><RealisticBodyMaterial /></mesh>
         )}

         {/* SHOULDER */}
         <group position={[0, 1.0, 0]}>
             {isWireframe && <WireframeJointNode color={holoAccent} scale={1.5} />}
             
             <group rotation={[shoulderRotation, 0, 0]}>
                <group rotation={[0, 0, Math.PI/2]}>
                   {isWireframe ? (
                     <Cylinder args={[0.8, 0.8, 2, 16]}><HoloMaterial color={holoMain} /></Cylinder>
                   ) : (
                     <><mesh><cylinderGeometry args={[0.6, 0.6, 1.6, 32]} /><RealisticBodyMaterial /></mesh><RealisticJointCap position={[0, 0.81, 0]} rotation={[0,0,0]}/><RealisticJointCap position={[0, -0.81, 0]} rotation={[0,0,0]}/></>
                   )}
                </group>

                {/* LOWER ARM */}
                <group position={[0, 2, 0]}>
                   {isWireframe ? (
                     <Box args={[1.2, 4, 1.2]}><HoloMaterial color={holoMain} /></Box>
                   ) : (
                     <group position={[0, -0.2, 0.2]}><RoundedBox args={[1.0, 3.8, 1.0]} radius={0.1} smoothness={4}><RealisticBodyMaterial /></RoundedBox><group position={[0.6, -1.0, -0.6]} rotation={[0.2, 0, 0]}><RealisticPiston length={1.5} /></group><group position={[-0.6, -1.0, -0.6]} rotation={[0.2, 0, 0]}><RealisticPiston length={1.5} /></group></group>
                   )}

                   {/* ELBOW */}
                   <group position={[0, 2, 0]}>
                       {isWireframe ? (
                          <WireframeJointNode color={holoAccent} scale={1.2} />
                       ) : (
                          <group position={[0, -0.2, 0.5]}><mesh rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.5, 0.5, 1.4, 32]} /><RealisticBodyMaterial /></mesh><RealisticJointCap position={[0.71, 0, 0]} /><RealisticJointCap position={[-0.71, 0, 0]} /></group>
                       )}

                       {/* UPPER ARM */}
                       <group rotation={[elbowRotation, 0, 0]}>
                           <group position={[0, 1.5, 0]}>
                              {isWireframe ? (
                                <Cylinder args={[0.5, 0.6, 3, 16]}><HoloMaterial color={holoMain} /></Cylinder>
                              ) : (
                                <Cylinder args={[0.3, 0.4, 3, 16]}><RealisticBodyMaterial /></Cylinder>
                              )}

                              {/* GRIPPER */}
                              <group position={[0, 1.5, 0]}>
                                  {isWireframe ? <Sphere args={[0.5, 16, 16]}><HoloMaterial color={holoAccent} /></Sphere> : <mesh><cylinderGeometry args={[0.4, 0.3, 0.6, 16]} /><meshStandardMaterial color="#222" /></mesh>}

                                  <group rotation={[0, wristRotation, 0]} position={[0, isWireframe ? 0 : 0.4, 0]}>
                                      {/* Fingers */}
                                      {[0, 90, 180, 270].map((deg, i) => (
                                          <group key={i} rotation={[0, THREE.MathUtils.degToRad(deg), 0]}>
                                              <group position={[0.4, 0.5, 0]} rotation={[0, 0, -0.3]}>
                                                  {isWireframe ? <Box args={[0.1, 1.0, 0.2]}><HoloMaterial color={holoMain} /></Box> : <Box args={[0.1, 0.6, 0.2]}><meshStandardMaterial color="#333" /></Box>}
                                                  <group position={[0, isWireframe ? 0.5 : 0.3, 0]} rotation={[0, 0, isWireframe ? 0 : -0.4]}>
                                                      <Box args={[0.1, 0.3, 0.2]} position={[0, 0.15, 0]}>
                                                          {isWireframe ? <HoloMaterial color={holoAccent} blink={isCritical || (isTactileMode && angle > 80)} /> : <meshStandardMaterial color="#888" />}
                                                      </Box>
                                                  </group>
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
      </group>
    </group>
  );
};

export const Viewport3D: React.FC<Viewport3DProps> = (props) => {
  const isCritical = props.status === SystemStatus.CRITICAL;
  const isWireframe = props.viewMode === 'wireframe';
  const isColliding = props.pressure > 80;

  return (
    <Canvas dpr={[1, 2]} camera={{ position: [10, 8, 10], fov: 45 }}>
      {isWireframe ? (
        <>
          <fog attach="fog" args={['#000000', 5, 30]} />
          <ambientLight intensity={0.1} />
        </>
      ) : (
        <>
           <color attach="background" args={['#050505']} />
           <ambientLight intensity={0.4} />
           <spotLight position={[6, 12, 6]} angle={0.5} penumbra={0.5} intensity={80} castShadow shadow-bias={-0.0001} color="white" />
           <Environment preset="city" />
        </>
      )}
      
      <OrbitControls 
          enablePan={false} 
          maxPolarAngle={Math.PI / 1.5} 
          minDistance={5} 
          maxDistance={30}
          target={[0, 2, 0]}
      />
      
      <Grid 
        infiniteGrid 
        fadeDistance={25} 
        sectionColor={isCritical ? "#550000" : (props.isTactileMode ? "#442200" : (isWireframe ? "#003344" : "#223344"))} 
        cellColor={isCritical ? "#220000" : (props.isTactileMode ? "#221100" : (isWireframe ? "#001122" : "#111a22"))} 
        sectionSize={2} 
        cellSize={1}
        position={[0, -2.01, 0]}
      />
      
      {/* HAZARD WALL - VISIBLE ONLY IN TACTILE MODE */}
      {props.isTactileMode && <HazardWall isColliding={isColliding} angle={props.objectPosition} />}
      
      <Robot 
        mode={props.viewMode} 
        angle={props.angle} 
        isCritical={isCritical} 
        hasPower={props.power} 
        isTactileMode={props.isTactileMode}
      />
    </Canvas>
  );
};
