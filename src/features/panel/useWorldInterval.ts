import { useEffect, useRef } from 'react';
import { frameStep } from '@/engine/clock';
import { tickInterval } from '@/lib/interval';
import { appStore } from '@/state/app-state';

/** Calls back every `ms` of world time while `active`; starts over when `resetKey` changes. */
export const useWorldInterval = (
  callback: () => void,
  ms: number,
  active: boolean,
  resetKey: unknown,
): void => {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!active) return;
    let elapsed = 0;
    let last: number | null = null;
    let id = 0;
    const frame = (time: number) => {
      const { dt } = frameStep(time, last, appStore.get().paused);
      last = time;
      const [next, fired] = tickInterval(elapsed, dt, ms);
      elapsed = next;
      if (fired) saved.current();
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [ms, active, resetKey]);
};
