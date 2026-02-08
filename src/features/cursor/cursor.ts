import './cursor.scss';
import { byId } from '@/lib/dom';
import { lerp } from '@/lib/math';

const FOLLOW = 0.2;
const WIDE_TARGETS = '.card, a, button, label, .tile, input[type="range"]';

/** Trailing dot that grows over interactive things. Fine pointers only. */
export const initCursor = (): void => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return;
  }

  const dot = byId('cursor');
  const target = { x: innerWidth / 2, y: innerHeight / 2 };
  const position = { ...target };

  addEventListener(
    'pointermove',
    (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      dot.classList.add('is-on');
    },
    { passive: true },
  );

  document.addEventListener('pointerover', (event) => {
    const wide = event.target instanceof Element && event.target.closest(WIDE_TARGETS) !== null;
    dot.classList.toggle('wide', wide);
  });

  document.documentElement.addEventListener('pointerleave', () => dot.classList.remove('is-on'));

  const follow = (): void => {
    position.x = lerp(position.x, target.x, FOLLOW);
    position.y = lerp(position.y, target.y, FOLLOW);
    dot.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    requestAnimationFrame(follow);
  };

  follow();
};
