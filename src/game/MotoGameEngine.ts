import * as THREE from 'three';
import {
  BikeId,
  BikeSpec,
  DISHES,
  DishInfo,
  getBikeSpec,
  HudSnapshot,
  MissionPhase,
  RunSummary,
  ScreenMode,
  StuntCallout,
  TouchInputState,
} from '../types';
import { ArcadeAudio } from '../audio';
import {
  buildCityLayout,
  CityLayout,
  DeliverySpot,
  findSafeRoadPosition,
  GLORIETA_ISLAND_R,
  GLORIETA_OUTER_R,
  PickupSpot,
  ROAD_COORDS,
  ROAD_WIDTH,
  sampleRamp,
  WORLD_LIMIT,
} from './cityLayout';
import { ActiveCombi, buildCity, BuiltCity } from './cityBuilder';
import { buildBike, buildGuideArrow, BuiltBike } from './bikeBuilder';
import { ParticleSystem } from './particles';

const INITIAL_TIME = 60;
const MAX_TIME = 78;
const MAX_COMBO = 5;
const CRASH_RESPAWN_DURATION = 1.0; // instant comical 1-second recovery!
const GRAVITY = 30;
const JUMP_VELOCITY = 11.8;

export interface EngineCallbacks {
  onHudUpdate: (snap: HudSnapshot) => void;
  onRunFinished: (summary: RunSummary) => void;
  onPauseRequest: () => void;
}

export class MotoGameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private audio: ArcadeAudio;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;

  private layout: CityLayout;
  private city: BuiltCity;
  private particles: ParticleSystem;

  // Player motorcycle & iconic Crazy Taxi arrow
  private bikeId: BikeId;
  private bikeSpec: BikeSpec;
  private bike: BuiltBike;
  private guideArrow: ReturnType<typeof buildGuideArrow>;

  // Engine lifecycle
  private mode: ScreenMode = 'menu';
  private rafId = 0;
  private lastTime = 0;
  private worldTime = 0;
  private hudEmitAccum = 0;
  private disposed = false;

  // Camera smooth state
  private camPos = new THREE.Vector3(0, 7, 46);
  private camLook = new THREE.Vector3(0, 2, 10);
  private camFov = 58;
  private shakeStrength = 0;
  private shopAngle = 0.55;

  // Player physics state
  private px = 0;
  private py = 0;
  private pz = 33;
  private vy = 0;
  private speed = 0;
  private rotY = 0;
  private bankAngle = 0;
  private wheeliePitch = 0;
  private rampPitch = 0;
  private squashY = 1;
  private airborne = false;
  private wasOnRampId = -1;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private rampAirBonusPending: number | null = null;
  private clearedStalls = new Set<number>();
  private clearedTopes = new Map<number, number>();
  private clearedBaches = new Map<number, number>();
  private parkedCooldowns = new Map<number, number>();

  // Turbo / wheelie state
  private turbo = 100;
  private turboActive = false;
  private wasTurboActive = false;
  private wheelieHoldTime = 0;
  private steamTimer = 0;
  private turboParticleTimer = 0;
  private dustTimer = 0;
  private shieldCooldown = 0;

  // Crash ragdoll & respawn
  private crashed = false;
  private crashTimer = 0;
  private crashVx = 0;
  private crashVy = 0;
  private crashVz = 0;
  private crashSpinX = 0;
  private crashSpinZ = 0;
  private crashOffsetY = 0;
  private crashSafeX = 0;
  private crashSafeZ = 0;
  private invulnTimer = 0;

  // Mission / arcade loop state
  private timeLeft = INITIAL_TIME;
  private lastTickSecond = 11;
  private runPesos = 0;
  private stuntBonusTotal = 0;
  private deliveries = 0;
  private combo = 1;
  private bestCombo = 1;
  private nearMisses = 0;
  private rampJumps = 0;
  private phase: MissionPhase = 'pickup';
  private activePickupIds: number[] = [];
  private activeDelivery: DeliverySpot | null = null;
  private currentDish: DishInfo = DISHES[0];
  private pickupTimestamp = 0;
  private lastDeliveredSpotId = -1;

  // Floating stunt popup messages
  private callouts: Array<StuntCallout & { ttl: number }> = [];
  private nextCalloutId = 1;

  // Controls (PC keyboard + Mobile Touch + Xbox Gamepad API)
  private keys = new Set<string>();
  private touch: TouchInputState = {
    left: false,
    right: false,
    jump: false,
    turbo: false,
    brake: false,
    horn: false,
  };
  private prevTouchJump = false;
  private prevTouchHorn = false;
  private touchModeEnabled = false;
  private mobileAutoAccel = true;
  private gamepadConnected = false;
  private prevPadA = false;
  private prevPadY = false;
  private prevPadStart = false;

  // Minimap optional canvas ref
  private minimapCanvas: HTMLCanvasElement | null = null;
  private onResizeBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;

  constructor(
    container: HTMLElement,
    initialBike: BikeId,
    audio: ArcadeAudio,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.audio = audio;
    this.callbacks = callbacks;
    this.bikeId = initialBike;
    this.bikeSpec = getBikeSpec(initialBike);

    // Build crisp, smooth, sunny WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Rich sunlit Mexican city atmosphere (luminous crisp blue sky & warm breezy horizon!)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ad9f8);
    this.scene.fog = new THREE.FogExp2(0xdbf0eb, 0.0019);

    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.4, 720);

    // Golden vibrant 3-point sunlit outdoor Mexican lighting
    const hemi = new THREE.HemisphereLight(0x9ce3ff, 0xe8b57d, 0.92);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1cf, 1.85);
    sun.position.set(58, 92, -48);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 250;
    const sc = 78;
    sun.shadow.camera.left = -sc;
    sun.shadow.camera.right = sc;
    sun.shadow.camera.top = sc;
    sun.shadow.camera.bottom = -sc;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sunLight = sun;

    // Gentle cool azure subtle fill keeping shadow sides crisp & lively (never muddy dark!)
    const rim = new THREE.DirectionalLight(0x9dd8ff, 0.36);
    rim.position.set(-60, 40, 70);
    this.scene.add(rim);

    // Assemble entire dynamic low-poly Mexican city
    this.layout = buildCityLayout();
    this.city = buildCity(this.layout);
    this.scene.add(this.city.group);

    // Pooled juicy arcade FX
    this.particles = new ParticleSystem();
    this.scene.add(this.particles.group);

    // Build player motorcycle
    this.bike = buildBike(initialBike);
    this.scene.add(this.bike.root);

    // Build floating Crazy Taxi 3D arrow indicator
    this.guideArrow = buildGuideArrow();
    this.guideArrow.group.visible = false;
    this.scene.add(this.guideArrow.group);

    // Place initial hero bike proudly facing the Glorieta, iconic OXXO & glowing green stands!
    this.px = this.layout.playerSpawn.x;
    this.pz = this.layout.playerSpawn.z;
    this.rotY = 0.58;
    this.bike.root.position.set(this.px, 0, this.pz);
    this.bike.root.rotation.y = 0.58;
    this.camPos.set(this.px - 5.2, 3.6, this.pz + 7.2);
    this.activatePickups(true);
    this.updateTraffic(0.016);

    // Bind responsive listeners
    this.onResizeBound = () => this.handleResize();
    this.onKeyDownBound = (e) => this.handleKeyDown(e);
    this.onKeyUpBound = (e) => this.handleKeyUp(e);
    this.onBlurBound = () => this.keys.clear();

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);

    this.lastTime = performance.now();
    this.emitHud();
    this.rafId = window.requestAnimationFrame((t) => this.loop(t));
  }

  // ===================== PUBLIC API =====================

  public setMinimapCanvas(canvas: HTMLCanvasElement | null): void {
    this.minimapCanvas = canvas;
  }

  public setMode(mode: ScreenMode): void {
    this.mode = mode;
    this.keys.clear();
    if (mode === 'shop') {
      // Position our bike prominently near central scenic Glorieta plaza for gleaming preview!
      this.bike.root.position.set(this.layout.playerSpawn.x, 0, this.layout.playerSpawn.z);
      this.bike.root.rotation.set(0, 0, 0);
      this.bike.crashGroup.rotation.set(0, 0, 0);
      this.bike.crashGroup.position.set(0, 0, 0);
      this.bike.leanGroup.rotation.set(0, 0, 0);
      this.bike.wheeliePivot.rotation.set(0, 0, 0);
      this.bike.flameGroup.visible = this.bikeSpec.blueFlame;
      this.guideArrow.group.visible = false;
      this.audio.setEngineEnabled(false);
    } else if (mode === 'menu') {
      this.px = this.layout.playerSpawn.x;
      this.pz = this.layout.playerSpawn.z;
      this.py = 0;
      this.rotY = 0.58;
      this.bike.root.position.set(this.px, 0, this.pz);
      this.bike.root.rotation.set(0, 0.58, 0);
      this.bike.crashGroup.rotation.set(0, 0, 0);
      this.bike.crashGroup.position.set(0, 0, 0);
      this.bike.leanGroup.rotation.set(0, 0, 0);
      this.bike.wheeliePivot.rotation.set(0, 0, 0);
      this.bike.flameGroup.visible = false;
      this.bike.root.visible = true;
      this.guideArrow.group.visible = false;
      this.city.deliveryVisual.group.visible = false;
      this.activatePickups(true);
      this.audio.stopMusic();
    } else if (mode === 'paused') {
      this.audio.setEngineEnabled(false);
    } else if (mode === 'playing') {
      this.audio.startMusic();
      this.audio.setEngineEnabled(true);
    } else if (mode === 'results') {
      this.guideArrow.group.visible = false;
      this.bike.flameGroup.visible = false;
      this.audio.stopMusic();
    }
  }

  public previewBike(id: BikeId): void {
    if (this.bikeId === id) return;
    this.bikeId = id;
    this.bikeSpec = getBikeSpec(id);
    this.scene.remove(this.bike.root);
    this.bike = buildBike(id);
    this.scene.add(this.bike.root);
    this.bike.root.position.set(this.px, this.py, this.pz);
    if (this.mode === 'shop') {
      this.bike.root.position.set(this.layout.playerSpawn.x, 0, this.layout.playerSpawn.z);
      this.bike.flameGroup.visible = this.bikeSpec.blueFlame;
    } else if (this.mode === 'menu') {
      this.bike.root.rotation.set(0, 0.28, 0);
    }
  }

  public startRun(selectedBike: BikeId): void {
    this.previewBike(selectedBike);
    this.bikeSpec = getBikeSpec(selectedBike);

    // Full clean arcade reset
    this.px = this.layout.playerSpawn.x;
    this.py = 0;
    this.pz = this.layout.playerSpawn.z;
    this.vy = 0;
    this.speed = 12; // joyful flying launch straight into the sunny Mexican street!
    this.rotY = 0;
    this.bankAngle = 0;
    this.wheeliePitch = 0;
    this.rampPitch = 0;
    this.squashY = 1;
    this.airborne = false;
    this.wasOnRampId = -1;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.rampAirBonusPending = null;
    this.clearedStalls.clear();
    this.clearedTopes.clear();
    this.clearedBaches.clear();
    this.parkedCooldowns.clear();

    this.turbo = this.bikeSpec.turboMax;
    this.turboActive = false;
    this.wasTurboActive = false;
    this.wheelieHoldTime = 0;
    this.shieldCooldown = 0;

    this.crashed = false;
    this.crashTimer = 0;
    this.invulnTimer = 0;
    this.shakeStrength = 0;

    this.timeLeft = INITIAL_TIME;
    this.lastTickSecond = 11;
    this.runPesos = 0;
    this.stuntBonusTotal = 0;
    this.deliveries = 0;
    this.combo = 1;
    this.bestCombo = 1;
    this.nearMisses = 0;
    this.rampJumps = 0;
    this.lastDeliveredSpotId = -1;
    this.callouts = [];
    this.particles.clear();

    // Reset bike visual transforms & sync smooth chase cam right behind bike!
    this.bike.root.visible = true;
    this.bike.root.position.set(this.px, 0, this.pz);
    this.bike.root.rotation.set(0, 0, 0);
    this.bike.crashGroup.position.set(0, 0, 0);
    this.bike.crashGroup.rotation.set(0, 0, 0);
    this.bike.leanGroup.rotation.set(0, 0, 0);
    this.bike.wheeliePivot.rotation.set(0, 0, 0);
    this.bike.flameGroup.visible = false;

    this.camPos.set(this.px, 5.4, this.pz + 11.2);
    this.camLook.set(this.px, 1.8, this.pz - 6);
    this.camFov = 58;
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();

    // Reset combis to crisp starting routes safely off spawn
    for (const c of this.city.combis) {
      c.progress = c.route.initialPos;
      c.nearMissCooldown = 0;
    }

    // Immediate opening pickup mission right ahead beside the OXXO!
    this.phase = 'pickup';
    this.city.deliveryVisual.group.visible = false;
    this.activatePickups(true);
    this.guideArrow.group.visible = true;

    this.mode = 'playing';
    this.audio.startMusic();
    this.audio.setEngineEnabled(true);
    this.audio.setMusicIntensity(false, false);
    this.audio.playHorn();
    this.pushCallout('¡A REPARTIR!', 'Recoge en el aro verde', 'green');
    this.emitHud();
  }

  public setTouchInput(partial: Partial<TouchInputState>): void {
    Object.assign(this.touch, partial);
  }

  public setTouchMode(enabled: boolean): void {
    this.touchModeEnabled = enabled;
  }

  public setMobileAutoAccel(enabled: boolean): void {
    this.mobileAutoAccel = enabled;
  }

  public triggerHorn(): void {
    this.audio.unlock();
    this.audio.playHorn();
    this.pushCallout('¡PIP-PIP!', undefined, 'cyan');
  }

  public dispose(): void {
    this.disposed = true;
    window.cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    this.audio.stopMusic();
    for (const d of this.city.disposables) d.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // ===================== INPUT HANDLING =====================

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    if (
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'Space'
    ) {
      e.preventDefault();
    }

    if (this.mode === 'playing') {
      if (code === 'Escape' || code === 'KeyP') {
        this.callbacks.onPauseRequest();
        return;
      }
      if (code === 'Space' && !e.repeat) {
        this.jumpBufferTimer = 0.16;
      }
      if ((code === 'KeyH' || code === 'KeyE') && !e.repeat) {
        this.triggerHorn();
      }
    }
    this.keys.add(code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private sampleControls(): {
    throttle: number;
    brake: number;
    steer: number;
    turboHeld: boolean;
    jumpPressed: boolean;
    hornPressed: boolean;
  } {
    let throttle = 0;
    let brake = 0;
    let steer = 0;
    let turboHeld = false;
    let jumpPressed = false;
    let hornPressed = false;

    // 1. PC Keyboard (WASD + Arrow Keys + Space + Shift + H)
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle = 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) brake = 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) turboHeld = true;

    // 2. Touch Controls (2-thumb fluid mobile HUD + optional auto-accelerate)
    if (this.touch.left) steer += 1;
    if (this.touch.right) steer -= 1;
    if (this.touch.turbo) turboHeld = true;
    if (this.touch.brake) brake = Math.max(brake, 1);
    if (this.touchModeEnabled && this.mobileAutoAccel && !this.touch.brake && brake === 0) {
      throttle = 1;
    }
    if (this.touch.jump && !this.prevTouchJump) jumpPressed = true;
    this.prevTouchJump = this.touch.jump;
    if (this.touch.horn && !this.prevTouchHorn) hornPressed = true;
    this.prevTouchHorn = this.touch.horn;

    // 3. Xbox / Standard Gamepad API (RT accel, LT brake, L-Stick steer, A jump, B/X turbo, Y horn)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let anyPad = false;
    for (let i = 0; i < pads.length; i++) {
      const gp = pads[i];
      if (!gp || !gp.connected) continue;
      anyPad = true;

      // RT (button 7) accelerate, LT (button 6) brake
      const rt = gp.buttons[7]?.value ?? 0;
      const lt = gp.buttons[6]?.value ?? 0;
      if (rt > 0.08) throttle = Math.max(throttle, rt);
      if (lt > 0.08) brake = Math.max(brake, lt);

      // Left stick horizontal axis with smooth deadzone (and D-pad fallback)
      const lx = gp.axes[0] ?? 0;
      if (Math.abs(lx) > 0.14) {
        const mag = (Math.abs(lx) - 0.14) / 0.86;
        steer += (lx < 0 ? 1 : -1) * Math.min(1, mag);
      }
      if (gp.buttons[14]?.pressed) steer += 1;
      if (gp.buttons[15]?.pressed) steer -= 1;
      if (gp.buttons[12]?.pressed) throttle = 1;
      if (gp.buttons[13]?.pressed) brake = 1;

      // A (0) jump
      const padA = Boolean(gp.buttons[0]?.pressed);
      if (padA && !this.prevPadA) jumpPressed = true;
      this.prevPadA = padA;

      // B (1) or X (2) turbo & caballito
      if (gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) turboHeld = true;

      // Y (3) claxon
      const padY = Boolean(gp.buttons[3]?.pressed);
      if (padY && !this.prevPadY) hornPressed = true;
      this.prevPadY = padY;

      // Start (9) pause
      const padStart = Boolean(gp.buttons[9]?.pressed);
      if (padStart && !this.prevPadStart && this.mode === 'playing') {
        this.callbacks.onPauseRequest();
      }
      this.prevPadStart = padStart;
      break;
    }
    this.gamepadConnected = anyPad;

    return {
      throttle: Math.min(1, throttle),
      brake: Math.min(1, brake),
      steer: Math.max(-1, Math.min(1, steer)),
      turboHeld,
      jumpPressed,
      hornPressed,
    };
  }

  // ===================== MISSION SYSTEM =====================

  private activatePickups(firstRun: boolean): void {
    const spots = this.layout.pickupSpots;
    let chosen: PickupSpot[] = [];

    if (firstRun) {
      // Spot #1 is the famous super visible "EL PASTOR" stand straight past the Glorieta next to OXXO!
      chosen = [spots[0], spots[1], spots[2]];
    } else {
      // Pick 1 conveniently near (35..95m), 1 medium, 1 varied dish so every route flows naturally!
      const sorted = [...spots]
        .map((s) => ({ s, d: Math.hypot(s.x - this.px, s.z - this.pz) }))
        .filter((item) => item.d > 22)
        .sort((a, b) => a.d - b.d);

      if (sorted.length >= 3) {
        chosen.push(sorted[0].s);
        // Second pick: distinct dish & mid distance
        const second = sorted.find((x, i) => i >= 1 && x.s.dishId !== sorted[0].s.dishId) ?? sorted[2];
        chosen.push(second.s);
        // Third pick: another tasty dish
        const third =
          sorted.find(
            (x) => x.s.id !== chosen[0].id && x.s.id !== chosen[1].id && x.s.dishId !== chosen[1].dishId
          ) ?? sorted[sorted.length - 1];
        chosen.push(third.s);
      } else {
        chosen = spots.slice(0, 3);
      }
    }

    this.activePickupIds = chosen.map((s) => s.id);
    for (const pv of this.city.pickupVisuals) {
      pv.active = this.activePickupIds.includes(pv.spot.id);
      pv.beaconGroup.visible = pv.active;
    }
    this.city.deliveryVisual.group.visible = false;
    this.activeDelivery = null;
    this.phase = 'pickup';
    this.updateNearestPickupDish();
  }

  private getNearestActivePickup(): PickupSpot | null {
    let best: PickupSpot | null = null;
    let bestD = Infinity;
    for (const id of this.activePickupIds) {
      const s = this.layout.pickupSpots.find((p) => p.id === id);
      if (!s) continue;
      const d = Math.hypot(s.x - this.px, s.z - this.pz);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  private updateNearestPickupDish(): void {
    const nearest = this.getNearestActivePickup();
    if (nearest) {
      const dish = DISHES.find((d) => d.id === nearest.dishId) ?? DISHES[0];
      this.currentDish = dish;
    }
  }

  private triggerPickup(spot: PickupSpot): void {
    // Turn off all pickup green rings
    for (const pv of this.city.pickupVisuals) {
      pv.active = false;
      pv.beaconGroup.visible = false;
    }
    this.activePickupIds = [];

    const dish = DISHES.find((d) => d.id === spot.dishId) ?? DISHES[0];
    this.currentDish = dish;
    this.phase = 'deliver';
    this.pickupTimestamp = this.worldTime;

    // Refill some turbo and celebrate!
    this.turbo = Math.min(this.bikeSpec.turboMax, this.turbo + 24);
    this.audio.playPickup();
    this.particles.emitPickup(spot.x, 0.2, spot.z, dish.hex);

    // Choose exciting glowing delivery house (ideally 75..155m away, never repeat last one!)
    const candidates = this.layout.deliverySpots
      .filter((d) => d.id !== this.lastDeliveredSpotId)
      .map((d) => ({ spot: d, dist: Math.hypot(d.x - this.px, d.z - this.pz) }))
      .filter((x) => x.dist >= 68 && x.dist <= 185);

    const pool = candidates.length > 0 ? candidates : this.layout.deliverySpots.map((d) => ({ spot: d, dist: 100 }));
    const pick = pool[Math.floor(Math.random() * pool.length)].spot;
    this.activeDelivery = pick;

    // Light up the colossal sky-piercing Rayo Dorado!
    const dv = this.city.deliveryVisual;
    dv.group.position.set(pick.x, 0, pick.z);
    dv.group.visible = true;
    // Place cute smiling waving customer on sidewalk edge pointing cleanly into beam!
    const toHouseX = pick.houseX - pick.x;
    const toHouseZ = pick.houseZ - pick.z;
    const len = Math.max(0.01, Math.hypot(toHouseX, toHouseZ));
    dv.customer.position.set((toHouseX / len) * 5.2, 0.2, (toHouseZ / len) * 5.2);
    dv.customer.rotation.y = Math.atan2(-toHouseX, -toHouseZ);

    this.pushCallout(`${dish.emoji} ¡${dish.shortName.toUpperCase()}!`, `Entrega en ${pick.label}`, 'green');
    this.emitHud();
  }

  private triggerDelivery(spot: DeliverySpot): void {
    const elapsed = this.worldTime - this.pickupTimestamp;
    const fastTip = elapsed < 8.5 ? 25 : elapsed < 12 ? 10 : 0;
    const fastBonusTime = elapsed < 8.5 ? 2 : 0;

    // Raise combo BEFORE payout feels ultra-rewarding (1st = x1, 2nd = x2, up to x5!)
    this.deliveries += 1;
    const mult = this.combo;
    const tipPay = Math.round(this.currentDish.basePay * mult + fastTip);
    const addedSec = this.currentDish.bonusSeconds + fastBonusTime;

    this.runPesos += tipPay;
    this.timeLeft = Math.min(MAX_TIME, this.timeLeft + addedSec);
    this.combo = Math.min(MAX_COMBO, this.combo + 1);
    this.bestCombo = Math.max(this.bestCombo, mult);
    this.turbo = Math.min(this.bikeSpec.turboMax, this.turbo + 38);
    this.lastDeliveredSpotId = spot.id;

    // Explosive festive coin & confetti burst!
    this.particles.emitDelivery(spot.x, 0.3, spot.z);
    this.audio.playDelivery(mult);
    this.shakeStrength = Math.max(this.shakeStrength, 0.26);

    const speedNote = fastBonusTime > 0 ? ' · ¡CALIENTITO!' : '';
    const comboStr = mult > 1 ? ` (x${mult})` : '';
    this.pushCallout(
      `+$${tipPay}${comboStr}`,
      `+${addedSec}s extra${speedNote}`,
      'gold'
    );

    // Activate fresh luminous green food pickup spots immediately!
    this.activatePickups(false);
    this.emitHud();
  }

  private awardStunt(label: string, pesos: number, turboAdd: number, tone: StuntCallout['tone'], sub?: string): void {
    this.runPesos += pesos;
    this.stuntBonusTotal += pesos;
    this.turbo = Math.min(this.bikeSpec.turboMax, this.turbo + turboAdd);
    this.pushCallout(`${label} +$${pesos}`, sub, tone);
  }

  private pushCallout(text: string, sub: string | undefined, tone: StuntCallout['tone']): void {
    this.callouts.push({ id: this.nextCalloutId++, text, sub, tone, ttl: 1.32 });
    if (this.callouts.length > 3) this.callouts.shift();
  }

  // ===================== CRASH / SHIELD =====================

  private handleHazardHit(pushX: number, pushZ: number, reason: string): void {
    if (this.crashed || this.invulnTimer > 0) return;

    // La Tortillera Turbo passive: Giant Armored Hielera absorbs the hit & keeps COMBO alive!
    if (this.bikeSpec.crashShield && this.shieldCooldown <= 0) {
      this.shieldCooldown = this.bikeSpec.shieldCooldown;
      this.invulnTimer = 0.85;
      this.speed = Math.max(12, this.speed * 0.65);
      this.vy = Math.max(this.vy, 6.2); // crisp fun little protective hop!
      this.airborne = true;
      this.px += pushX * 1.4;
      this.pz += pushZ * 1.4;
      this.shakeStrength = 0.45;
      this.audio.playShieldBlock();
      this.particles.emitShieldBlock(this.px, this.py, this.pz);
      this.pushCallout('¡HIELERA BLINDADA!', '¡Combo a salvo!', 'cyan');
      return;
    }

    // Standard hilarious comical arc-flip ragdoll + instant 1.0s recovery!
    this.crashed = true;
    this.crashTimer = CRASH_RESPAWN_DURATION;
    this.combo = 1;
    this.turboActive = false;
    this.wheelieHoldTime = 0;
    this.bike.flameGroup.visible = false;

    const launchSpeed = Math.max(10, Math.min(20, this.speed * 0.48));
    this.crashVx = pushX * 7 + -Math.sin(this.rotY) * launchSpeed * 0.35;
    this.crashVz = pushZ * 7 + -Math.cos(this.rotY) * launchSpeed * 0.35;
    this.crashVy = 12.6;
    this.crashOffsetY = Math.max(0.2, this.py);
    this.crashSpinX = (Math.random() > 0.5 ? 1 : -1) * 10.5;
    this.crashSpinZ = (Math.random() > 0.5 ? 1 : -1) * 9.0;

    // Save crisp open spot to snap right back onto in 1.0s
    const safe = findSafeRoadPosition(this.layout, this.px + pushX * 2.2, this.pz + pushZ * 2.2);
    this.crashSafeX = safe.x;
    this.crashSafeZ = safe.z;

    this.speed = 0;
    this.py = 0;
    this.vy = 0;
    this.shakeStrength = 0.72;
    this.audio.playCrash();
    this.particles.emitCrash(this.px, 0.2, this.pz);
    this.pushCallout(`¡UPS! ${reason}`, 'Combo reiniciado', 'red');
  }

  // ===================== MAIN LOOP =====================

  private loop(now: number): void {
    if (this.disposed) return;
    this.rafId = window.requestAnimationFrame((t) => this.loop(t));

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    if (this.mode !== 'paused') {
      this.worldTime += dt;
      this.animateAmbientWorld(dt);
      this.updateTraffic(dt);
      this.particles.update(dt);
    }

    if (this.mode === 'playing') {
      this.updateGameplay(dt);
      this.updateChaseCamera(dt);
      this.updateSunShadow(this.px, this.pz);
      this.drawMinimap();

      this.hudEmitAccum += dt;
      if (this.hudEmitAccum >= 0.065) {
        this.hudEmitAccum = 0;
        this.emitHud();
      }
    } else if (this.mode === 'menu') {
      this.updateMenuCamera(dt);
      this.updateSunShadow(0, 0);
      // Soft idle scarf flutter & headlight sparkle
      this.bike.scarfMesh.rotation.y = Math.sin(this.worldTime * 4.2) * 0.22;
      this.bike.scarfMesh.rotation.x = Math.sin(this.worldTime * 5.8) * 0.08;
    } else if (this.mode === 'shop') {
      this.updateShopCamera(dt);
      this.updateSunShadow(this.layout.playerSpawn.x, this.layout.playerSpawn.z);
      // Live showcase rotating wheels & fluttering flames for eye candy!
      this.bike.frontWheel.rotation.x -= dt * 5;
      this.bike.rearWheel.rotation.x -= dt * 5;
      this.bike.scarfMesh.rotation.y = Math.sin(this.worldTime * 6) * 0.28;
      if (this.bike.flameGroup.visible) {
        const flick = 0.85 + Math.sin(this.worldTime * 38) * 0.22;
        this.bike.flameGroup.scale.set(1, 1, flick);
      }
    } else if (this.mode === 'results') {
      this.updateResultsCamera(dt);
      this.updateSunShadow(this.px, this.pz);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private animateAmbientWorld(dt: number): void {
    const t = this.worldTime;

    // Gentle gliding afternoon white clouds
    for (let i = 0; i < this.city.clouds.length; i++) {
      const c = this.city.clouds[i];
      c.position.x += dt * (1.2 + (i % 3) * 0.45);
      if (c.position.x > 290) c.position.x = -290;
    }

    // Gleaming spinning Golden Ángel top of central Glorieta
    this.city.fountainTop.rotation.y = t * 0.52;

    // Festive gentle swinging Mexican papel picado banners overhead
    for (let i = 0; i < this.city.papelGroups.length; i++) {
      this.city.papelGroups[i].rotation.x = Math.sin(t * 2.4 + i * 0.9) * 0.14;
    }

    // Lazy coastal breeze swaying palmeras & flowering jacarandas
    for (let i = 0; i < this.city.palmCrowns.length; i++) {
      const crown = this.city.palmCrowns[i];
      crown.rotation.z = Math.sin(t * 1.6 + i * 0.7) * 0.055;
      crown.rotation.x = Math.cos(t * 1.2 + i * 1.1) * 0.04;
    }

    // Spin & pulse active electric-green food pickup rings + bobbing 3D tacos/tortillas/esquites/tamales!
    for (let i = 0; i < this.city.pickupVisuals.length; i++) {
      const pv = this.city.pickupVisuals[i];
      if (!pv.active) continue;
      const pulse = 1 + Math.sin(t * 5.6 + i) * 0.09;
      pv.ringMesh.scale.setScalar(pulse);
      pv.outerRing.rotation.y = t * 1.2;
      pv.foodIcon.rotation.y = t * 2.1;
      pv.foodIcon.position.y = 3.2 + Math.sin(t * 3.4 + i) * 0.48;
    }

    // Blaze & ripple the iconic Rayo Dorado golden sky beam + joyful waving customer!
    const dv = this.city.deliveryVisual;
    if (dv.group.visible) {
      dv.innerRing.scale.setScalar(1 + Math.sin(t * 6.5) * 0.09);
      const rip = (t * 0.95) % 1;
      dv.outerRing.scale.setScalar(0.85 + rip * 0.52);
      (dv.outerRing.material as THREE.MeshBasicMaterial).opacity = (1 - rip) * 0.8;
      dv.beamOuter.rotation.y = t * 0.9;
      dv.beamCore.rotation.y = -t * 1.4;
      dv.floatRing.position.y = 0.6 + ((t * 8.5) % 18);
      (dv.floatRing.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, 1 - dv.floatRing.position.y / 19) * 0.85;
      // Happy cheering hopping customer waving both arms eagerly!
      dv.customer.position.y = 0.2 + Math.abs(Math.sin(t * 6.5)) * 0.55;
      dv.leftArm.rotation.z = 0.55 + Math.sin(t * 12) * 0.5;
      dv.rightArm.rotation.z = -0.55 - Math.sin(t * 12) * 0.5;
    }
  }

  private updateTraffic(dt: number): void {
    for (const c of this.city.combis) {
      const r = c.route;
      if (c.nearMissCooldown > 0) c.nearMissCooldown -= dt;

      if (r.kind === 'ring' && r.ringRadius) {
        // Drive smoothly counter-clockwise around the sunlit central Glorieta!
        const angSpeed = r.speed / r.ringRadius;
        c.progress += angSpeed * dt;
        const a = c.progress;
        c.x = Math.cos(a) * r.ringRadius;
        c.z = Math.sin(a) * r.ringRadius;
        // Tangent heading vector: (-sin a, cos a)
        const vx = -Math.sin(a);
        const vz = Math.cos(a);
        c.rotY = Math.atan2(-vx, -vz);
      } else if (r.kind === 'line' && r.axis && r.fixedCoord !== undefined && r.dir) {
        const minP = r.minPos ?? -156;
        const maxP = r.maxPos ?? 156;
        const span = maxP - minP;
        c.progress += r.dir * r.speed * dt;
        if (c.progress > maxP) c.progress -= span;
        if (c.progress < minP) c.progress += span;

        if (r.axis === 'x') {
          c.x = c.progress;
          c.z = r.fixedCoord;
          c.rotY = Math.atan2(-r.dir, 0);
        } else {
          c.x = r.fixedCoord;
          c.z = c.progress;
          c.rotY = Math.atan2(0, -r.dir);
        }
      }

      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.rotY;
      // Rotate spinning rolling wheels smoothly matching actual travel speed!
      const wheelStep = (r.speed * dt) / 0.42;
      for (const w of c.wheels) w.rotation.x -= wheelStep;
    }
  }

  private updateGameplay(dt: number): void {
    // 1. Tick countdown clock & trigger frenzied last-10-second musical hype!
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const lowTime = this.timeLeft <= 10.0 && this.timeLeft > 0;

    if (lowTime) {
      const sec = Math.ceil(this.timeLeft);
      if (sec < this.lastTickSecond && sec >= 1) {
        this.lastTickSecond = sec;
        this.audio.playClockTick(sec <= 3);
      }
    } else {
      this.lastTickSecond = 11;
    }

    if (this.timeLeft <= 0) {
      this.finishRun();
      return;
    }

    // Expire transient callout popups
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      this.callouts[i].ttl -= dt;
      if (this.callouts[i].ttl <= 0) this.callouts.splice(i, 1);
    }

    // Cooldown cleanups
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.shieldCooldown > 0) this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
    this.decayMap(this.clearedTopes, dt);
    this.decayMap(this.clearedBaches, dt);
    this.decayMap(this.parkedCooldowns, dt);

    // 2. Comical crash-flip & crisp instant 1.0-second recovery!
    if (this.crashed) {
      this.crashTimer -= dt;
      this.crashVy -= 28 * dt;
      this.px += this.crashVx * dt;
      this.pz += this.crashVz * dt;
      this.crashOffsetY = Math.max(0.25, this.crashOffsetY + this.crashVy * dt);
      if (this.crashOffsetY <= 0.25 && this.crashVy < 0) {
        this.crashVy = Math.abs(this.crashVy) * 0.42;
      }

      this.bike.root.position.set(this.px, 0, this.pz);
      this.bike.crashGroup.position.y = this.crashOffsetY;
      this.bike.crashGroup.rotation.x += this.crashSpinX * dt;
      this.bike.crashGroup.rotation.z += this.crashSpinZ * dt;
      this.bike.shadowMesh.scale.setScalar(Math.max(0.45, 1 - this.crashOffsetY * 0.08));

      this.audio.updateEngine(0, false, true, false);
      this.audio.setMusicIntensity(false, lowTime);

      if (this.crashTimer <= 0) {
        // Instant sleek arcade snap straight back onto the open boulevard!
        this.crashed = false;
        this.px = this.crashSafeX;
        this.pz = this.crashSafeZ;
        this.py = 0;
        this.vy = 0;
        this.speed = 11; // zero momentum slump!
        this.invulnTimer = 1.45;
        this.bike.crashGroup.position.set(0, 0, 0);
        this.bike.crashGroup.rotation.set(0, 0, 0);
        this.bike.root.position.set(this.px, 0, this.pz);
        this.bike.shadowMesh.scale.setScalar(1);
        this.particles.emitDust(this.px, 0.1, this.pz, 6, 0xfff5d8);
      }
      this.updateGuideArrow();
      return;
    }

    // 3. Read unified PC + Mobile Touch + Xbox Gamepad inputs
    const ctrl = this.sampleControls();
    if (ctrl.jumpPressed) this.jumpBufferTimer = 0.16;
    if (ctrl.hornPressed) this.triggerHorn();
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

    // 4. Turbo + Caballito (Wheelie) activation
    const wantsTurbo = ctrl.turboHeld && this.turbo > 1.5 && (this.speed > 5 || ctrl.throttle > 0.1);
    if (wantsTurbo) {
      this.turboActive = true;
      this.turbo = Math.max(0, this.turbo - this.bikeSpec.turboDrain * dt);
      if (this.turbo <= 0.1) this.turboActive = false;
    } else {
      this.turboActive = false;
      this.turbo = Math.min(this.bikeSpec.turboMax, this.turbo + this.bikeSpec.turboRegen * dt);
    }

    if (this.turboActive && !this.wasTurboActive) {
      this.audio.playTurboStart(this.bikeSpec.blueFlame);
    }
    this.wasTurboActive = this.turboActive;

    // Reward sustained caballito (wheelie) while grounded!
    const wheelieGrounded = this.turboActive && !this.airborne && this.speed > 14;
    if (wheelieGrounded) {
      this.wheelieHoldTime += dt;
      if (this.wheelieHoldTime >= 1.15) {
        this.wheelieHoldTime = 0;
        this.runPesos += 35;
        this.stuntBonusTotal += 35;
        this.pushCallout('¡CABALLITO! +$35', 'Wheelie turbo', 'pink');
        this.particles.emitStuntBurst(this.px, this.py + 0.5, this.pz, this.bikeSpec.blueFlame ? 0x38e8ff : 0xff70b8);
      }
    } else {
      this.wheelieHoldTime = Math.max(0, this.wheelieHoldTime - dt * 1.5);
    }

    // 5. Longitudinal crisp arcade acceleration & velocity
    const topSpeed = this.turboActive ? this.bikeSpec.turboSpeed : this.bikeSpec.maxSpeed;
    if (this.turboActive) {
      this.speed += this.bikeSpec.accel * 1.65 * dt;
      if (this.speed > topSpeed) this.speed += (topSpeed - this.speed) * Math.min(1, dt * 8);
    } else if (ctrl.throttle > 0.05) {
      const target = topSpeed * ctrl.throttle;
      if (this.speed < target) {
        this.speed = Math.min(target, this.speed + this.bikeSpec.accel * dt);
      } else {
        // Gracefully ease down from turbo overdrive!
        this.speed += (target - this.speed) * Math.min(1, dt * 3.2);
      }
    } else if (ctrl.brake > 0.05) {
      if (this.speed > 0.5) {
        this.speed = Math.max(0, this.speed - 52 * ctrl.brake * dt);
      } else {
        this.speed = Math.max(-11, this.speed - 22 * ctrl.brake * dt);
      }
    } else {
      // Natural lively forward roll decay (super arcade smooth!)
      const drag = this.speed > 0 ? 11.5 : 22;
      if (Math.abs(this.speed) < drag * dt) this.speed = 0;
      else this.speed -= Math.sign(this.speed) * drag * dt;
    }

    // 6. Agile Crazy Taxi turning + smooth high-speed mini drift chirp!
    const steerFactor =
      Math.abs(this.speed) < 1
        ? 0.25
        : Math.min(1, Math.abs(this.speed) / 10) * (this.speed >= 0 ? 1 : -0.7);
    const turnMult = this.airborne ? 0.55 : 1.0;
    const turnDelta = ctrl.steer * this.bikeSpec.turnRate * steerFactor * turnMult * dt;
    this.rotY += turnDelta;

    const fwdX = -Math.sin(this.rotY);
    const fwdZ = -Math.cos(this.rotY);

    // Move smoothly along road
    const prevX = this.px;
    const prevZ = this.pz;
    this.px += fwdX * this.speed * dt;
    this.pz += fwdZ * this.speed * dt;

    // 7. Construction Ramps, Height, Jump & Gravity!
    const rampHit = sampleRamp(this.layout, this.px, this.pz);
    let groundY = 0;
    let targetRampPitch = 0;

    if (rampHit) {
      // Climb flush cleanly if moving closely with ramp direction or already above slope
      const align = fwdX * rampHit.ramp.dirX + fwdZ * rampHit.ramp.dirZ;
      if (this.py >= rampHit.height - 0.9 || (align > 0.2 && rampHit.progress < 0.45)) {
        groundY = rampHit.height;
        if (align > 0.25 && this.speed > 10) {
          targetRampPitch = Math.atan2(rampHit.ramp.height, rampHit.ramp.length) * align;
          this.wasOnRampId = rampHit.ramp.id;
        }
      }
    } else if (this.wasOnRampId !== -1) {
      // Just soared off the high tip of a construction ramp — MEGA LAUNCH!
      const lastRamp = this.layout.ramps.find((r) => r.id === this.wasOnRampId);
      if (lastRamp && this.py > lastRamp.height * 0.62 && this.speed > 13) {
        this.vy = Math.max(this.vy, Math.min(18.5, 10.5 + this.speed * 0.22));
        this.airborne = true;
        this.rampAirBonusPending = lastRamp.id;
        this.audio.playJump();
        this.particles.emitStuntBurst(this.px, this.py, this.pz, 0xffbe18);
      }
      this.wasOnRampId = -1;
    }

    // Track coyote grace time
    if (!this.airborne) {
      this.coyoteTimer = 0.11;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Perform buffered spring jump!
    if (this.jumpBufferTimer > 0 && (this.coyoteTimer > 0 || (rampHit && this.py <= groundY + 0.5))) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      const rampBoost = rampHit && this.py > 0.8 ? 4.4 : 0;
      this.vy = JUMP_VELOCITY + rampBoost;
      this.airborne = true;
      this.squashY = 1.18;
      if (rampHit) this.rampAirBonusPending = rampHit.ramp.id;
      this.audio.playJump();
      this.particles.emitDust(this.px, groundY, this.pz, 5);
    }

    // Vertical arcade trajectory
    if (this.airborne || this.py > groundY + 0.08) {
      this.vy -= GRAVITY * dt;
      this.py += this.vy * dt;
      if (this.py <= groundY) {
        const impact = Math.abs(this.vy);
        const hadRamp = this.rampAirBonusPending;
        const clearedDirectly = hadRamp !== null && this.clearedStalls.has(hadRamp);
        this.py = groundY;
        this.vy = 0;
        this.airborne = false;
        this.rampAirBonusPending = null;
        this.clearedStalls.clear();
        if (hadRamp !== null && !clearedDirectly && impact > 11) {
          this.rampJumps += 1;
          this.audio.playNearMiss();
          this.awardStunt('¡GRAN SALTO!', 40, 20, 'gold', '+TURBO');
        }
        if (impact > 6) {
          this.squashY = 0.78;
          this.particles.emitDust(this.px, groundY, this.pz, 6);
        }
      } else {
        this.airborne = true;
      }
    } else {
      this.py = groundY;
      this.vy = 0;
      this.airborne = false;
    }

    // 8. Check epic sky jump RIGHT OVER a Tianguis Stall!
    for (const r of this.layout.ramps) {
      const dx = this.px - r.stallX;
      const dz = this.pz - r.stallZ;
      const halfW = r.stallWidth * 0.5 + 0.8;
      const halfL = r.stallLength * 0.5 + 0.8;
      // Align extents to axis
      const spanX = r.dirX !== 0 ? halfL : halfW;
      const spanZ = r.dirZ !== 0 ? halfL : halfW;

      if (Math.abs(dx) < spanX && Math.abs(dz) < spanZ) {
        if (this.py >= 2.25) {
          // Sailing triumphantly over colorful tianguis pink/blue canopy!
          if (!this.clearedStalls.has(r.id)) {
            this.clearedStalls.add(r.id);
            this.rampJumps += 1;
            this.audio.playRampStunt();
            this.particles.emitStuntBurst(this.px, this.py, this.pz, 0xff49a0);
            this.awardStunt('¡SALTO TIANGUIS!', 80, 35, 'pink', '+TURBO EXTRA');
          }
        } else if (this.invulnTimer <= 0) {
          // Smacked right into low tianguis fruit market!
          const nx = dx === 0 ? -r.dirX : dx / Math.hypot(dx, dz);
          const nz = dz === 0 ? -r.dirZ : dz / Math.hypot(dx, dz);
          this.handleHazardHit(nx, nz, '¡AL TIANGUIS!');
          return;
        }
      }
    }

    // 9. World boundary & Glorieta & Solid Building Collisions (forgiving smooth glide, dramatic head-on!)
    this.resolveStaticCollisions(prevX, prevZ, fwdX, fwdZ);
    if (this.crashed) return;

    // 10. Topes Amarillos (jump cleanly over for bonus cash, hit flat -> hilarious flip!)
    for (const t of this.layout.topes) {
      const dx = Math.abs(this.px - t.x);
      const dz = Math.abs(this.pz - t.z);
      const halfX = t.acrossX ? t.width * 0.5 : t.depth * 0.5 + 0.45;
      const halfZ = t.acrossX ? t.depth * 0.5 + 0.45 : t.width * 0.5;
      if (dx < halfX && dz < halfZ) {
        if (this.py >= 0.48) {
          if (!this.clearedTopes.has(t.id) && this.speed > 10) {
            this.clearedTopes.set(t.id, 1.4);
            this.audio.playNearMiss();
            this.awardStunt('¡SALTO DE TOPE!', 25, 12, 'cyan');
          }
        } else if (this.speed > 11 && this.invulnTimer <= 0) {
          this.handleHazardHit(-fwdX, -fwdZ, '¡EL TOPE!');
          return;
        }
      }
    }

    // 11. Cracked Baches (Potholes — dodge around or hop right across!)
    for (const b of this.layout.baches) {
      const dist = Math.hypot(this.px - b.x, this.pz - b.z);
      if (dist < b.radius + 0.4) {
        if (this.py >= 0.42) {
          if (!this.clearedBaches.has(b.id) && this.speed > 10) {
            this.clearedBaches.set(b.id, 1.4);
            this.audio.playNearMiss();
            this.awardStunt('¡BACHE ESQUIVADO!', 25, 12, 'cyan');
          }
        } else if (this.speed > 9 && this.invulnTimer <= 0) {
          this.handleHazardHit(-fwdX, -fwdZ, '¡BACHE!');
          return;
        }
      }
    }

    // 12. Moving Emerald/White Combis: collision + thrilling "¡POR UN PELO! +$50" near-miss!
    for (const c of this.city.combis) {
      const hit = this.checkVehicleContact(c.x, c.z, c.rotY, 1.25, 2.62, 2.7);
      if (hit === 'crash' && this.invulnTimer <= 0) {
        const dx = this.px - c.x;
        const dz = this.pz - c.z;
        const d = Math.max(0.01, Math.hypot(dx, dz));
        this.handleHazardHit(dx / d, dz / d, '¡LA COMBI!');
        return;
      } else if (hit === 'nearmiss' && c.nearMissCooldown <= 0 && this.speed >= 17) {
        c.nearMissCooldown = 2.6;
        this.triggerNearMiss(c);
      }
    }

    // 13. Parked Colorful Autos: collision + near-miss!
    for (const pc of this.layout.parkedCars) {
      const hit = this.checkVehicleContact(pc.x, pc.z, pc.rotY, 1.1, 2.18, 1.85);
      if (hit === 'crash' && this.invulnTimer <= 0) {
        const dx = this.px - pc.x;
        const dz = this.pz - pc.z;
        const d = Math.max(0.01, Math.hypot(dx, dz));
        this.handleHazardHit(dx / d, dz / d, '¡CHOCASTE!');
        return;
      } else if (hit === 'nearmiss' && !this.parkedCooldowns.has(pc.id) && this.speed >= 20) {
        this.parkedCooldowns.set(pc.id, 3.0);
        this.nearMisses += 1;
        this.audio.playNearMiss();
        this.particles.emitStuntBurst(this.px, this.py + 0.6, this.pz, 0xffe036);
        this.awardStunt('¡POR UN PELO!', 50, 18, 'gold', '+TURBO');
      }
    }

    // 14. Check Glowing Green Pickup Ring & Golden Rayo Dorado Delivery Ring!
    if (this.phase === 'pickup') {
      this.updateNearestPickupDish();
      for (const id of this.activePickupIds) {
        const spot = this.layout.pickupSpots.find((s) => s.id === id);
        if (!spot) continue;
        if (Math.hypot(this.px - spot.x, this.pz - spot.z) <= spot.radius + 1.1 && this.py < 4.5) {
          this.triggerPickup(spot);
          break;
        }
      }
    } else if (this.phase === 'deliver' && this.activeDelivery) {
      const spot = this.activeDelivery;
      if (Math.hypot(this.px - spot.x, this.pz - spot.z) <= spot.radius + 1.1 && this.py < 6.0) {
        this.triggerDelivery(spot);
      }
    }

    // 15. Smooth lively visual juice on bike, rider, flames, trails, drift dust & engine audio!
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 13);

    const targetBank = ctrl.steer * Math.min(1, Math.abs(this.speed) / 22) * 0.44;
    this.bankAngle += (targetBank - this.bankAngle) * Math.min(1, dt * 11);

    const targetWheelie = wheelieGrounded ? 0.44 : this.airborne ? Math.max(-0.22, Math.min(0.34, this.vy * 0.025)) : 0;
    this.wheeliePitch += (targetWheelie - this.wheeliePitch) * Math.min(1, dt * 11);
    this.rampPitch += (targetRampPitch - this.rampPitch) * Math.min(1, dt * 14);

    this.bike.root.position.set(this.px, 0, this.pz);
    this.bike.root.rotation.y = this.rotY;
    this.bike.crashGroup.position.y = this.py;
    this.bike.crashGroup.scale.set(1 + (1 - this.squashY) * 0.35, this.squashY, 1 + (1 - this.squashY) * 0.2);
    this.bike.leanGroup.rotation.z = this.bankAngle;
    this.bike.wheeliePivot.rotation.x = this.wheeliePitch + this.rampPitch;

    // Gentle recovery blink while brief invulnerability plays out
    this.bike.root.visible = this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 18) % 2 === 0;

    // Crisp fast wheel rotation
    const wSpin = (this.speed * dt) / 0.44;
    this.bike.frontWheel.rotation.x -= wSpin;
    this.bike.rearWheel.rotation.x -= wSpin;

    // Animated bandana blowing back dynamically faster with bike velocity!
    const spdNorm = Math.abs(this.speed) / this.bikeSpec.maxSpeed;
    this.bike.scarfMesh.rotation.y = Math.sin(this.worldTime * (6 + spdNorm * 18)) * (0.14 + spdNorm * 0.25);
    this.bike.scarfMesh.rotation.x = -0.05 + Math.cos(this.worldTime * (8 + spdNorm * 14)) * 0.1;

    // Contact shadow tracks beneath bike on ground & scales gracefully with jump altitude
    this.bike.shadowMesh.position.y = Math.max(0.05, groundY + 0.05);
    const heightAbove = Math.max(0, this.py - groundY);
    const sScale = Math.max(0.38, 1 - heightAbove * 0.075);
    this.bike.shadowMesh.scale.setScalar(sScale);
    if (this.bike.neonMesh) {
      this.bike.neonMesh.position.y = this.bike.shadowMesh.position.y + 0.03;
      this.bike.neonMesh.scale.setScalar(sScale * (this.turboActive ? 1.24 : 1));
    }

    // Armored cooling-shield shimmering aqua ring on La Tortillera Turbo!
    if (this.bike.shieldMesh) {
      const ready = this.shieldCooldown <= 0;
      this.bike.shieldMesh.visible = ready;
      if (ready) {
        const pulse = 1 + Math.sin(this.worldTime * 5.8) * 0.05;
        this.bike.shieldMesh.scale.set(0.82 * pulse, 1.16 * pulse, 1);
        (this.bike.shieldMesh.material as THREE.MeshBasicMaterial).opacity =
          0.56 + Math.sin(this.worldTime * 5.8) * 0.22;
      }
    }

    // Roaring fiery / cobalt-blue flames & particle burst while holding Turbo!
    this.bike.flameGroup.visible = this.turboActive;
    if (this.turboActive) {
      const flick = 0.82 + Math.random() * 0.48;
      this.bike.flameGroup.scale.set(1, 1, flick);
      this.turboParticleTimer -= dt;
      if (this.turboParticleTimer <= 0) {
        this.turboParticleTimer = 0.032;
        this.particles.emitTurbo(
          this.px - fwdX * 1.45,
          this.py,
          this.pz - fwdZ * 1.45,
          fwdX,
          fwdZ,
          this.bikeSpec.blueFlame
        );
      }
    }

    // Crisp arcade tire drift skid puffs & sfx on hard fast cornering!
    if (!this.airborne && Math.abs(ctrl.steer) > 0.65 && this.speed > 24) {
      this.audio.playSkid();
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = 0.06;
        this.particles.emitDust(this.px - fwdX * 1.0, this.py, this.pz - fwdZ * 1.0, 1, 0xf2e9dc);
      }
    }

    // Appetizing sizzling warm steam rising softly from your carried food box during delivery!
    if (this.phase === 'deliver') {
      this.steamTimer -= dt;
      if (this.steamTimer <= 0) {
        this.steamTimer = 0.14;
        this.particles.emitSteam(this.px - fwdX * 0.9, this.py, this.pz - fwdZ * 0.9);
      }
    }

    // Update audio pitch & frantically climbing BPM!
    this.audio.setMusicIntensity(this.turboActive, lowTime);
    this.audio.updateEngine(spdNorm, this.turboActive, this.airborne, this.bikeSpec.blueFlame);

    // Float & spin giant iconic Crazy Taxi 3D guide arrow overhead!
    this.updateGuideArrow();
  }

  private triggerNearMiss(c: ActiveCombi): void {
    this.nearMisses += 1;
    this.audio.playNearMiss();
    this.particles.emitStuntBurst((this.px + c.x) * 0.5, this.py + 0.8, (this.pz + c.z) * 0.5, 0xffe438);
    this.awardStunt('¡POR UN PELO!', 50, 20, 'gold', '+TURBO');
  }

  private checkVehicleContact(
    vx: number,
    vz: number,
    vRotY: number,
    halfW: number,
    halfL: number,
    height: number
  ): 'none' | 'crash' | 'nearmiss' {
    // Broad phase quick check
    const dx = this.px - vx;
    const dz = this.pz - vz;
    if (dx * dx + dz * dz > (halfL + 4.2) * (halfL + 4.2)) return 'none';

    // Jump cleanly right over vehicle!
    if (this.py > height - 0.15) return 'none';

    // Rotate delta into vehicle local frame
    const cos = Math.cos(-vRotY);
    const sin = Math.sin(-vRotY);
    const lx = Math.abs(dx * cos - dz * sin);
    const lz = Math.abs(dx * sin + dz * cos);

    const bikeR = 0.62;
    if (lx < halfW + bikeR && lz < halfL + bikeR) {
      return 'crash';
    }
    const nearMargin = 2.05;
    if (lx < halfW + bikeR + nearMargin && lz < halfL + bikeR + nearMargin) {
      return 'nearmiss';
    }
    return 'none';
  }

  private resolveStaticCollisions(prevX: number, prevZ: number, fwdX: number, fwdZ: number): void {
    // 1. World border clean wall deflection
    if (Math.abs(this.px) > WORLD_LIMIT) {
      this.px = Math.sign(this.px) * WORLD_LIMIT;
      this.speed *= 0.78;
    }
    if (Math.abs(this.pz) > WORLD_LIMIT) {
      this.pz = Math.sign(this.pz) * WORLD_LIMIT;
      this.speed *= 0.78;
    }

    // 2. Central Glorieta stone island (smooth silky curve guide around the Ángel!)
    const distC = Math.hypot(this.px, this.pz);
    const minR = GLORIETA_ISLAND_R + 0.9;
    if (distC < minR) {
      const nx = distC > 0.01 ? this.px / distC : 0;
      const nz = distC > 0.01 ? this.pz / distC : 1;
      this.px = nx * minR;
      this.pz = nz * minR;
      // Gracefully slide players around the curved circular Glorieta island!
      const cross = fwdX * nz - fwdZ * nx;
      this.rotY += (cross >= 0 ? -1 : 1) * 0.08;
      this.speed *= 0.94;
    }

    // 3. Buildings + corner OXXO (smooth forgiving wall-slide on diagonal rubs!)
    const pad = 0.95;
    for (const b of this.layout.colliders) {
      const hx = b.w * 0.5 + pad;
      const hz = b.d * 0.5 + pad;
      const dx = this.px - b.x;
      const dz = this.pz - b.z;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        const ox = hx - Math.abs(dx);
        const oz = hz - Math.abs(dz);
        let nx = 0;
        let nz = 0;
        if (ox < oz) {
          nx = dx >= 0 ? 1 : -1;
          this.px = b.x + nx * hx;
        } else {
          nz = dz >= 0 ? 1 : -1;
          this.pz = b.z + nz * hz;
        }
        const intoWall = -(fwdX * nx + fwdZ * nz);
        if (intoWall > 0.82 && this.speed > 32 && this.invulnTimer <= 0 && (prevX !== this.px || prevZ !== this.pz)) {
          this.handleHazardHit(nx, nz, b.isOxxo ? '¡AL OXXO!' : '¡MURO!');
          return;
        }
        // Smooth brush along storefront without halting excitement!
        this.speed *= 0.85;
      }
    }
  }

  private updateGuideArrow(): void {
    let tx = 0;
    let tz = 0;
    let found = false;

    if (this.phase === 'deliver' && this.activeDelivery) {
      tx = this.activeDelivery.x;
      tz = this.activeDelivery.z;
      found = true;
      this.guideArrow.bodyMat.color.setHex(0xffd426);
      this.guideArrow.bodyMat.emissive.setHex(0xff9d00);
    } else {
      const s = this.getNearestActivePickup();
      if (s) {
        tx = s.x;
        tz = s.z;
        found = true;
        this.guideArrow.bodyMat.color.setHex(0x22ff78);
        this.guideArrow.bodyMat.emissive.setHex(0x0dd95c);
      }
    }

    const ag = this.guideArrow.group;
    ag.visible = found && this.mode === 'playing';
    if (!found) return;

    const dx = tx - this.px;
    const dz = tz - this.pz;
    const dist = Math.hypot(dx, dz);

    // Classic Crazy Taxi arrow floated proudly high right above bike & softly pulsing faster when near!
    const bobRate = dist < 24 ? 11 : 5.2;
    const hoverY = this.py + 4.05 + Math.sin(this.worldTime * bobRate) * 0.24;
    ag.position.set(this.px, hoverY, this.pz);
    ag.rotation.y = Math.atan2(-dx, -dz);
    const s = dist < 24 ? 1.15 + Math.sin(this.worldTime * 12) * 0.1 : 1.05;
    ag.scale.setScalar(s);
  }

  private finishRun(): void {
    this.timeLeft = 0;
    this.mode = 'results';
    this.audio.stopMusic();
    this.audio.playTimeUp();
    this.guideArrow.group.visible = false;
    this.bike.flameGroup.visible = false;
    this.bike.root.visible = true;
    this.bike.crashGroup.rotation.set(0, 0, 0);
    this.bike.crashGroup.position.y = 0;
    this.py = 0;

    this.emitHud();
    this.callbacks.onRunFinished({
      score: Math.round(this.runPesos),
      deliveries: this.deliveries,
      bestCombo: this.bestCombo,
      stuntBonus: Math.round(this.stuntBonusTotal),
      nearMisses: this.nearMisses,
      rampJumps: this.rampJumps,
      isNewBestScore: false, // filled cleanly by App against localStorage
      isNewBestDeliveries: false,
      totalWallet: 0,
    });
  }

  // ===================== CAMERAS =====================

  private updateChaseCamera(dt: number): void {
    const fwdX = -Math.sin(this.rotY);
    const fwdZ = -Math.cos(this.rotY);

    // Slightly pull further back on turbo & soar smoothly higher on big ramp flights!
    const speedRatio = Math.max(0, this.speed / 55);
    const extraBack = this.turboActive ? 1.55 : speedRatio * 0.8;
    const jumpPull = Math.min(3.4, this.py * 0.55);
    const dist = 9.4 + extraBack + jumpPull;
    const height = 4.9 + this.py * 0.82 + jumpPull * 0.22;

    const idealX = this.px - fwdX * dist;
    const idealZ = this.pz - fwdZ * dist;

    // Smooth lag gives genuine juicy velocity feel!
    const followPos = 1 - Math.exp(-9.2 * dt);
    this.camPos.x += (idealX - this.camPos.x) * followPos;
    this.camPos.y += (height - this.camPos.y) * (1 - Math.exp(-7.5 * dt));
    this.camPos.z += (idealZ - this.camPos.z) * followPos;

    // Gentle juicy impact screen shake
    let sx = 0;
    let sy = 0;
    if (this.shakeStrength > 0.01) {
      sx = (Math.random() - 0.5) * this.shakeStrength * 1.4;
      sy = (Math.random() - 0.5) * this.shakeStrength * 1.1;
      this.shakeStrength *= Math.exp(-7.5 * dt);
    } else {
      this.shakeStrength = 0;
    }

    this.camera.position.set(this.camPos.x + sx, Math.max(2.0, this.camPos.y + sy), this.camPos.z);

    // Look pleasantly forward down the sunny Mexican boulevard, keeping bike cleanly in lower third!
    const lookX = this.px + fwdX * 7.2;
    const lookY = this.py * 0.65 + 2.05;
    const lookZ = this.pz + fwdZ * 7.2;
    const lookLerp = 1 - Math.exp(-13 * dt);
    this.camLook.x += (lookX - this.camLook.x) * lookLerp;
    this.camLook.y += (lookY - this.camLook.y) * lookLerp;
    this.camLook.z += (lookZ - this.camLook.z) * lookLerp;
    this.camera.lookAt(this.camLook);

    // Thrilling dynamic Crazy Taxi speed FOV expansion during Turbo!
    const targetFov = this.turboActive ? (this.bikeSpec.blueFlame ? 75 : 70) : 57 + speedRatio * 7.5;
    this.camFov += (targetFov - this.camFov) * Math.min(1, dt * 6.5);
    if (Math.abs(this.camera.fov - this.camFov) > 0.05) {
      this.camera.fov = this.camFov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Scenic sunlit poster framing: gleaming 3/4 player moto foreground, iconic Glorieta, vibrant red-gold OXXO, moving combis & snowy peak! */
  private updateMenuCamera(dt: number): void {
    const t = this.worldTime;
    const sway = Math.sin(t * 0.34) * 2.8;
    const targetX = this.px - 4.2 + sway;
    const targetY = 3.55 + Math.sin(t * 0.48) * 0.35;
    const targetZ = this.pz + 7.2;
    const k = 1 - Math.exp(-5.0 * dt);
    this.camPos.lerp(new THREE.Vector3(targetX, targetY, targetZ), k);
    this.camera.position.copy(this.camPos);

    // Keeps bike sparkling crisply in midground with iconic Glorieta & bright OXXO soaring unobstructed across right side!
    this.camera.lookAt(this.px + 2.8, 2.2, this.pz - 12.5);
    if (Math.abs(this.camera.fov - 54) > 0.1) {
      this.camera.fov = 54;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Crisp close turntable 3D motorcycle showroom right in sunlit central Mexico! */
  private updateShopCamera(dt: number): void {
    this.shopAngle += dt * 0.62;
    const bx = this.layout.playerSpawn.x;
    const bz = this.layout.playerSpawn.z;
    const r = 4.65;
    const desired = new THREE.Vector3(
      bx + Math.sin(this.shopAngle) * r,
      2.35,
      bz + Math.cos(this.shopAngle) * r
    );
    this.camPos.lerp(desired, 1 - Math.exp(-7 * dt));
    this.camera.position.copy(this.camPos);
    // Slight offset downward so bike rides cleanly into left/upper showroom frame!
    this.camera.lookAt(bx, 1.08, bz);
    if (Math.abs(this.camera.fov - 46) > 0.1) {
      this.camera.fov = 46;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Warm victorious circle orbit around hero's bike on results screen */
  private updateResultsCamera(dt: number): void {
    const ang = this.worldTime * 0.45;
    const desired = new THREE.Vector3(
      this.px + Math.cos(ang) * 11,
      5.8,
      this.pz + Math.sin(ang) * 11
    );
    this.camPos.lerp(desired, 1 - Math.exp(-4 * dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.px, 1.7, this.pz);
  }

  private updateSunShadow(cx: number, cz: number): void {
    // Snap softly to stabilize shadows cleanly as bike races across the entire city!
    const sx = Math.round(cx / 4) * 4;
    const sz = Math.round(cz / 4) * 4;
    this.sunLight.target.position.set(sx, 0, sz);
    this.sunLight.position.set(sx + 56, 92, sz - 48);
    this.sunLight.target.updateMatrixWorld();
  }

  // ===================== CRISP LIVE MINIMAP =====================

  private drawMinimap(): void {
    const canvas = this.minimapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 2;
    const scale = w / 346; // maps [-173..+173] cleanly to canvas!

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Cozy warm Mexican block base background
    ctx.fillStyle = 'rgba(34, 24, 46, 0.84)';
    ctx.fillRect(0, 0, w, h);

    // Draw colorful warm subtle city block fill
    ctx.fillStyle = 'rgba(235, 198, 152, 0.22)';
    ctx.fillRect(0, 0, w, h);

    // Draw clean bright city avenue network
    ctx.fillStyle = 'rgba(24, 24, 34, 0.92)';
    const rw = ROAD_WIDTH * scale;
    for (const rc of ROAD_COORDS) {
      const p = cx + rc * scale;
      ctx.fillRect(p - rw / 2, 0, rw, h);
      ctx.fillRect(0, p - rw / 2, w, rw);
    }

    // Glorieta roundabout circle + golden center monument dot!
    ctx.fillStyle = 'rgba(24, 24, 34, 0.96)';
    ctx.beginPath();
    ctx.arc(cx, cy, GLORIETA_OUTER_R * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38c969';
    ctx.beginPath();
    ctx.arc(cx, cy, GLORIETA_ISLAND_R * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd236';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Little flagship iconic red-gold OXXO beacon on main NE corner!
    const ox = cx + 29 * scale;
    const oz = cy - 29 * scale;
    ctx.fillStyle = '#ef233c';
    ctx.fillRect(ox - 4.5, oz - 3.5, 9, 7);
    ctx.fillStyle = '#ffd000';
    ctx.fillRect(ox - 4.5, oz + 1.5, 9, 2);

    // Live moving green/white combis dots
    ctx.fillStyle = '#5ee896';
    for (const c of this.city.combis) {
      ctx.beginPath();
      ctx.arc(cx + c.x * scale, cy + c.z * scale, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pulsing pickup green rings OR golden delivery destination!
    const pulse = 0.5 + 0.5 * Math.sin(this.worldTime * 8);
    if (this.phase === 'pickup') {
      for (const id of this.activePickupIds) {
        const s = this.layout.pickupSpots.find((p) => p.id === id);
        if (!s) continue;
        const sx = cx + s.x * scale;
        const sz = cy + s.z * scale;
        ctx.strokeStyle = 'rgba(34, 255, 118, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sz, 4.5 + pulse * 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#22ff78';
        ctx.beginPath();
        ctx.arc(sx, sz, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.activeDelivery) {
      const dx = cx + this.activeDelivery.x * scale;
      const dz = cy + this.activeDelivery.z * scale;
      ctx.strokeStyle = 'rgba(255, 214, 42, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(dx, dz, 5.5 + pulse * 5.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd426';
      ctx.beginPath();
      ctx.arc(dx, dz, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dx, dz, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp rotating directional player triangle arrow!
    const mx = cx + this.px * scale;
    const mz = cy + this.pz * scale;
    ctx.save();
    ctx.translate(mx, mz);
    // Heading rotY = 0 faces -Z (canvas UP = -Y); +rotY rotates left (CCW = negative canvas angle)
    ctx.rotate(-this.rotY);
    ctx.fillStyle = '#ff366c';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.8, 5.2);
    ctx.lineTo(0, 2.8);
    ctx.lineTo(-4.8, 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ===================== HELPERS & HUD SNAPSHOT =====================

  private decayMap(map: Map<number, number>, dt: number): void {
    for (const [k, v] of map.entries()) {
      if (v - dt <= 0) map.delete(k);
      else map.set(k, v - dt);
    }
  }

  private emitHud(): void {
    let targetDist = 0;
    if (this.phase === 'deliver' && this.activeDelivery) {
      targetDist = Math.round(Math.hypot(this.activeDelivery.x - this.px, this.activeDelivery.z - this.pz));
    } else {
      const s = this.getNearestActivePickup();
      if (s) targetDist = Math.round(Math.hypot(s.x - this.px, s.z - this.pz));
    }

    const shieldProg = this.bikeSpec.crashShield
      ? Math.max(0, Math.min(1, 1 - this.shieldCooldown / Math.max(0.1, this.bikeSpec.shieldCooldown)))
      : 0;

    this.callbacks.onHudUpdate({
      timeLeft: this.timeLeft,
      runPesos: Math.round(this.runPesos),
      deliveries: this.deliveries,
      combo: this.combo,
      speedKmh: Math.round(Math.abs(this.speed) * 2.55),
      turbo: this.turbo,
      turboMax: this.bikeSpec.turboMax,
      turboActive: this.turboActive,
      wheelieActive: this.turboActive && !this.airborne && this.speed > 14,
      blueFlame: this.bikeSpec.blueFlame,
      shieldReady: this.bikeSpec.crashShield && this.shieldCooldown <= 0,
      shieldEnabled: this.bikeSpec.crashShield,
      shieldProgress: shieldProg,
      crashed: this.crashed,
      phase: this.phase,
      currentDish: this.currentDish,
      targetDistance: targetDist,
      gamepadConnected: this.gamepadConnected,
      lowTime: this.timeLeft <= 10 && this.timeLeft > 0,
      callouts: this.callouts.map(({ id, text, sub, tone }) => ({ id, text, sub, tone })),
    });
  }
}
