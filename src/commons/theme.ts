// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// COMMONS: DESIGN SYSTEM & THEME TOKENS (SINGLE SOURCE OF TRUTH - SSOT)
// Anti-Slop / Blobless Constraints: Flat, High-Contrast, Paper-Clean Surfaces, 6px Max Radius
// ============================================================================

export const THEME = {
  // 1. Surface Palette (High-Contrast Paper-Clean Canvas)
  surfaces: {
    canvas: '#FAFAFA',       // Master application canvas backdrop
    card: '#FFFFFF',         // Crisp modular content cards
    subtle: '#F4F4F5',       // Secondary muted backgrounds (zinc-100)
    elevated: '#FFFFFF',     // Modals, dropdowns, popovers
    contrast: '#09090B',     // Solid black buttons, prominent emblems
    borderHairline: '#E4E4E7', // Structural 1px hairline border (zinc-200)
    divider: '#F4F4F5',      // Soft internal dividers
  },

  // 2. Text Color Palette
  text: {
    primary: '#09090B',      // Maximum contrast primary reading text
    secondary: '#71717A',    // Supporting metadata, timestamps, subtitles
    muted: '#A1A1AA',        // Disabled states, subtle placeholders
    inverse: '#FFFFFF',      // Text over solid dark surfaces
    accent: '#2563EB',       // Official power distribution blue
  },

  // 3. Structural Constraints (Strictly Enforced)
  geometry: {
    maxBorderRadius: '0.375rem', // 6px maximum radius across ALL components
    borderRadiusClass: 'rounded-md',
    borderHairlineClass: 'border border-[#E4E4E7]',
    shadowHairlineClass: 'shadow-xs',
  },

  // 4. State & Operational Indicators (Minimalist Functional Signals)
  states: {
    optimal: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
      label: 'Optimal',
    },
    active: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-500',
      label: 'Active',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      dot: 'bg-amber-500',
      label: 'Warning',
    },
    critical: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      dot: 'bg-rose-600',
      label: 'Critical / Tripped',
    },
    standby: {
      bg: 'bg-zinc-100',
      text: 'text-zinc-700',
      border: 'border-zinc-300',
      dot: 'bg-zinc-400',
      label: 'Standby / Clean',
    },
    closed: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
      label: 'CLOSED',
    },
    open: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      dot: 'bg-rose-500',
      label: 'OPEN',
    },
  },

  // 5. Zero-Trust Role Identity Badges
  roleBadges: {
    super_admin: {
      bg: 'bg-zinc-100 text-[#09090B] border-zinc-300',
      dot: 'bg-[#09090B]',
      label: 'Super Admin',
    },
    state_admin: {
      bg: 'bg-zinc-100 text-zinc-900 border-zinc-300',
      dot: 'bg-zinc-800',
      label: 'State Admin',
    },
    se: {
      bg: 'bg-blue-50 text-blue-900 border-blue-200',
      dot: 'bg-blue-600',
      label: 'Superintending Engineer',
    },
    ee: {
      bg: 'bg-blue-50 text-blue-900 border-blue-200',
      dot: 'bg-blue-600',
      label: 'Executive Engineer',
    },
    aee: {
      bg: 'bg-sky-50 text-sky-900 border-sky-200',
      dot: 'bg-sky-600',
      label: 'Assistant Executive Engineer',
    },
    ae: {
      bg: 'bg-teal-50 text-teal-900 border-teal-200',
      dot: 'bg-teal-600',
      label: 'Assistant Engineer',
    },
    je: {
      bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      dot: 'bg-emerald-600',
      label: 'Junior Engineer',
    },
    contractor: {
      bg: 'bg-amber-50 text-amber-900 border-amber-300',
      dot: 'bg-amber-600',
      label: 'Survey Contractor',
    },
    auditor: {
      bg: 'bg-rose-50 text-rose-900 border-rose-300',
      dot: 'bg-rose-600',
      label: 'Regulatory Auditor',
    },
    gis_admin: {
      bg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      dot: 'bg-indigo-600',
      label: 'GIS Data Admin',
    },
  } as Record<string, { bg: string; dot: string; label: string }>,

  // 6. Priority Badge Styling Helper (Modular)
  getPriorityStyle: (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'immediate':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      case 'medium':
      case 'normal':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
      case 'low':
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200 font-normal';
    }
  },

  // 7. General Status Badge Styling Helper (Modular)
  getStatusStyle: (status: string): string => {
    switch (status.toLowerCase()) {
      case 'closed':
      case 'completed':
      case 'approved':
      case 'optimal':
      case 'on track':
      case 'active':
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
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      case 'new':
      case 'critical':
      case 'tripped':
      case 'overload':
      case 'alarm':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      case 'standby':
      case 'inactive':
      case 'idle':
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  },
} as const;

export type ThemeConfig = typeof THEME;
