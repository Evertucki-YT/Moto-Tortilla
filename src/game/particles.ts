import * as THREE from 'three';

type ParticleKind = 'coin' | 'confetti' | 'spark' | 'smoke' | 'flame' | 'tortilla' | 'star';

interface Particle {
  active: boolean;
  kind: ParticleKind;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  age: number;
  life: number;
  gravity: number;
  startScale: number;
  endScale: number;
}

const POOL_SIZE = 190;

export class ParticleSystem {
  public readonly group = new THREE.Group();
  private pool: Particle[] = [];
  private cursor = 0;

  private coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12);
  private tortillaGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12);
  private boxGeo = new THREE.BoxGeometry(0.34, 0.34, 0.1);
  private puffGeo = new THREE.DodecahedronGeometry(0.38, 0);
  private starGeo = new THREE.OctahedronGeometry(0.3, 0);

  constructor() {
    this.coinGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.puffGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({
        active: false,
        kind: 'smoke',
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        age: 0,
        life: 1,
        gravity: 0,
        startScale: 1,
        endScale: 0,
      });
    }
  }

  private spawn(
    kind: ParticleKind,
    geo: THREE.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    gravity: number,
    startScale: number,
    endScale: number,
    additive = false
  ): void {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % POOL_SIZE;
    p.active = true;
    p.kind = kind;
    p.mesh.geometry = geo;
    const mat = p.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = 1;
    mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.mesh.position.set(x, y, z);
    p.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    p.mesh.scale.setScalar(startScale);
    p.mesh.visible = true;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.rx = (Math.random() - 0.5) * 10;
    p.ry = (Math.random() - 0.5) * 12;
    p.rz = (Math.random() - 0.5) * 10;
    p.age = 0;
    p.life = life;
    p.gravity = gravity;
    p.startScale = startScale;
    p.endScale = endScale;
  }

  /** Big joyful golden peso fountain & papel-picado confetti burst on successful delivery! */
  public emitDelivery(x: number, y: number, z: number): void {
    const confettiColors = [0xe62e7a, 0xffc814, 0x1ee36b, 0x19b5ff, 0xff5e2b, 0xffffff];
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 8;
      this.spawn(
        'coin',
        this.coinGeo,
        i % 3 === 0 ? 0xfff08a : 0xffbe18,
        x,
        y + 1.4,
        z,
        Math.cos(a) * spd,
        8 + Math.random() * 9,
        Math.sin(a) * spd,
        0.95 + Math.random() * 0.45,
        22,
        1.15,
        0.4
      );
    }
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 5 + Math.random() * 11;
      const col = confettiColors[i % confettiColors.length];
      this.spawn(
        'confetti',
        this.boxGeo,
        col,
        x,
        y + 2.0,
        z,
        Math.cos(a) * spd,
        7 + Math.random() * 10,
        Math.sin(a) * spd,
        1.1 + Math.random() * 0.5,
        11,
        1.25,
        0.6
      );
    }
  }

  /** Sparkling vibrant green celebration ring on fresh hot order pickup */
  public emitPickup(x: number, y: number, z: number, dishHex: number): void {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const spd = 4.5 + Math.random() * 4.5;
      this.spawn(
        'spark',
        this.starGeo,
        i % 2 === 0 ? 0x22ff7a : dishHex,
        x + Math.cos(a) * 1.4,
        y + 1.0,
        z + Math.sin(a) * 1.4,
        Math.cos(a) * spd,
        5 + Math.random() * 5,
        Math.sin(a) * spd,
        0.65 + Math.random() * 0.25,
        10,
        1.0,
        0.05,
        true
      );
    }
  }

  /** Roaring flame & spark ribbon trail during Turbo / Wheelie */
  public emitTurbo(x: number, y: number, z: number, dirX: number, dirZ: number, blue: boolean): void {
    const colors = blue
      ? [0x0ea5ff, 0x38f2ff, 0xe0fbff]
      : [0xff5b14, 0xffae19, 0xfff08a];
    for (let i = 0; i < 2; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      this.spawn(
        'flame',
        this.puffGeo,
        col,
        x + (Math.random() - 0.5) * 0.65,
        y + 0.45 + Math.random() * 0.25,
        z + (Math.random() - 0.5) * 0.65,
        -dirX * (5 + Math.random() * 5) + (Math.random() - 0.5) * 1.8,
        1.2 + Math.random() * 2.2,
        -dirZ * (5 + Math.random() * 5) + (Math.random() - 0.5) * 1.8,
        0.26 + Math.random() * 0.16,
        -1.5,
        blue ? 1.1 : 0.88,
        0.08,
        true
      );
    }
  }

  /** Light warm asphalt skid dust / jump landing smoke */
  public emitDust(x: number, y: number, z: number, count = 1, color = 0xf5ebd8): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(
        'smoke',
        this.puffGeo,
        color,
        x + (Math.random() - 0.5) * 0.8,
        y + 0.22,
        z + (Math.random() - 0.5) * 0.8,
        Math.cos(a) * (1.2 + Math.random() * 2.4),
        1.2 + Math.random() * 1.8,
        Math.sin(a) * (1.2 + Math.random() * 2.4),
        0.38 + Math.random() * 0.22,
        0.4,
        0.55,
        1.35
      );
    }
  }

  /** Steam rising softly from hot fresh tortillas box! */
  public emitSteam(x: number, y: number, z: number): void {
    this.spawn(
      'smoke',
      this.puffGeo,
      0xffffff,
      x + (Math.random() - 0.5) * 0.35,
      y + 1.85,
      z + (Math.random() - 0.5) * 0.35,
      (Math.random() - 0.5) * 0.8,
      2.6 + Math.random() * 1.2,
      (Math.random() - 0.5) * 0.8,
      0.5,
      -0.8,
      0.34,
      0.92
    );
  }

  /** Crisp golden-cyan electric pop on "¡POR UN PELO!" near-miss or epic ramp jump! */
  public emitStuntBurst(x: number, y: number, z: number, color = 0xffe033): void {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const spd = 4 + Math.random() * 6;
      this.spawn(
        'spark',
        this.starGeo,
        i % 2 === 0 ? color : 0xffffff,
        x,
        y + 1.0,
        z,
        Math.cos(a) * spd,
        3.5 + Math.random() * 5,
        Math.sin(a) * spd,
        0.5 + Math.random() * 0.25,
        12,
        0.95,
        0.05,
        true
      );
    }
  }

  /** Comical cartoon wipeout explosion: billowing puffs, spinning stars & flying golden tortillas! */
  public emitCrash(x: number, y: number, z: number): void {
    // Classic comic puff cloud
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 7;
      this.spawn(
        'smoke',
        this.puffGeo,
        i % 3 === 0 ? 0xff7b29 : 0xfff3de,
        x,
        y + 1.0,
        z,
        Math.cos(a) * spd,
        3 + Math.random() * 6,
        Math.sin(a) * spd,
        0.65 + Math.random() * 0.3,
        4,
        1.1,
        2.3
      );
    }
    // Flying toasted tortillas everywhere!
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 5 + Math.random() * 8;
      this.spawn(
        'tortilla',
        this.tortillaGeo,
        i % 2 === 0 ? 0xfbe08c : 0xffcb52,
        x,
        y + 1.5,
        z,
        Math.cos(a) * spd,
        7 + Math.random() * 7,
        Math.sin(a) * spd,
        0.95 + Math.random() * 0.35,
        18,
        1.35,
        0.95
      );
    }
    // Dizzy cartoon bright stars
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.spawn(
        'star',
        this.starGeo,
        0xffe436,
        x,
        y + 1.8,
        z,
        Math.cos(a) * 6,
        6 + Math.random() * 4,
        Math.sin(a) * 6,
        0.75,
        11,
        1.2,
        0.1,
        true
      );
    }
  }

  /** Armored blue crash-shield shockwave for La Tortillera Turbo! */
  public emitShieldBlock(x: number, y: number, z: number): void {
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      this.spawn(
        'spark',
        this.starGeo,
        i % 2 === 0 ? 0x38bdf8 : 0xe0f7ff,
        x,
        y + 1.1,
        z,
        Math.cos(a) * 10,
        2 + Math.random() * 5,
        Math.sin(a) * 10,
        0.48,
        8,
        1.1,
        0.05,
        true
      );
    }
  }

  public update(dt: number): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.12 && (p.kind === 'coin' || p.kind === 'tortilla')) {
        p.mesh.position.y = 0.12;
        p.vy = Math.abs(p.vy) * 0.42;
      }
      p.mesh.rotation.x += p.rx * dt;
      p.mesh.rotation.y += p.ry * dt;
      p.mesh.rotation.z += p.rz * dt;
      const s = p.startScale + (p.endScale - p.startScale) * t;
      p.mesh.scale.setScalar(Math.max(0.01, s));
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
    }
  }

  public clear(): void {
    for (const p of this.pool) {
      p.active = false;
      p.mesh.visible = false;
    }
  }
}
