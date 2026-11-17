// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// SCOPE HUD INDICATOR (PERSISTENT STICKY BANNER) - SECTION 3.2
// Format: [Active Identity: {Role}] · [Jurisdiction: {Scope}] · [Privileges: {Tags}]
// Modular Architecture - Consumes SSOT from src/config/rbacConfig
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGIS } from '../../context/GISContext';
import { APP_CONFIG } from '../../config/appConfig';
import { getRoleDefinition } from '../../config/rbacConfig';
import { LABELS } from '../../config/labelsConfig';
import { ShieldAlert, ShieldCheck, Lock } from 'lucide-react';

export const ScopeBanner: React.FC = () => {
 const { user } = useAuth();
 const { activeRegion } = useGIS();
 const roleDef = getRoleDefinition(user.role);

 const roleTitle = roleDef.title;
 const regionName = APP_CONFIG.regions[activeRegion]?.name || 'Puducherry UT';
 const hierarchyBreadcrumb = `${regionName} › Circle-I › Div-Urban › Marapalam Section`;
 const jurisdictionLabel = user.contractorCompany
 ? `${hierarchyBreadcrumb} · [${user.contractorCompany} ${LABELS.scopeHUD.stagingIsolationSuffix}]`
 : hierarchyBreadcrumb;
 const privilegeTags = roleDef.privilegeTags;

 const isRestricted = user.role === 'je' || user.role === 'contractor';

 return (
 <div
 className={`pg-scope-banner px-3 sm:px-4 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-1.5 select-none transition-colors ${
 isRestricted
 ? 'bg-neutral-50/60 border-neutral-200 text-neutral-950'
 : 'bg-[#FAFAFA] border-[#E4E4E4] text-[#090909]'
 }`}
 >
 {/* Left: Active Identity & Jurisdiction */}
 <div className="flex items-center space-x-2 min-w-0 flex-1 max-w-full">
 {isRestricted ? (
 <ShieldAlert className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
 ) : (
 <ShieldCheck className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
 )}

 <div className="flex items-center space-x-1.5 text-[11px] min-w-0 flex-wrap sm:flex-nowrap">
 <span className="font-sans hidden sm:inline flex-shrink-0">{LABELS.scopeHUD.activeIdentityPrefix}</span>
 <span className="font-bold text-neutral-950 bg-white px-2 py-0.5 rounded border border-[#E4E4E4] flex-shrink-0">
 {roleTitle}
 </span>

 <span className="text-neutral-300 flex-shrink-0">·</span>

 <span className="font-sans hidden sm:inline flex-shrink-0">{LABELS.scopeHUD.jurisdictionPrefix}</span>
 <span
 title={jurisdictionLabel}
 className="font-medium text-neutral-900 bg-white px-2 py-0.5 rounded border border-[#E4E4E4] truncate max-w-[220px] sm:max-w-md lg:max-w-xl"
 >
 {jurisdictionLabel}
 </span>
 </div>
 </div>

 {/* Right: Privilege Tags & Zero-Trust RLS */}
 <div className="hidden lg:flex items-center space-x-1.5 text-[10px] ">
 <span className="mr-0.5 font-sans">{LABELS.scopeHUD.privilegesPrefix}</span>
 {privilegeTags.map((tag, i) => {
 let badgeStyle = 'bg-white text-neutral-800 border-neutral-200';
 if (tag.includes('No Live') || tag.includes('Strict')) {
 badgeStyle = 'bg-neutral-50 text-neutral-900 border-neutral-300';
 } else if (tag.includes('PTW') || tag.includes('Clear')) {
 badgeStyle = 'bg-neutral-50 text-neutral-800 border-neutral-300';
 } else if (tag.includes('SCADA') || tag.includes('Switching')) {
 badgeStyle = 'bg-neutral-50 text-neutral-800 border-neutral-300';
 } else if (tag.includes('Topology') || tag.includes('Trace')) {
 badgeStyle = 'bg-neutral-50 text-neutral-800 border-neutral-300';
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

 <span className="text-neutral-300">•</span>

 <span className="flex items-center space-x-1 px-2 py-0.5 bg-[#090909] text-white rounded font-bold">
 <Lock className="w-2.5 h-2.5 text-neutral-400" />
 <span>{LABELS.scopeHUD.rlsActiveBadge}</span>
 </span>
 </div>
 </div>
 );
};
