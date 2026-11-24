import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BikeId,
  DISHES,
  getBikeSpec,
  HudSnapshot,
  RunSummary,
  SaveData,
  ScreenMode,
  TouchInputState,
} from './types';
import { loadSave, persistSave } from './storage';
import { ArcadeAudio } from './audio';
import { MotoGameEngine } from './game/MotoGameEngine';
import { TitleOverlay } from './components/TitleOverlay';
import { ShopModal } from './components/ShopModal';
import { GameHud } from './components/GameHud';
import { PauseOverlay, ResultsOverlay } from './components/ResultsOverlay';

function detectInitialTouch(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const smallTouch =
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    window.innerWidth <= 1024;
  return coarse || smallTouch;
}

const INITIAL_HUD: HudSnapshot = {
  timeLeft: 60,
  runPesos: 0,
  deliveries: 0,
  combo: 1,
  speedKmh: 0,
  turbo: 100,
  turboMax: 100,
  turboActive: false,
  wheelieActive: false,
  blueFlame: false,
  shieldReady: false,
  shieldEnabled: false,
  shieldProgress: 1,
  crashed: false,
  phase: 'pickup',
  currentDish: DISHES[0],
  targetDistance: 65,
  gamepadConnected: false,
  lowTime: false,
  callouts: [],
};

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MotoGameEngine | null>(null);
  const audioRef = useRef<ArcadeAudio | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSave());
  const saveRef = useRef<SaveData>(save);
  saveRef.current = save;

  const [mode, setMode] = useState<ScreenMode>('menu');
  const modeRef = useRef<ScreenMode>('menu');
  modeRef.current = mode;

  const [inspectedBike, setInspectedBike] = useState<BikeId>(() => save.selectedBike);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [touchHud, setTouchHud] = useState<boolean>(() => detectInitialTouch());
  const [gamepadConnected, setGamepadConnected] = useState<boolean>(false);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      saveRef.current = next;
      persistSave(next);
      return next;
    });
  }, []);

  // Boot Three.js engine & Web Audio engine once cleanly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const audio = new ArcadeAudio(saveRef.current.muted);
    audioRef.current = audio;

    const engine = new MotoGameEngine(container, saveRef.current.selectedBike, audio, {
      onHudUpdate: (snap) => {
        setHud(snap);
        if (snap.gamepadConnected !== undefined) {
          setGamepadConnected(snap.gamepadConnected);
        }
      },
      onPauseRequest: () => {
        if (modeRef.current === 'playing') {
          engine.setMode('paused');
          setMode('paused');
        }
      },
      onRunFinished: (raw) => {
        const cur = saveRef.current;
        const isNewBestScore = raw.score > cur.bestScore && raw.score > 0;
        const isNewBestDeliveries = raw.deliveries > cur.bestDeliveries && raw.deliveries > 0;
        const newTotal = cur.pesos + raw.score;
        const nextSave: SaveData = {
          ...cur,
          pesos: newTotal,
          bestScore: Math.max(cur.bestScore, raw.score),
          bestDeliveries: Math.max(cur.bestDeliveries, raw.deliveries),
        };
        saveRef.current = nextSave;
        persistSave(nextSave);
        setSave(nextSave);
        setSummary({
          ...raw,
          isNewBestScore,
          isNewBestDeliveries,
          totalWallet: newTotal,
        });
        setMode('results');
      },
    });

    engine.setTouchMode(detectInitialTouch());
    engine.setMobileAutoAccel(saveRef.current.mobileAutoAccel);
    engineRef.current = engine;

    const onPadChange = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      setGamepadConnected(Array.from(pads).some((p) => Boolean(p && p.connected)));
    };
    window.addEventListener('gamepadconnected', onPadChange);
    window.addEventListener('gamepaddisconnected', onPadChange);
    onPadChange();

    return () => {
      window.removeEventListener('gamepadconnected', onPadChange);
      window.removeEventListener('gamepaddisconnected', onPadChange);
      engine.dispose();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  // Keep engine synced with touch-HUD & auto-accel preferences
  useEffect(() => {
    engineRef.current?.setTouchMode(touchHud);
  }, [touchHud]);

  useEffect(() => {
    engineRef.current?.setMobileAutoAccel(save.mobileAutoAccel);
  }, [save.mobileAutoAccel]);

  // Quick controller A/Start shortcut from Menu or Results!
  useEffect(() => {
    if (mode !== 'menu' && mode !== 'results') return;
    let prevBtn = false;
    const id = window.setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < pads.length; i++) {
        const gp = pads[i];
        if (!gp || !gp.connected) continue;
        const pressed = Boolean(gp.buttons[9]?.pressed);
        if (pressed && !prevBtn) {
          audioRef.current?.unlock();
          engineRef.current?.startRun(saveRef.current.selectedBike);
          setMode('playing');
          setSummary(null);
        }
        prevBtn = pressed;
        break;
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [mode]);

  // Press Escape in pause to resume immediately
  useEffect(() => {
    if (mode !== 'paused') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        engineRef.current?.setMode('playing');
        setMode('playing');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const handlePlay = useCallback(() => {
    audioRef.current?.unlock();
    audioRef.current?.playClick();
    setSummary(null);
    engineRef.current?.startRun(saveRef.current.selectedBike);
    setMode('playing');
  }, []);

  const handleOpenShop = useCallback(() => {
    audioRef.current?.playClick();
    const sel = saveRef.current.selectedBike;
    setInspectedBike(sel);
    engineRef.current?.previewBike(sel);
    engineRef.current?.setMode('shop');
    setMode('shop');
  }, []);

  const handleInspectBike = useCallback((id: BikeId) => {
    audioRef.current?.playClick();
    setInspectedBike(id);
    engineRef.current?.previewBike(id);
  }, []);

  const handleBuyBike = useCallback(
    (id: BikeId) => {
      const spec = getBikeSpec(id);
      const cur = saveRef.current;
      if (cur.unlockedBikes.includes(id) || cur.pesos < spec.price) return;
      audioRef.current?.playPurchase();
      updateSave((prev) => ({
        ...prev,
        pesos: prev.pesos - spec.price,
        unlockedBikes: [...prev.unlockedBikes, id],
        selectedBike: id,
      }));
      engineRef.current?.previewBike(id);
    },
    [updateSave]
  );

  const handleEquipBike = useCallback(
    (id: BikeId) => {
      if (!saveRef.current.unlockedBikes.includes(id)) return;
      audioRef.current?.playClick();
      updateSave((prev) => ({ ...prev, selectedBike: id }));
      engineRef.current?.previewBike(id);
    },
    [updateSave]
  );

  const handleBackToMenu = useCallback(() => {
    audioRef.current?.playClick();
    engineRef.current?.previewBike(saveRef.current.selectedBike);
    engineRef.current?.setMode('menu');
    setSummary(null);
    setMode('menu');
  }, []);

  const handleToggleMute = useCallback(() => {
    audioRef.current?.unlock();
    updateSave((prev) => {
      const nextMuted = !prev.muted;
      audioRef.current?.setMuted(nextMuted);
      return { ...prev, muted: nextMuted };
    });
  }, [updateSave]);

  const handleToggleTouchHud = useCallback(() => {
    audioRef.current?.playClick();
    setTouchHud((v) => {
      const next = !v;
      if (!next) {
        engineRef.current?.setTouchInput({
          left: false,
          right: false,
          jump: false,
          turbo: false,
          brake: false,
          horn: false,
        });
      }
      return next;
    });
  }, []);

  const handleToggleAutoAccel = useCallback(() => {
    audioRef.current?.playClick();
    updateSave((prev) => ({ ...prev, mobileAutoAccel: !prev.mobileAutoAccel }));
  }, [updateSave]);

  const handlePause = useCallback(() => {
    audioRef.current?.playClick();
    engineRef.current?.setMode('paused');
    setMode('paused');
  }, []);

  const handleResume = useCallback(() => {
    audioRef.current?.playClick();
    engineRef.current?.setMode('playing');
    setMode('playing');
  }, []);

  const handleTouchChange = useCallback((partial: Partial<TouchInputState>) => {
    engineRef.current?.setTouchInput(partial);
  }, []);

  const handleBindMinimap = useCallback((canvas: HTMLCanvasElement | null) => {
    engineRef.current?.setMinimapCanvas(canvas);
  }, []);

  const handleHorn = useCallback(() => {
    engineRef.current?.triggerHorn();
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1e1529]">
      {/* Live Full-Viewport 3D Mexican City Canvas */}
      <div ref={containerRef} className="fixed inset-0 h-full w-full" />

      {/* Frameless Live Title Screen */}
      {mode === 'menu' && (
        <TitleOverlay
          save={save}
          gamepadConnected={gamepadConnected}
          onPlay={handlePlay}
          onOpenShop={handleOpenShop}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Live 3D Showroom Bike Shop */}
      {mode === 'shop' && (
        <ShopModal
          save={save}
          inspectedBike={inspectedBike}
          onInspect={handleInspectBike}
          onBuy={handleBuyBike}
          onEquip={handleEquipBike}
          onBack={handleBackToMenu}
          onPlayNow={handlePlay}
        />
      )}

      {/* Active Arcade HUD + Minimap + Clean Two-Thumb Mobile Touch Controls */}
      {(mode === 'playing' || mode === 'paused') && (
        <GameHud
          hud={hud}
          muted={save.muted}
          touchHud={touchHud}
          mobileAutoAccel={save.mobileAutoAccel}
          onBindMinimap={handleBindMinimap}
          onTouchChange={handleTouchChange}
          onToggleMute={handleToggleMute}
          onToggleTouchHud={handleToggleTouchHud}
          onToggleAutoAccel={handleToggleAutoAccel}
          onPause={handlePause}
          onHorn={handleHorn}
        />
      )}

      {/* Pause Modal */}
      {mode === 'paused' && (
        <PauseOverlay
          onResume={handleResume}
          onRestart={handlePlay}
          onMenu={handleBackToMenu}
        />
      )}

      {/* Celebratory Results Screen ("¡UN INTENTO MÁS!") */}
      {mode === 'results' && summary && (
        <ResultsOverlay
          summary={summary}
          save={save}
          onReplay={handlePlay}
          onOpenShop={handleOpenShop}
          onMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}

export default App;
