import './orbit.scss';
import type { Photo } from '@/api/types';
import { hasFlag, setFlag } from '@/app/flags';
import type { DecodedImage } from '@/lib/decode';
import { byId, h } from '@/lib/dom';
import { frameLabel } from '@/lib/format';
import { clamp } from '@/lib/math';
import { depthAfterRotation, fibonacciSphere, orbitMetrics } from './layout';
import type { OrbitMetrics, SpherePoint } from './layout';

export interface OrbitItem {
  photo: Photo;
  image: DecodedImage;
}

export interface Orbit {
  setItems(items: OrbitItem[]): void;
  /** Recomputes sizes; `force` skips the small-resize filter. */
  relayout(force?: boolean): void;
  /** Dims the sphere around an open frame; null lights everything again. */
  focus(photoId: number | null): void;
  cardOf(photoId: number): HTMLElement | undefined;
}

interface OrbitOptions {
  onOpen(photoId: number, card: HTMLElement): void;
}

const Camera = {
  TILT: -4,
  PITCH_LIMIT: 32,
  DEG_PER_PX: 0.13,
  FRICTION: 0.94,
  REST: 0.002,
  DOLLY_SHARE: 0.16, // the whole zoom happens within 16vh of scroll
  DOLLY_EASE: 0.075,
  DEEP_AT: 0.35,
} as const;

const RESIZE_THRESHOLD = 20;
const TOUCH_DECIDE_PX = 10;

interface CardState {
  element: HTMLElement;
  point: SpherePoint;
  photoId: number;
  opacity: string;
  wash: string;
}

interface PointerState {
  id: number;
  type: string;
  card: HTMLElement | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  active: boolean;
}

export const createOrbit = ({ onOpen }: OrbitOptions): Orbit => {
  const stage = byId('stage');
  const world = byId('world');
  const orb = byId('orb');
  const headline = byId('headline');

  let cards: CardState[] = [];
  let metrics: OrbitMetrics = orbitMetrics(innerWidth, innerHeight);
  let viewport = { width: innerWidth, height: innerHeight };
  let focused: number | null = null;

  const camera = { spin: 0, dragX: 0, dragY: 0, velX: 0, velY: 0, z: 0 };
  let pointer: PointerState | null = null;

  const layout = (): void => {
    metrics = orbitMetrics(innerWidth, innerHeight);
    const { radius: r } = metrics;

    stage.style.setProperty('--persp', `${metrics.perspective}px`);
    orb.style.setProperty('--cw', `${metrics.cardWidth}px`);

    for (const { element, point } of cards) {
      element.style.transform =
        `translate3d(${point.x * r}px, ${-point.y * r}px, ${point.z * r}px) ` +
        `rotateY(${point.lon}deg) rotateX(${point.lat}deg)`;
    }
  };

  const relayout = (force = false): void => {
    const { innerWidth: width, innerHeight: height } = window;
    const small =
      Math.abs(width - viewport.width) < RESIZE_THRESHOLD &&
      Math.abs(height - viewport.height) < RESIZE_THRESHOLD;

    if (small && !force) {
      return;
    }

    viewport = { width, height };
    layout();
  };

  const createCard = ({ photo, image }: OrbitItem, point: SpherePoint): CardState => {
    const img = h('img', { alt: photo.caption || frameLabel(photo), draggable: 'false' });
    img.addEventListener('load', () => img.classList.add('in'), { once: true });
    img.src = image.src;

    const element = h(
      'div',
      { class: image.height > image.width * 1.05 ? 'card card--tall' : 'card' },
      h('figure', {}, img),
    );
    element.dataset.id = String(photo.id);

    return { element, point, photoId: photo.id, opacity: '', wash: '' };
  };

  const setItems = (items: OrbitItem[]): void => {
    const points = fibonacciSphere(items.length);
    cards = items.map((item, i) => createCard(item, points[i] as SpherePoint));
    orb.replaceChildren(...cards.map((card) => card.element));
    layout();
  };

  // Camera loop

  const scrollProgress = (): number => clamp(scrollY / (innerHeight * Camera.DOLLY_SHARE), 0, 1);

  const shadeCards = (pitch: number, yaw: number, progress: number): void => {
    const { radius: r, perspective } = metrics;
    const shade = 1 - Math.min(1, progress * 1.6);
    const near = perspective * 0.66;

    for (const card of cards) {
      const depth = depthAfterRotation(card.point, pitch, yaw);
      const base = 0.14 + 0.86 * ((depth + 1) / 2) ** 0.85;
      let wash = shade * (1 - base);
      const z = depth * r + camera.z;
      let opacity = z > near ? Math.max(0, 1 - (z - near) / 190) : 1;

      if (focused !== null) {
        wash = Math.min(1, wash + 0.78);
        if (card.photoId === focused) {
          opacity = 0; // the viewer plate stands in for this card
        }
      }

      const nextOpacity = opacity.toFixed(3);
      const nextWash = wash.toFixed(3);

      if (nextOpacity !== card.opacity) {
        card.opacity = nextOpacity;
        card.element.style.opacity = nextOpacity;
      }
      if (nextWash !== card.wash) {
        card.wash = nextWash;
        card.element.style.setProperty('--d', nextWash);
      }
    }
  };

  const frame = (): void => {
    const dragging = pointer?.active ?? false;

    if (!dragging && focused === null) {
      camera.dragX += camera.velX;
      camera.dragY += camera.velY;
      camera.velX = Math.abs(camera.velX) < Camera.REST ? 0 : camera.velX * Camera.FRICTION;
      camera.velY = Math.abs(camera.velY) < Camera.REST ? 0 : camera.velY * Camera.FRICTION;
    }

    camera.dragY = clamp(
      camera.dragY,
      -Camera.PITCH_LIMIT - Camera.TILT,
      Camera.PITCH_LIMIT - Camera.TILT,
    );

    const progress = scrollProgress();
    setFlag('deep', progress > Camera.DEEP_AT);

    // Zoom only dollies forward and never flies through the sphere.
    const target = progress * Math.min(64, metrics.radius * 0.12);
    camera.z += (target - camera.z) * Camera.DOLLY_EASE;

    const pitch = Camera.TILT + camera.dragY;
    const yaw = camera.spin + camera.dragX;

    world.style.transform = `translateZ(${camera.z}px) rotateY(${yaw}deg) rotateX(${pitch}deg)`;
    // Undo the world rotation (rightmost first), then push the title towards the camera.
    headline.style.transform = `rotateX(${-pitch}deg) rotateY(${-yaw}deg) translateZ(${metrics.radius * 0.62}px)`;
    headline.style.opacity = String(Math.max(0, 1 - progress * 0.55));

    shadeCards(pitch, yaw, progress);
    requestAnimationFrame(frame);
  };

  // Dragging

  const onPointerDown = (event: PointerEvent): void => {
    if (hasFlag('lit') || event.button !== 0) {
      return;
    }

    // Read the card before pointer capture retargets later events to the stage.
    const card =
      event.target instanceof Element ? event.target.closest<HTMLElement>('.card') : null;
    const active = event.pointerType !== 'touch';

    pointer = {
      id: event.pointerId,
      type: event.pointerType,
      card,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      active,
    };

    if (active) {
      stage.setPointerCapture(event.pointerId);
      camera.velX = 0;
      camera.velY = 0;
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    if (!pointer.active) {
      const totalX = Math.abs(event.clientX - pointer.startX);
      const totalY = Math.abs(event.clientY - pointer.startY);

      if (Math.hypot(totalX, totalY) < TOUCH_DECIDE_PX) {
        return;
      }
      if (totalY > totalX * 1.15) {
        pointer = null; // a vertical swipe belongs to the page scroll
        return;
      }

      pointer.active = true;
      stage.setPointerCapture(event.pointerId);
    }

    const dx = (event.clientX - pointer.lastX) * Camera.DEG_PER_PX;
    const dy = (event.clientY - pointer.lastY) * Camera.DEG_PER_PX;

    camera.dragX += dx;
    camera.dragY -= dy;
    camera.velX = dx;
    camera.velY = -dy;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    const travel = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
    const slop = pointer.type === 'touch' ? 14 : 6;
    const { card } = pointer;
    pointer = null;

    if (travel < slop && card?.dataset.id) {
      onOpen(Number(card.dataset.id), card);
    }
  };

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', () => {
    pointer = null;
  });

  // Only 16vh of scroll exists; nothing lies past it.
  addEventListener(
    'scroll',
    () => {
      const max = innerHeight * Camera.DOLLY_SHARE;
      if (scrollY > max) {
        scrollTo(0, max);
      }
    },
    { passive: true },
  );

  addEventListener('resize', () => relayout());
  addEventListener('orientationchange', () => setTimeout(() => relayout(true), 220));
  visualViewport?.addEventListener('resize', () => relayout());

  layout();
  frame();

  return {
    setItems,
    relayout,
    focus(photoId) {
      focused = photoId;
    },
    cardOf(photoId) {
      return cards.find((card) => card.photoId === photoId)?.element;
    },
  };
};
