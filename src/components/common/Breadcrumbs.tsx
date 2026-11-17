import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NAVIGATION_ITEMS, NavTabId } from '../../config/navigationConfig';

export const Breadcrumbs: React.FC<{ activeTab: NavTabId; onNavigate: (tab: NavTabId) => void }> = ({ activeTab, onNavigate }) => {
  const item = NAVIGATION_ITEMS.find(x => x.id === activeTab);
  return <nav aria-label="Breadcrumb" className="flex items-center gap-1 px-4 py-2 border-b border-neutral-100 bg-white text-xs">
    <button className="font-bold hover:underline" onClick={() => onNavigate('dashboard')}>Dashboard</button>
    {activeTab !== 'dashboard' && <><ChevronRight className="w-3 h-3 text-neutral-400" /><span aria-current="page" className="font-medium">{item?.label ?? activeTab}</span></>}
  </nav>;
};
