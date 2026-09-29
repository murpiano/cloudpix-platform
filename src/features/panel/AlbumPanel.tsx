import { useEffect, useRef, useState } from 'react';
import type { World } from '@/app/boot';
import { useDirector } from '@/app/director-context';
import type { Archive } from '@/data/archive';
import { cityPhotos, creditLine, photoUrl } from '@/data/photos';
import { photoKey } from '@/data/social';
import { tripOfAlbum } from '@/data/trips';
import type { Album, Credit } from '@/data/types';
import { monthYear } from '@/lib/dates';
import { useInterval } from '@/lib/useInterval';
import { appStore } from '@/state/app-state';
import { openPhoto } from '@/state/layers';
import { settingsStore } from '@/state/settings';
import { useStore } from '@/state/store';
import { cityAlbums, scopedAlbums } from '@/tour/tour';
import type { Tour } from '@/tour/tour';
import cozyRoom from './cozy-room.svg?raw';
import { cardRole, wheelSteps } from './stack';
import type { CardRole } from './stack';
import './panel.scss';

/** Each photo dissolves into the next over this time. */
const DISSOLVE_MS = 1400;
/** A vertical swipe this long turns the albums on a phone. */
const SWIPE_PX = 30;

/** The left column: the place in focus, its albums and its caption; hidden with nothing in focus. */
export function AlbumPanel({ world }: { world: World }) {
  const { archive } = world;
  const focus = useStore(appStore, (s) => s.focus);
  const endCard = useStore(appStore, (s) => s.endCard);
  const tour = useStore(appStore, (s) => s.tour);
  const album = archive.albums[focus];
  const scope = tour ?? endCard?.tour ?? null;
  const list = album ? scopedAlbums(cityAlbums(archive, album.city.key), tour) : [];

  return (
    <section className={`panel${album ? '' : ' is-hidden'}`} aria-label="The place in focus">
      <div className="panel__media">
        {album && <PanelHead archive={archive} list={list} focus={focus} scope={scope} />}
        {album && endCard && <EndSlot world={world} />}
        {album && !endCard && <AlbumStack world={world} list={list} focus={focus} />}
      </div>
      {album && <Caption world={world} />}
    </section>
  );
}

/** The years of this place's albums, or in a tour only the trip's name or the year. */
function PanelHead({
  archive,
  list,
  focus,
  scope,
}: {
  archive: Archive;
  list: number[];
  focus: number;
  scope: Tour | null;
}) {
  const director = useDirector();
  if (scope) {
    return (
      <div className="panel__years">
        <span className="is-current">
          {scope.kind === 'year' ? scope.name : `Trip · ${scope.name}`}
        </span>
      </div>
    );
  }
  const current = archive.albums[focus]?.year;
  const years = [
    ...new Set(list.map((i) => archive.albums[i]?.year).filter((y): y is number => y !== undefined)),
  ];
  return (
    <div className="panel__years">
      {years.map((year) => (
        <button
          key={year}
          type="button"
          className={year === current ? 'is-current' : undefined}
          onClick={() => {
            const index = list.find((i) => archive.albums[i]?.year === year);
            if (index !== undefined) director.selectAlbum(index);
          }}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

/** The stack of albums: the current one in front, its photos in turn. */
function AlbumStack({ world, list, focus }: { world: World; list: number[]; focus: number }) {
  const director = useDirector();
  const photoSeconds = useStore(settingsStore, (s) => s.photoSeconds);
  const stack = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ y: number; used: boolean } | null>(null);
  const [hover, setHover] = useState(false);
  const [shown, setShown] = useState<ReadonlyMap<number, number>>(() => new Map());
  const n = list.length;
  const cur = Math.max(0, list.indexOf(focus));
  const current = list[cur];

  const turnBy = (by: number) => {
    if (n < 2) return;
    const index = list[(((cur + by) % n) + n) % n];
    if (index !== undefined) director.selectAlbum(index);
  };

  useInterval(
    () => {
      if (current === undefined) return;
      setShown((map) => new Map(map).set(current, (map.get(current) ?? 0) + 1));
    },
    photoSeconds * 1000 + DISSOLVE_MS,
    !hover && current !== undefined,
    current,
  );

  // the wheel turns the albums; it needs a non-passive listener to keep the page still
  useEffect(() => {
    const element = stack.current;
    if (!element) return;
    let acc = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (n < 2) return;
      const [next, steps] = wheelSteps(acc, event.deltaY, event.deltaMode);
      acc = next;
      if (steps === 0) return;
      const index = list[(((cur + steps) % n) + n) % n];
      if (index !== undefined) director.selectAlbum(index);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [director, list, cur, n]);

  const drift = (x: string, y: string) => {
    stack.current?.style.setProperty('--px', x);
    stack.current?.style.setProperty('--py', y);
  };

  return (
    <div
      ref={stack}
      className={`stack${n > 1 ? ' is-multi' : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHover(true);
      }}
      onPointerLeave={() => {
        setHover(false);
        drift('0px', '0px');
      }}
      onPointerDown={(event) => {
        swipe.current = { y: event.clientY, used: false };
      }}
      onPointerMove={(event) => {
        if (event.pointerType === 'mouse') {
          const rect = event.currentTarget.getBoundingClientRect();
          drift(
            `${(0.5 - (event.clientX - rect.left) / rect.width) * 16}px`,
            `${(0.5 - (event.clientY - rect.top) / rect.height) * 12}px`,
          );
          return;
        }
        const start = swipe.current;
        if (!start || start.used) return;
        const distance = event.clientY - start.y;
        if (Math.abs(distance) > SWIPE_PX) {
          start.used = true;
          turnBy(distance < 0 ? 1 : -1);
        }
      }}
      onClickCapture={(event) => {
        if (swipe.current?.used) event.stopPropagation();
        swipe.current = null;
      }}
    >
      {list.map((index, k) => {
        const album = world.archive.albums[index];
        if (!album) return null;
        const role = cardRole(k, cur, n);
        return (
          <AlbumCard
            key={album.id}
            album={album}
            role={role}
            step={shown.get(index) ?? 0}
            position={`${k + 1} / ${n}`}
            credits={world.credits}
            onSelect={role === 'cur' ? undefined : () => director.selectAlbum(index)}
            onOpen={
              role === 'cur'
                ? (photoIndex: number, element: HTMLElement) => {
                    const { x, y, width, height } = element.getBoundingClientRect();
                    openPhoto(appStore, album.id, photoIndex, { x, y, width, height });
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

function AlbumCard({
  album,
  role,
  step,
  position,
  credits,
  onSelect,
  onOpen,
}: {
  album: Album;
  role: CardRole;
  step: number;
  position: string;
  credits: ReadonlyMap<string, Credit>;
  onSelect: (() => void) | undefined;
  onOpen: ((photoIndex: number, element: HTMLElement) => void) | undefined;
}) {
  const photos = album.photos;
  const count = photos.length;
  const on = count > 0 ? step % count : -1;
  // the old picture stays under the new one until it is covered
  const under = count > 1 && step > 0 ? (step - 1) % count : -1;
  const photo = photos[on];
  return (
    <div
      className={`card card--${role}`}
      onClick={(event) => {
        if (onOpen && on >= 0) onOpen(on, event.currentTarget);
        else onSelect?.();
      }}
    >
      <div className="card__pan">
        {photos.map((ref, i) => (
          <img
            key={i}
            src={photoUrl(ref) ?? undefined}
            alt=""
            draggable={false}
            data-photo-key={i === on ? photoKey(ref) : undefined}
            className={i === on ? 'is-on' : i === under ? 'is-under' : undefined}
          />
        ))}
      </div>
      <div className="card__title">
        {album.title}
        <small>
          {monthYear(album)} · {album.photoCount} photos
        </small>
      </div>
      <div className="card__name">
        {monthYear(album)} · {album.title}
      </div>
      <div className="card__count">{position}</div>
      <div className="card__credit">{photo ? creditLine(photo, album.city, credits) : ''}</div>
    </div>
  );
}

/** A trip's end: the cozy room at home, or a photo of the city it ended in. */
function EndSlot({ world }: { world: World }) {
  const endCard = useStore(appStore, (s) => s.endCard);
  const city = endCard?.cityKey ? world.archive.cityByKey.get(endCard.cityKey) : undefined;
  const photo = city ? cityPhotos(city)[0] : undefined;
  const url = photo ? photoUrl(photo) : null;
  return (
    <div className="stack">
      <div className="card card--cur card--end">
        {url ? (
          <div className="card__pan">
            <img className="is-on" src={url} alt="" />
          </div>
        ) : (
          <div className="cozy" dangerouslySetInnerHTML={{ __html: cozyRoom }} />
        )}
      </div>
    </div>
  );
}

function Caption({ world }: { world: World }) {
  const { archive, home } = world;
  const focus = useStore(appStore, (s) => s.focus);
  const endCard = useStore(appStore, (s) => s.endCard);
  const flightKm = useStore(appStore, (s) => s.flightKm);
  const album = archive.albums[focus];
  if (!album) return null;
  const status = flightKm === null ? '' : `in flight · ${Math.round(flightKm).toLocaleString('en')} km`;

  if (endCard) {
    const city = endCard.cityKey ? archive.cityByKey.get(endCard.cityKey) : undefined;
    const from = archive.albumById.get(endCard.fromAlbumId) ?? album;
    const trip = endCard.tour?.kind === 'trip' ? endCard.tour.name : null;
    return (
      <div className="caption" key={`end-${endCard.fromAlbumId}`}>
        <div className="caption__when">{endCard.home ? 'Back home' : 'The end of the road'}</div>
        <div className="caption__place">{city ? city.name : home.name}</div>
        <div className="caption__route">
          {city ? city.country.name : home.country} · from {from.city.name} · {from.title}
        </div>
        <div className="caption__trip">{trip ? `Trip · ${trip}` : ''}</div>
        <div className="caption__status">{status}</div>
      </div>
    );
  }

  const trip = tripOfAlbum(archive, album.id);
  return (
    <div className="caption" key={album.id}>
      <div className="caption__when">
        {monthYear(album)} · album {focus + 1} of {archive.albums.length}
      </div>
      <div className="caption__place">{album.city.name}</div>
      <div className="caption__route">
        <span>{album.city.country.name}</span> · {album.title} · {album.photoCount} photos
      </div>
      <div className="caption__trip">{trip ? `Trip · ${trip.name}` : ''}</div>
      <div className="caption__status">{status}</div>
    </div>
  );
}
