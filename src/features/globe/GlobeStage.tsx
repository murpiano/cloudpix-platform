import { useEffect, useRef } from 'react';
import type { World } from '@/app/boot';
import { createEngine } from '@/engine/engine';
import type { Director } from '@/tour/director';
import { PlaceLabel } from './PlaceLabel';
import './globe.scss';

/** The three canvases (stars, sky events, globe) and the hover label, driven by the engine. */
export function GlobeStage({ world, director }: { world: World; director: Director }) {
  const stars = useRef<HTMLCanvasElement>(null);
  const sky = useRef<HTMLCanvasElement>(null);
  const globe = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stars.current || !sky.current || !globe.current || !label.current) {
      return;
    }
    const engine = createEngine({
      stars: stars.current,
      sky: sky.current,
      globe: globe.current,
      label: label.current,
      ...world,
      director,
    });
    return () => engine.destroy();
  }, [world, director]);

  return (
    <div className="globe-stage">
      <canvas ref={stars} className="globe-stage__stars" aria-hidden="true" />
      <canvas ref={sky} className="globe-stage__sky" aria-hidden="true" />
      <canvas
        ref={globe}
        className="globe-stage__globe"
        role="img"
        aria-label="A night globe of the places visited. Drag to turn it, scroll to zoom."
      />
      <PlaceLabel ref={label} archive={world.archive} />
    </div>
  );
}
