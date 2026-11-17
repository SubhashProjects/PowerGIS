import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NAVIGATION_ITEMS, NAVIGATION_CATEGORIES, NavTabId } from '../../config/navigationConfig';
import { X, Search, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export type { NavTabId };

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, collapsed, onToggleCollapse, mobileOpen = false, onCloseMobile }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const visibleItems = useMemo(() => NAVIGATION_ITEMS.filter(item => !item.roles || item.roles.includes(user.role)), [user.role]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => normalizedQuery ? visibleItems.filter(item => `${item.label} ${item.description} ${item.category}`.toLowerCase().includes(normalizedQuery)) : visibleItems, [normalizedQuery, visibleItems]);

  const renderNav = (compact: boolean) => (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {!compact && (
        <div className="mb-2 px-1">
          <label className="sr-only" htmlFor="powergis-module-search">Search modules</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
            <input id="powergis-module-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search modules" className="h-8 w-full rounded-md border border-neutral-200 bg-white pl-8 pr-2 text-xs" />
          </div>
        </div>
      )}

      {NAVIGATION_CATEGORIES.map(category => {
        const categoryItems = filteredItems.filter(item => item.category === category.name);
        if (!categoryItems.length) return null;
        const isCollapsed = collapsedGroups[category.name];
        return (
          <section key={category.name} className="mb-3">
            {!compact ? (
              <button type="button" onClick={() => setCollapsedGroups(prev => ({ ...prev, [category.name]: !prev[category.name] }))} className="flex min-h-7 w-full items-center justify-between px-2 text-[10px] font-bold text-neutral-600 hover:bg-neutral-50" aria-expanded={!isCollapsed}>
                <span>{category.name}</span>
                <span className="flex items-center gap-1">
                  <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[9px] text-neutral-600">{categoryItems.length}</span>
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              </button>
            ) : <div className="my-2 border-t border-neutral-100" aria-hidden="true" />}

            {!isCollapsed && <div className="mt-1 space-y-0.5">
              {categoryItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => { onSelectTab(item.id); onCloseMobile?.(); }} className={`pg-nav-item w-full ${compact ? 'justify-center px-2' : 'justify-start px-2.5'} flex items-center gap-2.5 rounded-md py-2 text-xs ${active ? 'pg-nav-active font-bold' : 'font-normal'}`} title={compact ? `${item.label}: ${item.description}` : item.description} aria-current={active ? 'page' : undefined}>
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {!compact && <span className="min-w-0 truncate text-left">{item.label}</span>}
                  </button>
                );
              })}
            </div>}
          </section>
        );
      })}

      {!compact && filteredItems.length === 0 && <div className="p-4 text-center text-xs text-neutral-600">No modules match your search.</div>}
    </div>
  );

  return (
    <>
      <aside className={`pg-sidebar hidden md:flex flex-col border-r transition-all duration-200 select-none ${collapsed ? 'w-16' : 'w-64'}`}>
        {renderNav(collapsed)}
        <div className="border-t border-neutral-200 bg-neutral-50 p-2"><div className="flex items-center gap-2"><button type="button" onClick={onToggleCollapse} className="h-8 w-8 rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100" title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <PanelLeftOpen className="mx-auto h-4 w-4" /> : <PanelLeftClose className="mx-auto h-4 w-4" />}</button>{!collapsed && <div className="flex min-w-0 flex-1 items-center justify-between text-[10px]"><span className="font-bold text-neutral-700">PowerGIS</span><span className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-bold text-neutral-800">{user.role}</span></div>}</div></div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button type="button" className="fixed inset-0 bg-black/30" aria-label="Close navigation" onClick={onCloseMobile} />
          <aside className="pg-mobile-drawer relative z-10 flex h-full w-72 max-w-[88vw] flex-col border-r bg-white">
            <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
              <div className="min-w-0"><div className="text-sm font-bold">POWERGIS</div><div className="text-[10px] text-neutral-600">Enterprise modules</div></div>
              <button type="button" onClick={onCloseMobile} className="h-9 w-9 rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50" aria-label="Close navigation"><X className="mx-auto h-4 w-4" /></button>
            </div>
            {renderNav(false)}
            <div className="border-t border-neutral-200 bg-neutral-50 p-3"><div className="flex items-center justify-between text-[10px]"><span className="font-bold text-neutral-700">Signed in as</span><span className="font-bold text-neutral-900">{user.role}</span></div></div>
          </aside>
        </div>
      )}
    </>
  );
};
