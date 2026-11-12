import {
  AABBCollider,
  CameraComfortPreset,
  CameraComfortSettings,
  CameraProceduralState,
  EnemyArchetype,
  EnemyBotState,
  PlayerPhysicsState,
  RampCollider,
  WeaponId,
  WeaponProceduralState,
  WeaponRuntimeState,
  WeaponSpec,
} from './types';

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
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
    isSprinting: false,
    isAiming: false,
    moveDistanceAccum: 0,
    lastStepDistance: 0,
    justJumped: false,
    justLandedVelocity: 0,
    health: 100,
    maxHealth: 100,
    hurtFlashTimer: 0,
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
    reloadProgress: 0,
    switchProgress: 0,
    crosshairSpread: WEAPON_SPECS.assault_rifle.spreadBase,
    triggerPress: 0,
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
}

export function stepPlayerPhysics(
  player: PlayerPhysicsState,
  input: PlayerMoveInput,
  colliders: AABBCollider[],
  ramps: RampCollider[],
  dt: number
): { steppedFoot: boolean; jumped: boolean; landedVelocity: number } {
  const clampedDt = Math.min(dt, 0.05);
  player.justJumped = false;
  player.justLandedVelocity = 0;
  if (player.hurtFlashTimer > 0) {
    player.hurtFlashTimer = Math.max(0, player.hurtFlashTimer - clampedDt);
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

  // Can sprint when moving forward/diagonally and not aiming
  const canSprint =
    input.sprintHeld && input.forward > 0.1 && !input.aimHeld && wishLen > 0.1;
  player.isSprinting = canSprint;
  player.isAiming = input.aimHeld && !canSprint;

  const baseSpeed = 8.4;
  const sprintMultiplier = 1.42;
  const aimMultiplier = 0.72;
  const backwardMultiplier = input.forward < -0.1 ? 0.86 : 1.0;
  const maxSpeed =
    baseSpeed *
    (canSprint
      ? sprintMultiplier
      : player.isAiming
      ? aimMultiplier
      : backwardMultiplier);

  const targetVx = wishX * maxSpeed;
  const targetVz = wishZ * maxSpeed;

  // Responsive acceleration on ground, slightly lower in air
  const accelLambda = player.grounded ? (wishLen > 0.05 ? 16 : 14) : 5.5;
  player.vx = damp(player.vx, targetVx, accelLambda, clampedDt);
  player.vz = damp(player.vz, targetVz, accelLambda, clampedDt);

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
    }
    player.y = Math.max(0, supportY);
    player.vy = 0;
    player.grounded = true;
  } else {
    if (player.y < 0) {
      player.y = 0;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }
  }

  // Track footsteps distance
  const horizSpeed = Math.hypot(player.vx, player.vz);
  let steppedFoot = false;
  if (player.grounded && horizSpeed > 0.8) {
    player.moveDistanceAccum += horizSpeed * clampedDt;
    const stepInterval = player.isSprinting ? 2.25 : 2.65;
    if (player.moveDistanceAccum - player.lastStepDistance >= stepInterval) {
      player.lastStepDistance = player.moveDistanceAccum;
      steppedFoot = true;
    }
  }

  return { steppedFoot, jumped, landedVelocity };
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
  // DYNAMIC FOV (anchored to user's baseFov setting, widens on sprint, zooms on ADS)
  // ---------------------------------------------------------------------------
  const clampedBaseFov = clamp(baseFov, 60, 105);
  const targetFov =
    clampedBaseFov +
    cameraAnim.sprintBlend * 5.5 -
    (player.isAiming ? 14 : 0);
  cameraAnim.currentFov = damp(
    cameraAnim.currentFov,
    clamp(targetFov, 45, 112),
    13,
    clampedDt
  );
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
  weaponAnim.queuedWeapon = targetWeapon;
  if (weaponAnim.phase !== 'lowering') {
    weaponAnim.phase = 'lowering';
    weaponAnim.phaseTimer = 0;
    weaponAnim.reloadProgress = 0;
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
  return true;
}

export function canFireWeapon(
  weaponAnim: WeaponProceduralState,
  runtime: WeaponRuntimeState
): boolean {
  return (
    weaponAnim.phase === 'ready' &&
    runtime.fireCooldown <= 0 &&
    runtime.ammoInMag > 0
  );
}

/**
 * Section 21.16: Coordinated Weapon & Camera Recoil Integration.
 * Assault Rifle: Small upward camera impulse, tiny backward impulse, controlled auto-fire response.
 * Revolver: Stronger upward impulse, distinct backward impulse, smooth spring return.
 */
export function applyWeaponShot(
  weaponAnim: WeaponProceduralState,
  cameraAnim: CameraProceduralState,
  runtime: WeaponRuntimeState,
  spec: WeaponSpec
): void {
  runtime.ammoInMag = Math.max(0, runtime.ammoInMag - 1);
  runtime.fireCooldown = 1 / spec.fireRate;

  const adsControl = 1 - weaponAnim.adsBlend * 0.28;
  const isRevolver = spec.id === 'revolver';

  // Weapon viewmodel recoil
  weaponAnim.recoilPosZ = clamp(
    weaponAnim.recoilPosZ + spec.recoilKickBack * adsControl,
    0,
    spec.recoilKickBack * 2.2
  );
  weaponAnim.recoilPosY = clamp(
    weaponAnim.recoilPosY + spec.recoilKickBack * 0.25 * adsControl,
    0,
    0.04
  );
  weaponAnim.recoilRotX = clamp(
    weaponAnim.recoilRotX + spec.recoilPitchUp * adsControl,
    0,
    spec.recoilPitchUp * 2.4
  );
  weaponAnim.recoilRotZ +=
    (Math.random() - 0.5) * spec.recoilYawSpread * 2.5 * adsControl;

  // Section 21.16 Coordinated Camera Recoil Impulses (distinct AR vs Revolver profiles)
  if (isRevolver) {
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
    38
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

export function stepWeaponProcedural(
  weaponAnim: WeaponProceduralState,
  weaponsRuntime: Record<WeaponId, WeaponRuntimeState>,
  player: PlayerPhysicsState,
  strafeInput: number,
  dt: number,
  weaponSwayIntensity = 1.0
): { reloadCompleted: boolean; switchedTo: WeaponId | null } {
  const clampedDt = Math.min(dt, 0.05);
  let reloadCompleted = false;
  let switchedTo: WeaponId | null = null;

  // Cooldowns
  weaponsRuntime.assault_rifle.fireCooldown = Math.max(
    0,
    weaponsRuntime.assault_rifle.fireCooldown - clampedDt
  );
  weaponsRuntime.revolver.fireCooldown = Math.max(
    0,
    weaponsRuntime.revolver.fireCooldown - clampedDt
  );

  const spec = WEAPON_SPECS[weaponAnim.activeWeapon];
  const activeRuntime = weaponsRuntime[weaponAnim.activeWeapon];

  // State machine for switching & reloading
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
  } else {
    weaponAnim.switchProgress = damp(weaponAnim.switchProgress, 0, 16, clampedDt);
    weaponAnim.reloadProgress = 0;
  }

  // Idle breathing clock
  weaponAnim.idleTime += clampedDt * 1.9;

  // Movement walk/sprint clock (continuous velocity-driven phase)
  const horizSpeed = Math.hypot(player.vx, player.vz);
  const speedNorm = clamp(horizSpeed / 8.4, 0, 1.4);
  if (player.grounded && horizSpeed > 0.2) {
    weaponAnim.walkTime += clampedDt * horizSpeed * (player.isSprinting ? 1.15 : 1.05);
  }

  // Sprint & ADS blend (Section 20.4 & 20.8: ~180-250ms ADS entry, ~150-220ms exit; slightly heavier on Revolver)
  const targetSprint =
    player.isSprinting && weaponAnim.phase === 'ready' && horizSpeed > 1.5 ? 1 : 0;
  const targetAds =
    player.isAiming && weaponAnim.phase === 'ready' && !player.isSprinting ? 1 : 0;
  const isAR = weaponAnim.activeWeapon === 'assault_rifle';
  const adsEntryLambda = isAR ? 15.5 : 13.2;
  const adsExitLambda = isAR ? 18.0 : 15.8;
  weaponAnim.sprintBlend = damp(weaponAnim.sprintBlend, targetSprint, 11, clampedDt);
  weaponAnim.adsBlend = damp(
    weaponAnim.adsBlend,
    targetAds,
    targetAds > weaponAnim.adsBlend ? adsEntryLambda : adsExitLambda,
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

  // Crosshair dynamic target spread (tightens significantly in ADS)
  const targetSpread =
    (spec.spreadBase + speedNorm * spec.spreadMove * (player.grounded ? 1 : 1.6)) *
    (1 - weaponAnim.adsBlend * 0.72);
  weaponAnim.crosshairSpread = damp(weaponAnim.crosshairSpread, targetSpread, 12, clampedDt);

  return { reloadCompleted, switchedTo };
}

export interface WaveConfig {
  wave: number;
  totalEnemies: number;
  maxConcurrent: number;
  archetypeWeights: Record<EnemyArchetype, number>;
  hpScale: number;
  speedScale: number;
}

export function calculateWaveConfig(wave: number): WaveConfig {
  const safeWave = Math.max(1, wave);
  const totalEnemies = 4 + safeWave * 2;
  const maxConcurrent = Math.min(4 + Math.floor(safeWave * 1.2), 10);
  const hpScale = 1 + (safeWave - 1) * 0.14;
  const speedScale = Math.min(1 + (safeWave - 1) * 0.05, 1.35);

  return {
    wave: safeWave,
    totalEnemies,
    maxConcurrent,
    archetypeWeights: {
      rusher: 0.45,
      ranger: safeWave >= 1 ? 0.35 : 0.2,
      enforcer: safeWave >= 2 ? 0.2 : 0.1,
    },
    hpScale,
    speedScale,
  };
}

export function createEnemyBot(
  id: number,
  archetype: EnemyArchetype,
  x: number,
  y: number,
  z: number,
  waveConfig: WaveConfig
): EnemyBotState {
  if (archetype === 'rusher') {
    const maxHp = Math.round(70 * waveConfig.hpScale);
    return {
      id,
      archetype,
      x,
      y,
      z,
      vx: 0,
      vz: 0,
      yaw: 0,
      hp: maxHp,
      maxHp,
      speed: 5.8 * waveConfig.speedScale,
      preferredRange: 2.3,
      attackRange: 3.1,
      attackDamage: 12,
      attackState: 'idle',
      attackTimer: 0.4,
      windupDuration: 0.38,
      recoverDuration: 0.75,
      hitFlashTimer: 0,
      staggerTimer: 0,
      walkPhase: (id * 1.3) % (Math.PI * 2),
      alive: true,
      koTimer: 0,
      knockbackDirX: 0,
      knockbackDirZ: 0,
    };
  }

  if (archetype === 'ranger') {
    const maxHp = Math.round(90 * waveConfig.hpScale);
    return {
      id,
      archetype,
      x,
      y,
      z,
      vx: 0,
      vz: 0,
      yaw: 0,
      hp: maxHp,
      maxHp,
      speed: 4.3 * waveConfig.speedScale,
      preferredRange: 11.5,
      attackRange: 17.5,
      attackDamage: 11,
      attackState: 'idle',
      attackTimer: 0.8,
      windupDuration: 0.52,
      recoverDuration: 1.25,
      hitFlashTimer: 0,
      staggerTimer: 0,
      walkPhase: (id * 1.7) % (Math.PI * 2),
      alive: true,
      koTimer: 0,
      knockbackDirX: 0,
      knockbackDirZ: 0,
    };
  }

  // Enforcer: heavy armored line-of-sight charger/bruiser
  const maxHp = Math.round(145 * waveConfig.hpScale);
  return {
    id,
    archetype: 'enforcer',
    x,
    y,
    z,
    vx: 0,
    vz: 0,
    yaw: 0,
    hp: maxHp,
    maxHp,
    speed: 3.8 * waveConfig.speedScale,
    preferredRange: 4.0,
    attackRange: 6.2,
    attackDamage: 18,
    attackState: 'idle',
    attackTimer: 0.65,
    windupDuration: 0.58,
    recoverDuration: 1.35,
    hitFlashTimer: 0,
    staggerTimer: 0,
    walkPhase: (id * 2.1) % (Math.PI * 2),
    alive: true,
    koTimer: 0,
    knockbackDirX: 0,
    knockbackDirZ: 0,
  };
}

/**
 * Checks whether a short 2D movement ray from (sx, sz) along (dirX, dirZ) of length `dist`
 * intersects any solid AABB collider at `botY`.
 */
function isRayBlockedByCollider(
  sx: number,
  sz: number,
  botY: number,
  dirX: number,
  dirZ: number,
  dist: number,
  radius: number,
  colliders: AABBCollider[]
): boolean {
  const steps = 3;
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
  }
  return false;
}

/**
 * Computes an obstacle-aware, ramp-aware tactical movement direction for an enemy bot.
 * - Routes ground bots to the East/West ramp entrances when the player is on the central platform.
 * - Uses a 7-angle feeler fan (0, +-25, +-52, +-80 deg) to steer around pillars, cover blocks, and platform walls.
 */
function computeTacticalNavigationDir(
  bot: EnemyBotState,
  player: PlayerPhysicsState,
  colliders: AABBCollider[]
): { navDirX: number; navDirZ: number } {
  let goalX = player.x;
  let goalZ = player.z;

  const playerOnPlatform =
    player.y > 1.0 || (Math.abs(player.x) < 4.6 && Math.abs(player.z) < 3.9);
  const botOnPlatform =
    bot.y > 1.0 || (Math.abs(bot.x) < 4.6 && Math.abs(bot.z) < 3.9 && bot.y > 0.6);
  const botInRampCorridor = Math.abs(bot.z) <= 2.35 && Math.abs(bot.x) <= 11.8;

  if (playerOnPlatform && !botOnPlatform) {
    // Player is on the elevated central platform and bot is on the ground:
    // Route bot to the nearest ramp entrance, then up the ramp!
    if (botInRampCorridor && Math.abs(bot.x) > 4.2) {
      goalX = 0;
      goalZ = clamp(player.z, -1.6, 1.6);
    } else {
      const westEntryX = -11.4;
      const eastEntryX = 11.4;
      const distWest = Math.hypot(bot.x - westEntryX, bot.z);
      const distEast = Math.hypot(bot.x - eastEntryX, bot.z);
      goalX = distWest <= distEast ? westEntryX : eastEntryX;
      goalZ = 0;
    }
  } else if (!playerOnPlatform && botOnPlatform) {
    // Bot is on the platform and player is on the ground: route out via nearest East/West ramp
    const exitX = player.x < 0 ? -11.4 : 11.4;
    goalX = exitX;
    goalZ = 0;
  } else if (
    !playerOnPlatform &&
    !botOnPlatform &&
    bot.z * player.z < 0 &&
    Math.abs(bot.x) < 5.2 &&
    Math.abs(player.x) < 5.2
  ) {
    // Central platform is directly between bot (North/South) and player (South/North):
    // Route around the East or West flank of the central platform
    const flankX = bot.x + player.x >= 0 ? 7.2 : -7.2;
    goalX = flankX;
    goalZ = 0;
  }

  const dx = goalX - bot.x;
  const dz = goalZ - bot.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const baseDirX = dx / dist;
  const baseDirZ = dz / dist;

  // Test 7 feeler angles to steer smoothly around pillars and cover blocks
  const feelerAngles = [
    0,
    0.44,
    -0.44,
    0.9,
    -0.9,
    1.38,
    -1.38,
  ];
  const feelerDist = Math.min(3.2, dist);

  for (let a = 0; a < feelerAngles.length; a++) {
    const ang = feelerAngles[a];
    // Alternate left/right feeler preference per bot id so groups split & flank naturally
    const signedAng = bot.id % 2 === 0 ? ang : -ang;
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
        0.54,
        colliders
      )
    ) {
      return { navDirX: candX, navDirZ: candZ };
    }
  }

  return { navDirX: baseDirX, navDirZ: baseDirZ };
}

export function stepEnemiesAI(
  enemies: EnemyBotState[],
  player: PlayerPhysicsState,
  colliders: AABBCollider[],
  ramps: RampCollider[],
  dt: number
): { playerDamageTaken: number; attacksTriggered: number } {
  const clampedDt = Math.min(dt, 0.05);
  let playerDamageTaken = 0;
  let attacksTriggered = 0;

  // Crowd token pool: max 3 bots in 'windup' simultaneously
  let activeWindups = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].alive && enemies[i].attackState === 'windup') {
      activeWindups++;
    }
  }

  for (let i = 0; i < enemies.length; i++) {
    const bot = enemies[i];
    if (bot.hitFlashTimer > 0) {
      bot.hitFlashTimer = Math.max(0, bot.hitFlashTimer - clampedDt);
    }

    if (!bot.alive) {
      if (bot.koTimer > 0) {
        bot.koTimer = Math.max(0, bot.koTimer - clampedDt);
        bot.x += bot.knockbackDirX * 2.2 * clampedDt;
        bot.z += bot.knockbackDirZ * 2.2 * clampedDt;
      }
      continue;
    }

    if (bot.staggerTimer > 0) {
      bot.staggerTimer = Math.max(0, bot.staggerTimer - clampedDt);
    }

    const dx = player.x - bot.x;
    const dz = player.z - bot.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const directDirX = dx / dist;
    const directDirZ = dz / dist;

    // Compute obstacle-aware & ramp-aware navigation direction
    const { navDirX, navDirZ } = computeTacticalNavigationDir(bot, player, colliders);

    // Smoothly face player (or navigation direction when navigating around an obstacle)
    const lookDirX = dist > 5.0 ? navDirX * 0.6 + directDirX * 0.4 : directDirX;
    const lookDirZ = dist > 5.0 ? navDirZ * 0.6 + directDirZ * 0.4 : directDirZ;
    bot.yaw = Math.atan2(lookDirX, lookDirZ);

    // Distinct movement policy per archetype using navDirX / navDirZ
    let moveX = 0;
    let moveZ = 0;

    if (bot.staggerTimer <= 0) {
      if (bot.archetype === 'rusher') {
        // Rusher: fast pursuit with slight weaving flank
        const weaveSign = i % 2 === 0 ? 1 : -1;
        const perpX = -navDirZ * weaveSign * 0.24;
        const perpZ = navDirX * weaveSign * 0.24;
        if (dist > bot.preferredRange) {
          moveX = (navDirX + perpX) * bot.speed;
          moveZ = (navDirZ + perpZ) * bot.speed;
        }
      } else if (bot.archetype === 'ranger') {
        // Ranger: maintains mid-range combat distance, backs up if player gets too close, strafes at ideal distance
        const strafeDir = i % 2 === 0 ? 1 : -1;
        if (dist > bot.preferredRange + 2.0) {
          moveX = navDirX * bot.speed;
          moveZ = navDirZ * bot.speed;
        } else if (dist < bot.preferredRange - 2.5) {
          moveX = -directDirX * bot.speed * 0.85;
          moveZ = -directDirZ * bot.speed * 0.85;
        } else {
          moveX = -directDirZ * strafeDir * bot.speed * 0.75;
          moveZ = directDirX * strafeDir * bot.speed * 0.75;
        }
      } else {
        // Enforcer: heavy advance; surges faster during windup charge
        const chargeBoost = bot.attackState === 'windup' ? 1.45 : 1.0;
        if (dist > bot.preferredRange) {
          moveX = navDirX * bot.speed * chargeBoost;
          moveZ = navDirZ * bot.speed * chargeBoost;
        }
      }
    }

    // Soft separation from other bots
    for (let j = 0; j < enemies.length; j++) {
      if (i === j || !enemies[j].alive) continue;
      const ox = bot.x - enemies[j].x;
      const oz = bot.z - enemies[j].z;
      const oDist = Math.hypot(ox, oz);
      if (oDist > 0.001 && oDist < 1.35) {
        const push = ((1.35 - oDist) / 1.35) * 3.5;
        moveX += (ox / oDist) * push;
        moveZ += (oz / oDist) * push;
      }
    }

    bot.vx = damp(bot.vx, moveX, 10, clampedDt);
    bot.vz = damp(bot.vz, moveZ, 10, clampedDt);

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

    // Pre-step ramp height so bots climb onto the central platform smoothly
    const preBotY = getSurfaceHeightAt(nextBotX, nextBotZ, bot.y, colliders, ramps);
    if (preBotY > bot.y && preBotY - bot.y <= 0.65) {
      bot.y = preBotY;
    }

    bot.x = nextBotX;
    bot.z = nextBotZ;

    // Keep bots out of solid obstacles & ramp side walls
    const dummyPlayerState: PlayerPhysicsState = {
      ...player,
      x: bot.x,
      y: bot.y,
      z: bot.z,
      radius: 0.52,
      height: 1.8,
    };
    resolveHorizontalAABB(dummyPlayerState, colliders, ramps);
    bot.x = dummyPlayerState.x;
    bot.z = dummyPlayerState.z;
    bot.y = getSurfaceHeightAt(bot.x, bot.z, bot.y, colliders, ramps);

    const actualSpeed = Math.hypot(bot.vx, bot.vz);
    if (actualSpeed > 0.25) {
      bot.walkPhase += actualSpeed * clampedDt * 2.4;
    }

    // Attack state machine with windup telegraph
    if (bot.attackState === 'idle') {
      bot.attackTimer = Math.max(0, bot.attackTimer - clampedDt);
      if (dist <= bot.attackRange && bot.attackTimer <= 0 && activeWindups < 3) {
        bot.attackState = 'windup';
        bot.attackTimer = bot.windupDuration;
        activeWindups++;
      }
    } else if (bot.attackState === 'windup') {
      bot.attackTimer -= clampedDt;
      if (bot.attackTimer <= 0) {
        // Execute attack if still within forgiving range
        if (dist <= bot.attackRange + 1.8) {
          playerDamageTaken += bot.attackDamage;
          attacksTriggered++;
        }
        bot.attackState = 'recover';
        bot.attackTimer = bot.recoverDuration;
      }
    } else if (bot.attackState === 'recover') {
      bot.attackTimer -= clampedDt;
      if (bot.attackTimer <= 0) {
        bot.attackState = 'idle';
        bot.attackTimer = 0.35;
      }
    }
  }

  return { playerDamageTaken, attacksTriggered };
}

export function damageEnemyBot(
  bot: EnemyBotState,
  amount: number,
  fromX: number,
  fromZ: number
): { killed: boolean; damageApplied: number } {
  if (!bot.alive) return { killed: false, damageApplied: 0 };
  const dmg = Math.max(1, Math.round(amount));
  bot.hp = Math.max(0, bot.hp - dmg);
  bot.hitFlashTimer = 0.09;
  bot.staggerTimer = 0.14;

  const dx = bot.x - fromX;
  const dz = bot.z - fromZ;
  const len = Math.hypot(dx, dz) || 1;
  bot.knockbackDirX = dx / len;
  bot.knockbackDirZ = dz / len;
  bot.x = clamp(
    bot.x + bot.knockbackDirX * 0.16,
    -ARENA_HALF_SIZE + 0.6,
    ARENA_HALF_SIZE - 0.6
  );
  bot.z = clamp(
    bot.z + bot.knockbackDirZ * 0.16,
    -ARENA_HALF_SIZE + 0.6,
    ARENA_HALF_SIZE - 0.6
  );

  if (bot.hp <= 0) {
    bot.alive = false;
    bot.koTimer = 0.42; // 0.42s KO topple transition
    return { killed: true, damageApplied: dmg };
  }
  return { killed: false, damageApplied: dmg };
}
