import './splash.scss';
import { Timing } from '@/config';
import { byId, wait } from '@/lib/dom';

const FADE_MS = 950;

export interface Splash {
  progress(value: number): void;
  status(text: string): void;
  fail(onRetry: () => void): void;
  /** Resolves once the splash has been up long enough and started fading. */
  finish(): Promise<void>;
}

export const createSplash = (): Splash => {
  const root = byId('splash');
  const bar = byId('splashBar');
  const tag = byId('splashTag');
  const failBox = byId('splashFail');
  const retry = byId<HTMLButtonElement>('splashRetry');
  const bornAt = performance.now();
  const defaultTag = tag.textContent ?? '';

  let shown = 0;

  return {
    progress(value) {
      shown = Math.max(shown, Math.min(1, value));
      bar.style.transform = `scaleX(${shown})`;
    },

    status(text) {
      tag.textContent = text || defaultTag;
    },

    fail(onRetry) {
      failBox.hidden = false;
      tag.textContent = defaultTag;
      retry.focus();
      retry.addEventListener(
        'click',
        () => {
          failBox.hidden = true;
          onRetry();
        },
        { once: true },
      );
    },

    async finish() {
      this.progress(1);
      await wait(Math.max(0, Timing.SPLASH_MIN - (performance.now() - bornAt)) + 250);
      root.classList.add('out');
      setTimeout(() => root.remove(), FADE_MS);
    },
  };
};
