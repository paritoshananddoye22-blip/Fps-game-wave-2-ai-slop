import * as THREE from 'three';
import {
  PlayerLegsPolygonBreakdown,
  PlayerPhysicsState,
  WeaponProceduralState,
} from './types';

export const LEG_TEXTURE_SIZE = 16; // 16x16 low-poly pixel art texture for first-person player legs

export interface SingleLegRig {
  side: 'left' | 'right';
  upperLeg: THREE.Group;
  lowerLeg: THREE.Group;
  foot: THREE.Group;
}

export interface FirstPersonLegsRig {
  root: THREE.Group;
  pelvisPivot: THREE.Group;
  leftLeg: SingleLegRig;
  rightLeg: SingleLegRig;
  breakdown: PlayerLegsPolygonBreakdown;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Generates a deterministic 16x16 RGBA tactical ripstop trouser fabric texture.
 */
let cachedLegFabricTex16: THREE.DataTexture | null = null;
export function getLegFabricTexture16(): THREE.DataTexture {
  if (cachedLegFabricTex16) return cachedLegFabricTex16;
  const size = LEG_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const weave =
        x % 4 === 0 || y % 4 === 0 ? -14 : (x + y) % 2 === 0 ? 6 : -4;
      const seam = x === 0 || x === size - 1 ? -18 : 0;
      const v = clamp(232 + weave + seam, 180, 255);
      data[idx] = v;
      data[idx + 1] = clamp(v + 2, 180, 255);
      data[idx + 2] = clamp(v + 5, 180, 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedLegFabricTex16 = tex;
  return tex;
}

/**
 * Generates a deterministic 16x16 RGBA tactical boot & knee-armor tread texture.
 */
let cachedBootArmorTex16: THREE.DataTexture | null = null;
export function getBootArmorTexture16(): THREE.DataTexture {
  if (cachedBootArmorTex16) return cachedBootArmorTex16;
  const size = LEG_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const tread = y >= 12 ? (x % 2 === 0 ? -24 : 14) : 0;
      const panel =
        (x === 3 || x === 12) && y < 12 ? -16 : ((x * 7 + y * 13) & 7) - 3;
      const v = clamp(228 + tread + panel, 165, 255);
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = clamp(v + 3, 165, 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedBootArmorTex16 = tex;
  return tex;
}

/**
 * Builds an indexed low-poly BufferGeometry with planar UVs and outward normals.
 */
function buildLegGeometry(
  positions: number[][],
  indices: number[],
  mirrorX = 1
): THREE.BufferGeometry {
  const flatPos: number[] = [];
  const flatUvs: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    const [vx, vy, vz] = positions[i];
    const x = vx * mirrorX;
    flatPos.push(x, vy, vz);
    flatUvs.push(x * 3.5 + 0.5, vy * 2.5 + vz * 2.0 + 0.5);
  }
  const finalIndices: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    if (mirrorX < 0) {
      finalIndices.push(indices[i], indices[i + 2], indices[i + 1]);
    } else {
      finalIndices.push(indices[i], indices[i + 1], indices[i + 2]);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(flatPos, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(flatUvs, 2));
  geom.setIndex(finalIndices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a 4-sided tapered limb sleeve extending along -Y from y=0 to y=-length.
 * - `includeTopCap = true`: 8 side triangles + 2 top cap triangles + 2 bottom cap triangles = 12 triangles (6 polygons)
 * - `includeTopCap = false`: 8 side triangles = 8 triangles (4 polygons)
 */
function createLegSleeve(
  wTop: number,
  dTop: number,
  wBot: number,
  dBot: number,
  length: number,
  includeCaps: boolean,
  mirrorX = 1
): THREE.BufferGeometry {
  const htW = wTop * 0.5;
  const htD = dTop * 0.5;
  const hbW = wBot * 0.5;
  const hbD = dBot * 0.5;
  const verts = [
    // Top ring (y = 0)
    [-htW, 0, htD], // 0: front-left
    [htW, 0, htD], // 1: front-right
    [htW, 0, -htD], // 2: back-right
    [-htW, 0, -htD], // 3: back-left
    // Bottom ring (y = -length)
    [-hbW, -length, hbD], // 4: front-left
    [hbW, -length, hbD], // 5: front-right
    [hbW, -length, -hbD], // 6: back-right
    [-hbW, -length, -hbD], // 7: back-left
  ];
  const indices = [
    // 4 sides = 8 triangles (4 quad polygons)
    0, 4, 1, 1, 4, 5,
    1, 5, 2, 2, 5, 6,
    2, 6, 3, 3, 6, 7,
    3, 7, 0, 0, 7, 4,
  ];
  if (includeCaps) {
    // Top cap (2 tris) + Bottom cap (2 tris) = +4 tris (total 12 tris = 6 quad polygons)
    indices.push(0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6);
  }
  return buildLegGeometry(verts, indices, mirrorX);
}

/**
 * Creates a sculpted low-poly tactical combat boot with ankle collar, angled instep,
 * toe box, and flat sole: 8 vertices, 12 triangles (6 quad polygons).
 * Forward direction is -Z (matching camera look direction).
 */
function createTacticalBoot(mirrorX = 1): THREE.BufferGeometry {
  const verts = [
    // Ankle cuff ring (y = 0)
    [-0.056, 0.0, 0.052], // 0: heel-left
    [0.056, 0.0, 0.052], // 1: heel-right
    [0.058, -0.015, -0.145], // 2: instep-toe-right
    [-0.058, -0.015, -0.145], // 3: instep-toe-left
    // Sole ring (y = -0.105)
    [-0.062, -0.105, 0.058], // 4: sole-heel-left
    [0.062, -0.105, 0.058], // 5: sole-heel-right
    [0.064, -0.105, -0.195], // 6: sole-toe-right
    [-0.064, -0.105, -0.195], // 7: sole-toe-left
  ];
  const indices = [
    // Sides & toe slope (8 tris)
    0, 4, 1, 1, 4, 5,
    1, 5, 2, 2, 5, 6,
    2, 6, 3, 3, 6, 7,
    3, 7, 0, 0, 7, 4,
    // Top instep & ankle deck (2 tris) + Sole bottom (2 tris) = 12 tris total
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
  ];
  return buildLegGeometry(verts, indices, mirrorX);
}

/**
 * Creates an angular faceted knee armor pad: 5 vertices, 4 triangles (2 polygons).
 */
function createKneeArmorPad(mirrorX = 1): THREE.BufferGeometry {
  const verts = [
    [-0.056, 0.055, -0.068], // 0: top-left
    [0.056, 0.055, -0.068], // 1: top-right
    [0.052, -0.055, -0.066], // 2: bottom-right
    [-0.052, -0.055, -0.066], // 3: bottom-left
    [0.0, 0.0, -0.092], // 4: forward central armor apex
  ];
  const indices = [
    0, 4, 1,
    1, 4, 2,
    2, 4, 3,
    3, 4, 0,
  ];
  return buildLegGeometry(verts, indices, mirrorX);
}

/**
 * Creates an angular shin guard ridge plate: 4 vertices, 4 triangles (2 polygons).
 */
function createShinGuardPlate(mirrorX = 1): THREE.BufferGeometry {
  const verts = [
    [-0.044, -0.06, -0.062], // 0: top-left
    [0.044, -0.06, -0.062], // 1: top-right
    [0.036, -0.28, -0.056], // 2: bottom-right
    [-0.036, -0.28, -0.056], // 3: bottom-left
    [0.0, -0.17, -0.074], // 4: center ridge
  ];
  const indices = [
    0, 4, 1,
    1, 4, 2,
    2, 4, 3,
    3, 4, 0,
  ];
  return buildLegGeometry(verts, indices, mirrorX);
}

/**
 * Counts the exact triangles and polygons across the First-Person Player Legs Rig
 * and verifies compliance with the strict <= 99 polygon budget.
 */
export function validatePlayerLegsBudget(
  root: THREE.Object3D
): PlayerLegsPolygonBreakdown {
  const breakdown: PlayerLegsPolygonBreakdown = {
    leftUpperLeg: 0,
    leftLowerLeg: 0,
    leftBoot: 0,
    rightUpperLeg: 0,
    rightLowerLeg: 0,
    rightBoot: 0,
    kneeAndArmorDetails: 0,
    pelvisAndAttachments: 0,
    totalPolygons: 0,
    totalTriangles: 0,
    maxPolygons: 99,
    withinBudget: true,
    boneCount: 7,
    textureSize: LEG_TEXTURE_SIZE,
  };

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.userData.isPlayerLegMesh) return;
    const geom = mesh.geometry as THREE.BufferGeometry;
    const tris = geom.index
      ? Math.round(geom.index.count / 3)
      : geom.attributes.position
      ? Math.round(geom.attributes.position.count / 3)
      : 0;
    const cat = mesh.userData.legCategory as keyof Pick<
      PlayerLegsPolygonBreakdown,
      | 'leftUpperLeg'
      | 'leftLowerLeg'
      | 'leftBoot'
      | 'rightUpperLeg'
      | 'rightLowerLeg'
      | 'rightBoot'
      | 'kneeAndArmorDetails'
      | 'pelvisAndAttachments'
    >;
    if (cat && cat in breakdown) {
      breakdown[cat] += tris;
    }
    breakdown.totalTriangles += tris;
  });

  // Every quad face is 2 triangles; we enforce BOTH totalTriangles <= 99 AND totalPolygons <= 99
  breakdown.totalPolygons = breakdown.totalTriangles;
  breakdown.withinBudget =
    breakdown.totalPolygons <= 99 && breakdown.totalTriangles <= 99;
  return breakdown;
}

/**
 * Builds the complete First-Person Player Legs Rig (`<= 99` polygons/triangles total for both legs combined):
 * - Pelvis bridge (8 tris)
 * - Left Upper Leg (12 tris) + Left Lower Leg (8 tris) + Left Tactical Boot (12 tris)
 * - Right Upper Leg (12 tris) + Right Lower Leg (8 tris) + Right Tactical Boot (12 tris)
 * - Left & Right Knee Armor Pads + Shin Guard Plates (16 tris)
 * Total = 88 triangles (strictly <= 99 max budget) with 7-bone hierarchy and 16x16 textures.
 */
export function createFirstPersonLegsRig(): FirstPersonLegsRig {
  const root = new THREE.Group();
  root.name = 'FirstPersonLegsRoot';

  const fabricTex = getLegFabricTexture16();
  const armorTex = getBootArmorTexture16();

  const matTrouser = new THREE.MeshStandardMaterial({
    color: 0x2b3340,
    map: fabricTex,
    roughness: 0.84,
    metalness: 0.12,
    flatShading: true,
  });

  const matKneeArmor = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    map: armorTex,
    roughness: 0.52,
    metalness: 0.42,
    flatShading: true,
  });

  const matBoot = new THREE.MeshStandardMaterial({
    color: 0x1c2026,
    map: armorTex,
    roughness: 0.68,
    metalness: 0.28,
    flatShading: true,
  });

  const matAccent = new THREE.MeshStandardMaterial({
    color: 0xd95f25,
    map: armorTex,
    roughness: 0.48,
    metalness: 0.35,
    flatShading: true,
  });

  const tagLegMesh = (
    mesh: THREE.Mesh,
    legCategory:
      | 'leftUpperLeg'
      | 'leftLowerLeg'
      | 'leftBoot'
      | 'rightUpperLeg'
      | 'rightLowerLeg'
      | 'rightBoot'
      | 'kneeAndArmorDetails'
      | 'pelvisAndAttachments'
  ): THREE.Mesh => {
    mesh.userData.isPlayerLegMesh = true;
    mesh.userData.legCategory = legCategory;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    return mesh;
  };

  // Bone 1: Pelvis Root Pivot (positioned at hip height y = 0.88m, slightly behind camera z = 0.08m
  // so looking down in first-person reveals upper thighs, knees, lower legs, and boots naturally)
  const pelvisPivot = new THREE.Group();
  pelvisPivot.name = 'Pelvis';
  pelvisPivot.position.set(0, 0.88, 0.08);
  root.add(pelvisPivot);

  // Pelvis Tactical Belt Bridge (8 triangles)
  const pelvisBeltMesh = tagLegMesh(
    new THREE.Mesh(
      createLegSleeve(0.32, 0.15, 0.30, 0.14, 0.09, false, 1),
      matKneeArmor
    ),
    'pelvisAndAttachments'
  );
  pelvisBeltMesh.position.set(0, 0.04, 0);
  pelvisPivot.add(pelvisBeltMesh);

  const buildSideLeg = (side: 'left' | 'right'): SingleLegRig => {
    const mirrorX = side === 'left' ? -1 : 1;
    const hipX = 0.115 * mirrorX;

    // Bone 2/5: UpperLeg Pivot
    const upperLeg = new THREE.Group();
    upperLeg.name = side === 'left' ? 'LeftUpperLeg' : 'RightUpperLeg';
    upperLeg.position.set(hipX, 0, 0);
    pelvisPivot.add(upperLeg);

    const thighLen = 0.40;
    const upperMesh = tagLegMesh(
      new THREE.Mesh(
        createLegSleeve(0.145, 0.155, 0.118, 0.125, thighLen, true, mirrorX),
        matTrouser
      ),
      side === 'left' ? 'leftUpperLeg' : 'rightUpperLeg'
    );
    upperLeg.add(upperMesh);

    // Bone 3/6: LowerLeg Pivot (at knee joint y = -thighLen)
    const lowerLeg = new THREE.Group();
    lowerLeg.name = side === 'left' ? 'LeftLowerLeg' : 'RightLowerLeg';
    lowerLeg.position.set(0, -thighLen, 0);
    upperLeg.add(lowerLeg);

    const shinLen = 0.38;
    const lowerMesh = tagLegMesh(
      new THREE.Mesh(
        createLegSleeve(0.114, 0.12, 0.092, 0.098, shinLen, false, mirrorX),
        matTrouser
      ),
      side === 'left' ? 'leftLowerLeg' : 'rightLowerLeg'
    );
    lowerLeg.add(lowerMesh);

    // Faceted Knee Armor Pad (4 tris) + Shin Guard Plate (4 tris) = 8 tris per leg (16 tris both legs)
    const kneePadMesh = tagLegMesh(
      new THREE.Mesh(createKneeArmorPad(mirrorX), matKneeArmor),
      'kneeAndArmorDetails'
    );
    kneePadMesh.position.set(0, 0.01, 0);
    lowerLeg.add(kneePadMesh);

    const shinGuardMesh = tagLegMesh(
      new THREE.Mesh(createShinGuardPlate(mirrorX), matAccent),
      'kneeAndArmorDetails'
    );
    lowerLeg.add(shinGuardMesh);

    // Bone 4/7: Foot & Boot Pivot (at ankle y = -shinLen)
    const foot = new THREE.Group();
    foot.name = side === 'left' ? 'LeftFoot' : 'RightFoot';
    foot.position.set(0, -shinLen, 0);
    lowerLeg.add(foot);

    const bootMesh = tagLegMesh(
      new THREE.Mesh(createTacticalBoot(mirrorX), matBoot),
      side === 'left' ? 'leftBoot' : 'rightBoot'
    );
    foot.add(bootMesh);

    return {
      side,
      upperLeg,
      lowerLeg,
      foot,
    };
  };

  const leftLeg = buildSideLeg('left');
  const rightLeg = buildSideLeg('right');

  const breakdown = validatePlayerLegsBudget(root);

  return {
    root,
    pelvisPivot,
    leftLeg,
    rightLeg,
    breakdown,
  };
}

/**
 * Updates the 7-bone First-Person Player Legs Rig every frame to match:
 * - Direction 01: Standing Idle & Crouched Stance + subtle breathing weight transfer
 * - Direction 02: 8-Way Directional Walking, Running, Sprinting & Stride cycles
 * - Direction 03: Jump Preparation, Ascending, Airborne, Falling, Small/Heavy Landing & Tactical Sliding
 * - Direction 05: Directional Damage Stagger & Player Death collapse
 */
export function updateFirstPersonLegsRig(
  legsRig: FirstPersonLegsRig,
  player: PlayerPhysicsState,
  weaponAnim: WeaponProceduralState,
  dt: number
): void {
  const clampedDt = clamp(dt, 0.001, 0.05);
  const { pelvisPivot, leftLeg, rightLeg } = legsRig;

  const horizSpeed = Math.hypot(player.vx, player.vz);
  const speedRatio = clamp(horizSpeed / 9.5, 0, 1.25);

  // Compute local forward (-Z in camera space) and right (+X in camera space) movement components
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);

  const forwardSpeed = player.vx * forwardX + player.vz * forwardZ;
  const strafeSpeed = player.vx * rightX + player.vz * rightZ;
  const dirSign = forwardSpeed < -0.35 ? -1 : 1;
  const strafeRatio = clamp(strafeSpeed / 6.5, -1, 1);

  // Base Pelvis position relative to playerRoot (feet at y = 0)
  // Scales cleanly with player.eyeHeight so crouching/sliding/landing lowers pelvis naturally
  const crouchAlpha = clamp((1.7 - player.eyeHeight) / (1.7 - 1.05), 0, 1.3);
  const breathShift = Math.sin(weaponAnim.idleTime * 0.85) * 0.006;

  let targetPelvisX = breathShift + strafeRatio * 0.025;
  let targetPelvisY = 0.88 - crouchAlpha * 0.32;
  let targetPelvisZ = 0.06 + crouchAlpha * 0.08;
  let targetPelvisPitch = -0.06 - crouchAlpha * 0.14;
  let targetPelvisRoll = -strafeRatio * 0.06;
  let targetPelvisYaw = -strafeRatio * 0.18 * dirSign;

  // Base Left & Right Leg joint target rotations (X = flexion/extension, Y = turnout, Z = abduction/strafe)
  // Note: In Three.js right-handed coordinates where forward is -Z and down is -Y:
  // Positive X rotation on UpperLeg swings thigh FORWARD (-Z, +Y).
  // Negative X rotation on LowerLeg bends the knee BACKWARD (+Z, +Y).
  // Positive X rotation on Foot pitches the boot toe UPWARD (dorsiflexion).
  let lHipX = 0.12 + crouchAlpha * 0.68;
  let lHipY = 0.06;
  let lHipZ = -0.025 - crouchAlpha * 0.04;
  let lKneeX = -0.18 - crouchAlpha * 0.92;
  let lFootX = 0.06 + crouchAlpha * 0.24;

  let rHipX = 0.06 + crouchAlpha * 0.58;
  let rHipY = -0.06;
  let rHipZ = 0.025 + crouchAlpha * 0.04;
  let rKneeX = -0.12 - crouchAlpha * 0.82;
  let rFootX = 0.06 + crouchAlpha * 0.24;

  // Direction 02 — Walking, Running, Sprinting & 8-Way Stride Cycle
  if (player.isGrounded && !player.isSliding && horizSpeed > 0.2) {
    const phase = player.stridePhase * dirSign;
    const strideAmp =
      (player.isSprinting ? 0.72 : horizSpeed > 4.2 ? 0.56 : 0.42) *
      clamp(horizSpeed / 4.5, 0.25, 1.2) *
      (1 - crouchAlpha * 0.35);

    const lSwing = Math.sin(phase);
    const rSwing = Math.sin(phase + Math.PI);
    const lLift = Math.max(0, Math.cos(phase));
    const rLift = Math.max(0, Math.cos(phase + Math.PI));

    lHipX += lSwing * strideAmp;
    rHipX += rSwing * strideAmp;

    // Knee bends during forward swing lift AND slightly at ground contact
    lKneeX += -lLift * strideAmp * 1.15 - Math.max(0, -lSwing) * 0.18;
    rKneeX += -rLift * strideAmp * 1.15 - Math.max(0, -rSwing) * 0.18;

    // Ankle dorsiflexion on forward swing, plantarflexion push-off on backstroke
    lFootX += lSwing * 0.22 + lLift * 0.15;
    rFootX += rSwing * 0.22 + rLift * 0.15;

    // Lateral strafe leg abduction & cross-step
    lHipZ += strafeRatio * 0.16 * lSwing;
    rHipZ += strafeRatio * 0.16 * rSwing;

    // Pelvis vertical bounce (2x stride frequency) & hip counter-rotation
    targetPelvisY += Math.abs(Math.sin(phase)) * 0.028 * speedRatio;
    targetPelvisRoll += Math.sin(phase) * 0.035 * speedRatio;
    targetPelvisYaw += Math.sin(phase) * 0.055 * speedRatio;
  }

  // Direction 03 — Airborne / Jumping / Falling Leg Pose
  if (!player.isGrounded) {
    const vy = player.vy;
    const ascendFactor = clamp(vy / 7.5, 0, 1);
    const fallFactor = clamp(-vy / 9.0, 0, 1);

    targetPelvisY += 0.04 * ascendFactor - 0.03 * fallFactor;
    // Asymmetric tactical airborne stance: left knee tucked higher, right leg slightly extended for landing
    lHipX = 0.58 + ascendFactor * 0.22 + fallFactor * 0.12;
    lKneeX = -0.82 - ascendFactor * 0.25;
    lFootX = -0.18 + fallFactor * 0.25;

    rHipX = 0.28 + fallFactor * 0.18;
    rKneeX = -0.42 - fallFactor * 0.22;
    rFootX = -0.24 + fallFactor * 0.28;
  }

  // Direction 03 — Small vs Heavy Landing Knee Compression
  if (player.landingRecoveryTimer > 0.001) {
    const landWeight = player.lastLandingHeavy ? 1.0 : 0.52;
    const landPulse =
      Math.sin(clamp(player.landingRecoveryTimer / 0.28, 0, 1) * Math.PI) *
      landWeight;
    targetPelvisY -= landPulse * 0.14;
    lHipX += landPulse * 0.42;
    lKneeX -= landPulse * 0.68;
    lFootX += landPulse * 0.28;
    rHipX += landPulse * 0.42;
    rKneeX -= landPulse * 0.68;
    rFootX += landPulse * 0.28;
  }

  // Direction 03 — Tactical Slide Pose (Leading left leg extended forward in view, right leg bent back)
  if (player.isSliding || weaponAnim.slideBlend > 0.01) {
    const sb = weaponAnim.slideBlend;
    targetPelvisY = THREE.MathUtils.lerp(targetPelvisY, 0.42, sb);
    targetPelvisZ = THREE.MathUtils.lerp(targetPelvisZ, -0.18, sb);
    targetPelvisPitch = THREE.MathUtils.lerp(targetPelvisPitch, 0.22, sb);
    targetPelvisRoll = THREE.MathUtils.lerp(targetPelvisRoll, -0.14, sb);

    // Left leading leg kicked forward (-Z) clearly visible in lower viewport
    lHipX = THREE.MathUtils.lerp(lHipX, 1.12, sb);
    lHipY = THREE.MathUtils.lerp(lHipY, -0.08, sb);
    lKneeX = THREE.MathUtils.lerp(lKneeX, -0.22, sb);
    lFootX = THREE.MathUtils.lerp(lFootX, 0.28, sb);

    // Right trailing leg bent under body for slide push-off
    rHipX = THREE.MathUtils.lerp(rHipX, 0.48, sb);
    rHipY = THREE.MathUtils.lerp(rHipY, -0.26, sb);
    rHipZ = THREE.MathUtils.lerp(rHipZ, 0.18, sb);
    rKneeX = THREE.MathUtils.lerp(rKneeX, -1.25, sb);
    rFootX = THREE.MathUtils.lerp(rFootX, -0.22, sb);
  }

  // Direction 05 — Player Death Collapse
  if (player.isDead) {
    const dBlend = clamp(player.deathAnimTimer / 0.55, 0, 1);
    targetPelvisY = THREE.MathUtils.lerp(targetPelvisY, 0.24, dBlend);
    targetPelvisZ = THREE.MathUtils.lerp(targetPelvisZ, -0.12, dBlend);
    lHipX = THREE.MathUtils.lerp(lHipX, 0.95, dBlend);
    lKneeX = THREE.MathUtils.lerp(lKneeX, -0.45, dBlend);
    rHipX = THREE.MathUtils.lerp(rHipX, 0.82, dBlend);
    rKneeX = THREE.MathUtils.lerp(rKneeX, -0.65, dBlend);
  }

  // Smooth exponential damping across all 7 bones (zero snapping)
  const rate = 20;
  pelvisPivot.position.x = damp(pelvisPivot.position.x, targetPelvisX, rate, clampedDt);
  pelvisPivot.position.y = damp(pelvisPivot.position.y, targetPelvisY, rate, clampedDt);
  pelvisPivot.position.z = damp(pelvisPivot.position.z, targetPelvisZ, rate, clampedDt);
  pelvisPivot.rotation.x = damp(pelvisPivot.rotation.x, targetPelvisPitch, rate, clampedDt);
  pelvisPivot.rotation.y = damp(pelvisPivot.rotation.y, targetPelvisYaw, rate, clampedDt);
  pelvisPivot.rotation.z = damp(pelvisPivot.rotation.z, targetPelvisRoll, rate, clampedDt);

  leftLeg.upperLeg.rotation.x = damp(leftLeg.upperLeg.rotation.x, lHipX, rate, clampedDt);
  leftLeg.upperLeg.rotation.y = damp(leftLeg.upperLeg.rotation.y, lHipY, rate, clampedDt);
  leftLeg.upperLeg.rotation.z = damp(leftLeg.upperLeg.rotation.z, lHipZ, rate, clampedDt);
  leftLeg.lowerLeg.rotation.x = damp(leftLeg.lowerLeg.rotation.x, lKneeX, rate, clampedDt);
  leftLeg.foot.rotation.x = damp(leftLeg.foot.rotation.x, lFootX, rate, clampedDt);

  rightLeg.upperLeg.rotation.x = damp(rightLeg.upperLeg.rotation.x, rHipX, rate, clampedDt);
  rightLeg.upperLeg.rotation.y = damp(rightLeg.upperLeg.rotation.y, rHipY, rate, clampedDt);
  rightLeg.upperLeg.rotation.z = damp(rightLeg.upperLeg.rotation.z, rHipZ, rate, clampedDt);
  rightLeg.lowerLeg.rotation.x = damp(rightLeg.lowerLeg.rotation.x, rKneeX, rate, clampedDt);
  rightLeg.foot.rotation.x = damp(rightLeg.foot.rotation.x, rFootX, rate, clampedDt);
}
