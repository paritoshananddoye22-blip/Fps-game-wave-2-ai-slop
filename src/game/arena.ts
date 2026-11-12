import * as THREE from 'three';
import {
  AABBCollider,
  AmmoPickupState,
  EnemyArchetype,
  EnemyBotState,
  RampCollider,
} from './types';

export interface ArenaBuildResult {
  arenaGroup: THREE.Group;
  shootableMeshes: THREE.Mesh[];
  colliders: AABBCollider[];
  ramps: RampCollider[];
  initialPickups: AmmoPickupState[];
  pickupMeshes: THREE.Group[];
  spawnPoints: Array<{ x: number; y: number; z: number }>;
}

export interface EnemyMeshRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headMesh: THREE.Mesh;
  visorMesh: THREE.Mesh;
  torsoMesh: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  telegraphRing: THREE.Mesh;
  hitMaterials: THREE.MeshStandardMaterial[];
  baseColors: number[];
}

function createConcreteBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    // Subtle industrial slab grid + speckle grain
    ctx.strokeStyle = '#585858';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 124, 124);
    ctx.strokeRect(130, 2, 124, 124);
    ctx.strokeRect(2, 130, 124, 124);
    ctx.strokeRect(130, 130, 124, 124);

    for (let i = 0; i < 1800; i++) {
      const v = 100 + Math.floor(Math.random() * 55);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        2,
        2
      );
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

export function buildArenaEnvironment(): ArenaBuildResult {
  const arenaGroup = new THREE.Group();
  arenaGroup.name = 'LowPolyArena';

  const shootableMeshes: THREE.Mesh[] = [];
  const colliders: AABBCollider[] = [];
  const ramps: RampCollider[] = [];

  const bumpTex =
    typeof document !== 'undefined' ? createConcreteBumpTexture() : null;

  // Arena Visual Palette: Desaturated gray concrete, dark charcoal structures, muted industrial orange accents, blue lighting
  const matConcreteFloor = new THREE.MeshStandardMaterial({
    color: 0x353b45,
    roughness: 0.86,
    metalness: 0.12,
    bumpMap: bumpTex,
    bumpScale: 0.015,
    flatShading: true,
  });

  const matConcreteWall = new THREE.MeshStandardMaterial({
    color: 0x434a56,
    roughness: 0.78,
    metalness: 0.18,
    flatShading: true,
  });

  const matCharcoalStructure = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.52,
    metalness: 0.62,
    flatShading: true,
  });

  const matOrangeAccent = new THREE.MeshStandardMaterial({
    color: 0xd95f25,
    roughness: 0.42,
    metalness: 0.35,
    flatShading: true,
  });

  const matBlueLightStrip = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.1,
    flatShading: true,
  });

  const matLaneMarking = new THREE.MeshStandardMaterial({
    color: 0x4f5866,
    roughness: 0.75,
    metalness: 0.15,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    flatShading: true,
  });

  // Helper to add a solid box obstacle with AABB collision
  const addSolidBox = (
    id: string,
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    materialType: 'concrete' | 'metal' | 'accent' = 'concrete',
    registerCollider = true
  ) => {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.materialType = materialType;
    arenaGroup.add(mesh);
    shootableMeshes.push(mesh);

    if (registerCollider) {
      colliders.push({
        id,
        minX: cx - w * 0.5,
        maxX: cx + w * 0.5,
        minY: cy - h * 0.5,
        maxY: cy + h * 0.5,
        minZ: cz - d * 0.5,
        maxZ: cz + d * 0.5,
        materialType,
      });
    }
    return mesh;
  };

  // 1. Solid Concrete Floor Slab (1.0m thick so top surface is at y = 0.000 with zero sub-floor gaps)
  const floorGeom = new THREE.BoxGeometry(140, 1.0, 140);
  const floorMesh = new THREE.Mesh(floorGeom, matConcreteFloor);
  floorMesh.position.set(0, -0.5, 0);
  floorMesh.receiveShadow = true;
  floorMesh.userData.materialType = 'concrete';
  arenaGroup.add(floorMesh);
  shootableMeshes.push(floorMesh);

  // Raised tactical lane pads (offset by y = +0.02 so coplanar faces never Z-fight)
  const laneNorthSouth = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.04, 46),
    matLaneMarking
  );
  laneNorthSouth.position.set(0, 0.02, 0);
  laneNorthSouth.receiveShadow = true;
  arenaGroup.add(laneNorthSouth);

  const laneEastWest = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.04, 5.2),
    matLaneMarking
  );
  laneEastWest.position.set(0, 0.02, 0);
  laneEastWest.receiveShadow = true;
  arenaGroup.add(laneEastWest);

  // 2. Watertight Perimeter Industrial Walls (inner face at +/- 23.0m, penetrating 0.3m into floor slab)
  const wallDist = 24.0;
  addSolidBox('wall_north', 0, 3.3, -wallDist, 50.0, 7.2, 2.0, matConcreteWall, 'concrete', true);
  addSolidBox('wall_south', 0, 3.3, wallDist, 50.0, 7.2, 2.0, matConcreteWall, 'concrete', true);
  addSolidBox('wall_west', -wallDist, 3.3, 0, 2.0, 7.2, 50.0, matConcreteWall, 'concrete', true);
  addSolidBox('wall_east', wallDist, 3.3, 0, 2.0, 7.2, 50.0, matConcreteWall, 'concrete', true);

  // Sealed Corner Bastion Pillars at all 4 arena corners so no corner seam or gap exists
  const cornerCoords: Array<[string, number, number]> = [
    ['corner_nw', -22.6, -22.6],
    ['corner_ne', 22.6, -22.6],
    ['corner_sw', -22.6, 22.6],
    ['corner_se', 22.6, 22.6],
  ];
  for (let i = 0; i < cornerCoords.length; i++) {
    const [cid, cx, cz] = cornerCoords[i];
    addSolidBox(cid, cx, 3.5, cz, 2.2, 7.6, 2.2, matCharcoalStructure, 'metal', true);
  }

  // Perimeter buttresses & blue light beacons (penetrating floor slab at minY = -0.2)
  for (let i = -18; i <= 18; i += 12) {
    // North & South buttresses
    addSolidBox(`buttress_n_${i}`, i, 3.5, -23.0, 1.4, 7.4, 1.2, matCharcoalStructure, 'metal', true);
    addSolidBox(`buttress_s_${i}`, i, 3.5, 23.0, 1.4, 7.4, 1.2, matCharcoalStructure, 'metal', true);
    // West & East buttresses
    addSolidBox(`buttress_w_${i}`, -23.0, 3.5, i, 1.2, 7.4, 1.4, matCharcoalStructure, 'metal', true);
    addSolidBox(`buttress_e_${i}`, 23.0, 3.5, i, 1.2, 7.4, 1.4, matCharcoalStructure, 'metal', true);

    // Blue vertical light strips on buttresses
    const stripN = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 0.15), matBlueLightStrip);
    stripN.position.set(i, 3.6, -22.35);
    arenaGroup.add(stripN);

    const stripS = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 0.15), matBlueLightStrip);
    stripS.position.set(i, 3.6, 22.35);
    arenaGroup.add(stripS);
  }

  // Distant industrial skyline silhouettes outside the arena walls (frames spawn vista)
  const skylinePositions = [
    [-38, 12, -42, 12, 24, 12],
    [0, 16, -46, 16, 32, 10],
    [36, 11, -40, 10, 22, 10],
    [-42, 10, 10, 10, 20, 14],
    [42, 13, -8, 12, 26, 14],
  ];
  for (let i = 0; i < skylinePositions.length; i++) {
    const [sx, sy, sz, sw, sh, sd] = skylinePositions[i];
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(sw, sh, sd),
      matCharcoalStructure
    );
    tower.position.set(sx, sy, sz);
    arenaGroup.add(tower);

    const beacon = new THREE.Mesh(
      new THREE.BoxGeometry(sw * 0.6, 0.6, 0.4),
      matOrangeAccent
    );
    beacon.position.set(sx, sh - 2, sz + sd * 0.5 + 0.1);
    arenaGroup.add(beacon);
  }

  // 3. Central Elevated Platform (Overpass Deck at y = 2.2m, base embedded at y = -0.2m) + East & West Ramps
  const platformHeight = 2.2;
  addSolidBox(
    'center_platform',
    0,
    (platformHeight - 0.2) * 0.5,
    0,
    9.0,
    platformHeight + 0.2,
    7.6,
    matCharcoalStructure,
    'metal',
    true
  );

  // Orange trim border on central platform
  addSolidBox(
    'center_trim_n',
    0,
    platformHeight - 0.15,
    -3.85,
    9.1,
    0.35,
    0.2,
    matOrangeAccent,
    'accent',
    false
  );
  addSolidBox(
    'center_trim_s',
    0,
    platformHeight - 0.15,
    3.85,
    9.1,
    0.35,
    0.2,
    matOrangeAccent,
    'accent',
    false
  );

  // Low cover parapet walls on north/south edges of the central platform (flush at y = 2.15..3.30)
  addSolidBox(
    'center_cover_n',
    0,
    platformHeight + 0.52,
    -3.4,
    4.6,
    1.15,
    0.6,
    matConcreteWall,
    'concrete',
    true
  );
  addSolidBox(
    'center_cover_s',
    0,
    platformHeight + 0.52,
    3.4,
    4.6,
    1.15,
    0.6,
    matConcreteWall,
    'concrete',
    true
  );

  // Watertight 6-Sided Closed Ramp Wedge (overlaps central platform by 0.10m so zero seam exists)
  const buildRampMesh = (
    id: string,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    startY: number,
    endY: number,
    axis: 'x+' | 'x-'
  ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const yL = axis === 'x+' ? startY : endY;
    const yR = axis === 'x+' ? endY : startY;

    const geom = new THREE.BufferGeometry();
    const hw = w * 0.5;
    const hd = d * 0.5;
    const verts = new Float32Array([
      -hw, -0.05, -hd, // 0: bottom-west-north
      hw, -0.05, -hd, // 1: bottom-east-north
      hw, yR, -hd, // 2: top-east-north
      -hw, yL, -hd, // 3: top-west-north
      -hw, -0.05, hd, // 4: bottom-west-south
      hw, -0.05, hd, // 5: bottom-east-south
      hw, yR, hd, // 6: top-east-south
      -hw, yL, hd, // 7: top-west-south
    ]);
    const indices = [
      3, 6, 2, 3, 7, 6, // Top sloped deck
      0, 2, 1, 0, 3, 2, // North side wall
      4, 5, 6, 4, 6, 7, // South side wall
      4, 7, 3, 4, 3, 0, // West end face
      1, 2, 6, 1, 6, 5, // East end face
      0, 1, 5, 0, 5, 4, // Bottom floor seal
    ];
    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, matConcreteWall);
    mesh.position.set((minX + maxX) * 0.5, 0, (minZ + maxZ) * 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.materialType = 'concrete';
    arenaGroup.add(mesh);
    shootableMeshes.push(mesh);

    ramps.push({
      id,
      minX,
      maxX,
      minZ,
      maxZ,
      startY,
      endY,
      axis,
    });
  };

  buildRampMesh('ramp_west', -11.0, -4.40, -2.5, 2.5, 0, platformHeight, 'x+');
  buildRampMesh('ramp_east', 4.40, 11.0, -2.5, 2.5, 0, platformHeight, 'x-');

  // 4. Four Heavy Industrial Quadrant Pillars with Orange/Blue Accents
  const pillarCoords = [
    [-11.5, -11.5],
    [11.5, -11.5],
    [-11.5, 11.5],
    [11.5, 11.5],
  ];
  for (let i = 0; i < pillarCoords.length; i++) {
    const [px, pz] = pillarCoords[i];
    addSolidBox(
      `pillar_${i}`,
      px,
      2.8,
      pz,
      3.2,
      5.6,
      3.2,
      matCharcoalStructure,
      'metal',
      true
    );
    // Orange collar around pillar
    addSolidBox(
      `pillar_collar_${i}`,
      px,
      1.8,
      pz,
      3.4,
      0.45,
      3.4,
      matOrangeAccent,
      'accent',
      false
    );
    // Blue light strip
    const pLight = new THREE.Mesh(
      new THREE.BoxGeometry(3.42, 0.22, 3.42),
      matBlueLightStrip
    );
    pLight.position.set(px, 3.9, pz);
    arenaGroup.add(pLight);
  }

  // 5. Low Tactical Cover Blocks in Combat Lanes (leaving central spawn lane wide open)
  const coverBlocks: Array<[number, number, number, number]> = [
    [-5.5, -10.5, 3.6, 1.3],
    [5.5, -10.5, 3.6, 1.3],
    [-5.5, 10.5, 3.6, 1.3],
    [5.5, 10.5, 3.6, 1.3],
    [-15.5, 0, 1.4, 5.2], // West lane cover
    [15.5, 0, 1.4, 5.2], // East lane cover
    [-6.5, -16.5, 3.6, 1.4],
    [6.5, -16.5, 3.6, 1.4],
  ];

  for (let i = 0; i < coverBlocks.length; i++) {
    const [cx, cz, cw, cd] = coverBlocks[i];
    addSolidBox(
      `cover_${i}`,
      cx,
      0.65,
      cz,
      cw,
      1.3,
      cd,
      matConcreteWall,
      'concrete',
      true
    );
    // Top bevel cap in dark charcoal
    addSolidBox(
      `cover_cap_${i}`,
      cx,
      1.34,
      cz,
      cw + 0.1,
      0.12,
      cd + 0.1,
      matCharcoalStructure,
      'metal',
      false
    );
  }

  // 6. Ammunition Pickup Crates (4 strategic locations)
  const pickupCoords = [
    { x: 0, y: platformHeight, z: 0 }, // Center overpass high-reward ammo
    { x: 0, y: 0, z: -17.5 }, // North lane ammo
    { x: -18.5, y: 0, z: 0 }, // West flank ammo
    { x: 18.5, y: 0, z: 0 }, // East flank ammo
  ];

  const initialPickups: AmmoPickupState[] = [];
  const pickupMeshes: THREE.Group[] = [];

  for (let i = 0; i < pickupCoords.length; i++) {
    const pos = pickupCoords[i];
    initialPickups.push({
      id: i + 1,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      active: true,
      respawnTimer: 0,
      bobPhase: i * 1.5,
    });

    const pickupGroup = new THREE.Group();
    pickupGroup.position.set(pos.x, pos.y + 0.45, pos.z);

    // Pedestal ring on floor
    const padGeom = new THREE.CylinderGeometry(0.65, 0.75, 0.08, 8);
    const padMesh = new THREE.Mesh(padGeom, matCharcoalStructure);
    padMesh.position.set(pos.x, pos.y + 0.04, pos.z);
    arenaGroup.add(padMesh);

    // Floating low-poly ammo crate (composite 3-part mesh)
    const crateBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.36, 0.42),
      matCharcoalStructure
    );
    pickupGroup.add(crateBox);

    const crateStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.12, 0.44),
      matOrangeAccent
    );
    pickupGroup.add(crateStripe);

    const crateCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      matBlueLightStrip
    );
    crateCore.position.set(0, 0.28, 0);
    pickupGroup.add(crateCore);

    arenaGroup.add(pickupGroup);
    pickupMeshes.push(pickupGroup);
  }

  // 7. Enemy Spawn Locations around perimeter and central lanes
  const spawnPoints = [
    { x: 0, y: 0, z: 6.2 },
    { x: -4.8, y: 0, z: 5.5 },
    { x: 4.8, y: 0, z: 5.5 },
    { x: -15, y: 0, z: -15 },
    { x: 15, y: 0, z: -15 },
    { x: 0, y: 0, z: -17 },
    { x: -17, y: 0, z: -6 },
    { x: 17, y: 0, z: -6 },
    { x: -15, y: 0, z: 15 },
    { x: 15, y: 0, z: 15 },
  ];

  return {
    arenaGroup,
    shootableMeshes,
    colliders,
    ramps,
    initialPickups,
    pickupMeshes,
    spawnPoints,
  };
}

/**
 * Builds a low-poly humanoid Enemy Bot mesh (`THREE.Group` of 9 distinct parts + grounding shadow + attack telegraph ring).
 */
export function buildEnemyBotMesh(
  botId: number,
  archetype: EnemyArchetype
): EnemyMeshRig {
  const root = new THREE.Group();
  root.name = `EnemyBot_${botId}`;

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Archetype-distinct low-poly color scheme
  const primaryColor =
    archetype === 'rusher'
      ? 0xd93829 // Aggressive crimson
      : archetype === 'ranger'
      ? 0xd97706 // Tactical amber-orange
      : 0x991b1b; // Heavy dark blood-red armor

  const chassisColor =
    archetype === 'enforcer' ? 0x1e2229 : 0x2b313c;

  const visorColor =
    archetype === 'ranger' ? 0x38bdf8 : 0xffaa00;

  const matPrimary = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.45,
    metalness: 0.45,
    flatShading: true,
  });

  const matChassis = new THREE.MeshStandardMaterial({
    color: chassisColor,
    roughness: 0.6,
    metalness: 0.55,
    flatShading: true,
  });

  const matVisor = new THREE.MeshStandardMaterial({
    color: visorColor,
    emissive: visorColor,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.2,
    flatShading: true,
  });

  const hitMaterials = [matPrimary, matChassis];
  const baseColors = [primaryColor, chassisColor];

  const scaleMult =
    archetype === 'enforcer' ? 1.16 : archetype === 'rusher' ? 0.94 : 1.0;
  bodyPivot.scale.setScalar(scaleMult);

  const tagHitbox = (mesh: THREE.Mesh, isHead = false) => {
    mesh.userData.enemyId = botId;
    mesh.userData.isHead = isHead;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  };

  // 1. Torso & 2. Chest Plate
  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.68, 0.34),
    matChassis
  );
  torsoMesh.position.set(0, 1.08, 0);
  tagHitbox(torsoMesh, false);
  bodyPivot.add(torsoMesh);

  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.42, 0.38),
    matPrimary
  );
  chestPlate.position.set(0, 1.16, 0.02);
  tagHitbox(chestPlate, false);
  bodyPivot.add(chestPlate);

  // 3. Geometric Head & 4. Glowing Visor
  const headMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.38, 0.38),
    matPrimary
  );
  headMesh.position.set(0, 1.66, 0);
  tagHitbox(headMesh, true);
  bodyPivot.add(headMesh);

  const visorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.12, 0.08),
    matVisor
  );
  visorMesh.position.set(0, 1.67, 0.18);
  tagHitbox(visorMesh, true);
  bodyPivot.add(visorMesh);

  // 5. Left & 6. Right Articulated Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.38, 1.34, 0);
  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.62, 0.2),
    matPrimary
  );
  leftArm.position.set(0, -0.24, 0);
  tagHitbox(leftArm, false);
  leftArmPivot.add(leftArm);
  bodyPivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.38, 1.34, 0);
  const rightArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.62, 0.2),
    matPrimary
  );
  rightArm.position.set(0, -0.24, 0.1);
  tagHitbox(rightArm, false);
  rightArmPivot.add(rightArm);
  bodyPivot.add(rightArmPivot);

  // 7. Left & 8. Right Articulated Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, 0.72, 0);
  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.72, 0.24),
    matChassis
  );
  leftLeg.position.set(0, -0.36, 0);
  tagHitbox(leftLeg, false);
  leftLegPivot.add(leftLeg);
  bodyPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.16, 0.72, 0);
  const rightLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.72, 0.24),
    matChassis
  );
  rightLeg.position.set(0, -0.36, 0);
  tagHitbox(rightLeg, false);
  rightLegPivot.add(rightLeg);
  bodyPivot.add(rightLegPivot);

  // 9. Grounding Contact Shadow Disc
  const shadowGeom = new THREE.CircleGeometry(0.58, 12);
  shadowGeom.rotateX(-Math.PI * 0.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070a,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.position.set(0, 0.02, 0);
  root.add(shadowMesh);

  // 10. Windup Attack Telegraph Ring (visible warning when bot prepares to strike/fire)
  const ringGeom = new THREE.RingGeometry(0.62, 0.78, 16);
  ringGeom.rotateX(-Math.PI * 0.5);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff4500,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(ringGeom, ringMat);
  telegraphRing.position.set(0, 0.035, 0);
  telegraphRing.visible = false;
  root.add(telegraphRing);

  return {
    root,
    bodyPivot,
    headMesh,
    visorMesh,
    torsoMesh,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    telegraphRing,
    hitMaterials,
    baseColors,
  };
}

/**
 * Updates an EnemyMeshRig's pose each frame (walking gait, hit flash, windup telegraph, and KO topple).
 */
export function updateEnemyMeshRig(
  rig: EnemyMeshRig,
  bot: EnemyBotState
): void {
  rig.root.position.set(bot.x, bot.y, bot.z);
  rig.root.rotation.y = bot.yaw;

  // Hit flash white emissive response
  const isFlashing = bot.hitFlashTimer > 0;
  for (let i = 0; i < rig.hitMaterials.length; i++) {
    const mat = rig.hitMaterials[i];
    if (isFlashing) {
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 0.75;
    } else if (bot.attackState === 'windup') {
      mat.emissive.setHex(0xff3300);
      mat.emissiveIntensity = 0.35;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }

  // Telegraph ring visibility
  if (bot.alive && bot.attackState === 'windup') {
    rig.telegraphRing.visible = true;
    const pulse = 1 + Math.sin(bot.attackTimer * 22) * 0.15;
    rig.telegraphRing.scale.setScalar(pulse);
  } else {
    rig.telegraphRing.visible = false;
  }

  // KO topple animation when defeated
  if (!bot.alive) {
    const koProgress = 1 - Math.max(0, bot.koTimer / 0.42);
    rig.bodyPivot.rotation.x = -koProgress * (Math.PI * 0.48);
    rig.bodyPivot.position.y = -koProgress * 0.35;
    return;
  }

  // Stagger tilt when hit
  const staggerTilt = bot.staggerTimer > 0 ? -0.22 * (bot.staggerTimer / 0.14) : 0;
  rig.bodyPivot.rotation.x = staggerTilt;
  rig.bodyPivot.position.y = Math.abs(Math.sin(bot.walkPhase)) * 0.04;

  // Walking limb swing
  const speed = Math.hypot(bot.vx, bot.vz);
  const swingAmp = Math.min(speed / 5.0, 1.0) * 0.65;
  const legSwing = Math.sin(bot.walkPhase) * swingAmp;

  rig.leftLegPivot.rotation.x = legSwing;
  rig.rightLegPivot.rotation.x = -legSwing;

  if (bot.attackState === 'windup') {
    // Raise weapon arm during attack telegraph
    rig.rightArmPivot.rotation.x = -1.35;
    rig.leftArmPivot.rotation.x = -0.85;
  } else {
    rig.leftArmPivot.rotation.x = -legSwing * 0.7;
    rig.rightArmPivot.rotation.x = -0.55 + legSwing * 0.35;
  }
}
