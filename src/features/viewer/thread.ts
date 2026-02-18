import type { Comment } from '@/api/types';
import { byId, h } from '@/lib/dom';
import { hueOf, initials } from '@/lib/monogram';

const remark = ({ author, text }: Comment): HTMLElement => {
  const avatar = h('span', { class: 'remark__avatar', 'aria-hidden': 'true' }, initials(author));
  avatar.style.setProperty('--hue', String(hueOf(author)));

  return h(
    'li',
    { class: 'remark' },
    avatar,
    h(
      'div',
      {},
      h('b', { class: 'remark__author' }, author),
      h('p', { class: 'remark__text' }, text),
    ),
  );
};

/** Comment list inside a fixed-height, scrollable panel. */
export const createThread = () => {
  const title = byId('threadTitle');
  const list = byId('threadList');
  const empty = byId('threadEmpty');

  return {
    render(comments: Comment[]): void {
      title.textContent = comments.length ? `Comments · ${comments.length}` : 'Comments';
      list.replaceChildren(...comments.map(remark));
      list.scrollTop = 0;
      empty.hidden = comments.length > 0;
    },
  };
};
