import { describe, expect, it } from 'vitest';
import { shrinkAll } from './image';

const file = (name: string): File => new File([new Uint8Array([1, 2, 3])], name);

describe('shrinkAll', () => {
  it('gives back one blob per file, under its own name', async () => {
    const out = await shrinkAll([file('one.jpg'), file('two.jpg')], (blob) =>
      Promise.resolve(blob),
    );
    expect(out.ready.map((one) => one.name)).toEqual(['one.jpg', 'two.jpg']);
    expect(out.skipped).toEqual([]);
  });

  it('skips a file the browser cannot decode and keeps the rest', async () => {
    const out = await shrinkAll([file('bad.png'), file('good.jpg')], (blob, name) =>
      name === 'bad.png'
        ? Promise.reject(new Error('could not be decoded'))
        : Promise.resolve(blob),
    );
    expect(out.ready.map((one) => one.name)).toEqual(['good.jpg']);
    expect(out.skipped).toEqual(['bad.png']);
  });
});
