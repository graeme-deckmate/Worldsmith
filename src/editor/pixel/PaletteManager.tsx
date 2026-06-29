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
            <button
              className={sel(ch)}
              style={{ background: color }}
              title={`'${ch}' ${color}`}
              onClick={() => onSelect(ch)}
            >
              <span className="absolute bottom-0 right-0 text-[9px] px-0.5 bg-black/50 rounded-tl text-white/80">
                {ch}
              </span>
            </button>
            <input
              type="color"
              value={normalizeHex(color)}
              onChange={(e) => onSetColor(ch, e.target.value)}
              className="absolute inset-0 opacity-0 w-9 h-9 cursor-pointer"
              title={`recolour '${ch}'`}
            />
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
