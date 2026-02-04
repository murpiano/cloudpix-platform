import './studio.scss';
import { ApiError, uploadPhoto } from '@/api/client';
import { hasFlag, lockScroll, setFlag } from '@/app/flags';
import { byId, fromHTML, h } from '@/lib/dom';
import { Icon } from '@/lib/icons';
import { bakeFrame } from './bake';
import { DEFAULT_EFFECT, effectFilter, EFFECTS } from './effects';
import { normalizeTag, serializeTags, tagError } from './tags';

export interface Studio {
  open(file?: File): void;
  close(): void;
  isOpen(): boolean;
}

interface StudioOptions {
  /** Called after the server accepted a frame; resolves once the archive is refreshed. */
  onPublished(): Promise<void>;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const TAG_HINT = 'Press Enter or Space to add. Up to 6 tags.';

export const createStudio = ({ onPublished }: StudioOptions): Studio => {
  const root = byId('studio');
  const form = byId<HTMLFormElement>('studioForm');
  const fileInput = byId<HTMLInputElement>('studioFile');
  const dropTarget = byId('studioDrop');
  const preview = byId('studioPreview');
  const viewport = byId('studioViewport');
  const image = byId<HTMLImageElement>('studioImg');
  const looks = byId('studioLooks');
  const strength = byId<HTMLInputElement>('studioStrength');
  const strengthOut = byId<HTMLOutputElement>('strengthOut');
  const zoom = byId<HTMLInputElement>('studioZoom');
  const zoomOut = byId<HTMLOutputElement>('zoomOut');
  const chips = byId('studioChips');
  const tagInput = byId<HTMLInputElement>('studioTagInput');
  const tagHint = byId('tagHint');
  const caption = byId<HTMLTextAreaElement>('studioCaption');
  const captionCount = byId('captionCount');
  const status = byId('studioStatus');
  const send = byId<HTMLButtonElement>('studioSend');
  const sendLabel = byId('studioSendLabel');

  let file: File | null = null;
  let objectUrl = '';
  let effect = DEFAULT_EFFECT;
  let tags: string[] = [];
  let sending = false;

  // Looks

  const lookThumbs = new Map<string, HTMLImageElement>();

  looks.append(
    ...EFFECTS.map(({ id, label }) => {
      const thumb = h('img', { alt: '' });
      thumb.style.filter = effectFilter(id, 100);
      lookThumbs.set(id, thumb);

      return h(
        'label',
        { class: 'look' },
        h('input', { type: 'radio', name: 'look', value: id, checked: id === effect }),
        h('span', { class: 'look__thumb' }, thumb),
        label,
      );
    }),
  );

  const applyLook = (): void => {
    image.style.filter = effectFilter(effect, strength.valueAsNumber);
    image.style.transform = `scale(${zoom.valueAsNumber / 100})`;
    strength.disabled = effect === DEFAULT_EFFECT;
    strengthOut.value = strength.value;
    zoomOut.value = `${zoom.value}%`;
  };

  looks.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement) {
      effect = event.target.value;
      applyLook();
    }
  });
  strength.addEventListener('input', applyLook);
  zoom.addEventListener('input', applyLook);

  // Status line

  const say = (text: string, isError = false): void => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  const syncSend = (): void => {
    send.disabled = !file || sending;
  };

  // File

  const setFile = (next: File): void => {
    if (!ACCEPTED_TYPES.includes(next.type)) {
      say('That file is not a JPG, PNG or WebP image.', true);
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      say('That image is larger than 15 MB.', true);
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    file = next;
    objectUrl = URL.createObjectURL(next);
    image.src = objectUrl;
    lookThumbs.forEach((thumb) => (thumb.src = objectUrl));
    dropTarget.hidden = true;
    preview.hidden = false;
    say('');
    applyLook();
    syncSend();
  };

  fileInput.addEventListener('change', () => {
    const picked = fileInput.files?.[0];
    if (picked) {
      setFile(picked);
    }
    fileInput.value = '';
  });

  byId('studioSwap').addEventListener('click', () => fileInput.click());

  // Tags

  const renderChips = (): void => {
    chips.querySelectorAll('.chip').forEach((chip) => chip.remove());

    const nodes = tags.map((tag) => {
      const remove = h(
        'button',
        { type: 'button', 'aria-label': `Remove #${tag}` },
        fromHTML(Icon.close),
      );
      remove.addEventListener('click', () => {
        tags = tags.filter((item) => item !== tag);
        renderChips();
        tagInput.focus();
      });
      return h('span', { class: 'chip' }, `#${tag}`, remove);
    });

    tagInput.before(...nodes);
  };

  const tagProblem = (message: string | null): void => {
    tagHint.textContent = message ?? TAG_HINT;
    tagHint.classList.toggle('is-error', message !== null);
    chips.classList.toggle('is-invalid', message !== null);
  };

  /** Turns the typed text into a chip; returns false when it was rejected. */
  const commitTag = (): boolean => {
    const tag = normalizeTag(tagInput.value);
    if (!tag) {
      tagInput.value = '';
      return true;
    }

    const problem = tagError(tag, tags);
    tagProblem(problem);
    if (problem) {
      return false;
    }

    tags = [...tags, tag];
    tagInput.value = '';
    renderChips();
    return true;
  };

  tagInput.addEventListener('keydown', (event) => {
    if (['Enter', ' ', ','].includes(event.key)) {
      event.preventDefault();
      commitTag();
    } else if (event.key === 'Backspace' && !tagInput.value && tags.length) {
      tags = tags.slice(0, -1);
      renderChips();
    }
  });
  tagInput.addEventListener('input', () => {
    if (chips.classList.contains('is-invalid')) {
      tagProblem(null);
    }
  });
  tagInput.addEventListener('blur', () => commitTag());
  chips.addEventListener('click', (event) => {
    if (event.target === chips) {
      tagInput.focus();
    }
  });

  // Caption

  const syncCaption = (): void => {
    captionCount.textContent = `${caption.value.length} / ${caption.maxLength}`;
  };
  caption.addEventListener('input', syncCaption);

  // Publishing

  const reset = (): void => {
    form.reset();
    file = null;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = '';
    }
    image.removeAttribute('src');
    effect = DEFAULT_EFFECT;
    tags = [];
    renderChips();
    tagProblem(null);
    dropTarget.hidden = false;
    preview.hidden = true;
    say('');
    syncCaption();
    applyLook();
    syncSend();
  };

  const setSending = (value: boolean): void => {
    sending = value;
    sendLabel.textContent = value ? 'Sending…' : 'Send to orbit';
    form.setAttribute('aria-busy', String(value));
    syncSend();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!file || sending || !commitTag()) {
      return;
    }

    setSending(true);
    say('Rendering your frame…');

    try {
      const frame = await bakeFrame(file, {
        effect,
        strength: strength.valueAsNumber,
        zoom: zoom.valueAsNumber,
        previewWidth: image.clientWidth,
      });

      const body = new FormData();
      body.append('filename', frame, file.name.replace(/\.\w+$/, '') + '.jpg');
      body.append('scale', `${zoom.value}%`);
      body.append('effect', effect);
      body.append('effect-level', strength.value);
      body.append('hashtags', serializeTags(tags));
      body.append('description', caption.value.trim());

      say('Sending to the archive…');
      await uploadPhoto(body);
      await onPublished();
      reset();
      close();
    } catch (error) {
      const reason = error instanceof ApiError && error.status ? ` (${error.status})` : '';
      say(`Could not publish the frame${reason}. Check your connection and try again.`, true);
    } finally {
      setSending(false);
    }
  });

  // Panel

  const toggle = (open: boolean): void => {
    setFlag('studio-open', open);
    root.inert = !open;
    root.setAttribute('aria-hidden', String(!open));
    lockScroll(open);
  };

  const open = (next?: File): void => {
    toggle(true);
    if (next) {
      setFile(next);
    }
    (file ? send : dropTarget).focus({ preventScroll: true });
  };

  function close(): void {
    toggle(false);
  }

  byId('studioClose').addEventListener('click', close);
  dropTarget.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });
  dropTarget.tabIndex = 0;
  viewport.addEventListener('dblclick', () => {
    zoom.value = '100';
    applyLook();
  });

  applyLook();
  syncCaption();

  return { open, close, isOpen: () => hasFlag('studio-open') };
};
