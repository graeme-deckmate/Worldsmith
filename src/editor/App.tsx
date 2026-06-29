import { useEffect, useState, type FC } from 'react';
import { useWorld } from '../store/worldStore.ts';
import { HomeScreen } from './HomeScreen.tsx';
import { TopBar } from './TopBar.tsx';
import { Sidebar } from './Sidebar.tsx';
import { OverviewPanel } from './panels/OverviewPanel.tsx';
import { CollectionPanel } from './panels/CollectionPanel.tsx';
import { SpritesPanel } from './panels/SpritesPanel.tsx';
import { PalettesPanel } from './panels/PalettesPanel.tsx';
import { SECTIONS } from './nav.ts';

/** Sections with a dedicated editor; others fall back to the read-only browser. */
const PANELS: Record<string, FC> = {
  sprites: SpritesPanel,
  palettes: PalettesPanel,
};

export function App() {
  const world = useWorld((s) => s.world);
  const refreshList = useWorld((s) => s.refreshList);
  const [active, setActive] = useState('overview');

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  if (!world) return <HomeScreen />;

  const section = SECTIONS.find((s) => s.key === active);
  const Dedicated = PANELS[active];

  return (
    <div className="h-full flex flex-col">
      <TopBar onClose={() => useWorld.setState({ world: null })} />
      <div className="flex-1 flex min-h-0">
        <Sidebar active={active} onSelect={setActive} />
        <main className="flex-1 overflow-auto p-6 min-w-0">
          {active === 'overview' || !section ? (
            <OverviewPanel />
          ) : Dedicated ? (
            <Dedicated />
          ) : (
            <CollectionPanel section={section} />
          )}
        </main>
      </div>
    </div>
  );
}
