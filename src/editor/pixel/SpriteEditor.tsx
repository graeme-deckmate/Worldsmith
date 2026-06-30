import { useEffect, useState } from 'react';
import type { Palette, Sprite } from '../../model/index.ts';
import { nextPaletteChar, resizeGrid, setCell } from '../../render/pixels.ts';
import { PixelCanvas } from './PixelCanvas.tsx';
import { PaletteManager } from './PaletteManager.tsx';

/**
 * Full sprite editor: paint on the grid, manage the palette, resize, and zoom.
 * Local state mirrors the selected sprite; changes commit to the store on stroke
 * end / palette edit / resize (one undo entry each).
 */
export function SpriteEditor({
  sprite,
  onCommit,
}: {
  sprite: Sprite;
  onCommit: (next: Sprite) => void;
}) {
  const [grid, setGrid] = useState<string[]>([...sprite.grid]);
  const [pal, setPal] = useState<Palette>({ ...sprite.pal });
  const [paintChar, setPaintChar] = useState<string>(() => Object.keys(sprite.pal)[0] ?? '.');
  const [scale, setScale] = useState(20);

  // Re-sync when the selected sprite changes (incl. undo/redo).
  useEffect(() => {
    setGrid([...sprite.grid]);
    setPal({ ...sprite.pal });
  }, [sprite]);

  // Keyboard: press a palette char to select it (or `.` / Backspace to erase).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement | null)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '.' || e.key === 'Backspace') { setPaintChar('.'); e.preventDefault(); return; }
      if (e.key.length === 1 && e.key in pal) { setPaintChar(e.key); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pal]);

  const commit = (nextGrid: string[], nextPal: Palette): void => {
    onCommit({ ...sprite, grid: nextGrid, pal: nextPal });
  };

  const paint = (x: number, y: number): void => setGrid((g) => setCell(g, x, y, paintChar));

  const addColor = (): void => {
    const ch = nextPaletteChar(pal);
    if (!ch) return;
    const nextPal = { ...pal, [ch]: '#ffffff' };
    setPal(nextPal);
    setPaintChar(ch);
    commit(grid, nextPal);
  };

  const setColor = (ch: string, color: string): void => {
    const nextPal = { ...pal, [ch]: color };
    setPal(nextPal);
    commit(grid, nextPal);
  };

  const removeChar = (ch: string): void => {
    const nextPal = { ...pal };
    delete nextPal[ch];
    const nextGrid = grid.map((row) => row.split('').map((c) => (c === ch ? '.' : c)).join(''));
    setPal(nextPal);
    setGrid(nextGrid);
    if (paintChar === ch) setPaintChar('.');
    commit(nextGrid, nextPal);
  };

  const resize = (w: number, h: number): void => {
    const nextGrid = resizeGrid(grid, w, h);
    setGrid(nextGrid);
    commit(nextGrid, pal);
  };

  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  const numField = 'w-16 rounded bg-zinc-800 px-2 py-1 text-sm outline-none focus:ring-1 ring-violet-500';

  return (
    <div className="flex gap-6">
      <div>
        <PixelCanvas
          grid={grid}
          pal={pal}
          scale={scale}
          onPaint={paint}
          onStrokeEnd={() => commit(grid, pal)}
        />
        <div className="flex items-center gap-3 mt-3 text-xs text-zinc-400">
          <label className="flex items-center gap-1">
            zoom
            <input
              type="range"
              min={6}
              max={40}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-1">
            w
            <input
              type="number"
              className={numField}
              value={w}
              min={1}
              max={64}
              onChange={(e) => resize(Math.max(1, Math.min(64, Number(e.target.value) || 1)), h)}
            />
          </label>
          <label className="flex items-center gap-1">
            h
            <input
              type="number"
              className={numField}
              value={h}
              min={1}
              max={64}
              onChange={(e) => resize(w, Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
            />
          </label>
        </div>
      </div>

      <div className="w-64">
        <PaletteManager
          pal={pal}
          paintChar={paintChar}
          onSelect={setPaintChar}
          onSetColor={setColor}
          onAddColor={addColor}
          onRemoveChar={removeChar}
        />
        <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
          Click a swatch (or press its letter key) to pick the paint colour, then click or drag on
          the grid. Press <kbd className="px-1 bg-zinc-800 rounded">.</kbd> or Backspace, or pick
          the ⌫ swatch, to erase (transparent). Recolour with a swatch's small ✎ dot; the change
          applies live to every cell using that letter.
        </p>
      </div>
    </div>
  );
}
