import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ARENA_HALF_SIZE,
  CAMERA_COMFORT_PRESETS,
  WEAPON_SPECS,
  applyMouseLook,
  applyWeaponShot,
  calculateWaveConfig,
  canFireWeapon,
  createEnemyBot,
  createInitialCameraState,
  createInitialPlayerState,
  createInitialWeaponProceduralState,
  createInitialWeaponRuntime,
  damageEnemyBot,
  stepCameraProcedural,
  stepEnemiesAI,
  stepPlayerPhysics,
  stepWeaponProcedural,
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
  countHandTriangles,
  createFirstPersonHandsRig,
  getHandSkinTexture64,
  getSleeveFabricTexture64,
  updateFirstPersonHandsRig,
} from './hands';
import { buildArenaEnvironment } from './arena';
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

test('player movement physics, seamless ramp-to-platform traversal, jumping, and AABB wall collision', () => {
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

  // Position player at base of West ramp and walk East (+X) onto the central platform
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

  // Idle breathing at 0.22 Hz when standing still (advance ~1.0s across 20 frames of 0.05s)
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
  player.yaw = 0; // facing -Z
  player.vx = 0;
  player.vz = -8.2; // sudden forward run
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

test('64x64 opaque procedural skin & sleeve textures and non-transparent DoubleSide hand materials', () => {
  const skinTex = getHandSkinTexture64();
  const sleeveTex = getSleeveFabricTexture64();

  assert.equal(skinTex.image.width, 64);
  assert.equal(skinTex.image.height, 64);
  assert.equal(sleeveTex.image.width, 64);
  assert.equal(sleeveTex.image.height, 64);

  // Verify every texel has alpha === 255 (100% opaque)
  const skinData = skinTex.image.data as Uint8Array;
  for (let i = 3; i < skinData.length; i += 4) {
    assert.equal(skinData[i], 255, 'Skin 64x64 texture must have alpha=255 on all pixels');
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
      assert.ok(mat.map, `Hand mesh ${mesh.name} must have a 64x64 texture map bound`);
    }
  });
  assert.ok(meshCount >= 28, `Expected at least 28 articulated arm/hand/finger meshes, found ${meshCount}`);
});

test('watertight arena collision geometry: player is strictly contained within perimeter walls, corners, and solid floor', () => {
  const arena = buildArenaEnvironment();
  const player = createInitialPlayerState();

  // Attempt to sprint North-West directly into the NW corner for 200 frames
  player.x = -20.0;
  player.z = -20.0;
  player.yaw = Math.PI * 0.25; // facing NW (-X, -Z)

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

test('weapon firing, distinct AR vs Revolver camera recoil, reload, and non-instant switching state machine', () => {
  const player = createInitialPlayerState();
  const weaponAnim = createInitialWeaponProceduralState();
  const cameraAnim = createInitialCameraState();
  const runtime = createInitialWeaponRuntime();

  assert.equal(canFireWeapon(weaponAnim, runtime.assault_rifle), true);
  applyWeaponShot(
    weaponAnim,
    cameraAnim,
    runtime.assault_rifle,
    WEAPON_SPECS.assault_rifle
  );
  assert.equal(runtime.assault_rifle.ammoInMag, 29);
  assert.ok(weaponAnim.recoilPosZ > 0);
  assert.ok(cameraAnim.recoilPitchVel > 0, 'Weapon shot should impart upward camera recoil pitch impulse');
  const arRecoilPitchVel = cameraAnim.recoilPitchVel;

  // Test Revolver shot imparts stronger camera recoil impulse than Assault Rifle
  const revCam = createInitialCameraState();
  const revWeap = createInitialWeaponProceduralState();
  revWeap.activeWeapon = 'revolver';
  applyWeaponShot(revWeap, revCam, runtime.revolver, WEAPON_SPECS.revolver);
  assert.ok(
    revCam.recoilPitchVel > arRecoilPitchVel * 1.8,
    'Revolver must impart significantly stronger upward camera recoil kick than Assault Rifle'
  );

  // Trigger reload
  const startedReload = triggerWeaponReload(
    weaponAnim,
    runtime.assault_rifle,
    WEAPON_SPECS.assault_rifle
  );
  assert.equal(startedReload, true);
  assert.equal(weaponAnim.phase, 'reloading');
  assert.equal(canFireWeapon(weaponAnim, runtime.assault_rifle), false);

  // Advance reload to completion
  for (let i = 0; i < 40; i++) {
    stepWeaponProcedural(weaponAnim, runtime, player, 0, 0.05);
  }
  assert.equal(weaponAnim.phase, 'ready');
  assert.equal(runtime.assault_rifle.ammoInMag, 30);
  assert.equal(runtime.assault_rifle.reserveAmmo, 119);

  // Trigger weapon switch to revolver
  const switched = triggerWeaponSwitch(weaponAnim, 'revolver');
  assert.equal(switched, true);
  assert.equal(weaponAnim.phase, 'lowering');
  assert.equal(canFireWeapon(weaponAnim, runtime.assault_rifle), false);

  // Advance through lowering and raising
  for (let i = 0; i < 15; i++) {
    stepWeaponProcedural(weaponAnim, runtime, player, 0, 0.04);
  }
  assert.equal(weaponAnim.activeWeapon, 'revolver');
  assert.equal(weaponAnim.phase, 'ready');
});

test('enemy AI obstacle avoidance, ramp pathfinding, windup telegraph, and KO topple transition', () => {
  const player = createInitialPlayerState();
  const waveCfg = calculateWaveConfig(2);
  const rusher = createEnemyBot(1, 'rusher', 0, 0, 14, waveCfg);
  const ranger = createEnemyBot(2, 'ranger', 4, 0, 10, waveCfg);
  const enforcer = createEnemyBot(3, 'enforcer', -4, 0, 8, waveCfg);
  const enemies = [rusher, ranger, enforcer];

  // Step AI so rusher enters windup telegraph
  for (let i = 0; i < 15; i++) {
    stepEnemiesAI(enemies, player, [], [], 0.04);
  }
  assert.equal(rusher.attackState, 'windup', 'Rusher in range should enter windup telegraph');

  // Deal fatal damage to rusher
  const dmgRes = damageEnemyBot(rusher, 500, player.x, player.z);
  assert.equal(dmgRes.killed, true);
  assert.equal(rusher.alive, false);
  assert.ok(rusher.koTimer > 0.3, 'Defeated enemy should have a KO topple transition timer');
});
