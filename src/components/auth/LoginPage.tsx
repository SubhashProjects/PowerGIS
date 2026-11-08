// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DEDICATED ENTERPRISE LOGIN PAGE WITH PERSONA SELECTOR & TEST DUMMY DATA
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { initialUsers } from '../../services/mockData';
import { UserProfile } from '../../types/auth';
import {
  Zap,
  Lock,
  User,
  Shield,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building2,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsPersona } = useAuth();

  const [identifier, setIdentifier] = useState('ee.urban@powergis.internal');
  const [password, setPassword] = useState('EEUrban@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<UserProfile | null>(initialUsers[4]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    }, 400);
  };

  const handleSelectPersona = (u: UserProfile) => {
    setSelectedPersona(u);
    setIdentifier(u.email);
    setPassword(u.password || 'PowerGIS@2026');
    setError(null);
  };

  const handleOneClickLogin = (u: UserProfile) => {
    setIsLoading(true);
    setTimeout(() => {
      loginAsPersona(u.id);
      setIsLoading(false);
    }, 300);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;
    setForgotFeedback(
      `Password reset token dispatched to '${forgotInput}'. Check registered mobile/email.`
    );
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotFeedback(null);
      setForgotInput('');
    }, 2500);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'se':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'ee':
      case 'aee':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'ae':
      case 'je':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'contractor':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'gis_admin':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Top Banner & Enterprise Header */}
      <header className="border-b border-slate-800/80 bg-[#0a101f]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a101f] rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-sky-400 fill-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
                POWERGIS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                v2.0 Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Electricity Distribution GIS, Network Asset Management & O&M Platform
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-6 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Grid Operations Online</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>4 Regions Active</span>
          </div>
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero-Trust RLS</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch justify-center p-4 lg:p-8 gap-8 max-w-7xl mx-auto w-full">
        {/* Left Side: Login Credentials Card */}
        <div className="w-full lg:w-[460px] flex flex-col justify-center">
          <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Ambient Lighting Accents */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-4">
                <Shield className="w-3.5 h-3.5" />
                <span>Statutory Utility Authentication</span>
              </div>

              <h1 className="text-2xl font-bold text-white tracking-tight">Staff Sign In</h1>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Access your assigned regional network jurisdiction, live SCADA, and asset registers.
              </p>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Official Email / Staff Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder="e.g. ee.urban@powergis.internal"
                      className="w-full bg-[#090e1a] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#090e1a] border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-[#090e1a] text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
                    />
                    <span>Remember staff session</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Universal: PowerGIS@2026</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Operations Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Zero-Trust Notice */}
              <div className="mt-6 pt-5 border-t border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <p>
                  Jurisdiction RLS is enforced at both frontend and PostgreSQL database layers. Each
                  account operates strictly within assigned territorial boundaries.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Test Personas & Dummy Data Switcher */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-[#0f172a]/80 border border-slate-800/90 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <h2 className="text-base font-bold text-white">Engineering Personas & Test Data</h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select any official role below for instant 1-click login or to autofill test credentials.
                </p>
              </div>
              <span className="self-start sm:self-auto text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 font-mono border border-sky-500/20 font-semibold">
                11 Official Roles
              </span>
            </div>

            {/* Persona Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {initialUsers.map(u => {
                const isSelected = selectedPersona?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectPersona(u)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/30'
                        : 'bg-[#090e1a]/70 border-slate-800 hover:border-slate-700 hover:bg-[#0c1424]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(
                            u.role
                          )}`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleOneClickLogin(u);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center space-x-1 transition-all shadow-sm"
                        >
                          <span>1-Click</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="font-semibold text-xs text-slate-100 leading-snug">
                        {u.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {u.designation}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="truncate max-w-[140px]">{u.email}</span>
                      <span className="text-sky-400 font-semibold">{u.password}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Test Data Stats Summary */}
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-base font-bold text-sky-400 font-mono">4</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Regions</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-base font-bold text-indigo-400 font-mono">8</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Substations</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-base font-bold text-emerald-400 font-mono">7 DTRs</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Transformers</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-base font-bold text-amber-400 font-mono">22+</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Modules</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0a101f]/70 px-6 py-3 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span>&copy; 2026 PowerGIS Enterprise. All rights reserved.</span>
          <span>•</span>
          <span>Zero-Trust Architecture</span>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-400">
          <span>PostGIS 3.4 Spatial Engine</span>
          <span>•</span>
          <span>IEEE 1366 / ISO 55000 Certified</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-sky-400" />
              <span>Reset Staff Password</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Enter your registered staff email or username. An administrative verification code will be generated.
            </p>

            {forgotFeedback ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{forgotFeedback}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Staff Email or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotInput}
                    onChange={e => setForgotInput(e.target.value)}
                    placeholder="e.g. ee.urban@powergis.internal"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all"
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
