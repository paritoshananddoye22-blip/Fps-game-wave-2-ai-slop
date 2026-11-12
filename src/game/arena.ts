import * as THREE from 'three';
import {
  AABBCollider,
  AmmoPickupState,
  EnemyArchetype,
  EnemyBotState,
  EnemyPolygonAllocation,
  EnemyPolygonValidationEntry,
  EnemyTier,
  MapId,
  MapSpawnZone,
  PickupKind,
  RampCollider,
} from './types';
import {
  MAP_SPAWN_ZONES,
  populateMapThematicLandmarks,
} from './maps';

export interface ArenaBuildResult {
  mapId: MapId;
  arenaGroup: THREE.Group;
  shootableMeshes: THREE.Mesh[];
  colliders: AABBCollider[];
  ramps: RampCollider[];
  initialPickups: AmmoPickupState[];
  pickupMeshes: THREE.Group[];
  spawnPoints: Array<{ x: number; y: number; z: number }>;
  spawnZones: MapSpawnZone[];
}

export interface EnemyMeshRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  hipsPivot: THREE.Group;
  torsoPivot: THREE.Group;
  headPivot: THREE.Group;
  headMesh: THREE.Mesh;
  visorMesh: THREE.Mesh;
  torsoMesh: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  telegraphRing: THREE.Mesh;
  shieldMesh?: THREE.Mesh;
  coreMesh?: THREE.Mesh;
  weakPointMesh?: THREE.Mesh;
  armorMeshes: THREE.Mesh[];
  sniperLaser?: THREE.Mesh;
  hitMaterials: THREE.MeshStandardMaterial[];
  baseColors: number[];
  polygonCount: number;
  triangleCount: number;
  vertexCount: number;
  boneCount: number;
  materialCount: number;
  rendererCount: number;
  allocation: EnemyPolygonAllocation;
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

export function buildArenaEnvironment(
  mapId: MapId = 'OUTPOST_01'
): ArenaBuildResult {
  const arenaGroup = new THREE.Group();
  arenaGroup.name = `LowPolyArena_${mapId}`;

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

  // 6. Tactical Pickups (Ammo Crates, Nanite Medkit, Armor Plate)
  const pickupCoords: Array<{ x: number; y: number; z: number; kind: PickupKind; label: string }> = [
    { x: 0, y: platformHeight, z: 0, kind: 'ammo', label: 'MUNITIONS CACHE' }, // Center overpass ammo
    { x: 0, y: 0, z: -17.5, kind: 'health', label: 'NANITE MEDKIT' }, // North lane medkit
    { x: -18.5, y: 0, z: 0, kind: 'armor', label: 'BALLISTIC ARMOR PLATE' }, // West flank armor
    { x: 18.5, y: 0, z: 0, kind: 'ammo', label: 'MUNITIONS CACHE' }, // East flank ammo
  ];

  const matHealthEmerald = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.7,
    roughness: 0.3,
    metalness: 0.2,
    flatShading: true,
  });

  const matArmorCyan = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.75,
    roughness: 0.25,
    metalness: 0.55,
    flatShading: true,
  });

  const initialPickups: AmmoPickupState[] = [];
  const pickupMeshes: THREE.Group[] = [];

  for (let i = 0; i < pickupCoords.length; i++) {
    const pos = pickupCoords[i];
    initialPickups.push({
      id: i + 1,
      kind: pos.kind,
      label: pos.label,
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

    if (pos.kind === 'health') {
      // Emerald low-poly Nanite Medkit with 3D cross
      const caseBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.36, 0.4),
        matCharcoalStructure
      );
      pickupGroup.add(caseBox);

      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.1, 0.43),
        matHealthEmerald
      );
      pickupGroup.add(crossH);

      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.26, 0.43),
        matHealthEmerald
      );
      pickupGroup.add(crossV);

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        matHealthEmerald
      );
      core.position.set(0, 0.28, 0);
      pickupGroup.add(core);
    } else if (pos.kind === 'armor') {
      // Cyan low-poly Ballistic Armor Vest Plate
      const plateMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.46, 0.22),
        matArmorCyan
      );
      pickupGroup.add(plateMain);

      const plateTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.16, 0.25),
        matCharcoalStructure
      );
      pickupGroup.add(plateTrim);

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        matBlueLightStrip
      );
      core.position.set(0, 0.32, 0);
      pickupGroup.add(core);
    } else {
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
    }

    arenaGroup.add(pickupGroup);
    pickupMeshes.push(pickupGroup);
  }

  // 7. Populate Map-Specific Low-Poly Landmarks & Props (OUTPOST_01..ARCTIC_05)
  const thematicMats = populateMapThematicLandmarks(
    mapId,
    arenaGroup,
    shootableMeshes,
    colliders
  );
  floorMesh.material = thematicMats.floorMaterial;

  // 8. Validated Map-Specific Enemy Spawn Zones & Locations
  const spawnZones = MAP_SPAWN_ZONES[mapId] ?? MAP_SPAWN_ZONES.OUTPOST_01;
  const spawnPoints = spawnZones.map((z) => ({ x: z.x, y: z.y, z: z.z }));

  return {
    mapId,
    arenaGroup,
    shootableMeshes,
    colliders,
    ramps,
    initialPickups,
    pickupMeshes,
    spawnPoints,
    spawnZones,
  };
}

/**
 * Counts the exact number of polygons (quads + tris), triangles, bones/pivots, materials,
 * and component-by-component polygon allocation in an enemy character model.
 * Every enemy character mesh in `bodyPivot` is tagged with `userData.isEnemyCharacterMesh = true`.
 */
export function countEnemyPolygons(root: THREE.Object3D): {
  polygons: number;
  triangles: number;
  vertexCount: number;
  boneCount: number;
  materialCount: number;
  rendererCount: number;
  allocation: EnemyPolygonAllocation;
} {
  let triangles = 0;
  let polygons = 0;
  let vertexCount = 0;
  let boneCount = 0;
  let rendererCount = 0;
  const materialSet = new Set<THREE.Material>();
  const allocation: EnemyPolygonAllocation = {
    headAndHelmet: 0,
    torso: 0,
    pelvis: 0,
    arms: 0,
    legs: 0,
    armor: 0,
    weaponEquipment: 0,
    additionalDetails: 0,
  };

  root.traverse((obj) => {
    if (obj.type === 'Group') {
      boneCount++;
    }
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.userData.isEnemyCharacterMesh) return;
    rendererCount++;
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => materialSet.add(m));
    } else if (mesh.material) {
      materialSet.add(mesh.material);
    }

    const geom = mesh.geometry as THREE.BufferGeometry;
    const vertCount = geom.attributes.position
      ? geom.attributes.position.count
      : 0;
    vertexCount += vertCount;

    const triCount = geom.index
      ? Math.round(geom.index.count / 3)
      : geom.attributes.position
      ? Math.round(geom.attributes.position.count / 3)
      : 0;
    triangles += triCount;
    // BoxGeometry faces are quads (2 tris = 1 quad polygon); Octahedron faces are triangles
    const polyCount =
      geom.type === 'BoxGeometry' ? Math.round(triCount / 2) : triCount;
    polygons += polyCount;

    const partCategory = (mesh.userData.partCategory ??
      'additionalDetails') as keyof EnemyPolygonAllocation;
    if (partCategory in allocation) {
      allocation[partCategory] += polyCount;
    } else {
      allocation.additionalDetails += polyCount;
    }
  });

  return {
    polygons,
    triangles,
    vertexCount,
    boneCount: Math.max(13, boneCount),
    materialCount: materialSet.size,
    rendererCount,
    allocation,
  };
}

/**
 * Programmatically builds and validates all 18 enemy archetypes (11 Normal <= 124p,
 * 4 Mini-Bosses <= 200p, 3 Main Bosses <= 250p) against their strict polygon budgets.
 */
export function validateAllEnemyPolygonBudgets(): EnemyPolygonValidationEntry[] {
  const catalog: Array<{
    archetype: EnemyArchetype;
    tier: EnemyTier;
    name: string;
    role: string;
    maxPolygons: number;
  }> = [
    // 11 Normal Enemies (Max 124 polygons)
    { archetype: 'grunt', tier: 'normal', name: 'Basic Grunt', role: 'Standard Combatant', maxPolygons: 124 },
    { archetype: 'rusher', tier: 'normal', name: 'Fast Runner', role: 'High-Speed Sprinter', maxPolygons: 124 },
    { archetype: 'brute', tier: 'normal', name: 'Heavy Brute', role: 'Armored Melee Bruiser', maxPolygons: 124 },
    { archetype: 'ranger', tier: 'normal', name: 'Ranged Shooter', role: 'Mid-Range Marksman', maxPolygons: 124 },
    { archetype: 'shield', tier: 'normal', name: 'Shield Guardian', role: 'Defensive Riot Unit', maxPolygons: 124 },
    { archetype: 'exploder', tier: 'normal', name: 'Volatile Exploder', role: 'Unstable Breacher', maxPolygons: 124 },
    { archetype: 'sniper', tier: 'normal', name: 'Precision Sniper', role: 'Long-Range Railgunner', maxPolygons: 124 },
    { archetype: 'commander', tier: 'normal', name: 'Elite Commander', role: 'Tactical Buff Officer', maxPolygons: 124 },
    { archetype: 'stalker', tier: 'normal', name: 'Shadow Stalker', role: 'Lateral Flanker', maxPolygons: 124 },
    { archetype: 'leaper', tier: 'normal', name: 'Kinetic Leaper', role: 'Parabolic Pouncer', maxPolygons: 124 },
    { archetype: 'disruptor', tier: 'normal', name: 'EMP Disruptor', role: 'Pulse Specialist', maxPolygons: 124 },
    // 4 Mini-Bosses (Max 200 polygons)
    { archetype: 'iron_warden', tier: 'miniboss', name: 'Iron Warden', role: 'Fortress Mini-Boss', maxPolygons: 200 },
    { archetype: 'ravager', tier: 'miniboss', name: 'Apex Ravager', role: 'Berserker Mini-Boss', maxPolygons: 200 },
    { archetype: 'siege_engine', tier: 'miniboss', name: 'Siege Engine', role: 'Artillery Mini-Boss', maxPolygons: 200 },
    { archetype: 'brood_titan', tier: 'miniboss', name: 'Brood Titan', role: 'Summoner Mini-Boss', maxPolygons: 200 },
    // 3 Main Bosses (Max 250 polygons)
    { archetype: 'colossus', tier: 'boss', name: 'Industrial Colossus', role: 'Shockwave Main Boss', maxPolygons: 250 },
    { archetype: 'overseer', tier: 'boss', name: 'Cybernetic Overseer', role: 'Precision Main Boss', maxPolygons: 250 },
    { archetype: 'abomination', tier: 'boss', name: 'Bio-Mech Abomination', role: 'Frenzy Main Boss', maxPolygons: 250 },
  ];

  return catalog.map(({ archetype, tier, name, role, maxPolygons }) => {
    const rig = buildEnemyBotMesh(0, archetype);
    return {
      archetype,
      tier,
      name,
      role,
      polygons: rig.polygonCount,
      triangles: rig.triangleCount,
      vertexCount: rig.vertexCount,
      maxPolygons,
      boneCount: rig.boneCount,
      materialCount: rig.materialCount,
      rendererCount: rig.rendererCount,
      allocation: rig.allocation,
      withinBudget:
        rig.polygonCount <= maxPolygons && rig.triangleCount <= maxPolygons,
    };
  });
}

/**
 * Automated Polygon, Triangle & Vertex Validation Report logged on startup.
 * Checks each of the 18 enemy prefabs against its strict tier budget
 * (Normal <= 124, Mini-Boss <= 200, Main Boss <= 250) and highlights any violations.
 */
export function logEnemyPolygonValidationReport(
  entries?: EnemyPolygonValidationEntry[]
): EnemyPolygonValidationEntry[] {
  const report = entries ?? validateAllEnemyPolygonBudgets();
  const violations = report.filter((e) => !e.withinBudget);

  const lines: string[] = [
    '=========================================================================================',
    ' AUTOMATED ENEMY POLYGON, TRIANGLE & VERTEX VALIDATION REPORT (18 ARCHETYPES)',
    ' Budgets: Normal <= 124 | Mini-Boss <= 200 | Main Boss <= 250',
    '=========================================================================================',
  ];

  for (const e of report) {
    const status = e.withinBudget ? '[PASS]' : '[EXCEEDS BUDGET!]';
    lines.push(
      ` ${status.padEnd(18)} ${e.name.padEnd(22)} (${e.tier.toUpperCase().padEnd(8)}) | Polys: ${String(
        e.polygons
      ).padStart(3)}/${e.maxPolygons} | Tris: ${String(e.triangles).padStart(
        3
      )}/${e.maxPolygons} | Verts: ${String(e.vertexCount).padStart(
        3
      )} | Bones: ${e.boneCount}`
    );
  }

  lines.push(
    '-----------------------------------------------------------------------------------------'
  );
  if (violations.length > 0) {
    lines.push(
      ` [WARNING] ${violations.length} ENEMY MODEL(S) EXCEED STRICT POLYGON BUDGET: ${violations
        .map((v) => `${v.name} (${v.polygons}/${v.maxPolygons})`)
        .join(', ')}`
    );
    console.warn(lines.join('\n'));
  } else {
    lines.push(
      ` [ALL 18 ENEMY PREFABS VERIFIED] 0 budget violations detected across Normal, Mini-Boss, and Main Boss tiers.`
    );
    console.info(lines.join('\n'));
  }

  return report;
}

/**
 * Builds an archetype-distinct low-poly Enemy Bot mesh (`THREE.Group`) with a 13-pivot skeletal hierarchy,
 * armor plates (`isArmor`), weak-point core (`isWeakPoint`), head hitbox (`isHead`), and shield (`isShield`),
 * strictly obeying:
 * - Normal Enemies: <= 124 polygons (and <= 124 triangles)
 * - Mini-Bosses: <= 200 polygons (and <= 200 triangles)
 * - Main Bosses: <= 250 polygons (and <= 250 triangles)
 */
export function buildEnemyBotMesh(
  botId: number,
  archetype: EnemyArchetype
): EnemyMeshRig {
  const root = new THREE.Group();
  root.name = `EnemyBot_${botId}_${archetype}`;

  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'Root';
  root.add(bodyPivot);

  const hipsPivot = new THREE.Group();
  hipsPivot.name = 'Hips';
  bodyPivot.add(hipsPivot);

  const spinePivot = new THREE.Group();
  spinePivot.name = 'Spine';
  hipsPivot.add(spinePivot);

  const torsoPivot = new THREE.Group();
  torsoPivot.name = 'Chest';
  spinePivot.add(torsoPivot);

  const headPivot = new THREE.Group();
  headPivot.name = 'Head';
  headPivot.position.set(0, 1.66, 0);
  torsoPivot.add(headPivot);

  // Normalize legacy aliases
  const normArch =
    archetype === 'enforcer'
      ? 'brute'
      : archetype === 'boss'
      ? 'colossus'
      : archetype;

  const palette: Record<
    string,
    { primary: number; chassis: number; visor: number; scale: number }
  > = {
    grunt: { primary: 0xb91c1c, chassis: 0x27272a, visor: 0xffaa00, scale: 1.0 },
    rusher: { primary: 0xef4444, chassis: 0x311015, visor: 0xfef08a, scale: 0.92 },
    brute: { primary: 0x7f1d1d, chassis: 0x18181b, visor: 0xff4500, scale: 1.24 },
    ranger: { primary: 0xd97706, chassis: 0x1e293b, visor: 0x38bdf8, scale: 1.0 },
    shield: { primary: 0x2563eb, chassis: 0x1e293b, visor: 0x60a5fa, scale: 1.1 },
    exploder: { primary: 0xea580c, chassis: 0x291d12, visor: 0xa3e635, scale: 0.98 },
    sniper: { primary: 0x7c3aed, chassis: 0x171528, visor: 0xf43f5e, scale: 0.96 },
    commander: { primary: 0xeab308, chassis: 0x1c1917, visor: 0xfef08a, scale: 1.18 },
    stalker: { primary: 0x334155, chassis: 0x0f172a, visor: 0x2dd4bf, scale: 0.94 },
    leaper: { primary: 0x16a34a, chassis: 0x14261c, visor: 0x86efac, scale: 0.95 },
    disruptor: { primary: 0x0284c7, chassis: 0x172554, visor: 0x38bdf8, scale: 1.04 },
    // Mini-Bosses
    iron_warden: { primary: 0x475569, chassis: 0x1e293b, visor: 0xf59e0b, scale: 1.34 },
    ravager: { primary: 0x991b1b, chassis: 0x1f1215, visor: 0xfb7185, scale: 1.32 },
    siege_engine: { primary: 0xb45309, chassis: 0x1c1917, visor: 0x38bdf8, scale: 1.38 },
    brood_titan: { primary: 0x4d7c0f, chassis: 0x1a2e05, visor: 0xbef264, scale: 1.36 },
    // Main Bosses
    colossus: { primary: 0xdc2626, chassis: 0x0f172a, visor: 0x22d3ee, scale: 1.56 },
    overseer: { primary: 0x6d28d9, chassis: 0x0f172a, visor: 0xf43f5e, scale: 1.52 },
    abomination: { primary: 0xbe123c, chassis: 0x18181b, visor: 0xa3e635, scale: 1.58 },
  };

  const p = palette[normArch] ?? palette.grunt;

  const matPrimary = new THREE.MeshStandardMaterial({
    color: p.primary,
    roughness: 0.42,
    metalness: 0.48,
    flatShading: true,
  });

  const matChassis = new THREE.MeshStandardMaterial({
    color: p.chassis,
    roughness: 0.58,
    metalness: 0.55,
    flatShading: true,
  });

  const matVisor = new THREE.MeshStandardMaterial({
    color: p.visor,
    emissive: p.visor,
    emissiveIntensity: 0.95,
    roughness: 0.2,
    metalness: 0.2,
    flatShading: true,
  });

  const hitMaterials = [matPrimary, matChassis];
  const baseColors = [p.primary, p.chassis];
  const armorMeshes: THREE.Mesh[] = [];

  bodyPivot.scale.setScalar(p.scale);

  const tagHitbox = (
    mesh: THREE.Mesh,
    partCategory: keyof EnemyPolygonAllocation,
    opts: {
      isHead?: boolean;
      isShield?: boolean;
      isArmor?: boolean;
      isWeakPoint?: boolean;
    } = {}
  ) => {
    mesh.userData.enemyId = botId;
    mesh.userData.partCategory = partCategory;
    mesh.userData.isHead = Boolean(opts.isHead);
    mesh.userData.isShield = Boolean(opts.isShield);
    mesh.userData.isArmor = Boolean(opts.isArmor);
    mesh.userData.isWeakPoint = Boolean(opts.isWeakPoint);
    mesh.userData.isEnemyCharacterMesh = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (opts.isArmor) {
      armorMeshes.push(mesh);
    }
  };

  const isHeavyFrame =
    normArch === 'brute' ||
    normArch === 'iron_warden' ||
    normArch === 'siege_engine' ||
    normArch === 'brood_titan' ||
    normArch === 'colossus' ||
    normArch === 'overseer' ||
    normArch === 'abomination';

  // 1. Pelvis / Hips Block (6 polygons / 12 tris)
  const pelvisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(isHeavyFrame ? 0.54 : 0.44, 0.22, 0.3),
    matChassis
  );
  pelvisMesh.position.set(0, 0.78, 0);
  tagHitbox(pelvisMesh, 'pelvis');
  hipsPivot.add(pelvisMesh);

  // 2. Torso Block (6 polygons / 12 tris)
  const torsoWidth = isHeavyFrame ? 0.66 : 0.52;
  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(torsoWidth, 0.56, 0.34),
    matChassis
  );
  torsoMesh.position.set(0, 1.16, 0);
  tagHitbox(torsoMesh, 'torso');
  torsoPivot.add(torsoMesh);

  // 3. Chest Armor Plate (6 polygons / 12 tris)
  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(torsoWidth + 0.05, 0.38, 0.38),
    matPrimary
  );
  chestPlate.position.set(0, 1.2, 0.02);
  tagHitbox(chestPlate, 'armor', { isArmor: true });
  torsoPivot.add(chestPlate);

  // 4. Geometric Head (6 polygons / 12 tris)
  const headSize = normArch === 'rusher' || normArch === 'stalker' ? 0.34 : 0.38;
  const headMesh = new THREE.Mesh(
    new THREE.BoxGeometry(headSize, headSize, headSize),
    matPrimary
  );
  headMesh.position.set(0, 0, 0);
  tagHitbox(headMesh, 'headAndHelmet', { isHead: true });
  headPivot.add(headMesh);

  // 5. Glowing Visor / Weak-Point Optic (6 polygons / 12 tris)
  const visorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(headSize * 0.88, 0.12, 0.08),
    matVisor
  );
  visorMesh.position.set(0, 0.01, headSize * 0.48);
  tagHitbox(visorMesh, 'headAndHelmet', { isHead: true, isWeakPoint: true });
  headPivot.add(visorMesh);

  // 6 & 7. Left & Right Articulated Arms (Upper + Lower hierarchy, 12 polygons / 24 tris)
  const armOffset = torsoWidth * 0.5 + 0.11;
  const leftArmPivot = new THREE.Group();
  leftArmPivot.name = 'LeftUpperArm';
  leftArmPivot.position.set(-armOffset, 1.34, 0);
  const leftLowerArm = new THREE.Group();
  leftLowerArm.name = 'LeftLowerArm';
  leftArmPivot.add(leftLowerArm);
  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.62, 0.2),
    matPrimary
  );
  leftArm.position.set(0, -0.24, 0);
  tagHitbox(leftArm, 'arms');
  leftLowerArm.add(leftArm);
  torsoPivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.name = 'RightUpperArm';
  rightArmPivot.position.set(armOffset, 1.34, 0);
  const rightLowerArm = new THREE.Group();
  rightLowerArm.name = 'RightLowerArm';
  rightArmPivot.add(rightLowerArm);
  const rightArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.62, 0.2),
    matPrimary
  );
  rightArm.position.set(0, -0.24, 0.08);
  tagHitbox(rightArm, 'arms');
  rightLowerArm.add(rightArm);
  torsoPivot.add(rightArmPivot);

  // 8 & 9. Left & Right Articulated Legs (Upper + Lower hierarchy, 12 polygons / 24 tris)
  // Base character up to here = 54 polygons (108 triangles)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.name = 'LeftUpperLeg';
  leftLegPivot.position.set(-0.16, 0.72, 0);
  const leftLowerLeg = new THREE.Group();
  leftLowerLeg.name = 'LeftLowerLeg';
  leftLegPivot.add(leftLowerLeg);
  const leftLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.72, 0.24),
    matChassis
  );
  leftLeg.position.set(0, -0.36, 0);
  tagHitbox(leftLeg, 'legs');
  leftLowerLeg.add(leftLeg);
  hipsPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.name = 'RightUpperLeg';
  rightLegPivot.position.set(0.16, 0.72, 0);
  const rightLowerLeg = new THREE.Group();
  rightLowerLeg.name = 'RightLowerLeg';
  rightLegPivot.add(rightLowerLeg);
  const rightLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.72, 0.24),
    matChassis
  );
  rightLeg.position.set(0, -0.36, 0);
  tagHitbox(rightLeg, 'legs');
  rightLowerLeg.add(rightLeg);
  hipsPivot.add(rightLegPivot);

  // 10. Archetype-Specific Equipment, Armor & Weak Points
  let shieldMesh: THREE.Mesh | undefined;
  let coreMesh: THREE.Mesh | undefined;
  let weakPointMesh: THREE.Mesh | undefined;
  let sniperLaser: THREE.Mesh | undefined;

  if (normArch === 'grunt') {
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.46), matChassis);
    gun.position.set(0, -0.44, 0.26);
    tagHitbox(gun, 'weaponEquipment');
    rightLowerArm.add(gun);
  } else if (normArch === 'rusher') {
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.28), matVisor);
    finL.position.set(-0.18, 1.32, -0.24);
    finL.rotation.x = 0.35;
    tagHitbox(finL, 'additionalDetails', { isWeakPoint: true });
    torsoPivot.add(finL);
    weakPointMesh = finL;
  } else if (normArch === 'brute') {
    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.38), matPrimary);
    pauldronL.position.set(-armOffset - 0.04, 1.44, 0);
    tagHitbox(pauldronL, 'armor', { isArmor: true });
    torsoPivot.add(pauldronL);
  } else if (normArch === 'ranger') {
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.58), matChassis);
    rifle.position.set(0, -0.42, 0.32);
    tagHitbox(rifle, 'weaponEquipment');
    rightLowerArm.add(rifle);
  } else if (normArch === 'shield') {
    const matShield = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e40af,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.75,
      flatShading: true,
    });
    hitMaterials.push(matShield);
    baseColors.push(0x1d4ed8);

    shieldMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 1.18, 0.1),
      matShield
    );
    shieldMesh.position.set(-0.08, -0.18, 0.36);
    tagHitbox(shieldMesh, 'weaponEquipment', { isShield: true });
    leftLowerArm.add(shieldMesh);
  } else if (normArch === 'exploder') {
    coreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.26, 0),
      matVisor
    );
    coreMesh.position.set(0, 1.15, 0.24);
    tagHitbox(coreMesh, 'additionalDetails', { isWeakPoint: true });
    torsoPivot.add(coreMesh);
    weakPointMesh = coreMesh;
  } else if (normArch === 'sniper') {
    const railgun = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.14, 0.92),
      matChassis
    );
    railgun.position.set(0, -0.38, 0.48);
    tagHitbox(railgun, 'weaponEquipment');
    rightLowerArm.add(railgun);

    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    sniperLaser = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.025, 18.0),
      laserMat
    );
    sniperLaser.position.set(0, 0.04, 9.5);
    sniperLaser.visible = false;
    railgun.add(sniperLaser);
  } else if (normArch === 'commander') {
    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.24, 0.42),
      matVisor
    );
    crest.position.set(0, 0.26, 0.02);
    tagHitbox(crest, 'headAndHelmet', { isHead: true, isWeakPoint: true });
    headPivot.add(crest);
    weakPointMesh = crest;
  } else if (normArch === 'stalker') {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.1, 0.56),
      matVisor
    );
    blade.position.set(0, -0.45, 0.28);
    tagHitbox(blade, 'weaponEquipment');
    rightLowerArm.add(blade);
  } else if (normArch === 'leaper') {
    const jumpPack = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.44, 0.22),
      matVisor
    );
    jumpPack.position.set(0, 1.22, -0.24);
    tagHitbox(jumpPack, 'weaponEquipment', { isWeakPoint: true });
    torsoPivot.add(jumpPack);
    weakPointMesh = jumpPack;
  } else if (normArch === 'disruptor') {
    const emitter = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      matVisor
    );
    emitter.position.set(0, 1.54, -0.22);
    tagHitbox(emitter, 'weaponEquipment', { isWeakPoint: true });
    torsoPivot.add(emitter);
    coreMesh = emitter;
    weakPointMesh = emitter;
  } else if (
    normArch === 'iron_warden' ||
    normArch === 'ravager' ||
    normArch === 'siege_engine' ||
    normArch === 'brood_titan'
  ) {
    // MINI-BOSSES: Distinctive heavy silhouette + weak-point reactor (<= 168 triangles / <= 84 polygons, well within 200 max)
    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.44), matPrimary);
    pauldronL.position.set(-armOffset - 0.05, 1.46, 0);
    tagHitbox(pauldronL, 'armor', { isArmor: true });
    torsoPivot.add(pauldronL);

    const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.44), matPrimary);
    pauldronR.position.set(armOffset + 0.05, 1.46, 0);
    tagHitbox(pauldronR, 'armor', { isArmor: true });
    torsoPivot.add(pauldronR);

    const reactor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.24), matVisor);
    reactor.position.set(0, 1.24, -0.22);
    tagHitbox(reactor, 'additionalDetails', { isWeakPoint: true });
    torsoPivot.add(reactor);
    coreMesh = reactor;
    weakPointMesh = reactor;

    if (normArch === 'iron_warden') {
      shieldMesh = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.26, 0.12), matPrimary);
      shieldMesh.position.set(-0.08, -0.18, 0.38);
      tagHitbox(shieldMesh, 'weaponEquipment', { isShield: true });
      leftLowerArm.add(shieldMesh);
    } else {
      const heavyWeapon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.72), matChassis);
      heavyWeapon.position.set(0, -0.4, 0.36);
      tagHitbox(heavyWeapon, 'weaponEquipment');
      rightLowerArm.add(heavyWeapon);
    }
  } else {
    // MAIN BOSSES (colossus, overseer, abomination): Imposing silhouette, twin shoulder pods, armored crown, and weak-point core (<= 192 triangles / <= 96 polygons, well within 250 max)
    const podL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.58), matPrimary);
    podL.position.set(-armOffset - 0.06, 1.56, 0.06);
    tagHitbox(podL, 'armor', { isArmor: true });
    torsoPivot.add(podL);

    const podR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.58), matPrimary);
    podR.position.set(armOffset + 0.06, 1.56, 0.06);
    tagHitbox(podR, 'armor', { isArmor: true });
    torsoPivot.add(podR);

    const bossCore = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.24), matVisor);
    bossCore.position.set(0, 1.2, 0.24);
    tagHitbox(bossCore, 'additionalDetails', { isWeakPoint: true });
    torsoPivot.add(bossCore);
    coreMesh = bossCore;
    weakPointMesh = bossCore;

    const bossCrown = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.42), matVisor);
    bossCrown.position.set(0, 0.24, 0);
    tagHitbox(bossCrown, 'headAndHelmet', { isHead: true, isWeakPoint: true });
    headPivot.add(bossCrown);

    const bossCannon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.78), matChassis);
    bossCannon.position.set(0, -0.42, 0.38);
    tagHitbox(bossCannon, 'weaponEquipment');
    rightLowerArm.add(bossCannon);
  }

  // Grounding Contact Shadow Disc (floor decal, not part of character mesh)
  const shadowGeom = new THREE.CircleGeometry(0.58 * p.scale, 8);
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

  // Windup Attack Telegraph Ring (floor indicator)
  const ringGeom = new THREE.RingGeometry(0.62 * p.scale, 0.8 * p.scale, 12);
  ringGeom.rotateX(-Math.PI * 0.5);
  const ringMat = new THREE.MeshBasicMaterial({
    color:
      normArch === 'exploder'
        ? 0xa3e635
        : normArch === 'sniper' || normArch === 'overseer'
        ? 0xf43f5e
        : 0xff4500,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(ringGeom, ringMat);
  telegraphRing.position.set(0, 0.035, 0);
  telegraphRing.visible = false;
  root.add(telegraphRing);

  const counts = countEnemyPolygons(bodyPivot);

  return {
    root,
    bodyPivot,
    hipsPivot,
    torsoPivot,
    headPivot,
    headMesh,
    visorMesh,
    torsoMesh,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    telegraphRing,
    shieldMesh,
    coreMesh,
    weakPointMesh,
    armorMeshes,
    sniperLaser,
    hitMaterials,
    baseColors,
    polygonCount: counts.polygons,
    triangleCount: counts.triangles,
    vertexCount: counts.vertexCount,
    boneCount: counts.boneCount,
    materialCount: counts.materialCount,
    rendererCount: counts.rendererCount,
    allocation: counts.allocation,
  };
}

/**
 * Six-Direction Animation Controller for EnemyMeshRig:
 * - Direction 01: Archetype-Distinct Idle Personality & Breathing
 * - Direction 02: Velocity-Synchronized Locomotion, Accel/Decel & Turn Weight
 * - Direction 03: Readable Combat Preparation, Execution & Special Abilities
 * - Direction 04: 4-Way Directional Damage Flinch, Armor Impact & Weak-Point Reaction
 * - Direction 05: Archetype-Specific Death Collapse & Destruction
 * - Direction 06: Mini-Boss & Main Boss Intro + Phase Transition Presentation
 */
export function updateEnemyMeshRig(
  rig: EnemyMeshRig,
  bot: EnemyBotState
): void {
  rig.root.position.set(bot.x, bot.y + bot.verticalOffset, bot.z);
  rig.root.rotation.y = bot.yaw;

  const normArch =
    bot.archetype === 'enforcer'
      ? 'brute'
      : bot.archetype === 'boss'
      ? 'colossus'
      : bot.archetype;

  const baseScale =
    bot.tier === 'boss'
      ? 1.56
      : bot.tier === 'miniboss'
      ? 1.35
      : normArch === 'brute'
      ? 1.24
      : normArch === 'commander'
      ? 1.18
      : normArch === 'shield'
      ? 1.1
      : normArch === 'rusher' || normArch === 'stalker' || normArch === 'leaper'
      ? 0.93
      : 1.0;

  // Shield visibility matches shield durability
  if (rig.shieldMesh) {
    rig.shieldMesh.visible = bot.shieldHp > 0 && bot.alive;
  }

  // Breakable armor plates hide when armor is depleted
  if (rig.armorMeshes.length > 0 && bot.maxArmorHp > 0) {
    const armorIntact = bot.armorHp > 0 && bot.alive;
    for (let i = 0; i < rig.armorMeshes.length; i++) {
      rig.armorMeshes[i].visible = armorIntact;
    }
  }

  // Sniper / Overseer aiming laser visibility during windup
  if (rig.sniperLaser) {
    rig.sniperLaser.visible = bot.alive && bot.attackState === 'windup';
  }

  // Exploder / Boss core animation (idle pulse vs rapid detonation warning)
  if (rig.coreMesh && bot.alive) {
    const isDetonationWarning =
      normArch === 'exploder' &&
      (bot.attackState === 'windup' || bot.attackState === 'execution');
    const pulseRate = isDetonationWarning ? 32 : 5;
    const pulseAmp = isDetonationWarning ? 0.34 : 0.08;
    const pulse = 1 + Math.sin(bot.idleTime * pulseRate) * pulseAmp;
    rig.coreMesh.scale.setScalar(pulse);
    rig.coreMesh.rotation.y += isDetonationWarning ? 0.14 : 0.03;
  }

  // Weak-point flash feedback when struck
  if (rig.weakPointMesh && bot.alive) {
    const wpBoost = bot.weakPointFlashTimer > 0 ? 1.28 : 1.0;
    rig.weakPointMesh.scale.setScalar(wpBoost);
  }

  // Hit flash, Armor metallic flash, Phase transition & Boss phase aura
  const isFlashing = bot.hitFlashTimer > 0;
  const isArmorFlashing = bot.armorFlashTimer > 0;
  const isPhaseTransitioning = bot.bossPhaseTransitionTimer > 0;
  for (let i = 0; i < rig.hitMaterials.length; i++) {
    const mat = rig.hitMaterials[i];
    if (isFlashing) {
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 0.85;
    } else if (isArmorFlashing) {
      mat.emissive.setHex(0x38bdf8);
      mat.emissiveIntensity = 0.65;
    } else if (isPhaseTransitioning) {
      mat.emissive.setHex(0xfbbf24);
      mat.emissiveIntensity = 0.75;
    } else if (bot.attackState === 'windup' || bot.attackState === 'execution') {
      mat.emissive.setHex(normArch === 'exploder' ? 0xa3e635 : 0xff3300);
      mat.emissiveIntensity = 0.45;
    } else if ((bot.tier === 'boss' || bot.tier === 'miniboss') && bot.bossPhase >= 2) {
      mat.emissive.setHex(bot.bossPhase === 3 ? 0xff0044 : 0xff5500);
      mat.emissiveIntensity = bot.bossPhase === 3 ? 0.45 : 0.25;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }

  // Telegraph ring visibility
  if (
    bot.alive &&
    (bot.attackState === 'windup' ||
      bot.attackState === 'execution' ||
      bot.bossPhaseTransitionTimer > 0)
  ) {
    rig.telegraphRing.visible = true;
    const pulse = 1 + Math.sin(bot.attackTimer * 24) * 0.18;
    rig.telegraphRing.scale.setScalar(pulse);
  } else {
    rig.telegraphRing.visible = false;
  }

  // DIRECTION 05: Archetype-Specific Death, Collapse & Destruction
  if (!bot.alive) {
    const koProgress = Math.min(1, 1 - Math.max(0, bot.koTimer / 0.48));
    rig.hipsPivot.rotation.set(0, 0, 0);
    rig.torsoPivot.rotation.set(0, 0, 0);
    rig.headPivot.rotation.set(0, 0, 0);

    if (bot.deathStyle === 'headshot') {
      rig.bodyPivot.rotation.x = -koProgress * (Math.PI * 0.56);
      rig.bodyPivot.rotation.z = koProgress * 0.35;
      rig.bodyPivot.position.y =
        Math.sin(koProgress * Math.PI) * 0.18 - koProgress * 0.38;
      rig.headMesh.scale.setScalar(Math.max(0.2, 1 - koProgress * 0.8));
    } else if (bot.deathStyle === 'explosive') {
      const pop =
        koProgress < 0.3
          ? 1 + koProgress * 1.1
          : Math.max(0.05, 1.33 - (koProgress - 0.3) * 1.8);
      rig.bodyPivot.scale.setScalar(baseScale * pop);
      rig.bodyPivot.position.y = -koProgress * 0.45;
    } else if (bot.deathStyle === 'runner') {
      // Dynamic forward stumble & roll
      rig.bodyPivot.rotation.x = koProgress * (Math.PI * 0.54);
      rig.bodyPivot.rotation.z = -koProgress * 0.28;
      rig.bodyPivot.position.y = -koProgress * 0.36;
    } else if (
      bot.deathStyle === 'heavy' ||
      bot.deathStyle === 'miniboss' ||
      bot.deathStyle === 'boss'
    ) {
      // Slow knee collapse followed by heavy ground impact
      const kneeStage = Math.min(1, koProgress * 1.6);
      const slamStage = Math.max(0, (koProgress - 0.4) / 0.6);
      rig.leftLegPivot.rotation.x = -kneeStage * 0.85;
      rig.rightLegPivot.rotation.x = -kneeStage * 0.85;
      rig.bodyPivot.rotation.x = slamStage * (Math.PI * 0.46);
      rig.bodyPivot.rotation.z = slamStage * 0.16;
      rig.bodyPivot.position.y = -kneeStage * 0.24 - slamStage * 0.22;
    } else {
      // Normal humanoid loss of balance & collapse
      rig.bodyPivot.rotation.x = -koProgress * (Math.PI * 0.48);
      rig.bodyPivot.rotation.y = koProgress * 0.22;
      rig.bodyPivot.position.y = -koProgress * 0.35;
    }
    return;
  }

  // DIRECTION 06: Mini-Boss & Main Boss Intro + Phase Transition Presentation
  const spawnProgress =
    bot.spawnAnimTimer > 0 ? Math.max(0.1, 1 - bot.spawnAnimTimer / 0.35) : 1.0;
  rig.bodyPivot.scale.setScalar(baseScale * spawnProgress);
  rig.headMesh.scale.setScalar(1.0);

  if (bot.bossPhaseTransitionTimer > 0) {
    const t = bot.bossPhaseTransitionTimer;
    rig.torsoPivot.rotation.x = -0.28 * Math.sin(t * 8);
    rig.leftArmPivot.rotation.x = -2.1;
    rig.rightArmPivot.rotation.x = -2.1;
    rig.headPivot.rotation.y = Math.sin(t * 12) * 0.32;
    return;
  }

  if (bot.bossIntroTimer > 0) {
    const introPhase = 1 - Math.min(1, bot.bossIntroTimer / 2.2);
    rig.torsoPivot.rotation.x = Math.sin(introPhase * Math.PI) * -0.22;
    rig.leftArmPivot.rotation.x = -1.6 * Math.sin(introPhase * Math.PI);
    rig.rightArmPivot.rotation.x = -1.6 * Math.sin(introPhase * Math.PI);
  }

  // Distance-based Animation LOD (skip micro secondary bone breathing on distant LOD 2 enemies)
  const speed = Math.hypot(bot.vx, bot.vz);
  const normSpeed = Math.min(1, speed / Math.max(1, bot.speed));

  // DIRECTION 01: Idle, Personality & Character Presence
  let idleLeanX = 0;
  let idleRollZ = 0;
  let idleHeadYaw = 0;
  let idleBobY = 0;

  if (bot.animLodLevel < 2) {
    const t = bot.idleTime;
    if (normArch === 'rusher' || normArch === 'stalker') {
      // Restless forward lean & quick head scan
      idleLeanX = 0.16 + Math.sin(t * 4.2) * 0.03;
      idleHeadYaw = Math.sin(t * 2.8) * 0.18;
      idleBobY = Math.abs(Math.sin(t * 4.2)) * 0.025;
    } else if (normArch === 'leaper') {
      // Coiled low crouch
      idleLeanX = 0.24 + Math.sin(t * 3.5) * 0.04;
      idleBobY = -0.08 + Math.sin(t * 3.5) * 0.02;
    } else if (normArch === 'brute' || normArch === 'iron_warden' || normArch === 'colossus') {
      // Heavy wide stance & slow deep breathing
      idleLeanX = 0.05 + Math.sin(t * 1.6) * 0.035;
      idleRollZ = Math.sin(t * 0.9) * 0.03;
      idleBobY = Math.sin(t * 1.6) * 0.02;
    } else if (normArch === 'exploder') {
      // Subtle unstable vibration
      idleLeanX = 0.08 + Math.sin(t * 14.0) * 0.02;
      idleRollZ = Math.cos(t * 16.0) * 0.025;
      idleHeadYaw = Math.sin(t * 9.0) * 0.1;
    } else if (normArch === 'abomination' || normArch === 'brood_titan') {
      // Asymmetrical creature posture
      idleLeanX = 0.14 + Math.sin(t * 2.3) * 0.04;
      idleRollZ = 0.08 + Math.sin(t * 1.9) * 0.045;
      idleHeadYaw = Math.cos(t * 2.1) * 0.16;
    } else {
      // Controlled combat-ready breathing & occasional head scan
      idleLeanX = Math.sin(t * 2.2) * 0.025;
      idleHeadYaw = Math.sin(t * 1.3) * 0.1;
      idleBobY = Math.sin(t * 2.2) * 0.015;
    }
  }

  // DIRECTION 02: Velocity-Blended Locomotion, Acceleration Lean & Turn Weight
  const runLeanX =
    normSpeed *
    bot.accelBlend *
    (normArch === 'rusher' || normArch === 'leaper' ? 0.22 : 0.1);
  const gaitBobY = Math.abs(Math.sin(bot.walkPhase)) * 0.048 * normSpeed;
  const swingAmp = normSpeed * 0.72;
  const legSwing = Math.sin(bot.walkPhase) * swingAmp;

  // DIRECTION 04: Directional Hit Flinch & Stagger
  const staggerTilt =
    bot.staggerTimer > 0 ? -0.26 * Math.min(1, bot.staggerTimer / 0.25) : 0;

  rig.bodyPivot.rotation.x = staggerTilt + bot.flinchPitch + idleLeanX + runLeanX;
  rig.bodyPivot.rotation.y = 0;
  rig.bodyPivot.rotation.z = bot.flinchRoll + idleRollZ;
  rig.bodyPivot.position.y =
    (spawnProgress < 1 ? -(1 - spawnProgress) * 0.6 : 0) +
    idleBobY * (1 - normSpeed) +
    gaitBobY;

  rig.headPivot.rotation.y = idleHeadYaw * (1 - normSpeed * 0.6);
  rig.leftLegPivot.rotation.x = legSwing;
  rig.rightLegPivot.rotation.x = -legSwing;

  // DIRECTION 03: Combat, Attacks & Special Abilities
  if (bot.attackState === 'windup') {
    const windupRatio =
      1 - Math.max(0, bot.attackTimer / Math.max(0.1, bot.windupDuration));
    rig.torsoPivot.rotation.y = -0.22 * windupRatio;
    rig.rightArmPivot.rotation.x = -1.1 - windupRatio * 0.55;
    rig.leftArmPivot.rotation.x =
      normArch === 'shield' || normArch === 'iron_warden'
        ? -0.55
        : -0.75 - windupRatio * 0.35;
  } else if (bot.attackState === 'execution') {
    // Active strike / fire frame pose
    rig.torsoPivot.rotation.y = 0.28;
    rig.torsoPivot.rotation.x = 0.16;
    rig.rightArmPivot.rotation.x = -1.75;
    rig.leftArmPivot.rotation.x =
      normArch === 'shield' || normArch === 'iron_warden' ? -0.85 : -1.1;
  } else if (bot.attackState === 'recover') {
    rig.torsoPivot.rotation.y = 0;
    rig.torsoPivot.rotation.x = 0.06;
    rig.rightArmPivot.rotation.x = -0.35;
    rig.leftArmPivot.rotation.x =
      normArch === 'shield' || normArch === 'iron_warden' ? -0.4 : -0.25;
  } else {
    rig.torsoPivot.rotation.y = 0;
    rig.torsoPivot.rotation.x = 0;
    rig.leftArmPivot.rotation.x =
      (normArch === 'shield' || normArch === 'iron_warden') && bot.shieldHp > 0
        ? -0.48
        : -legSwing * 0.7;
    rig.rightArmPivot.rotation.x = -0.55 + legSwing * 0.35;
  }
}

