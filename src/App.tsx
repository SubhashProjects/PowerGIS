// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ROOT APPLICATION CONTAINER & VIEW ROUTER - MOBILE ADAPTIVE & B&W THEME
// ============================================================================

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GISProvider, useGIS } from './context/GISContext';
import { Header } from './components/layout/Header';
import { ScopeBanner } from './components/layout/ScopeBanner';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MasterMap } from './components/gis/MasterMap';
import { OfflineGISWorkspace } from './components/gis/OfflineGISWorkspace';
import { AssetTable } from './components/assets/AssetTable';
import { AssetLifecycleManagement } from './components/assets/AssetLifecycleManagement';
import { EnterprisePlanningCenter } from './components/assets/EnterprisePlanningCenter';
import { PlatformEvolutionCenter } from './components/platform/PlatformEvolutionCenter';
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
import { CommonPage } from './components/common/CommonPage';
import { StylesPage } from './components/styles/StylesPage';
import { CommandPalette } from './components/common/CommandPalette';
import { Breadcrumbs } from './components/common/Breadcrumbs';
import { SyncCenter } from './components/common/SyncCenter';
import { DataQualityCenter } from './components/common/DataQualityCenter';
import { NotificationCenter } from './components/common/NotificationCenter';
import { OperationalRecordDrawer } from './components/common/OperationalRecordDrawer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { notificationService } from './services/notificationService';
import { assetService } from './services/assetService';
import { isSupabaseConfigured } from './lib/supabase';
import { registerOperationalOfflineHandlers } from './lib/offlineOperationalHandlers';

registerOperationalOfflineHandlers();
import { NAVIGATION_ITEMS } from './config/navigationConfig';
import { COMMONS, LABELS } from './commons';
import { X, Zap, ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

const MainLayout: React.FC = () => {
 const { user } = useAuth();
 const { selectedAsset, setSelectedAsset } = useGIS();
 const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

 useEffect(() => {
  const handler = (event: Event) => {
   const tab = (event as CustomEvent<{ tab?: NavTabId }>).detail?.tab;
   if (tab && NAVIGATION_ITEMS.some(item => item.id === tab)) setActiveTab(tab);
  };
  window.addEventListener('powergis:navigate', handler);
  return () => window.removeEventListener('powergis:navigate', handler);
 }, []);

 const roleData = notificationService.getDashboardData(user);
 const unreadCount = roleData.notifications.filter(n => !n.read).length;

 const currentNav = NAVIGATION_ITEMS.find(item => item.id === activeTab);
 const isAuthorized = !currentNav?.roles || currentNav.roles.includes(user.role);

 return (
 <div className="pg-app-shell flex flex-col h-screen w-screen overflow-hidden font-sans"> 
 {/* 1. Global Header with Mobile Drawer Trigger */}
 <Header
 onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
 onNavigateTab={tab => setActiveTab(tab)}
 onOpenCommandPalette={() => setCommandPaletteOpen(true)}
 />
 <CommandPalette
 open={commandPaletteOpen}
 onClose={() => setCommandPaletteOpen(false)}
 onNavigate={tab => setActiveTab(tab)}
 onSelectAsset={asset => setSelectedAsset(asset)}
 />

 {/* 2. Statutory Scope & Entitlement Banner */}
 <ScopeBanner />
 <SyncCenter />
 <Breadcrumbs activeTab={activeTab} onNavigate={tab => setActiveTab(tab)} />

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
 className={`pg-main flex-1 relative flex flex-col min-h-0 ${
 activeTab === 'gis_map'
 ? 'overflow-hidden'
 : 'overflow-y-auto pb-16 md:pb-0'
 }`}
 >
 {/* Strict Zero-Trust Role Jurisdiction Access Gate */}
 {!isAuthorized ? (
 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-white border border-neutral-200 rounded-md m-4 min-h-[460px]">
 <div className="w-12 h-12 rounded-md bg-neutral-50 border border-neutral-200 text-neutral-700 flex items-center justify-center mb-3">
 <ShieldAlert className="w-6 h-6" />
 </div>
 <span className="text-[10px] font-bold text-neutral-900 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200 mb-2">
 {LABELS.zeroTrustGate.policyBadge}
 </span>
 <h2 className="text-base font-bold text-neutral-950 mb-1 tracking-tight">
 {LABELS.zeroTrustGate.heading}
 </h2>
 <p className="text-xs text-neutral-600 max-w-md mb-5 leading-relaxed">
 {LABELS.zeroTrustGate.messagePrefix}<span className="font-bold text-neutral-950">{user.role.toUpperCase()}</span> — {user.designation}{LABELS.zeroTrustGate.messageMiddle}<span className="font-bold text-neutral-950">{currentNav?.label || activeTab}</span>{LABELS.zeroTrustGate.messageSuffix}
 </p>
 <button
 onClick={() => setActiveTab('dashboard')}
 className="px-3.5 py-2 rounded-md bg-[#090909] hover:bg-neutral-800 text-white font-medium text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
 >
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>{LABELS.zeroTrustGate.returnButton}</span>
 </button>
 </div>
 ) : (
 <>
 {activeTab === 'dashboard' && <RoleBasedDashboard onNavigateTab={tab => setActiveTab(tab)} />}
 {activeTab === 'gis_map' && <MasterMap />}
 {activeTab === 'offline_gis' && <OfflineGISWorkspace />}
 {activeTab === 'assets' && <AssetTable />}
 {activeTab === 'asset_lifecycle' && <AssetLifecycleManagement />}
 {activeTab === 'enterprise_planning' && <EnterprisePlanningCenter />}
 {activeTab === 'platform_evolution' && <PlatformEvolutionCenter />}
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
 {activeTab === 'backup_restore' && <AdminControlPanel initialTab="migration" />}
 {activeTab === 'admin_panel' && <AdminControlPanel initialTab="users" />}
 {activeTab === 'notifications' && <NotificationCenter />}
 {activeTab === 'data_quality' && <DataQualityCenter />}
 {activeTab === 'common' && <CommonPage />}
 {activeTab === 'styles' && <StylesPage />}
 </>
 )}

 {/* Universal GIS-linked operational record drawer */}
 {selectedAsset && <OperationalRecordDrawer asset={selectedAsset} onClose={() => setSelectedAsset(null)} onNavigate={tab => setActiveTab(tab)} />}

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
 const { isAuthenticated, passwordRecovery } = useAuth();

 React.useEffect(() => {
 if (!isAuthenticated || passwordRecovery || !isSupabaseConfigured) return;
 void assetService.loadFromSupabase().catch(error => console.error('Unable to load operational asset data:', error));
 }, [isAuthenticated, passwordRecovery]);

 if (!isAuthenticated || passwordRecovery) {
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
 <ErrorBoundary>
  <AuthProvider>
   <AppContent />
  </AuthProvider>
 </ErrorBoundary>
 );
};

export default App;
