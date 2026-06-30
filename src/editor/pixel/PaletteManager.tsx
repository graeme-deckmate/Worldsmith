import type { Palette } from '../../model/index.ts';

/**
 * Palette editor: pick the active paint colour (or the transparent eraser),
 * recolour entries with a colour picker, add a new colour, or remove one.
 */
export function PaletteManager({
  pal,
  paintChar,
  onSelect,
  onSetColor,
  onAddColor,
  onRemoveChar,
}: {
  pal: Palette;
  paintChar: string;
  onSelect: (ch: string) => void;
  onSetColor: (ch: string, color: string) => void;
  onAddColor: () => void;
  onRemoveChar: (ch: string) => void;
}) {
  const entries = Object.entries(pal);
  const sel = (ch: string): string =>
    `relative w-9 h-9 rounded border-2 ${
      paintChar === ch ? 'border-violet-400' : 'border-zinc-700'
    }`;

  return (
    <div>
      <div className="text-xs text-zinc-400 mb-2">Palette ({entries.length} colours)</div>
      <div className="flex flex-wrap gap-2">
        {/* transparent / eraser */}
        <button
          className={`${sel('.')} grid place-items-center text-[10px] text-zinc-400 bg-[repeating-conic-gradient(#1b1b24_0_25%,#23232f_0_50%)] bg-[length:10px_10px]`}
          title="Transparent (eraser)"
          onClick={() => onSelect('.')}
        >
          ⌫
        </button>
        {entries.map(([ch, color]) => (
          <div key={ch} className="relative group">
            {/* click the swatch to PAINT with this colour */}
            <button
              className={`${sel(ch)} grid place-items-center`}
              style={{ background: color }}
              title={`'${ch}' ${color} — click to paint (or press ${ch})`}
              onClick={() => onSelect(ch)}
            >
              <span className="text-[11px] font-bold text-white mix-blend-difference select-none">{ch}</span>
            </button>
            {/* small corner control to RECOLOUR (opens the picker) */}
            <label
              className="absolute -bottom-1.5 -left-1.5 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-600 grid place-items-center cursor-pointer text-[8px] text-zinc-300 hover:text-violet-300"
              title={`recolour '${ch}'`}
            >
              ✎
              <input
                type="color"
                value={normalizeHex(color)}
                onChange={(e) => onSetColor(ch, e.target.value)}
                className="sr-only"
              />
            </label>
            <button
              className="absolute -top-1.5 -right-1.5 hidden group-hover:grid place-items-center w-4 h-4 rounded-full bg-zinc-900 border border-zinc-600 text-[10px] text-zinc-400 hover:text-rose-400"
              onClick={() => onRemoveChar(ch)}
              title={`remove '${ch}'`}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="w-9 h-9 rounded border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 text-lg"
          onClick={onAddColor}
          title="Add colour"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Colour inputs need a 6-digit hex; expand #rgb. */
function normalizeHex(c: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return '#' + c.slice(1).split('').map((h) => h + h).join('');
  }
  return c;
}
