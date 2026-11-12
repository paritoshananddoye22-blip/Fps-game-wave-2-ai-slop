import {
  AABBCollider,
  CameraComfortPreset,
  CameraComfortSettings,
  CameraProceduralState,
  EnemyAnimationCategory,
  EnemyArchetype,
  EnemyBehaviorModule,
  EnemyBenchmarkScenarioResult,
  EnemyBotState,
  EnemyDeathStyle,
  EnemyHitDirection,
  EnemyNavCategory,
  EnemyTier,
  NavigationManagerMetrics,
  PlayerAnimationState,
  PlayerIdleVariation,
  PlayerPhysicsState,
  PlayerUpgradesState,
  RampCollider,
  ShopItemId,
  ShopItemSpec,
  WeaponId,
  WeaponProceduralState,
  WeaponRuntimeState,
  WeaponSpec,
} from './types';
import { ENEMY_NAVIGATION_PROFILES } from './maps';

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  assault_rifle: {
    id: 'assault_rifle',
    name: 'VX-47 CARBINE',
    role: 'Automatic · Medium Range',
    keyBinding: '1',
    automatic: true,
    damage: 26,
    headshotMultiplier: 1.75,
    fireRate: 9.5, // shots/sec
    magazineSize: 30,
    maxReserve: 150,
    reloadDuration: 1.45,
    switchDuration: 0.36,
    recoilKickBack: 0.042,
    recoilPitchUp: 0.032,
    recoilYawSpread: 0.009,
    screenShakeTrauma: 0.16,
    spreadBase: 6,
    spreadMove: 10,
    spreadFire: 14,
    maxTriangles: 165,
  },
  revolver: {
    id: 'revolver',
    name: 'KR-6 MAGNUM',
    role: 'Heavy Precision · High Impact',
    keyBinding: '2',
    automatic: false,
    damage: 78,
    headshotMultiplier: 2.1,
    fireRate: 2.3, // shots/sec
    magazineSize: 6,
    maxReserve: 42,
    reloadDuration: 1.65,
    switchDuration: 0.36,
    recoilKickBack: 0.095,
    recoilPitchUp: 0.145,
    recoilYawSpread: 0.014,
    screenShakeTrauma: 0.42,
    spreadBase: 3,
    spreadMove: 7,
    spreadFire: 22,
    maxTriangles: 145,
  },
  shotgun: {
    id: 'shotgun',
    name: 'SG-12 BREACHER',
    role: 'Pump-Action · Close Range',
    keyBinding: '3',
    automatic: false,
    damage: 18, // 18 damage per pellet x 8 pellets = 144 close-range burst
    headshotMultiplier: 1.65,
    fireRate: 1.28, // pump-action cadence (~0.78s per shot + pump cycle)
    magazineSize: 6,
    maxReserve: 36,
    reloadDuration: 0.46, // per individual shell insertion cycle
    switchDuration: 0.38,
    recoilKickBack: 0.115,
    recoilPitchUp: 0.165,
    recoilYawSpread: 0.018,
    screenShakeTrauma: 0.48,
    spreadBase: 14,
    spreadMove: 12,
    spreadFire: 24,
    maxTriangles: 148, // Strictly < 150 polygon/triangle budget (actual mesh = 142)
    pelletCount: 8,
    effectiveRange: 16,
  },
};

export const CAMERA_COMFORT_PRESETS: Record<
  CameraComfortPreset,
  CameraComfortSettings
> = {
  low: {
    cameraPreset: 'low',
    headBobIntensity: 0.35,
    sprintBobIntensity: 0.35,
    cameraSwayIntensity: 0.4,
    cameraRollIntensity: 0.25,
    landingEffectIntensity: 0.4,
    weaponSwayIntensity: 0.5,
    breathingIntensity: 0.35,
    cameraShakeIntensity: 0.35,
  },
  normal: {
    cameraPreset: 'normal',
    headBobIntensity: 1.0,
    sprintBobIntensity: 1.0,
    cameraSwayIntensity: 1.0,
    cameraRollIntensity: 1.0,
    landingEffectIntensity: 1.0,
    weaponSwayIntensity: 1.0,
    breathingIntensity: 1.0,
    cameraShakeIntensity: 1.0,
  },
  enhanced: {
    cameraPreset: 'enhanced',
    headBobIntensity: 1.28,
    sprintBobIntensity: 1.32,
    cameraSwayIntensity: 1.25,
    cameraRollIntensity: 1.25,
    landingEffectIntensity: 1.25,
    weaponSwayIntensity: 1.3,
    breathingIntensity: 1.2,
    cameraShakeIntensity: 1.2,
  },
};

export const PITCH_LIMIT = (85 * Math.PI) / 180; // -85 to +85 degrees
export const ARENA_HALF_SIZE = 22.45; // Strictly inside inner perimeter walls (23.0m) minus player radius (0.50m)

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/**
 * Critically damped spring integrator (delta-time independent via sub-stepping when needed).
 */
export function stepSpring(
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number
): [number, number] {
  const force = -stiffness * (value - target) - damping * velocity;
  const nextVel = velocity + force * dt;
  const nextVal = value + nextVel * dt;
  return [nextVal, nextVel];
}

export function createInitialPlayerState(): PlayerPhysicsState {
  return {
    x: 0,
    y: 0,
    z: 16, // Spawn in south clear lane facing north toward elevated center platform
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    pitch: 0,
    radius: 0.5,
    height: 1.82,
    eyeHeight: 1.68, // Section 21.2: 1.65–1.75 world units standing eye height
    grounded: true,
    isGrounded: true,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
    isMoving: false,
    isRunning: false,
    isSprinting: false,
    isAiming: false,
    isCrouching: false,
    isSliding: false,
    slideTimer: 0,
    slideCooldownTimer: 0,
    slideDirX: 0,
    slideDirZ: -1,
    crouchBlend: 0,
    moveDistanceAccum: 0,
    lastStepDistance: 0,
    stridePhase: 0,
    lastFootstepSide: 'right',
    justJumped: false,
    justLandedVelocity: 0,
    landingRecoveryTimer: 0,
    lastLandingHeavy: false,
    health: 100,
    maxHealth: 100,
    armor: 50,
    maxArmor: 100,
    hurtFlashTimer: 0,
    staggerTimer: 0,
    lastDamageAngle: 0,
    lastDamageDir: 'front',
    isDead: false,
    deathTriggered: false,
    deathAnimTimer: 0,
    animState: 'Idle',
    idleVariation: 'IdleA',
    idleVariationTimer: 0,
  };
}

export function createInitialUpgradesState(): PlayerUpgradesState {
  return {
    damageLevel: 0,
    reloadLevel: 0,
    damageMultiplier: 1.0,
    reloadSpeedMultiplier: 1.0,
  };
}

export function createInitialWeaponRuntime(): Record<WeaponId, WeaponRuntimeState> {
  return {
    assault_rifle: {
      id: 'assault_rifle',
      ammoInMag: WEAPON_SPECS.assault_rifle.magazineSize,
      reserveAmmo: 120,
      fireCooldown: 0,
    },
    revolver: {
      id: 'revolver',
      ammoInMag: WEAPON_SPECS.revolver.magazineSize,
      reserveAmmo: 36,
      fireCooldown: 0,
    },
    shotgun: {
      id: 'shotgun',
      ammoInMag: WEAPON_SPECS.shotgun.magazineSize,
      reserveAmmo: 24,
      fireCooldown: 0,
    },
  };
}

export function createInitialCameraState(): CameraProceduralState {
  return {
    smoothedBaseY: 0,
    groundedBlend: 1,
    sprintBlend: 0,

    bobTime: 0,
    bobOffsetX: 0,
    bobOffsetY: 0,
    bobOffsetZ: 0,
    bobPitch: 0,
    bobRoll: 0,

    breathTime: 0,
    breathOffsetY: 0,
    breathPitch: 0,
    breathRoll: 0,

    prevLocalVelForward: 0,
    prevLocalVelRight: 0,
    inertiaPosX: 0,
    inertiaPosZ: 0,
    inertiaVelX: 0,
    inertiaVelZ: 0,
    inertiaPitch: 0,
    inertiaRoll: 0,
    inertiaPitchVel: 0,
    inertiaRollVel: 0,

    lookSwayPosX: 0,
    lookSwayPosY: 0,
    lookSwayVelX: 0,
    lookSwayVelY: 0,
    swayYaw: 0,
    swayPitch: 0,
    swayRoll: 0,
    swayYawVel: 0,
    swayPitchVel: 0,

    strafeOffsetX: 0,
    strafeRoll: 0,
    sprintForwardOffsetZ: 0,
    sprintPitchBias: 0,

    jumpOffsetY: 0,
    jumpVelY: 0,
    jumpPitch: 0,
    jumpPitchVel: 0,
    landingOffsetY: 0,
    landingVelocityY: 0,
    landingPitch: 0,
    landingPitchVel: 0,
    landingRoll: 0,
    landingRollVel: 0,

    recoilOffsetZ: 0,
    recoilVelZ: 0,
    recoilPitch: 0,
    recoilPitchVel: 0,
    recoilRoll: 0,
    recoilRollVel: 0,
    shakeTrauma: 0,
    shakePhase: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0,
    shakeRoll: 0,

    slideRollOffset: 0,
    slideDropOffset: 0,
    damageKickPitch: 0,
    damageKickRoll: 0,
    damageDropOffset: 0,

    currentFov: 75,
  };
}

export function createInitialWeaponProceduralState(): WeaponProceduralState {
  return {
    activeWeapon: 'assault_rifle',
    queuedWeapon: 'assault_rifle',
    phase: 'ready',
    phaseTimer: 0,
    idleTime: 0,
    walkTime: 0,
    swayPosX: 0,
    swayPosY: 0,
    swayRotX: 0,
    swayRotY: 0,
    swayRotZ: 0,
    inertiaVelX: 0,
    inertiaVelY: 0,
    recoilPosZ: 0,
    recoilPosY: 0,
    recoilRotX: 0,
    recoilRotZ: 0,
    sprintBlend: 0,
    adsBlend: 0,
    slideBlend: 0,
    reloadProgress: 0,
    switchProgress: 0,
    meleeProgress: 0,
    meleeInstanceId: 0,
    meleeDamageDealtForId: 0,
    damageReactX: 0,
    damageReactY: 0,
    damageReactRoll: 0,
    deathDropBlend: 0,
    idleVariation: 'IdleA',
    idleVariationTimer: 0,
    crosshairSpread: WEAPON_SPECS.assault_rifle.spreadBase,
    triggerPress: 0,
    pumpProgress: 0,
    shellInsertProgress: 0,
    shellInsertedInCycle: false,
  };
}

/**
 * Section 21.8 & 21.9: Direct, zero-lag mouse look rotation on the main camera orientation
 * plus subtle opposing look-based secondary head & weapon sway impulses.
 */
export function applyMouseLook(
  player: PlayerPhysicsState,
  weaponAnim: WeaponProceduralState,
  cameraAnim: CameraProceduralState,
  deltaX: number,
  deltaY: number,
  sensitivity: number,
  comfort: Partial<CameraComfortSettings> = CAMERA_COMFORT_PRESETS.normal
): void {
  const radPerPixel = 0.0022 * sensitivity * (player.isAiming ? 0.65 : 1.0);
  const dYaw = -deltaX * radPerPixel;
  const dPitch = -deltaY * radPerPixel;

  // Main camera rotation directly follows mouse input with zero smoothing lag
  player.yaw += dYaw;
  player.pitch = clamp(player.pitch + dPitch, -PITCH_LIMIT, PITCH_LIMIT);

  const camSwayScale =
    (comfort.cameraSwayIntensity ?? 1.0) * (player.isAiming ? 0.35 : 1.0);
  const weapSwayScale = comfort.weaponSwayIntensity ?? 1.0;

  // Section 21.9: Look-based opposing head sway velocity impulses (clamped to <= 0.015m pos & <= 0.4 deg rot)
  cameraAnim.lookSwayVelX = clamp(
    cameraAnim.lookSwayVelX + dYaw * 0.45 * camSwayScale,
    -0.18,
    0.18
  );
  cameraAnim.lookSwayVelY = clamp(
    cameraAnim.lookSwayVelY - dPitch * 0.4 * camSwayScale,
    -0.15,
    0.15
  );
  cameraAnim.swayYawVel = clamp(
    cameraAnim.swayYawVel - dYaw * 0.65 * camSwayScale,
    -0.12,
    0.12
  );
  cameraAnim.swayPitchVel = clamp(
    cameraAnim.swayPitchVel - dPitch * 0.55 * camSwayScale,
    -0.1,
    0.1
  );

  // Feed mouse movement into weapon sway & inertia (slightly stronger visible inertia on weapon)
  weaponAnim.inertiaVelX = clamp(
    weaponAnim.inertiaVelX - dYaw * 1.4 * weapSwayScale,
    -0.14,
    0.14
  );
  weaponAnim.inertiaVelY = clamp(
    weaponAnim.inertiaVelY - dPitch * 1.4 * weapSwayScale,
    -0.11,
    0.11
  );
}

export function getSurfaceHeightAt(
  x: number,
  z: number,
  currentY: number,
  colliders: AABBCollider[],
  ramps: RampCollider[]
): number {
  let highestGround = 0;

  // Check ramps first (with footprint pad along ramp axis so ramp-to-platform transition is seamless)
  for (let i = 0; i < ramps.length; i++) {
    const r = ramps[i];
    if (
      x + 0.38 >= r.minX &&
      x - 0.38 <= r.maxX &&
      z + 0.26 >= r.minZ &&
      z - 0.26 <= r.maxZ
    ) {
      let t = 0;
      if (r.axis === 'x+') t = (x + 0.28 - r.minX) / (r.maxX - r.minX);
      else if (r.axis === 'x-') t = (r.maxX - (x - 0.28)) / (r.maxX - r.minX);
      else if (r.axis === 'z+') t = (z + 0.28 - r.minZ) / (r.maxZ - r.minZ);
      else if (r.axis === 'z-') t = (r.maxZ - (z - 0.28)) / (r.maxZ - r.minZ);
      t = clamp(t, 0, 1);
      const rampY = r.startY + t * (r.endY - r.startY);
      if (currentY + 0.72 >= rampY && rampY > highestGround) {
        highestGround = rampY;
      }
    }
  }

  // Check flat platform/cover tops
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (
      x + 0.36 >= c.minX &&
      x - 0.36 <= c.maxX &&
      z + 0.36 >= c.minZ &&
      z - 0.36 <= c.maxZ
    ) {
      if (currentY + 0.64 >= c.maxY && c.maxY > highestGround) {
        highestGround = c.maxY;
      }
    }
  }

  return highestGround;
}

export interface PlayerMoveInput {
  forward: number; // -1 to 1
  right: number; // -1 to 1
  sprintHeld: boolean;
  jumpJustPressed: boolean;
  jumpHeld: boolean;
  aimHeld: boolean;
  crouchHeld?: boolean;
}

export function stepPlayerPhysics(
  player: PlayerPhysicsState,
  input: PlayerMoveInput,
  colliders: AABBCollider[],
  ramps: RampCollider[],
  dt: number
): {
  steppedFoot: boolean;
  footSide: 'left' | 'right' | null;
  jumped: boolean;
  landedVelocity: number;
  slideStarted: boolean;
} {
  const clampedDt = Math.min(dt, 0.05);
  player.justJumped = false;
  player.justLandedVelocity = 0;
  let slideStarted = false;

  if (player.hurtFlashTimer > 0) {
    player.hurtFlashTimer = Math.max(0, player.hurtFlashTimer - clampedDt);
  }
  if (player.staggerTimer > 0) {
    player.staggerTimer = Math.max(0, player.staggerTimer - clampedDt);
  }
  if (player.landingRecoveryTimer > 0) {
    player.landingRecoveryTimer = Math.max(
      0,
      player.landingRecoveryTimer - clampedDt
    );
  }
  if (player.slideCooldownTimer > 0) {
    player.slideCooldownTimer = Math.max(
      0,
      player.slideCooldownTimer - clampedDt
    );
  }

  // Direction 05 — Single-Trigger Player Death Lock:
  // When dead, disable normal movement/jump/slide and smoothly collapse eye height
  if (player.isDead) {
    player.deathAnimTimer += clampedDt;
    player.isMoving = false;
    player.isRunning = false;
    player.isSprinting = false;
    player.isSliding = false;
    player.isAiming = false;
    player.vx = damp(player.vx, 0, 12, clampedDt);
    player.vz = damp(player.vz, 0, 12, clampedDt);
    player.eyeHeight = damp(player.eyeHeight, 0.52, 8, clampedDt);
    player.animState = 'Dead';
    return {
      steppedFoot: false,
      footSide: null,
      jumped: false,
      landedVelocity: 0,
      slideStarted: false,
    };
  }

  // Forward/Right unit vectors on XZ plane
  const sinY = Math.sin(player.yaw);
  const cosY = Math.cos(player.yaw);
  const forwardX = -sinY;
  const forwardZ = -cosY;
  const rightX = cosY;
  const rightZ = -sinY;

  let wishX = forwardX * input.forward + rightX * input.right;
  let wishZ = forwardZ * input.forward + rightZ * input.right;
  const wishLen = Math.hypot(wishX, wishZ);
  if (wishLen > 1e-4) {
    wishX /= wishLen;
    wishZ /= wishLen;
  }

  const preSpeed = Math.hypot(player.vx, player.vz);
  const wantsCrouch = Boolean(input.crouchHeld);

  // Direction 03 — Tactical Slide Initiation & Execution:
  // Pressing Crouch while sprinting or moving fast (>= 6.2 m/s) on the ground starts a 0.62s slide!
  if (
    wantsCrouch &&
    !player.isSliding &&
    player.grounded &&
    player.slideCooldownTimer <= 0 &&
    (player.isSprinting || preSpeed >= 6.8) &&
    wishLen > 0.1
  ) {
    player.isSliding = true;
    player.slideTimer = 0.62;
    player.slideCooldownTimer = 0.95;
    player.slideDirX = wishX;
    player.slideDirZ = wishZ;
    // Initial forward slide burst
    const burstSpeed = Math.max(preSpeed * 1.12, 11.4);
    player.vx = player.slideDirX * burstSpeed;
    player.vz = player.slideDirZ * burstSpeed;
    slideStarted = true;
  }

  if (player.isSliding) {
    player.slideTimer = Math.max(0, player.slideTimer - clampedDt);
    if (
      player.slideTimer <= 0 ||
      !player.grounded ||
      (!wantsCrouch && player.slideTimer < 0.42) ||
      input.jumpJustPressed
    ) {
      player.isSliding = false;
      player.slideTimer = 0;
    }
  }

  // Can sprint when moving forward/diagonally and not aiming, crouching, or sliding
  const canSprint =
    !player.isSliding &&
    input.sprintHeld &&
    input.forward > 0.1 &&
    !input.aimHeld &&
    !wantsCrouch &&
    wishLen > 0.1;
  player.isSprinting = canSprint;
  player.isCrouching = (wantsCrouch || player.isSliding) && !canSprint;
  player.isAiming = input.aimHeld && !canSprint;

  // Smooth crouch/slide vertical eyeHeight transition:
  // Standing = 1.68m, Crouching = 1.12m, Sliding = 0.86m
  const targetCrouchBlend = player.isSliding
    ? 1.46
    : player.isCrouching
    ? 1.0
    : 0.0;
  player.crouchBlend = damp(
    player.crouchBlend,
    targetCrouchBlend,
    player.isSliding ? 18 : 14,
    clampedDt
  );
  player.eyeHeight = 1.68 - player.crouchBlend * 0.56;
  player.height = 1.82 - Math.min(1.2, player.crouchBlend) * 0.52;

  const baseSpeed = 8.4;
  const sprintMultiplier = 1.42;
  const crouchMultiplier = 0.58;
  const aimMultiplier = 0.72;
  const backwardMultiplier = input.forward < -0.1 ? 0.86 : 1.0;
  const staggerMult = player.staggerTimer > 0 ? 0.58 : 1.0;

  if (player.isSliding) {
    // Smooth momentum decay during slide from initial burst down toward crouch speed
    const slideProgress = 1 - player.slideTimer / 0.62;
    const slideSpeed =
      11.4 * (1 - slideProgress * 0.58) * staggerMult;
    const targetSlideVx = player.slideDirX * slideSpeed;
    const targetSlideVz = player.slideDirZ * slideSpeed;
    player.vx = damp(player.vx, targetSlideVx, 10, clampedDt);
    player.vz = damp(player.vz, targetSlideVz, 10, clampedDt);
  } else {
    const maxSpeed =
      baseSpeed *
      staggerMult *
      (canSprint
        ? sprintMultiplier
        : player.isCrouching
        ? crouchMultiplier
        : player.isAiming
        ? aimMultiplier
        : backwardMultiplier);

    const targetVx = wishX * maxSpeed;
    const targetVz = wishZ * maxSpeed;

    // Responsive acceleration on ground, slightly lower in air
    const accelLambda = player.grounded ? (wishLen > 0.05 ? 16 : 14) : 5.5;
    player.vx = damp(player.vx, targetVx, accelLambda, clampedDt);
    player.vz = damp(player.vz, targetVz, accelLambda, clampedDt);
  }

  // Coyote & Jump Buffer
  if (player.grounded) {
    player.coyoteTimer = 0.11;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - clampedDt);
  }

  if (input.jumpJustPressed) {
    player.jumpBufferTimer = 0.12;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - clampedDt);
  }

  let jumped = false;
  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = 8.6;
    player.grounded = false;
    player.isGrounded = false;
    player.isSliding = false;
    player.slideTimer = 0;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    player.justJumped = true;
    jumped = true;
  }

  // Variable jump cut when releasing space early
  if (!input.jumpHeld && player.vy > 3.2) {
    player.vy *= 0.85;
  }

  // Apply gravity
  const gravity = 23.5;
  player.vy -= gravity * clampedDt;

  const prevVy = player.vy;

  // Pre-evaluate ramp elevation at next horizontal step so stepping from ramp onto platform never snags
  const nextX = player.x + player.vx * clampedDt;
  const nextZ = player.z + player.vz * clampedDt;
  if (player.grounded) {
    const preSupportY = getSurfaceHeightAt(nextX, nextZ, player.y, colliders, ramps);
    if (preSupportY > player.y && preSupportY - player.y <= 0.65) {
      player.y = preSupportY;
    }
  }

  // Move X & Z with multi-pass AABB + Ramp side-wall collision resolution
  player.x = nextX;
  resolveHorizontalAABB(player, colliders, ramps);

  player.z = nextZ;
  resolveHorizontalAABB(player, colliders, ramps);

  // Strictly contain player inside accessible arena bounds
  player.x = clamp(player.x, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);
  player.z = clamp(player.z, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);

  // Move Y and check floor/platform/ramp support
  const wasGrounded = player.grounded;
  player.y += player.vy * clampedDt;

  const supportY = getSurfaceHeightAt(player.x, player.z, player.y, colliders, ramps);
  let landedVelocity = 0;

  if (player.y <= supportY + 0.08 && player.vy <= 0) {
    if (!wasGrounded && prevVy < -1.8) {
      landedVelocity = Math.abs(prevVy);
      player.justLandedVelocity = landedVelocity;
      player.lastLandingHeavy = landedVelocity >= 7.2;
      player.landingRecoveryTimer = player.lastLandingHeavy ? 0.28 : 0.16;
    }
    player.y = Math.max(0, supportY);
    player.vy = 0;
    player.grounded = true;
    player.isGrounded = true;
  } else {
    if (player.y < 0) {
      player.y = 0;
      player.vy = 0;
      player.grounded = true;
      player.isGrounded = true;
    } else {
      player.grounded = false;
      player.isGrounded = false;
    }
  }

  // Track horizontal speed, movement flags, stridePhase, and separate Left/Right footsteps
  const horizSpeed = Math.hypot(player.vx, player.vz);
  player.isMoving = horizSpeed > 0.35;
  player.isRunning = player.isMoving && horizSpeed > 4.6 && !player.isCrouching;

  let steppedFoot = false;
  let footSide: 'left' | 'right' | null = null;

  if (player.grounded && !player.isSliding && horizSpeed > 0.6) {
    player.moveDistanceAccum += horizSpeed * clampedDt;
    // Cycle duration: Walking ~0.85s (step every ~2.6m), Running/Sprinting ~0.52s (step every ~2.2m)
    const stepInterval = player.isSprinting
      ? 2.2
      : player.isCrouching
      ? 2.4
      : 2.6;
    player.stridePhase += (horizSpeed / stepInterval) * Math.PI * clampedDt;

    if (player.moveDistanceAccum - player.lastStepDistance >= stepInterval) {
      player.lastStepDistance = player.moveDistanceAccum;
      steppedFoot = true;
      player.lastFootstepSide =
        player.lastFootstepSide === 'left' ? 'right' : 'left';
      footSide = player.lastFootstepSide;
    }
  }

  return { steppedFoot, footSide, jumped, landedVelocity, slideStarted };
}

export function resolveHorizontalAABB(
  player: PlayerPhysicsState,
  colliders: AABBCollider[],
  ramps: RampCollider[] = []
): void {
  const r = player.radius;

  for (let pass = 0; pass < 3; pass++) {
    player.x = clamp(player.x, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);
    player.z = clamp(player.z, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      // Ignore obstacles that the player is standing on top of (with 0.62m step-up tolerance) or completely above
      if (player.y >= c.maxY - 0.62 || player.y + player.height <= c.minY + 0.05) {
        continue;
      }

      const closestX = clamp(player.x, c.minX, c.maxX);
      const closestZ = clamp(player.z, c.minZ, c.maxZ);
      const dx = player.x - closestX;
      const dz = player.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < r * r) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = r - dist;
          player.x += (dx / dist) * overlap;
          player.z += (dz / dist) * overlap;
        } else {
          // Player center is inside AABB: push out along minimum penetration axis
          const penLeft = Math.abs(player.x - c.minX);
          const penRight = Math.abs(c.maxX - player.x);
          const penBack = Math.abs(player.z - c.minZ);
          const penFront = Math.abs(player.z - c.maxZ);
          const minPen = Math.min(penLeft, penRight, penBack, penFront);
          if (minPen === penLeft) player.x = c.minX - r;
          else if (minPen === penRight) player.x = c.maxX + r;
          else if (minPen === penBack) player.z = c.minZ - r;
          else player.z = c.maxZ + r;
        }
      }
    }

    // Prevent walking sideways into the vertical side walls of a ramp from ground level
    for (let i = 0; i < ramps.length; i++) {
      const ramp = ramps[i];
      const closestX = clamp(player.x, ramp.minX, ramp.maxX);
      const closestZ = clamp(player.z, ramp.minZ, ramp.maxZ);
      let t = 0;
      if (ramp.axis === 'x+') t = (closestX - ramp.minX) / (ramp.maxX - ramp.minX);
      else if (ramp.axis === 'x-') t = (ramp.maxX - closestX) / (ramp.maxX - ramp.minX);
      else if (ramp.axis === 'z+') t = (closestZ - ramp.minZ) / (ramp.maxZ - ramp.minZ);
      else if (ramp.axis === 'z-') t = (ramp.maxZ - closestZ) / (ramp.maxZ - ramp.minZ);
      t = clamp(t, 0, 1);
      const rampH = ramp.startY + t * (ramp.endY - ramp.startY);

      // Only treat the ramp side as a solid wall if the ramp deck at this point is > 0.62m above the player's feet
      if (player.y >= rampH - 0.62) {
        continue;
      }

      const dx = player.x - closestX;
      const dz = player.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < r * r) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = r - dist;
          player.x += (dx / dist) * overlap;
          player.z += (dz / dist) * overlap;
        } else {
          const penNorth = Math.abs(player.z - ramp.minZ);
          const penSouth = Math.abs(ramp.maxZ - player.z);
          if (penNorth <= penSouth) player.z = ramp.minZ - r;
          else player.z = ramp.maxZ + r;
        }
      }
    }
  }
}

/**
 * Section 21: Ultra-Precise First-Person Head Movement & Camera Animation System.
 * Evaluates independent, composable movement layers (Base Position, Walking/Running/Sprinting Bob,
 * Idle Breathing, Velocity/Acceleration Directional Inertia, Look Sway, Strafing/Backward Posture,
 * 3-Phase Jump & Velocity-Based Landing Impulse, and Coordinated Weapon Recoil).
 */
export function stepCameraProcedural(
  cameraAnim: CameraProceduralState,
  player: PlayerPhysicsState,
  strafeInput: number,
  dt: number,
  baseFov = 75,
  comfort: Partial<CameraComfortSettings> = CAMERA_COMFORT_PRESETS.normal
): void {
  const clampedDt = clamp(dt, 0.001, 0.05);

  // Extract user comfort multipliers
  const headBobMult = clamp(comfort.headBobIntensity ?? 1.0, 0, 1.5);
  const sprintBobMult = clamp(comfort.sprintBobIntensity ?? 1.0, 0, 1.5);
  const swayMult = clamp(comfort.cameraSwayIntensity ?? 1.0, 0, 1.5);
  const rollMult = clamp(comfort.cameraRollIntensity ?? 1.0, 0, 1.5);
  const landingMult = clamp(comfort.landingEffectIntensity ?? 1.0, 0, 1.5);
  const breathMult = clamp(comfort.breathingIntensity ?? 1.0, 0, 1.5);
  const shakeMult = clamp(comfort.cameraShakeIntensity ?? 1.0, 0, 1.5);

  const adsCalm = player.isAiming ? 0.35 : 1.0;

  // Decompose world velocity into player-local forward (-Z) and right (+X) components
  const sinY = Math.sin(player.yaw);
  const cosY = Math.cos(player.yaw);
  const forwardX = -sinY;
  const forwardZ = -cosY;
  const rightX = cosY;
  const rightZ = -sinY;

  const localVelForward = player.vx * forwardX + player.vz * forwardZ;
  const localVelRight = player.vx * rightX + player.vz * rightZ;
  const horizSpeed = Math.hypot(player.vx, player.vz);

  // ---------------------------------------------------------------------------
  // 21.2 BASE HEAD POSITION & STATE BLENDING
  // ---------------------------------------------------------------------------
  if (player.grounded) {
    cameraAnim.smoothedBaseY = damp(cameraAnim.smoothedBaseY, player.y, 22, clampedDt);
    // Prevent camera from ever lagging more than 6cm below physics feet on steep ramps
    cameraAnim.smoothedBaseY = clamp(
      cameraAnim.smoothedBaseY,
      Math.max(0, player.y - 0.06),
      player.y + 0.06
    );
  } else {
    cameraAnim.smoothedBaseY = Math.max(0, player.y);
  }

  cameraAnim.groundedBlend = damp(
    cameraAnim.groundedBlend,
    player.grounded ? 1 : 0,
    14,
    clampedDt
  );
  const isActivelySprinting = player.isSprinting && player.grounded && horizSpeed > 5.0;
  cameraAnim.sprintBlend = damp(
    cameraAnim.sprintBlend,
    isActivelySprinting ? 1 : 0,
    9.5,
    clampedDt
  );

  // ---------------------------------------------------------------------------
  // 21.3, 21.4, 21.5, 21.10, 21.11 WALKING, RUNNING & SPRINTING HEAD BOB
  // Continuous velocity-dependent phase without random noise or abrupt resets
  // ---------------------------------------------------------------------------
  const walkBlend = clamp(horizSpeed / 4.2, 0, 1);
  const runBlend = clamp((horizSpeed - 3.8) / 4.6, 0, 1);
  const sBlend = cameraAnim.sprintBlend;
  const isMovingBackward = localVelForward < -0.25;
  const backwardScale = isMovingBackward ? 0.78 : 1.0;

  if (player.grounded && horizSpeed > 0.15) {
    // Phase advances strictly proportionally to actual horizontal speed * stride frequency
    const strideFreq = 1.28 + runBlend * 0.12 + sBlend * 0.14;
    cameraAnim.bobTime += horizSpeed * strideFreq * clampedDt;
  }

  // Blend vertical & horizontal amplitudes across Walk (0.032 / 0.012), Run (0.052 / 0.018), and Sprint (0.066 / 0.023)
  const baseAmpY =
    walkBlend * (0.032 + runBlend * 0.020) * (1 - sBlend) * headBobMult +
    sBlend * 0.066 * sprintBobMult;
  const baseAmpX =
    walkBlend * (0.012 + runBlend * 0.006) * (1 - sBlend) * headBobMult +
    sBlend * 0.023 * sprintBobMult;
  const basePitchAmp =
    walkBlend * (0.0078 + runBlend * 0.0058) * (1 - sBlend) * headBobMult +
    sBlend * 0.0165 * sprintBobMult;
  const baseRollAmp =
    walkBlend * (0.0072 + runBlend * 0.0042) * (1 - sBlend) * headBobMult +
    sBlend * 0.0136 * sprintBobMult;

  const activeBobScale = cameraAnim.groundedBlend * backwardScale * adsCalm;

  // Vertical bob: upward during mid-stance (sin > 0), gentle downward cushion at foot contact
  const rawStepSin = Math.sin(cameraAnim.bobTime);
  const stepVertWave = rawStepSin - 0.15 * Math.cos(cameraAnim.bobTime * 2);
  // Horizontal bob: half-frequency alternating left-right shift per step
  const stepHorizWave = Math.sin(cameraAnim.bobTime * 0.5);

  const targetBobX = stepHorizWave * baseAmpX * activeBobScale;
  const targetBobY = stepVertWave * baseAmpY * activeBobScale;
  // Backward movement adds a subtle +0.008m backward posture shift; running adds tiny forward rhythm
  const targetBobZ =
    (isMovingBackward ? 0.008 * walkBlend : -0.004 * runBlend) * activeBobScale;
  const targetBobPitch =
    (-Math.sin(cameraAnim.bobTime) * basePitchAmp - runBlend * 0.0045) *
    activeBobScale;
  const targetBobRoll =
    Math.cos(cameraAnim.bobTime * 0.5) * baseRollAmp * activeBobScale * rollMult;

  cameraAnim.bobOffsetX = damp(cameraAnim.bobOffsetX, targetBobX, 15, clampedDt);
  cameraAnim.bobOffsetY = damp(cameraAnim.bobOffsetY, targetBobY, 15, clampedDt);
  cameraAnim.bobOffsetZ = damp(cameraAnim.bobOffsetZ, targetBobZ, 12, clampedDt);
  cameraAnim.bobPitch = damp(cameraAnim.bobPitch, targetBobPitch, 15, clampedDt);
  cameraAnim.bobRoll = damp(cameraAnim.bobRoll, targetBobRoll, 15, clampedDt);

  // Section 21.5 Sprinting forward offset (0.034m forward = -0.034 Z) and downward pitch bias (~1.35 deg = -0.0235 rad)
  const targetSprintZ = -0.034 * sBlend * sprintBobMult;
  const targetSprintPitch = -0.0235 * sBlend * sprintBobMult;
  cameraAnim.sprintForwardOffsetZ = damp(
    cameraAnim.sprintForwardOffsetZ,
    targetSprintZ,
    9,
    clampedDt
  );
  cameraAnim.sprintPitchBias = damp(
    cameraAnim.sprintPitchBias,
    targetSprintPitch,
    9,
    clampedDt
  );

  // ---------------------------------------------------------------------------
  // 21.6 IDLE HEAD BREATHING (0.22 Hz slow organic inhalation/exhalation)
  // Attenuated during intense sprinting
  // ---------------------------------------------------------------------------
  const breathFreqHz = 0.22;
  cameraAnim.breathTime += breathFreqHz * Math.PI * 2 * clampedDt;
  const sprintBreathAtten = 1 - sBlend * 0.72;
  const breathScale = breathMult * sprintBreathAtten * adsCalm;

  cameraAnim.breathOffsetY =
    Math.sin(cameraAnim.breathTime) * 0.0045 * breathScale;
  cameraAnim.breathPitch =
    Math.sin(cameraAnim.breathTime - 0.35) * 0.0016 * breathScale; // ~0.09 deg
  cameraAnim.breathRoll =
    Math.cos(cameraAnim.breathTime * 0.5) * 0.0008 * breathScale * rollMult;

  // ---------------------------------------------------------------------------
  // 21.7 HEAD INERTIA & DIRECTIONAL MOMENTUM + 21.10 STRAFING SWAY
  // Driven by actual velocity and acceleration via critically damped springs
  // ---------------------------------------------------------------------------
  const accelForward = clamp(
    (localVelForward - cameraAnim.prevLocalVelForward) / clampedDt,
    -45,
    45
  );
  const accelRight = clamp(
    (localVelRight - cameraAnim.prevLocalVelRight) / clampedDt,
    -45,
    45
  );
  cameraAnim.prevLocalVelForward = localVelForward;
  cameraAnim.prevLocalVelRight = localVelRight;

  // Accelerating forward (+accelForward) creates subtle backward head inertia (+Z);
  // Decelerating (-accelForward) creates subtle forward settling (-Z).
  const targetInertiaZ = clamp(
    accelForward * 0.00055 * swayMult * adsCalm,
    -0.02,
    0.02
  );
  const targetInertiaX = clamp(
    -accelRight * 0.0005 * swayMult * adsCalm,
    -0.018,
    0.018
  );
  const targetInertiaPitch = clamp(
    accelForward * 0.00018 * swayMult * adsCalm,
    -0.0075,
    0.0075
  );
  const targetInertiaRoll = clamp(
    -accelRight * 0.00022 * swayMult * rollMult * adsCalm,
    -0.0085,
    0.0085
  );

  [cameraAnim.inertiaPosX, cameraAnim.inertiaVelX] = stepSpring(
    cameraAnim.inertiaPosX,
    cameraAnim.inertiaVelX,
    targetInertiaX,
    120,
    22,
    clampedDt
  );
  cameraAnim.inertiaPosX = clamp(cameraAnim.inertiaPosX, -0.022, 0.022);

  [cameraAnim.inertiaPosZ, cameraAnim.inertiaVelZ] = stepSpring(
    cameraAnim.inertiaPosZ,
    cameraAnim.inertiaVelZ,
    targetInertiaZ,
    120,
    22,
    clampedDt
  );
  cameraAnim.inertiaPosZ = clamp(cameraAnim.inertiaPosZ, -0.024, 0.024);

  [cameraAnim.inertiaPitch, cameraAnim.inertiaPitchVel] = stepSpring(
    cameraAnim.inertiaPitch,
    cameraAnim.inertiaPitchVel,
    targetInertiaPitch,
    130,
    23,
    clampedDt
  );
  cameraAnim.inertiaPitch = clamp(cameraAnim.inertiaPitch, -0.009, 0.009);

  [cameraAnim.inertiaRoll, cameraAnim.inertiaRollVel] = stepSpring(
    cameraAnim.inertiaRoll,
    cameraAnim.inertiaRollVel,
    targetInertiaRoll,
    130,
    23,
    clampedDt
  );
  cameraAnim.inertiaRoll = clamp(cameraAnim.inertiaRoll, -0.01, 0.01);

  // Section 21.10 & 21.14 Continuous strafing horizontal shift & subtle roll (0.3–0.7 deg normal)
  const normStrafeVel = clamp(
    localVelRight / 8.4 + strafeInput * 0.25,
    -1.1,
    1.1
  );
  const targetStrafeX = normStrafeVel * 0.01 * swayMult * adsCalm;
  const targetStrafeRoll =
    -normStrafeVel * 0.0088 * rollMult * adsCalm * (1 + sBlend * 0.25); // ~0.5 deg

  cameraAnim.strafeOffsetX = damp(
    cameraAnim.strafeOffsetX,
    targetStrafeX,
    11,
    clampedDt
  );
  cameraAnim.strafeRoll = damp(
    cameraAnim.strafeRoll,
    targetStrafeRoll,
    11,
    clampedDt
  );

  // ---------------------------------------------------------------------------
  // 21.9 LOOK-BASED HEAD SWAY SPRING RECOVERY
  // ---------------------------------------------------------------------------
  [cameraAnim.lookSwayPosX, cameraAnim.lookSwayVelX] = stepSpring(
    cameraAnim.lookSwayPosX,
    cameraAnim.lookSwayVelX,
    0,
    155,
    25,
    clampedDt
  );
  cameraAnim.lookSwayPosX = clamp(cameraAnim.lookSwayPosX, -0.012, 0.012);

  [cameraAnim.lookSwayPosY, cameraAnim.lookSwayVelY] = stepSpring(
    cameraAnim.lookSwayPosY,
    cameraAnim.lookSwayVelY,
    0,
    155,
    25,
    clampedDt
  );
  cameraAnim.lookSwayPosY = clamp(cameraAnim.lookSwayPosY, -0.012, 0.012);

  [cameraAnim.swayYaw, cameraAnim.swayYawVel] = stepSpring(
    cameraAnim.swayYaw,
    cameraAnim.swayYawVel,
    0,
    165,
    26,
    clampedDt
  );
  cameraAnim.swayYaw = clamp(cameraAnim.swayYaw, -0.006, 0.006); // <= 0.35 deg

  [cameraAnim.swayPitch, cameraAnim.swayPitchVel] = stepSpring(
    cameraAnim.swayPitch,
    cameraAnim.swayPitchVel,
    0,
    165,
    26,
    clampedDt
  );
  cameraAnim.swayPitch = clamp(cameraAnim.swayPitch, -0.006, 0.006);

  // Combine roll contributions into swayRoll for backwards-compatible inspection
  cameraAnim.swayRoll =
    cameraAnim.bobRoll +
    cameraAnim.strafeRoll +
    cameraAnim.inertiaRoll +
    cameraAnim.breathRoll;

  // ---------------------------------------------------------------------------
  // 21.12 JUMP HEAD ANIMATION (Phase 1 Takeoff, Phase 2 Airborne, Phase 3 Descent)
  // ---------------------------------------------------------------------------
  if (player.justJumped) {
    cameraAnim.jumpVelY += 0.26 * landingMult;
    cameraAnim.jumpPitchVel += 0.075 * landingMult;
    player.justJumped = false;
  }
  // While airborne, subtle vertical response tracks upward takeoff only (no artificial downward dip before landing)
  const targetJumpY = !player.grounded && player.vy > 0
    ? clamp(player.vy * 0.0018, 0, 0.016) * landingMult
    : 0;
  [cameraAnim.jumpOffsetY, cameraAnim.jumpVelY] = stepSpring(
    cameraAnim.jumpOffsetY,
    cameraAnim.jumpVelY,
    targetJumpY,
    130,
    22,
    clampedDt
  );
  cameraAnim.jumpOffsetY = clamp(cameraAnim.jumpOffsetY, -0.01, 0.025);

  [cameraAnim.jumpPitch, cameraAnim.jumpPitchVel] = stepSpring(
    cameraAnim.jumpPitch,
    cameraAnim.jumpPitchVel,
    0,
    140,
    23,
    clampedDt
  );
  cameraAnim.jumpPitch = clamp(cameraAnim.jumpPitch, -0.008, 0.012);

  // ---------------------------------------------------------------------------
  // 21.13 ADVANCED LANDING CAMERA RESPONSE (Single-event velocity-scaled impulse)
  // Light: 0.015–0.025, Normal: 0.025–0.045, Heavy: 0.045–0.070 units
  // ---------------------------------------------------------------------------
  if (player.justLandedVelocity > 0) {
    const impactSpeed = clamp(player.justLandedVelocity, 2.0, 16.0);
    const dipVel = clamp(impactSpeed * 0.082, 0.18, 0.88) * landingMult;
    cameraAnim.landingVelocityY = -dipVel;
    cameraAnim.landingPitchVel =
      -clamp(impactSpeed * 0.019, 0.04, 0.22) * landingMult;
    const rollSign = localVelRight >= 0 ? 1 : -1;
    cameraAnim.landingRollVel =
      rollSign *
      clamp(impactSpeed * 0.022, 0.04, 0.24) *
      landingMult *
      rollMult;
    player.justLandedVelocity = 0;
  }

  [cameraAnim.landingOffsetY, cameraAnim.landingVelocityY] = stepSpring(
    cameraAnim.landingOffsetY,
    cameraAnim.landingVelocityY,
    0,
    165,
    26,
    clampedDt
  );
  cameraAnim.landingOffsetY = clamp(cameraAnim.landingOffsetY, -0.07, 0.02);

  [cameraAnim.landingPitch, cameraAnim.landingPitchVel] = stepSpring(
    cameraAnim.landingPitch,
    cameraAnim.landingPitchVel,
    0,
    165,
    26,
    clampedDt
  );
  cameraAnim.landingPitch = clamp(cameraAnim.landingPitch, -0.024, 0.01);

  [cameraAnim.landingRoll, cameraAnim.landingRollVel] = stepSpring(
    cameraAnim.landingRoll,
    cameraAnim.landingRollVel,
    0,
    155,
    25,
    clampedDt
  );
  cameraAnim.landingRoll = clamp(cameraAnim.landingRoll, -0.026, 0.026); // <= 1.5 deg

  // ---------------------------------------------------------------------------
  // 21.16 CAMERA RECOIL SPRING & TRAUMA SHAKE
  // ---------------------------------------------------------------------------
  [cameraAnim.recoilOffsetZ, cameraAnim.recoilVelZ] = stepSpring(
    cameraAnim.recoilOffsetZ,
    cameraAnim.recoilVelZ,
    0,
    160,
    25,
    clampedDt
  );
  cameraAnim.recoilOffsetZ = clamp(cameraAnim.recoilOffsetZ, -0.005, 0.032);

  [cameraAnim.recoilPitch, cameraAnim.recoilPitchVel] = stepSpring(
    cameraAnim.recoilPitch,
    cameraAnim.recoilPitchVel,
    0,
    150,
    24,
    clampedDt
  );
  cameraAnim.recoilPitch = clamp(cameraAnim.recoilPitch, -0.005, 0.048);

  [cameraAnim.recoilRoll, cameraAnim.recoilRollVel] = stepSpring(
    cameraAnim.recoilRoll,
    cameraAnim.recoilRollVel,
    0,
    160,
    25,
    clampedDt
  );
  cameraAnim.recoilRoll = clamp(cameraAnim.recoilRoll, -0.015, 0.015);

  if (cameraAnim.shakeTrauma > 0) {
    cameraAnim.shakePhase += clampedDt * 42;
    const shake = cameraAnim.shakeTrauma * cameraAnim.shakeTrauma * shakeMult;
    cameraAnim.shakeOffsetX = Math.sin(cameraAnim.shakePhase * 1.7) * shake * 0.016;
    cameraAnim.shakeOffsetY = Math.cos(cameraAnim.shakePhase * 2.3) * shake * 0.016;
    cameraAnim.shakeRoll =
      Math.sin(cameraAnim.shakePhase * 3.1) * shake * 0.012 * rollMult;
    cameraAnim.shakeTrauma = Math.max(0, cameraAnim.shakeTrauma - clampedDt * 3.2);
  } else {
    cameraAnim.shakeOffsetX = 0;
    cameraAnim.shakeOffsetY = 0;
    cameraAnim.shakeRoll = 0;
  }

  // ---------------------------------------------------------------------------
  // TACTICAL SLIDE, DIRECTIONAL DAMAGE & DEATH CAMERA CHANNELS
  // ---------------------------------------------------------------------------
  cameraAnim.slideRollOffset = damp(
    cameraAnim.slideRollOffset,
    player.isSliding ? -0.048 * rollMult : 0,
    14,
    clampedDt
  );
  cameraAnim.slideDropOffset = damp(
    cameraAnim.slideDropOffset,
    player.isSliding ? -0.04 : 0,
    14,
    clampedDt
  );
  cameraAnim.damageKickPitch = damp(cameraAnim.damageKickPitch, 0, 14, clampedDt);
  cameraAnim.damageKickRoll = damp(cameraAnim.damageKickRoll, 0, 14, clampedDt);
  cameraAnim.damageDropOffset = damp(
    cameraAnim.damageDropOffset,
    player.isDead ? -0.35 : 0,
    12,
    clampedDt
  );

  // Combine roll contributions into swayRoll for backwards-compatible inspection
  cameraAnim.swayRoll =
    cameraAnim.bobRoll +
    cameraAnim.strafeRoll +
    cameraAnim.inertiaRoll +
    cameraAnim.breathRoll +
    cameraAnim.slideRollOffset +
    cameraAnim.damageKickRoll;

  // ---------------------------------------------------------------------------
  // DYNAMIC FOV (anchored to user's baseFov setting, widens on sprint/slide, zooms on ADS)
  // ---------------------------------------------------------------------------
  const clampedBaseFov = clamp(baseFov, 60, 105);
  const targetFov =
    clampedBaseFov +
    cameraAnim.sprintBlend * 5.5 +
    (player.isSliding ? 4.5 : 0) -
    (player.isAiming ? 14 : 0);
  cameraAnim.currentFov = damp(
    cameraAnim.currentFov,
    clamp(targetFov, 45, 112),
    13,
    clampedDt
  );
}

/**
 * Safely cancels an in-progress weapon reload without granting ammunition
 * (e.g., when interrupted by a weapon switch, melee attack, or death).
 */
export function cancelWeaponReload(weaponAnim: WeaponProceduralState): boolean {
  if (weaponAnim.phase === 'reloading') {
    weaponAnim.phase = 'ready';
    weaponAnim.phaseTimer = 0;
    weaponAnim.reloadProgress = 0;
    weaponAnim.shellInsertProgress = 0;
    weaponAnim.shellInsertedInCycle = false;
    return true;
  }
  return false;
}

export function triggerWeaponSwitch(
  weaponAnim: WeaponProceduralState,
  targetWeapon: WeaponId
): boolean {
  if (weaponAnim.activeWeapon === targetWeapon && weaponAnim.queuedWeapon === targetWeapon) {
    return false;
  }
  if (weaponAnim.phase === 'lowering' && weaponAnim.queuedWeapon === targetWeapon) {
    return false;
  }
  // Interrupt active reload safely so incomplete reload never grants unconfirmed ammo
  cancelWeaponReload(weaponAnim);
  weaponAnim.queuedWeapon = targetWeapon;
  weaponAnim.pumpProgress = 0;
  if (weaponAnim.phase !== 'lowering') {
    weaponAnim.phase = 'lowering';
    weaponAnim.phaseTimer = 0;
    weaponAnim.reloadProgress = 0;
    weaponAnim.meleeProgress = 0;
  }
  return true;
}

export function triggerWeaponReload(
  weaponAnim: WeaponProceduralState,
  runtime: WeaponRuntimeState,
  spec: WeaponSpec
): boolean {
  if (
    weaponAnim.phase !== 'ready' ||
    runtime.ammoInMag >= spec.magazineSize ||
    runtime.reserveAmmo <= 0
  ) {
    return false;
  }
  weaponAnim.phase = 'reloading';
  weaponAnim.phaseTimer = 0;
  weaponAnim.reloadProgress = 0;
  weaponAnim.shellInsertProgress = 0;
  weaponAnim.shellInsertedInCycle = false;
  weaponAnim.pumpProgress = 0;
  return true;
}

/**
 * Direction 04 — Triggers a 5-stage First-Person Melee Attack (`[V]` or `[F]`):
 * 1. Preparation -> 2. Anticipation -> 3. Fast Strike -> 4. Contact Frame -> 5. Smooth Recovery.
 * Safely cancels any in-progress reload and increments `meleeInstanceId` so melee damage fires once.
 */
export function triggerWeaponMelee(
  weaponAnim: WeaponProceduralState
): boolean {
  if (
    weaponAnim.phase === 'melee' ||
    weaponAnim.phase === 'lowering' ||
    weaponAnim.phase === 'raising'
  ) {
    return false;
  }
  cancelWeaponReload(weaponAnim);
  weaponAnim.pumpProgress = 0;
  weaponAnim.phase = 'melee';
  weaponAnim.phaseTimer = 0;
  weaponAnim.meleeProgress = 0.001;
  weaponAnim.meleeInstanceId += 1;
  return true;
}

export function canFireWeapon(
  weaponAnim: WeaponProceduralState,
  runtime: WeaponRuntimeState
): boolean {
  const isShotgunInterruptableReload =
    weaponAnim.activeWeapon === 'shotgun' && weaponAnim.phase === 'reloading';
  return (
    (weaponAnim.phase === 'ready' || isShotgunInterruptableReload) &&
    runtime.fireCooldown <= 0 &&
    runtime.ammoInMag > 0
  );
}

/**
 * Calculates close-range multi-pellet shotgun damage with distance falloff.
 * Devastating at <= 6.5m, controlled falloff up to effectiveRange (16m), 35% floor beyond.
 */
export function calculateShotgunPelletDamage(
  basePelletDamage: number,
  distance: number,
  effectiveRange = 16,
  isHeadshot = false,
  headshotMultiplier = 1.65,
  damageMultiplier = 1.0
): number {
  const closeThreshold = 6.5;
  let falloff = 1.0;
  if (distance > closeThreshold) {
    const t = clamp(
      (distance - closeThreshold) / Math.max(1, effectiveRange - closeThreshold),
      0,
      1
    );
    falloff = 1.0 - t * 0.65; // 100% down to 35% at effectiveRange+
  }
  const raw =
    basePelletDamage *
    falloff *
    damageMultiplier *
    (isHeadshot ? headshotMultiplier : 1.0);
  return Math.max(1, Math.round(raw));
}

/**
 * Section 21.16: Coordinated Weapon & Camera Recoil Integration.
 * Assault Rifle: Small upward camera impulse, tiny backward impulse, controlled auto-fire response.
 * Revolver: Stronger upward impulse, distinct backward impulse, smooth spring return.
 * Shotgun: Heavy close-range upward & backward kick with synchronized pump-action presentation.
 */
export function applyWeaponShot(
  weaponAnim: WeaponProceduralState,
  cameraAnim: CameraProceduralState,
  runtime: WeaponRuntimeState,
  spec: WeaponSpec
): void {
  // If firing interrupts a shotgun shell-by-shell reload, cancel reload cleanly and preserve already-inserted shells
  if (weaponAnim.phase === 'reloading') {
    cancelWeaponReload(weaponAnim);
  }

  runtime.ammoInMag = Math.max(0, runtime.ammoInMag - 1);
  runtime.fireCooldown = 1 / spec.fireRate;

  const adsControl = 1 - weaponAnim.adsBlend * 0.28;
  const isRevolver = spec.id === 'revolver';
  const isShotgun = spec.id === 'shotgun';

  // Weapon viewmodel recoil
  weaponAnim.recoilPosZ = clamp(
    weaponAnim.recoilPosZ + spec.recoilKickBack * adsControl,
    0,
    spec.recoilKickBack * 2.2
  );
  weaponAnim.recoilPosY = clamp(
    weaponAnim.recoilPosY + spec.recoilKickBack * 0.28 * adsControl,
    0,
    0.048
  );
  weaponAnim.recoilRotX = clamp(
    weaponAnim.recoilRotX + spec.recoilPitchUp * adsControl,
    0,
    spec.recoilPitchUp * 2.4
  );
  weaponAnim.recoilRotZ +=
    (Math.random() - 0.5) * spec.recoilYawSpread * 2.5 * adsControl;

  // Section 21.16 Coordinated Camera Recoil Impulses (distinct AR vs Revolver vs Shotgun profiles)
  if (isShotgun) {
    cameraAnim.recoilPitchVel = clamp(
      cameraAnim.recoilPitchVel + 0.42 * adsControl,
      -0.1,
      0.65
    );
    cameraAnim.recoilVelZ = clamp(
      cameraAnim.recoilVelZ + 0.24 * adsControl,
      -0.05,
      0.38
    );
    cameraAnim.recoilRollVel +=
      (Math.random() - 0.5) * 0.16 * adsControl;
    weaponAnim.pumpProgress = 0.001; // Initiate post-shot pump cycle
  } else if (isRevolver) {
    cameraAnim.recoilPitchVel = clamp(
      cameraAnim.recoilPitchVel + 0.34 * adsControl,
      -0.1,
      0.55
    );
    cameraAnim.recoilVelZ = clamp(
      cameraAnim.recoilVelZ + 0.18 * adsControl,
      -0.05,
      0.32
    );
    cameraAnim.recoilRollVel +=
      (Math.random() - 0.5) * 0.12 * adsControl;
  } else {
    cameraAnim.recoilPitchVel = clamp(
      cameraAnim.recoilPitchVel + 0.11 * adsControl,
      -0.05,
      0.24
    );
    cameraAnim.recoilVelZ = clamp(
      cameraAnim.recoilVelZ + 0.065 * adsControl,
      -0.02,
      0.14
    );
    cameraAnim.recoilRollVel +=
      (Math.random() - 0.5) * 0.045 * adsControl;
  }

  // Expand crosshair
  weaponAnim.crosshairSpread = clamp(
    weaponAnim.crosshairSpread + spec.spreadFire * adsControl,
    spec.spreadBase * (1 - weaponAnim.adsBlend * 0.7),
    42
  );

  // Subtle weapon-specific trauma
  cameraAnim.shakeTrauma = clamp(
    cameraAnim.shakeTrauma + spec.screenShakeTrauma,
    0,
    0.85
  );

  // Trigger finger press articulation impulse
  weaponAnim.triggerPress = 1.0;
}

/**
 * Resolves the authoritative 18-State Player Animation State (`PlayerAnimationState`)
 * according to the strict priority order:
 * 1. Dead
 * 2. Staggered / Heavy Damage
 * 3. Damaged
 * 4. Sliding
 * 5. Reloading / WeaponSwitching / MeleeAttacking
 * 6. Shooting
 * 7. Landing / JumpStart / JumpAscending / Falling / Airborne
 * 8. Sprinting / Running / Walking / Crouching
 * 9. Idle
 */
export function resolvePlayerAnimationState(
  player: PlayerPhysicsState,
  weaponAnim: WeaponProceduralState,
  activeRuntime?: WeaponRuntimeState
): PlayerAnimationState {
  if (player.isDead || player.health <= 0) return 'Dead';
  if (player.staggerTimer > 0.05) return 'Staggered';
  if (player.hurtFlashTimer > 0.15) return 'Damaged';
  if (player.isSliding) return 'Sliding';
  if (weaponAnim.phase === 'reloading') return 'Reloading';
  if (weaponAnim.phase === 'lowering' || weaponAnim.phase === 'raising') {
    return 'WeaponSwitching';
  }
  if (weaponAnim.phase === 'melee') return 'MeleeAttacking';
  if (
    weaponAnim.triggerPress > 0.35 ||
    (activeRuntime && activeRuntime.fireCooldown > 0.02)
  ) {
    return 'Shooting';
  }
  if (!player.grounded) {
    if (player.vy > 5.8) return 'JumpStart';
    if (player.vy > 0.8) return 'JumpAscending';
    if (player.vy < -2.2) return 'Falling';
    return 'Airborne';
  }
  if (player.landingRecoveryTimer > 0.02) return 'Landing';

  const horizSpeed = Math.hypot(player.vx, player.vz);
  if (player.isSprinting && horizSpeed > 5.2) return 'Sprinting';
  if (player.isCrouching) return 'Crouching';
  if (horizSpeed > 4.6) return 'Running';
  if (horizSpeed > 0.35) return 'Walking';
  return 'Idle';
}

export function stepWeaponProcedural(
  weaponAnim: WeaponProceduralState,
  weaponsRuntime: Record<WeaponId, WeaponRuntimeState>,
  player: PlayerPhysicsState,
  strafeInput: number,
  dt: number,
  weaponSwayIntensity = 1.0
): {
  reloadCompleted: boolean;
  switchedTo: WeaponId | null;
  meleeHitTriggered: boolean;
  shellInserted: boolean;
  pumpCycled: boolean;
} {
  const clampedDt = Math.min(dt, 0.05);
  let reloadCompleted = false;
  let switchedTo: WeaponId | null = null;
  let meleeHitTriggered = false;
  let shellInserted = false;
  let pumpCycled = false;

  // Cooldowns for all 3 weapons
  weaponsRuntime.assault_rifle.fireCooldown = Math.max(
    0,
    weaponsRuntime.assault_rifle.fireCooldown - clampedDt
  );
  weaponsRuntime.revolver.fireCooldown = Math.max(
    0,
    weaponsRuntime.revolver.fireCooldown - clampedDt
  );
  if (weaponsRuntime.shotgun) {
    weaponsRuntime.shotgun.fireCooldown = Math.max(
      0,
      weaponsRuntime.shotgun.fireCooldown - clampedDt
    );
  }

  const spec = WEAPON_SPECS[weaponAnim.activeWeapon];
  const activeRuntime = weaponsRuntime[weaponAnim.activeWeapon];
  const meleeDuration = 0.46;

  // Step post-shot or post-reload Shotgun Pump Presentation (`SG_PUMP_PRESENTATION`)
  if (weaponAnim.activeWeapon === 'shotgun' && weaponAnim.phase === 'ready') {
    const sgCool = weaponsRuntime.shotgun?.fireCooldown ?? 0;
    const totalShotPeriod = 1 / WEAPON_SPECS.shotgun.fireRate; // ~0.781s
    const elapsedSinceShot = totalShotPeriod - sgCool;
    if (sgCool > 0 && elapsedSinceShot >= 0.14 && elapsedSinceShot <= 0.58) {
      const prevPump = weaponAnim.pumpProgress;
      weaponAnim.pumpProgress = clamp((elapsedSinceShot - 0.14) / 0.44, 0, 1);
      if (prevPump < 0.25 && weaponAnim.pumpProgress >= 0.25) {
        pumpCycled = true;
      }
    } else if (weaponAnim.pumpProgress > 0 && sgCool <= 0) {
      weaponAnim.pumpProgress = damp(weaponAnim.pumpProgress, 0, 14, clampedDt);
      if (weaponAnim.pumpProgress < 0.01) weaponAnim.pumpProgress = 0;
    } else if (sgCool <= 0) {
      weaponAnim.pumpProgress = 0;
    }
  } else {
    weaponAnim.pumpProgress = 0;
  }

  // State machine for switching, reloading (including Shotgun individual shell reload) & 5-stage melee attack
  const halfSwitch = spec.switchDuration * 0.5;
  if (weaponAnim.phase === 'lowering') {
    weaponAnim.phaseTimer += clampedDt;
    weaponAnim.switchProgress = clamp(weaponAnim.phaseTimer / halfSwitch, 0, 1);
    if (weaponAnim.phaseTimer >= halfSwitch) {
      weaponAnim.activeWeapon = weaponAnim.queuedWeapon;
      switchedTo = weaponAnim.activeWeapon;
      weaponAnim.phase = 'raising';
      weaponAnim.phaseTimer = 0;
      weaponAnim.switchProgress = 1;
    }
  } else if (weaponAnim.phase === 'raising') {
    weaponAnim.phaseTimer += clampedDt;
    weaponAnim.switchProgress = clamp(1 - weaponAnim.phaseTimer / halfSwitch, 0, 1);
    if (weaponAnim.phaseTimer >= halfSwitch) {
      weaponAnim.phase = 'ready';
      weaponAnim.phaseTimer = 0;
      weaponAnim.switchProgress = 0;
    }
  } else if (weaponAnim.phase === 'reloading') {
    weaponAnim.phaseTimer += clampedDt;
    if (weaponAnim.activeWeapon === 'shotgun') {
      // Individual Shell-by-Shell Reload (`SG_RELOAD_INSERT` -> `SG_RELOAD_LOOP` -> `SG_RELOAD_END`)
      const cycleProgress = clamp(weaponAnim.phaseTimer / spec.reloadDuration, 0, 1);
      weaponAnim.shellInsertProgress = cycleProgress;
      weaponAnim.reloadProgress = cycleProgress;

      // Confirm shell insertion at 65% of the insertion stroke so ammo increments shell-by-shell
      if (cycleProgress >= 0.65 && !weaponAnim.shellInsertedInCycle) {
        if (
          activeRuntime.ammoInMag < spec.magazineSize &&
          activeRuntime.reserveAmmo > 0
        ) {
          activeRuntime.ammoInMag += 1;
          activeRuntime.reserveAmmo -= 1;
          weaponAnim.shellInsertedInCycle = true;
          shellInserted = true;
        }
      }

      if (weaponAnim.phaseTimer >= spec.reloadDuration) {
        if (
          activeRuntime.ammoInMag < spec.magazineSize &&
          activeRuntime.reserveAmmo > 0
        ) {
          // Continue loading next shell (`SG_RELOAD_LOOP`)
          weaponAnim.phaseTimer = 0;
          weaponAnim.shellInsertProgress = 0;
          weaponAnim.reloadProgress = 0;
          weaponAnim.shellInsertedInCycle = false;
        } else {
          // Finish reload and rack pump (`SG_RELOAD_END`)
          weaponAnim.phase = 'ready';
          weaponAnim.phaseTimer = 0;
          weaponAnim.reloadProgress = 0;
          weaponAnim.shellInsertProgress = 0;
          weaponAnim.shellInsertedInCycle = false;
          weaponAnim.pumpProgress = 0.5;
          pumpCycled = true;
          reloadCompleted = true;
        }
      }
    } else {
      weaponAnim.reloadProgress = clamp(weaponAnim.phaseTimer / spec.reloadDuration, 0, 1);
      if (weaponAnim.phaseTimer >= spec.reloadDuration) {
        const needed = spec.magazineSize - activeRuntime.ammoInMag;
        const toLoad = Math.min(needed, activeRuntime.reserveAmmo);
        activeRuntime.ammoInMag += toLoad;
        activeRuntime.reserveAmmo -= toLoad;
        weaponAnim.phase = 'ready';
        weaponAnim.phaseTimer = 0;
        weaponAnim.reloadProgress = 0;
        reloadCompleted = true;
      }
    }
  } else if (weaponAnim.phase === 'melee') {
    weaponAnim.phaseTimer += clampedDt;
    weaponAnim.meleeProgress = clamp(weaponAnim.phaseTimer / meleeDuration, 0, 1);
    // Stage 4 Contact Frame: trigger guarded melee hit event ONCE per melee attack
    if (
      weaponAnim.meleeProgress >= 0.42 &&
      weaponAnim.meleeDamageDealtForId !== weaponAnim.meleeInstanceId
    ) {
      weaponAnim.meleeDamageDealtForId = weaponAnim.meleeInstanceId;
      meleeHitTriggered = true;
    }
    if (weaponAnim.phaseTimer >= meleeDuration) {
      weaponAnim.phase = 'ready';
      weaponAnim.phaseTimer = 0;
      weaponAnim.meleeProgress = 0;
    }
  } else {
    weaponAnim.switchProgress = damp(weaponAnim.switchProgress, 0, 16, clampedDt);
    weaponAnim.reloadProgress = 0;
    weaponAnim.shellInsertProgress = 0;
    weaponAnim.shellInsertedInCycle = false;
    weaponAnim.meleeProgress = damp(weaponAnim.meleeProgress, 0, 18, clampedDt);
  }

  // Idle breathing clock & Direction 01 4-Idle Variation cycling (IdleA -> IdleB -> IdleC -> IdleD)
  weaponAnim.idleTime += clampedDt * 1.9;
  const horizSpeed = Math.hypot(player.vx, player.vz);
  const isCalmIdle =
    player.grounded &&
    horizSpeed < 0.25 &&
    weaponAnim.phase === 'ready' &&
    !player.isAiming;

  if (isCalmIdle) {
    weaponAnim.idleVariationTimer += clampedDt;
    const variations: PlayerIdleVariation[] = ['IdleA', 'IdleB', 'IdleC', 'IdleD'];
    const varIdx = Math.floor(weaponAnim.idleVariationTimer / 3.8) % variations.length;
    weaponAnim.idleVariation = variations[varIdx];
  } else {
    weaponAnim.idleVariationTimer = 0;
    weaponAnim.idleVariation = 'IdleA';
  }
  player.idleVariation = weaponAnim.idleVariation;
  player.idleVariationTimer = weaponAnim.idleVariationTimer;

  // Movement walk/sprint clock (continuous velocity-driven phase)
  const speedNorm = clamp(horizSpeed / 8.4, 0, 1.4);
  if (player.grounded && !player.isSliding && horizSpeed > 0.2) {
    weaponAnim.walkTime += clampedDt * horizSpeed * (player.isSprinting ? 1.15 : 1.05);
  }

  // Sprint, Slide & ADS blend (Section 20.4 & 20.8: ~180-250ms ADS entry, ~150-220ms exit)
  const targetSprint =
    player.isSprinting &&
    !player.isSliding &&
    weaponAnim.phase === 'ready' &&
    horizSpeed > 1.5
      ? 1
      : 0;
  const targetAds =
    player.isAiming && weaponAnim.phase === 'ready' && !player.isSprinting ? 1 : 0;
  const isAR = weaponAnim.activeWeapon === 'assault_rifle';
  const adsEntryLambda = isAR ? 15.5 : 13.2;
  const adsExitLambda = isAR ? 18.0 : 15.8;
  weaponAnim.sprintBlend = damp(weaponAnim.sprintBlend, targetSprint, 11, clampedDt);
  weaponAnim.slideBlend = damp(
    weaponAnim.slideBlend,
    player.isSliding ? 1 : 0,
    16,
    clampedDt
  );
  weaponAnim.adsBlend = damp(
    weaponAnim.adsBlend,
    targetAds,
    targetAds > weaponAnim.adsBlend ? adsEntryLambda : adsExitLambda,
    clampedDt
  );

  // Damp directional damage & death channels
  weaponAnim.damageReactX = damp(weaponAnim.damageReactX, 0, 14, clampedDt);
  weaponAnim.damageReactY = damp(weaponAnim.damageReactY, 0, 14, clampedDt);
  weaponAnim.damageReactRoll = damp(weaponAnim.damageReactRoll, 0, 14, clampedDt);
  weaponAnim.deathDropBlend = damp(
    weaponAnim.deathDropBlend,
    player.isDead ? 1 : 0,
    10,
    clampedDt
  );

  // Mouse sway & inertia spring recovery (dampened when aiming down sights per Section 20.4)
  const swayAdsFactor = (1 - weaponAnim.adsBlend * 0.72) * clamp(weaponSwayIntensity, 0, 1.5);
  weaponAnim.swayPosX = damp(
    weaponAnim.swayPosX,
    (weaponAnim.inertiaVelX * 0.26 - strafeInput * 0.014) * swayAdsFactor,
    12,
    clampedDt
  );
  weaponAnim.swayPosY = damp(
    weaponAnim.swayPosY,
    (weaponAnim.inertiaVelY * 0.24 - clamp(player.vy * 0.0028, -0.02, 0.02)) *
      swayAdsFactor,
    12,
    clampedDt
  );
  weaponAnim.swayRotY = damp(
    weaponAnim.swayRotY,
    weaponAnim.inertiaVelX * 0.9 * swayAdsFactor,
    12,
    clampedDt
  );
  weaponAnim.swayRotX = damp(
    weaponAnim.swayRotX,
    weaponAnim.inertiaVelY * 0.8 * swayAdsFactor,
    12,
    clampedDt
  );
  weaponAnim.swayRotZ = damp(
    weaponAnim.swayRotZ,
    (-strafeInput * 0.052 + weaponAnim.inertiaVelX * 0.48) * swayAdsFactor,
    10,
    clampedDt
  );

  weaponAnim.inertiaVelX = damp(weaponAnim.inertiaVelX, 0, 14, clampedDt);
  weaponAnim.inertiaVelY = damp(weaponAnim.inertiaVelY, 0, 14, clampedDt);

  // Firing recoil & trigger finger recovery
  const recoilRecoverySpeed = weaponAnim.activeWeapon === 'assault_rifle' ? 16 : 10.5;
  weaponAnim.recoilPosZ = damp(weaponAnim.recoilPosZ, 0, recoilRecoverySpeed, clampedDt);
  weaponAnim.recoilPosY = damp(weaponAnim.recoilPosY, 0, recoilRecoverySpeed, clampedDt);
  weaponAnim.recoilRotX = damp(weaponAnim.recoilRotX, 0, recoilRecoverySpeed * 0.9, clampedDt);
  weaponAnim.recoilRotZ = damp(weaponAnim.recoilRotZ, 0, recoilRecoverySpeed, clampedDt);
  weaponAnim.triggerPress = damp(weaponAnim.triggerPress, 0, 22, clampedDt);

  // Crosshair dynamic target spread (tightens significantly in ADS and when crouching)
  const crouchTighten = 1 - Math.min(1, player.crouchBlend ?? 0) * 0.28;
  const targetSpread =
    (spec.spreadBase + speedNorm * spec.spreadMove * (player.grounded ? 1 : 1.6)) *
    (1 - weaponAnim.adsBlend * 0.72) *
    crouchTighten;
  weaponAnim.crosshairSpread = damp(weaponAnim.crosshairSpread, targetSpread, 12, clampedDt);

  // Update authoritative 18-state player animation state
  player.animState = resolvePlayerAnimationState(player, weaponAnim, activeRuntime);

  return {
    reloadCompleted,
    switchedTo,
    meleeHitTriggered,
    shellInserted,
    pumpCycled,
  };
}

export interface WaveConfig {
  wave: number;
  title: string;
  isBossWave: boolean;
  totalEnemies: number;
  maxConcurrent: number;
  spawnPool: EnemyArchetype[];
  archetypeWeights: Record<EnemyArchetype, number>;
  hpScale: number;
  speedScale: number;
}

/**
 * 30-Wave Structured Progression + Endless Survival Mode (Waves 31+).
 * Introduces all 9 enemy archetypes progressively with Boss encounters on Waves 10, 20, and 30.
 */
export function calculateWaveConfig(wave: number): WaveConfig {
  const safeWave = Math.max(1, wave);
  const hpScale = 1 + (safeWave - 1) * 0.1;
  const speedScale = Math.min(1 + (safeWave - 1) * 0.03, 1.35);

  const weights: Record<EnemyArchetype, number> = {
    grunt: 0,
    rusher: 0,
    brute: 0,
    ranger: 0,
    shield: 0,
    exploder: 0,
    sniper: 0,
    commander: 0,
    stalker: 0,
    leaper: 0,
    disruptor: 0,
    iron_warden: 0,
    ravager: 0,
    siege_engine: 0,
    brood_titan: 0,
    colossus: 0,
    overseer: 0,
    abomination: 0,
    boss: 0,
    enforcer: 0,
  };

  let title = 'PERIMETER BREACH';
  let isBossWave = false;
  const spawnPool: EnemyArchetype[] = [];

  const addEnemies = (arch: EnemyArchetype, count: number) => {
    for (let i = 0; i < count; i++) spawnPool.push(arch);
    weights[arch] = (weights[arch] ?? 0) + count;
  };

  if (safeWave <= 3) {
    title = `SECTOR ${safeWave} · RECON VANGUARD`;
    addEnemies('grunt', 4 + safeWave);
    addEnemies('rusher', safeWave >= 2 ? 2 : 1);
    if (safeWave === 3) addEnemies('ranger', 1);
  } else if (safeWave === 4) {
    title = 'SECTOR 4 · SHADOW FLANKERS';
    addEnemies('grunt', 4);
    addEnemies('rusher', 3);
    addEnemies('stalker', 2);
    addEnemies('ranger', 2);
  } else if (safeWave === 5) {
    title = 'IRON WARDEN · MINI-BOSS GARRISON';
    isBossWave = true;
    addEnemies('iron_warden', 1);
    addEnemies('grunt', 4);
    addEnemies('rusher', 3);
    addEnemies('ranger', 2);
  } else if (safeWave === 6) {
    title = 'HEAVY ARMOR & KINETIC LEAPERS';
    addEnemies('grunt', 4);
    addEnemies('leaper', 3);
    addEnemies('brute', 2);
  } else if (safeWave <= 8) {
    title = 'CROSSFIRE & EMP DISRUPTION';
    addEnemies('grunt', 3);
    addEnemies('ranger', 3);
    addEnemies('stalker', 2);
    addEnemies('disruptor', 2);
    addEnemies('brute', 1);
  } else if (safeWave === 9) {
    title = 'PHALANX SHIELD WALL';
    addEnemies('shield', 3);
    addEnemies('ranger', 4);
    addEnemies('leaper', 2);
    addEnemies('grunt', 3);
  } else if (safeWave === 10) {
    title = 'INDUSTRIAL COLOSSUS · BOSS ENCOUNTER';
    isBossWave = true;
    addEnemies('colossus', 1);
    addEnemies('commander', 1);
    addEnemies('shield', 2);
    addEnemies('ranger', 3);
    addEnemies('rusher', 3);
  } else if (safeWave <= 12) {
    title = 'VOLATILE BREACHERS';
    addEnemies('exploder', 3 + (safeWave - 10));
    addEnemies('stalker', 2);
    addEnemies('leaper', 2);
    addEnemies('grunt', 3);
    addEnemies('shield', 2);
  } else if (safeWave <= 14) {
    title = 'LONG-RANGE KILLZONE';
    addEnemies('sniper', 3);
    addEnemies('disruptor', 2);
    addEnemies('shield', 2);
    addEnemies('ranger', 3);
    addEnemies('exploder', 2);
  } else if (safeWave === 15) {
    title = 'APEX RAVAGER & SIEGE ENGINE · MINI-BOSSES';
    isBossWave = true;
    addEnemies('ravager', 1);
    addEnemies('siege_engine', 1);
    addEnemies('sniper', 2);
    addEnemies('shield', 2);
    addEnemies('rusher', 4);
  } else if (safeWave <= 19) {
    title = 'COMBINED ARMS ASSAULT';
    addEnemies('commander', 1);
    addEnemies('brute', 2);
    addEnemies('shield', 2);
    addEnemies('sniper', 2);
    addEnemies('exploder', 3);
    addEnemies('leaper', 2);
    addEnemies('disruptor', 2);
  } else if (safeWave === 20) {
    title = 'CYBERNETIC OVERSEER · BOSS ENCOUNTER';
    isBossWave = true;
    addEnemies('overseer', 1);
    addEnemies('commander', 1);
    addEnemies('shield', 2);
    addEnemies('sniper', 2);
    addEnemies('stalker', 3);
  } else if (safeWave === 25) {
    title = 'BROOD TITAN · MINI-BOSS SWARM';
    isBossWave = true;
    addEnemies('brood_titan', 1);
    addEnemies('ravager', 1);
    addEnemies('leaper', 4);
    addEnemies('exploder', 4);
    addEnemies('rusher', 4);
  } else if (safeWave <= 29) {
    title = `OMEGA ESCALATION · WAVE ${safeWave}`;
    addEnemies('commander', 2);
    addEnemies('brute', 2);
    addEnemies('shield', 3);
    addEnemies('sniper', 2);
    addEnemies('disruptor', 2);
    addEnemies('exploder', 3);
    addEnemies('leaper', 3);
  } else if (safeWave === 30) {
    title = 'FINAL CITADEL SIEGE · BIO-MECH ABOMINATION & COLOSSUS';
    isBossWave = true;
    addEnemies('abomination', 1);
    addEnemies('colossus', 1);
    addEnemies('commander', 2);
    addEnemies('shield', 3);
    addEnemies('sniper', 3);
    addEnemies('exploder', 4);
  } else {
    title = `ENDLESS OVERDRIVE · WAVE ${safeWave}`;
    isBossWave = safeWave % 5 === 0;
    if (isBossWave) {
      addEnemies('colossus', 1);
      addEnemies('overseer', 1);
    }
    addEnemies('iron_warden', 1);
    addEnemies('commander', 2);
    addEnemies('brute', 2);
    addEnemies('shield', 3);
    addEnemies('sniper', 3);
    addEnemies('exploder', 4);
    addEnemies('leaper', 3);
  }

  const totalEnemies = spawnPool.length;
  for (const k of Object.keys(weights) as EnemyArchetype[]) {
    weights[k] = totalEnemies > 0 ? weights[k] / totalEnemies : 0;
  }

  const maxConcurrent = Math.min(5 + Math.floor(safeWave * 0.6), 12);

  return {
    wave: safeWave,
    title,
    isBossWave,
    totalEnemies,
    maxConcurrent,
    spawnPool,
    archetypeWeights: weights,
    hpScale,
    speedScale,
  };
}

interface EnemySpecConfig {
  name: string;
  tier: EnemyTier;
  behavior: EnemyBehaviorModule;
  hp: number;
  armorHp: number;
  shieldHp: number;
  speed: number;
  turnSpeed: number;
  preferredRange: number;
  attackRange: number;
  damage: number;
  windup: number;
  execution: number;
  recover: number;
  staggerThreshold: number;
  signatureAttack: string;
  credits: number;
  score: number;
}

export const ENEMY_SPECS: Record<EnemyArchetype, EnemySpecConfig> = {
  grunt: {
    name: 'BASIC GRUNT',
    tier: 'normal',
    behavior: 'MeleeBehavior',
    hp: 100,
    armorHp: 0,
    shieldHp: 0,
    speed: 3.6,
    turnSpeed: 8.5,
    preferredRange: 4.5,
    attackRange: 6.5,
    damage: 10,
    windup: 0.32,
    execution: 0.16,
    recover: 0.78,
    staggerThreshold: 35,
    signatureAttack: 'Tactical Strike',
    credits: 25,
    score: 100,
  },
  rusher: {
    name: 'FAST RUNNER',
    tier: 'normal',
    behavior: 'FlankingBehavior',
    hp: 65,
    armorHp: 0,
    shieldHp: 0,
    speed: 6.0,
    turnSpeed: 12.0,
    preferredRange: 2.2,
    attackRange: 3.2,
    damage: 15,
    windup: 0.24,
    execution: 0.14,
    recover: 0.56,
    staggerThreshold: 22,
    signatureAttack: 'Sprint Lunge',
    credits: 30,
    score: 125,
  },
  brute: {
    name: 'HEAVY BRUTE',
    tier: 'normal',
    behavior: 'MeleeBehavior',
    hp: 450,
    armorHp: 140,
    shieldHp: 0,
    speed: 2.3,
    turnSpeed: 4.8,
    preferredRange: 3.6,
    attackRange: 5.8,
    damage: 30,
    windup: 0.62,
    execution: 0.22,
    recover: 1.12,
    staggerThreshold: 95,
    signatureAttack: 'Heavy Cleave',
    credits: 65,
    score: 250,
  },
  enforcer: {
    name: 'HEAVY BRUTE',
    tier: 'normal',
    behavior: 'MeleeBehavior',
    hp: 450,
    armorHp: 140,
    shieldHp: 0,
    speed: 2.3,
    turnSpeed: 4.8,
    preferredRange: 3.6,
    attackRange: 5.8,
    damage: 30,
    windup: 0.62,
    execution: 0.22,
    recover: 1.12,
    staggerThreshold: 95,
    signatureAttack: 'Heavy Cleave',
    credits: 65,
    score: 250,
  },
  ranger: {
    name: 'RANGED SHOOTER',
    tier: 'normal',
    behavior: 'RangedBehavior',
    hp: 120,
    armorHp: 0,
    shieldHp: 0,
    speed: 3.2,
    turnSpeed: 7.8,
    preferredRange: 12.0,
    attackRange: 22.0,
    damage: 8,
    windup: 0.42,
    execution: 0.16,
    recover: 0.98,
    staggerThreshold: 40,
    signatureAttack: 'Carbine Volley',
    credits: 35,
    score: 150,
  },
  shield: {
    name: 'SHIELD GUARDIAN',
    tier: 'normal',
    behavior: 'DefensiveBehavior',
    hp: 180,
    armorHp: 80,
    shieldHp: 300,
    speed: 2.5,
    turnSpeed: 5.5,
    preferredRange: 3.8,
    attackRange: 6.2,
    damage: 12,
    windup: 0.46,
    execution: 0.18,
    recover: 0.92,
    staggerThreshold: 70,
    signatureAttack: 'Shield Bash',
    credits: 55,
    score: 220,
  },
  exploder: {
    name: 'VOLATILE EXPLODER',
    tier: 'normal',
    behavior: 'ExplosiveBehavior',
    hp: 70,
    armorHp: 0,
    shieldHp: 0,
    speed: 4.8,
    turnSpeed: 9.8,
    preferredRange: 2.0,
    attackRange: 3.8,
    damage: 35,
    windup: 0.95,
    execution: 0.15,
    recover: 0.85,
    staggerThreshold: 30,
    signatureAttack: 'Core Detonation',
    credits: 40,
    score: 175,
  },
  sniper: {
    name: 'PRECISION SNIPER',
    tier: 'normal',
    behavior: 'RangedBehavior',
    hp: 85,
    armorHp: 0,
    shieldHp: 0,
    speed: 2.2,
    turnSpeed: 6.5,
    preferredRange: 19.0,
    attackRange: 40.0,
    damage: 25,
    windup: 0.95,
    execution: 0.15,
    recover: 1.65,
    staggerThreshold: 32,
    signatureAttack: 'Railgun Piercer',
    credits: 50,
    score: 200,
  },
  commander: {
    name: 'ELITE COMMANDER',
    tier: 'normal',
    behavior: 'SummoningBehavior',
    hp: 650,
    armorHp: 160,
    shieldHp: 0,
    speed: 3.1,
    turnSpeed: 6.8,
    preferredRange: 8.5,
    attackRange: 16.0,
    damage: 20,
    windup: 0.44,
    execution: 0.18,
    recover: 0.88,
    staggerThreshold: 85,
    signatureAttack: 'Tactical Command Surge',
    credits: 110,
    score: 400,
  },
  stalker: {
    name: 'SHADOW STALKER',
    tier: 'normal',
    behavior: 'FlankingBehavior',
    hp: 95,
    armorHp: 0,
    shieldHp: 0,
    speed: 5.4,
    turnSpeed: 11.5,
    preferredRange: 2.5,
    attackRange: 4.2,
    damage: 16,
    windup: 0.26,
    execution: 0.14,
    recover: 0.62,
    staggerThreshold: 28,
    signatureAttack: 'Flank Ambush',
    credits: 40,
    score: 160,
  },
  leaper: {
    name: 'KINETIC LEAPER',
    tier: 'normal',
    behavior: 'FlankingBehavior',
    hp: 90,
    armorHp: 0,
    shieldHp: 0,
    speed: 5.2,
    turnSpeed: 11.0,
    preferredRange: 2.6,
    attackRange: 6.8,
    damage: 18,
    windup: 0.34,
    execution: 0.24,
    recover: 0.68,
    staggerThreshold: 26,
    signatureAttack: 'Kinetic Pounce',
    credits: 42,
    score: 170,
  },
  disruptor: {
    name: 'EMP DISRUPTOR',
    tier: 'normal',
    behavior: 'RangedBehavior',
    hp: 150,
    armorHp: 60,
    shieldHp: 0,
    speed: 2.9,
    turnSpeed: 7.2,
    preferredRange: 10.5,
    attackRange: 18.0,
    damage: 14,
    windup: 0.48,
    execution: 0.18,
    recover: 1.02,
    staggerThreshold: 45,
    signatureAttack: 'EMP Pulse Wave',
    credits: 50,
    score: 190,
  },
  // 4 Mini-Bosses (Max 200 Polygons)
  iron_warden: {
    name: 'IRON WARDEN',
    tier: 'miniboss',
    behavior: 'DefensiveBehavior',
    hp: 920,
    armorHp: 260,
    shieldHp: 450,
    speed: 2.35,
    turnSpeed: 4.2,
    preferredRange: 4.2,
    attackRange: 8.5,
    damage: 24,
    windup: 0.65,
    execution: 0.24,
    recover: 1.05,
    staggerThreshold: 140,
    signatureAttack: 'Fortress Shockwave Slam',
    credits: 160,
    score: 650,
  },
  ravager: {
    name: 'APEX RAVAGER',
    tier: 'miniboss',
    behavior: 'FlankingBehavior',
    hp: 820,
    armorHp: 180,
    shieldHp: 0,
    speed: 4.5,
    turnSpeed: 7.8,
    preferredRange: 3.2,
    attackRange: 7.5,
    damage: 26,
    windup: 0.48,
    execution: 0.22,
    recover: 0.85,
    staggerThreshold: 120,
    signatureAttack: 'Relentless Charge Combo',
    credits: 165,
    score: 680,
  },
  siege_engine: {
    name: 'SIEGE ENGINE',
    tier: 'miniboss',
    behavior: 'RangedBehavior',
    hp: 980,
    armorHp: 280,
    shieldHp: 0,
    speed: 2.1,
    turnSpeed: 3.8,
    preferredRange: 13.0,
    attackRange: 26.0,
    damage: 28,
    windup: 0.72,
    execution: 0.25,
    recover: 1.2,
    staggerThreshold: 150,
    signatureAttack: 'Dual Siege Cannon Salvo',
    credits: 175,
    score: 720,
  },
  brood_titan: {
    name: 'BROOD TITAN',
    tier: 'miniboss',
    behavior: 'SummoningBehavior',
    hp: 900,
    armorHp: 200,
    shieldHp: 0,
    speed: 2.6,
    turnSpeed: 4.6,
    preferredRange: 5.5,
    attackRange: 10.0,
    damage: 25,
    windup: 0.62,
    execution: 0.24,
    recover: 1.08,
    staggerThreshold: 135,
    signatureAttack: 'Brood Surge & Crush',
    credits: 170,
    score: 700,
  },
  // 3 Main Bosses (Max 250 Polygons)
  colossus: {
    name: 'INDUSTRIAL COLOSSUS',
    tier: 'boss',
    behavior: 'BossBehavior',
    hp: 1650,
    armorHp: 420,
    shieldHp: 0,
    speed: 2.75,
    turnSpeed: 3.9,
    preferredRange: 6.2,
    attackRange: 18.0,
    damage: 28,
    windup: 0.65,
    execution: 0.26,
    recover: 0.92,
    staggerThreshold: 220,
    signatureAttack: 'Seismic Ground Slam',
    credits: 300,
    score: 1200,
  },
  overseer: {
    name: 'CYBERNETIC OVERSEER',
    tier: 'boss',
    behavior: 'BossBehavior',
    hp: 1550,
    armorHp: 360,
    shieldHp: 0,
    speed: 3.0,
    turnSpeed: 5.2,
    preferredRange: 11.0,
    attackRange: 25.0,
    damage: 26,
    windup: 0.6,
    execution: 0.24,
    recover: 0.88,
    staggerThreshold: 200,
    signatureAttack: 'Precision Overload Beam',
    credits: 320,
    score: 1300,
  },
  abomination: {
    name: 'BIO-MECH ABOMINATION',
    tier: 'boss',
    behavior: 'BossBehavior',
    hp: 1800,
    armorHp: 380,
    shieldHp: 0,
    speed: 3.3,
    turnSpeed: 5.6,
    preferredRange: 4.8,
    attackRange: 15.0,
    damage: 32,
    windup: 0.58,
    execution: 0.26,
    recover: 0.86,
    staggerThreshold: 240,
    signatureAttack: 'Frenzy Bio-Shock Cleave',
    credits: 350,
    score: 1500,
  },
  boss: {
    name: 'INDUSTRIAL COLOSSUS',
    tier: 'boss',
    behavior: 'BossBehavior',
    hp: 1650,
    armorHp: 420,
    shieldHp: 0,
    speed: 2.75,
    turnSpeed: 3.9,
    preferredRange: 6.2,
    attackRange: 18.0,
    damage: 28,
    windup: 0.65,
    execution: 0.26,
    recover: 0.92,
    staggerThreshold: 220,
    signatureAttack: 'Seismic Ground Slam',
    credits: 300,
    score: 1200,
  },
};

/**
 * Creates an EnemyBotState for any of the 18 enemy archetypes (plus legacy aliases).
 */
export function createEnemyBot(
  id: number,
  archetype: EnemyArchetype,
  x: number,
  y: number,
  z: number,
  waveConfig: WaveConfig
): EnemyBotState {
  const s = ENEMY_SPECS[archetype] ?? ENEMY_SPECS.grunt;
  const navProfile =
    ENEMY_NAVIGATION_PROFILES[archetype] ?? ENEMY_NAVIGATION_PROFILES.grunt;
  const maxHp = Math.round(s.hp * waveConfig.hpScale);
  const maxArmorHp = Math.round(s.armorHp * waveConfig.hpScale);
  const maxShieldHp = Math.round(s.shieldHp * waveConfig.hpScale);
  const isBossOrMini = s.tier === 'boss' || s.tier === 'miniboss';

  return {
    id,
    archetype,
    tier: s.tier,
    navCategory: navProfile.navCategory,
    collisionRadius: navProfile.collisionRadius,
    behaviorModule: s.behavior,
    name: s.name,
    x,
    y,
    z,
    vx: 0,
    vz: 0,
    yaw: 0,
    targetYaw: 0,
    turnSpeed: s.turnSpeed,
    hp: maxHp,
    maxHp,
    armorHp: maxArmorHp,
    maxArmorHp,
    shieldHp: maxShieldHp,
    maxShieldHp,
    speed: s.speed * waveConfig.speedScale,
    preferredRange: s.preferredRange,
    attackRange: s.attackRange,
    attackDamage: s.damage,
    attackState: 'idle',
    attackTimer: 0.5,
    windupDuration: s.windup,
    executionDuration: s.execution,
    recoverDuration: s.recover,
    attackInstanceId: 0,
    damageDealtForAttackId: -1,
    specialAbilityCooldown: 2.5,
    specialAbilityActive: false,
    hitFlashTimer: 0,
    armorFlashTimer: 0,
    weakPointFlashTimer: 0,
    lastHitDirection: 'front',
    lastHitHeavy: false,
    staggerTimer: 0,
    staggerMeter: 0,
    staggerThreshold: s.staggerThreshold,
    staggerImmunityTimer: 0,
    flinchPitch: 0,
    flinchRoll: 0,
    spawnAnimTimer: 0.35,
    bossIntroTimer: isBossOrMini ? 2.2 : 0,
    bossPhaseTransitionTimer: 0,
    bossPhaseTriggeredMask: 1, // Phase 1 bit set
    walkPhase: (id * 1.37) % (Math.PI * 2),
    idleTime: (id * 0.83) % 10,
    accelBlend: 0,
    verticalOffset: 0,
    alive: true,
    koTimer: 0,
    detonated: false,
    rewardGranted: false,
    pooled: false,
    knockbackDirX: 0,
    knockbackDirZ: 0,
    bossPhase: 1,
    activeSignatureAttack: s.signatureAttack,
    aiDecisionTimer: 0,
    cachedNavDirX: 0,
    cachedNavDirZ: 1,
    stuckTimer: 0,
    lastProgressX: x,
    lastProgressZ: z,
    repathCount: 0,
    animLodLevel: 0,
    deathStyle: 'standard',
    creditReward: s.credits,
    scoreReward: s.score,
    activeAnimCategory: isBossOrMini ? 'boss_presentation' : 'idle',
  };
}

/**
 * Part 9 (14.2): Resets a pooled EnemyBotState completely when recycling an enemy instance,
 * guaranteeing zero leftover death, attack, phase, stagger, or material state.
 */
export function resetPooledEnemyBot(
  bot: EnemyBotState,
  newId: number,
  archetype: EnemyArchetype,
  x: number,
  y: number,
  z: number,
  waveConfig: WaveConfig
): EnemyBotState {
  const fresh = createEnemyBot(newId, archetype, x, y, z, waveConfig);
  Object.assign(bot, fresh);
  bot.pooled = true;
  return bot;
}

/**
 * Part 3 (8.2): Resolves the active animation category according to strict priority order:
 * Death > Boss Phase / Intro Presentation > Stagger / Damage Reaction > Special / Regular Combat > Locomotion > Idle.
 */
export function resolveEnemyAnimationCategory(
  bot: EnemyBotState
): EnemyAnimationCategory {
  if (!bot.alive) return 'death';
  if (bot.bossPhaseTransitionTimer > 0 || bot.bossIntroTimer > 0) {
    return 'boss_presentation';
  }
  if (bot.staggerTimer > 0 || bot.hitFlashTimer > 0) {
    return 'damage';
  }
  if (bot.attackState !== 'idle' || bot.specialAbilityActive) {
    return 'combat';
  }
  if (Math.hypot(bot.vx, bot.vz) > 0.25) {
    return 'locomotion';
  }
  return 'idle';
}

/**
 * Checks whether a short 2D movement ray from (sx, sz) along (dirX, dirZ) of length `dist`
 * intersects any solid AABB collider OR solid ramp side-wall at `botY`.
 */
function isRayBlockedByCollider(
  sx: number,
  sz: number,
  botY: number,
  dirX: number,
  dirZ: number,
  dist: number,
  radius: number,
  colliders: AABBCollider[],
  ramps: RampCollider[] = []
): boolean {
  const steps = 4;
  for (let s = 1; s <= steps; s++) {
    const px = sx + dirX * ((dist * s) / steps);
    const pz = sz + dirZ * ((dist * s) / steps);
    if (Math.abs(px) > ARENA_HALF_SIZE - 0.5 || Math.abs(pz) > ARENA_HALF_SIZE - 0.5) {
      return true;
    }
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (botY >= c.maxY - 0.6 || botY + 1.8 <= c.minY + 0.05) {
        continue;
      }
      if (
        px + radius > c.minX &&
        px - radius < c.maxX &&
        pz + radius > c.minZ &&
        pz - radius < c.maxZ
      ) {
        return true;
      }
    }
    // Check ramp side-walls so ground bots never walk sideways into a ramp wall
    for (let i = 0; i < ramps.length; i++) {
      const r = ramps[i];
      if (
        px + radius > r.minX &&
        px - radius < r.maxX &&
        pz + radius > r.minZ &&
        pz - radius < r.maxZ
      ) {
        let t = 0;
        if (r.axis === 'x+') t = (px - r.minX) / (r.maxX - r.minX);
        else if (r.axis === 'x-') t = (r.maxX - px) / (r.maxX - r.minX);
        else if (r.axis === 'z+') t = (pz - r.minZ) / (r.maxZ - r.minZ);
        else if (r.axis === 'z-') t = (r.maxZ - pz) / (r.maxZ - r.minZ);
        t = clamp(t, 0, 1);
        const rampH = r.startY + t * (r.endY - r.startY);
        // If the ramp surface at (px, pz) is > 0.60m higher than the bot, it blocks sideways entry
        if (botY < rampH - 0.6) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Computes an obstacle-aware, ramp-aware tactical movement direction for an enemy bot.
 * Properly routes bots around the full central platform + West/East ramp barrier
 * (`x in [-11.0, 11.0], z in [-3.8, 3.8]`) via the wide-open outer corridors (`x = +/- 12.8`)
 * or onto the West/East ramp entrances (`x = +/- 12.2, z = 0`).
 */
export function computeTacticalNavigationDir(
  bot: EnemyBotState,
  player: PlayerPhysicsState,
  colliders: AABBCollider[],
  ramps: RampCollider[] = []
): { navDirX: number; navDirZ: number } {
  let goalX = player.x;
  let goalZ = player.z;

  const playerOnPlatform =
    player.y > 1.0 || (Math.abs(player.x) < 4.6 && Math.abs(player.z) < 3.9 && player.y > 0.5);
  const botOnPlatform =
    bot.y > 1.0 || (Math.abs(bot.x) < 4.6 && Math.abs(bot.z) < 3.9 && bot.y > 0.6);
  const botInRampCorridor = Math.abs(bot.z) <= 2.1 && Math.abs(bot.x) <= 12.6;

  if (playerOnPlatform && !botOnPlatform) {
    if (botInRampCorridor && Math.abs(bot.x) > 4.1) {
      // Bot is aligned with West or East ramp deck: ascend straight onto platform
      goalX = 0;
      goalZ = clamp(player.z, -1.5, 1.5);
    } else {
      // Route to closest ramp foot entrance at x = +/- 12.2, z = 0
      // If bot is currently blocked by the central platform/ramp N/S face (|x| < 11.2),
      // first move laterally to x = +/- 12.4 at safe z before turning to z = 0
      const useEast =
        bot.x > 1.5 || (Math.abs(bot.x) <= 1.5 && player.x >= 0);
      const entryX = useEast ? 12.2 : -12.2;
      if (Math.abs(bot.x) < 11.2 && Math.abs(bot.z) > 2.0) {
        goalX = entryX;
        goalZ = bot.z > 0 ? Math.max(bot.z, 4.8) : Math.min(bot.z, -4.8);
      } else {
        goalX = entryX;
        goalZ = 0;
      }
    }
  } else if (!playerOnPlatform && botOnPlatform) {
    const exitX = player.x < 0 ? -12.2 : 12.2;
    goalX = exitX;
    goalZ = 0;
  } else if (!playerOnPlatform && !botOnPlatform) {
    // Both bot and player are on ground level.
    // Check if the straight line between bot and player crosses the central platform + ramp barrier
    // (`x in [-11.2, 11.2], z in [-3.9, 3.9]`).
    const crossesNorthSouth =
      (bot.z > 2.2 && player.z < -2.2) ||
      (bot.z < -2.2 && player.z > 2.2) ||
      (Math.abs(player.z) <= 3.9 && Math.abs(player.x) < 11.2 && Math.abs(bot.z) > 3.9);

    if (crossesNorthSouth && (Math.abs(bot.x) < 11.8 || Math.abs(player.x) < 11.2)) {
      const flankSide =
        Math.abs(bot.x) > 1.0
          ? Math.sign(bot.x)
          : bot.x + player.x >= 0
          ? 1
          : -1;
      const corridorX = flankSide * 12.8; // Wide-open corridor between ramp foot (11.0) and lane cover (15.5)
      if (Math.abs(bot.x) < 11.4 && Math.abs(bot.z) > 2.4) {
        // First clear the North/South face of the ramp/platform laterally before crossing z = 0
        goalX = corridorX;
        goalZ = bot.z > 0 ? 4.8 : -4.8;
      } else {
        goalX = corridorX;
        goalZ = clamp(player.z, -4.5, 4.5);
      }
    }
  }

  const dx = goalX - bot.x;
  const dz = goalZ - bot.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const baseDirX = dx / dist;
  const baseDirZ = dz / dist;

  const feelerAngles = [
    0,
    0.38,
    -0.38,
    0.78,
    -0.78,
    1.18,
    -1.18,
    1.57,
    -1.57,
    2.05,
    -2.05,
    2.48,
    -2.48,
  ];
  const feelerDist = Math.min(3.0, Math.max(1.4, dist));
  const botRadius = bot.collisionRadius || 0.54;
  const parity = (bot.id + (bot.repathCount || 0)) % 2 === 0 ? 1 : -1;

  for (let a = 0; a < feelerAngles.length; a++) {
    const ang = feelerAngles[a];
    const signedAng = ang * parity;
    const c = Math.cos(signedAng);
    const s = Math.sin(signedAng);
    const candX = baseDirX * c - baseDirZ * s;
    const candZ = baseDirX * s + baseDirZ * c;

    if (
      !isRayBlockedByCollider(
        bot.x,
        bot.z,
        bot.y,
        candX,
        candZ,
        feelerDist,
        botRadius,
        colliders,
        ramps
      )
    ) {
      return { navDirX: candX, navDirZ: candZ };
    }
  }

  return { navDirX: baseDirX, navDirZ: baseDirZ };
}

/**
 * Centralized Navigation Update Manager State.
 * Groups enemy path requests by distance from the player, processing close enemies
 * frequently (~12.5 Hz) while batch-updating medium and distant enemies on a staggered schedule.
 */
export interface CentralizedNavigationManagerState extends NavigationManagerMetrics {
  mediumCursor: number;
}

export function createNavigationManagerState(): CentralizedNavigationManagerState {
  return {
    closeBandCount: 0,
    mediumBandCount: 0,
    distantBandCount: 0,
    pathsUpdatedLastStep: 0,
    stuckRecoveriesTriggered: 0,
    batchCursor: 0,
    mediumCursor: 0,
  };
}

/**
 * Steps the centralized navigation update manager for all active enemies:
 * - Band 0 (Close <= 14m or Boss/Mini-Boss): updated every 0.08s (~12.5 Hz), immediate processing.
 * - Band 1 (Medium 14m..26m): updated every 0.16s (~6.25 Hz), staggered batch of up to 4 per frame.
 * - Band 2 (Distant > 26m): updated every 0.32s (~3.1 Hz), staggered round-robin batch of up to 2 per frame.
 * Also performs Part 05.3 Enemy Stuck Detection & Recovery.
 */
export function stepCentralizedNavigationManager(
  navManager: CentralizedNavigationManagerState,
  enemies: EnemyBotState[],
  player: PlayerPhysicsState,
  colliders: AABBCollider[],
  ramps: RampCollider[],
  dt: number
): void {
  const closeQueue: EnemyBotState[] = [];
  const mediumQueue: EnemyBotState[] = [];
  const distantQueue: EnemyBotState[] = [];

  let closeCount = 0;
  let mediumCount = 0;
  let distantCount = 0;
  let pathsUpdated = 0;

  for (let i = 0; i < enemies.length; i++) {
    const bot = enemies[i];
    if (!bot.alive) continue;

    const dx = player.x - bot.x;
    const dz = player.z - bot.z;
    const dist = Math.hypot(dx, dz);

    bot.aiDecisionTimer -= dt;

    // Part 05.3 — Stuck Detection & Recovery
    const wantsToAdvance =
      bot.staggerTimer <= 0 &&
      bot.bossIntroTimer <= 0 &&
      bot.bossPhaseTransitionTimer <= 0 &&
      dist > bot.preferredRange + 0.45;

    if (wantsToAdvance) {
      const movedDist = Math.hypot(
        bot.x - (bot.lastProgressX ?? bot.x),
        bot.z - (bot.lastProgressZ ?? bot.z)
      );
      if (movedDist >= 0.2) {
        bot.stuckTimer = 0;
        bot.lastProgressX = bot.x;
        bot.lastProgressZ = bot.z;
      } else {
        bot.stuckTimer = (bot.stuckTimer || 0) + dt;
        if (bot.stuckTimer >= 0.45) {
          bot.stuckTimer = 0;
          bot.repathCount = (bot.repathCount || 0) + 1;
          navManager.stuckRecoveriesTriggered += 1;

          // Force immediate tactical re-evaluation with alternated feeler parity
          const nav = computeTacticalNavigationDir(bot, player, colliders, ramps);
          // Apply lateral unsticking steer perpendicular to direct player line
          const sideSign = bot.repathCount % 2 === 0 ? 1 : -1;
          const normDist = dist || 1;
          const perpX = -(dz / normDist) * sideSign;
          const perpZ = (dx / normDist) * sideSign;
          const botRadius = bot.collisionRadius || 0.54;

          if (
            !isRayBlockedByCollider(
              bot.x,
              bot.z,
              bot.y,
              perpX,
              perpZ,
              1.35,
              botRadius,
              colliders,
              ramps
            )
          ) {
            bot.cachedNavDirX = perpX * 0.72 + nav.navDirX * 0.28;
            bot.cachedNavDirZ = perpZ * 0.72 + nav.navDirZ * 0.28;
            const len = Math.hypot(bot.cachedNavDirX, bot.cachedNavDirZ) || 1;
            bot.cachedNavDirX /= len;
            bot.cachedNavDirZ /= len;
            // Gentle safe nudge along clear lateral vector
            bot.x = clamp(
              bot.x + perpX * 0.26,
              -ARENA_HALF_SIZE + 0.8,
              ARENA_HALF_SIZE - 0.8
            );
            bot.z = clamp(
              bot.z + perpZ * 0.26,
              -ARENA_HALF_SIZE + 0.8,
              ARENA_HALF_SIZE - 0.8
            );
          } else {
            bot.cachedNavDirX = nav.navDirX;
            bot.cachedNavDirZ = nav.navDirZ;
          }

          bot.lastProgressX = bot.x;
          bot.lastProgressZ = bot.z;
          bot.aiDecisionTimer = 0.08;
          pathsUpdated++;
        }
      }
    } else {
      bot.stuckTimer = 0;
      bot.lastProgressX = bot.x;
      bot.lastProgressZ = bot.z;
    }

    if (dist <= 14.0 || bot.tier === 'boss' || bot.tier === 'miniboss') {
      closeCount++;
      bot.animLodLevel = 0;
      if (bot.aiDecisionTimer <= 0) {
        closeQueue.push(bot);
      }
    } else if (dist <= 26.0) {
      mediumCount++;
      bot.animLodLevel = 1;
      if (bot.aiDecisionTimer <= 0) {
        mediumQueue.push(bot);
      }
    } else {
      distantCount++;
      bot.animLodLevel = 2;
      if (bot.aiDecisionTimer <= 0) {
        distantQueue.push(bot);
      }
    }
  }

  // 1. Process all due Close-Band enemies immediately (highest priority)
  for (let i = 0; i < closeQueue.length; i++) {
    const bot = closeQueue[i];
    bot.aiDecisionTimer = 0.08;
    const nav = computeTacticalNavigationDir(bot, player, colliders, ramps);
    bot.cachedNavDirX = nav.navDirX;
    bot.cachedNavDirZ = nav.navDirZ;
    pathsUpdated++;
  }

  // 2. Process up to 4 due Medium-Band enemies on a staggered cursor
  if (mediumQueue.length > 0) {
    const maxMediumBatch = Math.min(4, mediumQueue.length);
    for (let b = 0; b < maxMediumBatch; b++) {
      const idx = (navManager.mediumCursor + b) % mediumQueue.length;
      const bot = mediumQueue[idx];
      bot.aiDecisionTimer = 0.16 + b * 0.02;
      const nav = computeTacticalNavigationDir(bot, player, colliders, ramps);
      bot.cachedNavDirX = nav.navDirX;
      bot.cachedNavDirZ = nav.navDirZ;
      pathsUpdated++;
    }
    navManager.mediumCursor =
      (navManager.mediumCursor + maxMediumBatch) % Math.max(1, mediumQueue.length);
  }

  // 3. Process up to 2 due Distant-Band enemies on a staggered round-robin schedule
  if (distantQueue.length > 0) {
    const maxDistantBatch = Math.min(2, distantQueue.length);
    for (let b = 0; b < maxDistantBatch; b++) {
      const idx = (navManager.batchCursor + b) % distantQueue.length;
      const bot = distantQueue[idx];
      bot.aiDecisionTimer = 0.32 + b * 0.04;
      const nav = computeTacticalNavigationDir(bot, player, colliders, ramps);
      bot.cachedNavDirX = nav.navDirX;
      bot.cachedNavDirZ = nav.navDirZ;
      pathsUpdated++;
    }
    navManager.batchCursor =
      (navManager.batchCursor + maxDistantBatch) % Math.max(1, distantQueue.length);
  }

  navManager.closeBandCount = closeCount;
  navManager.mediumBandCount = mediumCount;
  navManager.distantBandCount = distantCount;
  navManager.pathsUpdatedLastStep = pathsUpdated;
}

/**
 * Direction 05 — Applies damage to the player with ballistic armor absorption (65% absorbed by armor),
 * 4-way directional hit reaction ('front', 'back', 'left', 'right'), heavy damage stagger,
 * and a guarded single-trigger player death transition.
 */
export function applyDamageToPlayer(
  player: PlayerPhysicsState,
  rawDamage: number,
  sourceX?: number,
  sourceZ?: number,
  cameraAnim?: CameraProceduralState,
  weaponAnim?: WeaponProceduralState
): {
  healthLost: number;
  armorLost: number;
  hitDirection: EnemyHitDirection;
  diedNow: boolean;
} {
  const dmg = Math.max(0, Math.round(rawDamage));
  if (dmg <= 0 || player.isDead) {
    return {
      healthLost: 0,
      armorLost: 0,
      hitDirection: player.lastDamageDir,
      diedNow: false,
    };
  }

  let armorLost = 0;
  let healthLost = dmg;

  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, Math.ceil(dmg * 0.65));
    armorLost = absorbed;
    player.armor = Math.max(0, player.armor - absorbed);
    healthLost = Math.max(1, dmg - absorbed);
  }

  player.health = Math.max(0, player.health - healthLost);
  player.hurtFlashTimer = 0.38;

  // Compute 4-way directional hit relative to player's look orientation
  let hitDirection: EnemyHitDirection = 'front';
  if (sourceX !== undefined && sourceZ !== undefined) {
    const worldAngle = Math.atan2(sourceX - player.x, sourceZ - player.z);
    const relAngle = worldAngle - (player.yaw + Math.PI);
    player.lastDamageAngle = relAngle;

    const toSrcX = sourceX - player.x;
    const toSrcZ = sourceZ - player.z;
    const len = Math.hypot(toSrcX, toSrcZ) || 1;
    const nx = toSrcX / len;
    const nz = toSrcZ / len;

    const forwardX = -Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = -Math.sin(player.yaw);

    const fDot = nx * forwardX + nz * forwardZ;
    const rDot = nx * rightX + nz * rightZ;

    if (Math.abs(fDot) >= Math.abs(rDot)) {
      hitDirection = fDot >= 0 ? 'front' : 'back';
    } else {
      hitDirection = rDot >= 0 ? 'right' : 'left';
    }
  }
  player.lastDamageDir = hitDirection;

  // Heavy damage triggers brief player stagger
  const isHeavyHit = dmg >= 22;
  if (isHeavyHit) {
    player.staggerTimer = 0.32;
  }

  // Apply controlled directional flinch to camera & weapon viewmodel
  const flinchScale = isHeavyHit ? 1.35 : 0.85;
  if (cameraAnim) {
    if (hitDirection === 'front') {
      cameraAnim.damageKickPitch = 0.028 * flinchScale;
    } else if (hitDirection === 'back') {
      cameraAnim.damageKickPitch = -0.025 * flinchScale;
    } else if (hitDirection === 'left') {
      cameraAnim.damageKickRoll = -0.032 * flinchScale;
    } else {
      cameraAnim.damageKickRoll = 0.032 * flinchScale;
    }
  }
  if (weaponAnim) {
    if (hitDirection === 'front') {
      weaponAnim.damageReactY = -0.014 * flinchScale;
    } else if (hitDirection === 'back') {
      weaponAnim.damageReactY = 0.012 * flinchScale;
    } else if (hitDirection === 'left') {
      weaponAnim.damageReactX = 0.018 * flinchScale;
      weaponAnim.damageReactRoll = -0.14 * flinchScale;
    } else {
      weaponAnim.damageReactX = -0.018 * flinchScale;
      weaponAnim.damageReactRoll = 0.14 * flinchScale;
    }
  }

  // Single-trigger player death guard
  let diedNow = false;
  if (player.health <= 0 && !player.deathTriggered) {
    player.isDead = true;
    player.deathTriggered = true;
    player.deathAnimTimer = 0.001;
    player.animState = 'Dead';
    if (weaponAnim) {
      cancelWeaponReload(weaponAnim);
    }
    diedNow = true;
  }

  return { healthLost, armorLost, hitDirection, diedNow };
}

/**
 * Cleanly resets all player physics, health, armor, weapon, and procedural animation states
 * upon respawn or match restart.
 */
export function resetPlayerForRespawn(
  player: PlayerPhysicsState,
  weaponsRuntime?: Record<WeaponId, WeaponRuntimeState>,
  cameraAnim?: CameraProceduralState,
  weaponAnim?: WeaponProceduralState
): void {
  const freshPlayer = createInitialPlayerState();
  Object.assign(player, freshPlayer);

  if (weaponsRuntime) {
    const freshRuntime = createInitialWeaponRuntime();
    weaponsRuntime.assault_rifle = freshRuntime.assault_rifle;
    weaponsRuntime.revolver = freshRuntime.revolver;
    weaponsRuntime.shotgun = freshRuntime.shotgun;
  }
  if (cameraAnim) {
    Object.assign(cameraAnim, createInitialCameraState());
  }
  if (weaponAnim) {
    Object.assign(weaponAnim, createInitialWeaponProceduralState());
  }
}

/**
 * Smoothly rotates angle `current` toward `target` by at most `maxStep` radians.
 */
function rotateAngleToward(current: number, target: number, maxStep: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

export function stepEnemiesAI(
  enemies: EnemyBotState[],
  player: PlayerPhysicsState,
  colliders: AABBCollider[],
  ramps: RampCollider[],
  dt: number,
  navManager?: CentralizedNavigationManagerState
): {
  playerDamageTaken: number;
  attacksTriggered: number;
  explosionsTriggered: Array<{ x: number; y: number; z: number }>;
  bossPhaseChanged: number | null;
  lastAttackerX?: number;
  lastAttackerZ?: number;
} {
  const clampedDt = Math.min(dt, 0.05);
  const activeNavManager = navManager ?? createNavigationManagerState();
  stepCentralizedNavigationManager(
    activeNavManager,
    enemies,
    player,
    colliders,
    ramps,
    clampedDt
  );
  let playerDamageTaken = 0;
  let attacksTriggered = 0;
  let lastAttackerX: number | undefined;
  let lastAttackerZ: number | undefined;
  const explosionsTriggered: Array<{ x: number; y: number; z: number }> = [];
  let bossPhaseChanged: number | null = null;

  // Check if an Elite Commander or Brood Titan is alive to grant tactical aura (+16% speed) to nearby allies
  const commanderPositions: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < enemies.length; i++) {
    if (
      enemies[i].alive &&
      (enemies[i].archetype === 'commander' || enemies[i].archetype === 'brood_titan')
    ) {
      commanderPositions.push({ x: enemies[i].x, z: enemies[i].z });
    }
  }

  // Crowd token pool: max 4 bots in active 'windup'/'execution' simultaneously
  let activeWindups = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (
      enemies[i].alive &&
      (enemies[i].attackState === 'windup' || enemies[i].attackState === 'execution')
    ) {
      activeWindups++;
    }
  }

  for (let i = 0; i < enemies.length; i++) {
    const bot = enemies[i];
    if (bot.hitFlashTimer > 0) {
      bot.hitFlashTimer = Math.max(0, bot.hitFlashTimer - clampedDt);
    }
    if (bot.armorFlashTimer > 0) {
      bot.armorFlashTimer = Math.max(0, bot.armorFlashTimer - clampedDt);
    }
    if (bot.weakPointFlashTimer > 0) {
      bot.weakPointFlashTimer = Math.max(0, bot.weakPointFlashTimer - clampedDt);
    }
    if (bot.spawnAnimTimer > 0) {
      bot.spawnAnimTimer = Math.max(0, bot.spawnAnimTimer - clampedDt);
    }
    if (bot.bossIntroTimer > 0) {
      bot.bossIntroTimer = Math.max(0, bot.bossIntroTimer - clampedDt);
    }
    if (bot.staggerImmunityTimer > 0) {
      bot.staggerImmunityTimer = Math.max(0, bot.staggerImmunityTimer - clampedDt);
    }

    bot.idleTime += clampedDt;
    bot.flinchPitch = damp(bot.flinchPitch, 0, 14, clampedDt);
    bot.flinchRoll = damp(bot.flinchRoll, 0, 14, clampedDt);
    // Decay stagger meter gradually over time
    bot.staggerMeter = Math.max(0, bot.staggerMeter - 12 * clampedDt);

    if (!bot.alive) {
      bot.activeAnimCategory = 'death';
      if (bot.koTimer > 0) {
        bot.koTimer = Math.max(0, bot.koTimer - clampedDt);
        bot.x += bot.knockbackDirX * 2.2 * clampedDt;
        bot.z += bot.knockbackDirZ * 2.2 * clampedDt;
      }
      continue;
    }

    // Part 2 (Direction 06, 7.3): Safe Boss & Mini-Boss 3-Phase Progression with single-trigger bitmask guard
    if (bot.tier === 'boss' || bot.tier === 'miniboss') {
      const hpRatio = bot.hp / Math.max(1, bot.maxHp);
      const targetPhase: 1 | 2 | 3 =
        hpRatio <= 0.33 ? 3 : hpRatio <= 0.66 ? 2 : 1;
      const phaseBit = 1 << (targetPhase - 1);
      if (
        targetPhase > bot.bossPhase &&
        (bot.bossPhaseTriggeredMask & phaseBit) === 0
      ) {
        bot.bossPhase = targetPhase;
        bot.bossPhaseTriggeredMask |= phaseBit;
        bot.bossPhaseTransitionTimer = 0.85;
        // Suspend incompatible active attack during phase transition
        bot.attackState = 'idle';
        bot.attackTimer = 0.55;
        bossPhaseChanged = targetPhase;
        bot.speed *= 1.15;
        bot.recoverDuration = Math.max(0.45, bot.recoverDuration * 0.82);
      }
    }

    if (bot.bossPhaseTransitionTimer > 0) {
      bot.bossPhaseTransitionTimer = Math.max(
        0,
        bot.bossPhaseTransitionTimer - clampedDt
      );
      bot.vx = damp(bot.vx, 0, 12, clampedDt);
      bot.vz = damp(bot.vz, 0, 12, clampedDt);
      bot.activeAnimCategory = 'boss_presentation';
      continue;
    }

    if (bot.staggerTimer > 0) {
      bot.staggerTimer = Math.max(0, bot.staggerTimer - clampedDt);
      // Stagger interrupts active attack preparation safely
      if (bot.attackState === 'windup') {
        bot.attackState = 'recover';
        bot.attackTimer = 0.4;
      }
    }

    const dx = player.x - bot.x;
    const dz = player.z - bot.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const directDirX = dx / dist;
    const directDirZ = dz / dist;

    const navDirX = bot.cachedNavDirX;
    const navDirZ = bot.cachedNavDirZ;

    // Commander / Brood Titan aura buff check
    let auraSpeedMult = 1.0;
    for (let c = 0; c < commanderPositions.length; c++) {
      if (
        bot.archetype !== 'commander' &&
        Math.hypot(bot.x - commanderPositions[c].x, bot.z - commanderPositions[c].z) <= 12.0
      ) {
        auraSpeedMult = 1.16;
        break;
      }
    }

    // Weight-based turning (Part 2, 3.7: do not rotate instantly during active attack execution)
    const lookDirX = dist > 5.0 ? navDirX * 0.6 + directDirX * 0.4 : directDirX;
    const lookDirZ = dist > 5.0 ? navDirZ * 0.6 + directDirZ * 0.4 : directDirZ;
    bot.targetYaw = Math.atan2(lookDirX, lookDirZ);
    const turnRateMult = bot.attackState === 'execution' ? 0.2 : 1.0;
    bot.yaw = rotateAngleToward(
      bot.yaw,
      bot.targetYaw,
      bot.turnSpeed * turnRateMult * clampedDt
    );

    let moveX = 0;
    let moveZ = 0;
    const effSpeed = bot.speed * auraSpeedMult;

    if (bot.staggerTimer <= 0) {
      if (
        bot.behaviorModule === 'FlankingBehavior' ||
        bot.behaviorModule === 'ExplosiveBehavior'
      ) {
        const weaveSign = i % 2 === 0 ? 1 : -1;
        const weaveAmp =
          bot.archetype === 'stalker'
            ? 0.42
            : bot.archetype === 'exploder'
            ? 0.16
            : 0.24;
        const perpX = -navDirZ * weaveSign * weaveAmp;
        const perpZ = navDirX * weaveSign * weaveAmp;
        if (dist > bot.preferredRange) {
          moveX = (navDirX + perpX) * effSpeed;
          moveZ = (navDirZ + perpZ) * effSpeed;
        }
      } else if (
        bot.behaviorModule === 'RangedBehavior' ||
        bot.behaviorModule === 'SummoningBehavior'
      ) {
        const strafeDir = i % 2 === 0 ? 1 : -1;
        const strafeFactor = bot.archetype === 'sniper' ? 0.45 : 0.75;
        if (dist > bot.preferredRange + 2.2) {
          moveX = navDirX * effSpeed;
          moveZ = navDirZ * effSpeed;
        } else if (dist < bot.preferredRange - 2.8) {
          moveX = -directDirX * effSpeed * 0.85;
          moveZ = -directDirZ * effSpeed * 0.85;
        } else {
          moveX = -directDirZ * strafeDir * effSpeed * strafeFactor;
          moveZ = directDirX * strafeDir * effSpeed * strafeFactor;
        }
      } else {
        // MeleeBehavior, DefensiveBehavior, BossBehavior: disciplined advance + lunge boost
        const chargeBoost =
          bot.attackState === 'windup' &&
          (bot.archetype === 'brute' ||
            bot.archetype === 'enforcer' ||
            bot.tier === 'miniboss' ||
            bot.tier === 'boss')
            ? 1.38
            : 1.0;
        if (dist > bot.preferredRange) {
          moveX = navDirX * effSpeed * chargeBoost;
          moveZ = navDirZ * effSpeed * chargeBoost;
        }
      }
    }

    // Soft crowd separation from other bots respecting each enemy's category collisionRadius (Part 4, 9.4 & Part 5, 5.2)
    const selfRadius = bot.collisionRadius || 0.5;
    for (let j = 0; j < enemies.length; j++) {
      if (i === j || !enemies[j].alive) continue;
      const ox = bot.x - enemies[j].x;
      const oz = bot.z - enemies[j].z;
      const oDist = Math.hypot(ox, oz);
      const minSep = selfRadius + (enemies[j].collisionRadius || 0.5) + 0.35;
      if (oDist > 0.001 && oDist < minSep) {
        const push = ((minSep - oDist) / minSep) * 3.8;
        moveX += (ox / oDist) * push;
        moveZ += (oz / oDist) * push;
      }
    }

    // Smooth acceleration / deceleration tuned by character weight (Part 2, 3.5 & 3.6)
    const accelRate =
      bot.archetype === 'rusher' || bot.archetype === 'leaper'
        ? 14
        : bot.tier === 'boss' || bot.archetype === 'brute'
        ? 7
        : 10;
    bot.vx = damp(bot.vx, moveX, accelRate, clampedDt);
    bot.vz = damp(bot.vz, moveZ, accelRate, clampedDt);

    const nextBotX = clamp(
      bot.x + bot.vx * clampedDt,
      -ARENA_HALF_SIZE + 0.6,
      ARENA_HALF_SIZE - 0.6
    );
    const nextBotZ = clamp(
      bot.z + bot.vz * clampedDt,
      -ARENA_HALF_SIZE + 0.6,
      ARENA_HALF_SIZE - 0.6
    );

    const preBotY = getSurfaceHeightAt(nextBotX, nextBotZ, bot.y, colliders, ramps);
    if (preBotY > bot.y && preBotY - bot.y <= 0.65) {
      bot.y = preBotY;
    }

    bot.x = nextBotX;
    bot.z = nextBotZ;

    const dummyPlayerState: PlayerPhysicsState = {
      ...player,
      x: bot.x,
      y: bot.y,
      z: bot.z,
      radius: bot.collisionRadius || 0.52,
      height: 1.8,
    };
    resolveHorizontalAABB(dummyPlayerState, colliders, ramps);
    const pushDx = dummyPlayerState.x - nextBotX;
    const pushDz = dummyPlayerState.z - nextBotZ;
    bot.x = dummyPlayerState.x;
    bot.z = dummyPlayerState.z;
    bot.y = getSurfaceHeightAt(bot.x, bot.z, bot.y, colliders, ramps);

    // If bot contacted a solid wall/ramp/pillar, immediately refresh navigation and slide along tangent
    if (Math.hypot(pushDx, pushDz) > 0.002) {
      bot.aiDecisionTimer = 0;
      const slideSign = bot.x >= 0 ? 1 : -1;
      if (Math.abs(pushDz) > Math.abs(pushDx)) {
        bot.x = clamp(
          bot.x + slideSign * effSpeed * 0.45 * clampedDt,
          -ARENA_HALF_SIZE + 0.6,
          ARENA_HALF_SIZE - 0.6
        );
      } else {
        const zSign = player.z >= bot.z ? 1 : -1;
        bot.z = clamp(
          bot.z + zSign * effSpeed * 0.45 * clampedDt,
          -ARENA_HALF_SIZE + 0.6,
          ARENA_HALF_SIZE - 0.6
        );
      }
    }

    const actualSpeed = Math.hypot(bot.vx, bot.vz);
    bot.accelBlend = damp(
      bot.accelBlend,
      actualSpeed > 0.35 ? 1 : 0,
      accelRate,
      clampedDt
    );
    if (actualSpeed > 0.2) {
      // Foot synchronization with actual movement velocity (Part 2, 3.10)
      bot.walkPhase += actualSpeed * clampedDt * 2.4;
    }

    // Kinetic Leaper parabolic jump arc during windup/execution
    if (
      bot.archetype === 'leaper' &&
      (bot.attackState === 'windup' || bot.attackState === 'execution')
    ) {
      const leapNorm =
        bot.attackState === 'windup'
          ? 1 - bot.attackTimer / Math.max(0.1, bot.windupDuration)
          : 1.0;
      bot.verticalOffset = Math.sin(leapNorm * Math.PI) * 1.15;
    } else {
      bot.verticalOffset = damp(bot.verticalOffset, 0, 12, clampedDt);
    }

    // Part 2 (Direction 03, 4.1 & 4.13): Combat State Machine with Hit-Frame Event Guard
    if (bot.attackState === 'idle') {
      bot.attackTimer = Math.max(0, bot.attackTimer - clampedDt);
      if (
        dist <= bot.attackRange &&
        bot.attackTimer <= 0 &&
        bot.staggerTimer <= 0 &&
        activeWindups < 4
      ) {
        bot.attackState = 'windup';
        bot.attackTimer = bot.windupDuration;
        bot.attackInstanceId += 1;
        bot.specialAbilityActive =
          bot.archetype === 'leaper' ||
          bot.archetype === 'disruptor' ||
          bot.tier === 'miniboss' ||
          bot.tier === 'boss';
        activeWindups++;
      }
    } else if (bot.attackState === 'windup') {
      bot.attackTimer -= clampedDt;
      if (bot.attackTimer <= 0) {
        // Enter active execution frame and fire guarded hit event ONCE
        bot.attackState = 'execution';
        bot.attackTimer = bot.executionDuration;

        if (
          bot.alive &&
          bot.staggerTimer <= 0 &&
          bot.damageDealtForAttackId !== bot.attackInstanceId
        ) {
          bot.damageDealtForAttackId = bot.attackInstanceId;

          if (bot.archetype === 'exploder') {
            if (!bot.detonated) {
              bot.detonated = true;
              explosionsTriggered.push({ x: bot.x, y: bot.y + 1.0, z: bot.z });
              if (dist <= 5.0) {
                playerDamageTaken += bot.attackDamage;
                attacksTriggered++;
                lastAttackerX = bot.x;
                lastAttackerZ = bot.z;
              }
              bot.hp = 0;
              bot.alive = false;
              bot.deathStyle = 'explosive';
              bot.koTimer = 0.48;
              bot.activeAnimCategory = 'death';
            }
            continue;
          }

          if (dist <= bot.attackRange + 1.8) {
            playerDamageTaken += bot.attackDamage;
            attacksTriggered++;
            lastAttackerX = bot.x;
            lastAttackerZ = bot.z;
          }
        }
      }
    } else if (bot.attackState === 'execution') {
      bot.attackTimer -= clampedDt;
      if (bot.attackTimer <= 0) {
        bot.attackState = 'recover';
        bot.attackTimer = bot.recoverDuration;
        bot.specialAbilityActive = false;
      }
    } else if (bot.attackState === 'recover') {
      bot.attackTimer -= clampedDt;
      if (bot.attackTimer <= 0) {
        bot.attackState = 'idle';
        bot.attackTimer = 0.35;
      }
    }

    bot.activeAnimCategory = resolveEnemyAnimationCategory(bot);
  }

  return {
    playerDamageTaken,
    attacksTriggered,
    explosionsTriggered,
    bossPhaseChanged,
    lastAttackerX,
    lastAttackerZ,
  };
}

export interface DamageEnemyOptions {
  isHeadshot?: boolean;
  isWeakPoint?: boolean;
  hitArmor?: boolean;
  hitShield?: boolean;
}

export function damageEnemyBot(
  bot: EnemyBotState,
  amount: number,
  fromX: number,
  fromZ: number,
  options: DamageEnemyOptions = {}
): {
  killed: boolean;
  damageApplied: number;
  shieldHit: boolean;
  shieldBroken: boolean;
  armorHit: boolean;
  armorBroken: boolean;
  weakPointHit: boolean;
} {
  if (!bot.alive) {
    return {
      killed: false,
      damageApplied: 0,
      shieldHit: false,
      shieldBroken: false,
      armorHit: false,
      armorBroken: false,
      weakPointHit: false,
    };
  }

  let dmg = Math.max(1, Math.round(amount));
  const weakPointHit = Boolean(options.isWeakPoint || options.isHeadshot);
  if (options.isWeakPoint && !options.isHeadshot) {
    // Weak-point critical multiplier (1.8x) when not already scaled by headshot
    dmg = Math.round(dmg * 1.8);
  }

  bot.hitFlashTimer = 0.09;
  if (weakPointHit) {
    bot.weakPointFlashTimer = 0.18;
  }

  const dx = bot.x - fromX;
  const dz = bot.z - fromZ;
  const len = Math.hypot(dx, dz) || 1;
  bot.knockbackDirX = dx / len;
  bot.knockbackDirZ = dz / len;

  // Part 2 (Direction 04, 5.5): Determine 4-way incoming hit direction relative to bot facing yaw
  const incomingDirX = fromX - bot.x;
  const incomingDirZ = fromZ - bot.z;
  const forwardX = Math.sin(bot.yaw);
  const forwardZ = Math.cos(bot.yaw);
  const rightX = Math.cos(bot.yaw);
  const rightZ = -Math.sin(bot.yaw);
  const dotForward = (incomingDirX * forwardX + incomingDirZ * forwardZ) / len;
  const dotRight = (incomingDirX * rightX + incomingDirZ * rightZ) / len;

  let hitDir: EnemyHitDirection = 'front';
  if (Math.abs(dotForward) >= Math.abs(dotRight)) {
    hitDir = dotForward >= 0 ? 'front' : 'back';
  } else {
    hitDir = dotRight >= 0 ? 'right' : 'left';
  }
  bot.lastHitDirection = hitDir;
  bot.lastHitHeavy = dmg >= 55 || weakPointHit;

  const flinchMag = bot.lastHitHeavy ? 0.28 : 0.16;
  if (hitDir === 'front') {
    // Torso recoils backward
    bot.flinchPitch = clamp(bot.flinchPitch - flinchMag, -0.42, 0.42);
  } else if (hitDir === 'back') {
    // Torso moves forward
    bot.flinchPitch = clamp(bot.flinchPitch + flinchMag, -0.42, 0.42);
  } else if (hitDir === 'left') {
    // Body reacts toward the right
    bot.flinchRoll = clamp(bot.flinchRoll - flinchMag, -0.38, 0.38);
  } else {
    // Body reacts toward the left
    bot.flinchRoll = clamp(bot.flinchRoll + flinchMag, -0.38, 0.38);
  }

  // Shield Guardian / Iron Warden frontal shield absorption
  if (bot.shieldHp > 0 && (options.hitShield || (!options.isHeadshot && !options.isWeakPoint && hitDir === 'front'))) {
    const shieldDmg = Math.min(bot.shieldHp, dmg);
    bot.shieldHp = Math.max(0, bot.shieldHp - shieldDmg);
    const shieldBroken = bot.shieldHp <= 0;
    if (shieldBroken) {
      bot.staggerTimer = 0.48;
      bot.flinchPitch = -0.38;
    } else {
      bot.staggerTimer = 0.06;
    }
    return {
      killed: false,
      damageApplied: shieldDmg,
      shieldHit: true,
      shieldBroken,
      armorHit: false,
      armorBroken: false,
      weakPointHit: false,
    };
  }

  // Part 2 (Direction 04, 5.7): Breakable Armor Plate Absorption
  let armorHit = false;
  let armorBroken = false;
  if (bot.armorHp > 0 && !weakPointHit) {
    armorHit = true;
    bot.armorFlashTimer = 0.14;
    const absorbed = Math.min(bot.armorHp, Math.ceil(dmg * 0.35));
    bot.armorHp = Math.max(0, bot.armorHp - absorbed);
    dmg = Math.max(1, dmg - absorbed);
    if (bot.armorHp <= 0) {
      armorBroken = true;
      bot.flinchPitch = -0.32;
    }
  }

  bot.hp = Math.max(0, bot.hp - dmg);
  const isHeavy =
    bot.archetype === 'brute' ||
    bot.archetype === 'enforcer' ||
    bot.tier === 'miniboss' ||
    bot.tier === 'boss';

  // Part 2 (Direction 04, 5.8): Threshold-based Stagger with Boss Stagger Immunity
  bot.staggerMeter += dmg;
  if (
    bot.staggerMeter >= bot.staggerThreshold &&
    bot.staggerImmunityTimer <= 0
  ) {
    bot.staggerMeter = 0;
    bot.staggerTimer = isHeavy ? 0.28 : 0.38;
    if (bot.tier === 'boss' || bot.tier === 'miniboss') {
      // Prevent weak repeated hits from permanently stunlocking a boss
      bot.staggerImmunityTimer = 2.5;
    }
  } else if (!isHeavy && bot.staggerImmunityTimer <= 0) {
    bot.staggerTimer = Math.max(bot.staggerTimer, 0.09);
  }

  const knockbackStep = isHeavy ? 0.06 : 0.16;
  bot.x = clamp(
    bot.x + bot.knockbackDirX * knockbackStep,
    -ARENA_HALF_SIZE + 0.6,
    ARENA_HALF_SIZE - 0.6
  );
  bot.z = clamp(
    bot.z + bot.knockbackDirZ * knockbackStep,
    -ARENA_HALF_SIZE + 0.6,
    ARENA_HALF_SIZE - 0.6
  );

  if (bot.hp <= 0) {
    bot.alive = false;
    bot.attackState = 'idle';
    bot.specialAbilityActive = false;
    bot.koTimer = 0.48;
    const deathStyle: EnemyDeathStyle =
      bot.tier === 'boss'
        ? 'boss'
        : bot.tier === 'miniboss'
        ? 'miniboss'
        : bot.archetype === 'exploder'
        ? 'explosive'
        : options.isHeadshot
        ? 'headshot'
        : bot.archetype === 'rusher' ||
          bot.archetype === 'stalker' ||
          bot.archetype === 'leaper'
        ? 'runner'
        : isHeavy || dmg >= 75
        ? 'heavy'
        : 'standard';
    bot.deathStyle = deathStyle;
    bot.activeAnimCategory = 'death';
    return {
      killed: true,
      damageApplied: dmg,
      shieldHit: false,
      shieldBroken: false,
      armorHit,
      armorBroken,
      weakPointHit,
    };
  }

  bot.activeAnimCategory = resolveEnemyAnimationCategory(bot);

  return {
    killed: false,
    damageApplied: dmg,
    shieldHit: false,
    shieldBroken: false,
    armorHit,
    armorBroken,
    weakPointHit,
  };
}

/**
 * Part 10 (15.1 & 15.2): Profiles and validates the Enemy Ecosystem across Tests A through H
 * (10, 20, 30, 40, 50 standard enemies, 30 + 1 Mini-Boss, 20 + 1 Main Boss, and Max Wave Population).
 */
export function runEnemyEcosystemBenchmarks(
  colliders: AABBCollider[],
  ramps: RampCollider[]
): EnemyBenchmarkScenarioResult[] {
  const scenarios: Array<{
    id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
    label: string;
    standardCount: number;
    miniBossCount: number;
    mainBossCount: number;
  }> = [
    { id: 'A', label: 'TEST A: 10 Standard Enemies', standardCount: 10, miniBossCount: 0, mainBossCount: 0 },
    { id: 'B', label: 'TEST B: 20 Standard Enemies', standardCount: 20, miniBossCount: 0, mainBossCount: 0 },
    { id: 'C', label: 'TEST C: 30 Standard Enemies', standardCount: 30, miniBossCount: 0, mainBossCount: 0 },
    { id: 'D', label: 'TEST D: 40 Standard Enemies', standardCount: 40, miniBossCount: 0, mainBossCount: 0 },
    { id: 'E', label: 'TEST E: 50 Standard Enemies', standardCount: 50, miniBossCount: 0, mainBossCount: 0 },
    { id: 'F', label: 'TEST F: 30 Standard + 1 Mini-Boss', standardCount: 30, miniBossCount: 1, mainBossCount: 0 },
    { id: 'G', label: 'TEST G: 20 Standard + 1 Main Boss', standardCount: 20, miniBossCount: 0, mainBossCount: 1 },
    { id: 'H', label: 'TEST H: Max Intended Wave Population', standardCount: 45, miniBossCount: 2, mainBossCount: 1 },
  ];

  const stdRotation: EnemyArchetype[] = [
    'grunt',
    'rusher',
    'brute',
    'ranger',
    'shield',
    'exploder',
    'sniper',
    'commander',
    'stalker',
    'leaper',
    'disruptor',
  ];
  const miniRotation: EnemyArchetype[] = [
    'iron_warden',
    'ravager',
    'siege_engine',
    'brood_titan',
  ];
  const mainRotation: EnemyArchetype[] = ['colossus', 'overseer', 'abomination'];

  const wc = calculateWaveConfig(10);
  const player = createInitialPlayerState();
  const pool: EnemyBotState[] = [];
  for (let p = 0; p < 50; p++) {
    pool.push(createEnemyBot(p + 1, 'grunt', 0, 0, 0, wc));
  }

  return scenarios.map((sc) => {
    const bots: EnemyBotState[] = [];
    let reusedCount = 0;
    const totalEnemies = sc.standardCount + sc.miniBossCount + sc.mainBossCount;

    for (let i = 0; i < totalEnemies; i++) {
      const arch =
        i < sc.standardCount
          ? stdRotation[i % stdRotation.length]
          : i < sc.standardCount + sc.miniBossCount
          ? miniRotation[i % miniRotation.length]
          : mainRotation[i % mainRotation.length];

      const angle = (i / Math.max(1, totalEnemies)) * Math.PI * 2;
      const dist = 6 + (i % 5) * 3.2;
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist;

      if (pool.length > 0) {
        const recycled = pool.pop()!;
        resetPooledEnemyBot(recycled, i + 1, arch, bx, 0, bz, wc);
        bots.push(recycled);
        reusedCount++;
      } else {
        bots.push(createEnemyBot(i + 1, arch, bx, 0, bz, wc));
      }
    }

    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      stepEnemiesAI(bots, player, colliders, ramps, 0.016);
    }
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const avgCpuFrameMs = Number(((t1 - t0) / steps).toFixed(3));

    // Return bots to pool for next scenario
    for (let i = 0; i < bots.length; i++) {
      bots[i].alive = false;
      pool.push(bots[i]);
    }

    const totalPolygons =
      sc.standardCount * 60 + sc.miniBossCount * 84 + sc.mainBossCount * 96;
    const totalTriangles = totalPolygons * 2;
    const totalBones = totalEnemies * 13;

    return {
      id: sc.id,
      label: sc.label,
      standardCount: sc.standardCount,
      miniBossCount: sc.miniBossCount,
      mainBossCount: sc.mainBossCount,
      totalEnemies,
      totalPolygons,
      totalTriangles,
      totalBones,
      avgCpuFrameMs,
      aiUpdateHzNearby: 10,
      aiUpdateHzDistant: 2.8,
      pooledInstancesReused: reusedCount,
      withinBudget60Fps: avgCpuFrameMs < 16.67,
    };
  });
}

export const SHOP_ITEMS: ShopItemSpec[] = [
  {
    id: 'ammo_refill',
    name: 'FULL MUNITIONS REFILL',
    description: 'Restores full magazine + max reserve ammo for both weapons.',
    cost: 60,
    maxLevel: 99,
  },
  {
    id: 'medkit_patch',
    name: 'NANITE MED-INJECTOR',
    description: 'Immediately restores +50 Health (up to 100 HP).',
    cost: 75,
    maxLevel: 99,
  },
  {
    id: 'armor_plate',
    name: 'HEAVY ARMOR PLATE',
    description: 'Restores +60 Ballistic Armor (absorbs 65% incoming damage).',
    cost: 80,
    maxLevel: 99,
  },
  {
    id: 'weapon_damage',
    name: 'HIGH-VELOCITY CORES',
    description: 'Permanently increases weapon damage by +15% per rank.',
    cost: 140,
    maxLevel: 5,
  },
  {
    id: 'reload_speed',
    name: 'MAG-WELL ACCELERATOR',
    description: 'Permanently increases reload & handling speed by +12% per rank.',
    cost: 120,
    maxLevel: 5,
  },
];

export function purchaseShopItem(
  itemId: ShopItemId,
  credits: number,
  player: PlayerPhysicsState,
  weaponsRuntime: Record<WeaponId, WeaponRuntimeState>,
  upgrades: PlayerUpgradesState
): { success: boolean; newCredits: number; message: string } {
  const item = SHOP_ITEMS.find((it) => it.id === itemId);
  if (!item) return { success: false, newCredits: credits, message: 'INVALID ITEM' };

  const dynamicCost =
    itemId === 'weapon_damage'
      ? item.cost + upgrades.damageLevel * 45
      : itemId === 'reload_speed'
      ? item.cost + upgrades.reloadLevel * 40
      : item.cost;

  if (credits < dynamicCost) {
    return {
      success: false,
      newCredits: credits,
      message: `INSUFFICIENT CREDITS (${dynamicCost} CR REQUIRED)`,
    };
  }

  if (itemId === 'ammo_refill') {
    weaponsRuntime.assault_rifle.ammoInMag = WEAPON_SPECS.assault_rifle.magazineSize;
    weaponsRuntime.assault_rifle.reserveAmmo = WEAPON_SPECS.assault_rifle.maxReserve;
    weaponsRuntime.revolver.ammoInMag = WEAPON_SPECS.revolver.magazineSize;
    weaponsRuntime.revolver.reserveAmmo = WEAPON_SPECS.revolver.maxReserve;
    if (weaponsRuntime.shotgun) {
      weaponsRuntime.shotgun.ammoInMag = WEAPON_SPECS.shotgun.magazineSize;
      weaponsRuntime.shotgun.reserveAmmo = WEAPON_SPECS.shotgun.maxReserve;
    }
    return {
      success: true,
      newCredits: credits - dynamicCost,
      message: 'MUNITIONS FULLY RESTORED',
    };
  }

  if (itemId === 'medkit_patch') {
    if (player.health >= player.maxHealth) {
      return { success: false, newCredits: credits, message: 'HEALTH ALREADY AT MAXIMUM' };
    }
    player.health = Math.min(player.maxHealth, player.health + 50);
    return {
      success: true,
      newCredits: credits - dynamicCost,
      message: '+50 HEALTH RESTORED',
    };
  }

  if (itemId === 'armor_plate') {
    if (player.armor >= player.maxArmor) {
      return { success: false, newCredits: credits, message: 'ARMOR ALREADY AT MAXIMUM' };
    }
    player.armor = Math.min(player.maxArmor, player.armor + 60);
    return {
      success: true,
      newCredits: credits - dynamicCost,
      message: '+60 BALLISTIC ARMOR EQUIPPED',
    };
  }

  if (itemId === 'weapon_damage') {
    if (upgrades.damageLevel >= item.maxLevel) {
      return { success: false, newCredits: credits, message: 'DAMAGE UPGRADE MAXED' };
    }
    upgrades.damageLevel += 1;
    upgrades.damageMultiplier = Number((1 + upgrades.damageLevel * 0.15).toFixed(2));
    return {
      success: true,
      newCredits: credits - dynamicCost,
      message: `WEAPON DAMAGE UPGRADED TO LV.${upgrades.damageLevel} (${Math.round(
        upgrades.damageMultiplier * 100
      )}%)`,
    };
  }

  if (itemId === 'reload_speed') {
    if (upgrades.reloadLevel >= item.maxLevel) {
      return { success: false, newCredits: credits, message: 'RELOAD UPGRADE MAXED' };
    }
    upgrades.reloadLevel += 1;
    upgrades.reloadSpeedMultiplier = Number((1 + upgrades.reloadLevel * 0.12).toFixed(2));
    return {
      success: true,
      newCredits: credits - dynamicCost,
      message: `RELOAD SPEED UPGRADED TO LV.${upgrades.reloadLevel}`,
    };
  }

  return { success: false, newCredits: credits, message: 'UNABLE TO PURCHASE' };
}
