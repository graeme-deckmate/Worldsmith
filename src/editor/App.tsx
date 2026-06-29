import { useEffect, useState } from 'react';
import { useWorld } from '../store/worldStore.ts';
import { HomeScreen } from './HomeScreen.tsx';
import { TopBar } from './TopBar.tsx';
import { Sidebar } from './Sidebar.tsx';
import { OverviewPanel } from './panels/OverviewPanel.tsx';
import { CollectionPanel } from './panels/CollectionPanel.tsx';
import { SECTIONS } from './nav.ts';

export function App() {
  const world = useWorld((s) => s.world);
  const refreshList = useWorld((s) => s.refreshList);
  const [active, setActive] = useState('overview');

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  if (!world) return <HomeScreen />;

  const section = SECTIONS.find((s) => s.key === active);

  return (
    <div className="h-full flex flex-col">
      <TopBar onClose={() => useWorld.setState({ world: null })} />
      <div className="flex-1 flex min-h-0">
        <Sidebar active={active} onSelect={setActive} />
        <main className="flex-1 overflow-auto p-6 min-w-0">
          {active === 'overview' || !section ? (
            <OverviewPanel />
          ) : (
            <CollectionPanel section={section} />
          )}
        </main>
      </div>
    </div>
  );
}
