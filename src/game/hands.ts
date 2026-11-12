import * as THREE from 'three';
import { WeaponProceduralState } from './types';
import { clamp, damp } from './rules';

export interface FingerJointRig {
  base: THREE.Group;
  proximal: THREE.Group;
  middle: THREE.Group;
  distal: THREE.Group;
}

export interface ThumbJointRig {
  base: THREE.Group;
  proximal: THREE.Group;
  distal: THREE.Group;
}

export interface SingleHandRig {
  side: 'left' | 'right';
  armRoot: THREE.Group;
  wrist: THREE.Group;
  palm: THREE.Group;
  thumb: ThumbJointRig;
  index: FingerJointRig;
  middle: FingerJointRig;
  ring: FingerJointRig;
  little: FingerJointRig;
  triangleCount: number;
  currentPose: HandPoseState;
}

export interface FirstPersonHandsRig {
  root: THREE.Group;
  leftHand: SingleHandRig;
  rightHand: SingleHandRig;
  totalTriangles: number;
}

export interface FingerCurlPose {
  splayZ: number; // Abduction/adduction at base
  baseYawY: number;
  mcpX: number; // Proximal flexion
  pipX: number; // Middle flexion
  dipX: number; // Distal flexion
}

export interface ThumbCurlPose {
  baseX: number;
  baseY: number;
  baseZ: number;
  mcpX: number;
  ipX: number;
}

export interface HandPoseState {
  wristPos: [number, number, number];
  wristRot: [number, number, number];
  palmRot: [number, number, number];
  thumb: ThumbCurlPose;
  index: FingerCurlPose;
  middle: FingerCurlPose;
  ring: FingerCurlPose;
  little: FingerCurlPose;
}

/**
 * Counts the exact number of rendered triangles in a hand hierarchy.
 */
export function countHandTriangles(root: THREE.Object3D): number {
  let tris = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj.userData.isHandMesh) {
      const geom = (obj as THREE.Mesh).geometry as THREE.BufferGeometry;
      if (geom.index) {
        tris += geom.index.count / 3;
      } else if (geom.attributes.position) {
        tris += geom.attributes.position.count / 3;
      }
    }
  });
  return Math.round(tris);
}

export const HAND_TEXTURE_SIZE = 16; // 16x16 low-poly pixel art texture for first-person hands

/**
 * Generates a deterministic 16x16 RGBA procedural skin texture with subtle warm epidermal
 * pore, knuckle, and crease micro-variation. Completely opaque (alpha = 255).
 */
let cachedSkinTex64: THREE.DataTexture | null = null;
export function getHandSkinTexture64(): THREE.DataTexture {
  if (cachedSkinTex64) return cachedSkinTex64;
  const size = HAND_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Deterministic tactile micro-grain + subtle transverse skin crease lines
      const hash = ((x * 73856093) ^ (y * 19349663)) & 0xff;
      const crease = Math.sin((y / size) * Math.PI * 6 + Math.sin((x / size) * Math.PI * 2) * 0.5);
      const grain = (hash / 255 - 0.5) * 10 + crease * 4;
      const r = Math.min(255, Math.max(225, Math.round(248 + grain)));
      const g = Math.min(255, Math.max(218, Math.round(243 + grain * 0.9)));
      const b = Math.min(255, Math.max(212, Math.round(239 + grain * 0.85)));
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255; // Strictly 100% opaque
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedSkinTex64 = tex;
  return tex;
}

/**
 * Generates a deterministic 16x16 RGBA procedural tactical ripstop fabric weave texture for the sleeve & cuff.
 */
let cachedSleeveTex64: THREE.DataTexture | null = null;
export function getSleeveFabricTexture64(): THREE.DataTexture {
  if (cachedSleeveTex64) return cachedSleeveTex64;
  const size = HAND_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const grid = x % 3 === 0 || y % 3 === 0 ? -12 : ((x + y) % 2 === 0 ? 5 : -3);
      const v = Math.min(255, Math.max(200, 242 + grid));
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = Math.min(255, v + 4);
      data[idx + 3] = 255; // Strictly 100% opaque
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedSleeveTex64 = tex;
  return tex;
}

/**
 * Builds an indexed BufferGeometry from vertices and triangle indices, automatically orienting
 * every triangle outward from the mesh centroid so outward normals are always FrontSide-correct
 * on both Left and Right hands, and generating UV coordinates for the 64x64 texture.
 */
function buildHandGeometry(
  vertices: number[][],
  indices: number[],
  mirrorX = 1
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const nVerts = vertices.length;
  const pos = new Float32Array(nVerts * 3);
  const uvs = new Float32Array(nVerts * 2);

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < nVerts; i++) {
    const vx = vertices[i][0] * mirrorX;
    const vy = vertices[i][1];
    const vz = vertices[i][2];
    pos[i * 3] = vx;
    pos[i * 3 + 1] = vy;
    pos[i * 3 + 2] = vz;
    cx += vx;
    cy += vy;
    cz += vz;
    // Cylindrical/planar UV mapping scaled for 64x64 tactile detail
    uvs[i * 2] = (vx * 8.0 + vy * 4.0) + 0.5;
    uvs[i * 2 + 1] = vz * 6.0 + 0.5;
  }
  if (nVerts > 0) {
    cx /= nVerts;
    cy /= nVerts;
    cz /= nVerts;
  }

  const fixedIndices = new Array(indices.length);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    let i1 = indices[i + 1];
    let i2 = indices[i + 2];

    const ax = pos[i0 * 3];
    const ay = pos[i0 * 3 + 1];
    const az = pos[i0 * 3 + 2];
    const bx = pos[i1 * 3];
    const by = pos[i1 * 3 + 1];
    const bz = pos[i1 * 3 + 2];
    const dx = pos[i2 * 3];
    const dy = pos[i2 * 3 + 1];
    const dz = pos[i2 * 3 + 2];

    // Edge vectors AB and AC
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = dx - ax;
    const acy = dy - ay;
    const acz = dz - az;

    // Cross product N = AB x AC
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    // Vector from mesh centroid to triangle center
    const tx = (ax + bx + dx) / 3 - cx;
    const ty = (ay + by + dy) / 3 - cy;
    const tz = (az + bz + dz) / 3 - cz;

    const dot = nx * tx + ny * ty + nz * tz;
    if (dot < -1e-7) {
      const tmp = i1;
      i1 = i2;
      i2 = tmp;
    }

    fixedIndices[i] = i0;
    fixedIndices[i + 1] = i1;
    fixedIndices[i + 2] = i2;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(fixedIndices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a 5-vertex cross-section open phalanx sleeve (10 triangles: 5 sides * 2 tris).
 * Oriented along -Z from 0 (joint pivot) to -length (distal joint).
 */
function createPhalanx5Sleeve(
  wBase: number,
  hBase: number,
  wTip: number,
  hTip: number,
  length: number,
  mirrorX: number
): THREE.BufferGeometry {
  const bW = wBase * 0.5;
  const bH = hBase * 0.5;
  const tW = wTip * 0.5;
  const tH = hTip * 0.5;
  const z0 = 0;
  const z1 = -length;

  // 5-point anatomical finger cross-section:
  // 0: dorsal peak, 1: dorsal-right, 2: palmar-right, 3: palmar-left, 4: dorsal-left
  const verts = [
    [0, bH * 1.05, z0],
    [bW, bH * 0.35, z0],
    [bW * 0.82, -bH * 0.95, z0],
    [-bW * 0.82, -bH * 0.95, z0],
    [-bW, bH * 0.35, z0],

    [0, tH * 1.02, z1],
    [tW, tH * 0.35, z1],
    [tW * 0.82, -tH * 0.95, z1],
    [-tW * 0.82, -tH * 0.95, z1],
    [-tW, tH * 0.35, z1],
  ];

  // 5 quads = 10 triangles
  const indices: number[] = [];
  for (let s = 0; s < 5; s++) {
    const n = (s + 1) % 5;
    const b0 = s;
    const b1 = n;
    const t0 = s + 5;
    const t1 = n + 5;
    indices.push(b0, t0, b1, b1, t0, t1);
  }

  return buildHandGeometry(verts, indices, mirrorX);
}

/**
 * Creates a 4-vertex cross-section open phalanx sleeve (8 triangles: 4 sides * 2 tris).
 * Oriented along -Z from 0 to -length.
 */
function createPhalanx4Sleeve(
  wBase: number,
  hBase: number,
  wTip: number,
  hTip: number,
  length: number,
  mirrorX: number
): THREE.BufferGeometry {
  const bW = wBase * 0.5;
  const bH = hBase * 0.5;
  const tW = wTip * 0.5;
  const tH = hTip * 0.5;
  const z0 = 0;
  const z1 = -length;

  const verts = [
    [-bW, bH, z0],
    [bW, bH, z0],
    [bW * 0.86, -bH, z0],
    [-bW * 0.86, -bH, z0],

    [-tW, tH, z1],
    [tW, tH, z1],
    [tW * 0.86, -tH, z1],
    [-tW * 0.86, -tH, z1],
  ];

  const indices = [
    0, 4, 1, 1, 4, 5, // Dorsal top
    1, 5, 2, 2, 5, 6, // Right side
    2, 6, 3, 3, 6, 7, // Palmar bottom
    3, 7, 0, 0, 7, 4, // Left side
  ];

  return buildHandGeometry(verts, indices, mirrorX);
}

/**
 * Creates a rounded distal fingertip with N triangles (8 tris or 6 tris).
 */
function createDistalFingertip(
  wBase: number,
  hBase: number,
  length: number,
  trisMode: 8 | 6 | 14,
  mirrorX: number
): THREE.BufferGeometry {
  const bW = wBase * 0.5;
  const bH = hBase * 0.5;
  const zMid = -length * 0.68;
  const zTip = -length;

  if (trisMode === 6) {
    // 6-triangle tapered rounded fingertip (4 base verts + 1 rounded apex)
    const verts = [
      [-bW, bH, 0],
      [bW, bH, 0],
      [bW * 0.84, -bH, 0],
      [-bW * 0.84, -bH, 0],
      [0, bH * 0.15, zTip],
    ];
    // 4 sides to apex (4 tris) + base bridge (2 tris) = 6 tris
    const indices = [
      0, 4, 1,
      1, 4, 2,
      2, 4, 3,
      3, 4, 0,
      0, 1, 2,
      0, 2, 3,
    ];
    return buildHandGeometry(verts, indices, mirrorX);
  }

  if (trisMode === 8) {
    // 8-triangle tapered fingertip (4 base verts + 2 distal bevel ridge verts)
    const verts = [
      [-bW, bH, 0], // 0
      [bW, bH, 0], // 1
      [bW * 0.84, -bH, 0], // 2
      [-bW * 0.84, -bH, 0], // 3
      [-bW * 0.52, bH * 0.25, zTip], // 4: tip left
      [bW * 0.52, bH * 0.25, zTip], // 5: tip right
    ];
    // Top (2), Bottom (2), Left (1), Right (1), Base cap (2) = 8 triangles
    const indices = [
      0, 4, 1, 1, 4, 5, // Top slope (2)
      3, 2, 5, 3, 5, 4, // Bottom pad slope (2)
      0, 3, 4, // Left (1)
      1, 5, 2, // Right (1)
      0, 1, 2, 0, 2, 3, // Base joint cap (2)
    ];
    return buildHandGeometry(verts, indices, mirrorX);
  }

  // 14-triangle anatomical thumb phalanx (2-ring 4-sided tapered prism + rounded tip = 14 tris)
  const mW = bW * 0.82;
  const mH = bH * 0.85;
  const verts = [
    [-bW, bH, 0], // 0
    [bW, bH, 0], // 1
    [bW * 0.88, -bH, 0], // 2
    [-bW * 0.88, -bH, 0], // 3
    [-mW, mH, zMid], // 4
    [mW, mH, zMid], // 5
    [mW * 0.85, -mH, zMid], // 6
    [-mW * 0.85, -mH, zMid], // 7
    [-mW * 0.45, mH * 0.2, zTip], // 8
    [mW * 0.45, mH * 0.2, zTip], // 9
  ];
  // First segment: 8 tris + Tip segment: 6 tris = 14 triangles
  const indices = [
    0, 4, 1, 1, 4, 5,
    1, 5, 2, 2, 5, 6,
    2, 6, 3, 3, 6, 7,
    3, 7, 0, 0, 7, 4,
    // Tip (6 tris)
    4, 8, 5, 5, 8, 9,
    7, 6, 9, 7, 9, 8,
    4, 7, 8,
    5, 9, 6,
  ];
  return buildHandGeometry(verts, indices, mirrorX);
}

/**
 * Creates a subtle low-poly fingernail surface (4 tris or 2 tris) that sits flush on the dorsal fingertip.
 */
function createFingernailMesh(
  width: number,
  length: number,
  yOffset: number,
  zStart: number,
  trisCount: 2 | 4,
  mirrorX: number
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const zMid = zStart - length * 0.55;
  const zEnd = zStart - length;

  if (trisCount === 2) {
    const verts = [
      [-hw * 0.88, yOffset, zStart],
      [hw * 0.88, yOffset, zStart],
      [hw * 0.76, yOffset * 0.65, zEnd],
      [-hw * 0.76, yOffset * 0.65, zEnd],
    ];
    return buildHandGeometry(verts, [0, 3, 1, 1, 3, 2], mirrorX);
  }

  // 4-triangle arched fingernail plate
  const verts = [
    [-hw * 0.88, yOffset, zStart],
    [hw * 0.88, yOffset, zStart],
    [0, yOffset * 1.06, zMid],
    [-hw * 0.76, yOffset * 0.62, zEnd],
    [hw * 0.76, yOffset * 0.62, zEnd],
  ];
  const indices = [
    0, 2, 1,
    0, 3, 2,
    1, 2, 4,
    2, 3, 4,
  ];
  return buildHandGeometry(verts, indices, mirrorX);
}

/**
 * Builds one complete, anatomically detailed low-poly human hand (Left or Right)
 * with exact target triangle budget:
 * - Palm: 70 tris (Metacarpal body 24 + Thenar eminence 14 + Hypothenar pad 12 + 4 Knuckle crests 20)
 * - Thumb: 32 tris (Proximal 14 + Distal 14 + Nail 4)
 * - Index finger: 30 tris (Proximal 10 + Middle 8 + Distal 8 + Nail 4)
 * - Middle finger: 30 tris (Proximal 10 + Middle 8 + Distal 8 + Nail 4)
 * - Ring finger: 28 tris (Proximal 10 + Middle 8 + Distal 8 + Nail 2)
 * - Little finger: 24 tris (Proximal 8 + Middle 8 + Distal 6 + Nail 2)
 * - Wrist: 24 tris (Wrist anatomical transition 16 + Forearm cuff fold 8)
 * - Additional anatomical details: 12 tris (3 Dorsal extensor tendon ridges * 4 tris)
 * TOTAL = 250 triangles per hand!
 */
export function buildSingleHandRig(side: 'left' | 'right'): SingleHandRig {
  const mirrorX = side === 'left' ? -1 : 1;

  const skinTex64 = getHandSkinTexture64();
  const sleeveTex64 = getSleeveFabricTexture64();

  // Cohesive, realistic low-poly human skin materials (flat-shaded, 64x64 tactile texture, strictly opaque DoubleSide)
  const matDorsalSkin = new THREE.MeshStandardMaterial({
    color: 0xd59b78,
    map: skinTex64,
    roughness: 0.66,
    metalness: 0.04,
    flatShading: true,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const matPalmarSkin = new THREE.MeshStandardMaterial({
    color: 0xc28664,
    map: skinTex64,
    roughness: 0.72,
    metalness: 0.03,
    flatShading: true,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const matJointCrease = new THREE.MeshStandardMaterial({
    color: 0xb57958,
    map: skinTex64,
    roughness: 0.74,
    metalness: 0.03,
    flatShading: true,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const matKnuckleHighlight = new THREE.MeshStandardMaterial({
    color: 0xdfb699,
    map: skinTex64,
    roughness: 0.58,
    metalness: 0.05,
    flatShading: true,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const matFingernail = new THREE.MeshStandardMaterial({
    color: 0xeacbb5,
    map: skinTex64,
    roughness: 0.36,
    metalness: 0.08,
    flatShading: true,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const tagMesh = (mesh: THREE.Mesh) => {
    mesh.userData.ignoreBudget = true; // Separate from strict weapon budgets
    mesh.userData.isHandMesh = true;
    return mesh;
  };

  const armRoot = new THREE.Group();
  armRoot.name = `${side}_arm_root`;

  const wrist = new THREE.Group();
  wrist.name = `${side}_wrist`;
  armRoot.add(wrist);

  // =========================================================================
  // 1. WRIST & FULL ARM (70 triangles total:
  //    - Contoured wrist: 16 tris
  //    - Wrist crease fold: 8 tris
  //    - Muscular tapered forearm: 22 tris
  //    - Rolled tactical sleeve cuff: 12 tris
  //    - Upper arm / bicep-tricep extension: 12 tris
  //    Total Hand + Full Arm = 296 triangles <= 300 polygon budget)
  // =========================================================================
  const matTacticalSleeve = new THREE.MeshStandardMaterial({
    color: 0x232832,
    map: sleeveTex64,
    roughness: 0.78,
    metalness: 0.15,
    flatShading: true,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const matSleeveCuff = new THREE.MeshStandardMaterial({
    color: 0x323946,
    map: sleeveTex64,
    roughness: 0.68,
    metalness: 0.22,
    flatShading: true,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const wristVerts = [
    // Forearm cuff end (z = +0.068)
    [-0.032, 0.017, 0.068], // 0
    [0.032, 0.017, 0.068], // 1
    [0.034, -0.016, 0.068], // 2
    [-0.034, -0.016, 0.068], // 3
    // Mid wrist styloid contour (z = +0.032)
    [-0.031, 0.016, 0.032], // 4
    [0.032, 0.016, 0.032], // 5
    [0.03, -0.015, 0.032], // 6
    [-0.03, -0.015, 0.032], // 7
    // Carpal junction (z = 0)
    [-0.033, 0.015, 0], // 8
    [0.033, 0.015, 0], // 9
    [0.031, -0.016, 0], // 10
    [-0.031, -0.016, 0], // 11
  ];
  const wristIndices = [
    // Ring 1 (8 tris)
    0, 4, 1, 1, 4, 5,
    1, 5, 2, 2, 5, 6,
    2, 6, 3, 3, 6, 7,
    3, 7, 0, 0, 7, 4,
    // Ring 2 (8 tris)
    4, 8, 5, 5, 8, 9,
    5, 9, 6, 6, 9, 10,
    6, 10, 7, 7, 10, 11,
    7, 11, 4, 4, 11, 8,
  ];
  const wristMesh = tagMesh(
    new THREE.Mesh(
      buildHandGeometry(wristVerts, wristIndices, mirrorX),
      matDorsalSkin
    )
  );
  wrist.add(wristMesh);

  // Subtle wrist fold & ulnar prominence (8 tris)
  const wristFoldMesh = tagMesh(
    new THREE.Mesh(
      createPhalanx4Sleeve(0.066, 0.033, 0.068, 0.034, 0.018, mirrorX),
      matJointCrease
    )
  );
  wristFoldMesh.position.set(0, 0, 0.018);
  wrist.add(wristFoldMesh);

  // Muscular Tapered Forearm (22 tris: 6-sided brachioradialis/ulnar muscular contour from z = +0.068 to z = +0.235)
  const forearmVerts = [
    // Distal wrist connection (z = +0.066)
    [-0.032, 0.017, 0.066], // 0: radial dorsal
    [0.0, 0.02, 0.066], // 1: central dorsal ridge
    [0.032, 0.017, 0.066], // 2: ulnar dorsal
    [0.034, -0.016, 0.066], // 3: ulnar volar
    [0.0, -0.019, 0.066], // 4: central volar tendon
    [-0.034, -0.016, 0.066], // 5: radial volar
    // Mid-forearm muscular swell (z = +0.155)
    [-0.041, 0.023, 0.155], // 6
    [0.0, 0.027, 0.155], // 7
    [0.039, 0.022, 0.155], // 8
    [0.04, -0.022, 0.155], // 9
    [0.0, -0.026, 0.155], // 10
    [-0.041, -0.022, 0.155], // 11
    // Proximal forearm before rolled cuff (z = +0.235)
    [-0.043, 0.024, 0.235], // 12
    [0.041, 0.023, 0.235], // 13
    [0.042, -0.024, 0.235], // 14
    [-0.043, -0.024, 0.235], // 15
  ];
  const forearmIndices = [
    // Distal to mid-forearm 6-sided muscular ring (12 tris)
    0, 1, 6, 1, 7, 6,
    1, 2, 7, 2, 8, 7,
    2, 3, 8, 3, 9, 8,
    3, 4, 9, 4, 10, 9,
    4, 5, 10, 5, 11, 10,
    5, 0, 11, 0, 6, 11,
    // Mid-forearm to proximal cuff transition (10 tris)
    6, 7, 12, 7, 13, 12,
    7, 8, 13,
    8, 9, 13, 9, 14, 13,
    9, 10, 14, 10, 15, 14,
    10, 11, 15,
    11, 6, 15, 6, 12, 15,
  ];
  const forearmMesh = tagMesh(
    new THREE.Mesh(
      buildHandGeometry(forearmVerts, forearmIndices, mirrorX),
      matDorsalSkin
    )
  );
  wrist.add(forearmMesh);

  // Rolled Tactical Sleeve Cuff at mid-to-upper forearm (12 tris)
  const cuffVerts = [
    [-0.047, 0.028, 0.228], // 0
    [0.046, 0.027, 0.228], // 1
    [0.046, -0.028, 0.228], // 2
    [-0.047, -0.028, 0.228], // 3
    [-0.049, 0.03, 0.278], // 4
    [0.048, 0.029, 0.278], // 5
    [0.048, -0.03, 0.278], // 6
    [-0.049, -0.03, 0.278], // 7
  ];
  const cuffIndices = [
    0, 1, 4, 1, 5, 4,
    1, 2, 5, 2, 6, 5,
    2, 3, 6, 3, 7, 6,
    3, 0, 7, 0, 4, 7,
    0, 3, 1, 1, 3, 2,
    4, 5, 7, 5, 6, 7,
  ];
  const cuffMesh = tagMesh(
    new THREE.Mesh(
      buildHandGeometry(cuffVerts, cuffIndices, mirrorX),
      matSleeveCuff
    )
  );
  wrist.add(cuffMesh);

  // Articulated Elbow & Upper Arm Sleeve extending toward shoulder (12 tris)
  const upperArmVerts = [
    // Elbow end (z = +0.274)
    [-0.046, 0.027, 0.274], // 0
    [0.045, 0.026, 0.274], // 1
    [0.045, -0.027, 0.274], // 2
    [-0.046, -0.027, 0.274], // 3
    // Upper arm / deltoid-bicep end toward shoulder (z = +0.46)
    [-0.018, -0.032, 0.46], // 4
    [0.078, -0.035, 0.46], // 5
    [0.076, -0.095, 0.46], // 6
    [-0.02, -0.092, 0.46], // 7
  ];
  const upperArmIndices = [
    0, 1, 4, 1, 5, 4,
    1, 2, 5, 2, 6, 5,
    2, 3, 6, 3, 7, 6,
    3, 0, 7, 0, 4, 7,
    4, 5, 7, 5, 6, 7,
    0, 2, 1, 0, 3, 2,
  ];
  const upperArmMesh = tagMesh(
    new THREE.Mesh(
      buildHandGeometry(upperArmVerts, upperArmIndices, mirrorX),
      matTacticalSleeve
    )
  );
  wrist.add(upperArmMesh);

  // =========================================================================
  // 2. PALM & BACK OF HAND (70 triangles total)
  //    - Metacarpal dorsal & palmar body: 24 tris
  //    - Thenar eminence (thumb muscle pad): 14 tris
  //    - Hypothenar eminence (outer edge pad): 12 tris
  //    - 4 Dorsal MCP knuckle structures: 20 tris (4 * 5 tris)
  // =========================================================================
  const palm = new THREE.Group();
  palm.name = `${side}_palm`;
  wrist.add(palm);

  // Metacarpal body (24 tris: 3 connected 4-sided cross-sections + wrist/knuckle caps)
  // In local Right-Hand coords (+X = ulnar/little finger side, -X = radial/thumb side, +Y = dorsal back of hand, -Y = palmar, -Z = toward fingers)
  const palmBodyVerts = [
    // Carpal heel (z = 0)
    [-0.033, 0.015, 0], // 0
    [0.033, 0.015, 0], // 1
    [0.031, -0.016, 0], // 2
    [-0.031, -0.016, 0], // 3
    // Mid-metacarpal flare (z = -0.044)
    [-0.041, 0.016, -0.044], // 4
    [0.039, 0.015, -0.044], // 5
    [0.037, -0.018, -0.044], // 6
    [-0.039, -0.019, -0.044], // 7
    // Distal knuckle bridge (z = -0.084)
    [-0.043, 0.014, -0.084], // 8
    [0.041, 0.012, -0.084], // 9
    [0.039, -0.015, -0.084], // 10
    [-0.041, -0.016, -0.084], // 11
  ];
  const palmBodyIndices = [
    // Segment 1 (8 tris)
    0, 4, 1, 1, 4, 5,
    1, 5, 2, 2, 5, 6,
    2, 6, 3, 3, 6, 7,
    3, 7, 0, 0, 7, 4,
    // Segment 2 (8 tris)
    4, 8, 5, 5, 8, 9,
    5, 9, 6, 6, 9, 10,
    6, 10, 7, 7, 10, 11,
    7, 11, 4, 4, 11, 8,
    // Distal knuckle web face (4 tris) + Proximal heel cap (4 tris) = 8 tris
    8, 11, 9, 9, 11, 10,
    8, 10, 9, 8, 11, 10,
    0, 1, 2, 0, 2, 3,
    0, 2, 1, 0, 3, 2,
  ];
  const palmBodyMesh = tagMesh(
    new THREE.Mesh(
      buildHandGeometry(palmBodyVerts, palmBodyIndices, mirrorX),
      matDorsalSkin
    )
  );
  palm.add(palmBodyMesh);

  // Thenar Eminence (14 tris sculpted muscular pad at thumb base on radial-palmar side)
  const thenarMesh = tagMesh(
    new THREE.Mesh(
      createDistalFingertip(0.032, 0.024, 0.048, 14, mirrorX),
      matPalmarSkin
    )
  );
  thenarMesh.position.set(-0.026 * mirrorX, -0.012, -0.014);
  thenarMesh.rotation.set(0.15, 0.35 * mirrorX, 0);
  palm.add(thenarMesh);

  // Hypothenar Pad (12 tris muscular pad along outer ulnar edge of palm)
  const hypothenarVerts = [
    [0.018, 0.004, -0.008],
    [0.04, 0.006, -0.008],
    [0.039, -0.02, -0.008],
    [0.016, -0.019, -0.008],
    [0.02, 0.004, -0.076],
    [0.042, 0.005, -0.076],
    [0.04, -0.017, -0.076],
    [0.018, -0.017, -0.076],
  ];
  const hypothenarIndices = [
    0, 4, 1, 1, 4, 5,
    1, 5, 2, 2, 5, 6,
    2, 6, 3, 3, 6, 7,
    3, 7, 0, 0, 7, 4,
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
  ];
  const hypothenarMesh = tagMesh(
    new THREE.Mesh(
      buildHandGeometry(hypothenarVerts, hypothenarIndices, mirrorX),
      matPalmarSkin
    )
  );
  palm.add(hypothenarMesh);

  // 4 Dorsal Knuckle Structures (4 * 5 = 20 tris)
  const knuckleXOffsets = [-0.03, -0.01, 0.011, 0.031];
  const knuckleZOffsets = [-0.081, -0.085, -0.082, -0.077];
  for (let k = 0; k < 4; k++) {
    const kx = knuckleXOffsets[k];
    const kz = knuckleZOffsets[k];
    // 5-triangle angular knuckle pyramid/ridge
    const kv = [
      [kx - 0.008, 0.012, kz + 0.009], // 0
      [kx + 0.008, 0.012, kz + 0.009], // 1
      [kx + 0.008, 0.011, kz - 0.008], // 2
      [kx - 0.008, 0.011, kz - 0.008], // 3
      [kx, 0.019, kz], // 4: knuckle peak
    ];
    // 4 sides (4 tris) + dorsal facet (1 tri) = 5 tris
    const ki = [
      0, 4, 1,
      1, 4, 2,
      2, 4, 3,
      3, 4, 0,
      0, 2, 1,
    ];
    const kMesh = tagMesh(
      new THREE.Mesh(
        buildHandGeometry(kv, ki, mirrorX),
        matKnuckleHighlight
      )
    );
    palm.add(kMesh);
  }

  // =========================================================================
  // 3. ADDITIONAL ANATOMICAL DETAILS (12 triangles: 3 Dorsal Tendon Ridges * 4 tris)
  // =========================================================================
  const tendonX = [-0.022, -0.004, 0.014];
  for (let t = 0; t < 3; t++) {
    const tx = tendonX[t];
    const tv = [
      [tx - 0.003, 0.014, -0.015],
      [tx + 0.003, 0.014, -0.015],
      [tx, 0.0175, -0.048],
      [tx - 0.003, 0.013, -0.078],
      [tx + 0.003, 0.013, -0.078],
    ];
    const ti = [
      0, 2, 1,
      0, 3, 2,
      1, 2, 4,
      2, 3, 4,
    ];
    const tendonMesh = tagMesh(
      new THREE.Mesh(
        buildHandGeometry(tv, ti, mirrorX),
        matKnuckleHighlight
      )
    );
    palm.add(tendonMesh);
  }

  // =========================================================================
  // 4. THUMB HIERARCHY (32 triangles: Proximal 14 + Distal 14 + Nail 4)
  // =========================================================================
  const thumbBase = new THREE.Group();
  thumbBase.name = `${side}_thumb_base`;
  thumbBase.position.set(-0.036 * mirrorX, -0.006, -0.032);
  palm.add(thumbBase);

  const thumbProximal = new THREE.Group();
  thumbProximal.name = `${side}_thumb_proximal`;
  thumbBase.add(thumbProximal);

  const thumbProxLen = 0.034;
  const thumbProxMesh = tagMesh(
    new THREE.Mesh(
      createDistalFingertip(0.021, 0.019, thumbProxLen, 14, mirrorX),
      matDorsalSkin
    )
  );
  thumbProximal.add(thumbProxMesh);

  const thumbDistal = new THREE.Group();
  thumbDistal.name = `${side}_thumb_distal`;
  thumbDistal.position.set(0, 0, -thumbProxLen + 0.002);
  thumbProximal.add(thumbDistal);

  const thumbDistLen = 0.028;
  const thumbDistMesh = tagMesh(
    new THREE.Mesh(
      createDistalFingertip(0.018, 0.016, thumbDistLen, 14, mirrorX),
      matKnuckleHighlight
    )
  );
  thumbDistal.add(thumbDistMesh);

  const thumbNailMesh = tagMesh(
    new THREE.Mesh(
      createFingernailMesh(0.013, 0.014, 0.0082, -0.012, 4, mirrorX),
      matFingernail
    )
  );
  thumbDistal.add(thumbNailMesh);

  // =========================================================================
  // 5. FOUR ARTICULATED FINGERS (Index 30, Middle 30, Ring 28, Little 24 tris)
  // =========================================================================
  const buildArticulatedFinger = (
    fingerName: string,
    attachX: number,
    attachY: number,
    attachZ: number,
    proxLen: number,
    midLen: number,
    distLen: number,
    widthBase: number,
    proxTris: 10 | 8,
    distTris: 8 | 6,
    nailTris: 4 | 2
  ): FingerJointRig => {
    const base = new THREE.Group();
    base.name = `${side}_${fingerName}_base`;
    base.position.set(attachX * mirrorX, attachY, attachZ);
    palm.add(base);

    const proximal = new THREE.Group();
    proximal.name = `${side}_${fingerName}_proximal`;
    base.add(proximal);

    const wMid = widthBase * 0.88;
    const wDist = widthBase * 0.76;

    const proxGeom =
      proxTris === 10
        ? createPhalanx5Sleeve(
            widthBase,
            widthBase * 0.92,
            wMid,
            wMid * 0.9,
            proxLen,
            mirrorX
          )
        : createPhalanx4Sleeve(
            widthBase,
            widthBase * 0.92,
            wMid,
            wMid * 0.9,
            proxLen,
            mirrorX
          );
    const proxMesh = tagMesh(new THREE.Mesh(proxGeom, matDorsalSkin));
    proximal.add(proxMesh);

    const middle = new THREE.Group();
    middle.name = `${side}_${fingerName}_middle`;
    middle.position.set(0, 0, -proxLen + 0.0015);
    proximal.add(middle);

    const midGeom = createPhalanx4Sleeve(
      wMid * 1.03,
      wMid * 0.92,
      wDist,
      wDist * 0.88,
      midLen,
      mirrorX
    );
    const midMesh = tagMesh(new THREE.Mesh(midGeom, matJointCrease));
    middle.add(midMesh);

    const distal = new THREE.Group();
    distal.name = `${side}_${fingerName}_distal`;
    distal.position.set(0, 0, -midLen + 0.0015);
    middle.add(distal);

    const distGeom = createDistalFingertip(
      wDist * 1.02,
      wDist * 0.88,
      distLen,
      distTris,
      mirrorX
    );
    const distMesh = tagMesh(new THREE.Mesh(distGeom, matKnuckleHighlight));
    distal.add(distMesh);

    const nailGeom = createFingernailMesh(
      wDist * 0.76,
      distLen * 0.52,
      wDist * 0.46,
      -distLen * 0.42,
      nailTris,
      mirrorX
    );
    const nailMesh = tagMesh(new THREE.Mesh(nailGeom, matFingernail));
    distal.add(nailMesh);

    return { base, proximal, middle, distal };
  };

  // Relative human finger proportions:
  // Middle finger: longest
  // Ring finger: slightly shorter
  // Index finger: slightly shorter than ring / comparable
  // Little finger: distinctly shorter & slightly angled inward
  const index = buildArticulatedFinger(
    'index',
    -0.03,
    0.002,
    -0.084,
    0.036,
    0.024,
    0.019,
    0.0175,
    10,
    8,
    4
  );

  const middle = buildArticulatedFinger(
    'middle',
    -0.01,
    0.003,
    -0.087,
    0.04,
    0.027,
    0.02,
    0.0182,
    10,
    8,
    4
  );

  const ring = buildArticulatedFinger(
    'ring',
    0.011,
    0.002,
    -0.084,
    0.037,
    0.025,
    0.019,
    0.0172,
    10,
    8,
    2
  );

  const little = buildArticulatedFinger(
    'little',
    0.031,
    0.0,
    -0.079,
    0.03,
    0.019,
    0.016,
    0.0152,
    8,
    6,
    2
  );

  const initialPose = cloneHandPose(
    side === 'right' ? POSE_AR_RIGHT_GRIP : POSE_AR_LEFT_SUPPORT
  );

  const rig: SingleHandRig = {
    side,
    armRoot,
    wrist,
    palm,
    thumb: {
      base: thumbBase,
      proximal: thumbProximal,
      distal: thumbDistal,
    },
    index,
    middle,
    ring,
    little,
    triangleCount: countHandTriangles(armRoot),
    currentPose: initialPose,
  };

  applyPoseToRigImmediate(rig, initialPose);
  return rig;
}

// ===========================================================================
// AUTHORED ANATOMICAL WEAPON GRIP & RELOAD POSES
// Note: Positive mcpX / pipX / dipX = flexion (curling fingers downward toward palm -Y)
// In Three.js right-handed coordinates where fingers point along -Z and palmar is -Y,
// rotating around +X by a negative angle (-theta) moves -Z toward -Y (downward curl)!
// Let's use `curlSign = -1` inside applyPoseToRigImmediate so positive `mcpX` values
// always mean natural downward finger flexion toward the palm!
// ===========================================================================

export const POSE_AR_RIGHT_GRIP: HandPoseState = {
  // Right hand wraps around the right flank and front strap of the swept pistol grip
  wristPos: [0.038, -0.082, 0.148],
  wristRot: [-0.24, 0.26, -1.45],
  palmRot: [0.04, 0.08, -0.08],
  // Right thumb wraps around the upper-left tang of the grip below the receiver
  thumb: {
    baseX: 0.38,
    baseY: 0.52,
    baseZ: 0.32,
    mcpX: 0.52,
    ipX: 0.48,
  },
  // Right index finger extends forward into trigger guard onto the trigger blade
  index: {
    splayZ: -0.14,
    baseYawY: 0.16,
    mcpX: 0.35,
    pipX: 0.58,
    dipX: 0.42,
  },
  // Middle, Ring, Little fingers stack and curl around the front of the pistol grip
  middle: {
    splayZ: 0.0,
    baseYawY: 0.0,
    mcpX: 1.16,
    pipX: 1.28,
    dipX: 0.86,
  },
  ring: {
    splayZ: 0.05,
    baseYawY: -0.03,
    mcpX: 1.24,
    pipX: 1.35,
    dipX: 0.92,
  },
  little: {
    splayZ: 0.1,
    baseYawY: -0.06,
    mcpX: 1.32,
    pipX: 1.4,
    dipX: 0.96,
  },
};

export const POSE_AR_LEFT_SUPPORT: HandPoseState = {
  // Left hand cradles the underside and left flank of the Assault Rifle handguard (z = -0.16..-0.24)
  wristPos: [-0.046, -0.032, -0.145],
  wristRot: [0.28, -0.48, 2.05],
  palmRot: [0.08, -0.08, 0.12],
  // Left thumb rests naturally along the upper-left rail of the handguard
  thumb: {
    baseX: 0.26,
    baseY: -0.46,
    baseZ: -0.32,
    mcpX: 0.46,
    ipX: 0.42,
  },
  // Four separated fingers wrap underneath and curl around the handguard
  index: {
    splayZ: 0.08,
    baseYawY: 0.05,
    mcpX: 0.92,
    pipX: 1.08,
    dipX: 0.68,
  },
  middle: {
    splayZ: 0.02,
    baseYawY: 0.0,
    mcpX: 0.98,
    pipX: 1.14,
    dipX: 0.74,
  },
  ring: {
    splayZ: -0.04,
    baseYawY: -0.03,
    mcpX: 1.05,
    pipX: 1.18,
    dipX: 0.78,
  },
  little: {
    splayZ: -0.09,
    baseYawY: -0.06,
    mcpX: 1.12,
    pipX: 1.22,
    dipX: 0.82,
  },
};

export const POSE_AR_LEFT_OPEN_RELEASE: HandPoseState = {
  // Phase 2 of AR reload: left hand releases handguard, fingers uncurl & open toward magazine
  wristPos: [-0.052, -0.062, -0.085],
  wristRot: [0.22, -0.32, 1.55],
  palmRot: [0.04, -0.05, 0.08],
  thumb: {
    baseX: 0.18,
    baseY: -0.35,
    baseZ: -0.25,
    mcpX: 0.22,
    ipX: 0.18,
  },
  index: { splayZ: 0.12, baseYawY: 0.06, mcpX: 0.28, pipX: 0.35, dipX: 0.22 },
  middle: { splayZ: 0.02, baseYawY: 0.0, mcpX: 0.32, pipX: 0.38, dipX: 0.25 },
  ring: { splayZ: -0.06, baseYawY: -0.04, mcpX: 0.36, pipX: 0.42, dipX: 0.28 },
  little: { splayZ: -0.14, baseYawY: -0.08, mcpX: 0.42, pipX: 0.46, dipX: 0.32 },
};

export const POSE_AR_LEFT_MAG_GRASP: HandPoseState = {
  // Phase 3 & 4 of AR reload: left hand wraps around the curved magazine body
  wristPos: [-0.032, -0.105, -0.015],
  wristRot: [0.18, -0.24, 1.42],
  palmRot: [0.06, -0.06, 0.08],
  thumb: {
    baseX: 0.42,
    baseY: -0.54,
    baseZ: -0.34,
    mcpX: 0.62,
    ipX: 0.52,
  },
  index: { splayZ: 0.05, baseYawY: 0.02, mcpX: 1.06, pipX: 1.16, dipX: 0.76 },
  middle: { splayZ: 0.0, baseYawY: 0.0, mcpX: 1.12, pipX: 1.22, dipX: 0.8 },
  ring: { splayZ: -0.04, baseYawY: -0.02, mcpX: 1.16, pipX: 1.26, dipX: 0.84 },
  little: { splayZ: -0.08, baseYawY: -0.04, mcpX: 1.2, pipX: 1.3, dipX: 0.86 },
};

export const POSE_REV_RIGHT_GRIP: HandPoseState = {
  // Right hand wraps cleanly around the Revolver's ergonomic brown grip
  wristPos: [0.036, -0.068, 0.162],
  wristRot: [-0.22, 0.24, -1.42],
  palmRot: [0.04, 0.08, -0.08],
  // Right thumb rests high along the left-rear frame near the hammer
  thumb: {
    baseX: 0.32,
    baseY: 0.54,
    baseZ: 0.32,
    mcpX: 0.42,
    ipX: 0.44,
  },
  // Right index finger reaches into revolver trigger guard
  index: {
    splayZ: -0.16,
    baseYawY: 0.18,
    mcpX: 0.36,
    pipX: 0.62,
    dipX: 0.45,
  },
  middle: {
    splayZ: 0.0,
    baseYawY: 0.0,
    mcpX: 1.14,
    pipX: 1.26,
    dipX: 0.84,
  },
  ring: {
    splayZ: 0.04,
    baseYawY: -0.03,
    mcpX: 1.2,
    pipX: 1.32,
    dipX: 0.9,
  },
  little: {
    splayZ: 0.08,
    baseYawY: -0.06,
    mcpX: 1.26,
    pipX: 1.36,
    dipX: 0.94,
  },
};

export const POSE_REV_LEFT_SUPPORT: HandPoseState = {
  // Left hand cups around the front/left of the right hand in a two-handed revolver stance
  wristPos: [-0.038, -0.082, 0.145],
  wristRot: [-0.18, -0.28, 1.48],
  palmRot: [0.05, -0.08, 0.1],
  // Left thumb rests forward alongside the left frame below the cylinder
  thumb: {
    baseX: 0.28,
    baseY: -0.48,
    baseZ: -0.32,
    mcpX: 0.34,
    ipX: 0.32,
  },
  index: { splayZ: 0.05, baseYawY: 0.03, mcpX: 1.02, pipX: 1.14, dipX: 0.74 },
  middle: { splayZ: 0.0, baseYawY: 0.0, mcpX: 1.08, pipX: 1.2, dipX: 0.8 },
  ring: { splayZ: -0.04, baseYawY: -0.02, mcpX: 1.14, pipX: 1.24, dipX: 0.84 },
  little: { splayZ: -0.08, baseYawY: -0.05, mcpX: 1.2, pipX: 1.28, dipX: 0.88 },
};

export const POSE_REV_LEFT_CYLINDER_RELOAD: HandPoseState = {
  // During Revolver reload: left hand moves forward/up to interact with swung-out cylinder
  wristPos: [-0.056, -0.012, 0.038],
  wristRot: [0.12, -0.36, 1.42],
  palmRot: [0.04, -0.08, 0.1],
  thumb: {
    baseX: 0.36,
    baseY: -0.46,
    baseZ: -0.28,
    mcpX: 0.5,
    ipX: 0.46,
  },
  index: { splayZ: 0.08, baseYawY: 0.05, mcpX: 0.65, pipX: 0.78, dipX: 0.52 },
  middle: { splayZ: 0.02, baseYawY: 0.0, mcpX: 0.72, pipX: 0.85, dipX: 0.58 },
  ring: { splayZ: -0.04, baseYawY: -0.03, mcpX: 0.86, pipX: 0.96, dipX: 0.66 },
  little: { splayZ: -0.1, baseYawY: -0.06, mcpX: 0.94, pipX: 1.04, dipX: 0.72 },
};

export const POSE_SG_RIGHT_GRIP: HandPoseState = {
  // Right hand grips the shotgun angled rear grip (z = +0.11..+0.19, y = -0.02..-0.10)
  wristPos: [0.038, -0.072, 0.158],
  wristRot: [-0.26, 0.25, -1.44],
  palmRot: [0.05, 0.08, -0.08],
  thumb: {
    baseX: 0.36,
    baseY: 0.52,
    baseZ: 0.32,
    mcpX: 0.48,
    ipX: 0.46,
  },
  index: {
    splayZ: -0.15,
    baseYawY: 0.16,
    mcpX: 0.36,
    pipX: 0.6,
    dipX: 0.44,
  },
  middle: {
    splayZ: 0.0,
    baseYawY: 0.0,
    mcpX: 1.18,
    pipX: 1.3,
    dipX: 0.88,
  },
  ring: {
    splayZ: 0.05,
    baseYawY: -0.03,
    mcpX: 1.25,
    pipX: 1.36,
    dipX: 0.92,
  },
  little: {
    splayZ: 0.1,
    baseYawY: -0.06,
    mcpX: 1.32,
    pipX: 1.4,
    dipX: 0.96,
  },
};

export const POSE_SG_LEFT_PUMP_SUPPORT: HandPoseState = {
  // Left supporting hand wraps firmly around the shotgun ribbed pump fore-end (z = -0.18..-0.34)
  wristPos: [-0.048, -0.034, -0.215],
  wristRot: [0.3, -0.46, 2.02],
  palmRot: [0.08, -0.08, 0.12],
  thumb: {
    baseX: 0.28,
    baseY: -0.48,
    baseZ: -0.32,
    mcpX: 0.52,
    ipX: 0.46,
  },
  index: { splayZ: 0.07, baseYawY: 0.04, mcpX: 1.02, pipX: 1.16, dipX: 0.76 },
  middle: { splayZ: 0.02, baseYawY: 0.0, mcpX: 1.08, pipX: 1.22, dipX: 0.82 },
  ring: { splayZ: -0.04, baseYawY: -0.03, mcpX: 1.14, pipX: 1.26, dipX: 0.85 },
  little: { splayZ: -0.09, baseYawY: -0.06, mcpX: 1.2, pipX: 1.3, dipX: 0.88 },
};

export const POSE_SG_LEFT_SHELL_INSERT: HandPoseState = {
  // Left hand pinches a 12-gauge shotgun shell and feeds it upward into the lower receiver loading port
  wristPos: [-0.034, -0.078, -0.018],
  wristRot: [0.16, -0.22, 1.36],
  palmRot: [0.05, -0.05, 0.08],
  thumb: {
    baseX: 0.46,
    baseY: -0.58,
    baseZ: -0.36,
    mcpX: 0.64,
    ipX: 0.56,
  },
  index: { splayZ: 0.06, baseYawY: 0.04, mcpX: 0.82, pipX: 0.94, dipX: 0.62 },
  middle: { splayZ: 0.0, baseYawY: 0.0, mcpX: 0.88, pipX: 0.98, dipX: 0.66 },
  ring: { splayZ: -0.05, baseYawY: -0.03, mcpX: 1.12, pipX: 1.22, dipX: 0.82 },
  little: { splayZ: -0.1, baseYawY: -0.06, mcpX: 1.18, pipX: 1.28, dipX: 0.86 },
};

function cloneFingerPose(f: FingerCurlPose): FingerCurlPose {
  return { ...f };
}

function cloneHandPose(p: HandPoseState): HandPoseState {
  return {
    wristPos: [...p.wristPos],
    wristRot: [...p.wristRot],
    palmRot: [...p.palmRot],
    thumb: { ...p.thumb },
    index: cloneFingerPose(p.index),
    middle: cloneFingerPose(p.middle),
    ring: cloneFingerPose(p.ring),
    little: cloneFingerPose(p.little),
  };
}

function dampFingerPose(
  cur: FingerCurlPose,
  target: FingerCurlPose,
  lambda: number,
  dt: number
): void {
  cur.splayZ = damp(cur.splayZ, target.splayZ, lambda, dt);
  cur.baseYawY = damp(cur.baseYawY, target.baseYawY, lambda, dt);
  cur.mcpX = damp(cur.mcpX, target.mcpX, lambda, dt);
  cur.pipX = damp(cur.pipX, target.pipX, lambda, dt);
  cur.dipX = damp(cur.dipX, target.dipX, lambda, dt);
}

function dampHandPose(
  cur: HandPoseState,
  target: HandPoseState,
  lambda: number,
  dt: number
): void {
  for (let i = 0; i < 3; i++) {
    cur.wristPos[i] = damp(cur.wristPos[i], target.wristPos[i], lambda, dt);
    cur.wristRot[i] = damp(cur.wristRot[i], target.wristRot[i], lambda, dt);
    cur.palmRot[i] = damp(cur.palmRot[i], target.palmRot[i], lambda, dt);
  }
  cur.thumb.baseX = damp(cur.thumb.baseX, target.thumb.baseX, lambda, dt);
  cur.thumb.baseY = damp(cur.thumb.baseY, target.thumb.baseY, lambda, dt);
  cur.thumb.baseZ = damp(cur.thumb.baseZ, target.thumb.baseZ, lambda, dt);
  cur.thumb.mcpX = damp(cur.thumb.mcpX, target.thumb.mcpX, lambda, dt);
  cur.thumb.ipX = damp(cur.thumb.ipX, target.thumb.ipX, lambda, dt);

  dampFingerPose(cur.index, target.index, lambda, dt);
  dampFingerPose(cur.middle, target.middle, lambda, dt);
  dampFingerPose(cur.ring, target.ring, lambda, dt);
  dampFingerPose(cur.little, target.little, lambda, dt);
}

function applyPoseToRigImmediate(rig: SingleHandRig, pose: HandPoseState): void {
  rig.wrist.position.set(pose.wristPos[0], pose.wristPos[1], pose.wristPos[2]);
  rig.wrist.rotation.set(pose.wristRot[0], pose.wristRot[1], pose.wristRot[2]);
  rig.palm.rotation.set(pose.palmRot[0], pose.palmRot[1], pose.palmRot[2]);

  // Thumb joints
  rig.thumb.base.rotation.set(
    -pose.thumb.baseX,
    pose.thumb.baseY,
    pose.thumb.baseZ
  );
  rig.thumb.proximal.rotation.set(-pose.thumb.mcpX, 0, 0);
  rig.thumb.distal.rotation.set(-pose.thumb.ipX, 0, 0);

  // 4 Fingers (negative X rotation bends -Z phalanx downward toward -Y palm)
  const applyFinger = (fRig: FingerJointRig, fPose: FingerCurlPose) => {
    fRig.base.rotation.set(0, fPose.baseYawY, fPose.splayZ);
    fRig.proximal.rotation.set(-fPose.mcpX, 0, 0);
    fRig.middle.rotation.set(-fPose.pipX, 0, 0);
    fRig.distal.rotation.set(-fPose.dipX, 0, 0);
  };

  applyFinger(rig.index, pose.index);
  applyFinger(rig.middle, pose.middle);
  applyFinger(rig.ring, pose.ring);
  applyFinger(rig.little, pose.little);
}

/**
 * Creates the complete First-Person Hands Rig (Left + Right articulated hands).
 */
export function createFirstPersonHandsRig(): FirstPersonHandsRig {
  const root = new THREE.Group();
  root.name = 'FirstPersonHandsRoot';

  const rightHand = buildSingleHandRig('right');
  const leftHand = buildSingleHandRig('left');

  root.add(rightHand.armRoot);
  root.add(leftHand.armRoot);

  return {
    root,
    leftHand,
    rightHand,
    totalTriangles: leftHand.triangleCount + rightHand.triangleCount,
  };
}

/**
 * Updates both hands and all 30 finger joints each frame based on:
 * - Active weapon ('assault_rifle' vs 'revolver' vs 'shotgun')
 * - Trigger press articulation (independent index finger curl across MCP, PIP, DIP)
 * - 5-Phase Assault Rifle reload, Revolver cylinder reload, and Shotgun individual shell reload + pump action
 * - Idle micro-relaxation, walk/sprint wrist dynamics, and recoil absorption
 */
export function updateFirstPersonHandsRig(
  handsRig: FirstPersonHandsRig,
  anim: WeaponProceduralState,
  dt: number
): void {
  const clampedDt = clamp(dt, 0.001, 0.05);
  const isAR = anim.activeWeapon === 'assault_rifle';
  const isSG = anim.activeWeapon === 'shotgun';

  // 1. Determine Target Right Hand Pose
  const rightTarget = cloneHandPose(
    isAR
      ? POSE_AR_RIGHT_GRIP
      : isSG
      ? POSE_SG_RIGHT_GRIP
      : POSE_REV_RIGHT_GRIP
  );

  // Synchronized Procedural Idle Sway & Organic Breathing:
  // Uses the exact viewmodel `anim.idleTime` clock (with a subtle natural anatomical phase lag)
  // plus `anim.swayPosX / swayPosY / swayRotX / swayRotY / swayRotZ` and `anim.walkTime`
  // so the 3D hands, wrists, and fingers breathe and sway in organic unison with the weapon.
  const adsCalm = 1 - anim.adsBlend * 0.72;
  const syncBreathY = Math.sin(anim.idleTime - 0.22) * adsCalm;
  const syncBreathX = Math.cos(anim.idleTime * 0.5 - 0.22) * adsCalm;
  const syncBreathRoll = Math.sin(anim.idleTime * 0.7 - 0.18) * adsCalm;
  const fingerPulse = Math.sin(anim.idleTime - 0.45) * 0.026 * adsCalm;

  // Walk cadence micro-articulation on wrists
  const walkWristPitch = Math.sin(anim.walkTime) * 0.014 * adsCalm;
  const walkWristRoll = Math.cos(anim.walkTime * 0.5) * 0.012 * adsCalm;

  // Apply synchronized organic sway & responsive recoil bracing to Right Hand & Forearm
  rightTarget.wristPos[0] += syncBreathX * 0.0016 + anim.swayPosX * 0.18;
  rightTarget.wristPos[1] +=
    syncBreathY * 0.0022 + anim.swayPosY * 0.18 + anim.recoilPosY * 0.32;
  rightTarget.wristPos[2] += anim.recoilPosZ * 0.30;

  rightTarget.wristRot[0] +=
    syncBreathY * 0.018 +
    walkWristPitch +
    anim.swayRotX * 0.24 +
    anim.recoilRotX * 0.46;
  rightTarget.wristRot[1] += syncBreathX * 0.014 + anim.swayRotY * 0.22;
  rightTarget.wristRot[2] +=
    syncBreathRoll * 0.02 +
    walkWristRoll +
    anim.swayRotZ * 0.22 +
    anim.recoilRotZ * 0.35;

  rightTarget.palmRot[0] += syncBreathY * 0.01 + anim.recoilRotX * 0.12;
  rightTarget.palmRot[2] += syncBreathRoll * 0.012;

  // Subtle organic finger breathing + responsive grip tightening on shot across Middle, Ring, Little, and Thumb
  const gripBrace = anim.triggerPress * 0.14;
  rightTarget.middle.mcpX += fingerPulse + gripBrace;
  rightTarget.middle.pipX += fingerPulse * 0.8 + gripBrace;
  rightTarget.ring.mcpX += fingerPulse * 1.1 + gripBrace;
  rightTarget.ring.pipX += fingerPulse * 0.9 + gripBrace;
  rightTarget.little.mcpX += fingerPulse * 1.2 + gripBrace;
  rightTarget.little.pipX += fingerPulse * 1.0 + gripBrace;
  rightTarget.thumb.mcpX += fingerPulse * 0.6 + gripBrace * 0.8;

  // Independent Right Index Finger Trigger Articulation:
  // During reload Phase 1, index finger relaxes outside trigger guard;
  // During firing, index finger curls snappily at MCP, PIP, and DIP to press the trigger!
  if (anim.phase === 'reloading') {
    rightTarget.index.mcpX = 0.18;
    rightTarget.index.pipX = 0.24;
    rightTarget.index.dipX = 0.15;
    rightTarget.index.baseYawY = 0.22;
  } else {
    const pull = anim.triggerPress;
    rightTarget.index.mcpX += pull * 0.48 + fingerPulse * 0.5;
    rightTarget.index.pipX += pull * 0.62 + fingerPulse * 0.5;
    rightTarget.index.dipX += pull * 0.48;
  }

  // On revolver shot recovery, right thumb subtly cocks/stabilizes near hammer
  if (!isAR && !isSG && anim.triggerPress > 0.05) {
    rightTarget.thumb.mcpX += anim.triggerPress * 0.26;
    rightTarget.thumb.ipX += anim.triggerPress * 0.30;
  }

  // 2. Determine Target Left Support Hand Pose (including multi-phase reloads & shotgun pump)
  let leftTarget: HandPoseState;

  if (isAR) {
    if (anim.phase === 'reloading') {
      const p = anim.reloadProgress;
      if (p < 0.16) {
        // Phase 1 — Preparation: weapon tilts, left hand prepares to release
        leftTarget = cloneHandPose(POSE_AR_LEFT_SUPPORT);
      } else if (p < 0.32) {
        // Phase 2 — Support Hand Release: fingers uncurl and open, wrist moves toward magazine
        leftTarget = cloneHandPose(POSE_AR_LEFT_OPEN_RELEASE);
      } else if (p < 0.72) {
        // Phase 3 & 4 — Magazine Interaction & Replacement: left hand grasps magazine and moves with it
        leftTarget = cloneHandPose(POSE_AR_LEFT_MAG_GRASP);
        const magPull = Math.sin(((p - 0.32) / 0.4) * Math.PI);
        leftTarget.wristPos[1] -= magPull * 0.14;
      } else if (p < 0.86) {
        // Phase 4b — Charging Handle Rack
        leftTarget = cloneHandPose(POSE_AR_LEFT_MAG_GRASP);
        leftTarget.wristPos = [-0.015, 0.018, -0.025];
        leftTarget.wristRot = [0.25, -0.15, 1.05];
      } else {
        // Phase 5 — Recovery: return smoothly to handguard grip
        leftTarget = cloneHandPose(POSE_AR_LEFT_SUPPORT);
      }
    } else {
      leftTarget = cloneHandPose(POSE_AR_LEFT_SUPPORT);
      // During ADS on Assault Rifle, tuck left support thumb slightly lower along handguard
      // so it never obscures the front sight post or sight picture (Section 20.2.4 & 20.9)
      if (anim.adsBlend > 0.01) {
        leftTarget.wristPos[1] -= 0.008 * anim.adsBlend;
        leftTarget.thumb.baseX += 0.12 * anim.adsBlend;
        leftTarget.thumb.mcpX += 0.14 * anim.adsBlend;
      }
    }
  } else if (isSG) {
    // Shotgun Left Support Hand:
    // - During reload (`SG_RELOAD_INSERT` / `SG_RELOAD_LOOP`): left hand moves from pump fore-end to lower loading port
    //   and pushes each individual shell upward into the receiver.
    // - During normal hold, movement, ADS, and pump action (`SG_PUMP_PRESENTATION`):
    //   left hand stays firmly attached to the animated pump fore-end (`pumpTravelZ = Math.sin(pumpProgress * Math.PI) * 0.072`).
    if (anim.phase === 'reloading') {
      const sp = anim.shellInsertProgress;
      leftTarget = cloneHandPose(POSE_SG_LEFT_SHELL_INSERT);
      // Smooth upward shell insertion arc into the lower receiver loading port
      const insertPush = Math.sin(sp * Math.PI);
      leftTarget.wristPos[1] += insertPush * 0.044;
      leftTarget.wristPos[2] -= insertPush * 0.028;
      leftTarget.wristRot[0] += insertPush * 0.22;
      leftTarget.thumb.mcpX += insertPush * 0.25;
      leftTarget.index.mcpX += insertPush * 0.22;
    } else {
      leftTarget = cloneHandPose(POSE_SG_LEFT_PUMP_SUPPORT);
      const pumpStroke = Math.sin((anim.pumpProgress ?? 0) * Math.PI);
      // Left hand tracks the exact +Z rearward / -Z forward pump travel of the shotgun fore-end
      leftTarget.wristPos[2] += pumpStroke * 0.072;
      leftTarget.wristPos[1] -= pumpStroke * 0.004;
      leftTarget.wristRot[0] += pumpStroke * 0.12;
      // Tighten finger grip on pump fore-end during pump stroke
      leftTarget.index.mcpX += pumpStroke * 0.14;
      leftTarget.middle.mcpX += pumpStroke * 0.14;
      leftTarget.ring.mcpX += pumpStroke * 0.14;
      if (anim.adsBlend > 0.01) {
        leftTarget.wristPos[1] -= 0.007 * anim.adsBlend;
        leftTarget.thumb.baseX += 0.1 * anim.adsBlend;
      }
    }
  } else {
    // Revolver Left Support Hand
    if (anim.phase === 'reloading') {
      const p = anim.reloadProgress;
      if (p < 0.18) {
        // Release support grip and open fingers
        leftTarget = cloneHandPose(POSE_AR_LEFT_OPEN_RELEASE);
        leftTarget.wristPos = [-0.048, -0.035, 0.095];
      } else if (p < 0.82) {
        // Interact with swung-out cylinder & eject/insert rounds
        leftTarget = cloneHandPose(POSE_REV_LEFT_CYLINDER_RELOAD);
        const shellInteract = Math.sin(p * Math.PI * 4) * 0.012;
        leftTarget.wristPos[2] += shellInteract;
        leftTarget.index.mcpX += Math.sin(p * Math.PI * 6) * 0.18;
        leftTarget.middle.mcpX += Math.cos(p * Math.PI * 6) * 0.18;
      } else {
        // Close cylinder and return to two-handed support grip
        leftTarget = cloneHandPose(POSE_REV_LEFT_SUPPORT);
      }
    } else {
      leftTarget = cloneHandPose(POSE_REV_LEFT_SUPPORT);
    }
  }

  // Synchronized organic breathing, sway & active recoil bracing on Left Support Hand & Forearm
  leftTarget.wristPos[0] += syncBreathX * 0.002 + anim.swayPosX * 0.24;
  leftTarget.wristPos[1] +=
    syncBreathY * 0.0026 + anim.swayPosY * 0.24 + anim.recoilPosY * 0.28;
  leftTarget.wristPos[2] += anim.recoilPosZ * 0.24;

  leftTarget.wristRot[0] +=
    syncBreathY * 0.02 +
    walkWristPitch * 1.1 +
    anim.swayRotX * 0.28 +
    anim.recoilRotX * 0.38;
  leftTarget.wristRot[1] += syncBreathX * 0.016 + anim.swayRotY * 0.25;
  leftTarget.wristRot[2] +=
    -syncBreathRoll * 0.022 -
    walkWristRoll +
    anim.swayRotZ * 0.26 +
    anim.recoilRotZ * 0.25;

  leftTarget.palmRot[0] += syncBreathY * 0.012 + anim.recoilRotX * 0.1;
  leftTarget.palmRot[2] += -syncBreathRoll * 0.014;

  if (anim.phase !== 'reloading') {
    const leftBrace = anim.triggerPress * 0.12;
    leftTarget.index.mcpX += fingerPulse * 0.9 + leftBrace;
    leftTarget.middle.mcpX += fingerPulse * 1.0 + leftBrace;
    leftTarget.ring.mcpX += fingerPulse * 1.1 + leftBrace;
    leftTarget.little.mcpX += fingerPulse * 1.2 + leftBrace;
    leftTarget.thumb.mcpX += fingerPulse * 0.7 + leftBrace * 0.8;
  }

  // Direction 01 — Four Subtle Idle Variations (IdleA, IdleB, IdleC, IdleD):
  // IdleA: Standard steady breathing
  // IdleB: Subtle wrist roll & finger relaxation micro-adjustment
  // IdleC: Support hand micro-shift & thumb flex
  // IdleD: Slight ready-stance tension check
  const idleVarWave = Math.sin(anim.idleVariationTimer * 1.65) * adsCalm;
  if (anim.idleVariation === 'IdleB') {
    rightTarget.wristRot[2] += idleVarWave * 0.032;
    rightTarget.little.mcpX -= Math.abs(idleVarWave) * 0.08;
    rightTarget.ring.mcpX -= Math.abs(idleVarWave) * 0.05;
  } else if (anim.idleVariation === 'IdleC') {
    leftTarget.wristPos[2] += idleVarWave * 0.004;
    leftTarget.thumb.mcpX += idleVarWave * 0.09;
    leftTarget.wristRot[0] += idleVarWave * 0.025;
  } else if (anim.idleVariation === 'IdleD') {
    rightTarget.wristPos[1] += Math.abs(idleVarWave) * 0.0028;
    leftTarget.wristPos[1] += Math.abs(idleVarWave) * 0.0028;
    rightTarget.palmRot[0] -= idleVarWave * 0.02;
  }

  // Direction 03 — Tactical Slide Pose: Canted stabilized hand bracing during slide
  if (anim.slideBlend > 0.001) {
    const sb = anim.slideBlend;
    rightTarget.wristRot[2] -= sb * 0.24;
    rightTarget.wristPos[1] -= sb * 0.006;
    leftTarget.wristRot[2] -= sb * 0.18;
    leftTarget.wristPos[0] += sb * 0.005;
  }

  // Direction 04 — 5-Stage First-Person Melee Attack (Preparation -> Anticipation -> Strike -> Contact -> Recovery)
  if (anim.phase === 'melee' || anim.meleeProgress > 0.001) {
    const mp = anim.meleeProgress;
    // Tightly clench fingers during melee strike
    const clench = Math.sin(mp * Math.PI) * 0.25;
    rightTarget.middle.mcpX += clench;
    rightTarget.ring.mcpX += clench;
    rightTarget.little.mcpX += clench;
    leftTarget.index.mcpX += clench;
    leftTarget.middle.mcpX += clench;

    if (mp < 0.28) {
      // Stages 1 & 2: Preparation & Anticipation windup (pull back and cant inward)
      const wind = mp / 0.28;
      rightTarget.wristPos[0] += wind * 0.018;
      rightTarget.wristPos[1] += wind * 0.015;
      rightTarget.wristPos[2] += wind * 0.028;
      rightTarget.wristRot[0] += wind * 0.28;
      rightTarget.wristRot[1] += wind * 0.32;
      leftTarget.wristPos[2] += wind * 0.022;
    } else if (mp < 0.58) {
      // Stages 3 & 4: Fast Forward Strike & Contact Frame
      const thrust = Math.sin(((mp - 0.28) / 0.3) * Math.PI);
      rightTarget.wristPos[0] -= thrust * 0.025;
      rightTarget.wristPos[1] += thrust * 0.012;
      rightTarget.wristPos[2] -= thrust * 0.055;
      rightTarget.wristRot[0] -= thrust * 0.36;
      rightTarget.wristRot[1] -= thrust * 0.38;
      rightTarget.wristRot[2] -= thrust * 0.28;
      leftTarget.wristPos[2] -= thrust * 0.042;
      leftTarget.wristRot[0] -= thrust * 0.25;
    } else {
      // Stage 5: Smooth Recovery to combat grip
      const rec = 1 - (mp - 0.58) / 0.42;
      rightTarget.wristPos[2] -= rec * 0.015;
      rightTarget.wristRot[0] -= rec * 0.1;
    }
  }

  // Direction 05 — 4-Way Directional Damage Flinch & Single-Trigger Death Lowering
  if (
    Math.abs(anim.damageReactX) > 0.0001 ||
    Math.abs(anim.damageReactY) > 0.0001 ||
    Math.abs(anim.damageReactRoll) > 0.0001
  ) {
    rightTarget.wristPos[0] += anim.damageReactX * 0.35;
    rightTarget.wristPos[1] += anim.damageReactY * 0.35;
    rightTarget.wristRot[2] += anim.damageReactRoll * 0.55;
    leftTarget.wristPos[0] += anim.damageReactX * 0.42;
    leftTarget.wristPos[1] += anim.damageReactY * 0.42;
    leftTarget.wristRot[2] += anim.damageReactRoll * 0.65;
  }

  if (anim.deathDropBlend > 0.001) {
    const db = anim.deathDropBlend;
    rightTarget.wristPos[1] -= db * 0.045;
    rightTarget.wristRot[0] -= db * 0.45;
    rightTarget.wristRot[2] += db * 0.35;
    leftTarget.wristPos[1] -= db * 0.055;
    leftTarget.wristRot[0] -= db * 0.52;
  }

  // Snappy interpolation during firing/melee (30), smooth during normal/reload (22 / 16)
  const blendSpeed =
    anim.phase === 'reloading'
      ? 16
      : anim.phase === 'melee' || anim.triggerPress > 0.15
      ? 30
      : 22;
  dampHandPose(handsRig.rightHand.currentPose, rightTarget, blendSpeed, clampedDt);
  dampHandPose(handsRig.leftHand.currentPose, leftTarget, blendSpeed, clampedDt);

  applyPoseToRigImmediate(handsRig.rightHand, handsRig.rightHand.currentPose);
  applyPoseToRigImmediate(handsRig.leftHand, handsRig.leftHand.currentPose);
}
