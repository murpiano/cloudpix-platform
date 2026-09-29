import { useEffect, useState } from 'react';
import { Header } from '@/features/header/Header';
import { loadWorld } from './boot';
import type { World } from './boot';
import { Splash } from './Splash';
import { Stage } from './Stage';
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
      {boot.status === 'ready' && <Stage world={boot.world} />}
      {boot.status !== 'failed' && <Splash ready={boot.status === 'ready'} />}
      {boot.status === 'failed' && (
        <div className="boot" role="alert">
          <p>The map did not load.</p>
          <button type="button" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      )}
      <Header world={boot.status === 'ready' ? boot.world : null} />
    </>
  );
}
