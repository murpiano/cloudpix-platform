import { useEffect, useRef, useState } from 'react';
import './splash.scss';

/** The intro takes at least this long: the last line has finished appearing by then. */
const MIN_MS = 4000;
/** After the world is let in, this long to build it while the screen stands still. */
const BUILD_MS = 700;
/** The title and the line fly to the header this long; the rest fades in the same time. */
const FLIGHT_MS = 1300;
const EASE = 'cubic-bezier(0.65, 0, 0.25, 1)';

/** Where a piece of text stands on the screen, as a box. */
const textBox = (node: Node): DOMRect => {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
};

/** Sends a splash text to where its twin stands in the header. */
const fly = (from: HTMLElement, to: DOMRect, color?: string) => {
  const at = from.getBoundingClientRect();
  if (at.width === 0 || to.width === 0) return;
  const dx = to.left + to.width / 2 - (at.left + at.width / 2);
  const dy = to.top + to.height / 2 - (at.top + at.height / 2);
  const scale = to.width / at.width;
  from.animate(
    [
      { transform: 'none', opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.7 },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        opacity: 0,
        offset: 1,
        ...(color ? { color } : {}),
      },
    ],
    { duration: FLIGHT_MS, easing: EASE, fill: 'forwards' },
  );
};

/**
 * The first screen: the name, the line under it, a loading bar and the credit. When the world is
 * ready the name and the line fly to their places in the header while the rest fades away.
 * `onRelease` lets the world in; the screen stands still while it is built.
 */
export function Splash({ ready, onRelease }: { ready: boolean; onRelease: () => void }) {
  const [waited, setWaited] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);
  const released = ready && waited;

  // the header's own name waits for the flight to arrive
  useEffect(() => {
    document.documentElement.dataset.splash = 'on';
    return () => {
      delete document.documentElement.dataset.splash;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!released) return;
    onRelease();
    const timer = setTimeout(() => setLeaving(true), BUILD_MS);
    return () => clearTimeout(timer);
  }, [released, onRelease]);

  useEffect(() => {
    if (!leaving) return;
    const brand = document.querySelector('.header__brand');
    const small = brand?.querySelector('small');
    const name = brand?.firstChild;
    if (title.current && name) fly(title.current, textBox(name), 'var(--text)');
    if (tagline.current && small)
      fly(tagline.current, small.getBoundingClientRect(), 'var(--muted)');
    const arrive = setTimeout(
      () => delete document.documentElement.dataset.splash,
      FLIGHT_MS * 0.6,
    );
    const done = setTimeout(() => setGone(true), FLIGHT_MS + 100);
    return () => {
      clearTimeout(arrive);
      clearTimeout(done);
    };
  }, [leaving]);

  if (gone) return null;
  return (
    <div className={`splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Loading">
      <div className="splash__veil" />
      <h1 className="splash__title" ref={title}>
        My World
      </h1>
      <p className="splash__tagline" ref={tagline}>
        Memories of the places I&apos;ve been.
      </p>
      <div className={`splash__bar${released ? ' is-full' : ''}`}>
        <div className="splash__fill" />
      </div>
      <p className="splash__credit">
        Design and development by{' '}
        <a href="https://github.com/murpiano" target="_blank" rel="noopener noreferrer">
          murpiano
        </a>
      </p>
    </div>
  );
}
