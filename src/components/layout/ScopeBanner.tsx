// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCOPE HUD INDICATOR (PERSISTENT STICKY BANNER) - SECTION 3.2
// Format: [Active Identity: {Role}] · [Jurisdiction: {Scope}] · [Privileges: {Tags}]
// Modular Architecture - Consumes SSOT from src/config/rbacConfig
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRoleDefinition } from '../../config/rbacConfig';
import { ShieldAlert, ShieldCheck, Lock } from 'lucide-react';

export const ScopeBanner: React.FC = () => {
  const { user } = useAuth();
  const roleDef = getRoleDefinition(user.role);

  const roleTitle = roleDef.title;
  const jurisdictionLabel = user.contractorCompany
    ? `${user.contractorCompany} (Staging Sandbox Isolation)`
    : roleDef.defaultJurisdiction;
  const privilegeTags = roleDef.privilegeTags;

  const isRestricted = user.role === 'je' || user.role === 'contractor';

  return (
    <div
      className={`px-3 sm:px-4 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-1.5 select-none transition-colors ${
        isRestricted
          ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 border-amber-200 text-amber-950'
          : 'bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-purple-50/70 border-indigo-100 text-slate-800'
      }`}
    >
      {/* Left: Active Identity & Jurisdiction */}
      <div className="flex items-center space-x-2 min-w-0 flex-1 max-w-full">
        {isRestricted ? (
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-pulse" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        )}

        <div className="flex items-center space-x-1.5 font-mono text-[11px] min-w-0 flex-wrap sm:flex-nowrap">
          <span className="text-slate-500 font-sans hidden sm:inline flex-shrink-0">Active Identity:</span>
          <span className="font-extrabold text-blue-900 bg-white/95 px-2 py-0.5 rounded-lg border border-blue-200 shadow-xs flex-shrink-0">
            {roleTitle}
          </span>

          <span className="text-slate-400 flex-shrink-0">·</span>

          <span className="text-slate-500 font-sans hidden sm:inline flex-shrink-0">Jurisdiction:</span>
          <span
            title={jurisdictionLabel}
            className="font-bold text-slate-900 bg-white/70 px-2 py-0.5 rounded-lg border border-slate-200 truncate max-w-[220px] sm:max-w-md lg:max-w-xl"
          >
            {jurisdictionLabel}
          </span>
        </div>
      </div>

      {/* Right: Privilege Tags & Zero-Trust RLS */}
      <div className="hidden lg:flex items-center space-x-1.5 text-[10px] font-mono">
        <span className="text-slate-500 mr-0.5 font-sans">Privileges:</span>
        {privilegeTags.map((tag, i) => {
          let badgeStyle = 'bg-white text-blue-800 border-blue-200 shadow-2xs';
          if (tag.includes('No Live') || tag.includes('Strict')) {
            badgeStyle = 'bg-amber-100/90 text-amber-900 border-amber-300';
          } else if (tag.includes('PTW') || tag.includes('Clear')) {
            badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          } else if (tag.includes('SCADA') || tag.includes('Switching')) {
            badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
          } else if (tag.includes('Topology') || tag.includes('Trace')) {
            badgeStyle = 'bg-cyan-50 text-cyan-800 border-cyan-200';
          }

          return (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-md border font-semibold ${badgeStyle}`}
            >
              {tag}
            </span>
          );
        })}

        <span className="text-slate-300">•</span>

        <span className="flex items-center space-x-1 px-2 py-0.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-md font-bold shadow-xs">
          <Lock className="w-2.5 h-2.5 text-cyan-300" />
          <span>RLS Active</span>
        </span>
      </div>
    </div>
  );
};
