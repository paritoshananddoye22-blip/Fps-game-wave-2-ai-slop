export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type WeaponId = 'assault_rifle' | 'revolver' | 'shotgun';

export type WeaponSwitchPhase = 'ready' | 'lowering' | 'raising' | 'reloading' | 'melee';

export type CameraComfortPreset = 'low' | 'normal' | 'enhanced';

export type PlayerAnimationState =
  | 'Idle'
  | 'Walking'
  | 'Running'
  | 'Sprinting'
  | 'JumpStart'
  | 'JumpAscending'
  | 'Airborne'
  | 'Falling'
  | 'Landing'
  | 'Crouching'
  | 'Sliding'
  | 'Shooting'
  | 'Reloading'
  | 'WeaponSwitching'
  | 'MeleeAttacking'
  | 'Damaged'
  | 'Staggered'
  | 'Dead';

export type PlayerIdleVariation = 'IdleA' | 'IdleB' | 'IdleC' | 'IdleD';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  role: string;
  keyBinding: '1' | '2' | '3';
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
  pelletCount?: number;
  effectiveRange?: number;
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
  isGrounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  isMoving: boolean;
  isRunning: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  crouchBlend: number;
  isSliding: boolean;
  slideTimer: number;
  slideCooldownTimer: number;
  slideDirX: number;
  slideDirZ: number;
  isAiming: boolean;
  stridePhase: number;
  lastFootstepSide: 'left' | 'right';
  moveDistanceAccum: number;
  lastStepDistance: number;
  justJumped: boolean;
  justLandedVelocity: number;
  landingRecoveryTimer: number;
  lastLandingHeavy: boolean;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  hurtFlashTimer: number;
  staggerTimer: number;
  lastDamageAngle: number; // world-space angle toward damage source
  lastDamageDir: 'front' | 'back' | 'left' | 'right';
  isDead: boolean;
  deathTriggered: boolean;
  deathAnimTimer: number;
  animState: PlayerAnimationState;
  idleVariation: PlayerIdleVariation;
  idleVariationTimer: number;
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

  // Dynamic Field of View & Slide / Damage / Death Camera Presentation
  currentFov: number;
  slideRollOffset: number;
  slideDropOffset: number;
  damageKickPitch: number;
  damageKickRoll: number;
  damageDropOffset: number;
}

export interface WeaponProceduralState {
  activeWeapon: WeaponId;
  queuedWeapon: WeaponId;
  phase: WeaponSwitchPhase;
  phaseTimer: number;
  idleTime: number;
  idleVariation: PlayerIdleVariation;
  idleVariationTimer: number;
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
  slideBlend: number;
  reloadProgress: number;
  switchProgress: number; // 0 = ready, 1 = fully lowered
  meleeProgress: number; // 0 = inactive, 0..1 = active 5-stage melee attack
  meleeInstanceId: number;
  meleeDamageDealtForId: number;
  damageReactX: number;
  damageReactY: number;
  damageReactRoll: number;
  deathDropBlend: number;
  crosshairSpread: number;
  triggerPress: number; // 0 = resting on/near trigger, 1 = fully pulled
  pumpProgress: number; // 0 = forward ready, 0..1 = shotgun pump fore-end cycle
  shellInsertProgress: number; // 0..1 individual shotgun shell insertion cycle
  shellInsertedInCycle: boolean; // guards single shell insertion per reload cycle
}

/**
 * Complete Low-Poly Enemy Ecosystem:
 * - 11 Normal Enemies (Strictly <= 124 polygons per character)
 * - 4 Mini-Bosses (Strictly <= 200 polygons per character)
 * - 3 Main Bosses (Strictly <= 250 polygons per character)
 * Includes backwards-compatible aliases ('rusher', 'ranger', 'enforcer', 'boss').
 */
export type EnemyArchetype =
  | 'grunt'
  | 'rusher'
  | 'brute'
  | 'ranger'
  | 'shield'
  | 'exploder'
  | 'sniper'
  | 'commander'
  | 'stalker'
  | 'leaper'
  | 'disruptor'
  | 'iron_warden'
  | 'ravager'
  | 'siege_engine'
  | 'brood_titan'
  | 'colossus'
  | 'overseer'
  | 'abomination'
  | 'boss'
  | 'enforcer';

export type EnemyTier = 'normal' | 'miniboss' | 'boss';

export type EnemyBehaviorModule =
  | 'MeleeBehavior'
  | 'RangedBehavior'
  | 'DefensiveBehavior'
  | 'ExplosiveBehavior'
  | 'FlankingBehavior'
  | 'SummoningBehavior'
  | 'BossBehavior';

export type EnemyAnimationCategory =
  | 'idle'
  | 'locomotion'
  | 'combat'
  | 'damage'
  | 'death'
  | 'boss_presentation';

export type EnemyHitDirection = 'front' | 'back' | 'left' | 'right';

export type EnemyAttackState = 'idle' | 'windup' | 'execution' | 'recover';

export type EnemyDeathStyle =
  | 'standard'
  | 'runner'
  | 'headshot'
  | 'heavy'
  | 'explosive'
  | 'miniboss'
  | 'boss';

export interface EnemyBotState {
  id: number;
  archetype: EnemyArchetype;
  tier: EnemyTier;
  behaviorModule: EnemyBehaviorModule;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  targetYaw: number;
  turnSpeed: number;
  hp: number;
  maxHp: number;
  armorHp: number;
  maxArmorHp: number;
  shieldHp: number;
  maxShieldHp: number;
  speed: number;
  preferredRange: number;
  attackRange: number;
  attackDamage: number;
  attackState: EnemyAttackState;
  attackTimer: number;
  windupDuration: number;
  executionDuration: number;
  recoverDuration: number;
  attackInstanceId: number;
  damageDealtForAttackId: number;
  specialAbilityCooldown: number;
  specialAbilityActive: boolean;
  hitFlashTimer: number;
  armorFlashTimer: number;
  weakPointFlashTimer: number;
  lastHitDirection: EnemyHitDirection;
  lastHitHeavy: boolean;
  staggerTimer: number;
  staggerMeter: number;
  staggerThreshold: number;
  staggerImmunityTimer: number;
  flinchPitch: number;
  flinchRoll: number;
  walkPhase: number;
  idleTime: number;
  accelBlend: number;
  verticalOffset: number;
  spawnAnimTimer: number; // Emergence / Boss Intro presentation timer
  bossIntroTimer: number; // 2.0-3.5s boss intro sequence
  bossPhaseTransitionTimer: number; // Phase transition animation lock
  bossPhaseTriggeredMask: number; // Bitmask preventing duplicate phase transitions
  bossPhase: 1 | 2 | 3;
  activeSignatureAttack: string;
  aiDecisionTimer: number;
  cachedNavDirX: number;
  cachedNavDirZ: number;
  animLodLevel: 0 | 1 | 2;
  navCategory?: EnemyNavCategory;
  collisionRadius?: number;
  stuckTimer?: number;
  lastProgressX?: number;
  lastProgressZ?: number;
  repathCount?: number;
  alive: boolean;
  koTimer: number; // > 0 while playing KO collapse before pooling/cleanup
  detonated: boolean; // Prevents duplicate exploder detonation
  rewardGranted: boolean; // Prevents duplicate score/credit reward
  pooled: boolean;
  deathStyle: EnemyDeathStyle;
  knockbackDirX: number;
  knockbackDirZ: number;
  creditReward: number;
  scoreReward: number;
  activeAnimCategory: EnemyAnimationCategory;
}

export type PickupKind = 'ammo' | 'health' | 'armor';

export interface AmmoPickupState {
  id: number;
  kind: PickupKind;
  label: string;
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
  bobPhase: number;
}

export interface PlayerUpgradesState {
  damageLevel: number; // 0..5 (+15% per level)
  reloadLevel: number; // 0..5 (+12% faster reload per level)
  damageMultiplier: number;
  reloadSpeedMultiplier: number;
}

export type ShopItemId =
  | 'ammo_refill'
  | 'medkit_patch'
  | 'armor_plate'
  | 'weapon_damage'
  | 'reload_speed';

export interface ShopItemSpec {
  id: ShopItemId;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
}

export interface EnemyPolygonAllocation {
  headAndHelmet: number;
  torso: number;
  pelvis: number;
  arms: number;
  legs: number;
  armor: number;
  weaponEquipment: number;
  additionalDetails: number;
}

export interface EnemyPolygonValidationEntry {
  archetype: EnemyArchetype;
  tier: EnemyTier;
  name: string;
  role: string;
  polygons: number;
  triangles: number;
  vertexCount: number;
  maxPolygons: number;
  boneCount: number;
  materialCount: number;
  rendererCount: number;
  allocation: EnemyPolygonAllocation;
  withinBudget: boolean;
}

export type MapId =
  | 'OUTPOST_01'
  | 'FACILITY_02'
  | 'CITY_03'
  | 'POWER_04'
  | 'ARCTIC_05';

export type EnemyNavCategory =
  | 'A_Standard'
  | 'B_Fast'
  | 'C_Heavy'
  | 'D_Ranged'
  | 'E_Special'
  | 'F_MiniBoss'
  | 'G_Boss';

export type EnvironmentCollisionLayer =
  | 'TYPE_A_SOLID_STRUCTURE'
  | 'TYPE_B_IMPORTANT_COVER'
  | 'TYPE_C_DECORATIVE_OBJECT'
  | 'TYPE_D_INTERACTIVE_OBJECT'
  | 'TYPE_E_NAVIGATION_GEOMETRY';

export interface EnemyNavigationProfile {
  archetype: EnemyArchetype;
  name: string;
  navCategory: EnemyNavCategory;
  modelWidth: number;
  modelDepth: number;
  modelHeight: number;
  collisionRadius: number;
  collisionHeight: number;
  movementSpeed: number;
  movementType: 'ground_standard' | 'ground_fast' | 'ground_heavy' | 'ranged_tactical' | 'leaper_agile' | 'miniboss_heavy' | 'boss_colossal';
  turnSpeed: number;
  attackDistance: number;
  preferredCombatDistance: number;
  minClearance: number;
  canClimbStairs: boolean;
  canNavigateRamps: boolean;
  requiresLargeDoorway: boolean;
  canNavigateNarrowCorridors: boolean;
  canReachElevatedPositions: boolean;
  hasSpecialMovement: boolean;
}

export interface MapSpawnZone {
  id: string;
  entranceName: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  dirX: number;
  dirZ: number;
  validCategories: EnemyNavCategory[];
  minClearance: number;
  maxCapacity: number;
  minPlayerDistance: number;
  cooldown: number;
}

export interface MapValidationSummary {
  mapId: MapId;
  mapName: string;
  footprintMeters: string;
  totalTriangles: number;
  solidColliderCount: number;
  rampCount: number;
  spawnZoneCount: number;
  compatibleEnemyCount: number;
  bossArenaValidated: boolean;
  miniBossRoutesValidated: boolean;
  zeroSpawnCollisions: boolean;
  allTestsPassed: boolean;
}

export interface NavigationManagerMetrics {
  closeBandCount: number;
  mediumBandCount: number;
  distantBandCount: number;
  pathsUpdatedLastStep: number;
  stuckRecoveriesTriggered: number;
  batchCursor: number;
}

export type SpawnDebugCategoryTier = 'standard' | 'heavy' | 'boss';

export interface SpawnDebugNodeInfo {
  id: string;
  mapId: MapId;
  entranceName: string;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  minClearance: number;
  validCategories: EnemyNavCategory[];
  supportsStandard: boolean;
  supportsHeavy: boolean;
  supportsBoss: boolean;
  primaryTier: SpawnDebugCategoryTier;
  colorHex: number;
  colorCss: string;
}

export interface PlayerLegsPolygonBreakdown {
  leftUpperLeg: number;
  leftLowerLeg: number;
  leftBoot: number;
  rightUpperLeg: number;
  rightLowerLeg: number;
  rightBoot: number;
  kneeAndArmorDetails: number;
  pelvisAndAttachments: number;
  totalPolygons: number;
  totalTriangles: number;
  maxPolygons: number;
  withinBudget: boolean;
  boneCount: number;
  textureSize: number;
}

export interface EnemyBenchmarkScenarioResult {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  label: string;
  standardCount: number;
  miniBossCount: number;
  mainBossCount: number;
  totalEnemies: number;
  totalPolygons: number;
  totalTriangles: number;
  totalBones: number;
  avgCpuFrameMs: number;
  aiUpdateHzNearby: number;
  aiUpdateHzDistant: number;
  pooledInstancesReused: number;
  withinBudget60Fps: boolean;
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

export interface ShotgunTriangleBreakdown {
  receiver: number;
  barrel: number;
  foreEnd: number;
  stock: number;
  grip: number;
  lowerTube: number;
  frontSight: number;
  rearSight: number;
  remaining: number;
  total: number;
}

export type MapVariantId = 'VARIANT_A' | 'VARIANT_B' | 'VARIANT_C';

export interface MapVariantSpec {
  id: MapVariantId;
  label: string;
  skyColorHex: number;
  fogDensity: number;
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
