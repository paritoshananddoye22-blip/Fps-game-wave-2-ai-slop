import * as THREE from 'three';
import {
  AssaultRifleTriangleBreakdown,
  InspectionViewMode,
  RevolverTriangleBreakdown,
  ShotgunTriangleBreakdown,
  WeaponProceduralState,
} from './types';
import {
  FirstPersonHandsRig,
  createFirstPersonHandsRig,
  updateFirstPersonHandsRig,
} from './hands';

// Mathematical weapon-local sight reference heights (X = 0.000 centerline)
export const AR_SIGHT_AXIS_Y = 0.068;
export const AR_BARREL_AXIS_Y = 0.026;

export const REV_SIGHT_AXIS_Y = 0.064;
export const REV_BARREL_AXIS_Y = 0.028;

export const SG_SIGHT_AXIS_Y = 0.066;
export const SG_BARREL_AXIS_Y = 0.028;

export interface WeaponRig {
  root: THREE.Group;
  assaultRifleGroup: THREE.Group;
  revolverGroup: THREE.Group;
  shotgunGroup: THREE.Group;
  arMagazine: THREE.Object3D;
  arChargingHandle: THREE.Object3D;
  arTrigger: THREE.Object3D;
  arMuzzlePoint: THREE.Object3D;
  arRearSightRef: THREE.Object3D;
  arFrontSightRef: THREE.Object3D;
  revCylinderPivot: THREE.Object3D;
  revHammerPivot: THREE.Object3D;
  revTrigger: THREE.Object3D;
  revMuzzlePoint: THREE.Object3D;
  revRearSightRef: THREE.Object3D;
  revFrontSightRef: THREE.Object3D;
  sgForeEndPivot: THREE.Object3D;
  sgShellGroup: THREE.Object3D;
  sgTrigger: THREE.Object3D;
  sgMuzzlePoint: THREE.Object3D;
  sgRearSightRef: THREE.Object3D;
  sgFrontSightRef: THREE.Object3D;
  muzzleFlashMesh: THREE.Mesh;
  muzzleLight: THREE.PointLight;
  handsRig: FirstPersonHandsRig;
  arTriangleCount: number;
  revTriangleCount: number;
  sgTriangleCount: number;
  arBreakdown: AssaultRifleTriangleBreakdown;
  revBreakdown: RevolverTriangleBreakdown;
  sgBreakdown: ShotgunTriangleBreakdown;
  leftHandTriangleCount: number;
  rightHandTriangleCount: number;
}

/**
 * Counts the exact number of triangles across all visible Mesh children in an Object3D hierarchy.
 * Excludes transient effects (like muzzle flash) and hand meshes when counting weapon geometry budgets.
 */
export function countWeaponTriangles(root: THREE.Object3D): number {
  let tris = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.ignoreBudget) {
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

function countMeshTrianglesSingle(mesh: THREE.Mesh): number {
  const geom = mesh.geometry as THREE.BufferGeometry;
  if (geom.index) return Math.round(geom.index.count / 3);
  if (geom.attributes.position) return Math.round(geom.attributes.position.count / 3);
  return 0;
}

/**
 * Computes the component-by-component triangle breakdown for the Assault Rifle (Section 20.10).
 */
export function computeAssaultRifleBreakdown(
  root: THREE.Object3D
): AssaultRifleTriangleBreakdown {
  const b: AssaultRifleTriangleBreakdown = {
    receiver: 0,
    barrel: 0,
    handguard: 0,
    magazine: 0,
    grip: 0,
    stock: 0,
    frontSight: 0,
    rearSight: 0,
    remaining: 0,
    total: 0,
  };
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.ignoreBudget) {
      const t = countMeshTrianglesSingle(obj as THREE.Mesh);
      const cat = obj.userData.componentCategory as keyof AssaultRifleTriangleBreakdown | undefined;
      if (cat && cat !== 'total' && cat in b) {
        b[cat] += t;
      } else {
        b.remaining += t;
      }
      b.total += t;
    }
  });
  return b;
}

/**
 * Computes the component-by-component triangle breakdown for the Revolver (Section 20.10).
 */
export function computeRevolverBreakdown(
  root: THREE.Object3D
): RevolverTriangleBreakdown {
  const b: RevolverTriangleBreakdown = {
    frame: 0,
    barrel: 0,
    cylinder: 0,
    grip: 0,
    hammer: 0,
    trigger: 0,
    frontSight: 0,
    rearSight: 0,
    remaining: 0,
    total: 0,
  };
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.ignoreBudget) {
      const t = countMeshTrianglesSingle(obj as THREE.Mesh);
      const cat = obj.userData.componentCategory as keyof RevolverTriangleBreakdown | undefined;
      if (cat && cat !== 'total' && cat in b) {
        b[cat] += t;
      } else {
        b.remaining += t;
      }
      b.total += t;
    }
  });
  return b;
}

/**
 * Computes the component-by-component triangle breakdown for the Pump-Action Combat Shotgun (< 150 triangles).
 */
export function computeShotgunBreakdown(
  root: THREE.Object3D
): ShotgunTriangleBreakdown {
  const b: ShotgunTriangleBreakdown = {
    receiver: 0,
    barrel: 0,
    foreEnd: 0,
    stock: 0,
    grip: 0,
    lowerTube: 0,
    frontSight: 0,
    rearSight: 0,
    remaining: 0,
    total: 0,
  };
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.ignoreBudget) {
      const t = countMeshTrianglesSingle(obj as THREE.Mesh);
      const cat = obj.userData.componentCategory as keyof ShotgunTriangleBreakdown | undefined;
      if (cat && cat !== 'total' && cat in b) {
        b[cat] += t;
      } else {
        b.remaining += t;
      }
      b.total += t;
    }
  });
  return b;
}

/**
 * Creates an exact N-triangle custom mesh from raw vertex triplets.
 */
function buildIndexedFlatGeometry(
  vertices: number[][],
  indices: number[]
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const flatPositions = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    flatPositions[i * 3] = vertices[i][0];
    flatPositions[i * 3 + 1] = vertices[i][1];
    flatPositions[i * 3 + 2] = vertices[i][2];
  }
  geom.setAttribute('position', new THREE.BufferAttribute(flatPositions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a closed 8-vertex tapered hexahedron (12 triangles) with flat-shaded normals.
 */
function createTaperedHexahedron(
  wFront: number,
  hFront: number,
  wBack: number,
  hBack: number,
  length: number,
  yOffsetFront = 0,
  yOffsetBack = 0,
  xOffsetFront = 0,
  xOffsetBack = 0
): THREE.BufferGeometry {
  const zF = -length * 0.5;
  const zB = length * 0.5;

  const wf = wFront * 0.5;
  const hf = hFront * 0.5;
  const wb = wBack * 0.5;
  const hb = hBack * 0.5;

  const v = [
    [-wf + xOffsetFront, -hf + yOffsetFront, zF], // 0
    [wf + xOffsetFront, -hf + yOffsetFront, zF], // 1
    [wf + xOffsetFront, hf + yOffsetFront, zF], // 2
    [-wf + xOffsetFront, hf + yOffsetFront, zF], // 3
    [-wb + xOffsetBack, -hb + yOffsetBack, zB], // 4
    [wb + xOffsetBack, -hb + yOffsetBack, zB], // 5
    [wb + xOffsetBack, hb + yOffsetBack, zB], // 6
    [-wb + xOffsetBack, hb + yOffsetBack, zB], // 7
  ];

  const indices = [
    0, 2, 1, 0, 3, 2, // Front
    4, 5, 6, 4, 6, 7, // Back
    3, 6, 2, 3, 7, 6, // Top
    0, 1, 5, 0, 5, 4, // Bottom
    1, 2, 6, 1, 6, 5, // Right
    4, 7, 3, 4, 3, 0, // Left
  ];

  return buildIndexedFlatGeometry(v, indices);
}

/**
 * Creates a closed 6-vertex triangular wedge prism (8 triangles).
 */
function createWedgePrism(
  width: number,
  height: number,
  length: number,
  peakZRatio = 0
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const hl = length * 0.5;
  const peakZ = peakZRatio * hl;

  const v = [
    [-hw, -hh, -hl], // 0
    [hw, -hh, -hl], // 1
    [hw, -hh, hl], // 2
    [-hw, -hh, hl], // 3
    [-hw * 0.75, hh, peakZ], // 4
    [hw * 0.75, hh, peakZ], // 5
  ];

  const indices = [
    0, 1, 2, 0, 2, 3, // bottom (2)
    0, 5, 1, 0, 4, 5, // front slope (2)
    3, 2, 5, 3, 5, 4, // back slope (2)
    0, 3, 4, // left (1)
    1, 5, 2, // right (1)
  ];

  return buildIndexedFlatGeometry(v, indices);
}

/**
 * Creates an open-ended 4-sided rectangular sleeve (8 triangles: top, bottom, left, right).
 */
function createOpenSleeve(
  wFront: number,
  hFront: number,
  wBack: number,
  hBack: number,
  length: number,
  yOffsetFront = 0,
  yOffsetBack = 0
): THREE.BufferGeometry {
  const zF = -length * 0.5;
  const zB = length * 0.5;
  const wf = wFront * 0.5;
  const hf = hFront * 0.5;
  const wb = wBack * 0.5;
  const hb = hBack * 0.5;

  const v = [
    [-wf, -hf + yOffsetFront, zF],
    [wf, -hf + yOffsetFront, zF],
    [wf, hf + yOffsetFront, zF],
    [-wf, hf + yOffsetFront, zF],
    [-wb, -hb + yOffsetBack, zB],
    [wb, -hb + yOffsetBack, zB],
    [wb, hb + yOffsetBack, zB],
    [-wb, hb + yOffsetBack, zB],
  ];

  const indices = [
    3, 6, 2, 3, 7, 6, // Top
    0, 1, 5, 0, 5, 4, // Bottom
    1, 2, 6, 1, 6, 5, // Right
    4, 7, 3, 4, 3, 0, // Left
  ];

  return buildIndexedFlatGeometry(v, indices);
}

/**
 * Creates an open U-channel (6 triangles: 3 quads).
 */
function createChannel(
  width: number,
  height: number,
  length: number
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const hl = length * 0.5;
  const v = [
    [-hw, -hh, -hl],
    [hw, -hh, -hl],
    [hw, hh, -hl],
    [-hw, hh, -hl],
    [-hw, -hh, hl],
    [hw, -hh, hl],
    [hw, hh, hl],
    [-hw, hh, hl],
  ];
  const indices = [
    3, 6, 2, 3, 7, 6,
    1, 2, 6, 1, 6, 5,
    4, 7, 3, 4, 3, 0,
  ];
  return buildIndexedFlatGeometry(v, indices);
}

function tagCategory<T extends THREE.Object3D>(obj: T, category: string): T {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData.componentCategory = category;
    }
  });
  return obj;
}

/**
 * Builds the Complete Redesigned Low-Poly Assault Rifle (`VX-47 CARBINE` — Section 20.2 & 20.3)
 * Strictly <= 165 triangles (Exact Allocated Total: 162 triangles).
 *
 * Component Allocation:
 * - Receiver (Upper + Lower + Top Sight Deck): 32 tris
 * - Barrel & Muzzle (Barrel Tube 12 + Muzzle Brake 4 + Dark Bore Face 2): 18 tris
 * - Handguard (Tapered Body 12 + Top Heat Shield 8 + Front Cap 2): 22 tris
 * - Magazine (Upper Well Body 8 + Curved Lower Body 8 + Baseplate 2): 18 tris
 * - Pistol Grip: 12 tris
 * - Stock (Main Shoulder Stock 12 + Buttpad 6): 18 tris
 * - Rear Iron Sight (Solid Base 4 + Left Notch Ear 3 + Right Notch Ear 3): 10 tris
 * - Front Iron Sight (Gas Block Base 4 + Vertical Post 4 + High-Contrast Sight Tip 2): 10 tris
 * - Remaining (Trigger Guard 6 + Trigger 4 + Charging Handle 6 + Ejection Port & Receiver Trim 6): 22 tris
 * TOTAL = 162 triangles (<= 165 limit).
 */
export function buildAssaultRifleMesh(): {
  group: THREE.Group;
  magazine: THREE.Object3D;
  chargingHandle: THREE.Object3D;
  trigger: THREE.Object3D;
  muzzlePoint: THREE.Object3D;
  rearSightRef: THREE.Object3D;
  frontSightRef: THREE.Object3D;
} {
  const group = new THREE.Group();
  group.name = 'AssaultRifle';

  // Controlled Mechanical Palette
  const matCharcoalUpper = new THREE.MeshStandardMaterial({
    color: 0x242932,
    roughness: 0.42,
    metalness: 0.68,
    flatShading: true,
  });
  const matGunmetalLower = new THREE.MeshStandardMaterial({
    color: 0x38404d,
    roughness: 0.36,
    metalness: 0.76,
    flatShading: true,
  });
  const matBarrelSteel = new THREE.MeshStandardMaterial({
    color: 0x4a5362,
    roughness: 0.28,
    metalness: 0.85,
    flatShading: true,
  });
  const matMattePolymer = new THREE.MeshStandardMaterial({
    color: 0x171a20,
    roughness: 0.8,
    metalness: 0.22,
    flatShading: true,
  });
  const matDarkBore = new THREE.MeshStandardMaterial({
    color: 0x090a0d,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });
  const matDetachableMag = new THREE.MeshStandardMaterial({
    color: 0x444d5c,
    roughness: 0.48,
    metalness: 0.56,
    flatShading: true,
  });
  const matOrangeAccent = new THREE.MeshStandardMaterial({
    color: 0xd95f25,
    roughness: 0.35,
    metalness: 0.38,
    emissive: 0x381304,
    flatShading: true,
  });
  const matFrontSightTip = new THREE.MeshStandardMaterial({
    color: 0xff7a2e,
    roughness: 0.25,
    metalness: 0.2,
    emissive: 0x9a3412,
    emissiveIntensity: 0.85,
    flatShading: true,
  });

  // =========================================================================
  // 1. RECEIVER (32 tris: Upper Receiver 12 + Lower Receiver 12 + Top Deck 8)
  // =========================================================================
  const upperReceiver = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.05, 0.044, 0.054, 0.046, 0.24, 0.001, 0),
      matCharcoalUpper
    ),
    'receiver'
  );
  upperReceiver.position.set(0, 0.023, 0.01);
  group.add(upperReceiver);

  const lowerReceiver = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.046, 0.042, 0.05, 0.038, 0.21, -0.004, 0),
      matGunmetalLower
    ),
    'receiver'
  );
  lowerReceiver.position.set(0, -0.018, 0.018);
  group.add(lowerReceiver);

  // Stepped top mounting rail deck (8 tris open sleeve at y = 0.045..0.051)
  const topReceiverDeck = tagCategory(
    new THREE.Mesh(
      createOpenSleeve(0.034, 0.007, 0.036, 0.007, 0.23, 0, 0),
      matGunmetalLower
    ),
    'receiver'
  );
  topReceiverDeck.position.set(0, 0.048, 0.01);
  group.add(topReceiverDeck);

  // =========================================================================
  // 2. BARREL & MUZZLE (18 tris: Straight 6-sided Barrel 12 + Muzzle Crown 4 + Bore Face 2)
  //    Aligned strictly along (X = 0.000, Y = AR_BARREL_AXIS_Y = 0.026)
  // =========================================================================
  const barrelGeom = new THREE.CylinderGeometry(0.0105, 0.012, 0.35, 6, 1, true);
  barrelGeom.rotateX(Math.PI * 0.5);
  const barrelMesh = tagCategory(
    new THREE.Mesh(barrelGeom, matBarrelSteel),
    'barrel'
  );
  barrelMesh.position.set(0, AR_BARREL_AXIS_Y, -0.345);
  group.add(barrelMesh);

  // 4-tri tapered muzzle compensator sleeve
  const muzzleCrownVerts = [
    [-0.013, -0.013, -0.555],
    [0.013, -0.013, -0.555],
    [0.013, 0.013, -0.555],
    [-0.013, 0.013, -0.555],
    [-0.011, -0.011, -0.515],
    [0.011, -0.011, -0.515],
    [0.011, 0.011, -0.515],
    [-0.011, 0.011, -0.515],
  ];
  const muzzleCrownIndices = [
    3, 6, 2, // top
    0, 1, 5, // bottom
    1, 2, 6, // right
    4, 7, 3, // left
  ];
  const muzzleCrownMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(muzzleCrownVerts, muzzleCrownIndices),
      matMattePolymer
    ),
    'barrel'
  );
  muzzleCrownMesh.position.set(0, AR_BARREL_AXIS_Y, 0);
  group.add(muzzleCrownMesh);

  // 2-tri recessed dark muzzle bore face
  const muzzleBoreVerts = [
    [-0.011, -0.011, -0.556],
    [0.011, -0.011, -0.556],
    [0.011, 0.011, -0.556],
    [-0.011, 0.011, -0.556],
  ];
  const muzzleBoreMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(muzzleBoreVerts, [0, 2, 1, 0, 3, 2]),
      matDarkBore
    ),
    'barrel'
  );
  muzzleBoreMesh.position.set(0, AR_BARREL_AXIS_Y, 0);
  group.add(muzzleBoreMesh);

  // =========================================================================
  // 3. HANDGUARD (22 tris: Main Angular Handguard 12 + Upper Heat Shield 8 + Front Bulkhead 2)
  // =========================================================================
  const handguardMain = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.044, 0.046, 0.05, 0.052, 0.22, 0, 0),
      matMattePolymer
    ),
    'handguard'
  );
  handguardMain.position.set(0, 0.016, -0.215);
  group.add(handguardMain);

  const handguardHeatShield = tagCategory(
    new THREE.Mesh(
      createWedgePrism(0.036, 0.012, 0.19, 0),
      matCharcoalUpper
    ),
    'handguard'
  );
  handguardHeatShield.position.set(0, 0.044, -0.205);
  group.add(handguardHeatShield);

  const handguardFrontCap = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-0.021, -0.006, -0.326],
          [0.021, -0.006, -0.326],
          [0.021, 0.042, -0.326],
          [-0.021, 0.042, -0.326],
        ],
        [0, 2, 1, 0, 3, 2]
      ),
      matGunmetalLower
    ),
    'handguard'
  );
  group.add(handguardFrontCap);

  // =========================================================================
  // 4. STOCK (18 tris: Main Shoulder Stock 12 + Defined Buttpad 6)
  // =========================================================================
  const stockMain = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.042, 0.052, 0.038, 0.098, 0.215, 0.004, -0.02),
      matMattePolymer
    ),
    'stock'
  );
  stockMain.position.set(0, -0.002, 0.235);
  group.add(stockMain);

  const buttPad = tagCategory(
    new THREE.Mesh(createChannel(0.04, 0.102, 0.026), matCharcoalUpper),
    'stock'
  );
  buttPad.position.set(0, -0.022, 0.35);
  group.add(buttPad);

  // =========================================================================
  // 5. MAGAZINE (18 tris: Continuous 2-Segment Curved Box Magazine 16 tris + Floorplate 2 tris)
  // =========================================================================
  const magazineGroup = new THREE.Group();
  magazineGroup.position.set(0, -0.04, -0.048);

  const magVerts = [
    // Ring 0: Top receiver magwell insert (y = 0.005)
    [-0.015, 0.005, 0.028], // 0: back-left
    [0.015, 0.005, 0.028], // 1: back-right
    [0.014, 0.005, -0.032], // 2: front-right
    [-0.014, 0.005, -0.032], // 3: front-left
    // Ring 1: Mid magazine curve (y = -0.072, curving slightly forward)
    [-0.015, -0.072, 0.02], // 4: back-left
    [0.015, -0.072, 0.02], // 5: back-right
    [0.014, -0.072, -0.042], // 6: front-right
    [-0.014, -0.072, -0.042], // 7: front-left
    // Ring 2: Bottom flared floorplate (y = -0.148, curving forward)
    [-0.015, -0.142, -0.002], // 8: back-left
    [0.015, -0.142, -0.002], // 9: back-right
    [0.014, -0.154, -0.064], // 10: front-right
    [-0.014, -0.154, -0.064], // 11: front-left
  ];
  const magIndices = [
    // Upper segment (8 tris)
    0, 4, 1, 1, 4, 5, // Rear wall
    1, 5, 2, 2, 5, 6, // Right wall
    2, 6, 3, 3, 6, 7, // Front wall
    3, 7, 0, 0, 7, 4, // Left wall
    // Lower curved segment (8 tris)
    4, 8, 5, 5, 8, 9, // Rear wall
    5, 9, 6, 6, 9, 10, // Right wall
    6, 10, 7, 7, 10, 11, // Front wall
    7, 11, 4, 4, 11, 8, // Left wall
    // Bottom floorplate cap (2 tris)
    8, 11, 9, 9, 11, 10,
  ];
  const magBodyMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(magVerts, magIndices),
      matDetachableMag
    ),
    'magazine'
  );
  magazineGroup.add(magBodyMesh);
  group.add(magazineGroup);

  // =========================================================================
  // 6. PISTOL GRIP (12 tris)
  // =========================================================================
  const pistolGrip = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.034, 0.048, 0.032, 0.044, 0.112, 0, -0.03),
      matMattePolymer
    ),
    'grip'
  );
  pistolGrip.rotation.x = Math.PI * 0.36;
  pistolGrip.position.set(0, -0.08, 0.095);
  group.add(pistolGrip);

  // =========================================================================
  // 7. REAR IRON SIGHT (10 tris — Section 20.3.1:
  //    Solid Mounting Base 4 tris + Left Ear Wall 3 tris + Right Ear Wall 3 tris
  //    Forms a true negative-space open central U-notch centered at X = 0.000,
  //    with its sight reference top line at Y = AR_SIGHT_AXIS_Y = 0.068)
  // =========================================================================
  const rearZ = 0.065;
  const rearBaseY0 = 0.048;
  const rearNotchBottomY = 0.053;
  const rearSightTopY = AR_SIGHT_AXIS_Y + 0.0015; // 0.0695 ear peak framing 0.068 sight line
  const notchHalfW = 0.0062; // 12.4mm wide open U-notch for crisp sight picture
  const earOuterW = 0.0155;

  const rearSightVerts = [
    // Mounting Base (0..5) -> 4 tris (top notch floor + rear face)
    [-earOuterW, rearBaseY0, rearZ + 0.01], // 0: back-left bottom
    [earOuterW, rearBaseY0, rearZ + 0.01], // 1: back-right bottom
    [earOuterW, rearNotchBottomY, rearZ + 0.008], // 2: back-right notch floor
    [-earOuterW, rearNotchBottomY, rearZ + 0.008], // 3: back-left notch floor
    [-earOuterW, rearNotchBottomY, rearZ - 0.01], // 4: front-left notch floor
    [earOuterW, rearNotchBottomY, rearZ - 0.01], // 5: front-right notch floor

    // Left Protective Sight Wall / Ear (6..9) -> 3 tris
    [-earOuterW, rearSightTopY, rearZ + 0.007], // 6: left ear top-outer-back
    [-notchHalfW, rearSightTopY, rearZ + 0.007], // 7: left ear top-inner-back (notch left edge)
    [-notchHalfW, rearNotchBottomY, rearZ + 0.008], // 8: notch bottom-left-back
    [-notchHalfW, rearSightTopY, rearZ - 0.008], // 9: left ear top-inner-front

    // Right Protective Sight Wall / Ear (10..13) -> 3 tris
    [notchHalfW, rearSightTopY, rearZ + 0.007], // 10: right ear top-inner-back (notch right edge)
    [earOuterW, rearSightTopY, rearZ + 0.007], // 11: right ear top-outer-back
    [notchHalfW, rearNotchBottomY, rearZ + 0.008], // 12: notch bottom-right-back
    [notchHalfW, rearSightTopY, rearZ - 0.008], // 13: right ear top-inner-front
  ];
  const rearSightIndices = [
    // Base (4 tris)
    0, 1, 2, 0, 2, 3, // Rear base wall facing camera
    3, 2, 5, 3, 5, 4, // Notch horizontal floor

    // Left Ear (3 tris: rear wall facing camera, inner notch wall)
    3, 8, 7, 3, 7, 6, // Left ear rear face (2 tris)
    8, 9, 7, // Left ear inner notch wall (1 tri)

    // Right Ear (3 tris: rear wall facing camera, inner notch wall)
    12, 2, 11, 12, 11, 10, // Right ear rear face (2 tris)
    12, 10, 13, // Right ear inner notch wall (1 tri)
  ];
  const rearSightMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(rearSightVerts, rearSightIndices),
      matMattePolymer
    ),
    'rearSight'
  );
  group.add(rearSightMesh);

  // =========================================================================
  // 8. FRONT IRON SIGHT (10 tris — Section 20.3.2 & 20.3.3:
  //    Solid Gas-Block Base 4 tris + Narrow Vertical Front Post 4 tris + High-Contrast Post Tip 2 tris
  //    Centered strictly at X = 0.000 with post top at Y = AR_SIGHT_AXIS_Y = 0.068)
  // =========================================================================
  const frontZ = -0.305;
  const frontBaseVerts = [
    [-0.011, 0.042, frontZ + 0.014], // 0
    [0.011, 0.042, frontZ + 0.014], // 1
    [0.008, 0.053, frontZ + 0.01], // 2
    [-0.008, 0.053, frontZ + 0.01], // 3
    [-0.008, 0.053, frontZ - 0.012], // 4
    [0.008, 0.053, frontZ - 0.012], // 5
  ];
  const frontBaseIndices = [
    0, 1, 2, 0, 2, 3, // Rear face
    3, 2, 5, 3, 5, 4, // Top deck
  ];
  const frontBaseMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(frontBaseVerts, frontBaseIndices),
      matCharcoalUpper
    ),
    'frontSight'
  );
  group.add(frontBaseMesh);

  // Narrow vertical front post body (4 tris) rising from y = 0.052 to y = 0.0615
  const postHalfW = 0.0026; // 5.2mm high-visibility front post width
  const frontPostVerts = [
    [-postHalfW, 0.052, frontZ + 0.004], // 0: back-left-bottom
    [postHalfW, 0.052, frontZ + 0.004], // 1: back-right-bottom
    [postHalfW, 0.0615, frontZ + 0.003], // 2: back-right-mid
    [-postHalfW, 0.0615, frontZ + 0.003], // 3: back-left-mid
    [-postHalfW, 0.052, frontZ - 0.005], // 4: front-left-bottom
    [postHalfW, 0.052, frontZ - 0.005], // 5: front-right-bottom
    [postHalfW, 0.0615, frontZ - 0.003], // 6: front-right-mid
    [-postHalfW, 0.0615, frontZ - 0.003], // 7: front-left-mid
  ];
  const frontPostIndices = [
    0, 1, 2, 0, 2, 3, // Rear face facing player (2 tris)
    1, 5, 6, // Right side (1 tri)
    4, 0, 3, // Left side (1 tri)
  ];
  const frontPostMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(frontPostVerts, frontPostIndices),
      matMattePolymer
    ),
    'frontSight'
  );
  group.add(frontPostMesh);

  // High-contrast bright orange/tritium front post tip (2 tris) from y = 0.0615 to exact Y = AR_SIGHT_AXIS_Y (0.068)
  const frontTipVerts = [
    [-postHalfW, 0.0615, frontZ + 0.0035],
    [postHalfW, 0.0615, frontZ + 0.0035],
    [postHalfW, AR_SIGHT_AXIS_Y, frontZ + 0.0035],
    [-postHalfW, AR_SIGHT_AXIS_Y, frontZ + 0.0035],
  ];
  const frontTipMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(frontTipVerts, [0, 1, 2, 0, 2, 3]),
      matFrontSightTip
    ),
    'frontSight'
  );
  group.add(frontTipMesh);

  // =========================================================================
  // 9. REMAINING MECHANICAL COMPONENTS (22 tris:
  //    Trigger Guard 6 + Trigger 4 + Charging Handle 6 + Ejection Port & Trim 6)
  // =========================================================================
  const triggerGuard = tagCategory(
    new THREE.Mesh(createChannel(0.018, 0.026, 0.054), matMattePolymer),
    'remaining'
  );
  triggerGuard.rotation.z = Math.PI;
  triggerGuard.position.set(0, -0.05, 0.046);
  group.add(triggerGuard);

  const triggerVertices = [
    [-0.004, 0, -0.004],
    [0.004, 0, -0.004],
    [0.004, -0.022, 0.005],
    [-0.004, -0.022, 0.005],
  ];
  const triggerMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(triggerVertices, [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]),
      matOrangeAccent
    ),
    'remaining'
  );
  triggerMesh.position.set(0, -0.036, 0.052);
  group.add(triggerMesh);

  // Charging handle (6 tris) mounted on right-upper receiver slot so it never blocks sight axis
  const chargingHandle = tagCategory(
    new THREE.Mesh(createChannel(0.026, 0.01, 0.034), matOrangeAccent),
    'remaining'
  );
  chargingHandle.position.set(0.026, 0.035, 0.005);
  group.add(chargingHandle);

  // Receiver orange tactical accent strips (6 tris: 3 quads on left/right/ejection port)
  const accentStripVerts = [
    // Left receiver accent stripe (2 tris)
    [-0.0265, 0.018, -0.08],
    [-0.0265, 0.028, -0.08],
    [-0.0265, 0.028, 0.02],
    [-0.0265, 0.018, 0.02],
    // Right receiver accent stripe (2 tris)
    [0.0265, 0.018, -0.08],
    [0.0265, 0.028, -0.08],
    [0.0265, 0.028, 0.02],
    [0.0265, 0.018, 0.02],
    // Right ejection port bolt carrier plate (2 tris)
    [0.0268, 0.014, -0.055],
    [0.0268, 0.032, -0.055],
    [0.0268, 0.032, 0.005],
    [0.0268, 0.014, 0.005],
  ];
  const accentStripIndices = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
  ];
  const accentStripsMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(accentStripVerts, accentStripIndices),
      matOrangeAccent
    ),
    'remaining'
  );
  group.add(accentStripsMesh);

  // Reference anchor points for Muzzle, Rear Sight Notch Center, and Front Sight Post Tip
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, AR_BARREL_AXIS_Y, -0.56);
  group.add(muzzlePoint);

  const rearSightRef = new THREE.Object3D();
  rearSightRef.position.set(0, AR_SIGHT_AXIS_Y, rearZ);
  group.add(rearSightRef);

  const frontSightRef = new THREE.Object3D();
  frontSightRef.position.set(0, AR_SIGHT_AXIS_Y, frontZ);
  group.add(frontSightRef);

  return {
    group,
    magazine: magazineGroup,
    chargingHandle,
    trigger: triggerMesh,
    muzzlePoint,
    rearSightRef,
    frontSightRef,
  };
}

/**
 * Builds the Complete Redesigned Low-Poly Revolver (`KR-6 MAGNUM` — Section 20.6 & 20.7)
 * Strictly <= 145 triangles (Exact Allocated Total: 141 triangles).
 *
 * Component Allocation:
 * - Main Frame (Lower Frame 12 + Top Strap 8 + Rear Shield 8): 28 tris
 * - Barrel & Muzzle (Heavy Slab Barrel 12 + Muzzle Crown 4 + Dark Bore Face 2): 18 tris
 * - Cylinder & Chambers (6-Sided Cylinder 24 + 6 Chamber Flutes/Recesses 12): 36 tris
 * - Grip (Curved Ergonomic Walnut Grip 12 + Flared Pommel 8): 20 tris
 * - Hammer (Articulated Low-Profile Spur): 8 tris
 * - Trigger & Trigger Guard (Guard 8 + Trigger Blade 4): 12 tris
 * - Rear Iron Sight (Rear Frame Sight Base 1 + Left Notch Wall 3 + Right Notch Wall 3): 7 tris
 * - Front Iron Sight (Ramped Blade Post 4 + High-Contrast Sight Tip 2): 6 tris
 * - Remaining (Under-Barrel Ejector Rod Shroud 6): 6 tris
 * TOTAL = 141 triangles (<= 145 limit).
 */
export function buildRevolverMesh(): {
  group: THREE.Group;
  cylinderPivot: THREE.Object3D;
  hammerPivot: THREE.Object3D;
  trigger: THREE.Object3D;
  muzzlePoint: THREE.Object3D;
  rearSightRef: THREE.Object3D;
  frontSightRef: THREE.Object3D;
} {
  const group = new THREE.Group();
  group.name = 'Revolver';

  // Controlled Revolver Palette
  const matDarkFrame = new THREE.MeshStandardMaterial({
    color: 0x252a33,
    roughness: 0.36,
    metalness: 0.78,
    flatShading: true,
  });
  const matGunmetalBarrel = new THREE.MeshStandardMaterial({
    color: 0x465060,
    roughness: 0.26,
    metalness: 0.86,
    flatShading: true,
  });
  const matBrightCylinder = new THREE.MeshStandardMaterial({
    color: 0x6a778a,
    roughness: 0.22,
    metalness: 0.88,
    flatShading: true,
  });
  const matBrownGrip = new THREE.MeshStandardMaterial({
    color: 0x543422,
    roughness: 0.76,
    metalness: 0.1,
    flatShading: true,
  });
  const matDarkBore = new THREE.MeshStandardMaterial({
    color: 0x090a0d,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });
  const matSightHighlight = new THREE.MeshStandardMaterial({
    color: 0xff7a2e,
    roughness: 0.25,
    metalness: 0.2,
    emissive: 0x9a3412,
    emissiveIntensity: 0.85,
    flatShading: true,
  });

  // =========================================================================
  // 1. MAIN FRAME (28 tris: Lower Frame 12 + Top Strap 8 + Standing Breech Shield 8)
  // =========================================================================
  const lowerFrame = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.034, 0.03, 0.036, 0.042, 0.155, 0, -0.006),
      matDarkFrame
    ),
    'frame'
  );
  lowerFrame.position.set(0, -0.012, 0.01);
  group.add(lowerFrame);

  const topStrap = tagCategory(
    new THREE.Mesh(
      createOpenSleeve(0.03, 0.01, 0.032, 0.012, 0.13, 0, 0),
      matDarkFrame
    ),
    'frame'
  );
  topStrap.position.set(0, 0.048, -0.002);
  group.add(topStrap);

  const rearFrame = tagCategory(
    new THREE.Mesh(createWedgePrism(0.036, 0.052, 0.052, -0.2), matDarkFrame),
    'frame'
  );
  rearFrame.position.set(0, 0.016, 0.072);
  group.add(rearFrame);

  // =========================================================================
  // 2. BARREL & MUZZLE (18 tris: Bull Barrel 12 + Muzzle Crown 4 + Dark Bore Face 2)
  //    Aligned strictly along (X = 0.000, Y = REV_BARREL_AXIS_Y = 0.028)
  // =========================================================================
  const barrel = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.026, 0.04, 0.03, 0.044, 0.23, 0, 0),
      matGunmetalBarrel
    ),
    'barrel'
  );
  barrel.position.set(0, REV_BARREL_AXIS_Y, -0.182);
  group.add(barrel);

  // 4-tri muzzle crown bevel + 2-tri dark bore face at z = -0.302
  const revMuzzleVerts = [
    [-0.01, -0.01, -0.302],
    [0.01, -0.01, -0.302],
    [0.01, 0.01, -0.302],
    [-0.01, 0.01, -0.302],
    [-0.012, -0.012, -0.296],
    [0.012, -0.012, -0.296],
    [0.012, 0.012, -0.296],
    [-0.012, 0.012, -0.296],
  ];
  const revMuzzleCrown = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(revMuzzleVerts, [
        3, 6, 2,
        0, 1, 5,
        1, 2, 6,
        4, 7, 3,
      ]),
      matDarkFrame
    ),
    'barrel'
  );
  revMuzzleCrown.position.set(0, REV_BARREL_AXIS_Y, 0);
  group.add(revMuzzleCrown);

  const revBoreFace = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-0.009, -0.009, -0.3025],
          [0.009, -0.009, -0.3025],
          [0.009, 0.009, -0.3025],
          [-0.009, 0.009, -0.3025],
        ],
        [0, 2, 1, 0, 3, 2]
      ),
      matDarkBore
    ),
    'barrel'
  );
  revBoreFace.position.set(0, REV_BARREL_AXIS_Y, 0);
  group.add(revBoreFace);

  // =========================================================================
  // 3. CYLINDER & CHAMBERS (36 tris: 6-sided Cylinder 24 + 6 Chamber Flutes 12)
  // =========================================================================
  const cylinderPivot = new THREE.Group();
  cylinderPivot.position.set(0, 0.018, -0.004);

  const cylGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.076, 6, 1, false);
  cylGeom.rotateX(Math.PI * 0.5);
  const cylMesh = tagCategory(
    new THREE.Mesh(cylGeom, matBrightCylinder),
    'cylinder'
  );
  cylinderPivot.add(cylMesh);

  // 12 tris for 6 recessed chamber flutes around the cylinder
  const detailVerts: number[][] = [];
  const detailIndices: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const r = 0.0278;
    const cx = Math.cos(angle) * r;
    const cy = Math.sin(angle) * r;
    const tx = -Math.sin(angle) * 0.0055;
    const ty = Math.cos(angle) * 0.0055;
    const base = i * 4;
    detailVerts.push(
      [cx - tx, cy - ty, -0.028],
      [cx + tx, cy + ty, -0.028],
      [cx + tx, cy + ty, 0.028],
      [cx - tx, cy - ty, 0.028]
    );
    detailIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const cylDetailsMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(detailVerts, detailIndices),
      matDarkFrame
    ),
    'cylinder'
  );
  cylinderPivot.add(cylDetailsMesh);

  group.add(cylinderPivot);

  // =========================================================================
  // 4. GRIP (20 tris: Curved Ergonomic Grip 12 + Flared Pommel 8)
  // =========================================================================
  const gripMain = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.035, 0.046, 0.042, 0.056, 0.124, 0, -0.036),
      matBrownGrip
    ),
    'grip'
  );
  gripMain.rotation.x = Math.PI * 0.34;
  gripMain.position.set(0, -0.068, 0.115);
  group.add(gripMain);

  const gripPommel = tagCategory(
    new THREE.Mesh(createWedgePrism(0.044, 0.024, 0.056, 0), matBrownGrip),
    'grip'
  );
  gripPommel.position.set(0, -0.132, 0.145);
  group.add(gripPommel);

  // =========================================================================
  // 5. HAMMER (8 tris wedge prism kept cleanly below sight line at rest)
  // =========================================================================
  const hammerPivot = new THREE.Group();
  hammerPivot.position.set(0, 0.022, 0.078);
  const hammerMesh = tagCategory(
    new THREE.Mesh(
      createWedgePrism(0.011, 0.016, 0.026, 0.35),
      matBrightCylinder
    ),
    'hammer'
  );
  hammerMesh.position.set(0, 0.004, 0.006);
  hammerPivot.add(hammerMesh);
  group.add(hammerPivot);

  // =========================================================================
  // 6. TRIGGER & TRIGGER GUARD (12 tris: Guard 8 + Trigger 4)
  // =========================================================================
  const revGuard = tagCategory(
    new THREE.Mesh(
      createOpenSleeve(0.018, 0.028, 0.018, 0.028, 0.052, 0, 0),
      matDarkFrame
    ),
    'trigger'
  );
  revGuard.position.set(0, -0.04, 0.035);
  group.add(revGuard);

  const revTrigger = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-0.004, 0, -0.005],
          [0.004, 0, -0.005],
          [0.004, -0.02, 0.006],
          [-0.004, -0.02, 0.006],
        ],
        [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]
      ),
      matBrightCylinder
    ),
    'trigger'
  );
  revTrigger.position.set(0, -0.026, 0.038);
  group.add(revTrigger);

  // =========================================================================
  // 7. REAR IRON SIGHT (7 tris — Section 20.7.1:
  //    Rear Notch Floor 1 tri + Left Notch Wall 3 tris + Right Notch Wall 3 tris
  //    Forms an open central U-notch at Z = +0.046, X = 0.000, Y = REV_SIGHT_AXIS_Y = 0.064)
  // =========================================================================
  const revRearZ = 0.046;
  const revNotchFloorY = 0.052;
  const revSightTopY = REV_SIGHT_AXIS_Y + 0.0015; // 0.0655 ear top framing 0.064 sight line
  const revNotchHalfW = 0.0056;
  const revEarOuterW = 0.014;

  const revRearVerts = [
    // Notch floor & base (0..3)
    [-revEarOuterW, revNotchFloorY, revRearZ + 0.006], // 0
    [revEarOuterW, revNotchFloorY, revRearZ + 0.006], // 1
    [revEarOuterW, revNotchFloorY, revRearZ - 0.008], // 2
    [-revEarOuterW, revNotchFloorY, revRearZ - 0.008], // 3
    // Left Notch Wall (4..7)
    [-revEarOuterW, revSightTopY, revRearZ + 0.006], // 4
    [-revNotchHalfW, revSightTopY, revRearZ + 0.006], // 5
    [-revNotchHalfW, revNotchFloorY, revRearZ + 0.006], // 6
    [-revNotchHalfW, revSightTopY, revRearZ - 0.006], // 7
    // Right Notch Wall (8..11)
    [revNotchHalfW, revSightTopY, revRearZ + 0.006], // 8
    [revEarOuterW, revSightTopY, revRearZ + 0.006], // 9
    [revNotchHalfW, revNotchFloorY, revRearZ + 0.006], // 10
    [revNotchHalfW, revSightTopY, revRearZ - 0.006], // 11
  ];
  const revRearIndices = [
    // Central notch floor (1 tri)
    6, 10, 2,
    // Left Sight Wall (3 tris: rear face 2 + inner notch wall 1)
    0, 6, 5, 0, 5, 4,
    6, 7, 5,
    // Right Sight Wall (3 tris: rear face 2 + inner notch wall 1)
    10, 1, 9, 10, 9, 8,
    10, 8, 11,
  ];
  const revRearSight = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(revRearVerts, revRearIndices),
      matDarkBore
    ),
    'rearSight'
  );
  group.add(revRearSight);

  // =========================================================================
  // 8. FRONT IRON SIGHT (6 tris — Section 20.7.2 & 20.7.3:
  //    Ramped Front Post Base 4 tris + High-Contrast Sight Tip 2 tris
  //    Centered strictly at X = 0.000, Z = -0.268, top at Y = REV_SIGHT_AXIS_Y = 0.064)
  // =========================================================================
  const revFrontZ = -0.268;
  const revPostHalfW = 0.0025;
  const revFrontBaseVerts = [
    [-revPostHalfW, 0.048, revFrontZ + 0.006], // 0
    [revPostHalfW, 0.048, revFrontZ + 0.006], // 1
    [revPostHalfW, 0.058, revFrontZ + 0.004], // 2
    [-revPostHalfW, 0.058, revFrontZ + 0.004], // 3
    [-revPostHalfW, 0.048, revFrontZ - 0.012], // 4
    [revPostHalfW, 0.048, revFrontZ - 0.012], // 5
  ];
  const revFrontBaseMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(revFrontBaseVerts, [
        0, 1, 2, 0, 2, 3, // Rear vertical face (2 tris)
        1, 5, 2, // Right ramp (1 tri)
        4, 0, 3, // Left ramp (1 tri)
      ]),
      matDarkFrame
    ),
    'frontSight'
  );
  group.add(revFrontBaseMesh);

  const revFrontTipMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-revPostHalfW, 0.058, revFrontZ + 0.0045],
          [revPostHalfW, 0.058, revFrontZ + 0.0045],
          [revPostHalfW, REV_SIGHT_AXIS_Y, revFrontZ + 0.0045],
          [-revPostHalfW, REV_SIGHT_AXIS_Y, revFrontZ + 0.0045],
        ],
        [0, 1, 2, 0, 2, 3]
      ),
      matSightHighlight
    ),
    'frontSight'
  );
  group.add(revFrontTipMesh);

  // =========================================================================
  // 9. REMAINING COMPONENTS (6 tris: 3-sided Under-Barrel Ejector Rod)
  // =========================================================================
  const ejectorGeom = new THREE.CylinderGeometry(0.0075, 0.0075, 0.145, 3, 1, true);
  ejectorGeom.rotateX(Math.PI * 0.5);
  const ejectorMesh = tagCategory(
    new THREE.Mesh(ejectorGeom, matBrightCylinder),
    'remaining'
  );
  ejectorMesh.position.set(0, 0.002, -0.145);
  group.add(ejectorMesh);

  // Reference anchor points for Muzzle, Rear Sight Notch Center, and Front Sight Post Tip
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, REV_BARREL_AXIS_Y, -0.31);
  group.add(muzzlePoint);

  const rearSightRef = new THREE.Object3D();
  rearSightRef.position.set(0, REV_SIGHT_AXIS_Y, revRearZ);
  group.add(rearSightRef);

  const frontSightRef = new THREE.Object3D();
  frontSightRef.position.set(0, REV_SIGHT_AXIS_Y, revFrontZ);
  group.add(frontSightRef);

  return {
    group,
    cylinderPivot,
    hammerPivot,
    trigger: revTrigger,
    muzzlePoint,
    rearSightRef,
    frontSightRef,
  };
}

/**
 * Builds the Complete Low-Poly Pump-Action Combat Shotgun (`SG-12 BREACHER`)
 * Strictly under 150 polygons/triangles (Exact Allocated Total: 142 triangles).
 *
 * Component Allocation:
 * - Receiver (Upper Receiver 12 + Lower Receiver 12 + Top Sight Deck 8): 32 tris
 * - Barrel & Muzzle (6-Sided Heavy Combat Barrel 12 + Muzzle Crown 4 + Recessed Dark Bore 2): 18 tris
 * - Pump Fore-End (Animated Ribbed Polymer Fore-End 12 + Slide Action Bar 8): 20 tris
 * - Stock (Tapered Tactical Buttstock 12 + Rubberized Buttpad 6): 18 tris
 * - Rear Grip (Ergonomic Angled Pistol Grip 12): 12 tris
 * - Lower Magazine Tube (6-Sided Under-Barrel Tube 12 + Front Cap 2): 14 tris
 * - Rear Iron Sight (Ghost-Ring / Open U-Notch Base 2 + Left Ear 3 + Right Ear 3): 8 tris
 * - Front Iron Sight (Ramped Base 4 + Vertical Post 2 + High-Contrast Orange Bead 2): 8 tris
 * - Remaining (Trigger Guard 6 + Articulated Trigger Blade 4 + Ejection/Loading Port Accent 2): 12 tris
 * TOTAL = 142 triangles (strictly < 150 limit).
 * Plus a separate 10-triangle Shell Visual (`sgShellGroup`) shown during individual shell reloads.
 */
export function buildShotgunMesh(): {
  group: THREE.Group;
  foreEndPivot: THREE.Object3D;
  shellGroup: THREE.Object3D;
  trigger: THREE.Object3D;
  muzzlePoint: THREE.Object3D;
  rearSightRef: THREE.Object3D;
  frontSightRef: THREE.Object3D;
} {
  const group = new THREE.Group();
  group.name = 'Shotgun';

  // Controlled Shotgun Palette (MAT_SG_GUNMETAL, MAT_SG_BARREL, MAT_SG_POLYMER, MAT_SG_GRIP, MAT_SG_ACCENT, MAT_SG_SHELL)
  const matSgGunmetal = new THREE.MeshStandardMaterial({
    color: 0x2b313b,
    roughness: 0.42,
    metalness: 0.72,
    flatShading: true,
  });
  const matSgBarrel = new THREE.MeshStandardMaterial({
    color: 0x4b5668,
    roughness: 0.3,
    metalness: 0.84,
    flatShading: true,
  });
  const matSgPolymer = new THREE.MeshStandardMaterial({
    color: 0x1a1e26,
    roughness: 0.72,
    metalness: 0.22,
    flatShading: true,
  });
  const matSgGrip = new THREE.MeshStandardMaterial({
    color: 0x3b2a20,
    roughness: 0.78,
    metalness: 0.12,
    flatShading: true,
  });
  const matSgBore = new THREE.MeshStandardMaterial({
    color: 0x080a0d,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });
  const matSgAccent = new THREE.MeshStandardMaterial({
    color: 0xff6b2b,
    roughness: 0.28,
    metalness: 0.25,
    emissive: 0x9a3412,
    emissiveIntensity: 0.8,
    flatShading: true,
  });
  const matSgShellHull = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.45,
    metalness: 0.15,
    flatShading: true,
  });
  const matSgShellBrass = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.88,
    flatShading: true,
  });

  // =========================================================================
  // 1. RECEIVER (32 tris: Upper Receiver 12 + Lower Receiver 12 + Top Deck 8)
  // =========================================================================
  const upperReceiver = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.052, 0.044, 0.056, 0.048, 0.22, 0, 0.002),
      matSgGunmetal
    ),
    'receiver'
  );
  upperReceiver.position.set(0, 0.016, 0.0);
  group.add(upperReceiver);

  const lowerReceiver = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.048, 0.026, 0.05, 0.03, 0.19, 0, -0.002),
      matSgPolymer
    ),
    'receiver'
  );
  lowerReceiver.position.set(0, -0.016, 0.008);
  group.add(lowerReceiver);

  const topDeck = tagCategory(
    new THREE.Mesh(
      createOpenSleeve(0.036, 0.01, 0.04, 0.01, 0.21, 0, 0),
      matSgGunmetal
    ),
    'receiver'
  );
  topDeck.position.set(0, 0.044, 0.0);
  group.add(topDeck);

  // =========================================================================
  // 2. BARREL & MUZZLE (18 tris: 6-sided Heavy Barrel 12 + Muzzle Crown 4 + Bore 2)
  // =========================================================================
  const barrelGeom = new THREE.CylinderGeometry(0.016, 0.0175, 0.44, 6, 1, true);
  barrelGeom.rotateX(Math.PI * 0.5);
  const barrelMesh = tagCategory(
    new THREE.Mesh(barrelGeom, matSgBarrel),
    'barrel'
  );
  barrelMesh.position.set(0, SG_BARREL_AXIS_Y, -0.32);
  group.add(barrelMesh);

  const sgMuzzleVerts = [
    [-0.012, -0.012, -0.542],
    [0.012, -0.012, -0.542],
    [0.012, 0.012, -0.542],
    [-0.012, 0.012, -0.542],
    [-0.015, -0.015, -0.534],
    [0.015, -0.015, -0.534],
    [0.015, 0.015, -0.534],
    [-0.015, 0.015, -0.534],
  ];
  const sgMuzzleCrown = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(sgMuzzleVerts, [
        3, 6, 2,
        0, 1, 5,
        1, 2, 6,
        4, 7, 3,
      ]),
      matSgGunmetal
    ),
    'barrel'
  );
  sgMuzzleCrown.position.set(0, SG_BARREL_AXIS_Y, 0);
  group.add(sgMuzzleCrown);

  const sgBoreFace = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-0.011, -0.011, -0.5425],
          [0.011, -0.011, -0.5425],
          [0.011, 0.011, -0.5425],
          [-0.011, 0.011, -0.5425],
        ],
        [0, 2, 1, 0, 3, 2]
      ),
      matSgBore
    ),
    'barrel'
  );
  sgBoreFace.position.set(0, SG_BARREL_AXIS_Y, 0);
  group.add(sgBoreFace);

  // =========================================================================
  // 3. LOWER MAGAZINE TUBE (14 tris: 6-sided Tube 12 + Front Cap 2)
  // =========================================================================
  const lowerTubeGeom = new THREE.CylinderGeometry(0.014, 0.014, 0.37, 6, 1, true);
  lowerTubeGeom.rotateX(Math.PI * 0.5);
  const lowerTubeMesh = tagCategory(
    new THREE.Mesh(lowerTubeGeom, matSgGunmetal),
    'lowerTube'
  );
  lowerTubeMesh.position.set(0, -0.004, -0.285);
  group.add(lowerTubeMesh);

  const tubeCapMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-0.012, -0.016, -0.471],
          [0.012, -0.016, -0.471],
          [0.012, 0.008, -0.471],
          [-0.012, 0.008, -0.471],
        ],
        [0, 2, 1, 0, 3, 2]
      ),
      matSgBarrel
    ),
    'lowerTube'
  );
  group.add(tubeCapMesh);

  // =========================================================================
  // 4. ANIMATED PUMP FORE-END (20 tris: Ribbed Fore-End 12 + Slide Action Rail 8)
  // =========================================================================
  const foreEndPivot = new THREE.Group();
  foreEndPivot.name = 'ShotgunForeEndPivot';
  foreEndPivot.position.set(0, -0.008, -0.255);

  const foreEndBody = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.056, 0.044, 0.06, 0.048, 0.175, 0, -0.002),
      matSgGrip
    ),
    'foreEnd'
  );
  foreEndPivot.add(foreEndBody);

  const foreEndRail = tagCategory(
    new THREE.Mesh(
      createOpenSleeve(0.038, 0.014, 0.038, 0.014, 0.16, 0, 0),
      matSgPolymer
    ),
    'foreEnd'
  );
  foreEndRail.position.set(0, 0.018, 0.03);
  foreEndPivot.add(foreEndRail);

  group.add(foreEndPivot);

  // =========================================================================
  // 5. STOCK (18 tris: Tactical Buttstock 12 + Rubberized Buttpad 6)
  // =========================================================================
  const stockBody = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.046, 0.056, 0.048, 0.092, 0.22, 0, -0.022),
      matSgPolymer
    ),
    'stock'
  );
  stockBody.position.set(0, -0.012, 0.215);
  group.add(stockBody);

  const stockPad = tagCategory(
    new THREE.Mesh(
      createChannel(0.05, 0.096, 0.024, 'bottom'),
      matSgGrip
    ),
    'stock'
  );
  stockPad.position.set(0, -0.034, 0.332);
  group.add(stockPad);

  // =========================================================================
  // 6. REAR GRIP (12 tris: Swept Angled Pistol Grip)
  // =========================================================================
  const rearGrip = tagCategory(
    new THREE.Mesh(
      createTaperedHexahedron(0.038, 0.048, 0.042, 0.054, 0.115, 0, -0.034),
      matSgGrip
    ),
    'grip'
  );
  rearGrip.rotation.x = Math.PI * 0.34;
  rearGrip.position.set(0, -0.068, 0.118);
  group.add(rearGrip);

  // =========================================================================
  // 7. REAR IRON SIGHT (8 tris: Base 2 + Left Notch Ear 3 + Right Notch Ear 3)
  //    Calibrated to X = 0.000, Y = SG_SIGHT_AXIS_Y = 0.066, Z = +0.065
  // =========================================================================
  const sgRearZ = 0.065;
  const sgNotchFloorY = 0.053;
  const sgSightTopY = SG_SIGHT_AXIS_Y + 0.002;
  const sgNotchHalfW = 0.0065;
  const sgEarOuterW = 0.016;

  const sgRearVerts = [
    [-sgEarOuterW, sgNotchFloorY, sgRearZ + 0.008], // 0
    [sgEarOuterW, sgNotchFloorY, sgRearZ + 0.008], // 1
    [sgEarOuterW, sgNotchFloorY, sgRearZ - 0.008], // 2
    [-sgEarOuterW, sgNotchFloorY, sgRearZ - 0.008], // 3
    [-sgEarOuterW, sgSightTopY, sgRearZ + 0.008], // 4
    [-sgNotchHalfW, sgSightTopY, sgRearZ + 0.008], // 5
    [-sgNotchHalfW, sgNotchFloorY, sgRearZ + 0.008], // 6
    [-sgNotchHalfW, sgSightTopY, sgRearZ - 0.008], // 7
    [sgNotchHalfW, sgSightTopY, sgRearZ + 0.008], // 8
    [sgEarOuterW, sgSightTopY, sgRearZ + 0.008], // 9
    [sgNotchHalfW, sgNotchFloorY, sgRearZ + 0.008], // 10
    [sgNotchHalfW, sgSightTopY, sgRearZ - 0.008], // 11
  ];
  const sgRearIndices = [
    // Central notch floor (2 tris)
    6, 10, 2, 6, 2, 3,
    // Left Sight Ear (3 tris)
    0, 6, 5, 0, 5, 4,
    6, 7, 5,
    // Right Sight Ear (3 tris)
    10, 1, 9, 10, 9, 8,
    10, 8, 11,
  ];
  const sgRearSight = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(sgRearVerts, sgRearIndices),
      matSgBore
    ),
    'rearSight'
  );
  group.add(sgRearSight);

  // =========================================================================
  // 8. FRONT IRON SIGHT (8 tris: Ramped Base 4 + Post 2 + Orange Bead Tip 2)
  //    Calibrated to X = 0.000, Y = SG_SIGHT_AXIS_Y = 0.066, Z = -0.495
  // =========================================================================
  const sgFrontZ = -0.495;
  const sgPostHalfW = 0.003;
  const sgFrontBaseVerts = [
    [-0.006, 0.044, sgFrontZ + 0.01], // 0
    [0.006, 0.044, sgFrontZ + 0.01], // 1
    [sgPostHalfW, 0.056, sgFrontZ + 0.004], // 2
    [-sgPostHalfW, 0.056, sgFrontZ + 0.004], // 3
    [-0.006, 0.044, sgFrontZ - 0.016], // 4
    [0.006, 0.044, sgFrontZ - 0.016], // 5
    [-sgPostHalfW, 0.061, sgFrontZ + 0.004], // 6
    [sgPostHalfW, 0.061, sgFrontZ + 0.004], // 7
  ];
  const sgFrontBaseMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(sgFrontBaseVerts, [
        0, 1, 2, 0, 2, 3, // Base rear face (2 tris)
        1, 5, 2, // Right ramp (1 tri)
        4, 0, 3, // Left ramp (1 tri)
        3, 2, 7, 3, 7, 6, // Upper post column (2 tris)
      ]),
      matSgGunmetal
    ),
    'frontSight'
  );
  group.add(sgFrontBaseMesh);

  const sgFrontBeadMesh = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-sgPostHalfW, 0.061, sgFrontZ + 0.0045],
          [sgPostHalfW, 0.061, sgFrontZ + 0.0045],
          [sgPostHalfW, SG_SIGHT_AXIS_Y, sgFrontZ + 0.0045],
          [-sgPostHalfW, SG_SIGHT_AXIS_Y, sgFrontZ + 0.0045],
        ],
        [0, 1, 2, 0, 2, 3]
      ),
      matSgAccent
    ),
    'frontSight'
  );
  group.add(sgFrontBeadMesh);

  // =========================================================================
  // 9. REMAINING (12 tris: Trigger Guard 6 + Trigger Blade 4 + Port Accent 2)
  // =========================================================================
  const sgGuard = tagCategory(
    new THREE.Mesh(
      createChannel(0.018, 0.026, 0.056, 'bottom'),
      matSgPolymer
    ),
    'remaining'
  );
  sgGuard.position.set(0, -0.042, 0.048);
  group.add(sgGuard);

  const sgTrigger = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [-0.004, 0, -0.005],
          [0.004, 0, -0.005],
          [0.004, -0.02, 0.006],
          [-0.004, -0.02, 0.006],
        ],
        [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]
      ),
      matSgBarrel
    ),
    'remaining'
  );
  sgTrigger.position.set(0, -0.028, 0.052);
  group.add(sgTrigger);

  const sgPortAccent = tagCategory(
    new THREE.Mesh(
      buildIndexedFlatGeometry(
        [
          [0.0285, 0.008, -0.055],
          [0.0285, 0.028, -0.055],
          [0.0285, 0.028, 0.015],
          [0.0285, 0.008, 0.015],
        ],
        [0, 2, 1, 0, 3, 2]
      ),
      matSgAccent
    ),
    'remaining'
  );
  group.add(sgPortAccent);

  // =========================================================================
  // 10. SEPARATE 12-GAUGE SHELL VISUAL FOR INDIVIDUAL SHELL RELOAD (10 tris)
  //     (Marked ignoreBudget = true so weapon mesh stays strictly 142 tris)
  // =========================================================================
  const shellGroup = new THREE.Group();
  shellGroup.name = 'ShotgunShellVisual';
  shellGroup.visible = false;

  const hullGeom = new THREE.CylinderGeometry(0.0105, 0.0105, 0.048, 3, 1, true);
  hullGeom.rotateX(Math.PI * 0.5);
  const hullMesh = new THREE.Mesh(hullGeom, matSgShellHull);
  hullMesh.userData.ignoreBudget = true;
  shellGroup.add(hullMesh);

  const brassGeom = new THREE.CylinderGeometry(0.0112, 0.0112, 0.016, 2, 1, true);
  brassGeom.rotateX(Math.PI * 0.5);
  const brassMesh = new THREE.Mesh(brassGeom, matSgShellBrass);
  brassMesh.position.set(0, 0, 0.028);
  brassMesh.userData.ignoreBudget = true;
  shellGroup.add(brassMesh);

  group.add(shellGroup);

  // Reference anchor points for Muzzle (`SHOTGUN_MUZZLE_POINT`), Rear Sight, and Front Sight
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.name = 'SHOTGUN_MUZZLE_POINT';
  muzzlePoint.position.set(0, SG_BARREL_AXIS_Y, -0.55);
  group.add(muzzlePoint);

  const rearSightRef = new THREE.Object3D();
  rearSightRef.position.set(0, SG_SIGHT_AXIS_Y, sgRearZ);
  group.add(rearSightRef);

  const frontSightRef = new THREE.Object3D();
  frontSightRef.position.set(0, SG_SIGHT_AXIS_Y, sgFrontZ);
  group.add(frontSightRef);

  return {
    group,
    foreEndPivot,
    shellGroup,
    trigger: sgTrigger,
    muzzlePoint,
    rearSightRef,
    frontSightRef,
  };
}

/**
 * Creates the complete First-Person Weapon Viewmodel Rig attached to the camera,
 * including all three low-poly weapons (Assault Rifle, Revolver, Pump-Action Shotgun),
 * component triangle breakdowns, and the articulated Left & Right Human Hands.
 */
export function createWeaponRig(): WeaponRig {
  const root = new THREE.Group();
  root.name = 'WeaponViewmodelRoot';

  const ar = buildAssaultRifleMesh();
  const rev = buildRevolverMesh();
  const sg = buildShotgunMesh();

  const arTriangleCount = countWeaponTriangles(ar.group);
  const revTriangleCount = countWeaponTriangles(rev.group);
  const sgTriangleCount = countWeaponTriangles(sg.group);
  const arBreakdown = computeAssaultRifleBreakdown(ar.group);
  const revBreakdown = computeRevolverBreakdown(rev.group);
  const sgBreakdown = computeShotgunBreakdown(sg.group);

  root.add(ar.group);
  root.add(rev.group);
  root.add(sg.group);
  rev.group.visible = false;
  sg.group.visible = false;

  // Mount First-Person Human Hands Hierarchy inside Viewmodel Root
  const handsRig = createFirstPersonHandsRig();
  root.add(handsRig.root);

  // Low-poly geometric star muzzle flash (marked ignoreBudget = true so it doesn't count as permanent weapon mesh)
  const flashGeom = new THREE.OctahedronGeometry(0.055, 0);
  flashGeom.scale(1.1, 1.1, 2.4);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const muzzleFlashMesh = new THREE.Mesh(flashGeom, flashMat);
  muzzleFlashMesh.userData.ignoreBudget = true;
  muzzleFlashMesh.visible = false;
  root.add(muzzleFlashMesh);

  const muzzleLight = new THREE.PointLight(0xffaa33, 0, 6, 2);
  root.add(muzzleLight);

  return {
    root,
    assaultRifleGroup: ar.group,
    revolverGroup: rev.group,
    shotgunGroup: sg.group,
    arMagazine: ar.magazine,
    arChargingHandle: ar.chargingHandle,
    arTrigger: ar.trigger,
    arMuzzlePoint: ar.muzzlePoint,
    arRearSightRef: ar.rearSightRef,
    arFrontSightRef: ar.frontSightRef,
    revCylinderPivot: rev.cylinderPivot,
    revHammerPivot: rev.hammerPivot,
    revTrigger: rev.trigger,
    revMuzzlePoint: rev.muzzlePoint,
    revRearSightRef: rev.rearSightRef,
    revFrontSightRef: rev.frontSightRef,
    sgForeEndPivot: sg.foreEndPivot,
    sgShellGroup: sg.shellGroup,
    sgTrigger: sg.trigger,
    sgMuzzlePoint: sg.muzzlePoint,
    sgRearSightRef: sg.rearSightRef,
    sgFrontSightRef: sg.frontSightRef,
    muzzleFlashMesh,
    muzzleLight,
    handsRig,
    arTriangleCount,
    revTriangleCount,
    sgTriangleCount,
    arBreakdown,
    revBreakdown,
    sgBreakdown,
    leftHandTriangleCount: handsRig.leftHand.triangleCount,
    rightHandTriangleCount: handsRig.rightHand.triangleCount,
  };
}

/**
 * Applies the blended procedural viewmodel animations (idle, walk, sprint, mouse sway,
 * inertia, firing recoil, reload sub-part animation, shotgun pump & shell insertion, weapon switch,
 * calibrated mathematical ADS, and 30-joint human hands) or Dedicated Weapon Inspection Views to the WeaponRig.
 */
export function applyWeaponRigTransform(
  rig: WeaponRig,
  anim: WeaponProceduralState,
  horizSpeed: number,
  dt = 0.016,
  showHands = true,
  inspectionView: InspectionViewMode = 'off'
): void {
  const isAR = anim.activeWeapon === 'assault_rifle';
  const isSG = anim.activeWeapon === 'shotgun';
  const isRev = anim.activeWeapon === 'revolver';

  rig.assaultRifleGroup.visible = isAR;
  rig.revolverGroup.visible = isRev;
  rig.shotgunGroup.visible = isSG;

  // Dedicated Weapon Inspection Mode (Section 20.11: side, front, top, rear, ads)
  if (inspectionView !== 'off') {
    const sightY = isAR
      ? AR_SIGHT_AXIS_Y
      : isSG
      ? SG_SIGHT_AXIS_Y
      : REV_SIGHT_AXIS_Y;
    rig.arMagazine.position.set(0, -0.042, -0.045);
    rig.arChargingHandle.position.set(0.026, 0.035, 0.005);
    rig.revCylinderPivot.position.set(0, 0.018, -0.004);
    rig.revCylinderPivot.rotation.set(0, 0, 0);
    rig.sgForeEndPivot.position.set(0, -0.008, -0.255);
    rig.sgShellGroup.visible = false;
    rig.arTrigger.rotation.set(0, 0, 0);
    rig.revTrigger.rotation.set(0, 0, 0);
    rig.sgTrigger.rotation.set(0, 0, 0);

    if (inspectionView === 'ads') {
      rig.handsRig.root.visible = showHands;
      const savedAds = anim.adsBlend;
      anim.adsBlend = 1;
      updateFirstPersonHandsRig(rig.handsRig, anim, dt);
      anim.adsBlend = savedAds;
      rig.root.position.set(0, -sightY, isAR || isSG ? -0.225 : -0.255);
      rig.root.rotation.set(0, 0, 0);
      return;
    }

    // Hide hands during orthographic/angle geometry inspection so every sight and receiver edge is 100% unobstructed
    rig.handsRig.root.visible = false;
    const isLongGun = isAR || isSG;
    if (inspectionView === 'side') {
      rig.root.position.set(0, -0.01, isLongGun ? -0.52 : -0.42);
      rig.root.rotation.set(0, Math.PI * 0.5, 0);
    } else if (inspectionView === 'front') {
      rig.root.position.set(0, -0.015, isLongGun ? -0.68 : -0.46);
      rig.root.rotation.set(0.04, Math.PI, 0);
    } else if (inspectionView === 'top') {
      rig.root.position.set(0, -0.02, isLongGun ? -0.52 : -0.42);
      rig.root.rotation.set(Math.PI * 0.5, 0, 0);
    } else if (inspectionView === 'rear') {
      rig.root.position.set(0, -sightY, isLongGun ? -0.24 : -0.26);
      rig.root.rotation.set(0, 0, 0);
    }
    return;
  }

  rig.handsRig.root.visible = showHands;

  // Hip-fire resting position vs. mathematically calibrated ADS sight reference position
  const hipX = isAR ? 0.105 : isSG ? 0.112 : 0.095;
  const hipY = isAR ? -0.078 : isSG ? -0.084 : -0.072;
  const hipZ = isAR ? -0.33 : isSG ? -0.345 : -0.315;

  const adsX = 0.0;
  const adsY = isAR
    ? -AR_SIGHT_AXIS_Y
    : isSG
    ? -SG_SIGHT_AXIS_Y
    : -REV_SIGHT_AXIS_Y;
  const adsZ = isAR ? -0.225 : isSG ? -0.235 : -0.255;

  const baseX = hipX + (adsX - hipX) * anim.adsBlend;
  const baseY = hipY + (adsY - hipY) * anim.adsBlend;
  const baseZ = hipZ + (adsZ - hipZ) * anim.adsBlend;
  const baseYaw = (isAR ? 0.095 : isSG ? 0.105 : 0.075) * (1 - anim.adsBlend);

  // 1. Idle subtle breathing (reduced by 78% in ADS so sight picture stays steady yet alive)
  const idleAmp = 1 - anim.adsBlend * 0.78;
  const breathY = Math.sin(anim.idleTime) * 0.0032 * idleAmp;
  const breathX = Math.cos(anim.idleTime * 0.5) * 0.002 * idleAmp;
  const breathRoll = Math.sin(anim.idleTime * 0.7) * 0.0055 * idleAmp;

  // 2. Walk & Sprint figure-8 movement bob (reduced by 80% in ADS)
  const speedNorm = Math.min(horizSpeed / 8.4, 1.35);
  const walkAmp = speedNorm * (1 - anim.adsBlend * 0.8);
  const walkX =
    Math.cos(anim.walkTime * 0.5) * (0.011 + anim.sprintBlend * 0.014) * walkAmp;
  const walkY =
    Math.abs(Math.sin(anim.walkTime)) *
    (-0.012 - anim.sprintBlend * 0.016) *
    walkAmp;
  const walkRoll =
    Math.cos(anim.walkTime * 0.5) * (0.024 + anim.sprintBlend * 0.032) * walkAmp;

  // 3. Sprint lowering pose
  const sprintDropY = -0.055 * anim.sprintBlend;
  const sprintPushX = -0.045 * anim.sprintBlend;
  const sprintPitch = -0.22 * anim.sprintBlend;
  const sprintYaw = 0.34 * anim.sprintBlend;
  const sprintRoll = 0.18 * anim.sprintBlend;

  // 4. Switch weapon lowering/raising pose
  const switchEase = anim.switchProgress * anim.switchProgress;
  const switchDropY = -0.32 * switchEase;
  const switchPitch = -0.65 * switchEase;

  // 5. Reload procedural pose + mechanical sub-part motion (AR mag, Revolver cylinder, Shotgun shell insert & pump)
  let reloadDropY = 0;
  let reloadPitch = 0;
  let reloadRoll = 0;

  if (anim.phase === 'reloading') {
    const p = anim.reloadProgress;
    const envelope = Math.sin(p * Math.PI); // 0 -> 1 -> 0
    if (isSG) {
      // Shotgun tilts slightly upward/right to expose the lower receiver loading port clearly
      const shellPulse = Math.sin((anim.shellInsertProgress ?? 0) * Math.PI);
      reloadDropY = -0.032 + shellPulse * 0.012;
      reloadPitch = 0.22 + shellPulse * 0.06;
      reloadRoll = 0.42 + shellPulse * 0.05;

      // Show and animate the 12-gauge shell moving from the left hand into the lower receiver port
      rig.sgShellGroup.visible = true;
      rig.sgShellGroup.position.set(
        -0.022 * (1 - shellPulse),
        -0.058 + shellPulse * 0.046,
        0.005 - shellPulse * 0.038
      );
      rig.sgShellGroup.rotation.set(-0.35 * (1 - shellPulse), 0, 0);
      rig.sgForeEndPivot.position.set(0, -0.008, -0.255);
    } else {
      rig.sgShellGroup.visible = false;
      reloadDropY = -0.065 * envelope;
      reloadPitch = 0.24 * envelope;
      reloadRoll = (isAR ? 0.34 : -0.38) * envelope;

      if (isAR) {
        // Magazine slides down out and back in; charging handle pulls back at end
        const magPull =
          p >= 0.25 && p < 0.72 ? Math.sin(((p - 0.25) / 0.47) * Math.PI) : 0;
        rig.arMagazine.position.set(0, -0.042 - magPull * 0.15, -0.045);
        const handlePull =
          p >= 0.72 && p < 0.9 ? Math.sin(((p - 0.72) / 0.18) * Math.PI) : 0;
        rig.arChargingHandle.position.set(
          0.026,
          0.035,
          0.005 + handlePull * 0.055
        );
      } else {
        // Revolver cylinder swings out to the left and spins rapidly
        const cylSwing = Math.sin(p * Math.PI);
        rig.revCylinderPivot.position.set(
          -cylSwing * 0.048,
          0.018 - cylSwing * 0.01,
          -0.004
        );
        rig.revCylinderPivot.rotation.z = p * Math.PI * 6;
      }
    }
  } else {
    rig.sgShellGroup.visible = false;
    rig.arMagazine.position.set(0, -0.042, -0.045);
    rig.arChargingHandle.position.set(
      0.026,
      0.035,
      0.005 + anim.recoilPosZ * 0.5
    );
    rig.revCylinderPivot.position.set(0, 0.018, -0.004);
    rig.revCylinderPivot.rotation.z *= 0.85;

    // Shotgun Pump-Action Presentation (`SG_PUMP_PRESENTATION`):
    // Fore-end slides rearward (+Z) and forward (-Z) in sync with `anim.pumpProgress`
    const pumpStroke = Math.sin((anim.pumpProgress ?? 0) * Math.PI);
    rig.sgForeEndPivot.position.set(0, -0.008, -0.255 + pumpStroke * 0.072);
  }

  // Subtle shotgun body reaction during pump stroke
  const pumpBodyKickZ = isSG ? Math.sin((anim.pumpProgress ?? 0) * Math.PI) * 0.014 : 0;
  const pumpBodyPitch = isSG ? Math.sin((anim.pumpProgress ?? 0) * Math.PI) * 0.045 : 0;

  // Weapon triggers physically articulate when pressed by the right index finger
  rig.arTrigger.rotation.x = -anim.triggerPress * 0.45;
  rig.revTrigger.rotation.x = -anim.triggerPress * 0.48;
  rig.sgTrigger.rotation.x = -anim.triggerPress * 0.46;

  // Revolver hammer cocks back with recoil
  rig.revHammerPivot.rotation.x = -anim.recoilRotX * 3.2;

  // Update First-Person Hands & Fingers Hierarchy (with synchronized breathing & sway)
  if (showHands) {
    updateFirstPersonHandsRig(rig.handsRig, anim, dt);
  }

  // 6. Tactical Slide canted weapon hold (Direction 03)
  const slideX = -0.025 * anim.slideBlend;
  const slideY = -0.022 * anim.slideBlend;
  const slideZ = 0.015 * anim.slideBlend;
  const slidePitch = 0.06 * anim.slideBlend;
  const slideYaw = 0.14 * anim.slideBlend;
  const slideRoll = -0.36 * anim.slideBlend;

  // 7. 5-Stage First-Person Melee Strike (Preparation -> Anticipation -> Strike -> Contact -> Recovery) (Direction 04)
  let meleeX = 0;
  let meleeY = 0;
  let meleeZ = 0;
  let meleePitch = 0;
  let meleeYaw = 0;
  let meleeRoll = 0;

  if (anim.phase === 'melee' || anim.meleeProgress > 0.001) {
    const mp = anim.meleeProgress;
    if (mp < 0.28) {
      // Stages 1 & 2: Preparation & Anticipation windup
      const w = mp / 0.28;
      meleeX = 0.045 * w;
      meleeY = 0.032 * w;
      meleeZ = 0.075 * w;
      meleePitch = 0.34 * w;
      meleeYaw = -0.38 * w;
      meleeRoll = -0.25 * w;
    } else if (mp < 0.58) {
      // Stages 3 & 4: Fast Forward Strike & Contact Frame
      const s = Math.sin(((mp - 0.28) / 0.3) * Math.PI);
      meleeX = -0.075 * s;
      meleeY = 0.018 * s;
      meleeZ = -0.185 * s;
      meleePitch = -0.28 * s;
      meleeYaw = 0.52 * s;
      meleeRoll = 0.38 * s;
    } else {
      // Stage 5: Smooth Recovery
      const r = 1 - (mp - 0.58) / 0.42;
      meleeX = -0.02 * r;
      meleeZ = -0.035 * r;
      meleeYaw = 0.12 * r;
    }
  }

  // 8. Single-Trigger Player Death lowering (Direction 05)
  const deathDropY = -0.26 * anim.deathDropBlend;
  const deathPitch = -0.58 * anim.deathDropBlend;
  const deathRoll = 0.42 * anim.deathDropBlend;

  // Combine all additive positional & rotational channels smoothly
  rig.root.position.set(
    baseX +
      breathX +
      walkX +
      sprintPushX +
      slideX +
      meleeX +
      anim.damageReactX +
      anim.swayPosX,
    baseY +
      breathY +
      walkY +
      sprintDropY +
      switchDropY +
      reloadDropY +
      slideY +
      meleeY +
      deathDropY +
      anim.damageReactY +
      anim.swayPosY +
      anim.recoilPosY,
    baseZ + slideZ + meleeZ + pumpBodyKickZ + anim.recoilPosZ
  );

  rig.root.rotation.set(
    sprintPitch +
      switchPitch +
      reloadPitch +
      slidePitch +
      meleePitch +
      deathPitch +
      pumpBodyPitch +
      anim.swayRotX +
      anim.recoilRotX,
    baseYaw + sprintYaw + slideYaw + meleeYaw + anim.swayRotY,
    breathRoll +
      walkRoll +
      sprintRoll +
      reloadRoll +
      slideRoll +
      meleeRoll +
      deathRoll +
      anim.damageReactRoll +
      anim.swayRotZ +
      anim.recoilRotZ
  );
}


