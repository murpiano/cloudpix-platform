import { ease } from '@/lib/easing';

/**
 *   plain    nothing is active on the timeline: a small pale dot
 *   grey     a range is picked and the place is outside it
 *   blue     inside the picked range, not reached yet
 *   yellow   reached: on the timeline up to the trip in focus
 *   current  the place in focus after the plane lands: brightest and bigger
 */
export type PlaceState = 'plain' | 'grey' | 'blue' | 'yellow' | 'current';

/** How a light looks: blue tint, warmth of the dot, glow (each 0..1), and a size factor. */
export interface PlaceLook {
  blue: number;
  warm: number;
  glow: number;
  size: number;
}

export const PLACE_LOOK: Readonly<Record<PlaceState, PlaceLook>> = {
  plain: { blue: 0, warm: 0.55, glow: 0, size: 0.7 },
  grey: { blue: 0, warm: 0, glow: 0, size: 0.6 },
  blue: { blue: 1, warm: 1, glow: 0.5, size: 0.9 },
  yellow: { blue: 0, warm: 1, glow: 0.72, size: 1 },
  current: { blue: 0, warm: 1, glow: 1, size: 1.45 },
};

export interface PlaceFacts {
  focused: boolean;
  reached: boolean;
  inRange: boolean;
  rangeActive: boolean;
}

export const placeState = ({ focused, reached, inRange, rangeActive }: PlaceFacts): PlaceState =>
  focused ? 'current' : reached ? 'yellow' : inRange ? 'blue' : rangeActive ? 'grey' : 'plain';

/** Each 60 Hz frame keeps this share of the gap: the change settles in about 0.4 s. */
export const LOOK_EASE = 0.9;
/** Extra glow under the cursor. */
export const HOVER_GLOW = 0.25;

export const stepLook = (
  look: PlaceLook,
  state: PlaceState,
  f: number,
  hovered: boolean,
): PlaceLook => {
  const target = PLACE_LOOK[state];
  return {
    blue: ease(look.blue, target.blue, f, LOOK_EASE),
    warm: ease(look.warm, target.warm, f, LOOK_EASE),
    glow: ease(look.glow, Math.min(1, target.glow + (hovered ? HOVER_GLOW : 0)), f, LOOK_EASE),
    size: ease(look.size, target.size, f, LOOK_EASE),
  };
};
