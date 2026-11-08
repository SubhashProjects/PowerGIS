// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ROOT APPLICATION CONTAINER & VIEW ROUTER - MOBILE ADAPTIVE & B&W THEME
// ============================================================================

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GISProvider, useGIS } from './context/GISContext';
import { Header } from './components/layout/Header';
import { ScopeBanner } from './components/layout/ScopeBanner';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MasterMap } from './components/gis/MasterMap';
import { AssetTable } from './components/assets/AssetTable';
import { CapitalProjectsRDSS } from './components/projects/CapitalProjectsRDSS';
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
import { LoginPage } from './components/auth/LoginPage';
import { RoleBasedDashboard } from './components/dashboard/RoleBasedDashboard';
import { notificationService } from './services/notificationService';
import { NAVIGATION_ITEMS } from './config/navigationConfig';
import { X, Zap, ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const { selectedAsset, setSelectedAsset } = useGIS();
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleData = notificationService.getDashboardData(user);
  const unreadCount = roleData.notifications.filter(n => !n.read).length;

  const currentNav = NAVIGATION_ITEMS.find(item => item.id === activeTab);
  const isAuthorized = !currentNav?.roles || currentNav.roles.includes(user.role);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8f9fa] text-neutral-900 font-sans">
      {/* 1. Global Header with Mobile Drawer Trigger */}
      <Header
        onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        onNavigateTab={tab => setActiveTab(tab)}
      />

      {/* 2. Statutory Scope & Entitlement Banner */}
      <ScopeBanner />

      {/* 3. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={tab => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Primary Viewport Area */}
        <main
          className={`flex-1 relative flex flex-col bg-[#f8f9fa] min-h-0 ${
            activeTab === 'gis_map'
              ? 'overflow-hidden'
              : 'overflow-y-auto pb-16 md:pb-0'
          }`}
        >
          {/* Strict Zero-Trust Role Jurisdiction Access Gate */}
          {!isAuthorized ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-50 min-h-[460px]">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mb-4 shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 mb-2">
                Zero-Trust Access Control • Statutory Policy 4.2
              </span>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Access Restricted by Role Entitlement
              </h2>
              <p className="text-xs text-slate-600 max-w-md mb-6 leading-relaxed">
                Your official active role (<span className="font-bold text-slate-900">{user.role.toUpperCase()}</span> — {user.designation}) is not provisioned with statutory authorization for the module <span className="font-bold text-slate-900">"{currentNav?.label || activeTab}"</span>.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Permitted Command Center</span>
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <RoleBasedDashboard onNavigateTab={tab => setActiveTab(tab)} />}
              {activeTab === 'gis_map' && <MasterMap />}
              {activeTab === 'assets' && <AssetTable />}
              {activeTab === 'capital_projects' && <CapitalProjectsRDSS />}
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
            </>
          )}

          {/* Asset Detail Flyout Drawer (When selected on map or via search) */}
          {selectedAsset && (
            <div className="absolute bottom-20 sm:bottom-4 right-2 sm:right-4 left-2 sm:left-auto max-w-sm w-auto sm:w-full bg-[#0d0d0d]/95 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 shadow-2xl z-40 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center space-x-2 truncate">
                  <div className="p-1.5 rounded-lg bg-white/10 text-white flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-white truncate">
                      {selectedAsset.name || selectedAsset.code || selectedAsset.poleNumber}
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono truncate block">
                      {selectedAsset.code || selectedAsset.consumerNumber || 'Asset Detail'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-neutral-300 font-mono">
                {selectedAsset.voltageClass && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-sans">Voltage:</span>
                    <span className="text-white font-bold">{selectedAsset.voltageClass}</span>
                  </div>
                )}
                {selectedAsset.capacityMVA && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-sans">Capacity:</span>
                    <span className="text-white font-bold">{selectedAsset.capacityMVA} MVA</span>
                  </div>
                )}
                {selectedAsset.capacityKVA && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-sans">Rating:</span>
                    <span className="text-white font-bold">{selectedAsset.capacityKVA} kVA</span>
                  </div>
                )}
                {selectedAsset.loadPercentage !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400 font-sans">Current Load:</span>
                    <span className="text-white font-bold">{selectedAsset.loadPercentage}%</span>
                  </div>
                )}
                {selectedAsset.coordinates && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400 font-sans">GPS Coords:</span>
                    <span className="text-neutral-300">
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

      {/* 4. Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={tab => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        unreadCount={unreadCount}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <GISProvider>
      <MainLayout />
    </GISProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
