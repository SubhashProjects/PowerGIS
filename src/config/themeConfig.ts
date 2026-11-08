// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// THEME & DESIGN TOKENS CONFIGURATION (SSOT)
// Change any color, gradient or pill style here to reflect system-wide.
// ============================================================================

export const THEME_CONFIG = {
  // Brand Identity Gradients
  gradients: {
    primary: 'from-blue-600 to-indigo-600',
    primaryHover: 'from-blue-700 to-indigo-700',
    emblem: 'from-blue-600 via-indigo-600 to-cyan-500',
    accent: 'from-cyan-500 to-blue-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-rose-500 to-red-600',
    purple: 'from-purple-600 to-indigo-600',
  },

  // Color Palette Hex Codes
  colors: {
    electricBlue: '#2563EB',
    navyBlue: '#1E3A8A',
    cyan: '#06B6D4',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#EF4444',
    violet: '#8B5CF6',
    slateDark: '#0F172A',
    slateMuted: '#64748B',
    slateBorder: '#E2E8F0',
    canvasBg: '#F8FAFC',
    cardBg: '#FFFFFF',
  },

  // Role Accent Colors
  roleBadges: {
    super_admin: { bg: 'bg-purple-100 text-purple-900 border-purple-300', dot: 'bg-purple-600' },
    state_admin: { bg: 'bg-indigo-100 text-indigo-900 border-indigo-300', dot: 'bg-indigo-600' },
    se: { bg: 'bg-blue-100 text-blue-900 border-blue-300', dot: 'bg-blue-600' },
    ee: { bg: 'bg-blue-100 text-blue-900 border-blue-300', dot: 'bg-blue-600' },
    aee: { bg: 'bg-cyan-100 text-cyan-900 border-cyan-300', dot: 'bg-cyan-600' },
    ae: { bg: 'bg-teal-100 text-teal-900 border-teal-300', dot: 'bg-teal-600' },
    je: { bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', dot: 'bg-emerald-600' },
    contractor: { bg: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-600' },
    auditor: { bg: 'bg-rose-100 text-rose-900 border-rose-300', dot: 'bg-rose-600' },
    gis_admin: { bg: 'bg-sky-100 text-sky-900 border-sky-300', dot: 'bg-sky-600' },
  } as Record<string, { bg: string; dot: string }>,

  // Priority Styling Helper
  getPriorityStyle: (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'immediate':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'medium':
      case 'normal':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 font-normal';
    }
  },

  // Status Styling Helper
  getStatusStyle: (status: string) => {
    switch (status.toLowerCase()) {
      case 'closed':
      case 'completed':
      case 'approved':
      case 'optimal':
      case 'on track':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'in_progress':
      case 'acknowledged':
      case 'normal':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
      case 'verified':
        return 'bg-purple-50 text-purple-800 border-purple-200 font-bold';
      case 'assigned':
      case 'material_required':
      case 'delayed':
      case 'high load':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
      case 'new':
      case 'critical':
      case 'tripped':
      case 'overload':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold animate-pulse';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  },
} as const;
