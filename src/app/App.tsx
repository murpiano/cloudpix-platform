import { useEffect, useState } from 'react';
import { GlobeStage } from '@/features/globe/GlobeStage';
import { Header } from '@/features/header/Header';
import { loadWorld } from './boot';
import type { World } from './boot';
import './app.scss';

type Boot = { status: 'loading' } | { status: 'ready'; world: World } | { status: 'failed' };

export function App() {
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    loadWorld().then(
      (world) => {
        if (live) setBoot({ status: 'ready', world });
      },
      (error: unknown) => {
        console.error(error);
        if (live) setBoot({ status: 'failed' });
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      {boot.status === 'ready' && <GlobeStage world={boot.world} />}
      {boot.status === 'loading' && <p className="boot">Loading the map…</p>}
      {boot.status === 'failed' && (
        <div className="boot" role="alert">
          <p>The map did not load.</p>
          <button type="button" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      )}
      <Header />
    </>
  );
}
