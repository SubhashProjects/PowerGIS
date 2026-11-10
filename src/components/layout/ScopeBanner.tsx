// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCOPE HUD INDICATOR (PERSISTENT STICKY BANNER) - SECTION 3.2
// Format: [Active Identity: {Role}] · [Jurisdiction: {Scope}] · [Privileges: {Tags}]
// Modular Architecture - Consumes SSOT from src/config/rbacConfig
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRoleDefinition } from '../../config/rbacConfig';
import { LABELS } from '../../config/labelsConfig';
import { ShieldAlert, ShieldCheck, Lock } from 'lucide-react';

export const ScopeBanner: React.FC = () => {
  const { user } = useAuth();
  const roleDef = getRoleDefinition(user.role);

  const roleTitle = roleDef.title;
  const jurisdictionLabel = user.contractorCompany
    ? `${user.contractorCompany} ${LABELS.scopeHUD.stagingIsolationSuffix}`
    : roleDef.defaultJurisdiction;
  const privilegeTags = roleDef.privilegeTags;

  const isRestricted = user.role === 'je' || user.role === 'contractor';

  return (
    <div
      className={`px-3 sm:px-4 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-1.5 select-none transition-colors ${
        isRestricted
          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
          : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#09090B]'
      }`}
    >
      {/* Left: Active Identity & Jurisdiction */}
      <div className="flex items-center space-x-2 min-w-0 flex-1 max-w-full">
        {isRestricted ? (
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        )}

        <div className="flex items-center space-x-1.5 font-mono text-[11px] min-w-0 flex-wrap sm:flex-nowrap">
          <span className="text-zinc-500 font-sans hidden sm:inline flex-shrink-0">{LABELS.scopeHUD.activeIdentityPrefix}</span>
          <span className="font-bold text-zinc-950 bg-white px-2 py-0.5 rounded border border-[#E4E4E7] flex-shrink-0">
            {roleTitle}
          </span>

          <span className="text-zinc-300 flex-shrink-0">·</span>

          <span className="text-zinc-500 font-sans hidden sm:inline flex-shrink-0">{LABELS.scopeHUD.jurisdictionPrefix}</span>
          <span
            title={jurisdictionLabel}
            className="font-medium text-zinc-900 bg-white px-2 py-0.5 rounded border border-[#E4E4E7] truncate max-w-[220px] sm:max-w-md lg:max-w-xl"
          >
            {jurisdictionLabel}
          </span>
        </div>
      </div>

      {/* Right: Privilege Tags & Zero-Trust RLS */}
      <div className="hidden lg:flex items-center space-x-1.5 text-[10px] font-mono">
        <span className="text-zinc-500 mr-0.5 font-sans">{LABELS.scopeHUD.privilegesPrefix}</span>
        {privilegeTags.map((tag, i) => {
          let badgeStyle = 'bg-white text-zinc-800 border-zinc-200';
          if (tag.includes('No Live') || tag.includes('Strict')) {
            badgeStyle = 'bg-amber-50 text-amber-900 border-amber-300';
          } else if (tag.includes('PTW') || tag.includes('Clear')) {
            badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
          } else if (tag.includes('SCADA') || tag.includes('Switching')) {
            badgeStyle = 'bg-red-50 text-red-800 border-red-300';
          } else if (tag.includes('Topology') || tag.includes('Trace')) {
            badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300';
          }

          return (
            <span
              key={i}
              className={`px-1.5 py-0.2 rounded border font-medium ${badgeStyle}`}
            >
              {tag}
            </span>
          );
        })}

        <span className="text-zinc-300">•</span>

        <span className="flex items-center space-x-1 px-2 py-0.5 bg-[#09090B] text-white rounded font-mono font-bold">
          <Lock className="w-2.5 h-2.5 text-zinc-400" />
          <span>{LABELS.scopeHUD.rlsActiveBadge}</span>
        </span>
      </div>
    </div>
  );
};
