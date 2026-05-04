import { Tabs, TabItem } from '@serendie/ui';
import { useState } from 'react';
import { PlanTab } from './tabs/PlanTab';
import { OpeningsTab } from './tabs/OpeningsTab';
import { FurnitureTab } from './tabs/FurnitureTab';

export function Sidebar() {
  const [tab, setTab] = useState('plan');

  return (
    <aside className="sidebar" aria-label="編集パネル">
      <div className="tabs-host">
        <Tabs
          value={tab}
          onValueChange={(e: { value: string }) => setTab(e.value)}
        >
          <TabItem value="plan" title="間取り" />
          <TabItem value="openings" title="ドア・窓" />
          <TabItem value="furniture" title="家具" />
        </Tabs>
      </div>
      <div className="tab-host">
        {tab === 'plan' && <PlanTab />}
        {tab === 'openings' && <OpeningsTab />}
        {tab === 'furniture' && <FurnitureTab />}
      </div>
    </aside>
  );
}
