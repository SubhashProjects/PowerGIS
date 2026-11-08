// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// ROOT APPLICATION CONTAINER & VIEW ROUTER
// ============================================================================

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GISProvider, useGIS } from './context/GISContext';
import { Header } from './components/layout/Header';
import { ScopeBanner } from './components/layout/ScopeBanner';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { MasterMap } from './components/gis/MasterMap';
import { AssetTable } from './components/assets/AssetTable';
import { SmartMeterDashboard } from './components/smartMeters/SmartMeterDashboard';
import { WarrantyRegister } from './components/warranties/WarrantyRegister';
import { FaultList } from './components/faults/FaultList';
import { WorkOrderKanban } from './components/workOrders/WorkOrderKanban';
import { ContractorPWA } from './components/surveys/ContractorPWA';
import { SurveyApprovalQueue } from './components/surveys/SurveyApprovalQueue';
import { ScadaTelemetryDashboard } from './components/scada/ScadaTelemetryDashboard';
import { OutageManager } from './components/outages/OutageManager';
import { NetworkTraceViewer } from './components/topology/NetworkTraceViewer';
import { MaintenanceScheduler } from './components/preventive/MaintenanceScheduler';
import { DTLoadingAnalytics } from './components/dtLoading/DTLoadingAnalytics';
import { StoresInventory } from './components/stores/StoresInventory';
import { DisasterResponseCell } from './components/disaster/DisasterResponseCell';
import { PermitToWorkManager } from './components/safety/PermitToWorkManager';
import { AssetRiskMatrix } from './components/risk/AssetRiskMatrix';
import { AdminControlPanel } from './components/admin/AdminControlPanel';
import { X, ExternalLink, Zap, MapPin } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const { selectedAsset, setSelectedAsset } = useGIS();
  const [activeTab, setActiveTab] = useState<NavTabId>('gis_map');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0f1d] text-slate-100 font-sans">
      {/* 1. Global Header */}
      <Header />

      {/* 2. Statutory Scope & Entitlement Banner */}
      <ScopeBanner />

      {/* 3. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={tab => setActiveTab(tab)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Primary Viewport Area */}
        <main className="flex-1 relative overflow-y-auto flex flex-col bg-[#0b1220]">
          {activeTab === 'gis_map' && <MasterMap />}
          {activeTab === 'assets' && <AssetTable />}
          {activeTab === 'smart_meters' && <SmartMeterDashboard />}
          {activeTab === 'warranties' && <WarrantyRegister />}
          {activeTab === 'faults' && <FaultList />}
          {activeTab === 'work_orders' && <WorkOrderKanban />}
          {activeTab === 'contractor_pwa' && <ContractorPWA />}
          {activeTab === 'survey_approvals' && <SurveyApprovalQueue />}
          {activeTab === 'scada' && <ScadaTelemetryDashboard />}
          {activeTab === 'outages' && <OutageManager />}
          {activeTab === 'topology' && <NetworkTraceViewer />}
          {activeTab === 'preventive' && <MaintenanceScheduler />}
          {activeTab === 'dt_loading' && <DTLoadingAnalytics />}
          {activeTab === 'stores' && <StoresInventory />}
          {activeTab === 'disaster' && <DisasterResponseCell />}
          {activeTab === 'safety_ptw' && <PermitToWorkManager />}
          {activeTab === 'asset_risk' && <AssetRiskMatrix />}
          {activeTab === 'backup_restore' && <AdminControlPanel />}
          {activeTab === 'admin_panel' && <AdminControlPanel />}

          {/* Asset Detail Flyout Drawer (When selected on map or via search) */}
          {selectedAsset && (
            <div className="absolute bottom-4 right-4 max-w-sm w-full bg-[#11192b]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl z-40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">
                      {selectedAsset.name || selectedAsset.code || selectedAsset.poleNumber}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedAsset.code || selectedAsset.consumerNumber || 'Asset Detail'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                {selectedAsset.voltageClass && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Voltage:</span>
                    <span className="text-amber-400 font-bold">{selectedAsset.voltageClass}</span>
                  </div>
                )}
                {selectedAsset.capacityMVA && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Capacity:</span>
                    <span className="text-sky-400 font-bold">{selectedAsset.capacityMVA} MVA</span>
                  </div>
                )}
                {selectedAsset.capacityKVA && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Rating:</span>
                    <span className="text-emerald-400 font-bold">{selectedAsset.capacityKVA} kVA</span>
                  </div>
                )}
                {selectedAsset.loadPercentage !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Current Load:</span>
                    <span className="text-amber-300 font-bold">{selectedAsset.loadPercentage}%</span>
                  </div>
                )}
                {selectedAsset.coordinates && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">GPS Coords:</span>
                    <span className="text-slate-300">
                      {Array.isArray(selectedAsset.coordinates[0])
                        ? `${selectedAsset.coordinates[0][0].toFixed(4)}, ${selectedAsset.coordinates[0][1].toFixed(4)}`
                        : `${selectedAsset.coordinates[0].toFixed(4)}, ${selectedAsset.coordinates[1].toFixed(4)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <GISProvider>
        <MainLayout />
      </GISProvider>
    </AuthProvider>
  );
};

export default App;
