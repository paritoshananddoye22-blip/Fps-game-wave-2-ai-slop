export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type WeaponId = 'assault_rifle' | 'revolver';

export type WeaponSwitchPhase = 'ready' | 'lowering' | 'raising' | 'reloading';

export type CameraComfortPreset = 'low' | 'normal' | 'enhanced';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  role: string;
  keyBinding: '1' | '2';
  automatic: boolean;
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // shots per second
  magazineSize: number;
  maxReserve: number;
  reloadDuration: number; // seconds
  switchDuration: number; // seconds for lower + raise
  recoilKickBack: number;
  recoilPitchUp: number;
  recoilYawSpread: number;
  screenShakeTrauma: number;
  spreadBase: number;
  spreadMove: number;
  spreadFire: number;
  maxTriangles: number;
}

export interface WeaponRuntimeState {
  id: WeaponId;
  ammoInMag: number;
  reserveAmmo: number;
  fireCooldown: number;
}

export interface AABBCollider {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  materialType: 'concrete' | 'metal' | 'accent';
}

export interface RampCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  startY: number;
  endY: number;
  axis: 'x+' | 'x-' | 'z+' | 'z-';
}

export interface PlayerPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  radius: number;
  height: number;
  eyeHeight: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  isSprinting: boolean;
  isAiming: boolean;
  moveDistanceAccum: number;
  lastStepDistance: number;
  justJumped: boolean;
  justLandedVelocity: number;
  health: number;
  maxHealth: number;
  hurtFlashTimer: number;
}

/**
 * Section 21: Composable First-Person Head Movement & Camera Animation State.
 * Each transform layer is computed independently and combined cleanly through the camera hierarchy.
 */
export interface CameraProceduralState {
  // Base vertical tracking (smooth ramp/platform step transition without affecting collision capsule)
  smoothedBaseY: number;
  groundedBlend: number;
  sprintBlend: number;

  // 21.3 / 21.4 / 21.5 Walking, Running & Sprinting Head Bob Transform
  bobTime: number;
  bobOffsetX: number;
  bobOffsetY: number;
  bobOffsetZ: number;
  bobPitch: number;
  bobRoll: number;

  // 21.6 Idle Head Breathing Transform
  breathTime: number;
  breathOffsetY: number;
  breathPitch: number;
  breathRoll: number;

  // 21.7 / 21.9 / 21.10 / 21.11 Head Inertia, Look Sway, Strafe & Sprint Offset Transform
  prevLocalVelForward: number;
  prevLocalVelRight: number;
  inertiaPosX: number;
  inertiaPosZ: number;
  inertiaVelX: number;
  inertiaVelZ: number;
  inertiaPitch: number;
  inertiaRoll: number;
  inertiaPitchVel: number;
  inertiaRollVel: number;

  lookSwayPosX: number;
  lookSwayPosY: number;
  lookSwayVelX: number;
  lookSwayVelY: number;
  swayYaw: number;
  swayPitch: number;
  swayRoll: number;
  swayYawVel: number;
  swayPitchVel: number;

  strafeOffsetX: number;
  strafeRoll: number;
  sprintForwardOffsetZ: number;
  sprintPitchBias: number;

  // 21.12 / 21.13 Jump Takeoff/Airborne & Velocity-Based Landing Impulse Transform
  jumpOffsetY: number;
  jumpVelY: number;
  jumpPitch: number;
  jumpPitchVel: number;
  landingOffsetY: number;
  landingVelocityY: number;
  landingPitch: number;
  landingPitchVel: number;
  landingRoll: number;
  landingRollVel: number;

  // 21.16 Camera Recoil & Trauma Shake Transform
  recoilOffsetZ: number;
  recoilVelZ: number;
  recoilPitch: number;
  recoilPitchVel: number;
  recoilRoll: number;
  recoilRollVel: number;
  shakeTrauma: number;
  shakePhase: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  shakeRoll: number;

  // Dynamic Field of View
  currentFov: number;
}

export interface WeaponProceduralState {
  activeWeapon: WeaponId;
  queuedWeapon: WeaponId;
  phase: WeaponSwitchPhase;
  phaseTimer: number;
  idleTime: number;
  walkTime: number;
  swayPosX: number;
  swayPosY: number;
  swayRotX: number;
  swayRotY: number;
  swayRotZ: number;
  inertiaVelX: number;
  inertiaVelY: number;
  recoilPosZ: number;
  recoilPosY: number;
  recoilRotX: number;
  recoilRotZ: number;
  sprintBlend: number;
  adsBlend: number;
  reloadProgress: number;
  switchProgress: number; // 0 = ready, 1 = fully lowered
  crosshairSpread: number;
  triggerPress: number; // 0 = resting on/near trigger, 1 = fully pulled
}

export type EnemyArchetype = 'rusher' | 'ranger' | 'enforcer';

export type EnemyAttackState = 'idle' | 'windup' | 'recover';

export interface EnemyBotState {
  id: number;
  archetype: EnemyArchetype;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  speed: number;
  preferredRange: number;
  attackRange: number;
  attackDamage: number;
  attackState: EnemyAttackState;
  attackTimer: number;
  windupDuration: number;
  recoverDuration: number;
  hitFlashTimer: number;
  staggerTimer: number;
  walkPhase: number;
  alive: boolean;
  koTimer: number; // > 0 while playing 0.4s KO topple before removal
  knockbackDirX: number;
  knockbackDirZ: number;
}

export interface AmmoPickupState {
  id: number;
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
  bobPhase: number;
}

export interface FloatingDamageNumber {
  id: number;
  x: number;
  y: number;
  z: number;
  amount: number;
  critical: boolean;
  timer: number;
  maxTimer: number;
}

export type InspectionViewMode =
  | 'off'
  | 'ads'
  | 'side'
  | 'front'
  | 'top'
  | 'rear';

export interface AssaultRifleTriangleBreakdown {
  receiver: number;
  barrel: number;
  handguard: number;
  magazine: number;
  grip: number;
  stock: number;
  frontSight: number;
  rearSight: number;
  remaining: number;
  total: number;
}

export interface RevolverTriangleBreakdown {
  frame: number;
  barrel: number;
  cylinder: number;
  grip: number;
  hammer: number;
  trigger: number;
  frontSight: number;
  rearSight: number;
  remaining: number;
  total: number;
}

export interface CameraComfortSettings {
  cameraPreset: CameraComfortPreset;
  headBobIntensity: number; // 0 to 1.5, default 1.0
  sprintBobIntensity: number; // 0 to 1.5, default 1.0
  cameraSwayIntensity: number; // 0 to 1.5, default 1.0
  cameraRollIntensity: number; // 0 to 1.5, default 1.0
  landingEffectIntensity: number; // 0 to 1.5, default 1.0
  weaponSwayIntensity: number; // 0 to 1.5, default 1.0
  breathingIntensity: number; // 0 to 1.5, default 1.0
  cameraShakeIntensity: number; // 0 to 1.5, default 1.0
}

export interface GameSettings extends CameraComfortSettings {
  sensitivity: number; // 0.2 to 2.5, default 1.0
  fov: number; // 60 to 105 degrees, default 75
  volume: number; // 0 to 1, default 0.75
  muted: boolean;
  showHands: boolean; // Toggle first-person hands ON / OFF
}

export interface RunSummary {
  score: number;
  bestScore: number;
  wave: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  victory: boolean;
}
