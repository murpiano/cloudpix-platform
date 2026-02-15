export interface SpherePoint {
  x: number;
  y: number;
  z: number;
  /** Latitude in degrees, used to tilt the card towards the viewer. */
  lat: number;
  /** Longitude in degrees, used to turn the card outwards. */
  lon: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TO_DEG = 180 / Math.PI;

/** Evenly spreads `count` points over a unit sphere (Fibonacci lattice). */
export const fibonacciSphere = (count: number): SpherePoint[] =>
  Array.from({ length: count }, (_, i) => {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE;
    const x = Math.cos(theta) * ring;
    const z = Math.sin(theta) * ring;

    return { x, y, z, lat: Math.asin(y) * TO_DEG, lon: Math.atan2(x, z) * TO_DEG };
  });

export interface OrbitMetrics {
  radius: number;
  cardWidth: number;
  perspective: number;
  decodeMax: number;
}

/** Sphere size, card size and camera settings for a viewport. */
export const orbitMetrics = (width: number, height: number): OrbitMetrics => {
  const tier = width <= 380 ? 0 : width <= 640 ? 1 : 2;

  const heightRatio = [0.38, 0.42, 0.46][tier] as number;
  const widthRatio = [0.48, 0.52, 0.58][tier] as number;
  const minRadius = [108, 120, 155][tier] as number;
  const cardScale = [0.44, 0.46, 0.47][tier] as number;

  const radius = Math.max(minRadius, Math.min(480, height * heightRatio, width * widthRatio));

  return {
    radius,
    cardWidth: Math.round(Math.max(72, radius * cardScale)),
    perspective: width <= 380 ? 620 : width <= 640 ? 760 : width <= 900 ? 920 : 1150,
    decodeMax: width <= 380 ? 420 : width <= 640 ? 520 : width <= 900 ? 640 : 760,
  };
};
