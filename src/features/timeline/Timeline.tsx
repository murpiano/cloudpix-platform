import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useDirector } from '@/app/director-context';
import { goArchive } from '@/features/archive/links';
import type { Archive } from '@/data/archive';
import { monthYear } from '@/lib/dates';
import { appStore } from '@/state/app-state';
import { useStore } from '@/state/store';
import {
  albumTime,
  isReached,
  nearestIndex,
  rangeLabel,
  span,
  stamp,
  timeAt,
  within,
} from '@/timeline/range';
import './timeline.scss';

const NOTE_MS = 1800;
/** A press moves this far before it counts as a drag. */
const PICK_DRAG_PX = 4;

/** ▶ plays; press and drag picks a range; a click picks up to a point; a year picks the year. */
export function Timeline({ archive }: { archive: Archive }) {
  const director = useDirector();
  const range = useStore(appStore, (s) => s.range);
  const picking = useStore(appStore, (s) => s.picking);
  const focus = useStore(appStore, (s) => s.focus);
  const flying = useStore(appStore, (s) => s.flying);
  const endCard = useStore(appStore, (s) => s.endCard);
  const progress = useStore(appStore, (s) => s.progress);
  const playing = useStore(appStore, (s) => s.playing);

  const times = useMemo(() => archive.albums.map(albumTime), [archive]);
  const bounds = useMemo(() => span(times), [times]);
  const [y0, y1] = bounds;
  const years = useMemo(() => Array.from({ length: y1 - y0 }, (_, i) => y0 + i), [y0, y1]);
  const pos = (t: number) => ((t - y0) / (y1 - y0)) * 100;

  const track = useRef<HTMLDivElement>(null);
  const pick = useRef<{ x: number; moved: boolean } | null>(null);
  const noteTimer = useRef(0);
  const [note, setNote] = useState<string | null>(null);
  const [tip, setTip] = useState<{ left: number; text: string } | null>(null);

  const flash = (text: string) => {
    setNote(text);
    clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), NOTE_MS);
  };

  const timeFor = (clientX: number): number => {
    const rect = track.current?.getBoundingClientRect();
    return rect ? timeAt(clientX - rect.left, rect.width, times, bounds) : y0;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pick.current = { x: event.clientX, moved: false };
    director.beginPick(timeFor(event.clientX));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = track.current?.getBoundingClientRect();
    if (rect) {
      const t = y0 + ((event.clientX - rect.left) / rect.width) * (y1 - y0);
      const index = nearestIndex(t, times);
      const album = archive.albums[index];
      if (album) setTip({ left: pos(times[index] ?? y0), text: `${album.city.name} · ${monthYear(album)}` });
    }
    const current = pick.current;
    if (!current) return;
    if (Math.abs(event.clientX - current.x) > PICK_DRAG_PX) current.moved = true;
    director.movePick(timeFor(event.clientX));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = pick.current;
    if (!current) return;
    pick.current = null;
    if (director.endPick(timeFor(event.clientX), current.moved) === 'empty') {
      flash('No albums in that stretch');
    }
  };

  const onPointerCancel = () => {
    pick.current = null;
    director.cancelPick();
  };

  const onYear = (year: number) => {
    const result = director.clickYear(year);
    if (result === 'empty') flash('No albums that year');
    else if (result === 'open') goArchive({ kind: 'year', year });
  };

  const live = picking ?? range;
  const progressState = { on: progress, focus, ahead: flying && endCard === null, range };
  const focusTime = focus >= 0 ? times[focus] : undefined;
  const from = range ? pos(range.lo) : 0;
  const done = progress && focusTime !== undefined ? Math.max(0, pos(focusTime) - from) : 0;
  const count = range ? times.filter((t) => within(t, range)).length : 0;
  const focusYear = archive.albums[focus]?.year;

  let chip: ReactNode = null;
  if (range) {
    chip = (
      <>
        <b>{rangeLabel(range)}</b> {count} album{count === 1 ? '' : 's'} <i>✕</i>
      </>
    );
  } else if (picking) {
    chip = (
      <>
        <b>
          {stamp(picking.lo)} – {stamp(picking.hi)}
        </b>{' '}
        <i>release to pick</i>
      </>
    );
  } else if (note) {
    chip = <i>{note}</i>;
  }

  return (
    <div className="timeline">
      <div className="timeline__chips">
        <button
          type="button"
          className={`timeline__chip${chip ? ' is-on' : ''}`}
          onClick={() => director.clearRange()}
          tabIndex={range ? 0 : -1}
          aria-label={range ? `Clear the range ${rangeLabel(range)}` : undefined}
        >
          {chip}
        </button>
      </div>
      <div className="timeline__row">
        <button
          type="button"
          className="timeline__play"
          onClick={() => director.play()}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div
          ref={track}
          className="timeline__track"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={() => setTip(null)}
        >
          <div
            className={`timeline__band${live ? ' is-on' : ''}${picking ? ' is-pending' : ''}`}
            style={
              live
                ? {
                    left: `calc(${pos(live.lo)}% - 9px)`,
                    width: `calc(${pos(live.hi) - pos(live.lo)}% + 18px)`,
                  }
                : undefined
            }
          />
          <div className="timeline__base" />
          <div className="timeline__done" style={{ left: `${from}%`, width: `${done}%` }} />
          {years.slice(1).map((year) => (
            <div key={`sep-${year}`} className="timeline__sep" style={{ left: `${pos(year)}%` }} />
          ))}
          {times.map((t, k) => {
            const past = isReached(k, t, progressState);
            const inLive = live !== null && within(t, live);
            const classes = [
              'timeline__dot',
              past ? 'is-past' : '',
              !past && inLive ? 'is-ahead' : '',
              live && !inLive && !past ? 'is-out' : '',
            ].join(' ');
            return <div key={k} className={classes} style={{ left: `${pos(t)}%` }} />;
          })}
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={[
                'timeline__year',
                year === focusYear ? 'is-current' : '',
                range && range.lo < year + 1 && range.hi >= year ? 'is-in' : '',
              ].join(' ')}
              style={{ left: `${pos(year + 0.5)}%` }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onYear(year)}
            >
              <span className="timeline__full">{year}</span>
              <span className="timeline__short">’{String(year).slice(2)}</span>
            </button>
          ))}
          <div
            className="timeline__knob"
            style={{
              left: `${focusTime === undefined ? 0 : pos(focusTime)}%`,
              opacity: focusTime === undefined ? 0 : 1,
            }}
          />
          {tip && (
            <div className="timeline__tip" style={{ left: `${tip.left}%` }}>
              {tip.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
