/** Hand-drawn line icons, 24×24 grid, stroke follows currentColor. */
const icon = (body: string, viewBox = '0 0 24 24'): string =>
  `<svg class="icon" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const Icon = {
  /** CloudPix mark: a sphere, its orbit and one travelling pixel. */
  mark: icon(
    '<circle cx="16" cy="16" r="8.5"/><ellipse cx="16" cy="16" rx="14" ry="5" transform="rotate(-24 16 16)"/><rect x="24" y="6.4" width="3.6" height="3.6" rx=".6" fill="currentColor" stroke="none"/>',
    '0 0 32 32',
  ),
  heart: icon(
    '<path d="M12 20.2s-7.4-4.5-7.4-10a4.2 4.2 0 0 1 7.4-2.7 4.2 4.2 0 0 1 7.4 2.7c0 5.5-7.4 10-7.4 10Z"/>',
  ),
  comment: icon('<path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z"/>'),
  upload: icon('<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 14.5v5h15v-5"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  close: icon('<path d="m6 6 12 12M18 6 6 18"/>'),
  prev: icon('<path d="M14.5 6 8.5 12l6 6"/>'),
  next: icon('<path d="m9.5 6 6 6-6 6"/>'),
  frame: icon(
    '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m3.5 15.5 5-4.5 4 3.5 2.5-2 5.5 4.5"/><circle cx="15.5" cy="9.5" r="1.3"/>',
  ),
} as const;
