// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// DEDICATED ENTERPRISE LOGIN PAGE - PURE WHITE THEME
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { initialUsers } from '../../services/mockData';
import { assetService } from '../../services/assetService';
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

  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(() => assetService.isSimulatorMode());
  const [identifier, setIdentifier] = useState(isSimulatorActive ? 'ee.urban@powergis.internal' : '');
  const [password, setPassword] = useState(isSimulatorActive ? 'EEUrban@2026' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<UserProfile | null>(isSimulatorActive ? initialUsers[4] : null);

  const handleToggleSimulator = (enabled: boolean) => {
    setIsSimulatorActive(enabled);
    assetService.setSimulatorMode(enabled);
    if (enabled) {
      const defaultPersona = initialUsers[4];
      setSelectedPersona(defaultPersona);
      setIdentifier(defaultPersona.email);
      setPassword('EEUrban@2026');
      setError(null);
    } else {
      setSelectedPersona(null);
      setIdentifier('');
      setPassword('');
      setError(null);
    }
  };

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
    setPassword('••••••••');
    setError(null);
  };

  const handleOneClickLogin = (u: UserProfile) => {
    setIsLoading(true);
    assetService.setSimulatorMode(true);
    setIsSimulatorActive(true);
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

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] text-neutral-900 flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      {/* Top Banner & Enterprise Header */}
      <header className="border-b border-neutral-200 bg-white/90 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-neutral-900 text-white p-0.5 shadow-xs flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wider text-neutral-950">
                POWERGIS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-300">
                v2.0 Enterprise
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">
              Electricity Distribution GIS, Network Asset Management & O&M Platform
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-6 text-xs text-neutral-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-800 font-medium">Grid Operations Online</span>
          </div>
          <div className="h-4 w-px bg-neutral-200" />
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5 text-neutral-500" />
            <span>4 Regions Active</span>
          </div>
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <Shield className="w-3.5 h-3.5 text-neutral-500" />
            <span>Zero-Trust RLS</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch justify-center p-4 lg:p-8 gap-8 max-w-7xl mx-auto w-full">
        {/* Left Side: Login Credentials Card */}
        <div className="w-full lg:w-[460px] flex flex-col justify-center">
          <div className="bg-white border border-neutral-200 rounded-md p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="relative">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold mb-4">
                <Shield className="w-3.5 h-3.5 text-neutral-900" />
                <span>Statutory Utility Authentication</span>
              </div>

              <h1 className="text-2xl font-bold text-neutral-950 tracking-tight">Staff Sign In</h1>
              <p className="text-xs text-neutral-500 mt-1 mb-6">
                Access your assigned regional network jurisdiction, live SCADA, and asset registers.
              </p>

              {error && (
                <div className="mb-5 p-3.5 rounded-md bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1 font-mono">{error}</div>
                </div>
              )}

              {/* Simulator & Demo Personas Mode Switch */}
              <div className="flex items-center justify-between p-3 mb-5 rounded-md bg-neutral-50 border border-neutral-200">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-md ${isSimulatorActive ? 'bg-amber-100 text-amber-800' : 'bg-neutral-200 text-neutral-600'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900">Demo / Simulation Mode</div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {isSimulatorActive ? '11 Pre-seeded Roles Simulated' : 'Clean Operational Mode (No Dummy Data)'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSimulator(!isSimulatorActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    isSimulatorActive ? 'bg-amber-500' : 'bg-neutral-300'
                  }`}
                  title={isSimulatorActive ? 'Switch to Clean Mode' : 'Enable Demo Personas'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                      isSimulatorActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Official Email / Staff Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder={isSimulatorActive ? "e.g. ee.urban@powergis.internal" : "Official staff email or superadmin@powergis.internal"}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-md pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-mono transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-md pl-10 pr-10 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-neutral-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>Remember staff session</span>
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">Test: PowerGIS@2026</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-md bg-neutral-900 hover:bg-black text-white font-bold text-sm shadow-sm flex items-center justify-center space-x-2 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2"
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
              <div className="mt-6 pt-5 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-start space-x-2">
                <Info className="w-4 h-4 text-neutral-800 flex-shrink-0 mt-0.5" />
                <p>
                  Zero-trust jurisdiction RLS enforced at database layer. Each staff persona operates strictly within designated territorial bounds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Test Personas & Dummy Data Switcher */}
        <div className="flex-1 flex flex-col justify-center">
          {isSimulatorActive ? (
            <div className="bg-white border border-neutral-200 rounded-md p-6 sm:p-7 shadow-sm flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h2 className="text-base font-bold text-neutral-950">Engineering Personas & Test Data</h2>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select any official role below for instant 1-click login or to autofill test credentials.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-mono border border-amber-200 font-semibold">
                    11 Roles Simulated
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleSimulator(false)}
                    className="text-[10px] text-neutral-500 hover:text-neutral-900 underline font-mono cursor-pointer"
                  >
                    Clean Mode
                  </button>
                </div>
              </div>

              {/* Persona Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {initialUsers.map(u => {
                  const isSelected = selectedPersona?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectPersona(u)}
                      className={`p-3 rounded-md border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-neutral-50 border-neutral-900 text-neutral-950 shadow-sm ring-2 ring-neutral-900'
                          : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border bg-neutral-100 text-neutral-800 border-neutral-200">
                            {u.role.replace('_', ' ')}
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleOneClickLogin(u);
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-black text-white font-bold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
                          >
                            <span>1-Click</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="font-semibold text-xs text-neutral-950 leading-snug">
                          {u.fullName}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                          {u.designation}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                        <span className="truncate max-w-[140px]">{u.email}</span>
                        <span className="text-neutral-900 font-semibold">PowerGIS@2026</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Test Data Stats Summary */}
              <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
                  <div className="text-base font-bold text-neutral-950 font-mono">4</div>
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Regions</div>
                </div>
                <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
                  <div className="text-base font-bold text-neutral-950 font-mono">8</div>
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Substations</div>
                </div>
                <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
                  <div className="text-base font-bold text-neutral-950 font-mono">7 DTRs</div>
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Transformers</div>
                </div>
                <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200">
                  <div className="text-base font-bold text-neutral-950 font-mono">22+</div>
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Modules</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-md p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[460px]">
              <div className="w-16 h-16 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shadow-xs">
                <Shield className="w-8 h-8 text-neutral-900" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h2 className="text-base font-bold text-neutral-950">Clean Operational Mode Active</h2>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Pre-seeded dummy users and simulated accounts are disabled in clean production mode. Enter your registered utility credentials on the left to sign in.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleToggleSimulator(true)}
                  className="px-5 py-2.5 rounded-md bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>⚡ Simulate Demo Personas (SE, EE, AE, JE...)</span>
                </button>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono pt-4 border-t border-neutral-100 max-w-xs">
                Root Super Administrator: <br />
                <span className="text-neutral-700 font-semibold">superadmin@powergis.internal</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white px-6 py-3 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center space-x-2">
          <span>&copy; 2026 PowerGIS Enterprise. All rights reserved.</span>
          <span>•</span>
          <span className="font-semibold text-neutral-800">White Edition</span>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[11px] text-neutral-500">
          <span>PostGIS 3.4 Engine</span>
          <span>•</span>
          <span>IEEE 1366 / ISO 55000</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ">
          <div className="bg-white border border-neutral-200 rounded-md max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-neutral-950 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-neutral-900" />
              <span>Reset Staff Password</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Enter your registered staff email or username. An administrative verification code will be generated.
            </p>

            {forgotFeedback ? (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-mono">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{forgotFeedback}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Staff Email or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotInput}
                    onChange={e => setForgotInput(e.target.value)}
                    placeholder="e.g. ee.urban@powergis.internal"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-md text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all"
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
