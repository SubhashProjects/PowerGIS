// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// SCOPE & JURISDICTION ENTITLEMENT BANNER
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ShieldCheck, MapPin, Building, Lock } from 'lucide-react';

export const ScopeBanner: React.FC = () => {
  const { user } = useAuth();

  const getJurisdictionLabel = () => {
    switch (user.role) {
      case 'super_admin':
        return 'Unrestricted System-Wide Oversight (All 4 Regions: Puducherry, Karaikal, Mahe, Yanam)';
      case 'se':
        return `Circle Jurisdiction: ${user.regionId === 'reg-pdy' ? 'Puducherry Circle (Urban & Rural Circles)' : 'Karaikal, Mahe & Yanam Circle'}`;
      case 'ee':
        return 'Divisional Scoping: Urban Distribution Division (Feeders, DTRs, Breakdowns & Work Orders)';
      case 'aee':
        return 'Sub-Divisional Scope: Town Sub-Division (Maintenance Supervision & Approvals)';
      case 'ae':
        return 'Section Scoping: Marapalam O&M Section (JE Approval, Fault Cleared Verification)';
      case 'je':
        return 'STRICT JE JURISDICTION: Marapalam Commercial Ward (Asset Editing & Contractor Verification Only)';
      case 'contractor':
        return `CONTRACTOR STAGING ISOLATION: ${user.contractorCompany || 'Larsen Power Ltd'} (Draft Survey & Offline GPS Uploads Only - No Live GIS Modification)`;
      case 'auditor':
        return 'Read-Only Regulatory & Grid Compliance Inspection Mode (Audit Trails Enabled)';
      default:
        return 'Role-based View Active';
    }
  };

  const isRestricted = user.role === 'je' || user.role === 'contractor';

  return (
    <div
      className={`px-4 py-1.5 border-b text-xs flex items-center justify-between select-none ${
        isRestricted
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          : 'bg-slate-900/80 border-slate-800 text-slate-300'
      }`}
    >
      <div className="flex items-center space-x-2 truncate">
        {isRestricted ? (
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
        )}
        <span className="font-semibold text-slate-200 uppercase tracking-wider text-[10px] px-1 rounded bg-slate-800">
          Entitlement
        </span>
        <span className="truncate">{getJurisdictionLabel()}</span>
      </div>

      <div className="hidden sm:flex items-center space-x-3 text-[11px] font-mono">
        <span className="flex items-center space-x-1 text-slate-400">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>RLS Enforced</span>
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-sky-400 font-semibold">{user.role.toUpperCase()}</span>
      </div>
    </div>
  );
};
