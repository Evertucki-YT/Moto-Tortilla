import { DishId } from '../types';

export const ROAD_COORDS = [-152, -76, 0, 76, 152] as const;
export const ROAD_WIDTH = 22;
export const ROAD_HALF = ROAD_WIDTH / 2; // 11m
export const WORLD_LIMIT = 165;          // soft wall just outside outer avenues

export const GLORIETA_ISLAND_R = 11.2;
export const GLORIETA_OUTER_R = 26.5;

export interface BlockBuilding {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  wallColor: string;
  trimColor: string;
  floors: number;
  cols: number;
  isOxxo?: boolean;
  hasTinaco?: boolean;
  hasAwning?: boolean;
  awningColor?: number;
  roofStyle?: 'flat' | 'parapet' | 'terrace';
}

export interface CityBlock {
  cx: number;
  cz: number;
  size: number;
  gx: number;
  gz: number;
  buildings: BlockBuilding[];
  isPlaza?: boolean;
}

export interface RampSpec {
  id: number;
  x: number;
  z: number;
  /** Direction vector along which ramp rises (normalized, axis-aligned) */
  dirX: number;
  dirZ: number;
  width: number;
  length: number;
  height: number;
  /** Tianguis stall placed neatly immediately beyond the ramp high end */
  stallX: number;
  stallZ: number;
  stallLength: number;
  stallWidth: number;
  lonaColor: 'pink' | 'blue';
}

export interface TopeSpec {
  id: number;
  x: number;
  z: number;
  /** True = spans along X (blocks driving along Z), False = spans along Z (blocks driving along X) */
  acrossX: boolean;
  width: number;
  depth: number;
}

export interface BacheSpec {
  id: number;
  x: number;
  z: number;
  radius: number;
}

export interface ParkedCarSpec {
  id: number;
  x: number;
  z: number;
  rotY: number;
  color: number;
  style: 'sedan' | 'vocho' | 'pickup';
}

export interface PickupSpot {
  id: number;
  /** Center of drivable green pickup ring on road side */
  x: number;
  z: number;
  /** Position of the physical colorful food cart right beside the curb */
  cartX: number;
  cartZ: number;
  cartRotY: number;
  dishId: DishId;
  standName: string;
  awningColor: string;
  radius: number;
}

export interface DeliverySpot {
  id: number;
  /** Center of drivable golden beacon landing zone on road edge */
  x: number;
  z: number;
  /** Position of the front porch & waving customer */
  houseX: number;
  houseZ: number;
  facingRotY: number;
  label: string;
  radius: number;
}

export interface CombiRoute {
  id: number;
  kind: 'line' | 'ring';
  /** For line routes: moving along axis 'x' or 'z' at fixed coord */
  axis?: 'x' | 'z';
  fixedCoord?: number;
  dir?: 1 | -1;
  minPos?: number;
  maxPos?: number;
  initialPos: number;
  speed: number;
  /** For ring routes (around Glorieta) */
  ringRadius?: number;
  stripeColor: number;
}

export interface TianguisSideMarket {
  x: number;
  z: number;
  rotY: number;
  count: number;
  primary: 'pink' | 'blue';
}

export interface PapelPicadoBanner {
  x: number;
  z: number;
  acrossX: boolean;
  span: number;
  height: number;
}

export interface CityLayout {
  blocks: CityBlock[];
  colliders: BlockBuilding[]; // fast static AABB list for collision
  ramps: RampSpec[];
  topes: TopeSpec[];
  baches: BacheSpec[];
  parkedCars: ParkedCarSpec[];
  pickupSpots: PickupSpot[];
  deliverySpots: DeliverySpot[];
  combiRoutes: CombiRoute[];
  sideMarkets: TianguisSideMarket[];
  banners: PapelPicadoBanner[];
  palms: Array<{ x: number; z: number; scale: number; isJacaranda?: boolean }>;
  playerSpawn: { x: number; z: number; rotY: number };
}

// Vibrant sunny authentic Mexican stucco palette!
const MEX_PALETTE: Array<{ wall: string; trim: string }> = [
  { wall: '#E85A3C', trim: '#9B2B1C' }, // Terracotta coral
  { wall: '#F2B434', trim: '#B56E14' }, // Cempasúchil gold
  { wall: '#E03B7C', trim: '#8F194B' }, // Rosa mexicano
  { wall: '#2B89C7', trim: '#174E7D' }, // Azul Talavera
  { wall: '#32B397', trim: '#196B5A' }, // Verde menta Oaxaca
  { wall: '#F5E4C8', trim: '#C46D3B' }, // Warm colonial adobe cream
  { wall: '#F07D3A', trim: '#A33E18' }, // Warm tangerine
  { wall: '#7C5CC4', trim: '#472F82' }, // Lavanda colonial
  { wall: '#E8C94A', trim: '#9C6F1A' }, // Mustard amarillo
];

// Deterministic PRNG for rock-solid consistent scenic layout
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCityLayout(): CityLayout {
  const rand = mulberry32(202607);
  const blocks: CityBlock[] = [];
  const colliders: BlockBuilding[] = [];
  const palms: Array<{ x: number; z: number; scale: number; isJacaranda?: boolean }> = [];
  const blockSize = 76 - ROAD_WIDTH; // 54m

  // Create the 4x4 grid of city blocks nestled between the 5x5 avenues
  for (let gx = 0; gx < 4; gx++) {
    for (let gz = 0; gz < 4; gz++) {
      const cx = (ROAD_COORDS[gx] + ROAD_COORDS[gx + 1]) / 2; // -114, -38, 38, 114
      const cz = (ROAD_COORDS[gz] + ROAD_COORDS[gz + 1]) / 2;
      const buildings: BlockBuilding[] = [];
      const touchesGlorieta = (gx === 1 || gx === 2) && (gz === 1 || gz === 2);

      // Subdivide each 54x54 block cleanly into a lively 2x2 neighborhood cluster with setbacks
      const offsets: Array<[number, number]> = [
        [-11.5, -11.5],
        [11.5, -11.5],
        [-11.5, 11.5],
        [11.5, 11.5],
      ];

      // Make block (gx=2, gz=1) corner closest to Glorieta the iconic flagship OXXO!
      const isOxxoBlock = gx === 2 && gz === 1;
      // One colorful little corner garden plaza in (gx=1, gz=2) nearest Glorieta
      const isPlazaCorner = gx === 1 && gz === 2;

      offsets.forEach(([ox, oz], idx) => {
        const bx = cx + ox;
        const bz = cz + oz;
        const distOrigin = Math.hypot(bx, bz);

        // Keep wide sunny room near the circular Glorieta!
        if (isOxxoBlock && idx === 2) {
          // Corner nearest (0,0) -> Iconic brightly styled corner OXXO store!
          const oxxo: BlockBuilding = {
            x: cx - 9.2, // x ≈ 28.8
            z: cz + 9.2, // z ≈ -28.8
            w: 20,
            d: 16,
            h: 7.4,
            wallColor: '#F5EFE6',
            trimColor: '#D91926',
            floors: 1,
            cols: 3,
            isOxxo: true,
            hasTinaco: false,
            roofStyle: 'flat',
          };
          buildings.push(oxxo);
          colliders.push(oxxo);
          // Palm trees framing OXXO edge nicely
          palms.push({ x: oxxo.x - 11.8, z: oxxo.z - 6.8, scale: 1.15 });
          palms.push({ x: oxxo.x + 11.5, z: oxxo.z + 7.2, scale: 1.05 });
          return;
        }

        if (isPlazaCorner && idx === 1) {
          // Mini leafy jacaranda / palm zócalo pocket corner across from OXXO
          palms.push({ x: bx - 5, z: bz + 4, scale: 1.25, isJacaranda: true });
          palms.push({ x: bx + 2, z: bz - 2, scale: 1.15 });
          palms.push({ x: bx - 8, z: bz - 4, scale: 1.05 });
          return;
        }

        // Check nearest corner quadrant adjacent to central Glorieta
        const isCenterCorner = touchesGlorieta && distOrigin < 39;
        const pal = MEX_PALETTE[Math.floor(rand() * MEX_PALETTE.length)];
        const distEdge = Math.max(Math.abs(cx), Math.abs(cz));
        const baseW = isCenterCorner ? 14.5 : 16.5 + rand() * 4.5;
        const baseD = isCenterCorner ? 14.5 : 16.5 + rand() * 4.5;
        // Graceful skyline height rhythm: colorful low-to-mid colonial near center, a few dramatic bright towers outward
        const floors = isCenterCorner
          ? 2 + Math.floor(rand() * 2)
          : distEdge > 90
          ? 2 + Math.floor(rand() * 5)
          : 2 + Math.floor(rand() * 4);
        const h = floors * 4.3 + 2.2 + rand() * 1.4;
        const shiftX = isCenterCorner ? Math.sign(bx) * 2.4 : 0;
        const shiftZ = isCenterCorner ? Math.sign(bz) * 2.4 : 0;
        const awningPalette = [0xe62e7a, 0x19a7ee, 0xf59e0b, 0x16a34a, 0xef4444];

        const b: BlockBuilding = {
          x: bx + shiftX,
          z: bz + shiftZ,
          w: baseW,
          d: baseD,
          h,
          wallColor: pal.wall,
          trimColor: pal.trim,
          floors: Math.min(floors, 5),
          cols: 2 + Math.floor(rand() * 2),
          hasTinaco: rand() > 0.32,
          hasAwning: rand() > 0.42,
          awningColor: awningPalette[Math.floor(rand() * awningPalette.length)],
          roofStyle: rand() > 0.45 ? 'parapet' : 'flat',
        };
        buildings.push(b);
        colliders.push(b);
      });

      // Add lush perimeter sidewalk palms & occasional purple jacarandas
      const cornerCoords: Array<[number, number]> = [
        [cx - 24, cz - 24],
        [cx + 24, cz - 24],
        [cx - 24, cz + 24],
        [cx + 24, cz + 24],
      ];
      cornerCoords.forEach(([px, pz], i) => {
        if (Math.hypot(px, pz) < GLORIETA_OUTER_R + 3.5) return;
        // Skip directly behind flagship OXXO's south entrance view
        if (isOxxoBlock && i === 2) return;
        if (rand() > 0.3) {
          palms.push({
            x: px,
            z: pz,
            scale: 0.92 + rand() * 0.42,
            isJacaranda: rand() > 0.78,
          });
        }
      });

      blocks.push({ cx, cz, size: blockSize, gx, gz, buildings, isPlaza: isPlazaCorner });
    }
  }

  // Lush circle of stylized palms on the central Glorieta perimeter
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    palms.push({
      x: Math.cos(a) * 8.2,
      z: Math.sin(a) * 8.2,
      scale: 1.08 + (i % 2) * 0.14,
    });
  }

  // Construction jump ramps aimed cleanly straight over vibrant Tianguis stalls (pink & blue tarps!)
  // Positioned right along major straight avenues with tons of lane space beside them
  const ramps: RampSpec[] = [
    // Right along central north avenue heading north (epic iconic first stunt!)
    {
      id: 1,
      x: -4.2,
      z: -40,
      dirX: 0,
      dirZ: -1,
      width: 5.0,
      length: 9.2,
      height: 2.75,
      stallX: -4.2,
      stallZ: -51.5,
      stallWidth: 5.2,
      stallLength: 6.2,
      lonaColor: 'pink',
    },
    // West-to-east avenue z=0 heading east past OXXO
    {
      id: 2,
      x: 40,
      z: 3.8,
      dirX: 1,
      dirZ: 0,
      width: 5.0,
      length: 9.2,
      height: 2.75,
      stallX: 51.5,
      stallZ: 3.8,
      stallWidth: 5.2,
      stallLength: 6.2,
      lonaColor: 'blue',
    },
    // East-to-west avenue z=0 west half
    {
      id: 3,
      x: -39,
      z: -3.8,
      dirX: -1,
      dirZ: 0,
      width: 5.0,
      length: 9.2,
      height: 2.75,
      stallX: -50.5,
      stallZ: -3.8,
      stallWidth: 5.2,
      stallLength: 6.2,
      lonaColor: 'pink',
    },
    // Eastern avenue x=76 south-bound
    {
      id: 4,
      x: 72.5,
      z: 26,
      dirX: 0,
      dirZ: 1,
      width: 5.0,
      length: 9.2,
      height: 2.8,
      stallX: 72.5,
      stallZ: 37.5,
      stallWidth: 5.2,
      stallLength: 6.4,
      lonaColor: 'blue',
    },
    // Northern vibrant tianguis boulevard z=-76 heading west
    {
      id: 5,
      x: 42,
      z: -72.5,
      dirX: -1,
      dirZ: 0,
      width: 5.0,
      length: 9.2,
      height: 2.8,
      stallX: 30.5,
      stallZ: -72.5,
      stallWidth: 5.2,
      stallLength: 6.2,
      lonaColor: 'pink',
    },
    // Western boulevard x=-76 heading north
    {
      id: 6,
      x: -79.5,
      z: 46,
      dirX: 0,
      dirZ: -1,
      width: 5.0,
      length: 9.2,
      height: 2.8,
      stallX: -79.5,
      stallZ: 34.5,
      stallWidth: 5.2,
      stallLength: 6.2,
      lonaColor: 'blue',
    },
    // Southern wide boulevard z=76 heading east
    {
      id: 7,
      x: -44,
      z: 79.5,
      dirX: 1,
      dirZ: 0,
      width: 5.0,
      length: 9.2,
      height: 2.8,
      stallX: -32.5,
      stallZ: 79.5,
      stallWidth: 5.2,
      stallLength: 6.2,
      lonaColor: 'pink',
    },
  ];

  // Sidewalk decorative colorful Mexican tianguis rows (pink & blue tarps framing streets!)
  const sideMarkets: TianguisSideMarket[] = [
    { x: 14, z: -56, rotY: Math.PI / 2, count: 3, primary: 'pink' },
    { x: -14, z: 54, rotY: Math.PI / 2, count: 3, primary: 'blue' },
    { x: 52, z: -63, rotY: 0, count: 3, primary: 'blue' },
    { x: -52, z: 63, rotY: 0, count: 3, primary: 'pink' },
    { x: 90, z: -38, rotY: Math.PI / 2, count: 3, primary: 'pink' },
    { x: -90, z: -38, rotY: Math.PI / 2, count: 3, primary: 'blue' },
    { x: 114, z: 63, rotY: 0, count: 3, primary: 'pink' },
    { x: -114, z: -63, rotY: 0, count: 3, primary: 'blue' },
  ];

  // Festive perforated papel picado banners arcing gracefully high over avenues (never blocks camera!)
  const banners: PapelPicadoBanner[] = [
    { x: 0, z: 58, acrossX: true, span: 23, height: 10.2 },
    { x: 0, z: -31, acrossX: true, span: 23, height: 10.2 },
    { x: 34, z: 0, acrossX: false, span: 23, height: 10.2 },
    { x: -34, z: 0, acrossX: false, span: 23, height: 10.2 },
    { x: 76, z: -38, acrossX: true, span: 23, height: 10.0 },
    { x: -76, z: -38, acrossX: true, span: 23, height: 10.0 },
    { x: 0, z: 114, acrossX: true, span: 23, height: 10.0 },
    { x: 0, z: -114, acrossX: true, span: 23, height: 10.0 },
    { x: 38, z: -76, acrossX: false, span: 23, height: 10.0 },
    { x: -38, z: 76, acrossX: false, span: 23, height: 10.0 },
  ];

  // Iconic bright yellow striped Mexican TOPES AMARILLOS (jump right over with Space/A!)
  const topes: TopeSpec[] = [
    { id: 1, x: 0, z: 54, acrossX: true, width: 17.5, depth: 1.7 },
    { id: 2, x: 0, z: -112, acrossX: true, width: 17.5, depth: 1.7 },
    { id: 3, x: 114, z: 0, acrossX: false, width: 17.5, depth: 1.7 },
    { id: 4, x: -114, z: 0, acrossX: false, width: 17.5, depth: 1.7 },
    { id: 5, x: 76, z: -36, acrossX: true, width: 17.5, depth: 1.7 },
    { id: 6, x: -76, z: -112, acrossX: true, width: 17.5, depth: 1.7 },
    { id: 7, x: 38, z: 76, acrossX: false, width: 17.5, depth: 1.7 },
    { id: 8, x: -38, z: -76, acrossX: false, width: 17.5, depth: 1.7 },
    { id: 9, x: 76, z: 114, acrossX: true, width: 17.5, depth: 1.7 },
    { id: 10, x: -114, z: 76, acrossX: false, width: 17.5, depth: 1.7 },
  ];

  // Classic BACHES (road potholes clearly edged with orange safety cones — steer around or hop over!)
  const baches: BacheSpec[] = [
    { id: 1, x: 5.5, z: -96, radius: 2.0 },
    { id: 2, x: -5.2, z: 96, radius: 2.0 },
    { id: 3, x: 96, z: -5.0, radius: 2.0 },
    { id: 4, x: -96, z: 5.2, radius: 2.0 },
    { id: 5, x: 79.5, z: -102, radius: 2.0 },
    { id: 6, x: -72.5, z: -36, radius: 2.0 },
    { id: 7, x: 108, z: -72.5, radius: 2.0 },
    { id: 8, x: 114, z: 79.5, radius: 2.0 },
    { id: 9, x: -108, z: -79.5, radius: 2.0 },
    { id: 10, x: -72.5, z: 112, radius: 2.0 },
  ];

  // Parked vibrant Mexican cars parallel along avenue curbs (prime "¡POR UN PELO!" near-miss targets!)
  const carColors = [
    0x27b5d8, // Classic turquoise Vocho
    0xf59e0b, // Marigold amber Tsuru
    0xef4444, // Chili red sedan
    0xf43f8e, // CDMX Taxi rosa-y-blanco feel
    0x22c55e, // Mint lime Vocho
    0xfbbf24, // Bright taxi gold
    0x6366f1, // Cobalt blue hatchback
    0xf97316, // Warm orange pickup
    0xfaf5eb, // Cream vintage sedan
  ];
  const styles: Array<'sedan' | 'vocho' | 'pickup'> = ['vocho', 'sedan', 'pickup'];
  const parkedCoords: Array<[number, number, number]> = [
    // [x, z, rotY] — cleanly on road edge (±8.5 from centerline), keeping central lanes spacious
    [8.6, 36, 0],
    [-8.6, 40, Math.PI],
    [8.6, -42, 0],
    [8.6, -98, 0],
    [-8.6, -128, Math.PI],
    [8.6, 126, 0],
    [42, -8.6, Math.PI / 2],
    [98, 8.6, -Math.PI / 2],
    [-46, 8.6, Math.PI / 2],
    [-98, -8.6, -Math.PI / 2],
    [67.5, -52, 0],
    [84.5, 52, Math.PI],
    [84.5, -124, 0],
    [-67.5, -52, Math.PI],
    [-84.5, 98, 0],
    [22, -84.5, Math.PI / 2],
    [-22, 67.5, -Math.PI / 2],
    [122, -67.5, Math.PI / 2],
    [-122, 84.5, -Math.PI / 2],
    [143.5, -40, 0],
    [143.5, 40, Math.PI],
    [-143.5, -36, 0],
    [-143.5, 36, Math.PI],
    [36, 143.5, Math.PI / 2],
  ];
  const parkedCars: ParkedCarSpec[] = parkedCoords.map(([x, z, rotY], i) => ({
    id: i + 1,
    x,
    z,
    rotY,
    color: carColors[i % carColors.length],
    style: styles[i % styles.length],
  }));

  // 10 Lively Mexican Street-Food Pickup Stands (glowing green rings right at the curb!)
  const pickupSpots: PickupSpot[] = [
    // #1 super inviting right outside the Glorieta near OXXO on start!
    {
      id: 1,
      x: 5.5,
      z: -32,
      cartX: 12.2,
      cartZ: -32,
      cartRotY: -Math.PI / 2,
      dishId: 'tacos',
      standName: 'EL PASTOR',
      awningColor: '#E63946',
      radius: 5.2,
    },
    {
      id: 2,
      x: -36,
      z: 5.2,
      cartX: -36,
      cartZ: 12.2,
      cartRotY: Math.PI,
      dishId: 'tortillas',
      standName: 'TORTILLERÍA',
      awningColor: '#F59E0B',
      radius: 5.2,
    },
    {
      id: 3,
      x: 34,
      z: -5.2,
      cartX: 43,
      cartZ: -12.6,
      cartRotY: 0,
      dishId: 'esquites',
      standName: 'ESQUITES',
      awningColor: '#0EA5E9',
      radius: 5.4,
    },
    {
      id: 4,
      x: -5.5,
      z: 62,
      cartX: -12.2,
      cartZ: 62,
      cartRotY: Math.PI / 2,
      dishId: 'tamales',
      standName: 'TAMALES',
      awningColor: '#16A34A',
      radius: 5.2,
    },
    {
      id: 5,
      x: 71,
      z: -20,
      cartX: 64,
      cartZ: -20,
      cartRotY: Math.PI / 2,
      dishId: 'tacos',
      standName: 'TAQUERÍA',
      awningColor: '#EC4899',
      radius: 5.2,
    },
    {
      id: 6,
      x: -71,
      z: -16,
      cartX: -64,
      cartZ: -16,
      cartRotY: -Math.PI / 2,
      dishId: 'esquites',
      standName: 'ELOTES HOT',
      awningColor: '#EAB308',
      radius: 5.2,
    },
    {
      id: 7,
      x: 16,
      z: -71,
      cartX: 16,
      cartZ: -64,
      cartRotY: Math.PI,
      dishId: 'tortillas',
      standName: 'LA MASA',
      awningColor: '#F97316',
      radius: 5.2,
    },
    {
      id: 8,
      x: 18,
      z: 81,
      cartX: 18,
      cartZ: 88,
      cartRotY: 0,
      dishId: 'tamales',
      standName: 'OAXAQUEÑOS',
      awningColor: '#10B981',
      radius: 5.2,
    },
    {
      id: 9,
      x: 81,
      z: 96,
      cartX: 88,
      cartZ: 96,
      cartRotY: -Math.PI / 2,
      dishId: 'tacos',
      standName: 'LOS GÜEROS',
      awningColor: '#E11D48',
      radius: 5.2,
    },
    {
      id: 10,
      x: -112,
      z: -71,
      cartX: -112,
      cartZ: -64,
      cartRotY: Math.PI,
      dishId: 'tortillas',
      standName: 'DOÑA LUPE',
      awningColor: '#8B5CF6',
      radius: 5.2,
    },
  ];

  // 12 Radiant Golden-Beam Delivery Houses across the vibrant city
  const deliverySpots: DeliverySpot[] = [
    { id: 1, x: 81, z: -56, houseX: 89.5, houseZ: -56, facingRotY: -Math.PI / 2, label: 'Casa Azul', radius: 6.0 },
    { id: 2, x: -58, z: -81, houseX: -58, houseZ: -89.5, facingRotY: 0, label: 'Casa Bugambilia', radius: 6.0 },
    { id: 3, x: 56, z: 71, houseX: 56, houseZ: 62.5, facingRotY: Math.PI, label: 'Casa Sol', radius: 6.0 },
    { id: 4, x: -81, z: 58, houseX: -89.5, houseZ: 58, facingRotY: Math.PI / 2, label: 'Casa Frida', radius: 6.0 },
    { id: 5, x: 118, z: -5.5, houseX: 118, houseZ: -13.5, facingRotY: 0, label: 'Casa Coral', radius: 6.0 },
    { id: 6, x: -120, z: 5.5, houseX: -120, houseZ: 13.5, facingRotY: Math.PI, label: 'Casa Mirador', radius: 6.0 },
    { id: 7, x: -5.5, z: -126, houseX: -13.5, houseZ: -126, facingRotY: Math.PI / 2, label: 'Casa Norte', radius: 6.0 },
    { id: 8, x: 5.5, z: 118, houseX: 13.5, houseZ: 118, facingRotY: -Math.PI / 2, label: 'Casa Sur', radius: 6.0 },
    { id: 9, x: 146, z: -98, houseX: 138, houseZ: -98, facingRotY: Math.PI / 2, label: 'Villa Palma', radius: 6.0 },
    { id: 10, x: -146, z: 98, houseX: -138, houseZ: 98, facingRotY: -Math.PI / 2, label: 'Quinta Rosa', radius: 6.0 },
    { id: 11, x: 108, z: 146, houseX: 108, houseZ: 138, facingRotY: Math.PI, label: 'Casa Jade', radius: 6.0 },
    { id: 12, x: -102, z: -146, houseX: -102, houseZ: -138, facingRotY: 0, label: 'Casa Cielito', radius: 6.0 },
  ];

  // Circulating classic Mexican Combis (green/white peseros!) smoothly driving wide avenues + circling Glorieta!
  const combiRoutes: CombiRoute[] = [
    // Circular Glorieta cruisers (iconic living heart of the city!)
    { id: 1, kind: 'ring', ringRadius: 19.2, initialPos: 0.4, speed: 9.2, stripeColor: 0x10a352 },
    { id: 2, kind: 'ring', ringRadius: 19.2, initialPos: 3.55, speed: 9.2, stripeColor: 0x0d9448 },

    // Main horizontal Z = -76 (both ways)
    { id: 3, kind: 'line', axis: 'x', fixedCoord: -81.2, dir: 1, minPos: -156, maxPos: 156, initialPos: -88, speed: 14.5, stripeColor: 0x10a352 },
    { id: 4, kind: 'line', axis: 'x', fixedCoord: -70.8, dir: -1, minPos: -156, maxPos: 156, initialPos: 95, speed: 13.2, stripeColor: 0x14b862 },

    // Main horizontal Z = +76
    { id: 5, kind: 'line', axis: 'x', fixedCoord: 70.8, dir: 1, minPos: -156, maxPos: 156, initialPos: -40, speed: 13.8, stripeColor: 0x10a352 },
    { id: 6, kind: 'line', axis: 'x', fixedCoord: 81.2, dir: -1, minPos: -156, maxPos: 156, initialPos: 112, speed: 15.0, stripeColor: 0x0e9f52 },

    // Central horizontal Z = 0 outer stretches (never drives through Glorieta statue)
    { id: 7, kind: 'line', axis: 'x', fixedCoord: -4.8, dir: -1, minPos: 34, maxPos: 154, initialPos: 86, speed: 12.6, stripeColor: 0x10a352 },
    { id: 8, kind: 'line', axis: 'x', fixedCoord: 4.8, dir: 1, minPos: -154, maxPos: -34, initialPos: -110, speed: 12.8, stripeColor: 0x16a34a },

    // Vertical X = +76 (both ways)
    { id: 9, kind: 'line', axis: 'z', fixedCoord: 81.2, dir: 1, minPos: -156, maxPos: 156, initialPos: -102, speed: 14.2, stripeColor: 0x10a352 },
    { id: 10, kind: 'line', axis: 'z', fixedCoord: 70.8, dir: -1, minPos: -156, maxPos: 156, initialPos: 98, speed: 13.5, stripeColor: 0x12ad59 },

    // Vertical X = -76
    { id: 11, kind: 'line', axis: 'z', fixedCoord: -70.8, dir: 1, minPos: -156, maxPos: 156, initialPos: -60, speed: 14.0, stripeColor: 0x10a352 },
    { id: 12, kind: 'line', axis: 'z', fixedCoord: -81.2, dir: -1, minPos: -156, maxPos: 156, initialPos: 88, speed: 13.0, stripeColor: 0x16a34a },

    // Outer perimeter scenic avenues
    { id: 13, kind: 'line', axis: 'x', fixedCoord: -148, dir: 1, minPos: -154, maxPos: 154, initialPos: -30, speed: 15.5, stripeColor: 0x10a352 },
    { id: 14, kind: 'line', axis: 'x', fixedCoord: 148, dir: -1, minPos: -154, maxPos: 154, initialPos: 45, speed: 15.2, stripeColor: 0x10a352 },
  ];

  return {
    blocks,
    colliders,
    ramps,
    topes,
    baches,
    parkedCars,
    pickupSpots,
    deliverySpots,
    combiRoutes,
    sideMarkets,
    banners,
    palms,
    // Spawn proudly just south of the Glorieta facing north: sees Glorieta monument, glowing OXXO NE corner, green taco ring, swaying papel picado, cruising combis!
    playerSpawn: { x: 0, z: 33, rotY: 0 },
  };
}

/**
 * Checks whether position (x, z) sits atop a construction ramp, returning slope height & metadata.
 */
export function sampleRamp(
  layout: CityLayout,
  x: number,
  z: number
): { ramp: RampSpec; height: number; progress: number } | null {
  for (const r of layout.ramps) {
    const dx = x - r.x;
    const dz = z - r.z;
    // Project onto ramp forward direction (dirX, dirZ) and perpendicular side axis
    const along = dx * r.dirX + dz * r.dirZ;
    const perp = dx * -r.dirZ + dz * r.dirX;
    const halfL = r.length * 0.5;
    const halfW = r.width * 0.5 + 0.35;
    if (along >= -halfL && along <= halfL && Math.abs(perp) <= halfW) {
      const progress = (along + halfL) / r.length; // 0 low lip -> 1 high launch tip
      return { ramp: r, height: progress * r.height, progress };
    }
  }
  return null;
}

/**
 * Checks if a coordinate is close to a clean road and safe for instant crash respawn.
 */
export function findSafeRoadPosition(
  layout: CityLayout,
  x: number,
  z: number
): { x: number; z: number } {
  // Clamp inside world
  let sx = Math.max(-WORLD_LIMIT + 6, Math.min(WORLD_LIMIT - 6, x));
  let sz = Math.max(-WORLD_LIMIT + 6, Math.min(WORLD_LIMIT - 6, z));

  // Push outside Glorieta center fountain
  const d0 = Math.hypot(sx, sz);
  if (d0 < GLORIETA_ISLAND_R + 4.2) {
    const ang = d0 > 0.01 ? Math.atan2(sz, sx) : Math.PI / 2;
    sx = Math.cos(ang) * (GLORIETA_ISLAND_R + 5.2);
    sz = Math.sin(ang) * (GLORIETA_ISLAND_R + 5.2);
  }

  // Push away from buildings if somehow tucked against one
  for (const b of layout.colliders) {
    const padX = b.w * 0.5 + 3.2;
    const padZ = b.d * 0.5 + 3.2;
    if (Math.abs(sx - b.x) < padX && Math.abs(sz - b.z) < padZ) {
      const ox = padX - Math.abs(sx - b.x);
      const oz = padZ - Math.abs(sz - b.z);
      if (ox < oz) sx += sx >= b.x ? ox : -ox;
      else sz += sz >= b.z ? oz : -oz;
    }
  }

  // Nudge safely clear of any directly underneath tope / bache / stall / parked car
  for (const t of layout.topes) {
    if (Math.hypot(sx - t.x, sz - t.z) < 4.5) {
      if (t.acrossX) sz += sz >= t.z ? 4.2 : -4.2;
      else sx += sx >= t.x ? 4.2 : -4.2;
    }
  }
  for (const b of layout.baches) {
    const dist = Math.hypot(sx - b.x, sz - b.z);
    if (dist < b.radius + 2.5) {
      sx += 3.6;
    }
  }
  for (const r of layout.ramps) {
    if (Math.hypot(sx - r.stallX, sz - r.stallZ) < 5.5) {
      sx += -r.dirZ * 6.5;
      sz += r.dirX * 6.5;
    }
  }

  return {
    x: Math.max(-WORLD_LIMIT + 8, Math.min(WORLD_LIMIT - 8, sx)),
    z: Math.max(-WORLD_LIMIT + 8, Math.min(WORLD_LIMIT - 8, sz)),
  };
}
