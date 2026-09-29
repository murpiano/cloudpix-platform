type Point = [number, number];
type Point3 = [number, number, number];

/** Fill names the painter resolves: the roof gradient and the window glass. */
export const ROOF = 'roof';
export const GLASS = 'window';

export interface HousePart {
  d: string;
  fill: string;
}

export interface HouseGeometry {
  /** Offset that puts the foot of the front corner on the origin. */
  ox: number;
  oy: number;
  parts: HousePart[];
  roof: [Point, Point];
  chimney: Point;
  window: Point;
}

/**
 * An isometric house after the reference: a lilac box, a thick purple roof with its ridge running
 * front to back, a 2×2 window on the gable end and a square chimney with an opening on top.
 * Built once in local units (1 unit ≈ 1 px at scale 1).
 */
export const HOUSE: HouseGeometry = (() => {
  const C = Math.cos(Math.PI / 6);
  const S = 0.5;
  const iso = ([x, y, z]: Point3): Point => [(x - y) * C, (x + y) * S - z];
  const d = (...points: Point3[]): string =>
    `M${points.map((p) => iso(p).map((v) => v.toFixed(2)).join(' ')).join('L')}Z`;

  // walls W × D × Hw, ridge height Hr over the middle Dm, eave overhang o, roof thickness th
  const W = 17;
  const D = 14;
  const Hw = 12;
  const Hr = 21;
  const Dm = D / 2;
  const o = 2.2;
  const th = 2.6;
  const xa = -1.2;
  const xb = W + 2;
  const slope = (Hr - Hw) / Dm;
  const ze = Hw - o * slope;
  const roofAt = (y: number) => Hr - Math.abs(y - Dm) * slope;
  const [ox, oy] = iso([W, D, 0]);

  const cx0 = 2;
  const cx1 = 5.6;
  const cy0 = Dm + 0.6;
  const cy1 = Dm + 4;
  const ch = Hr + 5;

  const panes: [number, number][] = [
    [Dm - 3.1, 7.4],
    [Dm + 0.5, 7.4],
    [Dm - 3.1, 3.8],
    [Dm + 0.5, 3.8],
  ];

  return {
    ox,
    oy,
    parts: [
      // the long wall, in the eave's shade
      { d: d([0, D, 0], [W, D, 0], [W, D, Hw], [0, D, Hw]), fill: '#cfc4ef' },
      // the gable end
      { d: d([W, 0, 0], [W, D, 0], [W, D, Hw], [W, Dm, Hr], [W, 0, Hw]), fill: '#efeafd' },
      // the roof plane we see, and its eave edge
      { d: d([xa, Dm, Hr], [xb, Dm, Hr], [xb, D + o, ze], [xa, D + o, ze]), fill: ROOF },
      {
        d: d([xa, D + o, ze], [xb, D + o, ze], [xb, D + o, ze - th], [xa, D + o, ze - th]),
        fill: '#5a43a6',
      },
      // the roof's ends over the gable
      {
        d: d([xb, Dm, Hr], [xb, D + o, ze], [xb, D + o, ze - th], [xb, Dm, Hr - th]),
        fill: '#7c63d4',
      },
      {
        d: d([xb, Dm, Hr], [xb, -o, ze], [xb, -o, ze - th], [xb, Dm, Hr - th]),
        fill: '#8f78e0',
      },
      // the chimney: two sides, the top and its opening
      {
        d: d([cx1, cy0, roofAt(cy0)], [cx1, cy1, roofAt(cy1)], [cx1, cy1, ch], [cx1, cy0, ch]),
        fill: '#9d89e6',
      },
      {
        d: d([cx0, cy1, roofAt(cy1)], [cx1, cy1, roofAt(cy1)], [cx1, cy1, ch], [cx0, cy1, ch]),
        fill: '#7a64cf',
      },
      { d: d([cx0, cy0, ch], [cx1, cy0, ch], [cx1, cy1, ch], [cx0, cy1, ch]), fill: '#6c55c4' },
      {
        d: d(
          [cx0 + 0.8, cy0 + 0.8, ch],
          [cx1 - 0.8, cy0 + 0.8, ch],
          [cx1 - 0.8, cy1 - 0.8, ch],
          [cx0 + 0.8, cy1 - 0.8, ch],
        ),
        fill: '#3b2a7e',
      },
      ...panes.map(([y0, z0]) => ({
        d: d([W, y0, z0], [W, y0 + 2.6, z0], [W, y0 + 2.6, z0 + 3.1], [W, y0, z0 + 3.1]),
        fill: GLASS,
      })),
    ],
    roof: [iso([xa, D + o, ze]), iso([xb, Dm, Hr])],
    chimney: iso([(cx0 + cx1) / 2, (cy0 + cy1) / 2, ch]),
    window: iso([W, Dm, 7.2]),
  };
})();

/** The house on the globe is about half the width of a city label. */
export const HOUSE_SCALE = 0.82;

let paths: { path: Path2D; fill: string }[] | null = null;
const housePaths = () =>
  (paths ??= HOUSE.parts.map((part) => ({ path: new Path2D(part.d), fill: part.fill })));

/** `lit`: 0 dark windows … 1 warm light spilling out. */
export const drawHouse = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  lit: number,
): void => {
  const scale = k * HOUSE_SCALE;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-HOUSE.ox, -HOUSE.oy);
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  const [[rx0, ry0], [rx1, ry1]] = HOUSE.roof;
  const roof = ctx.createLinearGradient(rx0, ry0, rx1, ry1);
  roof.addColorStop(0, '#5b44ab');
  roof.addColorStop(1, '#957fe6');
  const glass = `rgb(${Math.round(75 + 180 * lit)},${Math.round(55 + 155 * lit)},${Math.round(150 - 40 * lit)})`;

  housePaths().forEach(({ path, fill }, index) => {
    // only the first wall casts the shadow
    if (index === 1) ctx.shadowColor = 'transparent';
    ctx.fillStyle = fill === ROOF ? roof : fill === GLASS ? glass : fill;
    ctx.fill(path);
  });

  if (lit > 0.02) {
    const [wx, wy] = HOUSE.window;
    const spill = ctx.createRadialGradient(wx, wy, 0, wx, wy, 14);
    spill.addColorStop(0, `rgba(255,210,120,${0.45 * lit})`);
    spill.addColorStop(1, 'rgba(255,190,100,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.arc(wx, wy, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
};

interface Puff {
  age: number;
  life: number;
  dx: number;
  r: number;
}

export interface Smoke {
  puffs: Puff[];
  /** ms until the next puff. */
  clock: number;
}

export const createSmoke = (): Smoke => ({ puffs: [], clock: 0 });

/** Soft puffs rise, drift and fade; new ones come only while someone is home and time runs. */
export const stepSmoke = (
  smoke: Smoke,
  dt: number,
  lit: number,
  random: () => number = Math.random,
): void => {
  smoke.clock -= dt;
  if (dt > 0 && lit > 0.5 && smoke.clock <= 0) {
    smoke.clock = 150;
    smoke.puffs.push({
      age: 0,
      life: 2800 + random() * 900,
      dx: (random() - 0.5) * 0.3,
      r: 2.2 + random() * 1.4,
    });
  }
  for (const puff of smoke.puffs) {
    puff.age += dt;
  }
  smoke.puffs = smoke.puffs.filter((puff) => puff.age < puff.life);
};

export const drawSmoke = (
  ctx: CanvasRenderingContext2D,
  smoke: Smoke,
  x: number,
  y: number,
  k: number,
): void => {
  const scale = k * HOUSE_SCALE;
  const bx = x + (HOUSE.chimney[0] - HOUSE.ox) * scale;
  const by = y + (HOUSE.chimney[1] - HOUSE.oy) * scale;
  for (const puff of smoke.puffs) {
    const u = puff.age / puff.life;
    const alpha = Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - u) * 0.38;
    const px = bx + ((puff.dx * puff.age) / 16 + Math.sin(puff.age / 420) * 2.5 + u * 10) * k;
    const py = by - (u * 34 + 2) * k;
    const radius = (puff.r + u * 6) * k;
    const cloud = ctx.createRadialGradient(px, py, 0, px, py, radius);
    cloud.addColorStop(0, `rgba(226,224,240,${alpha})`);
    cloud.addColorStop(1, 'rgba(226,224,240,0)');
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
};
