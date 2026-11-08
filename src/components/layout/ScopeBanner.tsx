// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCOPE HUD INDICATOR (PERSISTENT STICKY BANNER) - SECTION 3.2
// Format: [Active Identity: {Role}] · [Jurisdiction: {Scope}] · [Privileges: {Tags}]
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ShieldCheck, Lock, Activity, Key } from 'lucide-react';

export const ScopeBanner: React.FC = () => {
  const { user } = useAuth();

  const getRoleTitle = () => {
    switch (user.role) {
      case 'super_admin': return 'Super Administrator';
      case 'se': return 'Superintending Engineer (SE)';
      case 'ee': return 'Executive Engineer (EE)';
      case 'aee': return 'Asst. Executive Engineer (AEE)';
      case 'ae': return 'Section Engineer (AE)';
      case 'je': return 'Junior Engineer (JE)';
      case 'contractor': return 'EPC Contractor';
      case 'auditor': return 'Regulatory & Vigilance Auditor';
      default: return user.fullName || user.username || 'Utility Engineer';
    }
  };

  const getJurisdictionLabel = () => {
    switch (user.role) {
      case 'super_admin':
        return 'Puducherry UT (Universal State-Wide Oversight)';
      case 'se':
        return user.regionId === 'reg-pdy' ? 'Puducherry Circle (Urban & Rural Circles)' : 'Karaikal, Mahe & Yanam Circle';
      case 'ee':
        return 'Urban Operations Division (Feeders, DTRs & Dispatch)';
      case 'aee':
        return 'Town Sub-Division (Maintenance Supervision & Approvals)';
      case 'ae':
        return 'Marapalam O&M Section (JE Approval & Fault Cleared Verification)';
      case 'je':
        return 'Marapalam Commercial Ward (Strict Local Section Scope)';
      case 'contractor':
        return `${user.contractorCompany || 'Larsen Power Ltd'} (Staging Sandbox Isolation)`;
      case 'auditor':
        return 'State-Wide Regulatory Compliance & Energy Loss Audits';
      default:
        return 'Standard Distribution Scope';
    }
  };

  const getPrivilegeTags = (): string[] => {
    switch (user.role) {
      case 'super_admin':
        return ['SCADA Switching', 'PTW Clear', 'Topology Trace', 'DB Backup', 'Zero-Trust RLS'];
      case 'se':
        return ['RDSS Capital Schemes', 'SCADA Oversight', 'SLA Enforcement', 'PTW Approval'];
      case 'ee':
        return ['Feeder Dispatch', 'SCADA Switching', 'WO Release', 'Outage Approval'];
      case 'aee':
        return ['Sub-Div Operations', 'Survey Sign-Off', 'WO Verification'];
      case 'ae':
        return ['PTW Line Clearance', 'JE Verification', 'SLD Control', 'Breakdown Clearance'];
      case 'je':
        return ['Field Survey Verify', 'Pole Snapping', 'Fault Proximity', 'Local Section Only'];
      case 'contractor':
        return ['Staging Sandbox Only', 'GPS Photo Upload', 'No Live GIS Writes'];
      case 'auditor':
        return ['Read-Only RLS', 'Regulatory Exports', 'Loss Audits', 'Tamper Log'];
      default:
        return ['Standard Access'];
    }
  };

  const isRestricted = user.role === 'je' || user.role === 'contractor';

  return (
    <div
      className={`px-3 sm:px-4 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-1.5 select-none ${
        isRestricted
          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
          : 'bg-slate-50/90 border-slate-200 text-slate-800'
      }`}
    >
      {/* Left: Active Identity & Jurisdiction */}
      <div className="flex items-center space-x-2 truncate">
        {isRestricted ? (
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
        )}

        <div className="flex items-center space-x-1.5 font-mono text-[11px] truncate">
          <span className="text-neutral-500 font-sans hidden sm:inline">Active Identity:</span>
          <span className="font-bold text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-300 shadow-2xs">
            {getRoleTitle()}
          </span>

          <span className="text-neutral-300">·</span>

          <span className="text-neutral-500 font-sans hidden sm:inline">Jurisdiction:</span>
          <span className="font-semibold text-neutral-800 truncate">
            {getJurisdictionLabel()}
          </span>
        </div>
      </div>

      {/* Right: Privilege Tags & Zero-Trust RLS */}
      <div className="hidden lg:flex items-center space-x-1.5 text-[10px] font-mono">
        <span className="text-neutral-400 mr-1 font-sans">Privileges:</span>
        {getPrivilegeTags().map((tag, i) => (
          <span
            key={i}
            className={`px-1.5 py-0.5 rounded border font-semibold ${
              tag.includes('No Live') || tag.includes('Strict')
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-neutral-700 border-neutral-300 shadow-2xs'
            }`}
          >
            {tag}
          </span>
        ))}

        <span className="text-neutral-300">•</span>

        <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-neutral-900 text-white rounded font-bold">
          <Lock className="w-2.5 h-2.5 text-emerald-400" />
          <span>RLS Active</span>
        </span>
      </div>
    </div>
  );
};
