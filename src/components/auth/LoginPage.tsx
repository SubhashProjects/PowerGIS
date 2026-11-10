// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DEDICATED ENTERPRISE LOGIN PAGE - PURE WHITE THEME
// Strict Anti-Slop Constraints: Flat paper-clean palette, zero ambient blobs,
// max 6px radius (rounded-md), 1px structural hairlines (#E4E4E7).
// Standalone centered sign-in card with integrated PowerGIS branding (no outer header/footer).
// Comprehensive real-time client-side validation for official email and password.
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { initialUsers } from '../../services/mockData';
import { assetService } from '../../services/assetService';
import { UserProfile } from '../../types/auth';
import { LABELS, validateEmail } from '../../commons';
import {
  Zap,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Mail,
  Check,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsPersona } = useAuth();

  // Route between View 1 (Sign In) and View 2 (Demo Personas Sandbox)
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

  // Validation States for Login
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Demo Page filter and search state
  const [demoSearch, setDemoSearch] = useState('');

  // Forgot password modal state & validation
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotTouched, setForgotTouched] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // EVENT HANDLERS
  // --------------------------------------------------------------------------
  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    if (identifierTouched) {
      setIdentifierError(validateEmail(val));
    }
    if (error) setError(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (passwordTouched) {
      setPasswordError(!val ? 'Password is required.' : null);
    }
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentifierTouched(true);
    setPasswordTouched(true);

    const idErr = validateEmail(identifier);
    const passErr = !password ? 'Password is required.' : null;
    setIdentifierError(idErr);
    setPasswordError(passErr);

    if (idErr || passErr) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await login(identifier.trim(), password);
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

  const handleOpenForgotModal = () => {
    setForgotInput(identifier.includes('@') ? identifier.trim() : '');
    setForgotError(null);
    setForgotTouched(false);
    setForgotFeedback(null);
    setShowForgotModal(true);
  };

  const handleCloseForgotModal = () => {
    setShowForgotModal(false);
    setForgotError(null);
    setForgotTouched(false);
    setForgotFeedback(null);
    setForgotInput('');
  };

  const handleForgotInputChange = (val: string) => {
    setForgotInput(val);
    if (forgotTouched) {
      setForgotError(validateEmail(val));
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotTouched(true);

    const err = validateEmail(forgotInput);
    setForgotError(err);
    if (err) return;

    setForgotFeedback(
      `A reset link will be sent to '${forgotInput.trim()}'.\nCheck your registered email address.`
    );
    setTimeout(() => {
      handleCloseForgotModal();
    }, 2500);
  };

  // Filtered personas for Demo Page
  const filteredPersonas = initialUsers.filter(u => {
    if (!demoSearch.trim()) return true;
    const q = demoSearch.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.designation.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-[#09090B] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#09090B] selection:text-white">
      {/* View Router */}
      {currentView === 'login' ? (
        /* ====================================================================
           PAGE 1: OFFICIAL LOGIN
           Centered card with integrated PowerGIS branding (no outer header/footer)
           ==================================================================== */
        <div className="w-full max-w-[440px] bg-white border border-[#E4E4E7] rounded-md p-6 sm:p-8 shadow-xs">
          {/* Integrated PowerGIS Branding Header */}
          <div className="flex items-center justify-between gap-3 mb-6 pb-5 border-b border-[#E4E4E7]">
            <div className="flex items-center space-x-3">
              {/* Logo Emblem (Minimalist Solid High-Craft) */}
              <div className="w-9 h-9 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-xs border border-zinc-800 flex-shrink-0">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-[#09090B] tracking-tight">
                  {LABELS.header.brandName}
                </span>
              </div>
            </div>

            {/* Quick Demo Sandbox Action */}
            <button
              type="button"
              onClick={() => setCurrentView('demo')}
              title="Open Demo Personas & Simulation Sandbox"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-[#E4E4E7] text-xs transition-colors cursor-pointer flex-shrink-0"
            >
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="font-medium">Demo</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-900 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1.5">
                {LABELS.auth.emailLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  value={identifier}
                  onChange={e => handleIdentifierChange(e.target.value)}
                  onBlur={() => {
                    setIdentifierTouched(true);
                    setIdentifierError(validateEmail(identifier));
                  }}
                  placeholder={LABELS.auth.emailPlaceholder}
                  className={`w-full bg-white border rounded-md pl-9 pr-3 py-2 text-xs text-[#09090B] placeholder-zinc-400 focus:outline-none transition-colors ${
                    identifierError && identifierTouched
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-[#E4E4E7] focus:border-zinc-900'
                  }`}
                />
              </div>
              {identifierError && identifierTouched && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center space-x-1">
                  <span>{identifierError}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-800">
                  {LABELS.auth.passwordLabel}
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-xs text-zinc-500 hover:text-zinc-950 underline transition-colors cursor-pointer"
                >
                  {LABELS.auth.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  onBlur={() => {
                    setPasswordTouched(true);
                    setPasswordError(!password ? 'Password is required.' : null);
                  }}
                  placeholder={LABELS.auth.passwordPlaceholder}
                  className={`w-full bg-white border rounded-md pl-9 pr-10 py-2 text-xs text-[#09090B] placeholder-zinc-400 focus:outline-none transition-colors ${
                    passwordError && passwordTouched
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-[#E4E4E7] focus:border-zinc-900'
                  }`}
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

              {passwordError && passwordTouched && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center space-x-1">
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-zinc-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#E4E4E7] text-zinc-900 focus:ring-0"
                />
                <span className="text-[11px]">Remember session</span>
              </label>
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
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-[#09090B]">
                  {LABELS.header.brandName}
                </span>
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

              <div className="flex items-center space-x-2 text-xs">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Simulation Sandbox Mode</span>
                </span>
              </div>
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-md border border-[#E4E4E7]">
            <div className="text-xs text-zinc-600 font-medium">
              Select an engineering role to sign in:
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={demoSearch}
                onChange={e => setDemoSearch(e.target.value)}
                placeholder="Search role or name..."
                className="w-full bg-white border border-[#E4E4E7] rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
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
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {u.role.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate max-w-[170px]" title={u.email}>
                        {u.email}
                      </span>
                    </div>

                    {/* Person Details */}
                    <div className="font-bold text-sm text-zinc-950 leading-snug">
                      {u.fullName}
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1">
                      {u.designation}
                    </div>

                    {/* Territorial Jurisdiction Scope */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 text-[10px] text-zinc-500">
                      <span className="text-zinc-400">Scope: </span>
                      <span className="text-zinc-800 font-medium">
                        {u.regionId === 'reg-pdy' ? 'Puducherry' : u.regionId === 'reg-kkl' ? 'Karaikal' : 'State-Wide'}
                        {u.divisionId ? ` › ${u.divisionId.toUpperCase()}` : ''}
                        {u.sectionId ? ` › ${u.sectionId.toUpperCase()}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => handleOneClickLogin(u)}
                      disabled={isLoading}
                      className="w-full py-1.5 px-3 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      title="Sign in as this user"
                    >
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{LABELS.auth.oneClickLogin}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPersonas.length === 0 && (
            <div className="bg-white border border-[#E4E4E7] rounded-md p-8 text-center text-zinc-500 text-xs mb-8">
              No roles matched your query '{demoSearch}'.
            </div>
          )}
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#E4E4E7] rounded-md max-w-md w-full p-6 shadow-xl relative">
            <h3 className="text-sm font-bold text-zinc-950 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-zinc-900" />
              <span>{LABELS.auth.resetPasswordTitle}</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4 leading-relaxed">
              {LABELS.auth.resetPasswordInstructionsLine1}
              <br />
              {LABELS.auth.resetPasswordInstructionsLine2}
            </p>

            {forgotFeedback ? (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                <div className="leading-relaxed">
                  {forgotFeedback.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    {LABELS.auth.emailLabel}
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={forgotInput}
                    onChange={e => handleForgotInputChange(e.target.value)}
                    onBlur={() => {
                      setForgotTouched(true);
                      setForgotError(validateEmail(forgotInput));
                    }}
                    placeholder={LABELS.auth.emailPlaceholder}
                    className={`w-full bg-white border rounded-md px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none transition-colors ${
                      forgotError && forgotTouched
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-[#E4E4E7] focus:border-zinc-900'
                    }`}
                  />
                  {forgotError && forgotTouched && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center space-x-1">
                      <span>{forgotError}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForgotModal}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {LABELS.auth.resetPasswordButton}
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
