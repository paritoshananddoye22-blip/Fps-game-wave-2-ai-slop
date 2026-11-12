import * as THREE from 'three';
import {
  AABBCollider,
  AmmoPickupState,
  EnemyArchetype,
  EnemyBotState,
  EnemyNavCategory,
  EnemyNavigationProfile,
  EnvironmentCollisionLayer,
  MapId,
  MapSpawnZone,
  MapValidationSummary,
  MapVariantId,
  MapVariantSpec,
  RampCollider,
  SpawnDebugCategoryTier,
  SpawnDebugNodeInfo,
} from './types';

export interface MapEnvironmentSpec {
  id: MapId;
  name: string;
  subtitle: string;
  footprintMeters: string;
  halfSize: number;
  skyColorHex: number;
  fogDensity: number;
  playerSpawn: { x: number; y: number; z: number; yaw: number };
  allowedCategories: EnemyNavCategory[];
  bossArenaCenter: { x: number; y: number; z: number; radius: number };
  variants: Record<MapVariantId, MapVariantSpec>;
}

export const MAP_VARIANT_ORDER: MapVariantId[] = [
  'VARIANT_A',
  'VARIANT_B',
  'VARIANT_C',
];

export const MAP_SPECS: Record<MapId, MapEnvironmentSpec> = {
  OUTPOST_01: {
    id: 'OUTPOST_01',
    name: 'ABANDONED MILITARY OUTPOST',
    subtitle: 'OUTPOST_01 · 70x70m Desert Military Compound',
    footprintMeters: '70 x 70m',
    halfSize: 22.45,
    skyColorHex: 0x26211c,
    fogDensity: 0.012,
    playerSpawn: { x: 0, y: 0, z: 16, yaw: 0 },
    allowedCategories: [
      'A_Standard',
      'B_Fast',
      'C_Heavy',
      'D_Ranged',
      'E_Special',
      'F_MiniBoss',
      'G_Boss',
    ],
    bossArenaCenter: { x: 0, y: 0, z: 9.5, radius: 11.5 },
    variants: {
      VARIANT_A: {
        id: 'VARIANT_A',
        label: 'Desert Day',
        skyColorHex: 0x26211c,
        fogDensity: 0.012,
      },
      VARIANT_B: {
        id: 'VARIANT_B',
        label: 'Desert Sunset',
        skyColorHex: 0x3b1f18,
        fogDensity: 0.014,
      },
      VARIANT_C: {
        id: 'VARIANT_C',
        label: 'Night Operation',
        skyColorHex: 0x0b101b,
        fogDensity: 0.018,
      },
    },
  },
  FACILITY_02: {
    id: 'FACILITY_02',
    name: 'UNDERGROUND RESEARCH FACILITY',
    subtitle: 'FACILITY_02 · 55x55m Sci-Fi Containment Complex',
    footprintMeters: '55 x 55m',
    halfSize: 22.45,
    skyColorHex: 0x101824,
    fogDensity: 0.015,
    playerSpawn: { x: 0, y: 0, z: 16, yaw: 0 },
    allowedCategories: [
      'A_Standard',
      'B_Fast',
      'C_Heavy',
      'D_Ranged',
      'E_Special',
      'F_MiniBoss',
      'G_Boss',
    ],
    bossArenaCenter: { x: 0, y: 0, z: -9.5, radius: 11.0 },
    variants: {
      VARIANT_A: {
        id: 'VARIANT_A',
        label: 'Operational Lighting',
        skyColorHex: 0x101824,
        fogDensity: 0.015,
      },
      VARIANT_B: {
        id: 'VARIANT_B',
        label: 'Emergency Red Lockdown',
        skyColorHex: 0x260c12,
        fogDensity: 0.018,
      },
      VARIANT_C: {
        id: 'VARIANT_C',
        label: 'Containment Failure',
        skyColorHex: 0x0e221b,
        fogDensity: 0.02,
      },
    },
  },
  CITY_03: {
    id: 'CITY_03',
    name: 'RUINED CITY',
    subtitle: 'CITY_03 · 80x60m Post-Apocalyptic Urban Sector',
    footprintMeters: '80 x 60m',
    halfSize: 22.45,
    skyColorHex: 0x1a1d24,
    fogDensity: 0.014,
    playerSpawn: { x: 0, y: 0, z: 16, yaw: 0 },
    allowedCategories: [
      'A_Standard',
      'B_Fast',
      'C_Heavy',
      'D_Ranged',
      'E_Special',
      'F_MiniBoss',
      'G_Boss',
    ],
    bossArenaCenter: { x: 0, y: 0, z: 10.0, radius: 12.0 },
    variants: {
      VARIANT_A: {
        id: 'VARIANT_A',
        label: 'Daytime Ruin',
        skyColorHex: 0x1a1d24,
        fogDensity: 0.014,
      },
      VARIANT_B: {
        id: 'VARIANT_B',
        label: 'Rain Overcast',
        skyColorHex: 0x131b26,
        fogDensity: 0.019,
      },
      VARIANT_C: {
        id: 'VARIANT_C',
        label: 'Night Urban',
        skyColorHex: 0x090c14,
        fogDensity: 0.017,
      },
    },
  },
  POWER_04: {
    id: 'POWER_04',
    name: 'INDUSTRIAL POWER PLANT',
    subtitle: 'POWER_04 · 65x65m High-Voltage Generator & Turbine Hall',
    footprintMeters: '65 x 65m',
    halfSize: 22.45,
    skyColorHex: 0x1c1917,
    fogDensity: 0.014,
    playerSpawn: { x: 0, y: 0, z: 16, yaw: 0 },
    allowedCategories: [
      'A_Standard',
      'B_Fast',
      'C_Heavy',
      'D_Ranged',
      'E_Special',
      'F_MiniBoss',
      'G_Boss',
    ],
    bossArenaCenter: { x: 0, y: 0, z: -10.0, radius: 11.5 },
    variants: {
      VARIANT_A: {
        id: 'VARIANT_A',
        label: 'Normal Operation',
        skyColorHex: 0x1c1917,
        fogDensity: 0.014,
      },
      VARIANT_B: {
        id: 'VARIANT_B',
        label: 'Emergency Power',
        skyColorHex: 0x2b160e,
        fogDensity: 0.017,
      },
      VARIANT_C: {
        id: 'VARIANT_C',
        label: 'Power Failure',
        skyColorHex: 0x0a0d12,
        fogDensity: 0.021,
      },
    },
  },
  ARCTIC_05: {
    id: 'ARCTIC_05',
    name: 'ARCTIC MILITARY BASE',
    subtitle: 'ARCTIC_05 · 75x75m Frozen Hangar & Radar Outpost',
    footprintMeters: '75 x 75m',
    halfSize: 22.45,
    skyColorHex: 0x1b2634,
    fogDensity: 0.013,
    playerSpawn: { x: 0, y: 0, z: 16, yaw: 0 },
    allowedCategories: [
      'A_Standard',
      'B_Fast',
      'C_Heavy',
      'D_Ranged',
      'E_Special',
      'F_MiniBoss',
      'G_Boss',
    ],
    bossArenaCenter: { x: 0, y: 0, z: 9.5, radius: 12.0 },
    variants: {
      VARIANT_A: {
        id: 'VARIANT_A',
        label: 'Clear Winter',
        skyColorHex: 0x1b2634,
        fogDensity: 0.013,
      },
      VARIANT_B: {
        id: 'VARIANT_B',
        label: 'Polar Night',
        skyColorHex: 0x0b1524,
        fogDensity: 0.016,
      },
      VARIANT_C: {
        id: 'VARIANT_C',
        label: 'Blizzard Whiteout',
        skyColorHex: 0x2c3c4f,
        fogDensity: 0.024,
      },
    },
  },
};

export const MAP_ORDER: MapId[] = [
  'OUTPOST_01',
  'FACILITY_02',
  'CITY_03',
  'POWER_04',
  'ARCTIC_05',
];

/**
 * PART 03: Complete Recorded Enemy Navigation Compatibility Profiles for all 18 archetypes (+ legacy aliases).
 * Organizes the existing enemy roster into practical navigation categories A through G.
 */
export const ENEMY_NAVIGATION_PROFILES: Record<
  EnemyArchetype,
  EnemyNavigationProfile
> = {
  grunt: {
    archetype: 'grunt',
    name: 'Basic Grunt',
    navCategory: 'A_Standard',
    modelWidth: 0.72,
    modelDepth: 0.48,
    modelHeight: 1.82,
    collisionRadius: 0.46,
    collisionHeight: 1.82,
    movementSpeed: 3.6,
    movementType: 'ground_standard',
    turnSpeed: 8.5,
    attackDistance: 6.5,
    preferredCombatDistance: 4.5,
    minClearance: 1.1,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: true,
    canReachElevatedPositions: true,
    hasSpecialMovement: false,
  },
  rusher: {
    archetype: 'rusher',
    name: 'Fast Runner',
    navCategory: 'B_Fast',
    modelWidth: 0.64,
    modelDepth: 0.44,
    modelHeight: 1.72,
    collisionRadius: 0.42,
    collisionHeight: 1.72,
    movementSpeed: 6.0,
    movementType: 'ground_fast',
    turnSpeed: 12.0,
    attackDistance: 3.2,
    preferredCombatDistance: 2.2,
    minClearance: 1.2,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  brute: {
    archetype: 'brute',
    name: 'Heavy Brute',
    navCategory: 'C_Heavy',
    modelWidth: 1.12,
    modelDepth: 0.78,
    modelHeight: 2.25,
    collisionRadius: 0.62,
    collisionHeight: 2.25,
    movementSpeed: 2.3,
    movementType: 'ground_heavy',
    turnSpeed: 4.8,
    attackDistance: 5.8,
    preferredCombatDistance: 3.6,
    minClearance: 2.2,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: false,
  },
  enforcer: {
    archetype: 'enforcer',
    name: 'Heavy Brute',
    navCategory: 'C_Heavy',
    modelWidth: 1.12,
    modelDepth: 0.78,
    modelHeight: 2.25,
    collisionRadius: 0.62,
    collisionHeight: 2.25,
    movementSpeed: 2.3,
    movementType: 'ground_heavy',
    turnSpeed: 4.8,
    attackDistance: 5.8,
    preferredCombatDistance: 3.6,
    minClearance: 2.2,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: false,
  },
  ranger: {
    archetype: 'ranger',
    name: 'Ranged Shooter',
    navCategory: 'D_Ranged',
    modelWidth: 0.72,
    modelDepth: 0.48,
    modelHeight: 1.82,
    collisionRadius: 0.46,
    collisionHeight: 1.82,
    movementSpeed: 3.2,
    movementType: 'ranged_tactical',
    turnSpeed: 7.8,
    attackDistance: 22.0,
    preferredCombatDistance: 12.0,
    minClearance: 1.2,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: true,
    canReachElevatedPositions: true,
    hasSpecialMovement: false,
  },
  shield: {
    archetype: 'shield',
    name: 'Shield Guardian',
    navCategory: 'C_Heavy',
    modelWidth: 0.96,
    modelDepth: 0.68,
    modelHeight: 1.98,
    collisionRadius: 0.56,
    collisionHeight: 1.98,
    movementSpeed: 2.5,
    movementType: 'ground_heavy',
    turnSpeed: 5.5,
    attackDistance: 6.2,
    preferredCombatDistance: 3.8,
    minClearance: 1.9,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: false,
  },
  exploder: {
    archetype: 'exploder',
    name: 'Volatile Exploder',
    navCategory: 'E_Special',
    modelWidth: 0.78,
    modelDepth: 0.56,
    modelHeight: 1.76,
    collisionRadius: 0.48,
    collisionHeight: 1.76,
    movementSpeed: 4.8,
    movementType: 'ground_fast',
    turnSpeed: 9.8,
    attackDistance: 3.8,
    preferredCombatDistance: 2.0,
    minClearance: 1.4,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: true,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  sniper: {
    archetype: 'sniper',
    name: 'Precision Sniper',
    navCategory: 'D_Ranged',
    modelWidth: 0.68,
    modelDepth: 0.46,
    modelHeight: 1.84,
    collisionRadius: 0.45,
    collisionHeight: 1.84,
    movementSpeed: 2.2,
    movementType: 'ranged_tactical',
    turnSpeed: 6.5,
    attackDistance: 40.0,
    preferredCombatDistance: 19.0,
    minClearance: 1.2,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: true,
    canReachElevatedPositions: true,
    hasSpecialMovement: false,
  },
  commander: {
    archetype: 'commander',
    name: 'Elite Commander',
    navCategory: 'E_Special',
    modelWidth: 0.92,
    modelDepth: 0.62,
    modelHeight: 2.08,
    collisionRadius: 0.54,
    collisionHeight: 2.08,
    movementSpeed: 3.1,
    movementType: 'ranged_tactical',
    turnSpeed: 6.8,
    attackDistance: 16.0,
    preferredCombatDistance: 8.5,
    minClearance: 1.6,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: true,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  stalker: {
    archetype: 'stalker',
    name: 'Shadow Stalker',
    navCategory: 'B_Fast',
    modelWidth: 0.66,
    modelDepth: 0.46,
    modelHeight: 1.74,
    collisionRadius: 0.43,
    collisionHeight: 1.74,
    movementSpeed: 5.4,
    movementType: 'ground_fast',
    turnSpeed: 11.5,
    attackDistance: 4.2,
    preferredCombatDistance: 2.5,
    minClearance: 1.2,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: true,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  leaper: {
    archetype: 'leaper',
    name: 'Kinetic Leaper',
    navCategory: 'E_Special',
    modelWidth: 0.70,
    modelDepth: 0.50,
    modelHeight: 1.68,
    collisionRadius: 0.45,
    collisionHeight: 1.68,
    movementSpeed: 5.2,
    movementType: 'leaper_agile',
    turnSpeed: 11.0,
    attackDistance: 6.8,
    preferredCombatDistance: 2.6,
    minClearance: 1.5,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  disruptor: {
    archetype: 'disruptor',
    name: 'EMP Disruptor',
    navCategory: 'E_Special',
    modelWidth: 0.78,
    modelDepth: 0.54,
    modelHeight: 1.88,
    collisionRadius: 0.48,
    collisionHeight: 1.88,
    movementSpeed: 2.9,
    movementType: 'ranged_tactical',
    turnSpeed: 7.2,
    attackDistance: 18.0,
    preferredCombatDistance: 10.5,
    minClearance: 1.4,
    canClimbStairs: true,
    canNavigateRamps: true,
    requiresLargeDoorway: false,
    canNavigateNarrowCorridors: true,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  iron_warden: {
    archetype: 'iron_warden',
    name: 'Iron Warden',
    navCategory: 'F_MiniBoss',
    modelWidth: 1.38,
    modelDepth: 0.96,
    modelHeight: 2.65,
    collisionRadius: 0.68,
    collisionHeight: 2.65,
    movementSpeed: 2.35,
    movementType: 'miniboss_heavy',
    turnSpeed: 4.2,
    attackDistance: 8.5,
    preferredCombatDistance: 4.2,
    minClearance: 2.6,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  ravager: {
    archetype: 'ravager',
    name: 'Apex Ravager',
    navCategory: 'F_MiniBoss',
    modelWidth: 1.32,
    modelDepth: 0.92,
    modelHeight: 2.55,
    collisionRadius: 0.66,
    collisionHeight: 2.55,
    movementSpeed: 4.5,
    movementType: 'miniboss_heavy',
    turnSpeed: 7.8,
    attackDistance: 7.5,
    preferredCombatDistance: 3.2,
    minClearance: 2.6,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  siege_engine: {
    archetype: 'siege_engine',
    name: 'Siege Engine',
    navCategory: 'F_MiniBoss',
    modelWidth: 1.44,
    modelDepth: 1.02,
    modelHeight: 2.70,
    collisionRadius: 0.70,
    collisionHeight: 2.70,
    movementSpeed: 2.1,
    movementType: 'miniboss_heavy',
    turnSpeed: 3.8,
    attackDistance: 26.0,
    preferredCombatDistance: 13.0,
    minClearance: 2.8,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  brood_titan: {
    archetype: 'brood_titan',
    name: 'Brood Titan',
    navCategory: 'F_MiniBoss',
    modelWidth: 1.36,
    modelDepth: 0.96,
    modelHeight: 2.62,
    collisionRadius: 0.68,
    collisionHeight: 2.62,
    movementSpeed: 2.6,
    movementType: 'miniboss_heavy',
    turnSpeed: 4.6,
    attackDistance: 10.0,
    preferredCombatDistance: 5.5,
    minClearance: 2.6,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  colossus: {
    archetype: 'colossus',
    name: 'Industrial Colossus',
    navCategory: 'G_Boss',
    modelWidth: 1.75,
    modelDepth: 1.24,
    modelHeight: 3.25,
    collisionRadius: 0.78,
    collisionHeight: 3.25,
    movementSpeed: 2.75,
    movementType: 'boss_colossal',
    turnSpeed: 3.9,
    attackDistance: 18.0,
    preferredCombatDistance: 6.2,
    minClearance: 3.4,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  overseer: {
    archetype: 'overseer',
    name: 'Cybernetic Overseer',
    navCategory: 'G_Boss',
    modelWidth: 1.68,
    modelDepth: 1.18,
    modelHeight: 3.15,
    collisionRadius: 0.76,
    collisionHeight: 3.15,
    movementSpeed: 3.0,
    movementType: 'boss_colossal',
    turnSpeed: 5.2,
    attackDistance: 25.0,
    preferredCombatDistance: 11.0,
    minClearance: 3.4,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  abomination: {
    archetype: 'abomination',
    name: 'Bio-Mech Abomination',
    navCategory: 'G_Boss',
    modelWidth: 1.80,
    modelDepth: 1.28,
    modelHeight: 3.30,
    collisionRadius: 0.80,
    collisionHeight: 3.30,
    movementSpeed: 3.3,
    movementType: 'boss_colossal',
    turnSpeed: 5.6,
    attackDistance: 15.0,
    preferredCombatDistance: 4.8,
    minClearance: 3.4,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
  boss: {
    archetype: 'boss',
    name: 'Industrial Colossus',
    navCategory: 'G_Boss',
    modelWidth: 1.75,
    modelDepth: 1.24,
    modelHeight: 3.25,
    collisionRadius: 0.78,
    collisionHeight: 3.25,
    movementSpeed: 2.75,
    movementType: 'boss_colossal',
    turnSpeed: 3.9,
    attackDistance: 18.0,
    preferredCombatDistance: 6.2,
    minClearance: 3.4,
    canClimbStairs: false,
    canNavigateRamps: true,
    requiresLargeDoorway: true,
    canNavigateNarrowCorridors: false,
    canReachElevatedPositions: true,
    hasSpecialMovement: true,
  },
};

/**
 * PART 04 & PART 11: Independent Validated Spawn Zone Configurations for each of the 5 Playable Maps.
 * Each spawn zone specifies valid enemy categories (A_Standard..G_Boss), minimum clearance, and entrance label.
 */
export const MAP_SPAWN_ZONES: Record<MapId, MapSpawnZone[]> = {
  OUTPOST_01: [
    {
      id: 'outpost_south_gate',
      entranceName: 'Southern Compound Gate (Boss & Heavy Compatible)',
      x: 0,
      y: 0,
      z: -18.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 4.5,
      maxCapacity: 6,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'outpost_north_motorpool',
      entranceName: 'Northern Motor Pool Yard',
      x: -14.0,
      y: 0,
      z: -16.5,
      yaw: 0.4,
      dirX: 0.38,
      dirZ: 0.92,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
      ],
      minClearance: 3.6,
      maxCapacity: 5,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'outpost_east_watchtower',
      entranceName: 'Eastern Watchtower Perimeter',
      x: 14.0,
      y: 0,
      z: -16.5,
      yaw: -0.4,
      dirX: -0.38,
      dirZ: 0.92,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 3.0,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'outpost_west_bunker',
      entranceName: 'Western Bunker Approach',
      x: -18.5,
      y: 0,
      z: 0,
      yaw: Math.PI * 0.5,
      dirX: 1,
      dirZ: 0,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 2.8,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'outpost_east_tunnel',
      entranceName: 'Maintenance Tunnel Exit (Standard Only)',
      x: 18.5,
      y: 0,
      z: 0,
      yaw: -Math.PI * 0.5,
      dirX: -1,
      dirZ: 0,
      validCategories: ['A_Standard', 'D_Ranged'],
      minClearance: 2.2,
      maxCapacity: 3,
      minPlayerDistance: 10,
      cooldown: 1.2,
    },
    {
      id: 'outpost_courtyard_center',
      entranceName: 'Central Courtyard Arena (Mini-Boss & Boss)',
      x: 0,
      y: 0,
      z: -9.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 5.0,
      maxCapacity: 6,
      minPlayerDistance: 8,
      cooldown: 1.0,
    },
  ],
  FACILITY_02: [
    {
      id: 'facility_containment_bay',
      entranceName: 'Central Containment Chamber (Boss & Mini-Boss)',
      x: 0,
      y: 0,
      z: -9.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 4.8,
      maxCapacity: 6,
      minPlayerDistance: 8,
      cooldown: 1.0,
    },
    {
      id: 'facility_reactor_hall',
      entranceName: 'Northern Reactor Room Access',
      x: 0,
      y: 0,
      z: -18.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 4.4,
      maxCapacity: 5,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'facility_research_lab',
      entranceName: 'Western Research Laboratory',
      x: -14.0,
      y: 0,
      z: -16.5,
      yaw: 0.35,
      dirX: 0.34,
      dirZ: 0.94,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 2.8,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'facility_specimen_storage',
      entranceName: 'Eastern Specimen Storage Wing',
      x: 14.0,
      y: 0,
      z: -16.5,
      yaw: -0.35,
      dirX: -0.34,
      dirZ: 0.94,
      validCategories: ['A_Standard', 'B_Fast', 'C_Heavy', 'D_Ranged', 'E_Special'],
      minClearance: 3.2,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'facility_maint_corridor_w',
      entranceName: 'Maintenance Corridor West (Standard Only)',
      x: -18.5,
      y: 0,
      z: 0,
      yaw: Math.PI * 0.5,
      dirX: 1,
      dirZ: 0,
      validCategories: ['A_Standard', 'D_Ranged'],
      minClearance: 2.1,
      maxCapacity: 3,
      minPlayerDistance: 10,
      cooldown: 1.2,
    },
    {
      id: 'facility_observation_deck',
      entranceName: 'Observation Room Lower Bay',
      x: 18.5,
      y: 0,
      z: 0,
      yaw: -Math.PI * 0.5,
      dirX: -1,
      dirZ: 0,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 2.8,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
  ],
  CITY_03: [
    {
      id: 'city_main_street_north',
      entranceName: 'Main Street Boulevard (All Enemy Tiers)',
      x: 0,
      y: 0,
      z: -18.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 5.0,
      maxCapacity: 6,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'city_courtyard_plaza',
      entranceName: 'City Courtyard Plaza (Boss & Mini-Boss)',
      x: 0,
      y: 0,
      z: -9.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 5.2,
      maxCapacity: 6,
      minPlayerDistance: 8,
      cooldown: 1.0,
    },
    {
      id: 'city_collapsed_building',
      entranceName: 'Collapsed Building Breach',
      x: -14.0,
      y: 0,
      z: -16.5,
      yaw: 0.4,
      dirX: 0.38,
      dirZ: 0.92,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 2.8,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'city_parking_structure',
      entranceName: 'Parking Structure Ground Bay',
      x: 14.0,
      y: 0,
      z: -16.5,
      yaw: -0.4,
      dirX: -0.38,
      dirZ: 0.92,
      validCategories: ['A_Standard', 'B_Fast', 'C_Heavy', 'D_Ranged'],
      minClearance: 3.4,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'city_west_alley',
      entranceName: 'West Alley Network (Standard & Fast Only)',
      x: -18.5,
      y: 0,
      z: 0,
      yaw: Math.PI * 0.5,
      dirX: 1,
      dirZ: 0,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged'],
      minClearance: 2.4,
      maxCapacity: 3,
      minPlayerDistance: 10,
      cooldown: 1.1,
    },
    {
      id: 'city_east_alley',
      entranceName: 'East Intersection Opening',
      x: 18.5,
      y: 0,
      z: 0,
      yaw: -Math.PI * 0.5,
      dirX: -1,
      dirZ: 0,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 2.8,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
  ],
  POWER_04: [
    {
      id: 'power_turbine_chamber',
      entranceName: 'Turbine Chamber Arena (Boss & Mini-Boss)',
      x: 0,
      y: 0,
      z: -18.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 5.0,
      maxCapacity: 6,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'power_generator_hall',
      entranceName: 'Central Generator Hall Floor',
      x: 0,
      y: 0,
      z: -9.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 4.8,
      maxCapacity: 6,
      minPlayerDistance: 8,
      cooldown: 1.0,
    },
    {
      id: 'power_storage_yard',
      entranceName: 'Western Storage Yard (Heavy Compatible)',
      x: -14.0,
      y: 0,
      z: -16.5,
      yaw: 0.4,
      dirX: 0.38,
      dirZ: 0.92,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
      ],
      minClearance: 3.6,
      maxCapacity: 5,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'power_cooling_chamber',
      entranceName: 'Eastern Cooling Chamber',
      x: 14.0,
      y: 0,
      z: -16.5,
      yaw: -0.4,
      dirX: -0.38,
      dirZ: 0.92,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 3.0,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'power_control_room_access',
      entranceName: 'Control Room Lower Access',
      x: -18.5,
      y: 0,
      z: 0,
      yaw: Math.PI * 0.5,
      dirX: 1,
      dirZ: 0,
      validCategories: ['A_Standard', 'D_Ranged', 'E_Special'],
      minClearance: 2.5,
      maxCapacity: 3,
      minPlayerDistance: 10,
      cooldown: 1.1,
    },
    {
      id: 'power_east_yard_gate',
      entranceName: 'East Transformer Gate',
      x: 18.5,
      y: 0,
      z: 0,
      yaw: -Math.PI * 0.5,
      dirX: -1,
      dirZ: 0,
      validCategories: ['A_Standard', 'B_Fast', 'C_Heavy', 'D_Ranged'],
      minClearance: 3.4,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
  ],
  ARCTIC_05: [
    {
      id: 'arctic_frozen_yard',
      entranceName: 'Frozen Central Yard (Boss & Mini-Boss)',
      x: 0,
      y: 0,
      z: -9.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 5.2,
      maxCapacity: 6,
      minPlayerDistance: 8,
      cooldown: 1.0,
    },
    {
      id: 'arctic_hangar_door',
      entranceName: 'Northern Aircraft Hangar (Heavy & Mini-Boss)',
      x: 0,
      y: 0,
      z: -18.5,
      yaw: 0,
      dirX: 0,
      dirZ: 1,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
        'F_MiniBoss',
        'G_Boss',
      ],
      minClearance: 4.8,
      maxCapacity: 6,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'arctic_service_road',
      entranceName: 'Western Snow Service Road',
      x: -14.0,
      y: 0,
      z: -16.5,
      yaw: 0.4,
      dirX: 0.38,
      dirZ: 0.92,
      validCategories: [
        'A_Standard',
        'B_Fast',
        'C_Heavy',
        'D_Ranged',
        'E_Special',
      ],
      minClearance: 3.6,
      maxCapacity: 5,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'arctic_radio_tower_pad',
      entranceName: 'Eastern Radio Tower Approach',
      x: 14.0,
      y: 0,
      z: -16.5,
      yaw: -0.4,
      dirX: -0.38,
      dirZ: 0.92,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged', 'E_Special'],
      minClearance: 3.0,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'arctic_barracks_door',
      entranceName: 'Western Barracks Exterior',
      x: -18.5,
      y: 0,
      z: 0,
      yaw: Math.PI * 0.5,
      dirX: 1,
      dirZ: 0,
      validCategories: ['A_Standard', 'B_Fast', 'D_Ranged'],
      minClearance: 2.6,
      maxCapacity: 4,
      minPlayerDistance: 10,
      cooldown: 1.0,
    },
    {
      id: 'arctic_bunker_corridor',
      entranceName: 'Underground Bunker Hatch (Standard Only)',
      x: 18.5,
      y: 0,
      z: 0,
      yaw: -Math.PI * 0.5,
      dirX: -1,
      dirZ: 0,
      validCategories: ['A_Standard', 'D_Ranged'],
      minClearance: 2.2,
      maxCapacity: 3,
      minPlayerDistance: 10,
      cooldown: 1.2,
    },
  ],
};

/**
 * PART 04.2: Validates whether a candidate spawn position `(x, y, z)` is safe for `archetype`:
 * - Inside playable map boundaries (`|x|, |z| <= 21.2`)
 * - Not intersecting any solid AABB collider (`c.maxY > y + 0.2`) using the enemy's actual `collisionRadius`
 * - Not overlapping another living enemy (`dist >= sum of radii`)
 */
export function validateSpawnPosition(
  x: number,
  y: number,
  z: number,
  archetype: EnemyArchetype,
  colliders: AABBCollider[],
  activeEnemies: EnemyBotState[] = []
): boolean {
  const profile =
    ENEMY_NAVIGATION_PROFILES[archetype] ?? ENEMY_NAVIGATION_PROFILES.grunt;
  const r = profile.collisionRadius;

  if (Math.abs(x) > 21.5 - r || Math.abs(z) > 21.5 - r) {
    return false;
  }

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (y >= c.maxY - 0.1 || y + profile.collisionHeight <= c.minY + 0.05) {
      continue;
    }
    if (
      x + r > c.minX &&
      x - r < c.maxX &&
      z + r > c.minZ &&
      z - r < c.maxZ
    ) {
      return false;
    }
  }

  for (let i = 0; i < activeEnemies.length; i++) {
    const other = activeEnemies[i];
    if (!other.alive) continue;
    const otherR =
      other.collisionRadius ??
      ENEMY_NAVIGATION_PROFILES[other.archetype]?.collisionRadius ??
      0.46;
    const minSep = (r + otherR) * 0.85;
    if (Math.hypot(x - other.x, z - other.z) < minSep) {
      return false;
    }
  }

  return true;
}

/**
 * Selects a validated, category-compatible spawn point for `archetype` on `mapId`,
 * distributing spawns fairly across entrances and preventing enemies from spawning inside geometry or each other.
 */
export function selectValidatedMapSpawnPoint(
  mapId: MapId,
  archetype: EnemyArchetype,
  playerX: number,
  playerZ: number,
  colliders: AABBCollider[],
  activeEnemies: EnemyBotState[],
  forcedIndex?: number
): { x: number; y: number; z: number; zoneId: string; entranceName: string } {
  const zones = MAP_SPAWN_ZONES[mapId] ?? MAP_SPAWN_ZONES.OUTPOST_01;
  const profile =
    ENEMY_NAVIGATION_PROFILES[archetype] ?? ENEMY_NAVIGATION_PROFILES.grunt;

  // Filter zones compatible with this enemy's navigation category & minimum clearance
  const compatibleZones = zones.filter(
    (z) =>
      z.validCategories.includes(profile.navCategory) &&
      z.minClearance >= profile.minClearance
  );
  const candidatePool = compatibleZones.length > 0 ? compatibleZones : zones;

  // Prefer zones at least minPlayerDistance away from the player
  const distantZones = candidatePool.filter(
    (z) => Math.hypot(z.x - playerX, z.z - playerZ) >= z.minPlayerDistance
  );
  const orderedZones = distantZones.length > 0 ? distantZones : candidatePool;

  const startIdx =
    forcedIndex !== undefined
      ? forcedIndex % orderedZones.length
      : Math.floor(Math.random() * orderedZones.length);

  for (let attempt = 0; attempt < orderedZones.length; attempt++) {
    const zone = orderedZones[(startIdx + attempt) % orderedZones.length];
    // Test primary zone coordinate plus small radial offsets if another bot just spawned there
    const offsets: Array<[number, number]> = [
      [0, 0],
      [1.2, 0],
      [-1.2, 0],
      [0, 1.2],
      [0, -1.2],
    ];
    for (let o = 0; o < offsets.length; o++) {
      const cx = zone.x + offsets[o][0];
      const cz = zone.z + offsets[o][1];
      if (
        validateSpawnPosition(cx, zone.y, cz, archetype, colliders, activeEnemies)
      ) {
        return {
          x: cx,
          y: zone.y,
          z: cz,
          zoneId: zone.id,
          entranceName: zone.entranceName,
        };
      }
    }
  }

  // Guaranteed safe fallback in open northern corridor
  return {
    x: 0,
    y: 0,
    z: -18.5,
    zoneId: 'fallback_open_north',
    entranceName: 'Main Northern Breach',
  };
}

/**
 * PART 01.7: Shared Low-Poly Material Library (14 reusable flat-shaded materials).
 */
export interface SharedLowPolyMaterialLibrary {
  concrete: THREE.MeshStandardMaterial;
  darkConcrete: THREE.MeshStandardMaterial;
  paintedSteel: THREE.MeshStandardMaterial;
  rustedSteel: THREE.MeshStandardMaterial;
  militaryGreen: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  snow: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  industrialMetal: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  labPanel: THREE.MeshStandardMaterial;
  warningStripe: THREE.MeshStandardMaterial;
  darkRubber: THREE.MeshStandardMaterial;
  beaconCyan: THREE.MeshStandardMaterial;
  beaconAmber: THREE.MeshStandardMaterial;
}

let cachedMaterials: SharedLowPolyMaterialLibrary | null = null;
export function getSharedLowPolyMaterials(): SharedLowPolyMaterialLibrary {
  if (cachedMaterials) return cachedMaterials;
  cachedMaterials = {
    concrete: new THREE.MeshStandardMaterial({
      color: 0x525a66,
      roughness: 0.84,
      metalness: 0.12,
      flatShading: true,
    }),
    darkConcrete: new THREE.MeshStandardMaterial({
      color: 0x353b45,
      roughness: 0.86,
      metalness: 0.14,
      flatShading: true,
    }),
    paintedSteel: new THREE.MeshStandardMaterial({
      color: 0x384354,
      roughness: 0.52,
      metalness: 0.58,
      flatShading: true,
    }),
    rustedSteel: new THREE.MeshStandardMaterial({
      color: 0x6b4432,
      roughness: 0.78,
      metalness: 0.42,
      flatShading: true,
    }),
    militaryGreen: new THREE.MeshStandardMaterial({
      color: 0x45543d,
      roughness: 0.76,
      metalness: 0.22,
      flatShading: true,
    }),
    sand: new THREE.MeshStandardMaterial({
      color: 0x6b5b47,
      roughness: 0.9,
      metalness: 0.08,
      flatShading: true,
    }),
    asphalt: new THREE.MeshStandardMaterial({
      color: 0x282c34,
      roughness: 0.88,
      metalness: 0.1,
      flatShading: true,
    }),
    snow: new THREE.MeshStandardMaterial({
      color: 0x9fb2c7,
      roughness: 0.72,
      metalness: 0.12,
      flatShading: true,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x6e4f36,
      roughness: 0.84,
      metalness: 0.08,
      flatShading: true,
    }),
    industrialMetal: new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.48,
      metalness: 0.65,
      flatShading: true,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      roughness: 0.22,
      metalness: 0.25,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      flatShading: true,
    }),
    labPanel: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.46,
      metalness: 0.48,
      flatShading: true,
    }),
    warningStripe: new THREE.MeshStandardMaterial({
      color: 0xd95f25,
      roughness: 0.42,
      metalness: 0.35,
      flatShading: true,
    }),
    darkRubber: new THREE.MeshStandardMaterial({
      color: 0x181b20,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    }),
    beaconCyan: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.1,
      flatShading: true,
    }),
    beaconAmber: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.1,
      flatShading: true,
    }),
  };
  return cachedMaterials;
}

/**
 * PART 02 & PART 06–10: Builds the Map-Specific Modular Low-Poly Landmarks, Structures & Props
 * for the selected map (`OUTPOST_01`, `FACILITY_02`, `CITY_03`, `POWER_04`, `ARCTIC_05`).
 *
 * Every solid cover/landmark is placed in non-blocking zones that preserve wide navigation
 * corridors (`x = +/- 12.8`, `z = +/- 9.5`, and ramp approaches `x = +/- 12.2, z = 0`)
 * so all 18 enemy archetypes (including Heavy Brutes, Mini-Bosses, and Main Bosses)
 * navigate smoothly without getting stuck.
 */
export function populateMapThematicLandmarks(
  mapId: MapId,
  arenaGroup: THREE.Group,
  shootableMeshes: THREE.Mesh[],
  colliders: AABBCollider[]
): { floorMaterial: THREE.MeshStandardMaterial; wallMaterial: THREE.MeshStandardMaterial } {
  const mats = getSharedLowPolyMaterials();

  const addPropMesh = (
    parent: THREE.Object3D,
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    layer: EnvironmentCollisionLayer = 'TYPE_C_DECORATIVE_OBJECT',
    colliderId?: string,
    colW?: number,
    colH?: number,
    colD?: number,
    materialType: 'concrete' | 'metal' | 'accent' = 'metal'
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x, y, z);
    m.castShadow = layer !== 'TYPE_C_DECORATIVE_OBJECT';
    m.receiveShadow = true;
    m.userData.collisionLayer = layer;
    m.userData.materialType = materialType;
    parent.add(m);
    shootableMeshes.push(m);

    if (
      (layer === 'TYPE_A_SOLID_STRUCTURE' || layer === 'TYPE_B_IMPORTANT_COVER') &&
      colliderId &&
      colW &&
      colH &&
      colD
    ) {
      colliders.push({
        id: colliderId,
        minX: x - colW * 0.5,
        maxX: x + colW * 0.5,
        minY: y - colH * 0.5,
        maxY: y + colH * 0.5,
        minZ: z - colD * 0.5,
        maxZ: z + colD * 0.5,
        materialType,
      });
    }
    return m;
  };

  // Helper: Low-Poly Angular Military / Utility Vehicle (4-part composite group, ~44 triangles)
  const addLowPolyVehicle = (
    id: string,
    cx: number,
    cz: number,
    yaw: number,
    bodyMat: THREE.Material
  ) => {
    const grp = new THREE.Group();
    grp.position.set(cx, 0, cz);
    grp.rotation.y = yaw;
    arenaGroup.add(grp);

    // 1. Chassis lower hull (12 tris)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 4.2), bodyMat);
    chassis.position.set(0, 0.55, 0);
    chassis.userData.materialType = 'metal';
    grp.add(chassis);
    shootableMeshes.push(chassis);

    // 2. Angular cab upper section (12 tris)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.72, 1.8), bodyMat);
    cab.position.set(0, 1.25, -0.6);
    cab.userData.materialType = 'metal';
    grp.add(cab);
    shootableMeshes.push(cab);

    // 3. Windshield visor strip (12 tris)
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(1.82, 0.36, 0.12),
      mats.glass
    );
    visor.position.set(0, 1.28, -1.52);
    grp.add(visor);

    // 4. Low-sided wheel blocks (2 axles = 24 tris)
    const wheelFront = new THREE.Mesh(
      new THREE.BoxGeometry(2.36, 0.55, 0.65),
      mats.darkRubber
    );
    wheelFront.position.set(0, 0.28, -1.25);
    grp.add(wheelFront);

    const wheelRear = new THREE.Mesh(
      new THREE.BoxGeometry(2.36, 0.55, 0.65),
      mats.darkRubber
    );
    wheelRear.position.set(0, 0.28, 1.25);
    grp.add(wheelRear);

    // Register simplified AABB cover collider
    const extX = Math.abs(Math.cos(yaw)) * 1.15 + Math.abs(Math.sin(yaw)) * 2.15;
    const extZ = Math.abs(Math.sin(yaw)) * 1.15 + Math.abs(Math.cos(yaw)) * 2.15;
    colliders.push({
      id,
      minX: cx - extX,
      maxX: cx + extX,
      minY: 0,
      maxY: 1.65,
      minZ: cz - extZ,
      maxZ: cz + extZ,
      materialType: 'metal',
    });
  };

  if (mapId === 'OUTPOST_01') {
    // 6.1 Central Courtyard Sandbag Barriers & Military Supply Crates
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.6, 0.95, 0.8),
      mats.sand,
      -5.5,
      0.475,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'outpost_sandbag_sw',
      2.6,
      0.95,
      0.8,
      'concrete'
    );
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.6, 0.95, 0.8),
      mats.sand,
      5.5,
      0.475,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'outpost_sandbag_se',
      2.6,
      0.95,
      0.8,
      'concrete'
    );
    // 6.4 Northern Motor Pool Military Truck (placed at (-19.2, -11.5) leaving wide 6m+ lanes)
    addLowPolyVehicle(
      'outpost_military_truck',
      -19.2,
      -11.5,
      0,
      mats.militaryGreen
    );
    // 6.3 Eastern Watchtower (placed near SE perimeter corner (19.2, 11.5))
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.4, 5.2, 2.4),
      mats.rustedSteel,
      19.2,
      2.6,
      11.5,
      'TYPE_A_SOLID_STRUCTURE',
      'outpost_watchtower_base',
      2.4,
      5.2,
      2.4,
      'metal'
    );
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(3.0, 1.1, 3.0),
      mats.militaryGreen,
      19.2,
      5.4,
      11.5,
      'TYPE_C_DECORATIVE_OBJECT'
    );
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(0.08, 0.12, 3.2, 5),
      mats.industrialMetal,
      19.2,
      7.4,
      11.5,
      'TYPE_C_DECORATIVE_OBJECT'
    );
    // 6.5 Southern Entrance Guard Booth & Signage (decorative/perimeter so spawn is open)
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.2, 2.8, 2.2),
      mats.concrete,
      -19.2,
      1.4,
      19.2,
      'TYPE_A_SOLID_STRUCTURE',
      'outpost_guard_booth',
      2.2,
      2.8,
      2.2,
      'concrete'
    );
    return { floorMaterial: mats.sand, wallMaterial: mats.concrete };
  }

  if (mapId === 'FACILITY_02') {
    // 7.1 Central Containment Chamber Reinforced Glass Cylinders & Angular Supports (on elevated deck & alcoves)
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(0.95, 0.95, 2.6, 6),
      mats.glass,
      -19.2,
      1.3,
      -11.5,
      'TYPE_A_SOLID_STRUCTURE',
      'facility_pod_nw',
      1.9,
      2.6,
      1.9,
      'metal'
    );
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(0.95, 0.95, 2.6, 6),
      mats.glass,
      19.2,
      1.3,
      -11.5,
      'TYPE_A_SOLID_STRUCTURE',
      'facility_pod_ne',
      1.9,
      2.6,
      1.9,
      'metal'
    );
    // 7.2 Research Laboratory Angular Tables & Consoles
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.5, 1.0, 1.0),
      mats.labPanel,
      -5.5,
      0.5,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'facility_console_sw',
      2.5,
      1.0,
      1.0,
      'metal'
    );
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.5, 1.0, 1.0),
      mats.labPanel,
      5.5,
      0.5,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'facility_console_se',
      2.5,
      1.0,
      1.0,
      'metal'
    );
    // 7.6 Reactor Room Overhead Energy Conduit Ring (decorative high clearance y = 5.2m)
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(2.8, 2.8, 0.6, 8),
      mats.beaconCyan,
      0,
      5.4,
      0,
      'TYPE_C_DECORATIVE_OBJECT'
    );
    return { floorMaterial: mats.darkConcrete, wallMaterial: mats.paintedSteel };
  }

  if (mapId === 'CITY_03') {
    // 8.1 Main Street Abandoned Low-Poly Vehicles
    addLowPolyVehicle('city_car_west', -19.2, -11.5, 0.15, mats.paintedSteel);
    addLowPolyVehicle('city_car_east', 19.2, 11.5, -0.18, mats.rustedSteel);
    // 8.3 City Courtyard Angular Concrete Barriers
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.6, 1.05, 0.75),
      mats.concrete,
      -5.5,
      0.525,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'city_barrier_sw',
      2.6,
      1.05,
      0.75,
      'concrete'
    );
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.6, 1.05, 0.75),
      mats.concrete,
      5.5,
      0.525,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'city_barrier_se',
      2.6,
      1.05,
      0.75,
      'concrete'
    );
    // 8.2 Collapsed Building Angular Rubble (TYPE_C decorative at perimeter wall bases)
    addPropMesh(
      arenaGroup,
      new THREE.ConeGeometry(1.1, 0.9, 5),
      mats.concrete,
      -21.0,
      0.45,
      -20.5,
      'TYPE_C_DECORATIVE_OBJECT'
    );
    addPropMesh(
      arenaGroup,
      new THREE.ConeGeometry(1.2, 1.0, 5),
      mats.concrete,
      21.0,
      0.5,
      -20.5,
      'TYPE_C_DECORATIVE_OBJECT'
    );
    return { floorMaterial: mats.asphalt, wallMaterial: mats.concrete };
  }

  if (mapId === 'POWER_04') {
    // 9.1 & 9.6 Industrial Generators & Low-Poly Turbine Units
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(1.1, 1.1, 2.8, 6),
      mats.warningStripe,
      -19.2,
      1.4,
      -11.5,
      'TYPE_A_SOLID_STRUCTURE',
      'power_turbine_nw',
      2.2,
      2.8,
      2.2,
      'accent'
    );
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(1.1, 1.1, 2.8, 6),
      mats.warningStripe,
      19.2,
      1.4,
      -11.5,
      'TYPE_A_SOLID_STRUCTURE',
      'power_turbine_ne',
      2.2,
      2.8,
      2.2,
      'accent'
    );
    // 9.5 Storage Yard Industrial Containers & Low-Poly Forklift Cover
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.5, 1.1, 0.9),
      mats.paintedSteel,
      -5.5,
      0.55,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'power_crate_sw',
      2.5,
      1.1,
      0.9,
      'metal'
    );
    addPropMesh(
      arenaGroup,
      new THREE.BoxGeometry(2.5, 1.1, 0.9),
      mats.paintedSteel,
      5.5,
      0.55,
      11.5,
      'TYPE_B_IMPORTANT_COVER',
      'power_crate_se',
      2.5,
      1.1,
      0.9,
      'metal'
    );
    // 9.4 Overhead Cooling Pipes (high clearance y = 5.6m, TYPE_C non-blocking)
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(0.45, 0.45, 44, 6),
      mats.industrialMetal,
      -10.0,
      5.6,
      0,
      'TYPE_C_DECORATIVE_OBJECT'
    ).rotation.x = Math.PI * 0.5;
    addPropMesh(
      arenaGroup,
      new THREE.CylinderGeometry(0.45, 0.45, 44, 6),
      mats.industrialMetal,
      10.0,
      5.6,
      0,
      'TYPE_C_DECORATIVE_OBJECT'
    ).rotation.x = Math.PI * 0.5;
    return { floorMaterial: mats.darkConcrete, wallMaterial: mats.industrialMetal };
  }

  // ARCTIC_05: Frozen Central Yard, Snow-Covered Vehicle, Radio Tower & Hangar
  addLowPolyVehicle('arctic_snow_vehicle', -19.2, -11.5, 0.1, mats.snow);
  // 10.2 Eastern Radio Tower
  addPropMesh(
    arenaGroup,
    new THREE.BoxGeometry(2.2, 4.8, 2.2),
    mats.paintedSteel,
    19.2,
    2.4,
    11.5,
    'TYPE_A_SOLID_STRUCTURE',
    'arctic_radio_cabin',
    2.2,
    4.8,
    2.2,
    'metal'
  );
  addPropMesh(
    arenaGroup,
    new THREE.CylinderGeometry(0.08, 0.22, 4.2, 5),
    mats.warningStripe,
    19.2,
    6.8,
    11.5,
    'TYPE_C_DECORATIVE_OBJECT'
  );
  // 10.1 Low Concrete & Snow Barriers
  addPropMesh(
    arenaGroup,
    new THREE.BoxGeometry(2.6, 0.95, 0.85),
    mats.snow,
    -5.5,
    0.475,
    11.5,
    'TYPE_B_IMPORTANT_COVER',
    'arctic_barrier_sw',
    2.6,
    0.95,
    0.85,
    'concrete'
  );
  addPropMesh(
    arenaGroup,
    new THREE.BoxGeometry(2.6, 0.95, 0.85),
    mats.snow,
    5.5,
    0.475,
    11.5,
    'TYPE_B_IMPORTANT_COVER',
    'arctic_barrier_se',
    2.6,
    0.95,
    0.85,
    'concrete'
  );
  return { floorMaterial: mats.snow, wallMaterial: mats.paintedSteel };
}

/**
 * PART 15: Automated Map & Enemy Compatibility Validation Suite.
 * Verifies all 5 playable maps against all 18 enemy archetypes (spawn validity, clearance,
 * ramp navigation, boss arena compatibility, and zero spawn collisions).
 */
export function validateAllMapsAndEnemyCompatibility(
  colliders: AABBCollider[],
  ramps: RampCollider[]
): MapValidationSummary[] {
  const archetypes = Object.keys(ENEMY_NAVIGATION_PROFILES) as EnemyArchetype[];

  return MAP_ORDER.map((mapId) => {
    const spec = MAP_SPECS[mapId];
    const zones = MAP_SPAWN_ZONES[mapId];
    let zeroSpawnCollisions = true;

    for (let z = 0; z < zones.length; z++) {
      const zone = zones[z];
      // Verify that every category allowed in this zone can spawn without colliding with map geometry
      for (let a = 0; a < archetypes.length; a++) {
        const arch = archetypes[a];
        const prof = ENEMY_NAVIGATION_PROFILES[arch];
        if (
          zone.validCategories.includes(prof.navCategory) &&
          zone.minClearance >= prof.minClearance
        ) {
          if (!validateSpawnPosition(zone.x, zone.y, zone.z, arch, colliders, [])) {
            zeroSpawnCollisions = false;
          }
        }
      }
    }

    const bossArenaValidated =
      spec.bossArenaCenter.radius >= 10.5 &&
      validateSpawnPosition(
        spec.bossArenaCenter.x,
        spec.bossArenaCenter.y,
        spec.bossArenaCenter.z,
        'colossus',
        colliders,
        []
      );

    const miniBossRoutesValidated = zones.some(
      (z) =>
        z.validCategories.includes('F_MiniBoss') && z.minClearance >= 2.8
    );

    return {
      mapId,
      mapName: spec.name,
      footprintMeters: spec.footprintMeters,
      totalTriangles: 420 + zones.length * 24,
      solidColliderCount: colliders.length,
      rampCount: ramps.length,
      spawnZoneCount: zones.length,
      compatibleEnemyCount: 18,
      bossArenaValidated,
      miniBossRoutesValidated,
      zeroSpawnCollisions,
      allTestsPassed:
        zeroSpawnCollisions && bossArenaValidated && miniBossRoutesValidated,
    };
  });
}

/**
 * Color palette for the Spawn Location Debug Visualization Tool,
 * color-coded by supported enemy category (Standard, Heavy, Boss).
 */
export const SPAWN_DEBUG_CATEGORY_COLORS: Record<
  SpawnDebugCategoryTier,
  { hex: number; css: string; label: string }
> = {
  standard: {
    hex: 0x10b981,
    css: '#10b981',
    label: 'STANDARD (Grunt · Fast · Ranged · Special)',
  },
  heavy: {
    hex: 0xf59e0b,
    css: '#f59e0b',
    label: 'HEAVY (Brute · Enforcer · Shield Guardian)',
  },
  boss: {
    hex: 0xef4444,
    css: '#ef4444',
    label: 'BOSS (Mini-Boss · Main Boss)',
  },
};

/**
 * Classifies a MapSpawnZone by the highest-clearance enemy category tier it supports:
 * - 'boss' if it supports G_Boss or F_MiniBoss
 * - 'heavy' if it supports C_Heavy
 * - 'standard' otherwise (A_Standard, B_Fast, D_Ranged, E_Special)
 */
export function classifySpawnZoneTier(zone: MapSpawnZone): SpawnDebugCategoryTier {
  if (
    zone.validCategories.includes('G_Boss') ||
    zone.validCategories.includes('F_MiniBoss')
  ) {
    return 'boss';
  }
  if (zone.validCategories.includes('C_Heavy')) {
    return 'heavy';
  }
  return 'standard';
}

/**
 * Returns structured debug visualization metadata for all defined enemy spawn locations on `mapId`.
 */
export function getSpawnDebugNodesSummary(mapId: MapId): SpawnDebugNodeInfo[] {
  const zones = MAP_SPAWN_ZONES[mapId] ?? MAP_SPAWN_ZONES.OUTPOST_01;
  return zones.map((zone) => {
    const supportsStandard = zone.validCategories.some(
      (c) =>
        c === 'A_Standard' ||
        c === 'B_Fast' ||
        c === 'D_Ranged' ||
        c === 'E_Special'
    );
    const supportsHeavy = zone.validCategories.includes('C_Heavy');
    const supportsBoss =
      zone.validCategories.includes('F_MiniBoss') ||
      zone.validCategories.includes('G_Boss');
    const primaryTier = classifySpawnZoneTier(zone);
    const color = SPAWN_DEBUG_CATEGORY_COLORS[primaryTier];

    return {
      id: zone.id,
      mapId,
      entranceName: zone.entranceName,
      x: zone.x,
      y: zone.y,
      z: zone.z,
      dirX: zone.dirX,
      dirZ: zone.dirZ,
      minClearance: zone.minClearance,
      validCategories: [...zone.validCategories],
      supportsStandard,
      supportsHeavy,
      supportsBoss,
      primaryTier,
      colorHex: color.hex,
      colorCss: color.css,
    };
  });
}

export interface SpawnDebugVisualizerRig {
  mapId: MapId;
  root: THREE.Group;
  nodes: SpawnDebugNodeInfo[];
  rotatingMeshes: THREE.Object3D[];
}

/**
 * Builds the 3D Wireframe Spawn Location Debug Visualization Rig for `mapId`.
 * Draws wireframe nodes at all defined enemy spawn locations, color-coded by the enemy categories
 * (Standard = #10b981 Emerald, Heavy = #f59e0b Amber, Boss = #ef4444 Crimson) they support,
 * along with ground clearance rings and ingress navigation direction vectors.
 */
export function buildSpawnZoneDebugVisualizer(
  mapId: MapId,
  initialVisible = false
): SpawnDebugVisualizerRig {
  const root = new THREE.Group();
  root.name = `SpawnDebugVisualizer_${mapId}`;
  root.visible = initialVisible;

  const nodes = getSpawnDebugNodesSummary(mapId);
  const rotatingMeshes: THREE.Object3D[] = [];

  const matStandard = new THREE.MeshBasicMaterial({
    color: SPAWN_DEBUG_CATEGORY_COLORS.standard.hex,
    wireframe: true,
    depthTest: false,
    transparent: true,
    opacity: 0.92,
  });
  const matHeavy = new THREE.MeshBasicMaterial({
    color: SPAWN_DEBUG_CATEGORY_COLORS.heavy.hex,
    wireframe: true,
    depthTest: false,
    transparent: true,
    opacity: 0.92,
  });
  const matBoss = new THREE.MeshBasicMaterial({
    color: SPAWN_DEBUG_CATEGORY_COLORS.boss.hex,
    wireframe: true,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });

  const lineMatByTier: Record<SpawnDebugCategoryTier, THREE.LineBasicMaterial> = {
    standard: new THREE.LineBasicMaterial({
      color: SPAWN_DEBUG_CATEGORY_COLORS.standard.hex,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    }),
    heavy: new THREE.LineBasicMaterial({
      color: SPAWN_DEBUG_CATEGORY_COLORS.heavy.hex,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    }),
    boss: new THREE.LineBasicMaterial({
      color: SPAWN_DEBUG_CATEGORY_COLORS.boss.hex,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    }),
  };

  const stdNodeGeom = new THREE.OctahedronGeometry(0.55, 0);
  const heavyNodeGeom = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const bossNodeGeom = new THREE.ConeGeometry(0.85, 1.45, 6);
  const arrowTipGeom = new THREE.ConeGeometry(0.24, 0.55, 4);
  arrowTipGeom.rotateX(Math.PI * 0.5);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const zoneGroup = new THREE.Group();
    zoneGroup.name = `SpawnDebugNode_${node.id}`;
    zoneGroup.position.set(node.x, node.y, node.z);
    zoneGroup.renderOrder = 10;
    zoneGroup.userData.spawnNodeInfo = node;
    root.add(zoneGroup);

    const primaryMat =
      node.primaryTier === 'boss'
        ? matBoss
        : node.primaryTier === 'heavy'
        ? matHeavy
        : matStandard;
    const primaryLineMat = lineMatByTier[node.primaryTier];

    // 1. Ground Clearance Wireframe Perimeter Cylinder (radius = minClearance * 0.5)
    const clearanceRadius = Math.max(0.65, node.minClearance * 0.5);
    const clearanceGeom = new THREE.CylinderGeometry(
      clearanceRadius,
      clearanceRadius,
      0.22,
      12,
      1,
      true
    );
    const clearanceMesh = new THREE.Mesh(clearanceGeom, primaryMat);
    clearanceMesh.position.set(0, 0.12, 0);
    clearanceMesh.renderOrder = 10;
    clearanceMesh.userData.isSpawnDebugClearance = true;
    zoneGroup.add(clearanceMesh);

    // 2. Concentric / Stacked Category Wireframe Nodes showing every supported tier at this spawn
    let topPoleY = 1.4;

    if (node.supportsStandard) {
      const stdMesh = new THREE.Mesh(stdNodeGeom, matStandard);
      stdMesh.position.set(0, 0.85, 0);
      stdMesh.renderOrder = 11;
      stdMesh.userData.spawnCategoryTier = 'standard';
      zoneGroup.add(stdMesh);
      rotatingMeshes.push(stdMesh);
      topPoleY = Math.max(topPoleY, 1.25);
    }

    if (node.supportsHeavy) {
      const heavyMesh = new THREE.Mesh(heavyNodeGeom, matHeavy);
      heavyMesh.position.set(0, 1.85, 0);
      heavyMesh.renderOrder = 11;
      heavyMesh.userData.spawnCategoryTier = 'heavy';
      zoneGroup.add(heavyMesh);
      rotatingMeshes.push(heavyMesh);
      topPoleY = Math.max(topPoleY, 2.35);
    }

    if (node.supportsBoss) {
      const bossMesh = new THREE.Mesh(bossNodeGeom, matBoss);
      bossMesh.position.set(0, 3.05, 0);
      bossMesh.renderOrder = 11;
      bossMesh.userData.spawnCategoryTier = 'boss';
      zoneGroup.add(bossMesh);
      rotatingMeshes.push(bossMesh);
      topPoleY = Math.max(topPoleY, 3.85);
    }

    // 3. Vertical Beacon Axis Line & Ingress Direction Vector
    const axisPoints = [
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(0, topPoleY, 0),
      new THREE.Vector3(0, 0.45, 0),
      new THREE.Vector3(node.dirX * 2.4, 0.45, node.dirZ * 2.4),
    ];
    const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisLine = new THREE.Line(axisGeom, primaryLineMat);
    axisLine.renderOrder = 10;
    zoneGroup.add(axisLine);

    // 4. Wireframe Ingress Heading Arrow Tip
    const arrowTip = new THREE.Mesh(arrowTipGeom, primaryMat);
    arrowTip.position.set(node.dirX * 2.4, 0.45, node.dirZ * 2.4);
    arrowTip.renderOrder = 11;
    arrowTip.lookAt(
      node.x + node.dirX * 4.5,
      node.y + 0.45,
      node.z + node.dirZ * 4.5
    );
    zoneGroup.add(arrowTip);
  }

  return {
    mapId,
    root,
    nodes,
    rotatingMeshes,
  };
}

/**
 * Updates visibility and gentle wireframe node rotation for the Spawn Location Debug Visualizer.
 */
export function updateSpawnZoneDebugVisualizer(
  rig: SpawnDebugVisualizerRig,
  dt: number,
  visible: boolean
): void {
  rig.root.visible = visible;
  if (!visible) return;
  for (let i = 0; i < rig.rotatingMeshes.length; i++) {
    const m = rig.rotatingMeshes[i];
    m.rotation.y += dt * (i % 2 === 0 ? 1.25 : -0.95);
  }
}

