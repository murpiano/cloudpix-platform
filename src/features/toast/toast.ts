import './toast.scss';
import { byId } from '@/lib/dom';

const SHOW_MS = 3_600;

let timer: ReturnType<typeof setTimeout> | undefined;

export const toast = (message: string, tone: 'info' | 'error' = 'info'): void => {
  const element = byId('toast');

  element.textContent = message;
  element.classList.toggle('is-error', tone === 'error');
  element.classList.add('is-shown');

  clearTimeout(timer);
  timer = setTimeout(() => element.classList.remove('is-shown'), SHOW_MS);
};
