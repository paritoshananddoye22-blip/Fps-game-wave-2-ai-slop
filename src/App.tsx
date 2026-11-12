import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas, HudSnapshot } from './components/GameCanvas';
import {
  CameraComfortPreset,
  GameSettings,
  GameState,
  InspectionViewMode,
  RunSummary,
} from './game/types';
import { CAMERA_COMFORT_PRESETS, WEAPON_SPECS } from './game/rules';
import { audioEngine } from './game/audio';

const INITIAL_HUD: HudSnapshot = {
  health: 100,
  maxHealth: 100,
  activeWeapon: 'assault_rifle',
  ammoInMag: 30,
  reserveAmmo: 120,
  isReloading: false,
  reloadProgress: 0,
  score: 0,
  bestScore: 0,
  wave: 1,
  enemiesRemaining: 6,
  arTriangles: 162,
  revTriangles: 141,
  leftHandTriangles: 296,
  rightHandTriangles: 296,
  hurtFlash: 0,
  isAiming: false,
  arBreakdown: {
    receiver: 32,
    barrel: 22,
    handguard: 22,
    magazine: 18,
    grip: 12,
    stock: 18,
    frontSight: 10,
    rearSight: 10,
    remaining: 18,
    total: 162,
  },
  revBreakdown: {
    frame: 28,
    barrel: 18,
    cylinder: 36,
    grip: 20,
    hammer: 8,
    trigger: 12,
    frontSight: 6,
    rearSight: 7,
    remaining: 6,
    total: 141,
  },
};

const INSPECTION_MODES: InspectionViewMode[] = ['off', 'ads', 'side', 'front', 'top', 'rear'];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [showTitleSettings, setShowTitleSettings] = useState(false);
  const [showAdvancedCamera, setShowAdvancedCamera] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    sensitivity: 1.0,
    fov: 75,
    volume: 0.75,
    muted: false,
    showHands: true,
    ...CAMERA_COMFORT_PRESETS.normal,
  });

  const handleApplyCameraPreset = useCallback((preset: CameraComfortPreset) => {
    audioEngine.playUiClick();
    setSettings((prev) => ({
      ...prev,
      ...CAMERA_COMFORT_PRESETS[preset],
    }));
  }, []);

  const [inspectionView, setInspectionView] = useState<InspectionViewMode>('off');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [trailHealth, setTrailHealth] = useState<number>(100);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [resetSignal, setResetSignal] = useState<number>(0);

  const crosshairRef = useRef<HTMLDivElement | null>(null);
  const hitMarkerRef = useRef<HTMLDivElement | null>(null);
  const damageLayerRef = useRef<HTMLDivElement | null>(null);

  // Sync document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Delayed trailing damage bar for health readout
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTrailHealth(hud.health);
    }, 260);
    return () => clearTimeout(timer);
  }, [hud.health]);

  const startGameplay = useCallback((shouldReset = false) => {
    audioEngine.playUiClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (shouldReset) {
      setResetSignal((n) => n + 1);
    }
    setShowTitleSettings(false);
    document.body.dataset.state = 'playing';
    setGameState('playing');
  }, []);

  const handleRestart = useCallback(() => {
    audioEngine.playUiClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setResetSignal((n) => n + 1);
    document.body.dataset.state = 'playing';
    setGameState('playing');
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, muted: !prev.muted };
      audioEngine.setSettings(next.volume, next.muted);
      return next;
    });
  }, []);

  const handleToggleHands = useCallback(() => {
    audioEngine.playUiClick();
    setSettings((prev) => ({ ...prev, showHands: !prev.showHands }));
  }, []);

  const handleCycleInspection = useCallback(() => {
    audioEngine.playUiClick();
    setInspectionView((prev) => {
      const idx = INSPECTION_MODES.indexOf(prev);
      return INSPECTION_MODES[(idx + 1) % INSPECTION_MODES.length];
    });
  }, []);

  // Keyboard shortcuts for Title start (Enter/Space), Hands toggle (H), Inspection (I), and Mute (M)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }
      if (e.code === 'KeyH') {
        handleToggleHands();
        return;
      }
      if (e.code === 'KeyI' && gameState === 'playing') {
        handleCycleInspection();
        return;
      }
      if (gameState === 'title' && !showTitleSettings) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGameplay(false);
        }
      } else if (gameState === 'paused') {
        if (e.code === 'Escape') {
          e.preventDefault();
          startGameplay(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    showTitleSettings,
    startGameplay,
    handleToggleMute,
    handleToggleHands,
    handleCycleInspection,
  ]);

  const handlePauseRequest = useCallback(() => {
    setGameState('paused');
  }, []);

  const handleGameOver = useCallback((summary: RunSummary) => {
    setRunSummary(summary);
    setGameState('gameover');
  }, []);

  const activeSpec = WEAPON_SPECS[hud.activeWeapon];
  const activeWeaponTris =
    hud.activeWeapon === 'assault_rifle' ? hud.arTriangles : hud.revTriangles;
  const isLowHealth = hud.health <= 30;
  const isAdsSightActive = hud.isAiming || inspectionView === 'ads';

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#12151a]">
      {/* Isolated 60fps Three.js Canvas */}
      <GameCanvas
        gameState={gameState}
        settings={settings}
        inspectionView={inspectionView}
        resetSignal={resetSignal}
        onHudUpdate={setHud}
        onPauseRequest={handlePauseRequest}
        onGameOver={handleGameOver}
        crosshairRef={crosshairRef}
        hitMarkerRef={hitMarkerRef}
        damageLayerRef={damageLayerRef}
      />

      {/* Hurt / Critical Low HP Peripheral Vignette */}
      {gameState === 'playing' && (hud.hurtFlash > 0 || isLowHealth) && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            background:
              'radial-gradient(circle at center, transparent 55%, rgba(220, 38, 38, 0.42) 100%)',
            opacity: hud.hurtFlash > 0 ? 0.95 : 0.55,
          }}
        />
      )}

      {/* =====================================================================
          PLAYING HUD (Unobstructed >= 85% Viewport, No backdrop-filter)
         ===================================================================== */}
      {gameState === 'playing' && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {/* Floating 3D-Projected Damage Numbers Layer */}
          <div
            ref={damageLayerRef}
            className="fixed inset-0 pointer-events-none overflow-hidden"
          />

          {/* Center Crosshair & Hit Marker */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {/* Dynamic Geometric Crosshair (fades outer pips during ADS so 3D iron sights are crystal clear) */}
            <div
              ref={crosshairRef}
              className="relative flex items-center justify-center transition-opacity duration-150"
              style={{
                width: '24px',
                height: '24px',
                opacity: isAdsSightActive ? 0.22 : 1,
              }}
            >
              {/* Center precision dot */}
              <span className="w-1 h-1 bg-[#f8fafc] opacity-90" />
              {/* Top Pip */}
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[6px] bg-[#f8fafc] shadow-[0_0_2px_#000]" />
              {/* Bottom Pip */}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-[6px] bg-[#f8fafc] shadow-[0_0_2px_#000]" />
              {/* Left Pip */}
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-[2px] bg-[#f8fafc] shadow-[0_0_2px_#000]" />
              {/* Right Pip */}
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[6px] h-[2px] bg-[#f8fafc] shadow-[0_0_2px_#000]" />
            </div>

            {/* Cross-Shaped Hit Marker */}
            <div
              ref={hitMarkerRef}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0"
              style={{ width: '22px', height: '22px', color: '#f8fafc' }}
            >
              <svg viewBox="0 0 24 24" className="w-full h-full stroke-current" fill="none">
                <path
                  d="M4 4L9 9M20 4L15 9M4 20L9 15M20 20L15 15"
                  strokeWidth="2.4"
                  strokeLinecap="square"
                />
              </svg>
            </div>

            {/* Reloading Ring Indicator near Center */}
            {hud.isReloading && (
              <div className="fixed left-1/2 top-[calc(50%+28px)] -translate-x-1/2 flex flex-col items-center gap-1">
                <span className="font-mono-tabular text-[11px] font-bold tracking-wider text-[#f59e0b] hud-text-shadow">
                  RELOADING
                </span>
                <div className="w-16 h-1 bg-[#1e242d] overflow-hidden">
                  <div
                    className="h-full bg-[#f59e0b]"
                    style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* TOP-LEFT CLUSTER: Player Vitality & Health Bar */}
          <div className="fixed top-5 left-6 flex flex-col gap-1.5 bg-[#14181f]/90 border border-[#2d3542] px-4 py-3 min-w-[220px]">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#d95f25]" fill="currentColor">
                  <path d="M10 3H14V10H21V14H14V21H10V14H3V10H10V3Z" />
                </svg>
                <span className="font-display text-xs font-bold tracking-wider text-[#94a3b8]">
                  INTEGRITY
                </span>
              </div>
              <span
                data-testid="hud-health"
                className={`font-display font-mono-tabular text-3xl font-bold leading-none ${
                  isLowHealth ? 'text-[#ef4444]' : 'text-[#f8fafc]'
                }`}
              >
                {hud.health}
              </span>
            </div>

            {/* Health Bar with Delayed Damage Ghost Trail */}
            <div className="relative w-full h-2.5 bg-[#0d1015] overflow-hidden border border-[#262d38]">
              <div
                className="absolute inset-y-0 left-0 bg-[#ef4444]/60 transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, (trailHealth / hud.maxHealth) * 100))}%`,
                }}
              />
              <div
                className={`relative h-full transition-all duration-75 ${
                  isLowHealth ? 'bg-[#ef4444]' : 'bg-[#d95f25]'
                }`}
                style={{
                  width: `${Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* SECTION 20.10 & 20.11 WEAPON INSPECTION & TRIANGLE BREAKDOWN OVERLAY */}
          {inspectionView !== 'off' && (
            <div
              data-hud-interactive="true"
              data-testid="weapon-inspection-panel"
              className="fixed top-28 left-6 bg-[#14181f]/95 border border-[#d95f25] p-4 flex flex-col gap-3 w-[300px] pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-[#262d38] pb-2">
                <div className="flex flex-col">
                  <span className="font-display text-xs font-bold tracking-wider text-[#d95f25]">
                    WEAPON &amp; SIGHT INSPECTOR
                  </span>
                  <span className="font-mono-tabular text-[10px] text-[#94a3b8]">
                    MODE: {inspectionView.toUpperCase()} VIEW · [I] CYCLE
                  </span>
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setInspectionView('off');
                  }}
                  className="px-2 py-0.5 bg-[#1e242e] border border-[#333c4d] text-[10px] font-mono-tabular text-[#cbd5e1] hover:text-white cursor-pointer"
                >
                  CLOSE
                </button>
              </div>

              {/* Camera Angle Selector Buttons */}
              <div className="grid grid-cols-5 gap-1">
                {(['ads', 'side', 'front', 'top', 'rear'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    tabIndex={-1}
                    data-testid={`inspect-mode-${mode}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      audioEngine.playUiClick();
                      setInspectionView(mode);
                    }}
                    className={`py-1 text-[10px] font-mono-tabular font-bold border uppercase cursor-pointer ${
                      inspectionView === mode
                        ? 'bg-[#d95f25] border-[#d95f25] text-[#0d1015]'
                        : 'bg-[#191f29] border-[#2d3542] text-[#cbd5e1] hover:border-[#d95f25]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Component-by-Component Triangle Breakdown */}
              <div className="flex flex-col gap-1 text-[11px] font-mono-tabular text-[#cbd5e1] bg-[#0e1218] border border-[#242b35] p-2.5">
                <div className="flex justify-between font-bold text-[#f8fafc] border-b border-[#242b35] pb-1 mb-1">
                  <span>{activeSpec.name}</span>
                  <span className="text-[#38bdf8]">
                    {activeWeaponTris}/{activeSpec.maxTriangles} TRIS
                  </span>
                </div>

                {hud.activeWeapon === 'assault_rifle' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Upper &amp; Lower Receiver</span>
                      <span>{hud.arBreakdown.receiver} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Barrel &amp; Recessed Muzzle</span>
                      <span>{hud.arBreakdown.barrel} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Tactical Handguard</span>
                      <span>{hud.arBreakdown.handguard} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Detachable Magazine</span>
                      <span>{hud.arBreakdown.magazine} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Ergonomic Pistol Grip</span>
                      <span>{hud.arBreakdown.grip} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Shoulder Stock &amp; Pad</span>
                      <span>{hud.arBreakdown.stock} tris</span>
                    </div>
                    <div className="flex justify-between text-[#f59e0b]">
                      <span>Front Sight Post + Tip</span>
                      <span>{hud.arBreakdown.frontSight} tris</span>
                    </div>
                    <div className="flex justify-between text-[#38bdf8]">
                      <span>Rear U-Notch Sight</span>
                      <span>{hud.arBreakdown.rearSight} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Trigger, Guard &amp; Bolt</span>
                      <span>{hud.arBreakdown.remaining} tris</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Frame &amp; Top Strap</span>
                      <span>{hud.revBreakdown.frame} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Revolving Cylinder</span>
                      <span>{hud.revBreakdown.cylinder} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Heavy Barrel &amp; Bore</span>
                      <span>{hud.revBreakdown.barrel} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Angled Revolver Grip</span>
                      <span>{hud.revBreakdown.grip} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Articulated Hammer</span>
                      <span>{hud.revBreakdown.hammer} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Trigger &amp; Guard</span>
                      <span>{hud.revBreakdown.trigger} tris</span>
                    </div>
                    <div className="flex justify-between text-[#f59e0b]">
                      <span>Front Sight Blade + Tip</span>
                      <span>{hud.revBreakdown.frontSight} tris</span>
                    </div>
                    <div className="flex justify-between text-[#38bdf8]">
                      <span>Rear U-Notch Sight</span>
                      <span>{hud.revBreakdown.rearSight} tris</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">Ejector Rod Shroud</span>
                      <span>{hud.revBreakdown.remaining} tris</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between border-t border-[#242b35] pt-1 mt-1 text-[10px] text-[#94a3b8]">
                  <span>Full Arm + Hand Rig (Each)</span>
                  <span className="text-[#f8fafc]">{hud.leftHandTriangles}/300 tris</span>
                </div>
              </div>
            </div>
          )}

          {/* TOP-CENTER CLUSTER: Wave & Score Readouts */}
          <div className="fixed top-5 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-[#14181f]/90 border border-[#2d3542] px-6 py-2.5">
            <div className="flex flex-col items-center">
              <span className="font-display text-[11px] font-semibold tracking-wider text-[#94a3b8]">
                WAVE
              </span>
              <span
                data-testid="hud-wave"
                className="font-display font-mono-tabular text-2xl font-bold text-[#38bdf8] leading-tight"
              >
                {hud.wave}
              </span>
            </div>

            <div className="w-[1px] h-8 bg-[#2d3542]" />

            <div className="flex flex-col items-center min-w-[90px]">
              <span className="font-display text-[11px] font-semibold tracking-wider text-[#94a3b8]">
                SCORE
              </span>
              <span
                data-testid="hud-score"
                className="font-display font-mono-tabular text-2xl font-bold text-[#f8fafc] leading-tight"
              >
                {hud.score}
              </span>
            </div>

            <div className="w-[1px] h-8 bg-[#2d3542]" />

            <div className="flex flex-col items-center">
              <span className="font-display text-[11px] font-semibold tracking-wider text-[#94a3b8]">
                HOSTILES
              </span>
              <span
                data-testid="hud-hostiles"
                className="font-display font-mono-tabular text-2xl font-bold text-[#d95f25] leading-tight"
              >
                {hud.enemiesRemaining}
              </span>
            </div>
          </div>

          {/* TOP-RIGHT CLUSTER: Utility Controls (Inspect, Hands Toggle, Mute, Restart, Pause) */}
          <div
            data-hud-interactive="true"
            className="fixed top-5 right-6 flex items-center gap-2 pointer-events-auto"
          >
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-inspect-weapon"
              onClick={(e) => {
                e.currentTarget.blur();
                handleCycleInspection();
              }}
              className={`h-10 px-3 flex items-center gap-1.5 bg-[#14181f]/90 border text-xs font-mono-tabular font-semibold transition-colors cursor-pointer ${
                inspectionView !== 'off'
                  ? 'border-[#d95f25] text-[#d95f25]'
                  : 'border-[#2d3542] text-[#f8fafc] hover:border-[#d95f25]'
              }`}
              title="Cycle Weapon & Sight Inspection Mode [I]"
            >
              <span>
                INSPECT: {inspectionView === 'off' ? 'OFF' : inspectionView.toUpperCase()}
              </span>
              <span className="text-[10px] text-[#94a3b8]">[I]</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-toggle-hands"
              aria-label={settings.showHands ? 'Hide First-Person Hands' : 'Show First-Person Hands'}
              onClick={(e) => {
                e.currentTarget.blur();
                handleToggleHands();
              }}
              className={`h-10 px-3 flex items-center gap-1.5 bg-[#14181f]/90 border text-xs font-mono-tabular font-semibold transition-colors cursor-pointer ${
                settings.showHands
                  ? 'border-[#2d3542] text-[#f8fafc] hover:border-[#d95f25]'
                  : 'border-[#2d3542] text-[#64748b] hover:text-[#cbd5e1] hover:border-[#d95f25]'
              }`}
              title="Toggle First-Person Hands [H]"
            >
              <span>HANDS: {settings.showHands ? 'ON' : 'OFF'}</span>
              <span className="text-[10px] text-[#94a3b8]">[H]</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                handleToggleMute();
              }}
              className="w-10 h-10 flex items-center justify-center bg-[#14181f]/90 border border-[#2d3542] text-[#cbd5e1] hover:text-white hover:border-[#d95f25] transition-colors cursor-pointer"
              title="Mute / Unmute [M]"
            >
              {settings.muted ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" />
                  <path d="M23 9L17 15M17 9L23 15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Restart Match"
              onClick={(e) => {
                e.currentTarget.blur();
                handleRestart();
              }}
              className="w-10 h-10 flex items-center justify-center bg-[#14181f]/90 border border-[#2d3542] text-[#cbd5e1] hover:text-white hover:border-[#d95f25] transition-colors cursor-pointer"
              title="Restart Arena"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Game"
              onClick={(e) => {
                e.currentTarget.blur();
                audioEngine.playUiClick();
                setGameState('paused');
              }}
              className="w-10 h-10 flex items-center justify-center bg-[#14181f]/90 border border-[#2d3542] text-[#cbd5e1] hover:text-white hover:border-[#d95f25] transition-colors cursor-pointer"
              title="Pause [ESC / P]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          </div>

          {/* BOTTOM-RIGHT CLUSTER: Weapon Indicator, Silhouette & Ammunition Readout */}
          <div className="fixed bottom-5 right-6 flex flex-col gap-2 bg-[#14181f]/90 border border-[#2d3542] px-5 py-3.5 min-w-[270px]">
            {/* Weapon Switch Slots [1] & [2] + ADS Indicator */}
            <div className="flex items-center justify-between gap-3 text-xs border-b border-[#262d38] pb-2">
              <div
                className={`flex items-center gap-1.5 ${
                  hud.activeWeapon === 'assault_rifle'
                    ? 'text-[#f8fafc] font-semibold'
                    : 'text-[#64748b]'
                }`}
              >
                <span className="font-mono-tabular px-1.5 py-0.5 bg-[#1e242e] text-[11px]">
                  [1]
                </span>
                <span>CARBINE</span>
              </div>

              <div
                className={`flex items-center gap-1.5 ${
                  hud.activeWeapon === 'revolver'
                    ? 'text-[#f8fafc] font-semibold'
                    : 'text-[#64748b]'
                }`}
              >
                <span className="font-mono-tabular px-1.5 py-0.5 bg-[#1e242e] text-[11px]">
                  [2]
                </span>
                <span>MAGNUM</span>
              </div>

              <span
                data-testid="hud-ads-state"
                className={`font-mono-tabular text-[10px] px-1.5 py-0.5 border ${
                  isAdsSightActive
                    ? 'border-[#38bdf8] text-[#38bdf8] font-bold'
                    : 'border-[#262d38] text-[#64748b]'
                }`}
              >
                {isAdsSightActive ? 'ADS ALIGNED' : 'RMB AIM'}
              </span>
            </div>

            {/* Active Weapon Name, SVG Icon & Ammo Numerals */}
            <div className="flex items-center justify-between gap-5 pt-0.5">
              <div className="flex flex-col gap-1">
                <span
                  data-testid="hud-weapon-name"
                  className="font-display text-sm font-bold tracking-wider text-[#d95f25]"
                >
                  {activeSpec.name}
                </span>
                <span className="text-[11px] text-[#94a3b8]">
                  {activeSpec.role} ·{' '}
                  <span data-testid="hud-weapon-tris" className="font-mono-tabular text-[#cbd5e1]">
                    {activeWeaponTris}/{activeSpec.maxTriangles} TRIS
                  </span>
                </span>
                <span
                  data-testid="hud-hands-tris"
                  className="text-[10px] font-mono-tabular text-[#94a3b8]"
                >
                  {settings.showHands
                    ? `ARMS+HANDS: ${hud.leftHandTriangles}L + ${hud.rightHandTriangles}R TRIS`
                    : 'ARMS+HANDS: HIDDEN [H]'}
                </span>

                {/* Custom Low-Poly Weapon Silhouette SVG */}
                <div className="mt-1 text-[#cbd5e1]">
                  {hud.activeWeapon === 'assault_rifle' ? (
                    <svg viewBox="0 0 120 36" className="w-28 h-7 fill-current">
                      <polygon points="4,14 26,12 26,24 4,28" fill="#64748b" />
                      <polygon points="26,10 78,10 82,18 26,20" />
                      <polygon points="78,12 104,12 104,17 78,17" fill="#94a3b8" />
                      <polygon points="104,13 118,13 118,16 104,16" fill="#d95f25" />
                      <polygon points="34,20 42,20 38,32 30,32" fill="#64748b" />
                      <polygon points="54,20 64,20 68,34 58,34" fill="#94a3b8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 120 36" className="w-28 h-7 fill-current">
                      <polygon points="14,18 28,16 22,34 10,32" fill="#78350f" />
                      <polygon points="26,11 60,11 58,22 26,22" />
                      <polygon points="36,12 54,12 54,21 36,21" fill="#94a3b8" />
                      <polygon points="60,11 102,11 102,18 60,18" />
                      <polygon points="96,8 102,8 102,11 96,11" fill="#d95f25" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Tabular Ammo Readout */}
              <div className="flex items-baseline gap-1.5">
                <span
                  data-testid="hud-ammo-mag"
                  className={`font-display font-mono-tabular text-4xl font-bold leading-none ${
                    hud.ammoInMag === 0 ? 'text-[#ef4444]' : 'text-[#f8fafc]'
                  }`}
                >
                  {hud.ammoInMag}
                </span>
                <span className="font-mono-tabular text-lg text-[#64748b]">/</span>
                <span
                  data-testid="hud-ammo-reserve"
                  className="font-display font-mono-tabular text-xl font-semibold text-[#94a3b8]"
                >
                  {hud.reserveAmmo}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TITLE SCREEN (Live World Camera Tour + Custom SVG Title Lockup)
         ===================================================================== */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 md:p-14 pointer-events-none bg-gradient-to-r from-[#0d1017]/90 via-[#0d1017]/55 to-transparent">
          {/* Asymmetric Left Negative-Space Lockup */}
          <div className="max-w-xl my-auto flex flex-col items-start gap-6 pointer-events-auto">
            {/* Custom Inline SVG Emblem & Title Lockup */}
            <div className="flex flex-col gap-3">
              <svg
                viewBox="0 0 510 110"
                className="w-full max-w-[490px] h-auto"
                aria-label="LOW-POLY ARENA"
              >
                {/* Angular Low-Poly Crest Icon */}
                <polygon points="24,14 54,6 68,34 54,66 24,58 10,34" fill="#d95f25" />
                <polygon points="28,22 50,16 58,34 50,52 28,46 20,34" fill="#14181f" />
                <polygon points="34,28 46,28 50,34 46,40 34,40 30,34" fill="#38bdf8" />

                {/* Main Geometric Display Title */}
                <text
                  x="84"
                  y="46"
                  fill="#f8fafc"
                  fontFamily="Chakra Petch, sans-serif"
                  fontWeight="700"
                  fontSize="42"
                  letterSpacing="2"
                >
                  LOW-POLY ARENA
                </text>
                <text
                  x="86"
                  y="74"
                  fill="#d95f25"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                  fontSize="14"
                  letterSpacing="3.5"
                >
                  PRECISION TACTICAL FPS SHOOTER
                </text>
                <line x1="84" y1="88" x2="430" y2="88" stroke="#2d3542" strokeWidth="2" />
              </svg>

              <p className="text-sm md:text-base text-[#cbd5e1] max-w-md leading-relaxed">
                Fast-paced low-polygon arena combat featuring flat-shaded geometric
                weaponry ({hud.arTriangles}-tri Carbine &amp; {hud.revTriangles}-tri
                Magnum), calibrated two-point iron sights, articulated 3D arms &amp;
                hands, and ruthless tactical bots.
              </p>
            </div>

            {/* Primary CTA & Settings Button (<= 3 Menu Actions) */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={() => startGameplay(true)}
                className="px-8 py-3.5 bg-[#d95f25] hover:bg-[#ea6c2f] text-[#0d1015] font-display font-bold text-lg tracking-wider transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                PLAY ARENA
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiClick();
                  setShowTitleSettings((v) => !v);
                }}
                className="px-6 py-3.5 bg-[#161b24] hover:bg-[#1f2633] border border-[#333c4d] text-[#f1f5f9] font-display font-semibold text-base tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                SETTINGS
              </button>
            </div>

            {/* Optional Inline Settings Drawer on Title Screen */}
            {showTitleSettings && (
              <div className="w-full max-w-md bg-[#14181f] border border-[#2d3542] p-5 flex flex-col gap-4 mt-1">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm tracking-wider text-[#f8fafc]">
                    COMBAT CONFIGURATION
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTitleSettings(false)}
                    className="text-xs text-[#94a3b8] hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <label className="flex flex-col gap-1.5 text-xs text-[#cbd5e1]">
                  <div className="flex justify-between">
                    <span>Field of View (FOV)</span>
                    <span className="font-mono-tabular text-[#38bdf8]">
                      {Math.round(settings.fov)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="105"
                    step="1"
                    value={settings.fov}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        fov: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#38bdf8] cursor-pointer"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-[#cbd5e1]">
                  <div className="flex justify-between">
                    <span>Mouse Sensitivity</span>
                    <span className="font-mono-tabular text-[#d95f25]">
                      {settings.sensitivity.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={settings.sensitivity}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        sensitivity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#d95f25] cursor-pointer"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs text-[#cbd5e1]">
                  <div className="flex justify-between">
                    <span>Master Volume</span>
                    <span className="font-mono-tabular text-[#38bdf8]">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        volume: parseFloat(e.target.value),
                        muted: false,
                      }))
                    }
                    className="w-full accent-[#38bdf8] cursor-pointer"
                  />
                </label>

                <div className="flex items-center justify-between pt-1 border-t border-[#262d38]">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#cbd5e1]">First-Person Viewmodel Arms &amp; Hands</span>
                    <span className="text-[10px] font-mono-tabular text-[#64748b]">
                      {hud.leftHandTriangles}L / {hud.rightHandTriangles}R TRIS (&le;300 Budget) · 64x64 Texture
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleHands}
                    className={`px-3 py-1 text-xs font-mono-tabular font-bold border cursor-pointer ${
                      settings.showHands
                        ? 'bg-[#d95f25] border-[#d95f25] text-[#0d1015]'
                        : 'bg-[#1e242e] border-[#333c4d] text-[#94a3b8]'
                    }`}
                  >
                    {settings.showHands ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Section 21.19 Camera Comfort Presets */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#262d38]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#cbd5e1]">Head Motion &amp; Comfort Preset</span>
                    <span className="font-mono-tabular text-[10px] text-[#38bdf8] uppercase">
                      {settings.cameraPreset}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'low', label: 'LOW-MOTION' },
                        { id: 'normal', label: 'NORMAL' },
                        { id: 'enhanced', label: 'ENHANCED' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`title-camera-preset-${p.id}`}
                        onClick={() => handleApplyCameraPreset(p.id)}
                        className={`py-1.5 text-[10px] font-mono-tabular font-bold border cursor-pointer ${
                          settings.cameraPreset === p.id
                            ? 'bg-[#38bdf8] border-[#38bdf8] text-[#0d1015]'
                            : 'bg-[#191f29] border-[#2d3542] text-[#cbd5e1] hover:border-[#38bdf8]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Single Flat Inline Control Hint Line in Bottom Safe Margin */}
          <div className="text-xs md:text-sm font-mono-tabular text-[#94a3b8] tracking-wide">
            WASD Move · Space Jump · Shift Sprint · Right Mouse Aim (ADS) · Left Mouse Fire · 1/2 Switch · R Reload · I Inspect · H Hands
          </div>
        </div>
      )}

      {/* =====================================================================
          PAUSE MODAL (ESC / P)
         ===================================================================== */}
      {gameState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0e14]/80 p-6"
        >
          <div className="w-full max-w-md bg-[#14181f] border border-[#2d3542] p-7 flex flex-col gap-6">
            <div className="flex items-baseline justify-between border-b border-[#262d38] pb-3">
              <h2 className="font-display text-2xl font-bold tracking-wider text-[#f8fafc]">
                SYSTEM PAUSED
              </h2>
              <span className="font-mono-tabular text-xs text-[#d95f25]">
                WAVE {hud.wave} · SCORE {hud.score}
              </span>
            </div>

            {/* FOV, Sensitivity & Volume Adjustments */}
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-xs text-[#cbd5e1]">
                <div className="flex justify-between">
                  <span>Field of View (FOV)</span>
                  <span
                    data-testid="pause-fov-value"
                    className="font-mono-tabular text-[#38bdf8]"
                  >
                    {Math.round(settings.fov)}°
                  </span>
                </div>
                <input
                  type="range"
                  data-testid="pause-fov-slider"
                  min="60"
                  max="105"
                  step="1"
                  value={settings.fov}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      fov: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#38bdf8] cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs text-[#cbd5e1]">
                <div className="flex justify-between">
                  <span>Mouse Look Sensitivity</span>
                  <span className="font-mono-tabular text-[#d95f25]">
                    {settings.sensitivity.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={settings.sensitivity}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      sensitivity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#d95f25] cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs text-[#cbd5e1]">
                <div className="flex justify-between">
                  <span>Master Audio Volume</span>
                  <span className="font-mono-tabular text-[#38bdf8]">
                    {settings.muted ? 'MUTED' : `${Math.round(settings.volume * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      volume: parseFloat(e.target.value),
                      muted: false,
                    }))
                  }
                  className="w-full accent-[#38bdf8] cursor-pointer"
                />
              </label>

              <div className="flex items-center justify-between pt-2 border-t border-[#262d38]">
                <div className="flex flex-col">
                  <span className="text-xs text-[#cbd5e1]">First-Person Arms &amp; Hands [H]</span>
                  <span className="text-[10px] font-mono-tabular text-[#64748b]">
                    {hud.leftHandTriangles}L + {hud.rightHandTriangles}R TRIS (&le;300 Budget) · 64x64 Tex
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHands}
                  className={`px-3.5 py-1 text-xs font-mono-tabular font-bold border cursor-pointer ${
                    settings.showHands
                      ? 'bg-[#d95f25] border-[#d95f25] text-[#0d1015]'
                      : 'bg-[#1e242e] border-[#333c4d] text-[#94a3b8]'
                  }`}
                >
                  {settings.showHands ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Section 21.19 Camera Comfort Presets & Fine-Tuning Sliders */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-[#262d38]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#cbd5e1] font-semibold">
                    Camera Comfort Preset
                  </span>
                  <button
                    type="button"
                    data-testid="toggle-advanced-camera"
                    onClick={() => setShowAdvancedCamera((v) => !v)}
                    className="text-[10px] font-mono-tabular text-[#38bdf8] hover:underline cursor-pointer"
                  >
                    {showAdvancedCamera ? 'HIDE CHANNELS' : 'FINE-TUNE (8 CHANNELS)'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'low', label: 'LOW-MOTION' },
                      { id: 'normal', label: 'NORMAL' },
                      { id: 'enhanced', label: 'ENHANCED' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      data-testid={`pause-camera-preset-${p.id}`}
                      onClick={() => handleApplyCameraPreset(p.id)}
                      className={`py-1.5 text-[10px] font-mono-tabular font-bold border cursor-pointer ${
                        settings.cameraPreset === p.id
                          ? 'bg-[#38bdf8] border-[#38bdf8] text-[#0d1015]'
                          : 'bg-[#191f29] border-[#2d3542] text-[#cbd5e1] hover:border-[#38bdf8]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {showAdvancedCamera && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-[#0e1218] border border-[#242b35] p-3 max-h-44 overflow-y-auto">
                    {(
                      [
                        { key: 'headBobIntensity', label: 'Walk/Run Bob' },
                        { key: 'sprintBobIntensity', label: 'Sprint Bob' },
                        { key: 'cameraSwayIntensity', label: 'Head Inertia' },
                        { key: 'cameraRollIntensity', label: 'Camera Roll' },
                        { key: 'landingEffectIntensity', label: 'Landing Dip' },
                        { key: 'weaponSwayIntensity', label: 'Weapon Sway' },
                        { key: 'breathingIntensity', label: 'Breathing' },
                        { key: 'cameraShakeIntensity', label: 'Recoil Shake' },
                      ] as const
                    ).map((item) => (
                      <label
                        key={item.key}
                        className="flex flex-col gap-0.5 text-[10px] text-[#cbd5e1]"
                      >
                        <div className="flex justify-between">
                          <span>{item.label}</span>
                          <span className="font-mono-tabular text-[#38bdf8]">
                            {Math.round(settings[item.key] * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={settings[item.key]}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              [item.key]: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-[#38bdf8] cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pause Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => startGameplay(false)}
                className="w-full py-3 bg-[#d95f25] hover:bg-[#ea6c2f] text-[#0d1015] font-display font-bold text-base tracking-wider cursor-pointer"
              >
                RESUME COMBAT
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-2.5 bg-[#1e242e] hover:bg-[#28303d] border border-[#333c4d] text-[#f1f5f9] font-display font-semibold text-sm tracking-wider cursor-pointer"
              >
                RESTART ARENA
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiClick();
                  setGameState('title');
                }}
                className="w-full py-2.5 bg-transparent hover:bg-[#1a1f29] text-[#94a3b8] hover:text-white font-display font-medium text-sm tracking-wider cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          GAME OVER MODAL
         ===================================================================== */}
      {gameState === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Combat Report"
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0e14]/85 p-6"
        >
          <div className="w-full max-w-md bg-[#14181f] border border-[#2d3542] p-7 flex flex-col gap-6">
            <div className="flex flex-col gap-1 border-b border-[#262d38] pb-4">
              <span className="font-mono-tabular text-xs font-bold tracking-widest text-[#ef4444]">
                ARENA RUN TERMINATED
              </span>
              <h2 className="font-display text-3xl font-bold tracking-wider text-[#f8fafc]">
                OPERATOR DOWN
              </h2>
            </div>

            {/* Tabular Stat Tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0e1218] border border-[#242b35] p-3 flex flex-col">
                <span className="text-[11px] text-[#94a3b8]">SCORE</span>
                <span className="font-display font-mono-tabular text-2xl font-bold text-[#f8fafc]">
                  {runSummary?.score ?? hud.score}
                </span>
                <span className="font-mono-tabular text-[10px] text-[#64748b] mt-0.5">
                  BEST {runSummary?.bestScore ?? hud.bestScore}
                </span>
              </div>

              <div className="bg-[#0e1218] border border-[#242b35] p-3 flex flex-col">
                <span className="text-[11px] text-[#94a3b8]">WAVE</span>
                <span className="font-display font-mono-tabular text-2xl font-bold text-[#38bdf8]">
                  {runSummary?.wave ?? hud.wave}
                </span>
                <span className="font-mono-tabular text-[10px] text-[#64748b] mt-0.5">
                  {runSummary?.kills ?? 0} KILLS
                </span>
              </div>

              <div className="bg-[#0e1218] border border-[#242b35] p-3 flex flex-col">
                <span className="text-[11px] text-[#94a3b8]">ACCURACY</span>
                <span className="font-display font-mono-tabular text-2xl font-bold text-[#d95f25]">
                  {runSummary && runSummary.shotsFired > 0
                    ? Math.round((runSummary.shotsHit / runSummary.shotsFired) * 100)
                    : 0}
                  %
                </span>
                <span className="font-mono-tabular text-[10px] text-[#64748b] mt-0.5">
                  {runSummary?.shotsHit ?? 0}/{runSummary?.shotsFired ?? 0} HITS
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={handleRestart}
                className="w-full py-3.5 bg-[#d95f25] hover:bg-[#ea6c2f] text-[#0d1015] font-display font-bold text-base tracking-wider cursor-pointer"
              >
                TRY AGAIN
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiClick();
                  setGameState('title');
                }}
                className="w-full py-2.5 bg-[#1e242e] hover:bg-[#28303d] border border-[#333c4d] text-[#f1f5f9] font-display font-semibold text-sm tracking-wider cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
