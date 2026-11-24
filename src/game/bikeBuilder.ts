import * as THREE from 'three';
import { BikeId } from '../types';
import { createDeliveryBoxTexture, createShadowBlobTexture } from './textures';

export interface BuiltBike {
  root: THREE.Group;
  leanGroup: THREE.Group;     // banks smoothly side-to-side into turns
  wheeliePivot: THREE.Group;  // pivots about rear axle so front rises smoothly for caballito!
  crashGroup: THREE.Group;    // tumbles comically during ragdoll wipeout
  riderGroup: THREE.Group;    // subtly bounces & shifts into leans
  scarfMesh: THREE.Mesh;      // flutters vibrantly in the wind
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  flameGroup: THREE.Group;    // grows & flickers vigorously during turbo
  neonMesh: THREE.Mesh | null;
  shieldMesh: THREE.Mesh | null;
  shadowMesh: THREE.Mesh;
  isBlueFlame: boolean;
}

let sharedShadowTex: THREE.CanvasTexture | null = null;
function getShadowTex(): THREE.CanvasTexture {
  if (!sharedShadowTex) sharedShadowTex = createShadowBlobTexture();
  return sharedShadowTex;
}

function createWheel(rimColor: number, neonRim = false, radius = 0.44): THREE.Group {
  const g = new THREE.Group();
  // Chunky dark vulcanized tire
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.85, metalness: 0.08 });
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.1, 0.125, 10, 20), tireMat);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  // Inner metallic wheel hub + spokes so wheel spin reads clearly!
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.3,
    metalness: 0.65,
    emissive: neonRim ? rimColor : 0x000000,
    emissiveIntensity: neonRim ? 0.65 : 0,
  });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 10), rimMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);

  // 4 cross spokes so fast rotation pops visually
  const spokeGeo = new THREE.BoxGeometry(0.05, (radius - 0.14) * 2, 0.06);
  const s1 = new THREE.Mesh(spokeGeo, rimMat);
  const s2 = new THREE.Mesh(spokeGeo, rimMat);
  s2.rotation.x = Math.PI / 2;
  g.add(s1, s2);

  if (neonRim) {
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius - 0.14, 0.028, 6, 20),
      new THREE.MeshBasicMaterial({ color: rimColor })
    );
    glowRing.rotation.y = Math.PI / 2;
    g.add(glowRing);
  }

  return g;
}

export function buildBike(id: BikeId): BuiltBike {
  const root = new THREE.Group();

  // Crisp grounded soft drop shadow on pavement
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 3.4),
    new THREE.MeshBasicMaterial({
      map: getShadowTex(),
      transparent: true,
      depthWrite: false,
      opacity: 0.68,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.05;
  root.add(shadowMesh);

  const crashGroup = new THREE.Group();
  root.add(crashGroup);

  const leanGroup = new THREE.Group();
  crashGroup.add(leanGroup);

  // Pivot right around rear wheel center (z = +0.86, y = 0.44) for genuine caballito wheelies!
  const wheeliePivot = new THREE.Group();
  wheeliePivot.position.set(0, 0.44, 0.86);
  leanGroup.add(wheeliePivot);

  // Helper container in normal bike coordinates centered at origin
  const body = new THREE.Group();
  body.position.set(0, -0.44, -0.86);
  wheeliePivot.add(body);

  // Per-bike color palette & dramatic iconic details
  const palette = {
    clasica: {
      paint: 0xe6352f,
      secondary: 0xffc324,
      seat: 0x2a1f1c,
      rim: 0xd8dce3,
      jacket: 0x16a34a,
      helmet: 0xfff5d8,
      scarf: 0xe62e7a,
      neon: 0,
      flameOuter: 0xff6b1a,
      flameInner: 0xfff078,
      blue: false,
    },
    italika: {
      paint: 0x1b1929,
      secondary: 0xff2b8d,
      seat: 0x111018,
      rim: 0x1ef0ff,
      jacket: 0x26203a,
      helmet: 0xff2b8d,
      scarf: 0x1ef0ff,
      neon: 0xff2b8d,
      flameOuter: 0xff4d9c,
      flameInner: 0xffea8a,
      blue: false,
    },
    tortillera: {
      paint: 0xf97316,
      secondary: 0x0ea5e9,
      seat: 0x2a2420,
      rim: 0xfacc15,
      jacket: 0x0284c7,
      helmet: 0xfacc15,
      scarf: 0xef4444,
      neon: 0,
      flameOuter: 0xff7b1a,
      flameInner: 0xfff49a,
      blue: false,
    },
    cohete: {
      paint: 0xf5b31a,
      secondary: 0x0ea5a0, // Aztec jade turquoise!
      seat: 0x191420,
      rim: 0x38e8ff,
      jacket: 0x121824,
      helmet: 0xffcc29,
      scarf: 0x38e8ff,
      neon: 0x22d3ee,
      flameOuter: 0x0ea5ff,
      flameInner: 0xdcfaff,
      blue: true,
    },
  }[id];

  const paintMat = new THREE.MeshStandardMaterial({
    color: palette.paint,
    roughness: id === 'cohete' ? 0.22 : 0.34,
    metalness: id === 'cohete' ? 0.65 : 0.25,
  });
  const secMat = new THREE.MeshStandardMaterial({
    color: palette.secondary,
    roughness: 0.32,
    metalness: id === 'cohete' ? 0.45 : 0.2,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xdbe3ee,
    roughness: 0.22,
    metalness: 0.82,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x2a2d36,
    roughness: 0.6,
    metalness: 0.45,
  });

  // Wheels (grounded smoothly at y = 0.44)
  const frontWheel = createWheel(palette.rim, id === 'italika' || id === 'cohete');
  frontWheel.position.set(0, 0.44, -0.98);
  body.add(frontWheel);

  const rearWheel = createWheel(palette.rim, id === 'italika' || id === 'cohete');
  rearWheel.position.set(0, 0.44, 0.86);
  body.add(rearWheel);

  // Engine block & central chassis cradle
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.92), darkMetal);
  engine.position.set(0, 0.56, -0.05);
  engine.castShadow = true;
  body.add(engine);

  // Sporty sculpted gas tank & upper spine frame
  const tank = new THREE.Mesh(
    new THREE.BoxGeometry(id === 'tortillera' ? 0.62 : 0.52, 0.36, 0.96),
    paintMat
  );
  tank.position.set(0, 0.96, -0.34);
  tank.rotation.x = 0.14;
  tank.castShadow = true;
  body.add(tank);

  // Vibrant tank racing stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.88), secMat);
  stripe.position.set(0, 0.99, -0.34);
  stripe.rotation.x = 0.14;
  body.add(stripe);

  // Front angled telescopic forks
  for (const sx of [-0.17, 0.17]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.96, 8), chromeMat);
    fork.position.set(sx, 0.84, -0.82);
    fork.rotation.x = 0.34;
    body.add(fork);
  }

  // Front mudguard fender
  const fender = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.52), paintMat);
  fender.position.set(0, 0.84, -0.96);
  fender.rotation.x = -0.2;
  body.add(fender);

  // Front wind cowl + bright glowing circular headlight
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.34), paintMat);
  cowl.position.set(0, 1.18, -0.84);
  cowl.rotation.x = 0.22;
  body.add(cowl);

  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14),
    new THREE.MeshBasicMaterial({ color: id === 'cohete' ? 0xc8f7ff : 0xfff8c9 })
  );
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, 1.16, -1.03);
  body.add(lamp);

  // Wide handlebars with darker grips
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.92, 8), chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.32, -0.66);
  body.add(bar);

  // Seat + rear tail chassis
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.18, 0.82),
    new THREE.MeshStandardMaterial({ color: palette.seat, roughness: 0.82 })
  );
  seat.position.set(0, 0.92, 0.32);
  body.add(seat);

  // Glowing cherry taillight
  const tailLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.11, 0.08),
    new THREE.MeshBasicMaterial({ color: id === 'cohete' ? 0x38e8ff : 0xff2942 })
  );
  tailLight.position.set(0, 0.9, 1.24);
  body.add(tailLight);

  // Chrome dual exhaust pipes (bigger twin boosters on Cohete Azteca!)
  const pipeRadius = id === 'cohete' ? 0.11 : 0.07;
  const pipeLen = id === 'cohete' ? 1.15 : 0.85;
  for (const sx of [-0.28, 0.28]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(pipeRadius, pipeRadius * 0.8, pipeLen, 10),
      id === 'cohete' ? paintMat : chromeMat
    );
    pipe.rotation.x = Math.PI / 2 - 0.14;
    pipe.position.set(sx, 0.56, 0.85);
    body.add(pipe);
  }

  // ===== UNIQUE CHARACTER CARGO & UPGRADES FOR EACH OF THE 4 BIKES! =====
  if (id === 'clasica') {
    // Classic warm fiery Mexican delivery box strapped cleanly on rear rack!
    const boxTex = createDeliveryBoxTexture('#E63229', 'TORTILLA', '#FFC21A');
    const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.42 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.72, 0.76), boxMat);
    box.position.set(0, 1.32, 0.98);
    box.castShadow = true;
    body.add(box);
    // Snap golden top lid rim
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.1, 0.8), secMat);
    lid.position.set(0, 1.7, 0.98);
    body.add(lid);
  } else if (id === 'italika') {
    // Sleek tuned street-racer delivery box with magenta/cyan neon accent strips & aggressive spoiler!
    const boxTex = createDeliveryBoxTexture('#1E1930', 'TURBO', '#FF2B8D');
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.62, 0.7),
      new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.35 })
    );
    box.position.set(0, 1.26, 0.96);
    box.castShadow = true;
    body.add(box);
    // Neon strip edges along sides + tiny race spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.22), secMat);
    spoiler.position.set(0, 1.66, 1.2);
    spoiler.rotation.x = -0.25;
    body.add(spoiler);
    for (const sx of [-0.32, 0.32]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 1.45),
        new THREE.MeshBasicMaterial({ color: 0x1ef0ff })
      );
      strip.position.set(sx, 0.58, -0.06);
      body.add(strip);
    }
  } else if (id === 'tortillera') {
    // GIANT iconic insulated blue-and-white cooler (HIELERA GIGANTE!) + sturdy chrome front bullbar!
    const hieleraTex = createDeliveryBoxTexture('#0A84D6', 'CALIENTE', '#FFFFFF');
    const hielera = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.92, 0.98),
      new THREE.MeshStandardMaterial({ map: hieleraTex, roughness: 0.38 })
    );
    hielera.position.set(0, 1.4, 1.02);
    hielera.castShadow = true;
    body.add(hielera);
    // White heavy insulated lid & bright red thermal latches
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.16, 1.04),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
    );
    lid.position.set(0, 1.9, 1.02);
    body.add(lid);
    // Twin side mini thermal turbo tanks!
    for (const sx of [-0.46, 0.46]) {
      const nos = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.56, 10),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.5 })
      );
      nos.rotation.x = Math.PI / 2;
      nos.position.set(sx, 0.78, 0.85);
      body.add(nos);
    }
    // Tough chrome front anti-crash bumper bar
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 8, 14, Math.PI), chromeMat);
    bumper.rotation.x = Math.PI / 2;
    bumper.rotation.z = Math.PI;
    bumper.position.set(0, 0.68, -0.96);
    body.add(bumper);
  } else if (id === 'cohete') {
    // Iconic AZTEC ROCKET: gleaming golden wing fairings, jade accents, streamlined pod & oversized twin rocket nozzles!
    const podTex = createDeliveryBoxTexture('#C88A0A', 'AZTECA', '#0EA5A0');
    const pod = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.66, 0.86),
      new THREE.MeshStandardMaterial({ map: podTex, roughness: 0.25, metalness: 0.55 })
    );
    pod.position.set(0, 1.32, 0.98);
    pod.castShadow = true;
    body.add(pod);

    // Swept feathered Quetzalcoatl golden-jade aero wings on both sides!
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.58), paintMat);
      wing.position.set(side * 0.58, 1.12, 0.52);
      wing.rotation.z = side * 0.26;
      wing.rotation.y = side * -0.32;
      body.add(wing);

      const jadeTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.2), secMat);
      jadeTip.position.set(side * 0.78, 1.2, 0.68);
      jadeTip.rotation.z = side * 0.26;
      body.add(jadeTip);
    }

    // Gleaming sunlit Aztec crown fin above the pod
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 4), secMat);
    crest.rotation.x = -0.35;
    crest.position.set(0, 1.82, 0.92);
    body.add(crest);

    // Subtle constant idle electric blue flame glow inside tailpipes
    for (const sx of [-0.28, 0.28]) {
      const core = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.52, 8),
        new THREE.MeshBasicMaterial({ color: 0x38e8ff, transparent: true, opacity: 0.85 })
      );
      core.rotation.x = Math.PI / 2;
      core.position.set(sx, 0.52, 1.62);
      body.add(core);
    }
  }

  // ===== STYLISH EXPRESSIVE MEXICAN DELIVERY RIDER =====
  const riderGroup = new THREE.Group();
  body.add(riderGroup);

  const jacketMat = new THREE.MeshStandardMaterial({ color: palette.jacket, roughness: 0.65 });
  const jeansMat = new THREE.MeshStandardMaterial({ color: 0x243b6b, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b6a, roughness: 0.7 });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: palette.helmet,
    roughness: 0.22,
    metalness: id === 'cohete' ? 0.55 : 0.15,
  });

  // Torso leaning enthusiastically forward into the wind!
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.34), jacketMat);
  torso.position.set(0, 1.38, 0.14);
  torso.rotation.x = -0.26;
  torso.castShadow = true;
  riderGroup.add(torso);

  // Bold sunny stripe across rider's back
  const backStripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.36), secMat);
  backStripe.position.set(0, 1.44, 0.14);
  backStripe.rotation.x = -0.26;
  riderGroup.add(backStripe);

  // Legs hugging bike tank
  for (const sx of [-0.24, 0.24]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.22), jeansMat);
    leg.position.set(sx, 0.82, 0.06);
    leg.rotation.x = 0.25;
    riderGroup.add(leg);
  }

  // Arms gripping handlebars
  for (const sx of [-0.3, 0.3]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.62, 8), jacketMat);
    arm.position.set(sx * 1.05, 1.4, -0.24);
    arm.rotation.x = Math.PI / 2 - 0.15;
    arm.rotation.z = sx > 0 ? 0.14 : -0.14;
    riderGroup.add(arm);
  }

  // Cheerful chunky round arcade helmet + sleek dark visor
  const head = new THREE.Group();
  head.position.set(0, 1.88, -0.02);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12), helmetMat);
  helmet.castShadow = true;
  head.add(helmet);

  // Racing stripe down top of helmet
  const hStripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.54), secMat);
  hStripe.position.y = 0.14;
  head.add(hStripe);

  // Cool dark sport visor
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.18, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x131b2e, roughness: 0.1, metalness: 0.8 })
  );
  visor.position.set(0, -0.01, -0.2);
  head.add(visor);

  // Little neck/chin detail
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 8), skinMat);
  neck.position.set(0, -0.24, 0);
  head.add(neck);
  riderGroup.add(head);

  // Vibrant colorful fluttering Mexican bandana/scarf flying behind helmet!
  const scarfGeo = new THREE.BoxGeometry(0.18, 0.06, 0.68);
  scarfGeo.translate(0, 0, 0.34); // pivot smoothly at neck!
  const scarfMesh = new THREE.Mesh(
    scarfGeo,
    new THREE.MeshStandardMaterial({ color: palette.scarf, roughness: 0.6 })
  );
  scarfMesh.position.set(0, 1.66, 0.22);
  riderGroup.add(scarfMesh);

  // ===== DRAMATIC ROARING EXHAUST TURBO FLAMES (ORANGE or VOLCANIC BLUE!) =====
  const flameGroup = new THREE.Group();
  flameGroup.position.set(0, 0.52, 1.32);
  flameGroup.visible = false;
  for (const sx of [-0.28, 0.28]) {
    const outerGeo = new THREE.ConeGeometry(palette.blue ? 0.26 : 0.2, palette.blue ? 1.85 : 1.4, 10);
    outerGeo.rotateX(Math.PI / 2);
    outerGeo.translate(0, 0, palette.blue ? 0.92 : 0.7);
    const outer = new THREE.Mesh(
      outerGeo,
      new THREE.MeshBasicMaterial({
        color: palette.flameOuter,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    outer.position.x = sx;
    flameGroup.add(outer);

    const innerGeo = new THREE.ConeGeometry(palette.blue ? 0.13 : 0.1, palette.blue ? 1.25 : 0.9, 8);
    innerGeo.rotateX(Math.PI / 2);
    innerGeo.translate(0, 0, palette.blue ? 0.6 : 0.45);
    const inner = new THREE.Mesh(
      innerGeo,
      new THREE.MeshBasicMaterial({
        color: palette.flameInner,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    inner.position.x = sx;
    flameGroup.add(inner);
  }
  body.add(flameGroup);

  // ===== OPTIONAL NEON STREET UNDERGLOW (Italika Tunneada & Cohete Azteca) =====
  let neonMesh: THREE.Mesh | null = null;
  if (palette.neon) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const hex = '#' + palette.neon.toString(16).padStart(6, '0');
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, hex);
    grad.addColorStop(0.5, hex + '88');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const nTex = new THREE.CanvasTexture(canvas);
    neonMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 3.8),
      new THREE.MeshBasicMaterial({
        map: nTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.85,
      })
    );
    neonMesh.rotation.x = -Math.PI / 2;
    neonMesh.position.y = 0.08;
    root.add(neonMesh);
  }

  // ===== OPTIONAL CRASH-RESISTANT SHIELD AURA (La Tortillera Turbo!) =====
  let shieldMesh: THREE.Mesh | null = null;
  if (id === 'tortillera') {
    // Sleek crisp glowing aqua holographic bumper ring cradling bike cleanly without frosting colors!
    shieldMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.58, 0.08, 10, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38e8ff,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    shieldMesh.rotation.x = Math.PI / 2;
    shieldMesh.scale.set(0.82, 1.16, 1);
    shieldMesh.position.set(0, 0.45, 0.05);
    leanGroup.add(shieldMesh);
  }

  return {
    root,
    leanGroup,
    wheeliePivot,
    crashGroup,
    riderGroup,
    scarfMesh,
    frontWheel,
    rearWheel,
    flameGroup,
    neonMesh,
    shieldMesh,
    shadowMesh,
    isBlueFlame: palette.blue,
  };
}

/**
 * Giant iconic floating Crazy Taxi 3D arrow above the player's bike!
 * Smoothly shifts color between neon pickup GREEN and brilliant delivery GOLD.
 */
export function buildGuideArrow(): {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  outlineMat: THREE.MeshBasicMaterial;
} {
  const group = new THREE.Group();

  // Iconic wide beveled SEGA Crazy Taxi 3D arrow pointing cleanly toward -Z!
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.55);      // dramatic unmistakable arrowhead tip
  shape.lineTo(1.06, 0.2);
  shape.lineTo(0.45, 0.2);
  shape.lineTo(0.45, -1.05);
  shape.lineTo(-0.45, -1.05);
  shape.lineTo(-0.45, 0.2);
  shape.lineTo(-1.06, 0.2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  });
  geo.center();
  // Lay flat toward -Z with a slight 18deg upward presentation pitch so face shines clearly to chase camera!
  geo.rotateX(-Math.PI / 2 + 0.24);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x22ff78,
    emissive: 0x14e060,
    emissiveIntensity: 0.62,
    roughness: 0.18,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, bodyMat);
  group.add(mesh);

  // Bright gleaming crisp white core chevron strip on top face
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x120a1c,
    side: THREE.BackSide,
  });
  const rim = new THREE.Mesh(geo, outlineMat);
  rim.scale.set(1.09, 1.2, 1.09);
  group.add(rim);

  return { group, bodyMat, outlineMat };
}
