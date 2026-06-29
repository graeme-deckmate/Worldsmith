import { describe, it, expect } from 'vitest';
import { setCell, resizeGrid, nextPaletteChar, gridWidth } from './pixels.ts';

describe('pixel grid ops', () => {
  it('sets a cell immutably', () => {
    const g = ['...', '...', '...'];
    const out = setCell(g, 1, 1, 'a');
    expect(out[1]).toBe('.a.');
    expect(g[1]).toBe('...'); // original untouched
  });

  it('ignores out-of-bounds writes', () => {
    const g = ['..', '..'];
    expect(setCell(g, 5, 0, 'a')).toEqual(g);
    expect(setCell(g, 0, 9, 'a')).toEqual(g);
  });

  it('resizes with padding and cropping', () => {
    const g = ['ab', 'cd'];
    expect(resizeGrid(g, 3, 3)).toEqual(['ab.', 'cd.', '...']);
    expect(resizeGrid(g, 1, 1)).toEqual(['a']);
    expect(gridWidth(resizeGrid(g, 4, 2))).toBe(4);
  });

  it('finds the next free palette char', () => {
    expect(nextPaletteChar({ a: '#fff', b: '#000' })).toBe('c');
    expect(nextPaletteChar({})).toBe('a');
  });
});
