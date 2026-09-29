import { useEffect, useState } from 'react';
import './splash.scss';

/** The splash stays at least this long, so the title has time to arrive. */
const MIN_MS = 3400;
/** The fade that takes it away. */
const LEAVE_MS = 900;

/** The first screen: the name, the line under it, a loading bar and the credit, over the world. */
export function Splash({ ready }: { ready: boolean }) {
  const [waited, setWaited] = useState(false);
  const [gone, setGone] = useState(false);
  const leaving = ready && waited;

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setGone(true), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (gone) return null;
  return (
    <div className={`splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Loading">
      <h1 className="splash__title">My World</h1>
      <p className="splash__tagline">Memories of the places I&apos;ve been.</p>
      <div className="splash__bar">
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
