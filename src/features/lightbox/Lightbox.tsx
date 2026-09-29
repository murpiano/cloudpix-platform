import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { World } from '@/app/boot';
import { creditLine, photoUrl } from '@/data/photos';
import { describeAlbum, photoKey, photoNote } from '@/data/social';
import type { Album } from '@/data/types';
import { goArchive } from '@/features/archive/links';
import { wheelSteps } from '@/features/panel/stack';
import { monthYear } from '@/lib/dates';
import { useInterval } from '@/lib/useInterval';
import { appStore } from '@/state/app-state';
import type { PhotoView, Rect } from '@/state/app-state';
import { closePhoto, finishPhoto, stepPhoto, toggleSlideshow } from '@/state/layers';
import { SETTING_LIMITS, settingsStore } from '@/state/settings';
import { commentPhoto, likePhoto, socialFor, socialStore } from '@/state/social';
import { useStore } from '@/state/store';
import { fitRect, flyTransform } from './fit';
import './lightbox.scss';

const ZOOM_MS = 800;
const SLIDE_MS = 700;
const SLIDE_PX = 70;
const SWIPE_PX = 40;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** The photo window: the photo large, its story on the left, likes and comments on the right. */
export function Lightbox({ world }: { world: World }) {
  const photo = useStore(appStore, (s) => s.photo);
  const album = photo ? world.archive.albumById.get(photo.albumId) : undefined;
  if (!photo || !album) return null;
  return <PhotoWindow key={photo.albumId} world={world} photo={photo} album={album} />;
}

function PhotoWindow({ world, photo, album }: { world: World; photo: PhotoView; album: Album }) {
  const stage = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; used: boolean } | null>(null);
  const slideSeconds = useStore(settingsStore, (s) => s.slideSeconds);
  const [shown, setShown] = useState(false);
  const count = album.photos.length;
  const current = album.photos[photo.index];
  const previous = photo.previous === null ? undefined : album.photos[photo.previous];
  const key = current ? photoKey(current) : '';
  const kept = useStore(socialStore, (s) => s.byKey.get(key));
  const social = kept ?? socialFor(key);

  // the window fades in over the world
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useInterval(
    () => stepPhoto(appStore, count, 1),
    slideSeconds * 1000,
    photo.slideshow && !photo.closing,
    photo.index,
    'real',
  );

  // the wheel over the photo turns the photos
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let acc = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const [next, steps] = wheelSteps(acc, delta, event.deltaMode);
      acc = next;
      if (steps !== 0) stepPhoto(appStore, count, steps);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [count]);

  // closing: the photo flies back into the tile now showing it, or fades if there is none
  useEffect(() => {
    if (!photo.closing) return;
    const image = stage.current?.querySelector<HTMLImageElement>('.lightbox__img.is-current');
    // the tile showing this photo now: in the archive when it is open (the panel lies under it)
    const tiles = [
      ...document.querySelectorAll<HTMLElement>(`[data-photo-key="${CSS.escape(key)}"]`),
    ].filter((element) => !element.closest('.lightbox'));
    const tile = appStore.get().archive
      ? tiles.find((element) => element.closest('.archive'))
      : tiles[0];
    if (!image) {
      finishPhoto(appStore);
      return;
    }
    const box = image.getBoundingClientRect();
    const to = tile?.getBoundingClientRect();
    const animation =
      to && to.width > 0
        ? image.animate(
            [{ transform: 'none' }, { transform: flyTransform(box, to), borderRadius: '14px' }],
            { duration: ZOOM_MS, easing: EASE, fill: 'forwards' },
          )
        : image.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    animation.onfinish = () => finishPhoto(appStore);
    return () => {
      animation.onfinish = null;
    };
  }, [photo.closing, key]);

  const close = () => {
    if (swipe.current?.used) {
      swipe.current = null;
      return;
    }
    closePhoto(appStore);
  };

  return (
    <div className={`lightbox${shown && !photo.closing ? ' is-on' : ''}`} role="dialog" aria-label="Photo">
      <button type="button" className="lightbox__close" aria-label="Close" onClick={() => closePhoto(appStore)}>
        ✕
      </button>


      <div
        ref={stage}
        className="lightbox__stage"
        onClick={close}
        onPointerDown={(event) => {
          // the arrows and the slideshow bar sit on the stage but are not the photo
          const control =
            event.target instanceof Element && event.target.closest('.lightbox__bar, .lightbox__nav');
          swipe.current = control ? null : { x: event.clientX, used: false };
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          if (!start) return;
          const distance = event.clientX - start.x;
          if (Math.abs(distance) > SWIPE_PX) {
            start.used = true;
            stepPhoto(appStore, count, distance < 0 ? 1 : -1);
          }
        }}
      >
        {previous && photo.previous !== photo.index && (
          <StageImage
            key={`under-${photo.previous}-${photo.index}`}
            src={photoUrl(previous)}
            stage={stage}
            from={null}
            dir={0}
            current={false}
          />
        )}
        {current && (
          <StageImage
            key={`photo-${photo.index}`}
            src={photoUrl(current)}
            stage={stage}
            from={photo.dir === 0 ? photo.from : null}
            dir={photo.dir}
            current
          />
        )}
        {count > 1 && (
          <>
            <button
              type="button"
              className="lightbox__nav lightbox__nav--prev"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                stepPhoto(appStore, count, -1);
              }}
            >
              ←
            </button>
            <button
              type="button"
              className="lightbox__nav lightbox__nav--next"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                stepPhoto(appStore, count, 1);
              }}
            >
              →
            </button>
          </>
        )}
        <div className="lightbox__bar" onClick={(event) => event.stopPropagation()}>
          {count > 1 && (
            <button
              type="button"
              className={photo.slideshow ? 'is-on' : undefined}
              onClick={() => toggleSlideshow(appStore)}
            >
              {photo.slideshow ? '❚❚ Slideshow' : '▶ Slideshow'}
            </button>
          )}
          {count > 1 && (
            <label>
              <input
                type="range"
                min={SETTING_LIMITS.slideSeconds[0]}
                max={SETTING_LIMITS.slideSeconds[1]}
                step={1}
                value={slideSeconds}
                aria-label="Slideshow speed"
                onChange={(event) => settingsStore.set({ slideSeconds: Number(event.target.value) })}
              />
              <output>{slideSeconds} s</output>
            </label>
          )}
          <span>
            {photo.index + 1} / {count}
          </span>
        </div>
      </div>

      <div className="lightbox__scroll">
        <aside className="lightbox__info">
          <button
            type="button"
            className="lightbox__country lightbox__link"
            onClick={() => goArchive({ kind: 'country', id: album.city.country.id })}
          >
            {album.city.country.name}
          </button>
          <button
            type="button"
            className="lightbox__city lightbox__link"
            onClick={() => goArchive({ kind: 'city', key: album.city.key })}
          >
            {album.city.name}
          </button>
          <button
            type="button"
            className="lightbox__album lightbox__link"
            onClick={() => goArchive({ kind: 'album', id: album.id })}
          >
            {album.title}
          </button>
          <div className="lightbox__date">
            {monthYear(album)} · {album.photoCount} photos
          </div>
          <p className="lightbox__note">{current ? photoNote(current) : ''}</p>
          <p className="lightbox__desc">{describeAlbum(album)}</p>
          <p className="lightbox__credit">{current ? creditLine(current, album.city, world.credits) : ''}</p>
        </aside>
        <aside className="lightbox__social">
          <button
            type="button"
            className={`lightbox__like${social.liked ? ' is-on' : ''}`}
            aria-pressed={social.liked}
            onClick={() => likePhoto(key)}
          >
            <i>♥</i>
            <span>{social.likes.toLocaleString('en')}</span>
          </button>
          <h4>Comments · {social.comments.length}</h4>
          <div className="lightbox__comments">
            {social.comments.map((comment, i) => (
              <div key={i} className="lightbox__comment">
                <b>{comment.who}</b>
                <small>{comment.when}</small>
                <p>{comment.text}</p>
              </div>
            ))}
          </div>
          <CommentForm onSend={(text) => commentPhoto(key, text)} />
          <div className="lightbox__demo">Demo: comments are not saved yet.</div>
        </aside>
      </div>
    </div>
  );
}

function CommentForm({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const send = () => {
    onSend(text);
    setText('');
  };
  return (
    <form
      className="lightbox__form"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        value={text}
        placeholder="Add a comment…"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
      />
      <button type="submit">Post</button>
    </form>
  );
}

/**
 * One photo on the stage, fitted into it. The one opened grows from where it was clicked; the
 * next one slides in from its side; the one under it just waits to be covered.
 */
function StageImage({
  src,
  stage,
  from,
  dir,
  current,
}: {
  src: string | null;
  stage: RefObject<HTMLDivElement | null>;
  from: Rect | null;
  dir: -1 | 0 | 1;
  current: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  const played = useRef(false);
  const [fit, setFit] = useState<Rect | null>(null);

  const measure = () => {
    const element = image.current;
    const box = stage.current?.getBoundingClientRect();
    if (!element || !box || !element.naturalWidth) return;
    setFit(fitRect(box, element.naturalWidth / element.naturalHeight));
  };

  useEffect(() => {
    const onResize = () => {
      const element = image.current;
      const box = stage.current?.getBoundingClientRect();
      if (element && box && element.naturalWidth) {
        setFit(fitRect(box, element.naturalWidth / element.naturalHeight));
      }
    };
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, [stage]);

  useLayoutEffect(() => {
    const element = image.current;
    if (!fit || !element || !current || played.current) return;
    played.current = true;
    if (dir === 0 && from) {
      element.animate(
        [
          { transform: flyTransform(fit, from), borderRadius: '14px' },
          { transform: 'none', borderRadius: '10px' },
        ],
        { duration: ZOOM_MS, easing: EASE },
      );
    } else if (dir !== 0) {
      element.animate(
        [
          { transform: `translateX(${dir * SLIDE_PX}px)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: SLIDE_MS, easing: EASE },
      );
    }
  }, [fit, current, dir, from]);

  return (
    <img
      ref={image}
      src={src ?? undefined}
      alt=""
      draggable={false}
      className={`lightbox__img ${current ? 'is-current' : 'is-under'}`}
      onLoad={measure}
      style={
        fit
          ? { left: fit.x, top: fit.y, width: fit.width, height: fit.height }
          : { visibility: 'hidden' }
      }
    />
  );
}
