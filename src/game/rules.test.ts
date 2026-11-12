import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ARENA_HALF_SIZE,
  CAMERA_COMFORT_PRESETS,
  WEAPON_SPECS,
  applyDamageToPlayer,
  applyMouseLook,
  applyWeaponShot,
  calculateWaveConfig,
  canFireWeapon,
  cancelWeaponReload,
  computeTacticalNavigationDir,
  createEnemyBot,
  createInitialCameraState,
  createInitialPlayerState,
  createInitialUpgradesState,
  createInitialWeaponProceduralState,
  createInitialWeaponRuntime,
  createNavigationManagerState,
  damageEnemyBot,
  purchaseShopItem,
  resetPlayerForRespawn,
  resetPooledEnemyBot,
  resolveEnemyAnimationCategory,
  resolvePlayerAnimationState,
  runEnemyEcosystemBenchmarks,
  stepCameraProcedural,
  stepCentralizedNavigationManager,
  stepEnemiesAI,
  stepPlayerPhysics,
  stepWeaponProcedural,
  triggerWeaponMelee,
  triggerWeaponReload,
  triggerWeaponSwitch,
} from './rules';
import {
  applyWeaponRigTransform,
  buildAssaultRifleMesh,
  buildRevolverMesh,
  computeAssaultRifleBreakdown,
  computeRevolverBreakdown,
  countWeaponTriangles,
  createWeaponRig,
} from './weapons';
import {
  HAND_TEXTURE_SIZE,
  countHandTriangles,
  createFirstPersonHandsRig,
  getHandSkinTexture64,
  getSleeveFabricTexture64,
  updateFirstPersonHandsRig,
} from './hands';
import {
  LEG_TEXTURE_SIZE,
  createFirstPersonLegsRig,
  getBootArmorTexture16,
  getLegFabricTexture16,
  updateFirstPersonLegsRig,
  validatePlayerLegsBudget,
} from './legs';
import {
  ENEMY_NAVIGATION_PROFILES,
  MAP_ORDER,
  MAP_SPAWN_ZONES,
  MAP_SPECS,
  SPAWN_DEBUG_CATEGORY_COLORS,
  buildSpawnZoneDebugVisualizer,
  classifySpawnZoneTier,
  getSharedLowPolyMaterials,
  getSpawnDebugNodesSummary,
  selectValidatedMapSpawnPoint,
  updateSpawnZoneDebugVisualizer,
  validateAllMapsAndEnemyCompatibility,
  validateSpawnPosition,
} from './maps';
import {
  buildArenaEnvironment,
  buildEnemyBotMesh,
  logEnemyPolygonValidationReport,
  updateEnemyMeshRig,
  validateAllEnemyPolygonBudgets,
} from './arena';
import { AABBCollider, RampCollider } from './types';

test('strict weapon triangle budgets and Section 20.10 component breakdowns: Assault Rifle <= 165 tris and Revolver <= 145 tris', () => {
  const ar = buildAssaultRifleMesh();
  const rev = buildRevolverMesh();

  const arTris = countWeaponTriangles(ar.group);
  const revTris = countWeaponTriangles(rev.group);
  const arBreakdown = computeAssaultRifleBreakdown(ar.group);
  const revBreakdown = computeRevolverBreakdown(rev.group);

  assert.equal(arTris, arBreakdown.total);
  assert.equal(revTris, revBreakdown.total);

  assert.ok(
    arTris <= WEAPON_SPECS.assault_rifle.maxTriangles && arTris >= 140,
    `Expected Assault Rifle triangles (${arTris}) to be between 140 and 165`
  );
  assert.ok(
    revTris <= WEAPON_SPECS.revolver.maxTriangles && revTris >= 120,
    `Expected Revolver triangles (${revTris}) to be between 120 and 145`
  );

  // Verify functional iron sight triangle allocations and exact sight axis alignment
  assert.equal(arBreakdown.frontSight, 10);
  assert.equal(arBreakdown.rearSight, 10);
  assert.equal(ar.frontSightRef.position.x, 0);
  assert.equal(ar.rearSightRef.position.x, 0);
  assert.equal(
    ar.frontSightRef.position.y,
    ar.rearSightRef.position.y,
    'Assault Rifle front sight tip and rear sight notch must share the exact vertical reference axis'
  );

  assert.equal(revBreakdown.frontSight, 6);
  assert.equal(revBreakdown.rearSight, 7);
  assert.equal(rev.frontSightRef.position.x, 0);
  assert.equal(rev.rearSightRef.position.x, 0);
  assert.equal(
    rev.frontSightRef.position.y,
    rev.rearSightRef.position.y,
    'Revolver front sight blade tip and rear sight notch must share the exact vertical reference axis'
  );
});

test('first-person full arm + hand anatomy, separate triangle budget (<= 300 tris/side), and synchronized idle breathing sway', () => {
  const hands = createFirstPersonHandsRig();
  const leftTris = countHandTriangles(hands.leftHand.armRoot);
  const rightTris = countHandTriangles(hands.rightHand.armRoot);

  assert.equal(leftTris, hands.leftHand.triangleCount);
  assert.equal(rightTris, hands.rightHand.triangleCount);
  assert.ok(
    leftTris >= 250 && leftTris <= 300,
    `Expected Left Arm+Hand triangles (${leftTris}) to be within 250..300 budget`
  );
  assert.ok(
    rightTris >= 250 && rightTris <= 300,
    `Expected Right Arm+Hand triangles (${rightTris}) to be within 250..300 budget`
  );

  // Verify each hand has all 5 separated fingers with distinct phalanx joints
  const fourFingerKeys = ['index', 'middle', 'ring', 'little'] as const;
  for (const hand of [hands.leftHand, hands.rightHand]) {
    assert.ok(hand.thumb.base && hand.thumb.proximal && hand.thumb.distal);
    for (const key of fourFingerKeys) {
      const f = hand[key];
      assert.ok(f.base, `Missing base joint on ${hand.side} ${key}`);
      assert.ok(f.proximal, `Missing proximal joint on ${hand.side} ${key}`);
      assert.ok(f.middle, `Missing middle joint on ${hand.side} ${key}`);
      assert.ok(f.distal, `Missing distal joint on ${hand.side} ${key}`);
    }
  }

  // Verify synchronized procedural idle breathing sway updates wrist & finger transforms organically over time
  const weaponAnim = createInitialWeaponProceduralState();
  weaponAnim.idleTime = 0;
  updateFirstPersonHandsRig(hands, weaponAnim, 0.05);
  const wristYAtT0 = hands.rightHand.wrist.position.y;
  const wristRotXAtT0 = hands.rightHand.wrist.rotation.x;

  weaponAnim.idleTime = Math.PI * 0.55;
  updateFirstPersonHandsRig(hands, weaponAnim, 0.05);
  const wristYAtT1 = hands.rightHand.wrist.position.y;
  const wristRotXAtT1 = hands.rightHand.wrist.rotation.x;
  assert.ok(
    Math.abs(wristYAtT1 - wristYAtT0) > 0.0005 &&
      Math.abs(wristRotXAtT1 - wristRotXAtT0) > 0.002,
    'Synchronized idle breathing sway should subtly modulate first-person wrist position and pitch in phase with viewmodel idleTime'
  );
});

test('first-person hands articulation, ADS sight alignment, and Weapon Inspection modes', () => {
  const rig = createWeaponRig();
  const weaponAnim = createInitialWeaponProceduralState();
  const cameraAnim = createInitialCameraState();
  const runtime = createInitialWeaponRuntime();

  // Initial Assault Rifle hip-fire grip pose
  applyWeaponRigTransform(rig, weaponAnim, 0, 0.05, true, 'off');
  assert.equal(rig.handsRig.root.visible, true);
  const baseIndexMcp = rig.handsRig.rightHand.currentPose.index.mcpX;

  // Fire a shot -> right index finger should curl further to press the trigger
  applyWeaponShot(
    weaponAnim,
    cameraAnim,
    runtime.assault_rifle,
    WEAPON_SPECS.assault_rifle
  );
  assert.equal(weaponAnim.triggerPress, 1.0);
  updateFirstPersonHandsRig(rig.handsRig, weaponAnim, 0.05);
  const firedIndexMcp = rig.handsRig.rightHand.currentPose.index.mcpX;
  assert.ok(
    firedIndexMcp > baseIndexMcp + 0.15,
    `Expected right index finger MCP curl (${firedIndexMcp}) to increase from rest (${baseIndexMcp}) when pressing trigger`
  );

  // Verify ADS sight alignment places the Assault Rifle sight axis on camera center (0, 0)
  weaponAnim.adsBlend = 1.0;
  weaponAnim.recoilPosZ = 0;
  weaponAnim.recoilPosY = 0;
  weaponAnim.recoilRotX = 0;
  weaponAnim.swayPosX = 0;
  weaponAnim.swayPosY = 0;
  applyWeaponRigTransform(rig, weaponAnim, 0, 0.05, true, 'ads');
  assert.ok(
    Math.abs(rig.root.position.x) < 1e-4 &&
      Math.abs(rig.root.position.y + rig.arFrontSightRef.position.y) < 1e-4,
    'In ADS mode, weapon root must align the front/rear iron sight reference axis with camera center (0, 0)'
  );

  // Trigger Assault Rifle reload -> left support hand should move downward to grasp the magazine
  weaponAnim.adsBlend = 0;
  applyWeaponRigTransform(rig, weaponAnim, 0, 0.05, true, 'off');
  const baseLeftWristY = rig.handsRig.leftHand.wrist.position.y;
  triggerWeaponReload(
    weaponAnim,
    runtime.assault_rifle,
    WEAPON_SPECS.assault_rifle
  );
  weaponAnim.reloadProgress = 0.45; // Phase 3: gripping and pulling out magazine
  updateFirstPersonHandsRig(rig.handsRig, weaponAnim, 0.05);
  assert.ok(
    rig.handsRig.leftHand.wrist.position.y < baseLeftWristY - 0.05,
    'Left support hand wrist should move downward to grasp and pull the magazine during reload'
  );

  // Toggle hands OFF -> handsRig.root.visible becomes false while weapons remain intact
  applyWeaponRigTransform(rig, weaponAnim, 0, 0.05, false, 'off');
  assert.equal(rig.handsRig.root.visible, false);
});

test('player movement physics, crouching eyeHeight & speed reduction, seamless ramp-to-platform traversal, and AABB wall collision', () => {
  const player = createInitialPlayerState();
  const colliders: AABBCollider[] = [
    {
      id: 'center_platform',
      minX: -4.5,
      maxX: 4.5,
      minY: 0,
      maxY: 1.2,
      minZ: -4.5,
      maxZ: 4.5,
      materialType: 'concrete',
    },
  ];
  const ramps: RampCollider[] = [
    {
      id: 'ramp_west',
      minX: -9.5,
      maxX: -4.45,
      minZ: -2.5,
      maxZ: 2.5,
      startY: 0,
      endY: 1.2,
      axis: 'x+',
    },
  ];

  // Test Crouching lowers eyeHeight from 1.68m toward 1.12m and reduces horizontal speed
  for (let i = 0; i < 30; i++) {
    stepPlayerPhysics(
      player,
      {
        forward: 1,
        right: 0,
        sprintHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        aimHeld: false,
        crouchHeld: true,
      },
      [],
      [],
      0.02
    );
  }
  assert.ok(
    player.isCrouching && player.eyeHeight < 1.2,
    `Expected crouched eyeHeight < 1.2m (got ${player.eyeHeight})`
  );
  const crouchSpeed = Math.hypot(player.vx, player.vz);
  assert.ok(
    crouchSpeed < 5.5,
    `Expected crouched speed < 5.5 m/s (got ${crouchSpeed})`
  );

  // Release crouch and position player at base of West ramp to walk East (+X) onto the central platform
  player.x = -9.2;
  player.y = 0;
  player.z = 0;
  player.yaw = -Math.PI / 2; // facing +X (East)

  for (let i = 0; i < 90; i++) {
    stepPlayerPhysics(
      player,
      {
        forward: 1,
        right: 0,
        sprintHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        aimHeld: false,
        crouchHeld: false,
      },
      colliders,
      ramps,
      0.016
    );
  }

  assert.ok(
    player.x > -3.5 && Math.abs(player.y - 1.2) < 0.05,
    `Player should smoothly walk up the West ramp onto the central platform (got x=${player.x.toFixed(2)}, y=${player.y.toFixed(2)})`
  );
});

test('Section 21 ultra-precise head movement: walking/running/sprinting bob, 0.22Hz breathing, acceleration inertia, 3-phase jump & landing, and comfort presets', () => {
  const player = createInitialPlayerState();
  const weaponAnim = createInitialWeaponProceduralState();
  const cameraAnim = createInitialCameraState();

  assert.equal(player.eyeHeight, 1.68, 'Standing eye height must be 1.68 world units (1.65..1.75 spec)');

  // Extreme vertical mouse movement should clamp to +/- 85 degrees while applying secondary look sway
  applyMouseLook(player, weaponAnim, cameraAnim, 18, -50000, 1.0, CAMERA_COMFORT_PRESETS.normal);
  assert.ok(player.pitch <= (85.1 * Math.PI) / 180);
  assert.ok(cameraAnim.lookSwayVelX !== 0, 'Mouse horizontal turn should inject opposing secondary head sway velocity');

  applyMouseLook(player, weaponAnim, cameraAnim, 0, 50000, 1.0, CAMERA_COMFORT_PRESETS.normal);
  assert.ok(player.pitch >= -(85.1 * Math.PI) / 180);

  // Idle breathing at 0.22 Hz when standing still
  player.vx = 0;
  player.vz = 0;
  player.grounded = true;
  for (let i = 0; i < 20; i++) {
    stepCameraProcedural(cameraAnim, player, 0, 0.05, 75, CAMERA_COMFORT_PRESETS.normal);
  }
  assert.ok(
    Math.abs(cameraAnim.breathOffsetY) > 0.002 && Math.abs(cameraAnim.breathOffsetY) <= 0.006,
    `Expected subtle 0.22Hz idle breathing vertical motion (${cameraAnim.breathOffsetY})`
  );

  // Simulate forward acceleration -> backward inertia pitch & Z shift
  player.yaw = 0;
  player.vx = 0;
  player.vz = -8.2;
  stepCameraProcedural(cameraAnim, player, 0, 0.032, 75, CAMERA_COMFORT_PRESETS.normal);
  assert.ok(
    cameraAnim.inertiaVelZ > 0 && cameraAnim.inertiaPitchVel > 0,
    'Forward acceleration should create subtle backward head inertia'
  );

  // Simulate sprinting -> forward offset (+0.02..0.04) and downward pitch bias
  player.isSprinting = true;
  player.vz = -11.5;
  for (let i = 0; i < 20; i++) {
    stepCameraProcedural(cameraAnim, player, 0, 0.032, 90, CAMERA_COMFORT_PRESETS.normal);
  }
  assert.ok(
    cameraAnim.sprintForwardOffsetZ < -0.02,
    `Expected sprinting forward offset along -Z (got ${cameraAnim.sprintForwardOffsetZ})`
  );
  assert.ok(
    cameraAnim.sprintPitchBias < -0.015,
    `Expected sprinting downward pitch bias (got ${cameraAnim.sprintPitchBias})`
  );

  // 3-Phase Jump & Single-Event Landing Impulse
  player.isSprinting = false;
  player.justJumped = true;
  player.grounded = false;
  player.vy = 7.8;
  stepCameraProcedural(cameraAnim, player, 0, 0.016, 75, CAMERA_COMFORT_PRESETS.normal);
  assert.equal(player.justJumped, false, 'justJumped flag must be consumed as a single event');
  assert.ok(cameraAnim.jumpVelY > 0, 'Takeoff should trigger upward head impulse');

  // Land with downward speed 8.5 -> single downward dip + pitch nod
  player.grounded = true;
  player.vy = 0;
  player.justLandedVelocity = 8.5;
  stepCameraProcedural(cameraAnim, player, 0, 0.016, 75, CAMERA_COMFORT_PRESETS.normal);
  assert.equal(player.justLandedVelocity, 0, 'Landing impulse must trigger once per landing event');
  assert.ok(cameraAnim.landingVelocityY < 0, 'Landing impulse should compress camera downward');
  assert.ok(cameraAnim.landingPitchVel < 0, 'Landing impulse should create a subtle forward pitch nod');

  // Verify LOW-MOTION comfort preset reduces head bob compared to ENHANCED preset
  const camLow = createInitialCameraState();
  const camEnh = createInitialCameraState();
  player.vx = 0;
  player.vz = -8.0;
  player.grounded = true;
  for (let i = 0; i < 15; i++) {
    stepCameraProcedural(camLow, player, 0, 0.025, 75, CAMERA_COMFORT_PRESETS.low);
    stepCameraProcedural(camEnh, player, 0, 0.025, 75, CAMERA_COMFORT_PRESETS.enhanced);
  }
  assert.ok(
    Math.abs(camLow.bobOffsetY) < Math.abs(camEnh.bobOffsetY),
    'LOW-MOTION preset must produce smaller vertical head bob than ENHANCED preset'
  );
});

test('16x16 RGBA opaque textures for first-person hands and legs, and non-transparent DoubleSide hand materials', () => {
  const skinTex = getHandSkinTexture64();
  const sleeveTex = getSleeveFabricTexture64();
  const legFabricTex = getLegFabricTexture16();
  const bootArmorTex = getBootArmorTexture16();

  assert.equal(HAND_TEXTURE_SIZE, 16);
  assert.equal(LEG_TEXTURE_SIZE, 16);
  assert.equal(skinTex.image.width, 16);
  assert.equal(skinTex.image.height, 16);
  assert.equal(sleeveTex.image.width, 16);
  assert.equal(sleeveTex.image.height, 16);
  assert.equal(legFabricTex.image.width, 16);
  assert.equal(legFabricTex.image.height, 16);
  assert.equal(bootArmorTex.image.width, 16);
  assert.equal(bootArmorTex.image.height, 16);

  // Verify every texel has alpha === 255 (100% opaque)
  const skinData = skinTex.image.data as Uint8Array;
  for (let i = 3; i < skinData.length; i += 4) {
    assert.equal(skinData[i], 255, 'Skin 16x16 texture must have alpha=255 on all pixels');
  }
  const legData = legFabricTex.image.data as Uint8Array;
  for (let i = 3; i < legData.length; i += 4) {
    assert.equal(legData[i], 255, 'Leg 16x16 texture must have alpha=255 on all pixels');
  }

  const hands = createFirstPersonHandsRig();
  let meshCount = 0;
  hands.root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      meshCount++;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      assert.equal(mat.transparent, false, `Hand mesh ${mesh.name} must have transparent=false`);
      assert.equal(mat.opacity, 1.0, `Hand mesh ${mesh.name} must have opacity=1.0`);
      assert.equal(mat.side, THREE.DoubleSide, `Hand mesh ${mesh.name} must use DoubleSide to prevent backface culling gaps`);
      assert.ok(mat.map, `Hand mesh ${mesh.name} must have a 16x16 texture map bound`);
    }
  });
  assert.ok(meshCount >= 28, `Expected at least 28 articulated arm/hand/finger meshes, found ${meshCount}`);
});

test('all 18 enemy archetypes (11 Normal <= 124, 4 Mini-Bosses <= 200, 3 Main Bosses <= 250) strictly obey polygon, triangle, and vertex budgets with automated startup console report', () => {
  const entries = logEnemyPolygonValidationReport();
  assert.equal(entries.length, 18, 'Must validate all 18 distinct enemy archetypes');

  const normalEntries = entries.filter((e) => e.tier === 'normal');
  const minibossEntries = entries.filter((e) => e.tier === 'miniboss');
  const bossEntries = entries.filter((e) => e.tier === 'boss');

  assert.equal(normalEntries.length, 11, 'Must have 11 Normal Enemy archetypes');
  assert.equal(minibossEntries.length, 4, 'Must have 4 Mini-Boss archetypes');
  assert.equal(bossEntries.length, 3, 'Must have 3 Main Boss archetypes');

  for (const entry of entries) {
    const expectedLimit =
      entry.tier === 'boss' ? 250 : entry.tier === 'miniboss' ? 200 : 124;
    assert.equal(entry.maxPolygons, expectedLimit);
    assert.ok(
      entry.withinBudget && entry.polygons <= expectedLimit && entry.triangles <= expectedLimit,
      `Enemy archetype ${entry.name} (${entry.archetype}) exceeded ${expectedLimit} polygon budget: ${entry.polygons} polys / ${entry.triangles} tris`
    );
    assert.ok(entry.vertexCount > 0, `${entry.name} must report non-zero vertexCount`);
    assert.equal(entry.boneCount, 13, `${entry.name} must use the 13-pivot skeletal rig`);

    // Verify component-by-component allocation sums to total polygons
    const alloc = entry.allocation;
    const sumAlloc =
      alloc.headAndHelmet +
      alloc.torso +
      alloc.pelvis +
      alloc.arms +
      alloc.legs +
      alloc.armor +
      alloc.weaponEquipment +
      alloc.additionalDetails;
    assert.equal(
      sumAlloc,
      entry.polygons,
      `Component allocation sum (${sumAlloc}) must match total polygons (${entry.polygons}) for ${entry.name}`
    );
  }
});

test('watertight arena collision geometry: player is strictly contained within perimeter walls, corners, and solid floor', () => {
  const arena = buildArenaEnvironment();
  const player = createInitialPlayerState();

  // Attempt to sprint North-West directly into the NW corner for 200 frames
  player.x = -20.0;
  player.z = -20.0;
  player.yaw = Math.PI * 0.25;

  for (let i = 0; i < 200; i++) {
    stepPlayerPhysics(
      player,
      {
        forward: 1,
        right: 0,
        sprintHeld: true,
        jumpJustPressed: i % 40 === 0,
        jumpHeld: false,
        aimHeld: false,
      },
      arena.colliders,
      arena.ramps,
      0.016
    );
    assert.ok(
      Math.abs(player.x) <= ARENA_HALF_SIZE + 1e-4 &&
        Math.abs(player.z) <= ARENA_HALF_SIZE + 1e-4,
      `Player escaped arena perimeter at (${player.x}, ${player.z})`
    );
    assert.ok(player.y >= 0, `Player fell below solid floor at y=${player.y}`);
  }
});

test('Version 2.0 Enemy Bible: 6 Animation Directions priority hierarchy, safe hit-frame guards, 4-way directional hit reactions, breakable armor & weak-point crits, boss stagger immunity, single-event Exploder detonation, single-trigger Boss phase transitions, and Object Pooling reset', () => {
  const player = createInitialPlayerState();
  const runtime = createInitialWeaponRuntime();
  const upgrades = createInitialUpgradesState();

  // 1. Test Ballistic Armor absorbs 65% of incoming damage
  assert.equal(player.armor, 50);
  assert.equal(player.health, 100);
  const dmgTaken = applyDamageToPlayer(player, 20, 0, 0);
  assert.equal(dmgTaken.armorLost, 13);
  assert.equal(dmgTaken.healthLost, 7);
  assert.equal(player.armor, 37);
  assert.equal(player.health, 93);

  // 2. Test 30-wave progression milestones (Mini-Bosses on Waves 5/15/25, Main Bosses on Waves 10/20/30)
  const w5 = calculateWaveConfig(5);
  const w9 = calculateWaveConfig(9);
  const w10 = calculateWaveConfig(10);
  const w15 = calculateWaveConfig(15);
  const w20 = calculateWaveConfig(20);
  const w25 = calculateWaveConfig(25);
  const w30 = calculateWaveConfig(30);
  assert.ok(w5.isBossWave && w5.spawnPool.includes('iron_warden'));
  assert.ok(w9.spawnPool.includes('shield'));
  assert.ok(w10.isBossWave && w10.spawnPool.includes('colossus'));
  assert.ok(w15.isBossWave && w15.spawnPool.includes('ravager') && w15.spawnPool.includes('siege_engine'));
  assert.ok(w20.isBossWave && w20.spawnPool.includes('overseer'));
  assert.ok(w25.isBossWave && w25.spawnPool.includes('brood_titan'));
  assert.ok(w30.isBossWave && w30.spawnPool.includes('abomination') && w30.spawnPool.includes('colossus'));

  // 3. Test 6 Animation Directions Priority Controller (Death > Boss Presentation > Damage/Stagger > Combat > Locomotion > Idle)
  const colossus = createEnemyBot(100, 'colossus', 0, 0, 12, calculateWaveConfig(1));
  assert.equal(resolveEnemyAnimationCategory(colossus), 'boss_presentation', 'New Boss must start in Direction 06 boss_presentation');
  colossus.bossIntroTimer = 0;
  colossus.spawnAnimTimer = 0;
  assert.equal(resolveEnemyAnimationCategory(colossus), 'idle', 'Standing still Boss with no intro must resolve to Direction 01 idle');
  colossus.vx = 2.0;
  assert.equal(resolveEnemyAnimationCategory(colossus), 'locomotion', 'Moving enemy must resolve to Direction 02 locomotion');
  colossus.attackState = 'windup';
  assert.equal(resolveEnemyAnimationCategory(colossus), 'combat', 'Attacking enemy must resolve to Direction 03 combat');
  colossus.staggerTimer = 0.25;
  assert.equal(resolveEnemyAnimationCategory(colossus), 'damage', 'Staggered enemy must resolve to Direction 04 damage');
  colossus.bossPhaseTransitionTimer = 0.6;
  assert.equal(resolveEnemyAnimationCategory(colossus), 'boss_presentation', 'Phase transition overrides stagger/combat');
  colossus.alive = false;
  assert.equal(resolveEnemyAnimationCategory(colossus), 'death', 'Direction 05 death must have highest priority');

  // 4. Test 4-Way Directional Hit Reactions (front, back, left, right)
  const grunt = createEnemyBot(101, 'grunt', 0, 0, 0, calculateWaveConfig(1));
  grunt.yaw = 0; // facing +Z (0, 0, 1)
  damageEnemyBot(grunt, 10, 0, 5); // attacker in front (+Z)
  assert.equal(grunt.lastHitDirection, 'front');
  damageEnemyBot(grunt, 10, 0, -5); // attacker behind (-Z)
  assert.equal(grunt.lastHitDirection, 'back');
  damageEnemyBot(grunt, 10, 5, 0); // attacker on right (+X)
  assert.equal(grunt.lastHitDirection, 'right');
  damageEnemyBot(grunt, 10, -5, 0); // attacker on left (-X)
  assert.equal(grunt.lastHitDirection, 'left');

  // 5. Test Breakable Armor Plates & Weak-Point Critical Multiplier
  const brute = createEnemyBot(102, 'brute', 0, 0, 8, calculateWaveConfig(1));
  assert.ok(brute.armorHp > 0, 'Brute must start with breakable armor plating');
  const bruteHpBefore = brute.hp;
  const armorHitRes = damageEnemyBot(brute, 50, 0, 0, { hitArmor: true });
  assert.equal(armorHitRes.armorHit, true);
  assert.equal(bruteHpBefore - brute.hp, 32, 'Armor hit must absorb 35% (18 dmg) of incoming 50 damage');

  // Weak-point critical hit on Siege Engine
  const siege = createEnemyBot(103, 'siege_engine', 0, 0, 10, calculateWaveConfig(1));
  const siegeHpBefore = siege.hp;
  const wpRes = damageEnemyBot(siege, 50, 0, 0, { isWeakPoint: true });
  assert.equal(wpRes.weakPointHit, true);
  assert.equal(siegeHpBefore - siege.hp, Math.round(50 * 1.8), 'Weak-point hit must apply 1.8x critical multiplier');

  // 6. Test Boss Stagger Immunity Window (prevents infinite stunlock)
  const warden = createEnemyBot(104, 'iron_warden', 0, 0, 10, calculateWaveConfig(1));
  warden.bossIntroTimer = 0;
  damageEnemyBot(warden, 260, 0, 0); // Exceeds staggerThreshold (190)
  assert.ok(warden.staggerTimer > 0, 'First heavy burst should stagger Mini-Boss');
  assert.ok(warden.staggerImmunityTimer >= 2.0, 'Staggering a Mini-Boss must grant 2.5s stagger immunity');
  warden.staggerTimer = 0;
  damageEnemyBot(warden, 260, 0, 0); // Hit again while staggerImmunityTimer > 0
  assert.equal(warden.staggerTimer, 0, 'Mini-Boss must not be re-staggered while staggerImmunityTimer is active');

  // 7. Test Safe Hit-Frame Guard (damageDealtForAttackId prevents double damage in same attack)
  const rusher = createEnemyBot(105, 'rusher', player.x, 0, player.z - 1.5, calculateWaveConfig(1));
  rusher.attackState = 'windup';
  rusher.attackInstanceId = 7;
  rusher.damageDealtForAttackId = 0;
  rusher.attackTimer = 0.005;
  const aiAttack1 = stepEnemiesAI([rusher], player, [], [], 0.016);
  assert.ok(aiAttack1.playerDamageTaken > 0, 'Transition from windup to execution must deal damage once');
  assert.equal(rusher.damageDealtForAttackId, 7);
  const aiAttack2 = stepEnemiesAI([rusher], player, [], [], 0.016);
  assert.equal(aiAttack2.playerDamageTaken, 0, 'Execution phase must never deal duplicate damage for the same attackInstanceId');

  // 8. Test Exploder single-event detonation & Boss single-trigger 3-phase transition
  const exploder = createEnemyBot(106, 'exploder', player.x, 0, player.z - 2.2, calculateWaveConfig(1));
  exploder.attackState = 'windup';
  exploder.attackTimer = 0.01;

  const boss = createEnemyBot(107, 'boss', 0, 0, 0, calculateWaveConfig(1));
  boss.bossIntroTimer = 0;
  boss.hp = Math.floor(boss.maxHp * 0.25); // < 33% -> Phase 3

  const aiRes = stepEnemiesAI([exploder, boss], player, [], [], 0.03);
  assert.equal(aiRes.explosionsTriggered.length, 1, 'Exploder windup completion should trigger detonation');
  assert.equal(exploder.alive, false);
  assert.equal(exploder.detonated, true);
  assert.equal(exploder.deathStyle, 'explosive');
  assert.equal(aiRes.bossPhaseChanged, 3, 'Boss below 33% HP should transition to Phase 3');

  // Step again -> neither Exploder detonation nor Boss Phase 3 transition may re-trigger
  const aiResRepeat = stepEnemiesAI([exploder, boss], player, [], [], 0.03);
  assert.equal(aiResRepeat.explosionsTriggered.length, 0, 'Exploder must never detonate twice');
  assert.equal(aiResRepeat.bossPhaseChanged, null, 'Boss Phase 3 transition must never trigger twice');

  // 9. Test Object Pooling state reset (resetPooledEnemyBot) & Rig update across all 6 directions
  resetPooledEnemyBot(exploder, 200, 'leaper', 4, 0, -6, calculateWaveConfig(3));
  assert.equal(exploder.id, 200);
  assert.equal(exploder.archetype, 'leaper');
  assert.equal(exploder.alive, true);
  assert.equal(exploder.detonated, false);
  assert.equal(exploder.rewardGranted, false);
  assert.equal(exploder.attackState, 'idle');

  const leaperRig = buildEnemyBotMesh(200, 'leaper');
  updateEnemyMeshRig(leaperRig, exploder);
  assert.equal(leaperRig.boneCount, 13);

  // 10. Test Tactical Shop purchases & upgrades
  const buyDmg = purchaseShopItem('weapon_damage', 200, player, runtime, upgrades);
  assert.equal(buyDmg.success, true);
  assert.equal(upgrades.damageLevel, 1);
  assert.equal(upgrades.damageMultiplier, 1.15);
  assert.equal(buyDmg.newCredits, 60);
});

test('Part 14 Performance Benchmark Suite: Tests A through H (10, 20, 30, 40, 50 standard enemies, 30 + 1 Mini-Boss, 20 + 1 Main Boss, and Max Wave Population)', () => {
  const arena = buildArenaEnvironment();
  const benchmarks = runEnemyEcosystemBenchmarks(arena.colliders, arena.ramps);

  assert.equal(benchmarks.length, 8, 'Must execute all 8 benchmark scenarios (Tests A through H)');
  const expectedIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  for (let i = 0; i < benchmarks.length; i++) {
    const bm = benchmarks[i];
    assert.equal(bm.id, expectedIds[i]);
    assert.equal(bm.withinBudget60Fps, true, `Benchmark Test ${bm.id} (${bm.label}) must pass 60 FPS frame budget (<16.6ms): got ${bm.avgCpuFrameMs}ms`);
    assert.ok(bm.totalPolygons > 0 && bm.totalTriangles > 0 && bm.totalBones > 0);
    assert.equal(bm.pooledInstancesReused, bm.totalEnemies, 'Benchmark must verify 100% object pool reuse without runtime allocation');
  }
});

test('Player Character Specification: First-Person Player Legs (<= 99 polygons total), 7-bone hierarchy, Tactical Sliding, 5-stage Melee Attack, Interrupted Reload Cancellation, 4-Way Damage, Death & Respawn', () => {
  // 1. Validate First-Person Player Legs strict polygon & triangle budget (<= 99 total for both legs combined)
  const legsRig = createFirstPersonLegsRig();
  const bd = validatePlayerLegsBudget(legsRig.root);
  assert.equal(bd.withinBudget, true);
  assert.ok(
    bd.totalPolygons <= 99 && bd.totalTriangles <= 99,
    `Player legs must be <= 99 polygons total, got ${bd.totalPolygons} polys / ${bd.totalTriangles} tris`
  );
  assert.equal(bd.totalPolygons, 88);
  assert.equal(bd.boneCount, 7);
  assert.equal(bd.textureSize, 16);

  // 2. Test Tactical Slide initiation from sprint + crouch, eyeHeight lowering, and leg/weapon slide pose
  const player = createInitialPlayerState();
  const weaponAnim = createInitialWeaponProceduralState();
  const cameraAnim = createInitialCameraState();
  const runtime = createInitialWeaponRuntime();

  // Accelerate into sprint first
  for (let i = 0; i < 15; i++) {
    stepPlayerPhysics(
      player,
      {
        forward: 1,
        right: 0,
        sprintHeld: true,
        jumpJustPressed: false,
        jumpHeld: false,
        aimHeld: false,
        crouchHeld: false,
      },
      [],
      [],
      0.03
    );
  }
  assert.equal(player.isSprinting, true);
  assert.equal(resolvePlayerAnimationState(player, weaponAnim, runtime.assault_rifle), 'Sprinting');

  // Press crouch while sprinting -> initiates Tactical Slide
  const slideStep = stepPlayerPhysics(
    player,
    {
      forward: 1,
      right: 0,
      sprintHeld: true,
      jumpJustPressed: false,
      jumpHeld: false,
      aimHeld: false,
      crouchHeld: true,
    },
    [],
    [],
    0.03
  );
  assert.equal(slideStep.slideStarted, true, 'Pressing crouch while sprinting must start a Tactical Slide');
  assert.equal(player.isSliding, true);
  assert.equal(resolvePlayerAnimationState(player, weaponAnim, runtime.assault_rifle), 'Sliding');

  // Update weapon procedural & legs rig during slide
  stepWeaponProcedural(weaponAnim, runtime, player, 0, 0.04);
  updateFirstPersonLegsRig(legsRig, player, weaponAnim, 0.04);
  assert.ok(weaponAnim.slideBlend > 0.1, 'weaponAnim.slideBlend must ramp up during slide');
  assert.ok(
    legsRig.leftLeg.upperLeg.rotation.x > legsRig.rightLeg.upperLeg.rotation.x,
    'Leading left leg must extend forward more than trailing right leg during tactical slide'
  );

  // 3. Test Interrupted Reload Cancellation (switching weapons or meleeing during reload never grants ammo)
  player.isSliding = false;
  player.slideTimer = 0;
  runtime.assault_rifle.ammoInMag = 10;
  runtime.assault_rifle.reserveAmmo = 90;
  assert.equal(
    triggerWeaponReload(weaponAnim, runtime.assault_rifle, WEAPON_SPECS.assault_rifle),
    true
  );
  for (let i = 0; i < 8; i++) {
    stepWeaponProcedural(weaponAnim, runtime, player, 0, 0.05);
  }
  assert.equal(weaponAnim.phase, 'reloading');
  assert.ok(weaponAnim.reloadProgress > 0.2);

  // Interrupt reload with 5-stage Melee Attack
  assert.equal(triggerWeaponMelee(weaponAnim), true);
  assert.equal(weaponAnim.phase, 'melee');
  assert.equal(weaponAnim.reloadProgress, 0, 'Interrupted reload must reset reloadProgress to 0');
  assert.equal(runtime.assault_rifle.ammoInMag, 10, 'Interrupted reload must never grant ammo');
  assert.equal(resolvePlayerAnimationState(player, weaponAnim, runtime.assault_rifle), 'MeleeAttacking');

  // Step through 5-stage Melee Attack and verify meleeHitTriggered fires exactly ONCE
  let meleeHits = 0;
  for (let i = 0; i < 20; i++) {
    const res = stepWeaponProcedural(weaponAnim, runtime, player, 0, 0.03);
    if (res.meleeHitTriggered) meleeHits++;
  }
  assert.equal(meleeHits, 1, '5-stage melee attack must trigger meleeHitTriggered exactly once per strike');
  assert.equal(weaponAnim.phase, 'ready');

  // 4. Test 4-Way Directional Player Damage, Heavy Stagger, Single-Trigger Death & Respawn Reset
  player.yaw = 0; // Facing North (-Z)
  player.x = 0;
  player.z = 0;
  // Hit from Right (+X)
  const hitRight = applyDamageToPlayer(player, 26, 8, 0, cameraAnim, weaponAnim);
  assert.equal(hitRight.hitDirection, 'right');
  assert.equal(player.lastDamageDir, 'right');
  assert.ok(player.staggerTimer > 0, 'Heavy damage (>=22) must trigger player stagger');
  assert.equal(resolvePlayerAnimationState(player, weaponAnim, runtime.assault_rifle), 'Staggered');

  // Fatal hit triggers single-event player death
  const fatalHit = applyDamageToPlayer(player, 500, 0, -8, cameraAnim, weaponAnim);
  assert.equal(fatalHit.diedNow, true);
  assert.equal(player.isDead, true);
  assert.equal(player.animState, 'Dead');

  // Second hit while dead must not re-trigger diedNow
  const postDeathHit = applyDamageToPlayer(player, 50, 0, -8, cameraAnim, weaponAnim);
  assert.equal(postDeathHit.diedNow, false, 'Player death must never trigger twice');

  // Respawn reset restores full health, armor, and Idle state
  resetPlayerForRespawn(player, runtime, cameraAnim, weaponAnim);
  assert.equal(player.isDead, false);
  assert.equal(player.health, 100);
  assert.equal(player.animState, 'Idle');
});

test('Enemy Pathfinding around Central Platform and West/East Ramps: bots never get stuck on platform or ramp side-walls', () => {
  const arena = buildArenaEnvironment();
  const player = createInitialPlayerState();
  // Place player South of central platform at (0, 0, 9.5)
  player.x = 0;
  player.y = 0;
  player.z = 9.5;

  // Place ground enemy North of central platform/ramp barrier at (0, 0, -9.5)
  const bot = createEnemyBot(301, 'rusher', 0, 0, -9.5, calculateWaveConfig(1));
  bot.bossIntroTimer = 0;

  // Simulate 230 frames (6.9 seconds) of AI navigation around the ~32m outer flank
  for (let i = 0; i < 230; i++) {
    stepEnemiesAI([bot], player, arena.colliders, arena.ramps, 0.03);
  }

  // Bot must have routed around the outer corridor (|x| > 11) and crossed into the South half (z > 4) right up to the player
  const finalDist = Math.hypot(bot.x - player.x, bot.z - player.z);
  assert.ok(
    bot.z > 4.0 && finalDist < 4.5,
    `Bot starting at (0, -9.5) must flank around the central platform+ramps to reach player at (0, 9.5); ended at (${bot.x.toFixed(2)}, ${bot.z.toFixed(2)}), dist=${finalDist.toFixed(2)}`
  );
});

test('3D Wireframe Enemy Spawn Location Debug Visualization Tool: color-coded category tiers (Standard, Heavy, Boss), wireframe node geometry, and navigation compatibility across all 5 maps', () => {
  assert.equal(SPAWN_DEBUG_CATEGORY_COLORS.standard.css, '#10b981');
  assert.equal(SPAWN_DEBUG_CATEGORY_COLORS.heavy.css, '#f59e0b');
  assert.equal(SPAWN_DEBUG_CATEGORY_COLORS.boss.css, '#ef4444');

  for (const mapId of MAP_ORDER) {
    const rawZones = MAP_SPAWN_ZONES[mapId];
    const summaryNodes = getSpawnDebugNodesSummary(mapId);
    assert.equal(
      summaryNodes.length,
      rawZones.length,
      `Map ${mapId} must return debug summary nodes matching all ${rawZones.length} defined spawn zones`
    );

    // Every map must have at least one spawn node supporting Standard, Heavy, and Boss categories
    const hasStandard = summaryNodes.some((n) => n.supportsStandard);
    const hasHeavy = summaryNodes.some((n) => n.supportsHeavy);
    const hasBoss = summaryNodes.some((n) => n.supportsBoss);
    assert.ok(hasStandard, `Map ${mapId} must have at least one Standard-compatible spawn node`);
    assert.ok(hasHeavy, `Map ${mapId} must have at least one Heavy-compatible spawn node`);
    assert.ok(hasBoss, `Map ${mapId} must have at least one Boss-compatible spawn node`);

    // Build the 3D wireframe visualizer for this map
    const rig = buildSpawnZoneDebugVisualizer(mapId, false);
    assert.equal(rig.mapId, mapId);
    assert.equal(rig.root.visible, false);
    assert.equal(rig.nodes.length, rawZones.length);
    assert.equal(rig.root.children.length, rawZones.length);
    assert.ok(rig.rotatingMeshes.length >= rawZones.length);

    for (let i = 0; i < rawZones.length; i++) {
      const zone = rawZones[i];
      const expectedTier = classifySpawnZoneTier(zone);
      const nodeInfo = rig.nodes[i];
      const zoneGroup = rig.root.children[i];

      assert.equal(nodeInfo.id, zone.id);
      assert.equal(nodeInfo.primaryTier, expectedTier);
      assert.equal(nodeInfo.colorCss, SPAWN_DEBUG_CATEGORY_COLORS[expectedTier].css);

      // Verify wireframe category meshes match supported enemy categories at this spawn location
      const tierMeshes = zoneGroup.children.filter(
        (c) => Boolean(c.userData.spawnCategoryTier)
      );
      const renderedTiers = tierMeshes.map((c) => c.userData.spawnCategoryTier);

      if (nodeInfo.supportsStandard) {
        assert.ok(
          renderedTiers.includes('standard'),
          `Spawn zone ${zone.id} supporting Standard enemies must include Emerald (#10b981) wireframe octahedron`
        );
      }
      if (nodeInfo.supportsHeavy) {
        assert.ok(
          renderedTiers.includes('heavy'),
          `Spawn zone ${zone.id} supporting Heavy enemies must include Amber (#f59e0b) wireframe cage`
        );
      }
      if (nodeInfo.supportsBoss) {
        assert.ok(
          renderedTiers.includes('boss'),
          `Spawn zone ${zone.id} supporting Boss enemies must include Crimson (#ef4444) wireframe beacon`
        );
      }
    }

    // Step animation and verify visibility + rotation updates
    updateSpawnZoneDebugVisualizer(rig, 0.25, true);
    assert.equal(rig.root.visible, true);
    const firstAnimatedMesh = rig.rotatingMeshes[0];
    assert.ok(firstAnimatedMesh !== undefined);
    assert.ok(
      Math.abs(firstAnimatedMesh.rotation.y) > 0,
      'Active wireframe spawn node mesh must rotate smoothly when visible'
    );
  }
});

test('Centralized Navigation Update Manager & Stuck Recovery: groups enemies by distance and recovers stuck enemies', () => {
  const arena = buildArenaEnvironment('OUTPOST_01');
  const player = createInitialPlayerState();
  player.x = 0;
  player.y = 0;
  player.z = 0;

  const waveCfg = calculateWaveConfig(3);
  // Create 3 close enemies (<=14m), 6 medium enemies (14..26m), and 5 distant enemies (>26m)
  const enemies = [
    createEnemyBot(401, 'grunt', 0, 0, -8, waveCfg),
    createEnemyBot(402, 'rusher', 6, 0, -6, waveCfg),
    createEnemyBot(403, 'colossus', -7, 0, 6, waveCfg), // Boss always close band
    createEnemyBot(404, 'ranger', 16, 0, 0, waveCfg),
    createEnemyBot(405, 'sniper', -18, 0, 0, waveCfg),
    createEnemyBot(406, 'brute', 0, 0, 19, waveCfg),
    createEnemyBot(407, 'shield', 15, 0, 12, waveCfg),
    createEnemyBot(408, 'stalker', -15, 0, -12, waveCfg),
    createEnemyBot(409, 'enforcer', 14, 0, -14, waveCfg),
    createEnemyBot(410, 'grunt', 22, 0, 20, waveCfg),
    createEnemyBot(411, 'grunt', -22, 0, 20, waveCfg),
    createEnemyBot(412, 'grunt', 22, 0, -20, waveCfg),
    createEnemyBot(413, 'grunt', -22, 0, -20, waveCfg),
    createEnemyBot(414, 'ranger', 24, 0, 18, waveCfg),
  ];

  // Force all aiDecisionTimer <= 0 so all are due
  for (const b of enemies) {
    b.bossIntroTimer = 0;
    b.aiDecisionTimer = 0;
  }

  const navManager = createNavigationManagerState();
  stepCentralizedNavigationManager(
    navManager,
    enemies,
    player,
    arena.colliders,
    arena.ramps,
    0.016
  );

  assert.equal(navManager.closeBandCount, 3, 'Close band should count 3 enemies');
  assert.equal(navManager.mediumBandCount, 6, 'Medium band should count 6 enemies');
  assert.equal(navManager.distantBandCount, 5, 'Distant band should count 5 enemies');
  // 3 close + max 4 medium + max 2 distant = 9 paths updated in a single frame (instead of all 14)
  assert.equal(
    navManager.pathsUpdatedLastStep,
    9,
    'CentralizedNavigationManager must process all close enemies + up to 4 medium + up to 2 distant per frame'
  );

  // Test Stuck Detection & Recovery: hold an enemy stationary while it wants to advance for > 0.45s
  const stuckBot = enemies[0];
  stuckBot.x = 0;
  stuckBot.z = -12;
  stuckBot.lastProgressX = 0;
  stuckBot.lastProgressZ = -12;
  stuckBot.stuckTimer = 0.44;
  stepCentralizedNavigationManager(
    navManager,
    enemies,
    player,
    arena.colliders,
    arena.ramps,
    0.03
  );
  assert.ok(
    navManager.stuckRecoveriesTriggered >= 1 && (stuckBot.repathCount ?? 0) >= 1,
    'CentralizedNavigationManager must detect stuck enemies (>0.45s without progress) and trigger repath recovery'
  );
});

test('5 Playable Low-Poly Maps & Enemy Category Compatibility (A_Standard..G_Boss): all 5 maps build cleanly and validate spawn clearance', () => {
  const sharedMaterials = getSharedLowPolyMaterials();
  assert.ok(
    Object.keys(sharedMaterials).length <= 16,
    'Shared environment material library must stay within low-poly material budget'
  );

  for (const mapId of MAP_ORDER) {
    const spec = MAP_SPECS[mapId];
    assert.ok(spec, `Map spec must exist for ${mapId}`);
    const arena = buildArenaEnvironment(mapId);
    assert.equal(arena.mapId, mapId);
    assert.ok(arena.spawnZones.length >= 6, `${mapId} must define at least 6 spawn zones`);

    // Verify all 7 enemy navigation categories (A_Standard..G_Boss) find valid, unobstructed spawn points
    const sampleArchetypes: Array<keyof typeof ENEMY_NAVIGATION_PROFILES> = [
      'grunt',
      'rusher',
      'brute',
      'sniper',
      'exploder',
      'iron_warden',
      'colossus',
    ];
    for (const arch of sampleArchetypes) {
      const sp = selectValidatedMapSpawnPoint(
        mapId,
        arch,
        0,
        9.5,
        arena.colliders,
        []
      );
      const valid = validateSpawnPosition(
        sp.x,
        sp.y,
        sp.z,
        arch,
        arena.colliders,
        []
      );
      assert.equal(
        valid,
        true,
        `Spawn point for ${arch} on ${mapId} at (${sp.x}, ${sp.z}) must be valid`
      );
    }
  }

  const baseArena = buildArenaEnvironment('OUTPOST_01');
  const summaries = validateAllMapsAndEnemyCompatibility(
    baseArena.colliders,
    baseArena.ramps
  );
  assert.equal(summaries.length, 5, 'All 5 playable maps must be validated');
  for (const s of summaries) {
    assert.equal(s.allTestsPassed, true, `Map ${s.mapId} (${s.mapName}) failed validation`);
    assert.ok(
      s.totalTriangles <= 1200,
      `Map ${s.mapId} triangles (${s.totalTriangles}) must stay within low-poly budget`
    );
  }
});




