import { Tabs, TabItem } from '@serendie/ui';
import { useState } from 'react';
import { PlanTab } from './tabs/PlanTab';
import { OpeningsTab } from './tabs/OpeningsTab';
import { FurnitureTab } from './tabs/FurnitureTab';
import { useTranslation } from '../lib/i18n';

export function Sidebar() {
  const [tab, setTab] = useState('plan');
  const { t } = useTranslation();

  return (
    <aside className="sidebar" aria-label="編集パネル">
      <div className="tabs-host">
        <Tabs
          value={tab}
          onValueChange={(e: { value: string }) => setTab(e.value)}
        >
          <TabItem value="plan" title={t('sidebar.tab.plan')} />
          <TabItem value="openings" title={t('sidebar.tab.openings')} />
          <TabItem value="furniture" title={t('sidebar.tab.furniture')} />
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
