import * as THREE from 'three';
import {
  CityLayout,
  CombiRoute,
  GLORIETA_ISLAND_R,
  GLORIETA_OUTER_R,
  ParkedCarSpec,
  PickupSpot,
  ROAD_COORDS,
  ROAD_WIDTH,
} from './cityLayout';
import { DishId } from '../types';
import {
  createAsphaltTexture,
  createBeamGradientTexture,
  createFacadeTexture,
  createFoodStandSignTexture,
  createLonaTexture,
  createOxxoSignTexture,
  createOxxoWindowTexture,
  createPapelPicadoTexture,
  createPotholeTexture,
  createRampDeckTexture,
  createShadowBlobTexture,
  createSidewalkTexture,
  createSkyTexture,
  createTopeTexture,
} from './textures';

export interface ActiveCombi {
  route: CombiRoute;
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
  x: number;
  z: number;
  rotY: number;
  progress: number; // position along axis or angle around Glorieta
  nearMissCooldown: number;
  hitFlash: number;
}

export interface PickupVisual {
  spot: PickupSpot;
  beaconGroup: THREE.Group;
  ringMesh: THREE.Mesh;
  outerRing: THREE.Mesh;
  foodIcon: THREE.Group;
  active: boolean;
}

export interface DeliveryVisual {
  group: THREE.Group;
  innerRing: THREE.Mesh;
  outerRing: THREE.Mesh;
  beamOuter: THREE.Mesh;
  beamCore: THREE.Mesh;
  customer: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  floatRing: THREE.Mesh;
}

export interface BuiltCity {
  group: THREE.Group;
  combis: ActiveCombi[];
  pickupVisuals: PickupVisual[];
  deliveryVisual: DeliveryVisual;
  clouds: THREE.Group[];
  fountainTop: THREE.Group;
  papelGroups: THREE.Group[];
  palmCrowns: THREE.Group[];
  disposables: Array<{ dispose: () => void }>;
}

/** Build cute stylized floating 3D miniature representing each Mexican food order */
function buildFoodSculpture(dishId: DishId): THREE.Group {
  const g = new THREE.Group();
  if (dishId === 'tacos') {
    // Bold golden curved crispy taco filled with bright pastor orange meat, salsa verde & onion!
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.34, 14, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xfacc42, roughness: 0.55 })
    );
    shell.rotation.z = Math.PI / 2;
    shell.rotation.y = Math.PI / 2;
    shell.scale.set(1, 1.1, 1.3);
    g.add(shell);

    // Rich pastor seasoned filling + bright cilantro & pineapple cube!
    const meat = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.38, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xd94814, roughness: 0.6 })
    );
    meat.position.y = 0.28;
    g.add(meat);

    const cilantro = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.18, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
    );
    cilantro.position.y = 0.5;
    g.add(cilantro);
  } else if (dishId === 'tortillas') {
    // Cozy bright warm golden stack of fresh steaming tortillas wrapped with cheerful pink ribbon!
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(
        new THREE.CylinderGeometry(0.82, 0.82, 0.12, 18),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xfbe285 : 0xf2c95a,
          roughness: 0.65,
        })
      );
      t.position.y = i * 0.14 - 0.15;
      t.position.x = Math.sin(i * 1.4) * 0.05;
      g.add(t);
    }
    // Red woven servilleta band tying the stack
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.86, 0.2, 18),
      new THREE.MeshStandardMaterial({ color: 0xe62e7a, roughness: 0.5 })
    );
    band.position.y = 0.08;
    g.add(band);
  } else if (dishId === 'esquites') {
    // Classic bright Mexican styrofoam cup brimming with golden elote kernels, crema, chile rojo & lime wedge!
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.44, 0.96, 14),
      new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.5 })
    );
    g.add(cup);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.54, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
    );
    band.position.y = 0.12;
    g.add(band);
    const corn = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 })
    );
    corn.position.y = 0.46;
    corn.scale.y = 0.7;
    g.add(corn);
    // Cute green lime wedge on side!
    const lime = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.24, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 })
    );
    lime.position.set(0.45, 0.66, 0);
    lime.rotation.z = -0.4;
    g.add(lime);
  } else {
    // Festive banana-leaf tied Tamal Oaxaqueño!
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.52, 0.68),
      new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55 })
    );
    body.rotation.z = 0.18;
    g.add(body);
    // Tied green leaf twist ends
    for (const sx of [-0.72, 0.72]) {
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.38, 6),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 })
      );
      tip.position.set(sx, sx * 0.18, 0);
      tip.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(tip);
    }
    // Classic red yarn tie around the center
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.58, 0.74),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    );
    g.add(tie);
  }
  g.scale.setScalar(1.25);
  return g;
}

/** Authentic charming low-poly green & white Mexican Combi (Pesero)! */
function buildCombiMesh(stripeColor: number, shadowTex: THREE.CanvasTexture): {
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
} {
  const g = new THREE.Group();

  // Contact shadow on asphalt
  const shad = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 6.1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 })
  );
  shad.rotation.x = -Math.PI / 2;
  shad.position.y = 0.05;
  g.add(shad);

  // Classic lower emerald-green skirt (iconic CDMX / Estado de México combi!)
  const greenMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.4, metalness: 0.12 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f0, roughness: 0.38, metalness: 0.08 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x26445e, roughness: 0.15, metalness: 0.5 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.3, metalness: 0.6 });

  // Lower body (classic crisp green)
  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.05, 5.1), greenMat);
  lower.position.y = 0.92;
  lower.castShadow = true;
  lower.receiveShadow = true;
  g.add(lower);

  // Upper crisp bright white cabin roof
  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.08, 4.92), whiteMat);
  upper.position.y = 1.96;
  upper.castShadow = true;
  g.add(upper);

  // Classic bright crisp horizontal cream accent pinstripe + sunny route stripe!
  const midStripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.14, 5.14),
    new THREE.MeshStandardMaterial({ color: 0xffd12e, roughness: 0.35 })
  );
  midStripe.position.y = 1.42;
  g.add(midStripe);

  // Front deep tinted windshield (faces -Z)
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.08), windowMat);
  frontGlass.position.set(0, 1.98, -2.47);
  g.add(frontGlass);

  // Little colorful route number sign ("CENTRO") right above windshield
  const routeBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.22, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffc61a })
  );
  routeBar.position.set(0, 2.42, -2.46);
  g.add(routeBar);

  // Classic side passenger windows along both flanks
  for (const sx of [-1.1, 1.1]) {
    for (const wz of [-1.3, 0, 1.3]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.02), windowMat);
      win.position.set(sx, 1.98, wz);
      g.add(win);
    }
  }

  // Rear window + iconic VW-style white nose V emblem + shiny bumpers
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.56, 0.08), windowMat);
  rearGlass.position.set(0, 2.0, 2.47);
  g.add(rearGlass);

  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), whiteMat);
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, 1.05, -2.56);
  g.add(emblem);

  // Chrome bumpers front & back
  const fBump = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.22, 0.26), bumperMat);
  fBump.position.set(0, 0.48, -2.6);
  g.add(fBump);
  const rBump = fBump.clone();
  rBump.position.z = 2.6;
  g.add(rBump);

  // Warm round front headlights + bright red taillights
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff4bd });
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xff2c3b });
  for (const sx of [-0.74, 0.74]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), hlMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(sx, 0.88, -2.56);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.08), tlMat);
    tl.position.set(sx, 0.92, 2.56);
    g.add(tl);
  }

  // Charming silver roof luggage rack framing the white top!
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, 3.2), bumperMat);
  rack.position.set(0, 2.56, 0.3);
  g.add(rack);

  // Four rotating low-poly wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f222a, roughness: 0.85 });
  const wheels: THREE.Mesh[] = [];
  for (const [wx, wz] of [
    [-1.08, -1.55],
    [1.08, -1.55],
    [-1.08, 1.55],
    [1.08, 1.55],
  ]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }

  return { mesh: g, wheels };
}

/** Cute parked colorful low-poly Mexican city cars (Vocho, Sedan, Pickup) */
function buildParkedCar(spec: ParkedCarSpec, shadowTex: THREE.CanvasTexture): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.36, metalness: 0.18 });
  const roofMat = new THREE.MeshStandardMaterial({
    color: spec.color === 0xf43f8e ? 0xffffff : spec.color,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x26435c, roughness: 0.18, metalness: 0.45 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x202229, roughness: 0.85 });

  // Ground shadow
  const shad = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 4.9),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 })
  );
  shad.rotation.x = -Math.PI / 2;
  shad.position.y = 0.04;
  g.add(shad);

  if (spec.style === 'vocho') {
    // Beloved iconic rounded Mexican Vocho!
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.72, 3.85), bodyMat);
    hull.position.y = 0.68;
    hull.castShadow = true;
    g.add(hull);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), roofMat);
    dome.scale.set(0.96, 0.78, 1.25);
    dome.position.set(0, 1.15, 0.08);
    dome.castShadow = true;
    g.add(dome);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.42, 1.7), glassMat);
    glass.position.set(0, 1.32, 0.06);
    g.add(glass);
  } else if (spec.style === 'pickup') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.82, 4.55), bodyMat);
    base.position.y = 0.76;
    base.castShadow = true;
    g.add(base);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.78, 1.9), bodyMat);
    cab.position.set(0, 1.48, -0.55);
    cab.castShadow = true;
    g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.52, 1.94), glassMat);
    glass.position.set(0, 1.5, -0.55);
    g.add(glass);
    // Open truck bed interior + little colorful cargo crate!
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.14, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x3a322d, roughness: 0.9 })
    );
    bed.position.set(0, 1.14, 1.25);
    g.add(bed);
  } else {
    // Classic bright Mexican sedan / Tsuru
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.72, 4.28), bodyMat);
    base.position.y = 0.68;
    base.castShadow = true;
    g.add(base);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.64, 2.25), roofMat);
    cabin.position.set(0, 1.32, 0.12);
    cabin.castShadow = true;
    g.add(cabin);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.44, 2.02), glassMat);
    win.position.set(0, 1.33, 0.12);
    g.add(win);
  }

  // Headlights + rear lights + 4 grounded wheels
  const wGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  wGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [
    [-0.95, -1.25],
    [0.95, -1.25],
    [-0.95, 1.25],
    [0.95, 1.25],
  ]) {
    const wh = new THREE.Mesh(wGeo, tireMat);
    wh.position.set(wx, 0.36, wz);
    g.add(wh);
  }

  g.position.set(spec.x, 0, spec.z);
  g.rotation.y = spec.rotY;
  return g;
}

/** Graceful swaying tropical Mexican palm tree OR vibrant purple CDMX Jacaranda */
function buildTree(isJacaranda: boolean, scale: number): { tree: THREE.Group; crown: THREE.Group } {
  const tree = new THREE.Group();
  const crown = new THREE.Group();

  if (isJacaranda) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e513b, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 4.2, 7), trunkMat);
    trunk.position.y = 2.1;
    trunk.castShadow = true;
    tree.add(trunk);

    // Rich blooming CDMX spring jacaranda violet canopy!
    crown.position.y = 5.2;
    const bloomCols = [0x9f66eb, 0xb784f7, 0x864cd6];
    const puffs: Array<[number, number, number, number]> = [
      [0, 0.5, 0, 2.2],
      [-1.4, -0.2, 0.7, 1.55],
      [1.3, -0.1, -0.6, 1.65],
      [0.4, 0.1, 1.3, 1.45],
      [-0.7, 0.2, -1.2, 1.5],
    ];
    puffs.forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 0),
        new THREE.MeshStandardMaterial({ color: bloomCols[i % bloomCols.length], roughness: 0.85, flatShading: true })
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      crown.add(m);
    });
    tree.add(crown);
  } else {
    // Slightly curved cheerful coastal/CDMX palmera!
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x9b734e, roughness: 0.88, flatShading: true });
    let curX = 0;
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 - i * 0.02, 0.32 - i * 0.02, 1.55, 7),
        trunkMat
      );
      curX += i * 0.08;
      seg.position.set(curX, 0.78 + i * 1.4, 0);
      seg.rotation.z = -i * 0.045;
      seg.castShadow = true;
      tree.add(seg);
    }

    // Lush arching radiant emerald palm fronds + coconuts!
    crown.position.set(curX + 0.15, 7.2, 0);
    const frondColors = [0x22a853, 0x2ec45e, 0x1b8f48];
    const numFronds = 7;
    for (let i = 0; i < numFronds; i++) {
      const a = (i / numFronds) * Math.PI * 2;
      const fg = new THREE.Group();
      fg.rotation.y = a;

      const frondMat = new THREE.MeshStandardMaterial({
        color: frondColors[i % frondColors.length],
        roughness: 0.72,
        flatShading: true,
      });
      const leaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 2.3), frondMat);
      leaf1.position.set(0, 0.22, 1.05);
      leaf1.rotation.x = 0.2;
      const leaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 1.7), frondMat);
      leaf2.position.set(0, -0.35, 2.65);
      leaf2.rotation.x = 0.62;
      fg.add(leaf1, leaf2);
      crown.add(fg);
    }
    // Little coconuts underneath crown!
    const cocoMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
    for (let i = 0; i < 3; i++) {
      const ca = (i / 3) * Math.PI * 2;
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), cocoMat);
      coco.position.set(Math.cos(ca) * 0.35, -0.25, Math.sin(ca) * 0.35);
      crown.add(coco);
    }
    tree.add(crown);
  }

  tree.scale.setScalar(scale);
  return { tree, crown };
}

/** Build authentic low-poly tianguis tent stall with colorful pink or blue tarp & piled fresh goods */
function buildTianguisStall(
  width: number,
  length: number,
  lonaTex: THREE.CanvasTexture,
  withPinata = true
): THREE.Group {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });
  const hw = width * 0.46;
  const hl = length * 0.46;
  const h = 2.45;

  // Four metal corner pipes
  for (const [px, pz] of [
    [-hw, -hl],
    [hw, -hl],
    [-hw, hl],
    [hw, hl],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), poleMat);
    pole.position.set(px, h / 2, pz);
    g.add(pole);
  }

  // Slightly pitched vivid bright plastic tarp roof (lona rosa mexicano / azul!)
  const roofMat = new THREE.MeshStandardMaterial({
    map: lonaTex,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.14, length + 0.3), roofMat);
  roof.position.y = h + 0.1;
  roof.rotation.z = 0.06;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  // Scalloped colorful skirt edges around lona
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(width + 0.34, 0.28, length + 0.34), roofMat);
  skirt.position.y = h - 0.06;
  g.add(skirt);

  // Stacked charming wooden table & bright piles of tropical Mexican market fruit!
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xc28a52, roughness: 0.85 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.85, length * 0.74), tableMat);
  table.position.y = 0.44;
  table.castShadow = true;
  g.add(table);

  const produceCols = [0xff6b1a, 0x22c55e, 0xfacc15, 0xef4444, 0xf43f8e, 0xa855f7];
  for (let i = 0; i < 6; i++) {
    const cx = ((i % 3) - 1) * (width * 0.24);
    const cz = (i < 3 ? -1 : 1) * (length * 0.17);
    const pile = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.36, 0),
      new THREE.MeshStandardMaterial({ color: produceCols[i], roughness: 0.65, flatShading: true })
    );
    pile.position.set(cx, 1.05, cz);
    pile.scale.set(1.2, 0.7, 1.1);
    g.add(pile);
  }

  // Cute hanging colorful Mexican star piñata under the awning!
  if (withPinata) {
    const pinata = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({ color: 0xffc814, roughness: 0.5 })
    );
    pinata.position.set(hw * 0.5, h - 0.55, 0);
    g.add(pinata);
  }

  return g;
}

/** Build a precision right-angle wedged construction jump ramp matching sampleRamp() 1:1 */
function buildRampMesh(
  width: number,
  length: number,
  height: number,
  deckTex: THREE.CanvasTexture,
  sideTex: THREE.CanvasTexture
): THREE.Group {
  const g = new THREE.Group();
  const hl = length * 0.5;
  const hw = width * 0.5;

  // Wedge faces rising from z = +hl (y=0) to z = -hl (y=height) (so local -Z is up-ramp direction!)
  const shape = new THREE.Shape();
  shape.moveTo(-hl, 0);
  shape.lineTo(hl, 0);
  shape.lineTo(hl, height);
  shape.closePath();

  // Extrude width along X using rotated side shape
  const sideGeo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  // Map local: shape X (-hl..+hl) -> ramp Z (+hl..-hl), shape Y -> world Y, depth (0..width) -> X (-hw..+hw)
  sideGeo.rotateY(Math.PI / 2);
  sideGeo.translate(-hw, 0, 0);
  const bodyMesh = new THREE.Mesh(
    sideGeo,
    new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.65 })
  );
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  g.add(bodyMesh);

  // Bright bold sunlit inclined arrow-chevron launch deck directly flush atop slope!
  const slopeLen = Math.hypot(length, height);
  const angle = Math.atan2(height, length);
  const deckGeo = new THREE.PlaneGeometry(width, slopeLen);
  deckGeo.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(
    deckGeo,
    new THREE.MeshStandardMaterial({
      map: deckTex,
      roughness: 0.5,
      emissive: 0xff9d00,
      emissiveIntensity: 0.14,
    })
  );
  deck.position.set(0, height * 0.5 + 0.04, 0);
  deck.rotation.x = angle; // low end at +Z, high lip at -Z!
  deck.receiveShadow = true;
  g.add(deck);

  // Cute bright glowing amber beacon lights perched on high ramp top edges
  for (const sx of [-hw + 0.2, hw - 0.2]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc81a })
    );
    lamp.position.set(sx, height + 0.24, -hl + 0.25);
    g.add(lamp);
  }

  return g;
}

/** Build iconic sunlit central Glorieta monument (Ángel / Fuente Mexicana!) */
function buildGlorieta(fountainTop: THREE.Group): THREE.Group {
  const g = new THREE.Group();

  // Outer sunny roundabout decorative white lane lines
  const roadRing = new THREE.Mesh(
    new THREE.RingGeometry(GLORIETA_OUTER_R - 0.45, GLORIETA_OUTER_R + 0.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xf7e37c, side: THREE.DoubleSide })
  );
  roadRing.rotation.x = -Math.PI / 2;
  roadRing.position.y = 0.05;
  g.add(roadRing);

  // Dashed middle circle guiding combi traffic
  const dashCount = 28;
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dashGeo = new THREE.PlaneGeometry(0.32, 2.2);
  dashGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < dashCount; i++) {
    const a = (i / dashCount) * Math.PI * 2;
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.position.set(Math.cos(a) * 19.2, 0.05, Math.sin(a) * 19.2);
    d.rotation.y = -a;
    g.add(d);
  }

  // Painted vibrant golden concrete protective curb ring
  const curb = new THREE.Mesh(
    new THREE.CylinderGeometry(GLORIETA_ISLAND_R, GLORIETA_ISLAND_R + 0.35, 0.56, 36),
    new THREE.MeshStandardMaterial({ color: 0xf0c23a, roughness: 0.72 })
  );
  curb.position.y = 0.28;
  curb.receiveShadow = true;
  g.add(curb);

  // Lush verdant grassy park center with blooming marigold cempasúchil border!
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(GLORIETA_ISLAND_R - 0.6, GLORIETA_ISLAND_R - 0.6, 0.62, 36),
    new THREE.MeshStandardMaterial({ color: 0x38b85c, roughness: 0.88 })
  );
  grass.position.y = 0.32;
  grass.receiveShadow = true;
  g.add(grass);

  // Bright blooming Mexican marigold & bugambilia flower beds around island
  const flowerCols = [0xff9e1b, 0xe62e7a, 0xffd12e, 0xff5a2a];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const fl = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.72, 0),
      new THREE.MeshStandardMaterial({ color: flowerCols[i % flowerCols.length], roughness: 0.72, flatShading: true })
    );
    fl.position.set(Math.cos(a) * 9.3, 0.78, Math.sin(a) * 9.3);
    fl.scale.set(1.2, 0.65, 1.2);
    g.add(fl);
  }

  // Stepped white colonial plaza pedestal & sparkling turquoise fountain basin!
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf4e8d4, roughness: 0.65 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.6, 1.0, 24), stoneMat);
  rim.position.y = 0.85;
  rim.castShadow = true;
  rim.receiveShadow = true;
  g.add(rim);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.6, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0x22c8e8, roughness: 0.14, metalness: 0.25 })
  );
  water.position.y = 1.32;
  g.add(water);

  // Monument pedestal + majestic fluted ivory Ángel de la Independencia column!
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.9, 3.2, 8), stoneMat);
  base.position.y = 2.6;
  base.castShadow = true;
  g.add(base);

  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.28, 12.5, 14), stoneMat);
  col.position.y = 10.2;
  col.castShadow = true;
  g.add(col);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.1, 1.2, 12), stoneMat);
  cap.position.y = 16.8;
  g.add(cap);

  // Gleaming rotating gilded Winged Ángel / Aztec Golden Sun emblem at apex!
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd236,
    emissive: 0xd98a00,
    emissiveIntensity: 0.22,
    roughness: 0.18,
    metalness: 0.82,
  });
  fountainTop.position.set(0, 18.6, 0);
  const sunCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), goldMat);
  sunCore.scale.set(0.9, 1.5, 0.9);
  fountainTop.add(sunCore);

  // Iconic open golden wings echoing CDMX's iconic Ángel!
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.28), goldMat);
    wing.position.set(s * 1.55, 0.55, 0);
    wing.rotation.z = s * 0.42;
    fountainTop.add(wing);
  }
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 8, 20), goldMat);
  fountainTop.add(crown);
  g.add(fountainTop);

  // Shimmering white fountain droplets ring around column
  const sprayMat = new THREE.MeshBasicMaterial({ color: 0xe6fbff, transparent: true, opacity: 0.72 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.1, 6, 12, Math.PI), sprayMat);
    arc.position.set(Math.cos(a) * 3.8, 1.32, Math.sin(a) * 3.8);
    arc.rotation.y = -a;
    g.add(arc);
  }

  return g;
}

/** Build the unmistakable vibrant flagship corner OXXO convenience store! */
function buildOxxoStore(w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();

  // Warm cream masonry store body
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf7efe3, roughness: 0.72 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Iconic full-wrap blazing red-white-yellow OXXO roof marquee fascia!
  const signTex = createOxxoSignTexture();
  const signMat = new THREE.MeshBasicMaterial({
    map: signTex,
  });
  const fasciaH = 2.65;
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, fasciaH, d + 0.9), signMat);
  fascia.position.y = h - fasciaH * 0.44;
  fascia.castShadow = true;
  g.add(fascia);

  // Clean sunlit overhang lip matching exact red/gold colors
  const roofTrim = new THREE.Mesh(
    new THREE.BoxGeometry(w + 1.15, 0.35, d + 1.15),
    new THREE.MeshStandardMaterial({ color: 0xd91926, roughness: 0.4 })
  );
  roofTrim.position.y = h + 0.2;
  g.add(roofTrim);

  // Huge bold sky-visible double-sided corner totem sign waving high above the OXXO roof!
  const totemPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 6.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xd91926, roughness: 0.4 })
  );
  totemPole.position.set(-w * 0.42, h + 3.0, d * 0.42);
  g.add(totemPole);

  const totemBox = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.5, 0.9), signMat);
  totemBox.position.set(-w * 0.42, h + 5.6, d * 0.42);
  totemBox.rotation.y = -Math.PI / 4; // faces straight across the central Glorieta!
  g.add(totemBox);

  // Cheerfully lit stocked snack/soda glass storefront on both south (+Z) & west (-X) sides!
  const winTex = createOxxoWindowTexture();
  const winMat = new THREE.MeshBasicMaterial({ map: winTex });
  const frontWin = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.72, 3.3), winMat);
  frontWin.position.set(0, 2.1, d / 2 + 0.06);
  g.add(frontWin);

  const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.72, 3.3), winMat);
  sideWin.rotation.y = -Math.PI / 2;
  sideWin.position.set(-w / 2 - 0.06, 2.1, 0);
  g.add(sideWin);

  // Classic iconic bright red parking safety bollards fronting the store
  const bollMat = new THREE.MeshStandardMaterial({ color: 0xd91926, roughness: 0.4 });
  for (let i = -3; i <= 3; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0, 8), bollMat);
    p.position.set(i * 2.5, 0.5, d / 2 + 1.15);
    g.add(p);
  }

  return g;
}

/** Build a cheerful low-poly roadside traffic safety cone */
function buildCone(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.1, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xff621a, roughness: 0.5 })
  );
  base.position.y = 0.05;
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.82, 8),
    new THREE.MeshStandardMaterial({ color: 0xff621a, roughness: 0.48 })
  );
  body.position.y = 0.46;
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.18, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  stripe.position.y = 0.54;
  g.add(base, body, stripe);
  return g;
}

/** Build our colossal sunlit rayo dorado + joyful jumping waving customer! */
function buildDeliveryBeacon(): DeliveryVisual {
  const group = new THREE.Group();
  group.visible = false;

  // Inner vivid bright golden target disc ring
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 5.4, 42),
    new THREE.MeshBasicMaterial({
      color: 0xffe042,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.14;
  group.add(innerRing);

  // Warm filled shimmering disc glow inside zone
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(4.4, 36),
    new THREE.MeshBasicMaterial({
      color: 0xffc814,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.11;
  group.add(disc);

  // Expanding dramatic ripple ring
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(5.5, 6.2, 42),
    new THREE.MeshBasicMaterial({
      color: 0xfff5a8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.16;
  group.add(outerRing);

  // Sky-piercing golden vertical pillar ("RAYO DORADO" visible from clear across the city!)
  const beamTex = createBeamGradientTexture(255, 206, 48);
  const beamOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 5.0, 74, 24, 1, true),
    new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0.76,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  beamOuter.position.y = 37;
  group.add(beamOuter);

  const coreTex = createBeamGradientTexture(255, 246, 170);
  const beamCore = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 2.3, 86, 18, 1, true),
    new THREE.MeshBasicMaterial({
      map: coreTex,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  beamCore.position.y = 43;
  group.add(beamCore);

  // Rising golden halo ring gliding upward along the beam
  const floatRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.5, 0.24, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfff080,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  floatRing.rotation.x = Math.PI / 2;
  floatRing.position.y = 3;
  group.add(floatRing);

  // Eager smiling low-poly Mexican customer waving both hands happily near edge of landing ring!
  const customer = new THREE.Group();
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.92, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xe62e7a, roughness: 0.6 })
  );
  shirt.position.y = 1.2;
  const pants = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.75, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 })
  );
  pants.position.y = 0.42;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xd99b6a, roughness: 0.7 })
  );
  head.position.y = 1.98;
  // Festive mini golden sombrero crowning the customer!
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.76, 0.1, 14),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 })
  );
  brim.position.y = 2.24;
  const hatTop = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.42, 10),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
  );
  hatTop.position.y = 2.48;

  const armMat = new THREE.MeshStandardMaterial({ color: 0xd99b6a, roughness: 0.7 });
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), armMat);
  leftArm.position.set(-0.5, 1.72, 0);
  leftArm.rotation.z = 0.55;
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), armMat);
  rightArm.position.set(0.5, 1.72, 0);
  rightArm.rotation.z = -0.55;

  customer.add(pants, shirt, head, brim, hatTop, leftArm, rightArm);
  customer.scale.setScalar(1.22);
  group.add(customer);

  return { group, innerRing, outerRing, beamOuter, beamCore, customer, leftArm, rightArm, floatRing };
}

/** Build vibrant entire Mexican sunlit city world */
export function buildCity(layout: CityLayout): BuiltCity {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const clouds: THREE.Group[] = [];
  const papelGroups: THREE.Group[] = [];
  const palmCrowns: THREE.Group[] = [];
  const fountainTop = new THREE.Group();

  // 1. Vibrant Sunny Mexican Sky Dome + Radiant Sun Disc + Rolling Scenic Mountains
  const skyTex = createSkyTexture();
  disposables.push(skyTex);
  const skyGeo = new THREE.SphereGeometry(520, 28, 18);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  group.add(sky);

  // Glowing golden warm Mexican sun halo in sky
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(28, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff5c0, fog: false })
  );
  sunDisc.position.set(170, 200, -290);
  sunDisc.lookAt(0, 0, 0);
  group.add(sunDisc);

  // Soft sunlit fluffy low-poly white clouds cruising overhead
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfffaf2, fog: false, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 16; i++) {
    const cg = new THREE.Group();
    const ang = (i / 16) * Math.PI * 2;
    const dist = 140 + (i % 4) * 58;
    cg.position.set(Math.cos(ang) * dist, 88 + (i % 3) * 22, Math.sin(ang) * dist);
    const puffs = 3 + (i % 3);
    for (let k = 0; k < puffs; k++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(9 + (k === 1 ? 5 : 0), 0), cloudMat);
      m.position.set((k - 1) * 11, k === 1 ? 3 : 0, (k % 2) * 4);
      m.scale.set(1.4, 0.72, 1.0);
      cg.add(m);
    }
    cg.rotation.y = ang;
    group.add(cg);
    clouds.push(cg);
  }

  // Far cozy warm golden outer earth plane & lush layered Mexican valley volcanoes (Popocatépetl touch!)
  const outerGround = new THREE.Mesh(
    new THREE.CircleGeometry(500, 48),
    new THREE.MeshStandardMaterial({ color: 0xd9a870, roughness: 0.95 })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.18;
  group.add(outerGround);

  const mtnColors = [0x9f7cb0, 0x8a6fa8, 0xb88491, 0x7a8f9f];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const dist = 290 + (i % 3) * 35;
    const h = i === 18 ? 118 : 42 + ((i * 29) % 58); // Big dramatic Popocatépetl peak straight north!
    const r = i === 18 ? 96 : 52 + ((i * 19) % 38);
    const mtn = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 7),
      new THREE.MeshStandardMaterial({
        color: i === 18 ? 0x6f7399 : mtnColors[i % mtnColors.length],
        roughness: 0.95,
        flatShading: true,
      })
    );
    mtn.position.set(Math.cos(a) * dist, h * 0.44, Math.sin(a) * dist);
    mtn.rotation.y = i;
    group.add(mtn);

    // Classic iconic seamless crisp white snow cap atop our Mexican volcano (Popocatépetl!)
    if (i === 18 || i === 19) {
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.38, h * 0.35, 7),
        new THREE.MeshBasicMaterial({
          color: 0xfffaf2,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      cap.position.set(Math.cos(a) * dist, h * 0.775, Math.sin(a) * dist);
      cap.rotation.y = i;
      group.add(cap);
    }
  }

  // Bright colorful perimeter curb wall framing outer bounds cleanly so you feel enclosed in a real Mexican district
  const perimMat = new THREE.MeshStandardMaterial({ color: 0xe86b42, roughness: 0.75 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf7e8ce, roughness: 0.7 });
  const borderD = 168.5;
  const segments: Array<[number, number, number, number]> = [
    [0, -borderD, borderD * 2 + 4, 2.6],
    [0, borderD, borderD * 2 + 4, 2.6],
    [-borderD, 0, 2.6, borderD * 2 + 4],
    [borderD, 0, 2.6, borderD * 2 + 4],
  ];
  for (const [bx, bz, bw, bd] of segments) {
    const wMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, 3.0, bd), perimMat);
    wMesh.position.set(bx, 1.5, bz);
    wMesh.receiveShadow = true;
    group.add(wMesh);
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.45, bd + 0.5), capMat);
    topCap.position.set(bx, 3.1, bz);
    group.add(topCap);
  }
  // Low cozy colorful pastel background buildings ringing just behind perimeter walls for lush horizon!
  const bgColors = [0xf2b434, 0xe65b41, 0x3ba89a, 0xd94382, 0x3b86c7, 0xf2dfc2];
  for (let i = -4; i <= 4; i++) {
    const p = i * 38;
    const sides: Array<[number, number]> = [
      [p, -188],
      [p, 188],
      [-188, p],
      [188, p],
    ];
    sides.forEach(([sx, sz], si) => {
      const bh = 12 + ((Math.abs(i * 7 + si * 11) * 5) % 24);
      const bm = new THREE.Mesh(
        new THREE.BoxGeometry(26, bh, 24),
        new THREE.MeshStandardMaterial({
          color: bgColors[(Math.abs(i) + si * 2) % bgColors.length],
          roughness: 0.85,
        })
      );
      bm.position.set(sx, bh / 2, sz);
      group.add(bm);
    });
  }

  // 2. Crisp Sun-Warmed Asphalt Avenue Ground Plane
  const asphaltTex = createAsphaltTexture();
  disposables.push(asphaltTex);
  const roadFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(342, 342),
    new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.9, metalness: 0.04 })
  );
  roadFloor.rotation.x = -Math.PI / 2;
  roadFloor.receiveShadow = true;
  group.add(roadFloor);

  // Bold Mexican Double-Yellow Avenue Centerlines & Zebra Crosswalks!
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xf7c934 });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf7f5ef });
  const fullLen = 328;

  for (const rc of ROAD_COORDS) {
    // Double yellow stripes along X=rc and Z=rc (split cleanly outside Glorieta at rc===0!)
    if (rc === 0) {
      for (const side of [-1, 1]) {
        const segLen = 136;
        const center = side * (GLORIETA_OUTER_R + segLen / 2);
        for (const off of [-0.28, 0.28]) {
          const ns = new THREE.Mesh(new THREE.PlaneGeometry(0.24, segLen), yellowLineMat);
          ns.rotation.x = -Math.PI / 2;
          ns.position.set(off, 0.035, center);
          group.add(ns);

          const ew = new THREE.Mesh(new THREE.PlaneGeometry(segLen, 0.24), yellowLineMat);
          ew.rotation.x = -Math.PI / 2;
          ew.position.set(center, 0.035, off);
          group.add(ew);
        }
      }
    } else {
      for (const off of [-0.26, 0.26]) {
        const ns = new THREE.Mesh(new THREE.PlaneGeometry(0.22, fullLen), yellowLineMat);
        ns.rotation.x = -Math.PI / 2;
        ns.position.set(rc + off, 0.032, 0);
        group.add(ns);

        const ew = new THREE.Mesh(new THREE.PlaneGeometry(fullLen, 0.22), yellowLineMat);
        ew.rotation.x = -Math.PI / 2;
        ew.position.set(0, 0.032, rc + off);
        group.add(ew);
      }
    }
  }

  // Crisp Mexican street zebra crosswalks flanking central intersections!
  const zebraGeo = new THREE.PlaneGeometry(0.95, 3.2);
  zebraGeo.rotateX(-Math.PI / 2);
  for (const rx of [-76, 0, 76]) {
    for (const rz of [-76, 0, 76]) {
      if (rx === 0 && rz === 0) continue; // handled by grand Glorieta!
      for (let s = -4; s <= 4; s++) {
        const z1 = new THREE.Mesh(zebraGeo, whiteLineMat);
        z1.position.set(rx + s * 2.0, 0.04, rz + ROAD_WIDTH / 2 + 1.2);
        const z2 = new THREE.Mesh(zebraGeo, whiteLineMat);
        z2.position.set(rx + s * 2.0, 0.04, rz - ROAD_WIDTH / 2 - 1.2);
        group.add(z1, z2);
      }
    }
  }

  // 3. Central Iconic Glorieta Landmark!
  group.add(buildGlorieta(fountainTop));

  // 4. Sidewalks, Curbs, Flagship Corner OXXO & Vivid Painted Mexican Buildings
  const sidewalkTex = createSidewalkTexture();
  disposables.push(sidewalkTex);
  const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.85 });
  const curbYellowMat = new THREE.MeshStandardMaterial({ color: 0xe8b82e, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xd9c7b2, roughness: 0.9 });
  const tinacoMat = new THREE.MeshStandardMaterial({ color: 0x26262e, roughness: 0.55 });
  const facadeCache = new Map<string, THREE.MeshStandardMaterial>();

  const getFacadeMat = (wall: string, trim: string, floors: number, cols: number) => {
    const key = `${wall}_${floors}_${cols}`;
    let m = facadeCache.get(key);
    if (!m) {
      const tex = createFacadeTexture(wall, trim, floors, cols);
      disposables.push(tex);
      m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78 });
      facadeCache.set(key, m);
    }
    return m;
  };

  for (const blk of layout.blocks) {
    // Elevated golden-bordered warm terrazzo block sidewalk pad
    const curbPad = new THREE.Mesh(new THREE.BoxGeometry(blk.size, 0.24, blk.size), curbYellowMat);
    curbPad.position.set(blk.cx, 0.12, blk.cz);
    curbPad.receiveShadow = true;
    group.add(curbPad);

    const walk = new THREE.Mesh(new THREE.BoxGeometry(blk.size - 0.7, 0.28, blk.size - 0.7), sidewalkMat);
    walk.position.set(blk.cx, 0.14, blk.cz);
    walk.receiveShadow = true;
    group.add(walk);

    // Colorful little grassy pocket garden inside the Glorieta southwest plaza block!
    if (blk.isPlaza) {
      const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.34, 18),
        new THREE.MeshStandardMaterial({ color: 0x43be64, roughness: 0.9 })
      );
      lawn.position.set(blk.cx + 11.5, 0.19, blk.cz - 11.5);
      lawn.receiveShadow = true;
      group.add(lawn);
    }

    // Place every colorful building cleanly inside this block
    for (const b of blk.buildings) {
      if (b.isOxxo) {
        const oxxo = buildOxxoStore(b.w, b.d, b.h);
        oxxo.position.set(b.x, 0.24, b.z);
        group.add(oxxo);
        continue;
      }

      const fMat = getFacadeMat(b.wallColor, b.trimColor, b.floors, b.cols);
      const mats = [fMat, fMat, roofMat, roofMat, fMat, fMat];
      const box = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mats);
      box.position.set(b.x, b.h / 2 + 0.22, b.z);
      box.castShadow = true;
      box.receiveShadow = true;
      group.add(box);

      // Decorative crisp adobe parapet rim framing rooftop!
      if (b.roofStyle === 'parapet') {
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.45, 0.55, b.d + 0.45),
          new THREE.MeshStandardMaterial({ color: 0xfff3de, roughness: 0.72 })
        );
        rim.position.set(b.x, b.h + 0.4, b.z);
        group.add(rim);
      }

      // Iconic cheerful colorful ground-floor Mexican shop awnings!
      if (b.hasAwning && b.awningColor) {
        const awning = new THREE.Mesh(
          new THREE.BoxGeometry(b.w * 0.62, 0.22, 1.85),
          new THREE.MeshStandardMaterial({ color: b.awningColor, roughness: 0.6 })
        );
        awning.position.set(b.x, 3.6, b.z + b.d / 2 + 0.8);
        awning.rotation.x = 0.28;
        group.add(awning);
      }

      // Signature iconic Mexican black cylindrical rooftop tinaco (Rotoplas!)
      if (b.hasTinaco) {
        const tinaco = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.55, 10), tinacoMat);
        tinaco.position.set(b.x + b.w * 0.24, b.h + 1.0, b.z - b.d * 0.22);
        group.add(tinaco);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.95, 0.35, 10), tinacoMat);
        cap.position.set(b.x + b.w * 0.24, b.h + 1.9, b.z - b.d * 0.22);
        group.add(cap);
      }
    }
  }

  // Soft seamless asphalt roundabout circle visually overlapping inner corners around Glorieta!
  const glorAsphalt = new THREE.Mesh(
    new THREE.CircleGeometry(GLORIETA_OUTER_R + 0.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x3b3c46, roughness: 0.92 })
  );
  glorAsphalt.rotation.x = -Math.PI / 2;
  glorAsphalt.position.y = 0.02;
  glorAsphalt.receiveShadow = true;
  group.add(glorAsphalt);

  // 5. Swaying Palmeras & Spring Purple Jacaranda Trees
  for (const p of layout.palms) {
    const { tree, crown } = buildTree(Boolean(p.isJacaranda), p.scale);
    tree.position.set(p.x, 0.22, p.z);
    tree.rotation.y = (p.x * 0.13 + p.z * 0.07) % (Math.PI * 2);
    group.add(tree);
    palmCrowns.push(crown);
  }

  // 6. Construction Ramps + Vivid Pink & Blue Lona Tianguis Stalls!
  const pinkLona = createLonaTexture('#FF2F88', '#FF7BB6');
  const blueLona = createLonaTexture('#14A2EE', '#6AD0FF');
  const deckTex = createRampDeckTexture();
  const topeTex = createTopeTexture();
  const potholeTex = createPotholeTexture();
  const shadowTex = createShadowBlobTexture();
  disposables.push(pinkLona, blueLona, deckTex, topeTex, potholeTex, shadowTex);

  for (const r of layout.ramps) {
    const rampObj = buildRampMesh(r.width, r.length, r.height, deckTex, topeTex);
    rampObj.position.set(r.x, 0, r.z);
    // Local -Z is launch direction, match (dirX, dirZ)
    rampObj.rotation.y = Math.atan2(-r.dirX, -r.dirZ);
    group.add(rampObj);

    // Colorful vivid Mexican tianguis stall crouched right past the jump lip!
    const lona = r.lonaColor === 'pink' ? pinkLona : blueLona;
    const stall = buildTianguisStall(r.stallWidth, r.stallLength, lona, true);
    stall.position.set(r.stallX, 0, r.stallZ);
    stall.rotation.y = Math.atan2(-r.dirX, -r.dirZ);
    group.add(stall);
  }

  // Extra lively rows of sidewalk pink/blue tianguis lanes lighting up neighborhoods
  for (const m of layout.sideMarkets) {
    const mg = new THREE.Group();
    for (let i = 0; i < m.count; i++) {
      const altPink = (m.primary === 'pink') === (i % 2 === 0);
      const stall = buildTianguisStall(4.2, 4.4, altPink ? pinkLona : blueLona, i === 1);
      stall.position.set((i - (m.count - 1) / 2) * 4.7, 0.24, 0);
      mg.add(stall);
    }
    mg.position.set(m.x, 0, m.z);
    mg.rotation.y = m.rotY;
    group.add(mg);
  }

  // 7. Festive Authentic Perforated Papel Picado Banners High Over Boulevards!
  const papelHexes = ['#FF2A85', '#FFC814', '#16D96B', '#14B2FF', '#FF6124', '#A855F7'];
  const papelMats = papelHexes.map((hex) => {
    const tex = createPapelPicadoTexture(hex);
    disposables.push(tex);
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
    });
  });
  const cordMat = new THREE.LineBasicMaterial({ color: 0x3b2c38 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b3d4a, roughness: 0.6, metalness: 0.4 });
  const flagGeo = new THREE.PlaneGeometry(1.18, 0.92);

  for (const bn of layout.banners) {
    const bg = new THREE.Group();
    bg.position.set(bn.x, 0, bn.z);
    if (!bn.acrossX) bg.rotation.y = Math.PI / 2;

    // Two slim painted roadside fiesta poles
    for (const sx of [-bn.span * 0.5, bn.span * 0.5]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, bn.height + 0.3, 6), poleMat);
      p.position.set(sx, (bn.height + 0.3) / 2, 0);
      bg.add(p);
    }

    // Smooth curved hanging rope cord
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= 18; s++) {
      const u = s / 18;
      pts.push(new THREE.Vector3((u - 0.5) * bn.span, bn.height - Math.sin(u * Math.PI) * 1.15, 0));
    }
    bg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cordMat));

    // Hanging scalloped perforated Mexican folk flags swaying softly in breeze!
    const waveGroup = new THREE.Group();
    waveGroup.position.y = bn.height;
    const flagCount = 15;
    for (let i = 0; i < flagCount; i++) {
      const u = (i + 0.5) / flagCount;
      const x = (u - 0.5) * (bn.span - 1.4);
      const sag = Math.sin(u * Math.PI) * 1.15;
      const flag = new THREE.Mesh(flagGeo, papelMats[i % papelMats.length]);
      flag.position.set(x, -sag - 0.46, 0);
      waveGroup.add(flag);
    }
    bg.add(waveGroup);
    group.add(bg);
    papelGroups.push(waveGroup);
  }

  // 8. Bright Yellow-and-Black Striped Mexican Topes Amarillos (Speed Bumps!)
  const topeMat = new THREE.MeshStandardMaterial({
    map: topeTex,
    roughness: 0.52,
    emissive: 0xffb800,
    emissiveIntensity: 0.14,
  });
  for (const t of layout.topes) {
    // Low smooth raised domed cylinder half along road width
    const geo = new THREE.CylinderGeometry(t.depth * 0.52, t.depth * 0.56, t.width, 10, 1, false, 0, Math.PI);
    geo.rotateZ(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, topeMat);
    mesh.scale.set(1, 0.62, 1);
    mesh.position.set(t.x, 0.04, t.z);
    if (!t.acrossX) mesh.rotation.y = Math.PI / 2;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Subtle tiny roadside yellow warning diamond markers at sides of tope!
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, 0.45),
        new THREE.MeshBasicMaterial({ color: 0xffd11a })
      );
      post.rotation.y = Math.PI / 4;
      if (t.acrossX) post.position.set(t.x + s * (t.width * 0.5 + 0.5), 0.36, t.z);
      else post.position.set(t.x, 0.36, t.z + s * (t.width * 0.5 + 0.5));
      group.add(post);
    }
  }

  // 9. Cracked Baches (Potholes) with Vivid Orange Traffic Cones
  const bacheMat = new THREE.MeshBasicMaterial({
    map: potholeTex,
    transparent: true,
    depthWrite: false,
  });
  for (const b of layout.baches) {
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(b.radius * 2.25, b.radius * 2.25), bacheMat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(b.x, 0.06, b.z);
    group.add(hole);
    // Crisp high-visibility warning cones flanking the pothole rim
    const c1 = buildCone();
    c1.position.set(b.x - b.radius * 0.85, 0, b.z - b.radius * 0.45);
    const c2 = buildCone();
    c2.position.set(b.x + b.radius * 0.82, 0, b.z + b.radius * 0.48);
    group.add(c1, c2);
  }

  // 10. Parked Colorful Low-Poly Autos
  for (const pc of layout.parkedCars) {
    group.add(buildParkedCar(pc, shadowTex));
  }

  // 11. Circulating Emerald-Green & White Mexican Combis!
  const combis: ActiveCombi[] = [];
  for (const route of layout.combiRoutes) {
    const { mesh, wheels } = buildCombiMesh(route.stripeColor, shadowTex);
    group.add(mesh);
    combis.push({
      route,
      mesh,
      wheels,
      x: 0,
      z: 0,
      rotY: 0,
      progress: route.initialPos,
      nearMissCooldown: 0,
      hitFlash: 0,
    });
  }

  // 12. Colorful Mexican Street-Food Pickup Stands + Luminous Spinning Bright-Green Rings!
  const greenBeamTex = createBeamGradientTexture(34, 255, 118);
  disposables.push(greenBeamTex);
  const pickupVisuals: PickupVisual[] = [];

  for (const spot of layout.pickupSpots) {
    // Cozy permanent food cart right on the warm sidewalk edge
    const cart = new THREE.Group();
    const cartBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 1.35, 1.85),
      new THREE.MeshStandardMaterial({ color: 0xf8f4ec, roughness: 0.48 })
    );
    cartBody.position.y = 0.92;
    cartBody.castShadow = true;
    cart.add(cartBody);

    // Colorful steel counter strip
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.88, 0.36, 1.9),
      new THREE.MeshStandardMaterial({ color: spot.awningColor, roughness: 0.45 })
    );
    stripe.position.y = 0.86;
    cart.add(stripe);

    // Roof umbrella canopy supported by corner silver tubes
    for (const sx of [-1.7, 1.7]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 6), poleMat);
      tube.position.set(sx, 1.8, 0);
      cart.add(tube);
    }
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.26, 2.5),
      new THREE.MeshStandardMaterial({ color: spot.awningColor, roughness: 0.5 })
    );
    canopy.position.y = 3.2;
    canopy.castShadow = true;
    cart.add(canopy);

    // Crisp handwritten-look brightly colored stand banner!
    const signTex = createFoodStandSignTexture(spot.standName, spot.awningColor);
    disposables.push(signTex);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 0.96, 0.16),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    sign.position.set(0, 3.72, 0.85);
    cart.add(sign);

    // Cute steaming taco trompo / stainless warm olla on counter!
    const grill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.22, 0.72, 10),
      new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45 })
    );
    grill.position.set(-0.8, 1.92, 0);
    cart.add(grill);

    cart.position.set(spot.cartX, 0.12, spot.cartZ);
    cart.rotation.y = spot.cartRotY;
    group.add(cart);

    // Glowing luminous green pickup ring + gentle green halo pillar + spinning floating 3D dish!
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(spot.x, 0, spot.z);
    beaconGroup.visible = false;

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(spot.radius - 1.25, spot.radius, 36),
      new THREE.MeshBasicMaterial({
        color: 0x22ff74,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
      })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.14;
    beaconGroup.add(ringMesh);

    // Glowing inner carpet fill
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(spot.radius - 1.0, 32),
      new THREE.MeshBasicMaterial({
        color: 0x16f266,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.11;
    beaconGroup.add(fill);

    // Soft bright glowing green vertical rim
    const outerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(spot.radius - 0.15, spot.radius - 0.15, 16, 28, 1, true),
      new THREE.MeshBasicMaterial({
        map: greenBeamTex,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    outerRing.position.y = 8;
    beaconGroup.add(outerRing);

    const foodIcon = buildFoodSculpture(spot.dishId);
    foodIcon.position.y = 3.0;
    beaconGroup.add(foodIcon);

    group.add(beaconGroup);
    pickupVisuals.push({
      spot,
      beaconGroup,
      ringMesh,
      outerRing,
      foodIcon,
      active: false,
    });
  }

  // 13. Sky-Piercing Golden Delivery Beam Assembly ("Rayo Dorado")!
  const deliveryVisual = buildDeliveryBeacon();
  group.add(deliveryVisual.group);

  return {
    group,
    combis,
    pickupVisuals,
    deliveryVisual,
    clouds,
    fountainTop,
    papelGroups,
    palmCrowns,
    disposables,
  };
}
