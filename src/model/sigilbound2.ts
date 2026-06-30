import { zWorld, type World } from './world.ts';
import { SUNDERED_RAW } from './sigilbound2World.ts';

/**
 * "The Sundered Reaches" — the full Sigilbound II game, converted to a Worldsmith
 * World by Sigilbound2/scripts/to-worldsmith.ts (regenerate with `npm run genmaps`
 * there). Bundled as an editable, playtestable sample.
 */
export const SUNDERED: World = zWorld.parse(SUNDERED_RAW);
