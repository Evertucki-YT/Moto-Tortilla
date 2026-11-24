import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function toTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Sunlit smooth Mexican asphalt texture with crisp aggregate speckle */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#3b3c46';
  ctx.fillRect(0, 0, 256, 256);

  // Fine asphalt gravel texture
  for (let i = 0; i < 4200; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 256;
    const y = (Math.sin(i * 78.233) * 29758.5453 % 1 + 1) % 1 * 256;
    const v = 46 + (i % 34);
    ctx.fillStyle = `rgb(${v},${v + 1},${v + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Subtle sunny tire tracks darkening
  ctx.fillStyle = 'rgba(28,28,36,0.14)';
  ctx.fillRect(36, 0, 44, 256);
  ctx.fillRect(176, 0, 44, 256);

  return toTexture(c, 22, 22);
}

/** Warm sunny Mexican terrazzo sidewalk pavement */
export function createSidewalkTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#e8dcc7';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle tile grid
  ctx.strokeStyle = '#cfc0a6';
  ctx.lineWidth = 3;
  const step = 64;
  for (let x = 0; x <= 256; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Slight tonal tile variation & sandstone grit
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      const shade = ((gx * 7 + gy * 13) % 5 - 2) * 3;
      ctx.fillStyle = shade > 0 ? `rgba(255,250,235,0.22)` : `rgba(182,158,125,0.14)`;
      ctx.fillRect(gx * step + 3, gy * step + 3, step - 6, step - 6);
    }
  }
  return toTexture(c, 6, 6);
}

/** Vibrant Mexican yellow/black angled hazard chevrons for topes amarillos & ramp borders */
export function createTopeTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 64);
  ctx.fillStyle = '#FFC814';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#232026';
  for (let x = -64; x < 320; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 28, 0);
    ctx.lineTo(x + 48, 64);
    ctx.lineTo(x + 20, 64);
    ctx.closePath();
    ctx.fill();
  }
  // Subtle highlight bevel along top
  ctx.fillStyle = 'rgba(255,255,230,0.32)';
  ctx.fillRect(0, 22, 256, 18);
  return toTexture(c, 2.5, 1);
}

/** Vivid forward-chevron yellow-orange arcade jump ramp deck */
export function createRampDeckTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = '#3f4552';
  ctx.fillRect(0, 0, 256, 512);

  // Side orange-yellow hazard strips
  ctx.fillStyle = '#ffb81c';
  ctx.fillRect(0, 0, 26, 512);
  ctx.fillRect(230, 0, 26, 512);
  ctx.fillStyle = '#1f2229';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(0, y, 26, 32);
    ctx.fillRect(230, y, 26, 32);
  }

  // Glowing golden-orange forward arrow chevrons inviting the jump!
  ctx.strokeStyle = '#ffbe1f';
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let y = 90; y < 480; y += 112) {
    ctx.beginPath();
    ctx.moveTo(58, y + 48);
    ctx.lineTo(128, y - 16);
    ctx.lineTo(198, y + 48);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Cracked Mexican road pothole ("bache") texture with wet dark interior */
export function createPotholeTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);

  // Broken lighter stone rim
  ctx.fillStyle = '#68646e';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 92 + Math.sin(i * 3.1) * 14 + Math.cos(i * 5.2) * 8;
    const x = 128 + Math.cos(a) * r;
    const y = 128 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Deep crater hole
  const grad = ctx.createRadialGradient(124, 122, 12, 128, 128, 86);
  grad.addColorStop(0, '#101016');
  grad.addColorStop(0.7, '#22212b');
  grad.addColorStop(1, '#4b4954');
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 74 + Math.sin(i * 3.1) * 12;
    const x = 128 + Math.cos(a) * r;
    const y = 128 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Subtle sky puddle sheen inside
  ctx.fillStyle = 'rgba(110, 170, 200, 0.25)';
  ctx.beginPath();
  ctx.ellipse(118, 128, 34, 20, -0.3, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Colorful woven Mexican tianguis tarp (lona rosa / lona azul) */
export function createLonaTexture(primary: string, stripe: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = stripe;
  for (let x = 0; x < 128; x += 32) {
    ctx.fillRect(x, 0, 12, 128);
  }
  // Subtle horizontal grommet seam
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0, 62, 128, 4);
  return toTexture(c, 2, 1);
}

/** Sunlit Mexican stucco painted facade with warm colonial windows & shutters */
export function createFacadeTexture(
  wallHex: string,
  trimHex: string,
  floors: number,
  cols: number
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle warm plaster stucco richness
  for (let i = 0; i < 600; i++) {
    const x = ((i * 73) % 256);
    const y = ((i * 139) % 256);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,245,0.06)' : 'rgba(60,30,20,0.05)';
    ctx.fillRect(x, y, 8, 6);
  }

  // Ground-floor dark painted Mexican zócalo base trim
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, 218, 256, 38);
  // Crown cornice stripe along roof
  ctx.fillStyle = 'rgba(255, 248, 232, 0.85)';
  ctx.fillRect(0, 0, 256, 14);
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, 14, 256, 7);

  // Tall colorful windows with dark wrought-iron grille frame & warm sunlight glint
  const marginX = 16;
  const colW = (256 - marginX * 2) / cols;
  const topPad = 30;
  const availH = 186;
  const rowH = availH / floors;

  for (let r = 0; r < floors; r++) {
    for (let k = 0; k < cols; k++) {
      const wx = marginX + k * colW + colW * 0.2;
      const wy = topPad + r * rowH + rowH * 0.16;
      const ww = colW * 0.6;
      const wh = rowH * 0.66;

      // White colonial window surround
      ctx.fillStyle = '#fff5e4';
      ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

      // Glass interior (warm teal-slate reflecting blue sky)
      const isLit = (r + k) % 3 === 0;
      const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      g.addColorStop(0, isLit ? '#2f5f7f' : '#263f5b');
      g.addColorStop(1, isLit ? '#65a8bd' : '#3d6b85');
      ctx.fillStyle = g;
      ctx.fillRect(wx, wy, ww, wh);

      // Diagonal sunshine reflection glint
      ctx.fillStyle = 'rgba(255,250,230,0.32)';
      ctx.beginPath();
      ctx.moveTo(wx + 2, wy + 2);
      ctx.lineTo(wx + ww * 0.52, wy + 2);
      ctx.lineTo(wx + 2, wy + wh * 0.65);
      ctx.closePath();
      ctx.fill();

      // Tiny wrought iron horizontal balcony bar at bottom
      ctx.fillStyle = '#241e29';
      ctx.fillRect(wx - 2, wy + wh - 6, ww + 4, 4);
      // Center cross pane
      ctx.fillStyle = '#f5e8d2';
      ctx.fillRect(wx + ww * 0.47, wy, 2.5, wh);
      ctx.fillRect(wx, wy + wh * 0.46, ww, 2.5);
    }
  }

  // Cheerful shop doorway on ground floor middle
  ctx.fillStyle = '#3a241c';
  ctx.fillRect(108, 206, 40, 50);
  ctx.fillStyle = '#fff3d8';
  ctx.fillRect(104, 202, 48, 5);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Iconic vibrant corner OXXO fascia signage! */
export function createOxxoSignTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 160);
  // Top iconic bold red band
  ctx.fillStyle = '#D91926';
  ctx.fillRect(0, 0, 512, 114);
  // Crisp white dividing ribbon
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 114, 512, 14);
  // Signature golden-yellow bottom stripe
  ctx.fillStyle = '#FFC20E';
  ctx.fillRect(0, 128, 512, 32);

  // Glowing rounded centerpiece frame
  ctx.fillStyle = '#FFC20E';
  ctx.beginPath();
  ctx.roundRect(128, 12, 256, 92, 16);
  ctx.fill();
  ctx.fillStyle = '#C81422';
  ctx.beginPath();
  ctx.roundRect(136, 20, 240, 76, 12);
  ctx.fill();

  // Crisp classic bold white OXXO letters
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 68px Arial Black, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OXXO', 256, 61);

  // Subtle corner "24 HRS" tag
  ctx.fillStyle = '#FFF5CC';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('24 HRS', 446, 60);
  ctx.fillText('¡ABIERTOS!', 66, 60);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** OXXO brightly lit drink-cooler storefront window */
export function createOxxoWindowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = '#d9f4ff';
  ctx.fillRect(0, 0, 256, 128);

  // Colorful stocked snack shelves & glowing beverage coolers inside
  const colors = ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#fbbf24'];
  for (let row = 0; row < 4; row++) {
    const y = 16 + row * 26;
    ctx.fillStyle = '#9ac6db';
    ctx.fillRect(10, y + 16, 236, 4);
    for (let x = 16; x < 236; x += 18) {
      ctx.fillStyle = colors[(row * 5 + Math.floor(x / 18)) % colors.length];
      ctx.fillRect(x, y, 12, 15);
    }
  }
  // Red sliding door frames
  ctx.strokeStyle = '#d91926';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 120);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 128);
  ctx.stroke();

  // Glass reflection glint
  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(70, 0);
  ctx.lineTo(35, 128);
  ctx.lineTo(0, 128);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Moto Tortilla delivery box & cooler badge */
export function createDeliveryBoxTexture(bg: string, label: string, accent: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 22, 256, 22);
  ctx.fillRect(0, 212, 256, 22);

  // Cute golden tortilla disc icon
  ctx.fillStyle = '#ffe082';
  ctx.beginPath();
  ctx.arc(128, 108, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9a3412';
  ctx.lineWidth = 6;
  ctx.stroke();
  // Individual cute toasted comal spots on the tortilla!
  ctx.fillStyle = '#b85d1c';
  for (const [tx, ty, tr] of [
    [108, 96, 6],
    [144, 118, 5.5],
    [134, 88, 4.5],
    [116, 126, 4.5],
    [126, 108, 3.8],
  ]) {
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 194);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft contact shadow blob placed flat under bikes & vehicles */
export function createShadowBlobTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  g.addColorStop(0, 'rgba(18, 12, 26, 0.56)');
  g.addColorStop(0.55, 'rgba(18, 12, 26, 0.25)');
  g.addColorStop(1, 'rgba(18, 12, 26, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Glowing vertical alpha gradient for the golden delivery beam ("rayo dorado") */
export function createBeamGradientTexture(r: number, g: number, b: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 256);
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.78)`);
  grad.addColorStop(0.28, `rgba(${r},${g},${b},0.48)`);
  grad.addColorStop(0.68, `rgba(${r},${g},${b},0.18)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  // Subtle brighter vertical shafts for dramatic sunlit gold energy!
  ctx.fillStyle = 'rgba(255, 252, 210, 0.22)';
  ctx.fillRect(10, 40, 8, 216);
  ctx.fillRect(36, 20, 12, 236);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Rich warm sunlit Mexican sky gradient dome */
export function createSkyTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(32, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#1377d6');   // vibrant crisp azure top
  g.addColorStop(0.28, '#38b2f0');  // joyous bright Mexico turquoise sky
  g.addColorStop(0.46, '#9ce4f7');  // glowing breezy lower sky
  g.addColorStop(0.52, '#ffe9be');  // warm golden Mexican sun haze at horizon
  g.addColorStop(0.62, '#f9be8c');  // warm terracotta horizon ground bounce
  g.addColorStop(1.0, '#d89b6d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Painted Mexican restaurant awning stripes for pickup stalls */
export function createFoodStandSignTexture(title: string, bg: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 72);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 72);
  ctx.strokeStyle = '#FFF5D6';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 246, 62);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 28px Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 128, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Authentic perforated scalloped Mexican Papel Picado fiesta flag texture */
export function createPapelPicadoTexture(color: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(96, 72);
  ctx.clearRect(0, 0, 96, 72);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(94, 0);
  ctx.lineTo(94, 56);
  for (let i = 3; i >= 0; i--) {
    const cx = i * 23 + 13.5;
    ctx.arc(cx, 56, 11.5, 0, Math.PI, false);
  }
  ctx.lineTo(2, 56);
  ctx.closePath();
  ctx.fill();

  // Traditional decorative star-flower folk cutouts
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(48, 28, 7.5, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(48 + Math.cos(a) * 16, 28 + Math.sin(a) * 13, 4.0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [dx, dy] of [
    [16, 14],
    [80, 14],
    [16, 44],
    [80, 44],
  ]) {
    ctx.beginPath();
    ctx.moveTo(dx, dy - 5.5);
    ctx.lineTo(dx + 5.5, dy);
    ctx.lineTo(dx, dy + 5.5);
    ctx.lineTo(dx - 5.5, dy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
