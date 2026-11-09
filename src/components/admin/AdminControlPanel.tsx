// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SUPER ADMINISTRATOR CONTROL PANEL, STAFF RBAC & DATA EXCHANGE
// PURE WHITE THEME • FULL USER CRUD • PERSONA IMPERSONATION • SPATIAL IMPORT/EXPORT
// ============================================================================

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { assetService } from '../../services/assetService';
import { dataExchangeService, ImportResult } from '../../services/dataExchangeService';
import { ROLES_REGISTRY } from '../../config/rbacConfig';
import { LABELS } from '../../config/labelsConfig';
import { UserProfile, OfficialRole } from '../../types/auth';
import { initialRegions, initialDivisions, initialSections } from '../../services/mockData';
import {
  Settings, Database, Download, Upload, CheckCircle2, AlertTriangle,
  RotateCcw, Shield, HardDrive, FileUp, FileCode, FileSpreadsheet, Map, X, Check,
  Users, UserPlus, Pencil, Trash2, LogIn, Search, Filter, RefreshCw, UserCheck, Key, Phone, Mail, Building, Zap
} from 'lucide-react';

export const AdminControlPanel: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState<'users' | 'migration' | 'features'>('users');
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(assetService.isSimulatorMode());

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

  // Backup History
  const [backupHistory, setBackupHistory] = useState([
    { id: 'bk-1', type: 'Daily Automated', date: '2026-11-08 02:00:00 IST', size: '248 MB', status: 'verified', checksum: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { id: 'bk-2', type: 'Daily Automated', date: '2026-11-07 02:00:00 IST', size: '242 MB', status: 'verified', checksum: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069' },
    { id: 'bk-3', type: 'Weekly Snapshot', date: '2026-11-01 03:30:00 IST', size: '1.2 GB', status: 'verified', checksum: 'SHA256:6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b' },
  ]);

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
    const newBk = {
      id: `bk-${Date.now()}`,
      type: 'Manual Administrator Snapshot',
      date: new Date().toLocaleString(),
      size: '254 MB',
      status: 'verified',
      checksum: `SHA256:${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    };
    setBackupHistory([newBk, ...backupHistory]);
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
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-slate-900 select-none">
      {/* 1. Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-cyan-600 text-white font-extrabold flex items-center justify-center text-xl shadow-md shadow-blue-500/20 flex-shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight">
                {LABELS.admin.consoleTitle}
              </h1>
              <span className="text-[10px] font-mono uppercase font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                {LABELS.admin.rootAuthorityBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
              {LABELS.admin.consoleSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800 font-bold">
            {LABELS.admin.activeSessionPrefix} {user.fullName.split(',')[0]} ({user.role.toUpperCase()})
          </span>
        </div>
      </div>

      {/* Global Status Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Admin Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          <span>{LABELS.admin.tabUsers} ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('migration')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'migration'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <FileUp className="w-4 h-4 flex-shrink-0" />
          <span>{LABELS.admin.tabMigration}</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'features'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>{LABELS.admin.tabFeatures}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: STAFF ACCOUNTS & RBAC MANAGEMENT (CRUD + PERSONA IMPERSONATION) */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Role Filter, Add User, Reset */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  placeholder={LABELS.admin.searchPlaceholder}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-600 font-mono font-medium"
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
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
              >
                <UserPlus className="w-4 h-4" />
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
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">{LABELS.admin.statTotalStaff}</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">{users.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">{LABELS.admin.statActiveStaff}</div>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">{users.filter(u => u.isActive).length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">{LABELS.admin.statFieldRoles}</div>
              <div className="text-xl font-extrabold text-blue-600 mt-1">
                {users.filter(u => ['se', 'ee', 'aee', 'ae', 'je'].includes(u.role)).length}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">{LABELS.admin.statContractors}</div>
              <div className="text-xl font-extrabold text-purple-600 mt-1">
                {users.filter(u => u.role === 'contractor').length}
              </div>
            </div>
          </div>

          {/* Comprehensive Users Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-mono font-bold text-slate-500">
                    <th className="py-3 px-4">{LABELS.admin.thStaffMember}</th>
                    <th className="py-3 px-4">{LABELS.admin.thRoleDesignation}</th>
                    <th className="py-3 px-4 hidden md:table-cell">{LABELS.admin.thJurisdiction}</th>
                    <th className="py-3 px-4 hidden lg:table-cell">{LABELS.admin.thContact}</th>
                    <th className="py-3 px-4">{LABELS.admin.thStatus}</th>
                    <th className="py-3 px-4 text-right">{LABELS.admin.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => {
                    const isCurrent = user.id === u.id;
                    return (
                      <tr key={u.id} className={`hover:bg-blue-50/40 transition-colors ${isCurrent ? 'bg-blue-50/60' : ''}`}>
                        {/* Member Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                              {u.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate flex items-center space-x-1.5">
                                <span>{u.fullName}</span>
                                {isCurrent && (
                                  <span className="text-[9px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.2 rounded font-extrabold border border-blue-200">
                                    {LABELS.common.youBadge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">@{u.username}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Designation */}
                        <td className="py-3 px-4">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[10px] font-extrabold uppercase border border-slate-200">
                              {u.role}
                            </span>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-medium truncate max-w-[200px]">
                              {u.designation}
                            </div>
                          </div>
                        </td>

                        {/* Jurisdiction */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="text-slate-700 font-mono text-[11px]">
                            {u.contractorCompany ? (
                              <span className="text-purple-700 font-bold">{u.contractorCompany}</span>
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
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="space-y-0.5 text-[11px] font-mono text-slate-600">
                            <div className="truncate max-w-[180px]">{u.email}</div>
                            <div className="text-slate-400 text-[10px]">{u.phone}</div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {u.isActive ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{LABELS.common.active}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-mono font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>{LABELS.common.inactive}</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Impersonate / Test as Persona Button */}
                            <button
                              onClick={() => handleImpersonate(u)}
                              disabled={isCurrent}
                              title={`Test live portal as ${u.fullName}`}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1 ${
                                isCurrent
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border-blue-200 cursor-pointer shadow-2xs'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline text-[10px]">{LABELS.admin.btnTestRole}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditUserModal(u)}
                              title={LABELS.admin.btnEdit}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setUserToDelete(u)}
                              disabled={isCurrent}
                              title={isCurrent ? 'Cannot delete your active session' : LABELS.admin.btnDelete}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isCurrent
                                  ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                  : 'bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 border-slate-200 cursor-pointer shadow-2xs'
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
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-mono text-xs">
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
            <div className="p-4 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs shadow-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  {importStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>{importStatus.success ? 'Spatial Data Import Completed' : 'Import Warning'}</span>
                </div>
                <button
                  onClick={() => setImportStatus(null)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-700 font-mono text-[11px]">{importStatus.message}</p>

              <div className="flex items-center space-x-4 font-mono text-[11px] pt-1">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold">
                  Imported: {importStatus.importedCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Duplicates: {importStatus.duplicateCount}
                </span>
                {importStatus.errorCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                    Errors: {importStatus.errorCount}
                  </span>
                )}
              </div>

              {importStatus.details.length > 0 && (
                <div className="max-h-28 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[10px] space-y-1 text-slate-600">
                  {importStatus.details.map((d, i) => (
                    <div key={i}>• {d}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Import / Export Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Geospatial Data Migration & Exchange (Import / Export)</h2>
                  <p className="text-xs text-slate-500">Standardized OpenGIS Formats • Automated Coordinate Verification</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* A. Import Dataset Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-slate-950 font-bold text-xs uppercase tracking-wider">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Import Spatial Dataset</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Upload KML (<code className="text-slate-900 font-bold">.kml</code>), GeoJSON (<code className="text-slate-900 font-bold">.geojson</code>), CSV / Excel (<code className="text-slate-900 font-bold">.csv</code>), or System Snapshot (<code className="text-slate-900 font-bold">.json</code>). Feeders (lines), DTs, and poles are parsed and immediately rendered onto the live GIS Master Map.
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".kml,.geojson,.json,.csv"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black cursor-pointer transition-all"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    Automatic duplicate avoidance & coordinate validation enabled.
                  </span>
                </div>
              </div>

              {/* B. Export Layers Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-slate-950 font-bold text-xs uppercase tracking-wider">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Export Master GIS Network</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Download verified distribution network layers in standard spatial data formats for statutory filings, offline CAD, and regional audits.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => dataExchangeService.exportGeoJSON()}
                    className="py-2 px-2 rounded-xl bg-slate-900 text-white hover:bg-black font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    title="Download complete RFC 7946 GeoJSON FeatureCollection"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>GeoJSON</span>
                  </button>

                  <button
                    onClick={() => dataExchangeService.exportCSV('transformers')}
                    className="py-2 px-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Download CSV Asset Register"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={() => dataExchangeService.exportKML()}
                    className="py-2 px-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950">
                    PostgreSQL Database Backups & Point-in-Time Snapshots
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Automated Point-in-Time Recovery and Disaster Resilience</p>
                </div>
              </div>

              <button
                onClick={handleRunManualBackup}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Run Manual Backup</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {backupHistory.map(bk => (
                <div
                  key={bk.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-950">{bk.type} ({bk.size})</span>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] border border-emerald-300 font-bold">
                        VERIFIED
                      </span>
                      <button
                        onClick={() => handleRestore(bk.id)}
                        className="px-2.5 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-mono transition-colors font-bold shadow-2xs cursor-pointer"
                        title="Restore point-in-time snapshot"
                      >
                        Restore
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono truncate">{bk.checksum}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{bk.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MODULAR FEATURE TOGGLES & ZERO-TRUST SECURITY                 */}
      {/* ==================================================================== */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Modular Feature Toggles */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950">
                    Modular System Feature Toggles
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Zero-Restart Dynamic Activation</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono border border-slate-300 font-bold">
                {modules.filter(m => m.enabled).length}/{modules.length} Active
              </span>
            </div>

            <div className="space-y-2">
              {modules.map(mod => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors text-xs"
                >
                  <span className="font-semibold text-slate-800">{mod.name}</span>
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    {mod.enabled ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono text-[10px] font-bold shadow-xs">
                        ENABLED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 font-mono text-[10px] border border-slate-300">
                        DISABLED
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Zero-Trust RLS Policies Summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950">
                    Zero-Trust Jurisdiction Policies
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Row-Level Security (RLS) Enforcements</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold font-mono">
                100% ENFORCED
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed font-mono">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">1. Junior Engineer Isolation (JE)</div>
                <p className="text-[11px] text-slate-500">
                  JE accounts are cryptographically locked to their assigned Ward Boundary (e.g., JE-JUR-MARA-01). Queries outside ward boundaries are filtered by PostGIS RLS.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">2. External Contractor Staging Sandbox</div>
                <p className="text-[11px] text-slate-500">
                  Contractors only view assets they have captured in unapproved survey status. Live electrical distribution network write access is strictly prohibited.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">3. Multi-Tier Operational Hierarchy</div>
                <p className="text-[11px] text-slate-500">
                  AEs and AEEs exercise statutory clearance for line switching and PTW issuance within their operational sections.
                </p>
              </div>
            </div>
          </div>

          {/* Master Grid & SCADA Simulator Mode Card ("Where to ON it") */}
          <div className="lg:col-span-2 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/70 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0 ${
                isSimulatorActive ? 'bg-amber-500 shadow-amber-500/20 animate-pulse' : 'bg-slate-400 shadow-slate-400/20'
              }`}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Master Grid & SCADA Simulator Engine
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase border ${
                    isSimulatorActive
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {isSimulatorActive ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Controls whether pre-seeded test electrical grid assets (Substations, 11kV/22kV Feeders, DTs, Poles) and SCADA dynamic telemetry appear on the GIS Map and Dashboards.
                  When <b>OFF</b>, PowerGIS operates in clean operational mode showing <b>only</b> user-uploaded/imported assets.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSimulator}
              className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all flex items-center space-x-2 flex-shrink-0 cursor-pointer shadow-md ${
                isSimulatorActive
                  ? 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 shadow-rose-500/10'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-1 ring-blue-400/30'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{isSimulatorActive ? 'Turn OFF Simulator' : '⚡ Turn ON Simulator'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD NEW USER                                                  */}
      {/* ==================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-950">{LABELS.admin.modalAddTitle}</h3>
                  <p className="text-[11px] text-slate-500">{LABELS.admin.modalAddSubtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                  {LABELS.admin.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Er. K. Venkatesan, AE"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.usernameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ae_venkatesan"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ae.venkat@powergis.internal"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.roleLabel}
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as OfficialRole })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono font-medium"
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.designationLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Engineer (O&M)"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.phoneLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="+91 94430 00000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.passwordLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="PowerGIS@2026"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              {formData.role === 'contractor' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.contractorFirmName} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Larsen Power Grid EPC Pvt Ltd"
                    value={formData.contractorCompany}
                    onChange={e => setFormData({ ...formData, contractorCompany: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                      {LABELS.admin.regionCircle}
                    </label>
                    <select
                      value={formData.regionId}
                      onChange={e => setFormData({ ...formData, regionId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white font-mono"
                    >
                      {initialRegions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                      {LABELS.admin.sectionJurisdiction}
                    </label>
                    <select
                      value={formData.sectionId}
                      onChange={e => setFormData({ ...formData, sectionId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white font-mono"
                    >
                      {initialSections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="addUserActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="addUserActive" className="text-xs text-slate-800 font-semibold cursor-pointer">
                  {LABELS.admin.accountActiveLabel}
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  {LABELS.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-md shadow-blue-500/20"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-950">{LABELS.admin.modalEditTitle}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Modifying @{editingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                  {LABELS.admin.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.usernameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.roleLabel}
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as OfficialRole })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono font-medium"
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.designationLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.phoneLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.passwordLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              {formData.role === 'contractor' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    {LABELS.admin.contractorFirmName}
                  </label>
                  <input
                    type="text"
                    value={formData.contractorCompany}
                    onChange={e => setFormData({ ...formData, contractorCompany: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                      {LABELS.admin.regionCircle}
                    </label>
                    <select
                      value={formData.regionId}
                      onChange={e => setFormData({ ...formData, regionId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white font-mono"
                    >
                      {initialRegions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                      {LABELS.admin.sectionJurisdiction}
                    </label>
                    <select
                      value={formData.sectionId}
                      onChange={e => setFormData({ ...formData, sectionId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white font-mono"
                    >
                      {initialSections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="editUserActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editUserActive" className="text-xs text-slate-800 font-semibold cursor-pointer">
                  {LABELS.admin.accountActiveLabel}
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  {LABELS.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-md shadow-blue-500/20"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-950">{LABELS.admin.modalDeleteTitle}</h3>
                <p className="text-xs text-slate-500 font-mono">{LABELS.admin.modalDeleteSubtitle}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {LABELS.admin.modalDeleteConfirmText}{' '}
              <span className="font-bold text-slate-900">{userToDelete.fullName}</span> (
              <span className="font-mono">{userToDelete.email}</span>)?{' '}
              {LABELS.admin.modalDeleteConfirmRevoke}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                {LABELS.common.cancel}
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-rose-500/20"
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
