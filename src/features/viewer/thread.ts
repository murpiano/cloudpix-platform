import type { Comment } from '@/api/types';
import { byId, h } from '@/lib/dom';
import { hueOf, initials } from '@/lib/monogram';

const STEP = 6;

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

/** Comment list that reveals itself in steps of six. */
export const createThread = () => {
  const list = byId('threadList');
  const empty = byId('threadEmpty');
  const more = byId<HTMLButtonElement>('threadMore');

  let comments: Comment[] = [];
  let shown = 0;

  const showMore = (): void => {
    const next = comments.slice(shown, shown + STEP);
    list.append(...next.map(remark));
    shown += next.length;

    more.hidden = shown >= comments.length;
    more.textContent = `Show more · ${shown} of ${comments.length}`;
  };

  more.addEventListener('click', showMore);

  return {
    render(nextComments: Comment[]): void {
      comments = nextComments;
      shown = 0;
      list.replaceChildren();
      list.scrollTop = 0;
      empty.hidden = comments.length > 0;
      showMore();
    },
  };
};
