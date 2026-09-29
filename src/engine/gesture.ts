/** A press becomes a drag after this many px. */
export const DRAG_THRESHOLD = 5;

/** What the gesture needs from a pointer event. */
export interface PointerInput {
  id: number;
  x: number;
  y: number;
  mouse: boolean;
  /** The button that changed (0 main, 2 secondary). */
  button: number;
  /** The buttons held now, as a bit mask. */
  buttons: number;
}

export type GestureMove =
  | { kind: 'idle' }
  /** Two fingers: the zoom factor since the second finger went down. */
  | { kind: 'pinch'; scale: number }
  /** One pointer: px moved since its last event; `started` on the move that crosses the threshold. */
  | { kind: 'drag'; started: boolean; dx: number; dy: number }
  /** The mouse moved with no button held: its release never arrived (a context menu ate it). */
  | ({ kind: 'release' } & GestureRelease);

export interface GestureRelease {
  /** Whether the pointers moved far enough to count as a drag, rather than a tap. */
  dragged: boolean;
}

/**
 * The pointer state machine of the globe: one pointer drags, two pinch, lifting the last one
 * releases. Pure, so the engine applies its answers and the tests can play whole gestures.
 */
export const createGesture = () => {
  const pointers = new Map<number, [number, number]>();
  let moved = false;
  let downAt: [number, number] = [0, 0];
  let pinchFrom: number | null = null;

  const spread = (): number => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0;
  };

  return {
    /** Whether any pointer is down. */
    get dragging(): boolean {
      return pointers.size > 0;
    },

    /** 'pinch' when this pointer is the second finger; 'ignored' for a mouse button but the main one. */
    down(pointer: PointerInput): 'drag' | 'pinch' | 'ignored' {
      if (pointer.mouse && pointer.button !== 0) return 'ignored';
      // a new gesture starts with the first pointer; a finger that joins it keeps its drag
      if (pointers.size === 0) moved = false;
      pointers.set(pointer.id, [pointer.x, pointer.y]);
      downAt = [pointer.x, pointer.y];
      if (pointers.size === 2) {
        // a pinch is never a tap
        moved = true;
        pinchFrom = spread();
        return 'pinch';
      }
      return 'drag';
    },

    move(pointer: PointerInput): GestureMove {
      const previous = pointers.get(pointer.id);
      if (!previous) return { kind: 'idle' };
      if (pointer.mouse && pointer.buttons === 0) {
        pointers.delete(pointer.id);
        pinchFrom = null;
        return { kind: 'release', dragged: moved };
      }
      pointers.set(pointer.id, [pointer.x, pointer.y]);

      if (pinchFrom !== null && pointers.size === 2) {
        return { kind: 'pinch', scale: spread() / pinchFrom };
      }

      let started = false;
      if (!moved && Math.hypot(pointer.x - downAt[0], pointer.y - downAt[1]) > DRAG_THRESHOLD) {
        moved = true;
        started = true;
      }
      if (!moved) return { kind: 'idle' };
      return { kind: 'drag', started, dx: pointer.x - previous[0], dy: pointer.y - previous[1] };
    },

    /** The release when the last pointer lifts, otherwise null. */
    up(pointer: PointerInput): GestureRelease | null {
      if (!pointers.delete(pointer.id)) return null;
      if (pointers.size < 2) pinchFrom = null;
      if (pointers.size > 0) return null;
      return { dragged: moved };
    },
  };
};

export type Gesture = ReturnType<typeof createGesture>;
