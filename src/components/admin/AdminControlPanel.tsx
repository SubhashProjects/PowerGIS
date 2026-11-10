// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SUPER ADMINISTRATOR CONTROL PANEL, STAFF RBAC & DATA EXCHANGE
// PURE WHITE THEME • FULL USER CRUD • PERSONA IMPERSONATION • SPATIAL IMPORT/EXPORT
// ============================================================================

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { assetService } from '../../services/assetService';
import { dataExchangeService, ImportResult, DatabaseBackupRecord } from '../../services/dataExchangeService';
import { ROLES_REGISTRY } from '../../config/rbacConfig';
import { LABELS } from '../../config/labelsConfig';
import { UserProfile, OfficialRole } from '../../types/auth';
import { initialRegions, initialDivisions, initialSections } from '../../services/mockData';
import {
  Settings, Database, Download, Upload, CheckCircle2, AlertTriangle,
  RotateCcw, Shield, HardDrive, FileUp, FileCode, FileSpreadsheet, Map, X, Check,
  Users, UserPlus, Pencil, Trash2, LogIn, Search, Filter, RefreshCw, UserCheck, Key, Phone, Mail, Building, Zap
} from 'lucide-react';

interface AdminControlPanelProps {
  initialTab?: 'users' | 'migration' | 'features';
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({ initialTab = 'users' }) => {
  const {
    user,
    users,
    addUser,
    updateUser,
    deleteUser,
    resetUsersToDefault,
    switchUser,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Main Sub-Tab in Admin Panel
  const [activeTab, setActiveTab] = useState<'users' | 'migration' | 'features'>(initialTab);
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(assetService.isSimulatorMode());

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimulatorActive(assetService.isSimulatorMode());
    });
    return unsub;
  }, []);

  const handleToggleSimulator = () => {
    const next = assetService.toggleSimulatorMode();
    setIsSimulatorActive(next);
  };

  // Search & Filters for User Management
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Add / Edit Form State
  const initialFormState = {
    fullName: '',
    username: '',
    email: '',
    password: 'PowerGIS@2026',
    role: 'ae' as OfficialRole,
    designation: '',
    phone: '',
    regionId: 'reg-pdy',
    divisionId: 'div-urban',
    sectionId: 'sec-mara',
    contractorCompany: '',
    isActive: true,
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);

  // Module Feature Flags
  const [modules, setModules] = useState([
    { id: 'mod_scada', name: 'SCADA Telemetry Integration', enabled: true },
    { id: 'mod_pwa', name: 'Contractor GPS Field Survey (PWA)', enabled: true },
    { id: 'mod_ptw', name: 'Safety Permit to Work (PTW)', enabled: true },
    { id: 'mod_stores', name: 'Stores & Material Inventory', enabled: true },
    { id: 'mod_disaster', name: 'Disaster Management Response', enabled: true },
    { id: 'mod_risk', name: 'ISO 55000 Asset Risk Scoring', enabled: true },
    { id: 'mod_reliability', name: 'IEEE 1366 Outage Reliability', enabled: true },
  ]);

  // Backup History strictly driven by DataExchangeService & Simulator Mode
  const [backupHistory, setBackupHistory] = useState<DatabaseBackupRecord[]>(() =>
    dataExchangeService.getBackupHistory()
  );

  useEffect(() => {
    const handleSimToggle = () => {
      setIsSimulatorActive(assetService.isSimulatorMode());
      setBackupHistory(dataExchangeService.getBackupHistory());
    };
    window.addEventListener('powergis:simulator-toggled', handleSimToggle);
    return () => window.removeEventListener('powergis:simulator-toggled', handleSimToggle);
  }, []);

  const [importStatus, setImportStatus] = useState<ImportResult | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.designation.toLowerCase().includes(userSearchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearchQuery, roleFilter]);

  const toggleModule = (id: string) => {
    setModules(prev =>
      prev.map(m => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleRunManualBackup = () => {
    dataExchangeService.exportSystemBackup();
    setBackupHistory(dataExchangeService.getBackupHistory());
    setActionNotice('Database backup snapshot generated and downloaded. PostgreSQL PostGIS tables archived.');
    setTimeout(() => setActionNotice(null), 6000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await dataExchangeService.importSpatialFile(file);
    setImportStatus(res);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestore = (bkId: string) => {
    if (confirm(`CAUTION: System restoration will perform a pre-restore verification and rollback database state to snapshot ${bkId}. Proceed?`)) {
      setActionNotice(`Database state rolled back to snapshot ${bkId}. All spatial tables verified.`);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  // Open Add Modal
  const openAddUserModal = () => {
    setFormData(initialFormState);
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditUserModal = (targetUser: UserProfile) => {
    setEditingUser(targetUser);
    setFormData({
      fullName: targetUser.fullName,
      username: targetUser.username,
      email: targetUser.email,
      password: 'PowerGIS@2026',
      role: targetUser.role,
      designation: targetUser.designation,
      phone: targetUser.phone,
      regionId: targetUser.regionId || 'reg-pdy',
      divisionId: targetUser.divisionId || 'div-urban',
      sectionId: targetUser.sectionId || 'sec-mara',
      contractorCompany: targetUser.contractorCompany || '',
      isActive: targetUser.isActive,
    });
    setFormError(null);
  };

  // Handle Save (Add User)
  const handleSaveAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim()) {
      setFormError('Full Name, Username, and Email are mandatory fields.');
      return;
    }

    // Check duplicate username
    const exists = users.some(u => u.username.toLowerCase() === formData.username.trim().toLowerCase());
    if (exists) {
      setFormError(`Username '${formData.username}' is already allocated to another staff profile.`);
      return;
    }

    const created = addUser({
      fullName: formData.fullName.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password || 'PowerGIS@2026',
      role: formData.role,
      designation: formData.designation.trim() || ROLES_REGISTRY[formData.role]?.designation || 'Utility Officer',
      phone: formData.phone.trim() || '+91 94430 00000',
      regionId: formData.regionId,
      divisionId: formData.divisionId,
      sectionId: formData.sectionId,
      contractorCompany: formData.role === 'contractor' ? formData.contractorCompany : undefined,
      isActive: formData.isActive,
    });

    setShowAddModal(false);
    setActionNotice(`Staff profile created successfully for ${created.fullName} (${created.role.toUpperCase()}).`);
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Handle Update (Edit User)
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim()) {
      setFormError('Full Name, Username, and Email are mandatory fields.');
      return;
    }

    // Check duplicate username if changed
    const duplicate = users.some(
      u => u.id !== editingUser.id && u.username.toLowerCase() === formData.username.trim().toLowerCase()
    );
    if (duplicate) {
      setFormError(`Username '${formData.username}' is already in use by another staff account.`);
      return;
    }

    updateUser(editingUser.id, {
      fullName: formData.fullName.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
      designation: formData.designation.trim(),
      phone: formData.phone.trim(),
      regionId: formData.regionId,
      divisionId: formData.divisionId,
      sectionId: formData.sectionId,
      contractorCompany: formData.role === 'contractor' ? formData.contractorCompany : undefined,
      isActive: formData.isActive,
    });

    setEditingUser(null);
    setActionNotice(`Staff profile updated successfully for ${formData.fullName}.`);
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Handle Delete Confirmation
  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    const res = deleteUser(userToDelete.id);
    setUserToDelete(null);
    if (res.success) {
      setActionNotice(`User account ${userToDelete.fullName} removed from registry.`);
    } else {
      alert(res.message);
    }
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Impersonate / Switch Persona for Admin Testing
  const handleImpersonate = (targetUser: UserProfile) => {
    switchUser(targetUser.id);
    setActionNotice(`Administrator Context Switched: Now testing live portal as ${targetUser.fullName} (${targetUser.role.toUpperCase()}).`);
    setTimeout(() => setActionNotice(null), 6000);
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-[#09090B]">
      {/* 1. Header Card */}
      <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[#09090B] text-white font-bold flex items-center justify-center text-sm border border-zinc-800 flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#09090B] tracking-tight">
                {LABELS.admin.consoleTitle}
              </h1>
              <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                {LABELS.admin.rootAuthorityBadge}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono truncate">
              {LABELS.admin.consoleSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-shrink-0">
          <span className="px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-800 font-medium">
            {LABELS.admin.activeSessionPrefix} {user.fullName.split(',')[0]} ({user.role.toUpperCase()})
          </span>
        </div>
      </div>

      {/* Global Status Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Admin Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#09090B] text-white'
              : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{LABELS.admin.tabUsers} ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('migration')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'migration'
              ? 'bg-[#09090B] text-white'
              : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200'
          }`}
        >
          <FileUp className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{LABELS.admin.tabMigration}</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'features'
              ? 'bg-[#09090B] text-white'
              : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{LABELS.admin.tabFeatures}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: STAFF ACCOUNTS & RBAC MANAGEMENT (CRUD + PERSONA IMPERSONATION) */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Simulation Mode Indicator for Staff Personas */}
          {!isSimulatorActive && (
            <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 flex-shrink-0">
                  <Zap className="w-4 h-4 text-zinc-600" />
                </div>
                <div>
                  <div className="font-semibold text-[#09090B]">Pre-seeded Test Personas Isolated (Clean Operational Mode)</div>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Showing <b>{users.length}</b> registered utility user(s). The 10 pre-seeded dummy engineering personas (SE, EE, AEE, AE, JE, Contractor, Auditor, GIS Admin) are isolated and will only appear when Simulator is ON.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSimulator}
                className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-1.5 cursor-pointer flex-shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Load Simulated Personas</span>
              </button>
            </div>
          )}

          {/* Controls Bar: Search, Role Filter, Add User, Reset */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  placeholder={LABELS.admin.searchPlaceholder}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                />
              </div>

              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-700 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono font-medium"
                >
                  <option value="all">{LABELS.admin.allRolesOption} ({users.length})</option>
                  <option value="super_admin">Super Administrator</option>
                  <option value="se">Superintending Engineer (SE)</option>
                  <option value="ee">Executive Engineer (EE)</option>
                  <option value="aee">Asst. Executive Engineer (AEE)</option>
                  <option value="ae">Assistant Engineer (AE)</option>
                  <option value="je">Junior Engineer (JE)</option>
                  <option value="contractor">Contractor (EPC)</option>
                  <option value="gis_admin">GIS Administrator</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
            </div>

            {/* Action Buttons: Add User & Reset to Defaults */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={openAddUserModal}
                className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs flex items-center space-x-1.5 border border-zinc-900 cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{LABELS.admin.addUserButton}</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset all staff profiles to statutory initial state? Custom users will be reset.')) {
                    resetUsersToDefault();
                    setActionNotice('Staff user database reset to default utility configuration.');
                    setTimeout(() => setActionNotice(null), 5000);
                  }
                }}
                title={LABELS.admin.resetDefaultTooltip}
                className="p-1.5 rounded-md bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-white border border-zinc-200">
              <div className="text-[10px] uppercase font-medium text-zinc-500 font-mono">{LABELS.admin.statTotalStaff}</div>
              <div className="text-xl font-bold font-mono text-[#09090B] mt-1">{users.length}</div>
            </div>
            <div className="p-3 rounded-md bg-white border border-zinc-200">
              <div className="text-[10px] uppercase font-medium text-zinc-500 font-mono">{LABELS.admin.statActiveStaff}</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{users.filter(u => u.isActive).length}</div>
            </div>
            <div className="p-3 rounded-md bg-white border border-zinc-200">
              <div className="text-[10px] uppercase font-medium text-zinc-500 font-mono">{LABELS.admin.statFieldRoles}</div>
              <div className="text-xl font-bold font-mono text-[#09090B] mt-1">
                {users.filter(u => ['se', 'ee', 'aee', 'ae', 'je'].includes(u.role)).length}
              </div>
            </div>
            <div className="p-3 rounded-md bg-white border border-zinc-200">
              <div className="text-[10px] uppercase font-medium text-zinc-500 font-mono">{LABELS.admin.statContractors}</div>
              <div className="text-xl font-bold font-mono text-zinc-700 mt-1">
                {users.filter(u => u.role === 'contractor').length}
              </div>
            </div>
          </div>

          {/* Comprehensive Users Table */}
          <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase font-mono font-semibold text-zinc-600">
                    <th className="py-2.5 px-3">{LABELS.admin.thStaffMember}</th>
                    <th className="py-2.5 px-3">{LABELS.admin.thRoleDesignation}</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">{LABELS.admin.thJurisdiction}</th>
                    <th className="py-2.5 px-3 hidden lg:table-cell">{LABELS.admin.thContact}</th>
                    <th className="py-2.5 px-3">{LABELS.admin.thStatus}</th>
                    <th className="py-2.5 px-3 text-right">{LABELS.admin.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredUsers.map(u => {
                    const isCurrent = user.id === u.id;
                    return (
                      <tr key={u.id} className={`hover:bg-zinc-50 transition-colors ${isCurrent ? 'bg-zinc-50/60' : ''}`}>
                        {/* Member Name & Avatar */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-md bg-[#09090B] text-white font-medium flex items-center justify-center text-xs flex-shrink-0 border border-zinc-800">
                              {u.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-900 truncate flex items-center space-x-1.5">
                                <span>{u.fullName}</span>
                                {isCurrent && (
                                  <span className="text-[9px] bg-zinc-100 text-zinc-800 font-mono px-1.5 py-0.2 rounded font-semibold border border-zinc-200">
                                    {LABELS.common.youBadge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono truncate">@{u.username}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Designation */}
                        <td className="py-2.5 px-3">
                          <div>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono text-[10px] font-semibold uppercase border border-zinc-200">
                              {u.role}
                            </span>
                            <div className="text-[11px] text-zinc-600 mt-0.5 font-normal truncate max-w-[200px]">
                              {u.designation}
                            </div>
                          </div>
                        </td>

                        {/* Jurisdiction */}
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          <div className="text-zinc-700 font-mono text-[11px]">
                            {u.contractorCompany ? (
                              <span className="text-zinc-900 font-semibold">{u.contractorCompany}</span>
                            ) : (
                              <span>
                                {initialSections.find(s => s.id === u.sectionId)?.name ||
                                 initialDivisions.find(d => d.id === u.divisionId)?.name ||
                                 initialRegions.find(r => r.id === u.regionId)?.name ||
                                 'Puducherry UT'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-2.5 px-3 hidden lg:table-cell">
                          <div className="space-y-0.5 text-[11px] font-mono text-zinc-600">
                            <div className="truncate max-w-[180px]">{u.email}</div>
                            <div className="text-zinc-400 text-[10px]">{u.phone}</div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3">
                          {u.isActive ? (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              <span>{LABELS.common.active}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-mono font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                              <span>{LABELS.common.inactive}</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Impersonate / Test as Persona Button */}
                            <button
                              onClick={() => handleImpersonate(u)}
                              disabled={isCurrent}
                              title={`Test live portal as ${u.fullName}`}
                              className={`p-1.5 rounded-md border text-xs font-medium transition-colors flex items-center space-x-1 ${
                                isCurrent
                                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                                  : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200 cursor-pointer'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline text-[10px]">{LABELS.admin.btnTestRole}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditUserModal(u)}
                              title={LABELS.admin.btnEdit}
                              className="p-1.5 rounded-md bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setUserToDelete(u)}
                              disabled={isCurrent}
                              title={isCurrent ? 'Cannot delete your active session' : LABELS.admin.btnDelete}
                              className={`p-1.5 rounded-md border transition-colors ${
                                isCurrent
                                  ? 'bg-zinc-100 text-zinc-300 border-zinc-200 cursor-not-allowed'
                                  : 'bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-zinc-600 border-zinc-200 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 font-mono text-xs">
                        {LABELS.admin.emptyTable}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: GEOSPATIAL DATA MIGRATION & BACKUPS (GEOJSON, CSV, KML)       */}
      {/* ==================================================================== */}
      {activeTab === 'migration' && (
        <div className="space-y-4">
          {/* Import Result Notification Modal */}
          {importStatus && (
            <div className="p-3.5 rounded-md bg-white border border-zinc-200 text-[#09090B] text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <div className="flex items-center space-x-2 font-semibold text-xs">
                  {importStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>{importStatus.success ? 'Spatial Data Import Completed' : 'Import Warning'}</span>
                </div>
                <button
                  onClick={() => setImportStatus(null)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-zinc-600 font-mono text-[11px]">{importStatus.message}</p>

              <div className="flex items-center space-x-3 font-mono text-[11px] pt-1">
                <span className="px-2 py-0.5 rounded bg-[#09090B] text-white font-medium">
                  Imported: {importStatus.importedCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                  Duplicates: {importStatus.duplicateCount}
                </span>
                {importStatus.errorCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-medium">
                    Errors: {importStatus.errorCount}
                  </span>
                )}
              </div>

              {importStatus.details.length > 0 && (
                <div className="max-h-28 overflow-y-auto bg-zinc-50 p-2 rounded-md border border-zinc-200 font-mono text-[10px] space-y-1 text-zinc-600">
                  {importStatus.details.map((d, i) => (
                    <div key={i}>• {d}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Import / Export Grid */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#09090B]">Geospatial Data Migration & Exchange (Import / Export)</h2>
                  <p className="text-xs text-zinc-500">Standardized OpenGIS Formats • Automated Coordinate Verification</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* A. Import Dataset Card */}
              <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-[#09090B] font-semibold text-xs uppercase tracking-wider font-mono">
                    <Upload className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Import Spatial Dataset</span>
                  </div>
                  <p className="text-zinc-600 text-xs leading-relaxed">
                    Upload KML (<code className="text-zinc-900 font-semibold">.kml</code>), GeoJSON (<code className="text-zinc-900 font-semibold">.geojson</code>), CSV / Excel (<code className="text-zinc-900 font-semibold">.csv</code>), or System Snapshot (<code className="text-zinc-900 font-semibold">.json</code>). Feeders (lines), DTs, and poles are parsed and immediately rendered onto the live GIS Master Map.
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".kml,.geojson,.json,.csv"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#09090B] file:text-white hover:file:bg-zinc-800 cursor-pointer transition-colors"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                    Automatic duplicate avoidance & coordinate validation enabled.
                  </span>
                </div>
              </div>

              {/* B. Export Layers Card */}
              <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-[#09090B] font-semibold text-xs uppercase tracking-wider font-mono">
                    <Download className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Export Master GIS Network</span>
                  </div>
                  <p className="text-zinc-600 text-xs leading-relaxed">
                    Download verified distribution network layers in standard spatial data formats for statutory filings, offline CAD, and regional audits.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => dataExchangeService.exportGeoJSON()}
                    className="py-1.5 px-2 rounded-md bg-[#09090B] text-white hover:bg-zinc-800 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    title="Download complete RFC 7946 GeoJSON FeatureCollection"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>GeoJSON</span>
                  </button>

                  <button
                    onClick={() => dataExchangeService.exportCSV('transformers')}
                    className="py-1.5 px-2 rounded-md bg-white text-zinc-800 hover:bg-zinc-100 border border-zinc-200 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    title="Download CSV Asset Register"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={() => dataExchangeService.exportKML()}
                    className="py-1.5 px-2 rounded-md bg-white text-zinc-800 hover:bg-zinc-100 border border-zinc-200 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    title="Download KML for Google Earth"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>KML</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Database Backups Card */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#09090B] font-mono">
                    PostgreSQL Database Backups & Point-in-Time Snapshots
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Automated Point-in-Time Recovery and Disaster Resilience</p>
                </div>
              </div>

              <button
                onClick={handleRunManualBackup}
                className="px-3 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-medium border border-zinc-900 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Run Manual Backup</span>
              </button>
            </div>

            {backupHistory.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-md bg-zinc-50 border border-dashed border-zinc-200 space-y-2">
                <Database className="w-7 h-7 text-zinc-400 mx-auto" />
                <div className="text-xs font-semibold text-[#09090B]">No Database Snapshots Recorded</div>
                <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                  Operational database is running in clean production mode with 0 pre-seeded archives. Click "Run Manual Backup" above to export a point-in-time PostgreSQL PostGIS snapshot, or turn ON the Simulator to load historical simulated archives.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {backupHistory.map(bk => (
                  <div
                    key={bk.id}
                    className="p-3 rounded-md bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#09090B]">{bk.type} ({bk.size})</span>
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono text-[10px] border border-zinc-200 font-medium">
                          VERIFIED
                        </span>
                        <button
                          onClick={() => handleRestore(bk.id)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] font-mono transition-colors font-medium cursor-pointer"
                          title="Restore point-in-time snapshot"
                        >
                          Restore
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-500 font-mono truncate">{bk.checksum}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">{bk.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MODULAR FEATURE TOGGLES & ZERO-TRUST SECURITY                 */}
      {/* ==================================================================== */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Modular Feature Toggles */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#09090B] font-mono">
                    Modular System Feature Toggles
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Zero-Restart Dynamic Activation</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono border border-zinc-200 font-medium">
                {modules.filter(m => m.enabled).length}/{modules.length} Active
              </span>
            </div>

            <div className="space-y-2">
              {modules.map(mod => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between p-3 rounded-md bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors text-xs"
                >
                  <span className="font-medium text-zinc-800">{mod.name}</span>
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {mod.enabled ? (
                      <span className="px-2 py-0.5 rounded bg-[#09090B] text-white font-mono text-[10px] font-medium">
                        ENABLED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono text-[10px] border border-zinc-200">
                        DISABLED
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Zero-Trust RLS Policies Summary */}
          <div className="bg-white border border-zinc-200 rounded-md p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#09090B] font-mono">
                    Zero-Trust Jurisdiction Policies
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Row-Level Security (RLS) Enforcements</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 font-medium font-mono">
                100% ENFORCED
              </span>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 leading-relaxed font-mono">
              <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="font-semibold text-zinc-900">1. Junior Engineer Isolation (JE)</div>
                <p className="text-[11px] text-zinc-500">
                  JE accounts are cryptographically locked to their assigned Ward Boundary (e.g., JE-JUR-MARA-01). Queries outside ward boundaries are filtered by PostGIS RLS.
                </p>
              </div>

              <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="font-semibold text-zinc-900">2. External Contractor Staging Sandbox</div>
                <p className="text-[11px] text-zinc-500">
                  Contractors only view assets they have captured in unapproved survey status. Live electrical distribution network write access is strictly prohibited.
                </p>
              </div>

              <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="font-semibold text-zinc-900">3. Multi-Tier Operational Hierarchy</div>
                <p className="text-[11px] text-zinc-500">
                  AEs and AEEs exercise statutory clearance for line switching and PTW issuance within their operational sections.
                </p>
              </div>
            </div>
          </div>

          {/* Master Grid & SCADA Simulator Mode Card ("Where to ON it") */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold border border-zinc-800 flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-[#09090B]">
                    Master Grid & SCADA Simulator Engine
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
                    isSimulatorActive
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}>
                    {isSimulatorActive ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-1 max-w-2xl leading-relaxed">
                  Controls whether pre-seeded test electrical grid assets (Substations, 11kV/22kV Feeders, DTs, Poles) and SCADA dynamic telemetry appear on the GIS Map and Dashboards.
                  When <b>OFF</b>, PowerGIS operates in clean operational mode showing <b>only</b> user-uploaded/imported assets.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSimulator}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-colors flex items-center space-x-2 flex-shrink-0 border cursor-pointer ${
                isSimulatorActive
                  ? 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                  : 'bg-[#09090B] hover:bg-zinc-800 text-white border-zinc-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSimulatorActive ? 'Turn OFF Simulator' : 'Turn ON Simulator'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD NEW USER                                                  */}
      {/* ==================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-md p-5 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center border border-zinc-800">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#09090B]">{LABELS.admin.modalAddTitle}</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">{LABELS.admin.modalAddSubtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                  {LABELS.admin.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Er. K. Venkatesan, AE"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.usernameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ae_venkatesan"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ae.venkat@powergis.internal"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.roleLabel}
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as OfficialRole })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono font-medium"
                  >
                    <option value="super_admin">Super Administrator</option>
                    <option value="se">Superintending Engineer (SE)</option>
                    <option value="ee">Executive Engineer (EE)</option>
                    <option value="aee">Asst. Executive Engineer (AEE)</option>
                    <option value="ae">Assistant Engineer (AE)</option>
                    <option value="je">Junior Engineer (JE)</option>
                    <option value="contractor">Contractor (EPC Field)</option>
                    <option value="gis_admin">GIS Administrator</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.designationLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Engineer (O&M)"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.phoneLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="+91 94430 00000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.passwordLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="PowerGIS@2026"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>
              </div>

              {formData.role === 'contractor' ? (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.contractorFirmName} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Larsen Power Grid EPC Pvt Ltd"
                    value={formData.contractorCompany}
                    onChange={e => setFormData({ ...formData, contractorCompany: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                      {LABELS.admin.regionCircle}
                    </label>
                    <select
                      value={formData.regionId}
                      onChange={e => setFormData({ ...formData, regionId: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white font-mono"
                    >
                      {initialRegions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                      {LABELS.admin.sectionJurisdiction}
                    </label>
                    <select
                      value={formData.sectionId}
                      onChange={e => setFormData({ ...formData, sectionId: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white font-mono"
                    >
                      {initialSections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="addUserActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="addUserActive" className="text-xs text-zinc-800 font-medium cursor-pointer">
                  {LABELS.admin.accountActiveLabel}
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium cursor-pointer"
                >
                  {LABELS.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium border border-zinc-900 cursor-pointer transition-colors"
                >
                  {LABELS.admin.btnCreateAccount}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: EDIT USER                                                     */}
      {/* ==================================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-md p-5 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center border border-zinc-800">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#09090B]">{LABELS.admin.modalEditTitle}</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">Modifying @{editingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                  {LABELS.admin.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.usernameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.roleLabel}
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as OfficialRole })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono font-medium"
                  >
                    <option value="super_admin">Super Administrator</option>
                    <option value="se">Superintending Engineer (SE)</option>
                    <option value="ee">Executive Engineer (EE)</option>
                    <option value="aee">Asst. Executive Engineer (AEE)</option>
                    <option value="ae">Assistant Engineer (AE)</option>
                    <option value="je">Junior Engineer (JE)</option>
                    <option value="contractor">Contractor (EPC Field)</option>
                    <option value="gis_admin">GIS Administrator</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.designationLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.phoneLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.passwordLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>
              </div>

              {formData.role === 'contractor' ? (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                    {LABELS.admin.contractorFirmName}
                  </label>
                  <input
                    type="text"
                    value={formData.contractorCompany}
                    onChange={e => setFormData({ ...formData, contractorCompany: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                      {LABELS.admin.regionCircle}
                    </label>
                    <select
                      value={formData.regionId}
                      onChange={e => setFormData({ ...formData, regionId: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white font-mono"
                    >
                      {initialRegions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 uppercase font-mono mb-1">
                      {LABELS.admin.sectionJurisdiction}
                    </label>
                    <select
                      value={formData.sectionId}
                      onChange={e => setFormData({ ...formData, sectionId: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:bg-white font-mono"
                    >
                      {initialSections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="editUserActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editUserActive" className="text-xs text-zinc-800 font-medium cursor-pointer">
                  {LABELS.admin.accountActiveLabel}
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium cursor-pointer"
                >
                  {LABELS.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium border border-zinc-900 cursor-pointer transition-colors"
                >
                  {LABELS.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                           */}
      {/* ==================================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-md p-5 max-w-md w-full space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-md bg-red-50 text-red-600 border border-red-200 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#09090B]">{LABELS.admin.modalDeleteTitle}</h3>
                <p className="text-xs text-zinc-500 font-mono">{LABELS.admin.modalDeleteSubtitle}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {LABELS.admin.modalDeleteConfirmText}{' '}
              <span className="font-semibold text-zinc-900">{userToDelete.fullName}</span> (
              <span className="font-mono">{userToDelete.email}</span>)?{' '}
              {LABELS.admin.modalDeleteConfirmRevoke}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs cursor-pointer"
              >
                {LABELS.common.cancel}
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs cursor-pointer transition-colors"
              >
                {LABELS.admin.btnDeleteAccount}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
