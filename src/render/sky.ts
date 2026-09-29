import { DEG } from '@/lib/math';
import { seeded } from '@/lib/random';

/** The star field is a little larger than the screen, so it can drift. */
export const STAR_PAD = 30;

interface Twinkler {
  x: number;
  y: number;
  size: number;
  period: number;
  phase: number;
  tint: boolean;
}

interface Meteor {
  kind: 'meteor';
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  age: number;
  life: number;
}

interface Satellite {
  kind: 'satellite';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  age: number;
  life: number;
}

export type SkyEvent = Meteor | Satellite;

/**
 * The sky is alive, barely: the stars drift, a few twinkle, now and then a star falls or a
 * satellite crosses. It runs on the world clock, so it waits while the world is paused.
 */
export interface Sky {
  width: number;
  height: number;
  twinklers: Twinkler[];
  events: SkyEvent[];
  nextEventIn: number;
}

export const createSky = (width: number, height: number, mobile: boolean): Sky => {
  const random = seeded(29);
  const twinklers = Array.from({ length: mobile ? 18 : 34 }, () => ({
    x: random() * width,
    y: random() * height,
    size: 0.6 + random(),
    period: 900 + random() * 2600,
    phase: random() * 7,
    tint: random() < 0.3,
  }));
  return { width, height, twinklers, events: [], nextEventIn: 5000 };
};

const meteor = ({ width, height }: Sky, random: () => number): Meteor => {
  const direction = random() < 0.5 ? -1 : 1;
  const angle = (20 + random() * 25) * DEG;
  return {
    kind: 'meteor',
    x: width * (0.15 + random() * 0.7),
    y: height * random() * 0.35,
    dx: Math.cos(angle) * direction,
    dy: Math.sin(angle),
    speed: 0.2 + random() * 0.1,
    age: 0,
    life: 2300 + random() * 900,
  };
};

const satellite = ({ width, height }: Sky, random: () => number): Satellite => {
  const fromLeft = random() < 0.5;
  const y0 = height * (0.08 + random() * 0.5);
  return {
    kind: 'satellite',
    x0: fromLeft ? -10 : width + 10,
    y0,
    x1: fromLeft ? width + 10 : -10,
    y1: y0 + (random() - 0.5) * height * 0.4,
    age: 0,
    life: 16000 + random() * 8000,
  };
};

/** Every 7–20 s either a slow meteor (about 2.5 s) or a satellite (16–24 s) crosses. */
export const stepSky = (sky: Sky, dt: number, random: () => number = Math.random): void => {
  // age the events first, so a new one starts at age 0 however long the step
  for (const event of sky.events) {
    event.age += dt;
  }
  sky.events = sky.events.filter((event) => event.age < event.life);

  sky.nextEventIn -= dt;
  if (sky.nextEventIn <= 0) {
    sky.nextEventIn = 7000 + random() * 13000;
    sky.events.push(random() < 0.6 ? meteor(sky, random) : satellite(sky, random));
  }
};

/** The still stars, drawn once per resize on a canvas `STAR_PAD` larger on every side. */
export const drawStarField = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void => {
  const random = seeded(3);
  ctx.fillStyle = '#04060d';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 560; i++) {
    ctx.globalAlpha = 0.15 + random() * 0.75;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, random() * 1.1, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

/** Offset of the star field in px: a very slow drift. */
export const starDrift = (now: number): [number, number] => [
  Math.sin(now / 47000) * 18,
  Math.cos(now / 61000) * 12,
];

export const drawSky = (ctx: CanvasRenderingContext2D, sky: Sky, now: number): void => {
  ctx.clearRect(0, 0, sky.width, sky.height);

  for (const star of sky.twinklers) {
    const alpha = 0.08 + 0.7 * ((1 + Math.sin(now / star.period + star.phase)) / 2) ** 4;
    ctx.fillStyle = star.tint ? `rgba(190,215,255,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, 2 * Math.PI);
    ctx.fill();
    if (alpha > 0.5) {
      // a glint when it is at its brightest
      const arm = star.size * 4;
      ctx.strokeStyle = `rgba(255,255,255,${(alpha - 0.5) * 0.7})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(star.x - arm, star.y);
      ctx.lineTo(star.x + arm, star.y);
      ctx.moveTo(star.x, star.y - arm);
      ctx.lineTo(star.x, star.y + arm);
      ctx.stroke();
    }
  }

  for (const event of sky.events) {
    const k = event.age / event.life;
    if (event.kind === 'meteor') {
      const distance = event.age * event.speed;
      const hx = event.x + event.dx * distance;
      const hy = event.y + event.dy * distance;
      const length = 90 + 60 * Math.sin(Math.PI * k);
      const alpha = Math.sin(Math.PI * k) * 0.85;
      const tail = ctx.createLinearGradient(hx, hy, hx - event.dx * length, hy - event.dy * length);
      tail.addColorStop(0, `rgba(255,255,255,${alpha})`);
      tail.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.strokeStyle = tail;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - event.dx * length, hy - event.dy * length);
      ctx.stroke();
    } else {
      const x = event.x0 + (event.x1 - event.x0) * k;
      const y = event.y0 + (event.y1 - event.y0) * k;
      const flash = Math.sin(event.age / 260) > 0.92 ? 0.25 : 0;
      const alpha = Math.min(1, k * 8, (1 - k) * 8) * (0.45 + flash);
      ctx.fillStyle = `rgba(230,238,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
};
