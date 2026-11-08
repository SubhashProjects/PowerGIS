// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCOPE & JURISDICTION ENTITLEMENT BANNER - MONOCHROME B&W THEME
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
          ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
          : 'bg-[#080808] border-neutral-800 text-neutral-300'
      }`}
    >
      <div className="flex items-center space-x-2 truncate">
        {isRestricted ? (
          <ShieldAlert className="w-3.5 h-3.5 text-white flex-shrink-0" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-white flex-shrink-0" />
        )}
        <span className="font-semibold text-white uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">
          Entitlement
        </span>
        <span className="truncate text-neutral-300 font-mono text-[11px]">{getJurisdictionLabel()}</span>
      </div>

      <div className="hidden sm:flex items-center space-x-3 text-[11px] font-mono">
        <span className="flex items-center space-x-1 text-neutral-400">
          <Lock className="w-3 h-3 text-white" />
          <span>Zero-Trust RLS</span>
        </span>
        <span className="text-neutral-600">•</span>
        <span className="text-white font-bold bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 text-[10px]">
          {user.role.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
