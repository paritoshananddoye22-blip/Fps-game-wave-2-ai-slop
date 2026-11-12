import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AmmoPickupState,
  AssaultRifleTriangleBreakdown,
  EnemyArchetype,
  EnemyBotState,
  GameSettings,
  GameState,
  InspectionViewMode,
  RevolverTriangleBreakdown,
  RunSummary,
  WeaponId,
} from '../game/types';
import {
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
} from '../game/rules';
import {
  WeaponRig,
  applyWeaponRigTransform,
  createWeaponRig,
} from '../game/weapons';
import {
  EnemyMeshRig,
  buildArenaEnvironment,
  buildEnemyBotMesh,
  updateEnemyMeshRig,
} from '../game/arena';
import { audioEngine } from '../game/audio';

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  activeWeapon: WeaponId;
  ammoInMag: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  score: number;
  bestScore: number;
  wave: number;
  enemiesRemaining: number;
  arTriangles: number;
  revTriangles: number;
  arBreakdown: AssaultRifleTriangleBreakdown;
  revBreakdown: RevolverTriangleBreakdown;
  leftHandTriangles: number;
  rightHandTriangles: number;
  isAiming: boolean;
  hurtFlash: number;
}

export interface ScreenFloatingDamage {
  id: number;
  screenX: number;
  screenY: number;
  amount: number;
  critical: boolean;
  alpha: number;
}

interface GameCanvasProps {
  gameState: GameState;
  settings: GameSettings;
  inspectionView: InspectionViewMode;
  resetSignal: number;
  onHudUpdate: (hud: HudSnapshot) => void;
  onPauseRequest: () => void;
  onGameOver: (summary: RunSummary) => void;
  crosshairRef: React.RefObject<HTMLDivElement | null>;
  hitMarkerRef: React.RefObject<HTMLDivElement | null>;
  damageLayerRef: React.RefObject<HTMLDivElement | null>;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  colorHex: number;
}

const MAX_PARTICLES = 48;
const MAX_DECALS = 16;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  settings,
  inspectionView,
  resetSignal,
  onHudUpdate,
  onPauseRequest,
  onGameOver,
  crosshairRef,
  hitMarkerRef,
  damageLayerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest props in refs so the 60fps loop never tears down the WebGL context
  const gameStateRef = useRef<GameState>(gameState);
  const settingsRef = useRef<GameSettings>(settings);
  const inspectionViewRef = useRef<InspectionViewMode>(inspectionView);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onPauseRequestRef = useRef(onPauseRequest);
  const onGameOverRef = useRef(onGameOver);
  const resetRunFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState !== 'playing' && typeof document !== 'undefined') {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    }
  }, [gameState]);

  useEffect(() => {
    settingsRef.current = settings;
    audioEngine.setSettings(settings.volume, settings.muted);
  }, [settings]);

  useEffect(() => {
    inspectionViewRef.current = inspectionView;
  }, [inspectionView]);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
    onPauseRequestRef.current = onPauseRequest;
    onGameOverRef.current = onGameOver;
  }, [onHudUpdate, onPauseRequest, onGameOver]);

  useEffect(() => {
    if (resetSignal > 0 && resetRunFnRef.current) {
      resetRunFnRef.current();
    }
  }, [resetSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect Software WebGL from GPU renderer string
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.dataset.testid = 'arena-canvas';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x181e29);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x181e29, 0.015);

    // Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Section 21.1: Clean Camera Movement Hierarchy (Physics separated from visual head motion)
    // PLAYER ROOT -> Head Movement Root -> Base Camera Position -> Head Bob Transform ->
    // Head Sway Transform -> Breathing Transform -> Landing Impulse Transform ->
    // Camera Recoil Transform -> Final FPS Camera
    const playerRoot = new THREE.Group();
    playerRoot.name = 'PlayerRoot';
    scene.add(playerRoot);

    const headMovementRoot = new THREE.Group();
    headMovementRoot.name = 'HeadMovementRoot';
    playerRoot.add(headMovementRoot);

    const baseCameraPos = new THREE.Group();
    baseCameraPos.name = 'BaseCameraPosition';
    headMovementRoot.add(baseCameraPos);

    const headBobTransform = new THREE.Group();
    headBobTransform.name = 'HeadBobTransform';
    headBobTransform.rotation.order = 'YXZ';
    baseCameraPos.add(headBobTransform);

    const headSwayTransform = new THREE.Group();
    headSwayTransform.name = 'HeadSwayTransform';
    headSwayTransform.rotation.order = 'YXZ';
    headBobTransform.add(headSwayTransform);

    const breathingTransform = new THREE.Group();
    breathingTransform.name = 'BreathingTransform';
    breathingTransform.rotation.order = 'YXZ';
    headSwayTransform.add(breathingTransform);

    const landingImpulseTransform = new THREE.Group();
    landingImpulseTransform.name = 'LandingImpulseTransform';
    landingImpulseTransform.rotation.order = 'YXZ';
    breathingTransform.add(landingImpulseTransform);

    const cameraRecoilTransform = new THREE.Group();
    cameraRecoilTransform.name = 'CameraRecoilTransform';
    cameraRecoilTransform.rotation.order = 'YXZ';
    landingImpulseTransform.add(cameraRecoilTransform);

    // Final FPS Camera + Viewmodel Rig
    const camera = new THREE.PerspectiveCamera(
      75,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.08,
      160
    );
    camera.name = 'FinalFPSCamera';
    camera.rotation.order = 'YXZ';
    cameraRecoilTransform.add(camera);

    const weaponRig: WeaponRig = createWeaponRig();
    camera.add(weaponRig.root);

    // Warm Key Light + Cool Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x8bb8e8, 0x262c36, 0.85);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff0dd, 2.1);
    dirLight.position.set(18, 32, 16);
    dirLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      const d = 26;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.camera.near = 2;
      dirLight.shadow.camera.far = 75;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    scene.add(dirLight);

    // Subtle Rim Directional Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-20, 14, -18);
    scene.add(rimLight);

    // Build Low-Poly Arena Environment
    const arenaData = buildArenaEnvironment();
    scene.add(arenaData.arenaGroup);

    // Pooled InstancedMesh Particle Ring Buffer (Zero GC inside loop)
    const particleGeom = new THREE.OctahedronGeometry(0.065, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleInstanced = new THREE.InstancedMesh(
      particleGeom,
      particleMat,
      MAX_PARTICLES
    );
    particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleInstanced.frustumCulled = false;
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyScale = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyColor = new THREE.Color();

    const particles: PooledParticle[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.3,
        scale: 1,
        colorHex: 0xffaa00,
      });
      dummyMatrix.makeScale(0, 0, 0);
      particleInstanced.setMatrixAt(i, dummyMatrix);
      particleInstanced.setColorAt(i, dummyColor.setHex(0xffaa00));
    }
    particleInstanced.instanceMatrix.needsUpdate = true;
    if (particleInstanced.instanceColor) {
      particleInstanced.instanceColor.needsUpdate = true;
    }
    scene.add(particleInstanced);

    let particleHead = 0;
    const spawnParticleBurst = (
      x: number,
      y: number,
      z: number,
      nx: number,
      ny: number,
      nz: number,
      count: number,
      colorHex: number,
      speed: number,
      scale = 1
    ) => {
      for (let i = 0; i < count; i++) {
        const p = particles[particleHead];
        particleHead = (particleHead + 1) % MAX_PARTICLES;
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = (nx + (Math.random() - 0.5) * 1.4) * speed;
        p.vy = (ny + Math.random() * 0.9) * speed;
        p.vz = (nz + (Math.random() - 0.5) * 1.4) * speed;
        p.maxLife = 0.18 + Math.random() * 0.18;
        p.life = p.maxLife;
        p.scale = scale * (0.7 + Math.random() * 0.6);
        p.colorHex = colorHex;
      }
    };

    // Pooled Bullet Impact Decals on Arena Surfaces
    const decalMeshes: THREE.Mesh[] = [];
    const decalGeom = new THREE.CircleGeometry(0.065, 6);
    const decalMat = new THREE.MeshBasicMaterial({
      color: 0x111318,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    for (let i = 0; i < MAX_DECALS; i++) {
      const m = new THREE.Mesh(decalGeom, decalMat);
      m.visible = false;
      scene.add(m);
      decalMeshes.push(m);
    }
    let decalHead = 0;

    // Bullet Tracer Line (short-lived geometric ray visual)
    const tracerPoints = [new THREE.Vector3(), new THREE.Vector3()];
    const tracerGeom = new THREE.BufferGeometry().setFromPoints(tracerPoints);
    const tracerMat = new THREE.LineBasicMaterial({
      color: 0xffdd77,
      transparent: true,
      opacity: 0,
    });
    const tracerLine = new THREE.Line(tracerGeom, tracerMat);
    tracerLine.frustumCulled = false;
    scene.add(tracerLine);
    let tracerTimer = 0;

    // Mutable Runtime State
    let player = createInitialPlayerState();
    let weaponsRuntime = createInitialWeaponRuntime();
    let cameraAnim = createInitialCameraState();
    let weaponAnim = createInitialWeaponProceduralState();
    let pickups: AmmoPickupState[] = arenaData.initialPickups.map((p) => ({ ...p }));

    let score = 0;
    let bestScore = Number(localStorage.getItem('lowpoly_arena_best') || '0') || 0;
    let wave = 1;
    let kills = 0;
    let shotsFired = 0;
    let shotsHit = 0;
    let waveSpawnRemaining = 0;
    let spawnCooldown = 0;
    let nextBotId = 1;
    let hitstopTimer = 0;
    let muzzleFlashTimer = 0;
    let hitMarkerTimer = 0;
    let hitMarkerCritical = false;

    const enemies: EnemyBotState[] = [];
    const enemyRigs = new Map<number, EnemyMeshRig>();
    const enemyHitboxMeshes: THREE.Mesh[] = [];

    const floatingDamages: Array<{
      id: number;
      x: number;
      y: number;
      z: number;
      amount: number;
      critical: boolean;
      timer: number;
      maxTimer: number;
    }> = [];
    let nextDamageId = 1;

    const rebuildEnemyHitboxes = () => {
      enemyHitboxMeshes.length = 0;
      enemyRigs.forEach((rig, id) => {
        const bot = enemies.find((b) => b.id === id);
        if (bot && bot.alive) {
          rig.bodyPivot.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              enemyHitboxMeshes.push(obj as THREE.Mesh);
            }
          });
        }
      });
    };

    const spawnBotInArena = (forcedPointIdx?: number) => {
      const waveCfg = calculateWaveConfig(wave);
      const pts = arenaData.spawnPoints;
      // Pick a spawn point away from the player
      let chosen = pts[0];
      if (forcedPointIdx !== undefined) {
        chosen = pts[forcedPointIdx % pts.length];
      } else {
        const candidates = pts.filter(
          (p) => Math.hypot(p.x - player.x, p.z - player.z) > 12
        );
        const pool = candidates.length > 0 ? candidates : pts;
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }

      const roll = Math.random();
      let archetype: EnemyArchetype = 'rusher';
      if (roll > 0.78 && wave >= 2) archetype = 'enforcer';
      else if (roll > 0.45) archetype = 'ranger';

      const id = nextBotId++;
      const bot = createEnemyBot(id, archetype, chosen.x, chosen.y, chosen.z, waveCfg);
      enemies.push(bot);

      const rig = buildEnemyBotMesh(id, archetype);
      updateEnemyMeshRig(rig, bot);
      scene.add(rig.root);
      enemyRigs.set(id, rig);
      rebuildEnemyHitboxes();
    };

    let lastHudSyncTime = 0;
    const syncHud = (force = false) => {
      const now = performance.now();
      if (!force && now - lastHudSyncTime < 90) return;
      lastHudSyncTime = now;

      const activeId = weaponAnim.activeWeapon;
      const runtime = weaponsRuntime[activeId];
      const aliveCount =
        enemies.filter((b) => b.alive).length + waveSpawnRemaining;

      onHudUpdateRef.current({
        health: Math.round(player.health),
        maxHealth: player.maxHealth,
        activeWeapon: activeId,
        ammoInMag: runtime.ammoInMag,
        reserveAmmo: runtime.reserveAmmo,
        isReloading: weaponAnim.phase === 'reloading',
        reloadProgress: weaponAnim.reloadProgress,
        score,
        bestScore,
        wave,
        enemiesRemaining: aliveCount,
        arTriangles: weaponRig.arTriangleCount,
        revTriangles: weaponRig.revTriangleCount,
        arBreakdown: weaponRig.arBreakdown,
        revBreakdown: weaponRig.revBreakdown,
        leftHandTriangles: weaponRig.leftHandTriangleCount,
        rightHandTriangles: weaponRig.rightHandTriangleCount,
        isAiming: player.isAiming || weaponAnim.adsBlend > 0.5,
        hurtFlash: player.hurtFlashTimer,
      });
    };

    const startWave = (targetWave: number) => {
      wave = targetWave;
      const cfg = calculateWaveConfig(wave);
      waveSpawnRemaining = cfg.totalEnemies;
      spawnCooldown = 0.25;
      // Spawn 4 initial bots including one right in the central combat lane
      const initialCount = Math.min(4, waveSpawnRemaining);
      for (let i = 0; i < initialCount; i++) {
        spawnBotInArena(i);
        waveSpawnRemaining--;
      }
    };

    const resetRun = () => {
      // Remove existing enemy meshes
      enemyRigs.forEach((rig) => {
        scene.remove(rig.root);
      });
      enemyRigs.clear();
      enemies.length = 0;
      enemyHitboxMeshes.length = 0;
      floatingDamages.length = 0;

      player = createInitialPlayerState();
      weaponsRuntime = createInitialWeaponRuntime();
      cameraAnim = createInitialCameraState();
      weaponAnim = createInitialWeaponProceduralState();
      pickups = arenaData.initialPickups.map((p) => ({ ...p }));

      score = 0;
      kills = 0;
      shotsFired = 0;
      shotsHit = 0;
      hitstopTimer = 0;
      muzzleFlashTimer = 0;
      hitMarkerTimer = 0;

      startWave(1);
      syncHud(true);
    };

    resetRunFnRef.current = resetRun;

    // Initialize Wave 1 right away so Title Screen tour and ?autostart=1 have active bots
    resetRun();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Unified Input Hub (continuous held + edge-triggered justPressed)
    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();
    let mouseHeld = false;
    let mouseJustPressed = false;
    let rightMouseHeld = false;
    let lastClientX: number | null = null;
    let lastClientY: number | null = null;

    const clearInputs = () => {
      keysHeld.clear();
      keysJustPressed.clear();
      mouseHeld = false;
      mouseJustPressed = false;
      rightMouseHeld = false;
      lastClientX = null;
      lastClientY = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return;

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        clearInputs();
        onPauseRequestRef.current();
        return;
      }

      if (!keysHeld.has(e.code)) {
        keysJustPressed.add(e.code);
      }
      keysHeld.add(e.code);

      if (e.code === 'Digit1') {
        if (triggerWeaponSwitch(weaponAnim, 'assault_rifle')) {
          audioEngine.playWeaponSwitch();
          syncHud(true);
        }
      } else if (e.code === 'Digit2') {
        if (triggerWeaponSwitch(weaponAnim, 'revolver')) {
          audioEngine.playWeaponSwitch();
          syncHud(true);
        }
      } else if (e.code === 'KeyR') {
        const activeId = weaponAnim.activeWeapon;
        if (
          triggerWeaponReload(
            weaponAnim,
            weaponsRuntime[activeId],
            WEAPON_SPECS[activeId]
          )
        ) {
          audioEngine.playReload(activeId);
          syncHud(true);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;

      let dx = e.movementX || 0;
      let dy = e.movementY || 0;

      // Fallback when PointerLock is not active (e.g., headless browser verification)
      if (!document.pointerLockElement) {
        if (lastClientX === null || lastClientY === null) {
          lastClientX = e.clientX;
          lastClientY = e.clientY;
          return;
        }
        dx = e.clientX - lastClientX;
        dy = e.clientY - lastClientY;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
      }

      // Filter out synthetic single-frame cursor warps when pointer lock engages
      if (Math.hypot(dx, dy) > 100) {
        return;
      }

      if (dx !== 0 || dy !== 0) {
        applyMouseLook(
          player,
          weaponAnim,
          cameraAnim,
          dx,
          dy,
          settingsRef.current.sensitivity,
          settingsRef.current
        );
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      // Ignore clicks on HUD utility buttons
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, [data-hud-interactive="true"]')) {
        return;
      }

      if (e.button === 0) {
        mouseHeld = true;
        mouseJustPressed = true;
        // Request pointer lock on canvas click when supported
        if (
          !document.pointerLockElement &&
          renderer.domElement.requestPointerLock
        ) {
          try {
            const promise = renderer.domElement.requestPointerLock() as unknown as Promise<void>;
            if (promise && typeof promise.catch === 'function') {
              promise.catch(() => {});
            }
          } catch {
            // Ignore pointer lock rejection in sandboxed iframes
          }
        }
      } else if (e.button === 2) {
        rightMouseHeld = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseHeld = false;
      } else if (e.button === 2) {
        rightMouseHeld = false;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (gameStateRef.current === 'playing') {
        e.preventDefault();
      }
    };

    const onWindowBlur = () => {
      clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onWindowBlur);

    // Hitscan Raycaster (Pre-allocated outside loop)
    const raycaster = new THREE.Raycaster();
    const screenCenter = new THREE.Vector2(0, 0);
    const muzzleWorldPos = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();
    const hitNormal = new THREE.Vector3();
    const projVec = new THREE.Vector3();

    const executeWeaponFire = () => {
      const activeId = weaponAnim.activeWeapon;
      const spec = WEAPON_SPECS[activeId];
      const runtime = weaponsRuntime[activeId];

      applyWeaponShot(weaponAnim, cameraAnim, runtime, spec);
      shotsFired++;
      audioEngine.playShoot(activeId);

      // Muzzle flash scale & duration (Revolver larger and brighter than Assault Rifle)
      const anchor =
        activeId === 'assault_rifle'
          ? weaponRig.arMuzzlePoint
          : weaponRig.revMuzzlePoint;
      weaponRig.muzzleFlashMesh.position.copy(anchor.position);
      const flashScale = activeId === 'revolver' ? 1.55 : 0.95;
      weaponRig.muzzleFlashMesh.scale.set(
        flashScale,
        flashScale,
        flashScale * 1.4
      );
      weaponRig.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
      weaponRig.muzzleFlashMesh.visible = true;
      weaponRig.muzzleLight.position.copy(anchor.position);
      weaponRig.muzzleLight.intensity = activeId === 'revolver' ? 3.8 : 2.1;
      muzzleFlashTimer = activeId === 'revolver' ? 0.065 : 0.042;

      // Update world matrices before raycasting
      camera.updateMatrixWorld(true);
      anchor.getWorldPosition(muzzleWorldPos);

      // Section 20.5: Consistent Camera & Muzzle Alignment with Hip-Fire / ADS Spread
      const excessSpread = Math.max(0, weaponAnim.crosshairSpread - spec.spreadBase);
      const spreadNdc =
        excessSpread * 0.0012 * (1 - weaponAnim.adsBlend * 0.85);
      const aimX = (Math.random() - 0.5) * spreadNdc;
      const aimY = (Math.random() - 0.5) * spreadNdc;
      screenCenter.set(aimX, aimY);

      raycaster.setFromCamera(screenCenter, camera);
      const targets: THREE.Object3D[] = [
        ...enemyHitboxMeshes,
        ...arenaData.shootableMeshes,
      ];
      const intersects = raycaster.intersectObjects(targets, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        hitPoint.copy(hit.point);
        if (hit.face) {
          hitNormal
            .copy(hit.face.normal)
            .transformDirection(hit.object.matrixWorld)
            .normalize();
        } else {
          hitNormal.set(0, 1, 0);
        }

        // Set tracer line from muzzle to impact
        const posAttr = tracerGeom.attributes.position as THREE.BufferAttribute;
        posAttr.setXYZ(0, muzzleWorldPos.x, muzzleWorldPos.y - 0.02, muzzleWorldPos.z);
        posAttr.setXYZ(1, hitPoint.x, hitPoint.y, hitPoint.z);
        posAttr.needsUpdate = true;
        tracerMat.opacity = activeId === 'revolver' ? 0.85 : 0.55;
        tracerTimer = 0.045;

        const enemyId = hit.object.userData.enemyId as number | undefined;
        if (enemyId !== undefined) {
          const bot = enemies.find((b) => b.id === enemyId && b.alive);
          if (bot) {
            shotsHit++;
            const isCrit = Boolean(hit.object.userData.isHead);
            const rawDmg =
              spec.damage * (isCrit ? spec.headshotMultiplier : 1.0);
            const { killed, damageApplied } = damageEnemyBot(
              bot,
              rawDmg,
              player.x,
              player.z
            );

            // Trigger hit marker
            hitMarkerTimer = 0.16;
            hitMarkerCritical = isCrit;

            // Spawn hit sparks on enemy
            spawnParticleBurst(
              hitPoint.x,
              hitPoint.y,
              hitPoint.z,
              hitNormal.x,
              hitNormal.y,
              hitNormal.z,
              isCrit ? 12 : 7,
              isCrit ? 0xffd166 : 0xff5533,
              4.8,
              isCrit ? 1.25 : 0.95
            );

            // Floating damage number
            floatingDamages.push({
              id: nextDamageId++,
              x: hitPoint.x + (Math.random() - 0.5) * 0.25,
              y: hitPoint.y + 0.2,
              z: hitPoint.z,
              amount: damageApplied,
              critical: isCrit,
              timer: 0.65,
              maxTimer: 0.65,
            });

            if (killed) {
              kills++;
              const killPoints = (isCrit ? 150 : 100) * wave;
              score += killPoints;
              if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('lowpoly_arena_best', String(bestScore));
              }
              audioEngine.playEnemyDeath();
              rebuildEnemyHitboxes();
              // Brief 35ms hitstop on heavy/critical kills
              if (isCrit || activeId === 'revolver') {
                hitstopTimer = 0.038;
              }
              spawnParticleBurst(
                bot.x,
                bot.y + 1.1,
                bot.z,
                0,
                1,
                0,
                16,
                0xff6b35,
                5.6,
                1.35
              );
            } else {
              score += isCrit ? 25 : 15;
              audioEngine.playEnemyHit(isCrit);
            }
          }
        } else {
          // Hit arena surface (concrete or metal)
          const matType =
            (hit.object.userData.materialType as 'concrete' | 'metal' | 'accent') ||
            'concrete';
          audioEngine.playSurfaceImpact(matType);

          // Spawn surface particles (bright sparks on metal, dust on concrete)
          const sparkColor =
            matType === 'metal' || matType === 'accent' ? 0xffb703 : 0x94a3b8;
          spawnParticleBurst(
            hitPoint.x + hitNormal.x * 0.03,
            hitPoint.y + hitNormal.y * 0.03,
            hitPoint.z + hitNormal.z * 0.03,
            hitNormal.x,
            hitNormal.y,
            hitNormal.z,
            matType === 'metal' ? 8 : 5,
            sparkColor,
            matType === 'metal' ? 5.2 : 3.1,
            0.85
          );

          // Place impact decal
          const decal = decalMeshes[decalHead];
          decalHead = (decalHead + 1) % MAX_DECALS;
          decal.visible = true;
          decal.position.copy(hitPoint).addScaledVector(hitNormal, 0.015);
          decal.lookAt(hitPoint.clone().add(hitNormal));
        }
      }

      // Auto-reload if magazine reaches 0 and reserve ammo exists
      if (runtime.ammoInMag === 0 && runtime.reserveAmmo > 0) {
        if (triggerWeaponReload(weaponAnim, runtime, spec)) {
          audioEngine.playReload(activeId);
        }
      }

      syncHud(true);
    };

    // ResizeObserver for crisp viewport sizing
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Software WebGL Pacing Helper (afterDraw)
    let frameId = 0;
    let unmounted = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (unmounted) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    let lastFrameTime = performance.now();
    let titleOrbitAngle = 0.6;

    const tick = () => {
      if (unmounted) return;
      const now = performance.now();
      const rawDt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const state = gameStateRef.current;

      if (state === 'title') {
        // Live World Camera Tour around the arena on the Title Screen
        weaponRig.root.visible = false;
        playerRoot.position.set(0, 0, 0);
        playerRoot.rotation.set(0, 0, 0);
        baseCameraPos.position.set(0, 0, 0);
        headBobTransform.position.set(0, 0, 0);
        headBobTransform.rotation.set(0, 0, 0);
        headSwayTransform.position.set(0, 0, 0);
        headSwayTransform.rotation.set(0, 0, 0);
        breathingTransform.position.set(0, 0, 0);
        breathingTransform.rotation.set(0, 0, 0);
        landingImpulseTransform.position.set(0, 0, 0);
        landingImpulseTransform.rotation.set(0, 0, 0);
        cameraRecoilTransform.position.set(0, 0, 0);
        cameraRecoilTransform.rotation.set(0, 0, 0);

        titleOrbitAngle += dt * 0.22;
        const camX = Math.sin(titleOrbitAngle) * 19.5;
        const camZ = Math.cos(titleOrbitAngle) * 19.5;
        camera.position.set(camX, 6.2 + Math.sin(titleOrbitAngle * 2) * 0.8, camZ);
        camera.lookAt(0, 1.8, 0);

        // Animate pickups gently on title screen
        for (let i = 0; i < pickups.length; i++) {
          const p = pickups[i];
          const mesh = arenaData.pickupMeshes[i];
          p.bobPhase += dt * 2.5;
          mesh.position.y = p.y + 0.45 + Math.sin(p.bobPhase) * 0.08;
          mesh.rotation.y += dt * 1.4;
        }
      } else if (state === 'playing') {
        weaponRig.root.visible = true;

        // Hitstop timer pauses simulation physics briefly on heavy kills while keeping rendering & shake live
        const simDt = hitstopTimer > 0 ? 0 : dt;
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        }

        const forwardInput =
          (keysHeld.has('KeyW') || keysHeld.has('ArrowUp') ? 1 : 0) -
          (keysHeld.has('KeyS') || keysHeld.has('ArrowDown') ? 1 : 0);
        const rightInput =
          (keysHeld.has('KeyD') || keysHeld.has('ArrowRight') ? 1 : 0) -
          (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft') ? 1 : 0);
        const sprintHeld = keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight');
        const jumpJustPressed = keysJustPressed.has('Space');
        const jumpHeld = keysHeld.has('Space');

        if (simDt > 0) {
          // 1. Step Player Physics & Arena Collisions
          const moveRes = stepPlayerPhysics(
            player,
            {
              forward: forwardInput,
              right: rightInput,
              sprintHeld,
              jumpJustPressed,
              jumpHeld,
              aimHeld: rightMouseHeld,
            },
            arenaData.colliders,
            arenaData.ramps,
            simDt
          );

          if (moveRes.steppedFoot) {
            audioEngine.playFootstep(player.isSprinting);
          }
          if (moveRes.jumped) {
            audioEngine.playJump();
          }
          if (moveRes.landedVelocity > 0) {
            audioEngine.playLand(moveRes.landedVelocity);
          }

          // 2. Step Weapon Procedural Animations & State Machine
          const weapRes = stepWeaponProcedural(
            weaponAnim,
            weaponsRuntime,
            player,
            rightInput,
            simDt,
            settingsRef.current.weaponSwayIntensity
          );
          if (weapRes.reloadCompleted || weapRes.switchedTo) {
            syncHud(true);
          }

          // 3. Handle Firing Input (Automatic for Assault Rifle, Semi-Auto for Revolver)
          const activeId = weaponAnim.activeWeapon;
          const activeSpec = WEAPON_SPECS[activeId];
          const activeRuntime = weaponsRuntime[activeId];
          const wantsToShoot = activeSpec.automatic ? mouseHeld : mouseJustPressed;

          if (wantsToShoot) {
            if (canFireWeapon(weaponAnim, activeRuntime)) {
              executeWeaponFire();
            } else if (
              activeRuntime.ammoInMag === 0 &&
              activeRuntime.reserveAmmo > 0 &&
              weaponAnim.phase === 'ready'
            ) {
              if (triggerWeaponReload(weaponAnim, activeRuntime, activeSpec)) {
                audioEngine.playReload(activeId);
                syncHud(true);
              }
            }
          }

          // 4. Step Ammo Pickups
          for (let i = 0; i < pickups.length; i++) {
            const p = pickups[i];
            const mesh = arenaData.pickupMeshes[i];
            if (p.active) {
              p.bobPhase += simDt * 2.8;
              mesh.visible = true;
              mesh.position.y = p.y + 0.45 + Math.sin(p.bobPhase) * 0.08;
              mesh.rotation.y += simDt * 1.6;

              const distToPlayer = Math.hypot(player.x - p.x, player.z - p.z);
              const dyToPlayer = Math.abs(player.y - p.y);
              if (distToPlayer < 1.45 && dyToPlayer < 1.5) {
                const arSpec = WEAPON_SPECS.assault_rifle;
                const revSpec = WEAPON_SPECS.revolver;
                if (
                  weaponsRuntime.assault_rifle.reserveAmmo < arSpec.maxReserve ||
                  weaponsRuntime.revolver.reserveAmmo < revSpec.maxReserve
                ) {
                  weaponsRuntime.assault_rifle.reserveAmmo = Math.min(
                    arSpec.maxReserve,
                    weaponsRuntime.assault_rifle.reserveAmmo + 30
                  );
                  weaponsRuntime.revolver.reserveAmmo = Math.min(
                    revSpec.maxReserve,
                    weaponsRuntime.revolver.reserveAmmo + 12
                  );
                  p.active = false;
                  p.respawnTimer = 12.0;
                  mesh.visible = false;
                  audioEngine.playPickup();
                  spawnParticleBurst(
                    p.x,
                    p.y + 0.5,
                    p.z,
                    0,
                    1,
                    0,
                    10,
                    0x38bdf8,
                    3.8,
                    1.1
                  );
                  syncHud(true);
                }
              }
            } else {
              p.respawnTimer -= simDt;
              if (p.respawnTimer <= 0) {
                p.active = true;
                mesh.visible = true;
              }
            }
          }

          // 5. Wave Spawning & Enemy AI
          const waveCfg = calculateWaveConfig(wave);
          const aliveEnemies = enemies.filter((b) => b.alive).length;
          if (waveSpawnRemaining > 0 && aliveEnemies < waveCfg.maxConcurrent) {
            spawnCooldown -= simDt;
            if (spawnCooldown <= 0) {
              spawnBotInArena();
              waveSpawnRemaining--;
              spawnCooldown = 1.35;
              syncHud(true);
            }
          } else if (waveSpawnRemaining === 0 && aliveEnemies === 0) {
            // Wave Cleared -> Reward player with small health boost & start next wave
            player.health = Math.min(player.maxHealth, player.health + 20);
            score += wave * 250;
            if (score > bestScore) {
              bestScore = score;
              localStorage.setItem('lowpoly_arena_best', String(bestScore));
            }
            startWave(wave + 1);
            syncHud(true);
          }

          if (inspectionViewRef.current === 'off') {
            const aiRes = stepEnemiesAI(
              enemies,
              player,
              arenaData.colliders,
              arenaData.ramps,
              simDt
            );

            if (aiRes.playerDamageTaken > 0) {
              player.health = Math.max(0, player.health - aiRes.playerDamageTaken);
              player.hurtFlashTimer = 0.28;
              cameraAnim.shakeTrauma = Math.min(0.85, cameraAnim.shakeTrauma + 0.38);
              audioEngine.playPlayerHurt();
              syncHud(true);

              if (player.health <= 0) {
                clearInputs();
                onGameOverRef.current({
                  score,
                  bestScore,
                  wave,
                  kills,
                  shotsFired,
                  shotsHit,
                  victory: false,
                });
              }
            }
          }

          // Update enemy meshes & clean up finished KO topples
          for (let i = enemies.length - 1; i >= 0; i--) {
            const bot = enemies[i];
            const rig = enemyRigs.get(bot.id);
            if (rig) {
              updateEnemyMeshRig(rig, bot);
            }
            if (!bot.alive && bot.koTimer <= 0) {
              if (rig) {
                scene.remove(rig.root);
                enemyRigs.delete(bot.id);
              }
              enemies.splice(i, 1);
            }
          }
        }

        // 6. Step Section 21 Ultra-Precise Camera Procedural System
        stepCameraProcedural(
          cameraAnim,
          player,
          rightInput,
          dt,
          settingsRef.current.fov,
          settingsRef.current
        );

        if (Math.abs(camera.fov - cameraAnim.currentFov) > 0.05) {
          camera.fov = cameraAnim.currentFov;
          camera.updateProjectionMatrix();
        }

        // Apply Section 21.1 Composable Camera Hierarchy Transforms
        // 1) Player Root (world position with smoothed base Y + horizontal yaw)
        playerRoot.position.set(player.x, cameraAnim.smoothedBaseY, player.z);
        playerRoot.rotation.set(0, player.yaw, 0);

        // 2) Base Camera Position (standing eye height 1.68m above ground)
        baseCameraPos.position.set(0, player.eyeHeight, 0);

        // 3) Head Bob Transform (walking/running/sprinting step cycle)
        headBobTransform.position.set(
          cameraAnim.bobOffsetX,
          cameraAnim.bobOffsetY,
          cameraAnim.bobOffsetZ
        );
        headBobTransform.rotation.set(
          cameraAnim.bobPitch,
          0,
          cameraAnim.bobRoll,
          'YXZ'
        );

        // 4) Head Sway & Inertia Transform (acceleration/deceleration momentum, strafe lean, sprint posture, secondary mouse sway)
        headSwayTransform.position.set(
          cameraAnim.inertiaPosX + cameraAnim.lookSwayPosX + cameraAnim.strafeOffsetX,
          cameraAnim.lookSwayPosY,
          cameraAnim.inertiaPosZ + cameraAnim.sprintForwardOffsetZ
        );
        headSwayTransform.rotation.set(
          cameraAnim.inertiaPitch + cameraAnim.swayPitch + cameraAnim.sprintPitchBias,
          cameraAnim.swayYaw,
          cameraAnim.inertiaRoll + cameraAnim.strafeRoll,
          'YXZ'
        );

        // 5) Breathing Transform (0.22 Hz subtle human respiratory motion)
        breathingTransform.position.set(0, cameraAnim.breathOffsetY, 0);
        breathingTransform.rotation.set(
          cameraAnim.breathPitch,
          0,
          cameraAnim.breathRoll,
          'YXZ'
        );

        // 6) Landing & Jump Impulse Transform (takeoff lift & velocity-scaled landing knee/neck compression)
        landingImpulseTransform.position.set(
          0,
          cameraAnim.jumpOffsetY + cameraAnim.landingOffsetY,
          0
        );
        landingImpulseTransform.rotation.set(
          cameraAnim.jumpPitch + cameraAnim.landingPitch,
          0,
          cameraAnim.landingRoll,
          'YXZ'
        );

        // 7) Camera Recoil & Trauma Transform (spring-damped weapon kick + combat trauma)
        cameraRecoilTransform.position.set(
          cameraAnim.shakeOffsetX,
          cameraAnim.shakeOffsetY,
          cameraAnim.recoilOffsetZ
        );
        cameraRecoilTransform.rotation.set(
          cameraAnim.recoilPitch,
          0,
          cameraAnim.recoilRoll + cameraAnim.shakeRoll,
          'YXZ'
        );

        // 8) Final FPS Camera (direct mouse pitch rotation)
        camera.position.set(0, 0, 0);
        camera.rotation.set(player.pitch, 0, 0, 'YXZ');

        // Apply Weapon Viewmodel Rig transform & First-Person Hands Skeleton
        const horizSpeed = Math.hypot(player.vx, player.vz);
        applyWeaponRigTransform(
          weaponRig,
          weaponAnim,
          horizSpeed,
          dt,
          settingsRef.current.showHands,
          inspectionViewRef.current
        );

        // Update transient muzzle flash & tracer
        if (muzzleFlashTimer > 0) {
          muzzleFlashTimer -= dt;
          if (muzzleFlashTimer <= 0) {
            weaponRig.muzzleFlashMesh.visible = false;
            weaponRig.muzzleLight.intensity = 0;
          }
        }

        if (tracerTimer > 0) {
          tracerTimer -= dt;
          tracerMat.opacity = Math.max(0, (tracerTimer / 0.045) * 0.75);
        } else {
          tracerMat.opacity = 0;
        }

        // UpdatePooled Particles
        let anyParticlesUpdated = false;
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const p = particles[i];
          if (!p.active) continue;
          anyParticlesUpdated = true;
          p.life -= dt;
          if (p.life <= 0) {
            p.active = false;
            dummyMatrix.makeScale(0, 0, 0);
            particleInstanced.setMatrixAt(i, dummyMatrix);
          } else {
            p.vy -= 14.0 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            if (p.y < 0.03) {
              p.y = 0.03;
              p.vy *= -0.35;
              p.vx *= 0.7;
              p.vz *= 0.7;
            }
            const s = p.scale * (p.life / p.maxLife);
            dummyPos.set(p.x, p.y, p.z);
            dummyScale.setScalar(s);
            dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
            particleInstanced.setMatrixAt(i, dummyMatrix);
            particleInstanced.setColorAt(i, dummyColor.setHex(p.colorHex));
          }
        }
        if (anyParticlesUpdated) {
          particleInstanced.instanceMatrix.needsUpdate = true;
          if (particleInstanced.instanceColor) {
            particleInstanced.instanceColor.needsUpdate = true;
          }
        }

        // Update DOM Crosshair, Hit Marker & Floating Damage Numbers directly via refs (60fps zero React re-render)
        if (crosshairRef.current) {
          const spreadPx = Math.round(weaponAnim.crosshairSpread);
          crosshairRef.current.style.width = `${spreadPx * 2 + 12}px`;
          crosshairRef.current.style.height = `${spreadPx * 2 + 12}px`;
        }

        if (hitMarkerRef.current) {
          if (hitMarkerTimer > 0) {
            hitMarkerTimer = Math.max(0, hitMarkerTimer - dt);
            const alpha = Math.min(1, hitMarkerTimer / 0.12);
            const scale = 1 + (1 - alpha) * 0.35;
            hitMarkerRef.current.style.opacity = String(alpha);
            hitMarkerRef.current.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(2)})`;
            hitMarkerRef.current.style.color = hitMarkerCritical
              ? '#f59e0b'
              : '#f8fafc';
          } else {
            hitMarkerRef.current.style.opacity = '0';
          }
        }

        if (damageLayerRef.current) {
          if (floatingDamages.length > 0) {
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            let html = '';
            for (let i = floatingDamages.length - 1; i >= 0; i--) {
              const fd = floatingDamages[i];
              fd.timer -= dt;
              fd.y += dt * 1.15;
              if (fd.timer <= 0) {
                floatingDamages.splice(i, 1);
                continue;
              }
              projVec.set(fd.x, fd.y, fd.z).project(camera);
              if (projVec.z >= -1 && projVec.z <= 1) {
                const sx = ((projVec.x + 1) * 0.5 * w).toFixed(1);
                const sy = ((-projVec.y + 1) * 0.5 * h).toFixed(1);
                const alpha = Math.min(1, fd.timer / 0.25).toFixed(2);
                const color = fd.critical ? '#fbbf24' : '#f8fafc';
                const size = fd.critical ? '16px' : '13px';
                html += `<div style="position:absolute;left:${sx}px;top:${sy}px;transform:translate(-50%,-50%);color:${color};font-size:${size};font-weight:700;opacity:${alpha};text-shadow:0 1px 3px rgba(0,0,0,0.9);font-family:var(--font-mono);">${fd.amount}${fd.critical ? '!' : ''}</div>`;
              }
            }
            damageLayerRef.current.innerHTML = html;
          } else if (damageLayerRef.current.innerHTML !== '') {
            damageLayerRef.current.innerHTML = '';
          }
        }

        syncHud(false);
        keysJustPressed.clear();
        mouseJustPressed = false;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onWindowBlur);
      renderer.dispose();
    };
  }, [crosshairRef, hitMarkerRef, damageLayerRef]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-[#12151a]"
      aria-label="Low-Poly Arena 3D Viewport"
    />
  );
};
