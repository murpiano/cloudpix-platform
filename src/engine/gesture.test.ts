import { describe, expect, it } from 'vitest';
import { createGesture } from './gesture';
import type { PointerInput } from './gesture';

const touch = (id: number, x: number, y: number): PointerInput => ({
  id,
  x,
  y,
  mouse: false,
  button: 0,
  buttons: 1,
});

const mouse = (x: number, y: number, button = 0, buttons = 1): PointerInput => ({
  id: 1,
  x,
  y,
  mouse: true,
  button,
  buttons,
});

describe('review findings', () => {
  it('still counts a drag when a second finger joins it for a pinch', () => {
    // drag, pinch, lift both: the Earth must pick its spin back up (spec 3.1)
    const gesture = createGesture();
    gesture.down(touch(1, 100, 100));
    gesture.move(touch(1, 120, 100));
    gesture.down(touch(2, 300, 100));
    gesture.move(touch(2, 350, 100));
    gesture.up(touch(2, 350, 100));
    expect(gesture.up(touch(1, 120, 100))).toEqual({ dragged: true });
  });

  it('ignores a mouse button other than the main one', () => {
    const gesture = createGesture();
    expect(gesture.down(mouse(100, 100, 2, 2))).toBe('ignored');
    expect(gesture.dragging).toBe(false);
    expect(gesture.move(mouse(150, 100, -1, 0))).toEqual({ kind: 'idle' });
  });

  it('lets go when the mouse moves with no button held, as after a context menu', () => {
    const gesture = createGesture();
    gesture.down(mouse(100, 100));
    gesture.move(mouse(120, 100));
    expect(gesture.move(mouse(140, 100, -1, 0))).toEqual({ kind: 'release', dragged: true });
    expect(gesture.dragging).toBe(false);
  });
});

describe('review findings, part 2', () => {
  it('never takes a pinch for a tap', () => {
    const gesture = createGesture();
    gesture.down(touch(1, 100, 100));
    gesture.down(touch(2, 200, 100));
    gesture.move(touch(2, 260, 100));
    gesture.up(touch(2, 260, 100));
    expect(gesture.up(touch(1, 100, 100))).toEqual({ dragged: true });
  });
});

describe('createGesture', () => {
  it('turns a press that moves more than 5 px into a drag', () => {
    const gesture = createGesture();
    expect(gesture.down(touch(1, 100, 100))).toBe('drag');
    expect(gesture.move(touch(1, 103, 100))).toEqual({ kind: 'idle' });
    expect(gesture.move(touch(1, 110, 100))).toEqual({ kind: 'drag', started: true, dx: 7, dy: 0 });
    expect(gesture.move(touch(1, 110, 104))).toEqual({
      kind: 'drag',
      started: false,
      dx: 0,
      dy: 4,
    });
    expect(gesture.up(touch(1, 110, 104))).toEqual({ dragged: true });
    expect(gesture.dragging).toBe(false);
  });

  it('treats a press that stays put as a tap', () => {
    const gesture = createGesture();
    gesture.down(touch(1, 100, 100));
    gesture.move(touch(1, 102, 101));
    expect(gesture.up(touch(1, 102, 101))).toEqual({ dragged: false });
  });

  it('zooms with two fingers by the change of their spread', () => {
    const gesture = createGesture();
    gesture.down(touch(1, 100, 100));
    expect(gesture.down(touch(2, 200, 100))).toBe('pinch');
    expect(gesture.move(touch(2, 300, 100))).toEqual({ kind: 'pinch', scale: 2 });
    expect(gesture.up(touch(2, 300, 100))).toBeNull();
    expect(gesture.dragging).toBe(true);
  });

  it('keeps dragging with the finger that stays, without a jump', () => {
    const gesture = createGesture();
    gesture.down(touch(1, 100, 100));
    gesture.down(touch(2, 200, 100));
    gesture.move(touch(1, 90, 100));
    gesture.up(touch(2, 200, 100));
    const next = gesture.move(touch(1, 80, 100));
    expect(next.kind === 'drag' && next.dx).toBe(-10);
  });

  it('ignores pointers it never saw go down', () => {
    const gesture = createGesture();
    expect(gesture.move(touch(7, 10, 10))).toEqual({ kind: 'idle' });
    expect(gesture.up(touch(7, 10, 10))).toBeNull();
  });
});
