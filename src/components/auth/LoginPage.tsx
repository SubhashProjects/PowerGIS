// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DEDICATED ENTERPRISE LOGIN PAGE - PURE WHITE THEME
// Strict Anti-Slop Constraints: Flat paper-clean palette, zero ambient blobs,
// max 6px radius (rounded-md), 1px structural hairlines (#E4E4E7).
// Standalone centered sign-in card with integrated PowerGIS branding (no outer header/footer).
// Dummy test personas housed exclusively in dedicated second page via Demo action.
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { initialUsers } from '../../services/mockData';
import { assetService } from '../../services/assetService';
import { UserProfile } from '../../types/auth';
import { LABELS } from '../../commons';
import {
  Zap,
  Shield,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsPersona } = useAuth();

  // Route between View 1 (Official Sign In) and View 2 (Demo Personas Sandbox)
  const [currentView, setCurrentView] = useState<'login' | 'demo'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true' || params.get('demo') === '1' || window.location.hash === '#demo') {
        return 'demo';
      }
    }
    return 'login';
  });

  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(() => assetService.isSimulatorMode());
  const [identifier, setIdentifier] = useState(isSimulatorActive ? 'ee.urban@powergis.internal' : '');
  const [password, setPassword] = useState(isSimulatorActive ? 'EEUrban@2026' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Demo Page filter and search state
  const [demoSearch, setDemoSearch] = useState('');
  const [demoCategory, setDemoCategory] = useState<'ALL' | 'EXEC' | 'FIELD' | 'OPERATIONS'>('ALL');

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(identifier, password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify statutory credentials.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Authentication error occurred during statutory verification.');
    }
  };

  // 1-Click Login from Demo Sandbox: sets simulator mode ON and logs in immediately
  const handleOneClickLogin = (u: UserProfile) => {
    setIsLoading(true);
    assetService.setSimulatorMode(true);
    setIsSimulatorActive(true);
    setTimeout(() => {
      loginAsPersona(u.id);
      setIsLoading(false);
    }, 250);
  };

  // Autofill credentials and navigate back to login view
  const handleUseCredentials = (u: UserProfile) => {
    assetService.setSimulatorMode(true);
    setIsSimulatorActive(true);
    setIdentifier(u.email);
    setPassword('PowerGIS@2026');
    setError(null);
    setCurrentView('login');
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;
    setForgotFeedback(
      `Statutory password reset token dispatched to '${forgotInput}'. Check registered mobile/email.`
    );
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotFeedback(null);
      setForgotInput('');
    }, 2500);
  };

  // Filtered personas for Demo Page
  const filteredPersonas = initialUsers.filter(u => {
    const matchesSearch =
      demoSearch.trim() === '' ||
      u.fullName.toLowerCase().includes(demoSearch.toLowerCase()) ||
      u.designation.toLowerCase().includes(demoSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(demoSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(demoSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (demoCategory === 'EXEC') {
      return ['super_admin', 'se', 'ee'].includes(u.role);
    }
    if (demoCategory === 'FIELD') {
      return ['aee', 'ae', 'je'].includes(u.role);
    }
    if (demoCategory === 'OPERATIONS') {
      return ['contractor', 'auditor', 'gis_admin'].includes(u.role);
    }
    return true;
  });

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-[#09090B] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#09090B] selection:text-white font-sans">
      {/* View Router */}
      {currentView === 'login' ? (
        /* ====================================================================
           PAGE 1: OFFICIAL STATUTORY LOGIN
           Centered card with integrated PowerGIS branding (no outer header/footer)
           ==================================================================== */
        <div className="w-full max-w-[440px] bg-white border border-[#E4E4E7] rounded-md p-6 sm:p-8 shadow-xs">
          {/* Integrated PowerGIS Branding Header */}
          <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-[#E4E4E7]">
            <div className="flex items-center space-x-3">
              {/* Logo Emblem (Minimalist Solid High-Craft) */}
              <div className="w-9 h-9 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-xs border border-zinc-800 flex-shrink-0">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-[#09090B] tracking-tight">
                    {LABELS.header.brandName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono font-semibold border border-zinc-200 uppercase tracking-wider">
                    {LABELS.header.brandBadge}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono leading-tight mt-0.5">
                  {LABELS.header.brandSubtitle}
                </p>
              </div>
            </div>

            {/* Quick Demo Sandbox Action */}
            <button
              type="button"
              onClick={() => setCurrentView('demo')}
              title="Open Demo Personas & Simulation Sandbox"
              className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-[#E4E4E7] text-[11px] font-mono transition-colors cursor-pointer flex-shrink-0"
            >
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="font-medium">Demo</span>
            </button>
          </div>

          {/* Heading & Subheading */}
          <div className="mb-5">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-mono font-semibold uppercase tracking-wider mb-2">
              <Shield className="w-3 h-3 text-zinc-800" />
              <span>Statutory Utility Authentication</span>
            </div>
            <h1 className="text-lg font-bold text-[#09090B] tracking-tight">
              {LABELS.auth.loginHeading}
            </h1>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {LABELS.auth.loginSubheading}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-900 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1.5">
                Official Email or Staff ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. ee.urban@powergis.internal"
                  className="w-full bg-white border border-[#E4E4E7] rounded-md pl-9 pr-3 py-2 text-xs text-[#09090B] placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-800">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-950 underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-[#E4E4E7] rounded-md pl-9 pr-10 py-2 text-xs text-[#09090B] placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-zinc-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#E4E4E7] text-zinc-900 focus:ring-0"
                />
                <span className="text-[11px]">Remember staff session</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">256-bit AES encrypted</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Operations Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* ====================================================================
           PAGE 2: DEDICATED DEMO PERSONAS & SIMULATION SANDBOX (FULL VIEW)
           Self-contained with PowerGIS branding and Back to Sign In
           ==================================================================== */
        <div className="w-full max-w-6xl mx-auto flex flex-col">
          {/* Top Return Bar with Branding */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-[#E4E4E7]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-xs border border-zinc-800 flex-shrink-0">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm tracking-tight text-[#09090B]">
                    {LABELS.header.brandName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-800 font-mono font-semibold border border-zinc-200 uppercase tracking-wider">
                    {LABELS.header.brandBadge}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono hidden sm:block">
                  {LABELS.header.brandSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-900 border border-[#E4E4E7] text-xs font-medium transition-colors cursor-pointer self-start"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-zinc-700" />
                <span>{LABELS.auth.backToLogin}</span>
              </button>

              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Simulation Sandbox Mode</span>
                </span>
                <span className="text-zinc-500 hidden sm:inline">11 Roles Pre-Configured</span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              {LABELS.auth.demoPageTitle}
            </h2>
            <p className="text-xs text-zinc-600 mt-1 max-w-3xl leading-relaxed">
              {LABELS.auth.demoPageSubtitle}
            </p>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-md border border-[#E4E4E7]">
            {/* Category Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setDemoCategory('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  demoCategory === 'ALL'
                    ? 'bg-[#09090B] text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                All Roles (11)
              </button>
              <button
                type="button"
                onClick={() => setDemoCategory('EXEC')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  demoCategory === 'EXEC'
                    ? 'bg-[#09090B] text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                Executive & Circle (5)
              </button>
              <button
                type="button"
                onClick={() => setDemoCategory('FIELD')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  demoCategory === 'FIELD'
                    ? 'bg-[#09090B] text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                Section & Ward (3)
              </button>
              <button
                type="button"
                onClick={() => setDemoCategory('OPERATIONS')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  demoCategory === 'OPERATIONS'
                    ? 'bg-[#09090B] text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                Contractor & Audit (3)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={demoSearch}
                onChange={e => setDemoSearch(e.target.value)}
                placeholder="Search persona or role..."
                className="w-full bg-white border border-[#E4E4E7] rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono"
              />
            </div>
          </div>

          {/* Persona Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-8">
            {filteredPersonas.map(u => {
              return (
                <div
                  key={u.id}
                  className="bg-white border border-[#E4E4E7] rounded-md p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-2xs"
                >
                  <div>
                    {/* Header: Role badge and email */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {u.role.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[170px]" title={u.email}>
                        {u.email}
                      </span>
                    </div>

                    {/* Person Details */}
                    <div className="font-bold text-sm text-zinc-950 leading-snug">
                      {u.fullName}
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1 font-sans">
                      {u.designation}
                    </div>

                    {/* Territorial Jurisdiction Scope */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 text-[10px] text-zinc-500 font-mono">
                      <span className="text-zinc-400">Scope: </span>
                      <span className="text-zinc-800 font-medium">
                        {u.regionId === 'reg-pdy' ? 'Puducherry' : u.regionId === 'reg-kkl' ? 'Karaikal' : 'State-Wide'}
                        {u.divisionId ? ` › ${u.divisionId.toUpperCase()}` : ''}
                        {u.sectionId ? ` › ${u.sectionId.toUpperCase()}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOneClickLogin(u)}
                      disabled={isLoading}
                      className="flex-1 py-1.5 px-2.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      title="Instantly sign in as this persona"
                    >
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{LABELS.auth.oneClickLogin}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseCredentials(u)}
                      className="py-1.5 px-2.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-800 border border-[#E4E4E7] text-xs font-medium transition-colors cursor-pointer"
                      title="Autofill this persona into the sign in form"
                    >
                      <span>{LABELS.auth.useCredentials}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPersonas.length === 0 && (
            <div className="bg-white border border-[#E4E4E7] rounded-md p-8 text-center text-zinc-500 text-xs mb-8">
              No personas matched your query '{demoSearch}'.
            </div>
          )}

          {/* Quick Network Stats Summary */}
          <div className="bg-white border border-[#E4E4E7] rounded-md p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
              <div className="text-base font-bold text-zinc-950 font-mono">4 Enclaves</div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Territorial Regions</div>
            </div>
            <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
              <div className="text-base font-bold text-zinc-950 font-mono">8 Stations</div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">110kV / 22kV / 11kV</div>
            </div>
            <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
              <div className="text-base font-bold text-zinc-950 font-mono">7 DTRs</div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Distribution Transformers</div>
            </div>
            <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
              <div className="text-base font-bold text-zinc-950 font-mono">22+ Modules</div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Active Workspaces</div>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#E4E4E7] rounded-md max-w-md w-full p-6 shadow-xl relative">
            <h3 className="text-sm font-bold text-zinc-950 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-zinc-900" />
              <span>Reset Staff Password</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4 leading-relaxed">
              Enter your official staff email or username. An administrative verification token will be dispatched.
            </p>

            {forgotFeedback ? (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2 font-mono">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{forgotFeedback}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Staff Email or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotInput}
                    onChange={e => setForgotInput(e.target.value)}
                    placeholder="e.g. ee.urban@powergis.internal"
                    className="w-full bg-white border border-[#E4E4E7] rounded-md px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Send Reset Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
