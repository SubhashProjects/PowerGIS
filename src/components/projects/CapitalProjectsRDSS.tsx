// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// CAPITAL PROJECTS & RDSS REFORMS TRACKER (SECTION 13)
// PURE WHITE THEME & FINANCIAL VS PHYSICAL PROGRESS METRICS
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { assetService } from '../../services/assetService';
import {
  Building2, CheckCircle2, Clock, AlertTriangle, TrendingUp, Layers,
  DollarSign, MapPin, Calendar, FileText, ChevronRight, HardHat, RefreshCw, Zap
} from 'lucide-react';

interface RDSSScheme {
  id: string;
  schemeCode: string;
  title: string;
  category: 'Underground Cabling' | 'HVDS Conversion' | 'Smart Metering' | 'Substation Augmentation';
  scopeMetric: string;
  sanctionedBudgetCr: number;
  expenditureCr: number;
  physicalProgressPct: number;
  contractor: string;
  targetDate: string;
  status: 'In Progress' | 'On Track' | 'Delayed' | 'Completed';
  corridor: string;
  milestones: Array<{ title: string; completed: boolean; date: string }>;
}

const INITIAL_SCHEMES: RDSSScheme[] = [
  {
    id: 'rdss-ug-01',
    schemeCode: 'RDSS-PUDU-UG-01',
    title: 'Coastal Cyclone Resilient Underground Cabling (Package-I)',
    category: 'Underground Cabling',
    scopeMetric: '142.5 km HT/LT Trenching',
    sanctionedBudgetCr: 84.50,
    expenditureCr: 52.80,
    physicalProgressPct: 68,
    contractor: 'Larsen & Toubro Infra Ltd',
    targetDate: '31 Dec 2026',
    status: 'In Progress',
    corridor: 'Boulevard Town Coastal Belt · Marapalam to Rock Beach',
    milestones: [
      { title: 'Detailed Project Report (DPR) Sanctioned', completed: true, date: '15 Jan 2025' },
      { title: 'Horizontal Directional Drilling (HDD) Phase 1', completed: true, date: '10 Aug 2025' },
      { title: '11kV XLPE Cable Pulling & Jointing', completed: true, date: '14 Jan 2026' },
      { title: 'Feeder Interconnection & Ring Main Unit (RMU) Commissioning', completed: false, date: '30 Oct 2026' },
    ],
  },
  {
    id: 'rdss-hvds-02',
    schemeCode: 'RDSS-PUDU-HVDS-02',
    title: 'High Voltage Distribution System (HVDS) Agri Feeder Segregation',
    category: 'HVDS Conversion',
    scopeMetric: '88.0 km 11kV Aerial Bunched Cable',
    sanctionedBudgetCr: 42.20,
    expenditureCr: 33.10,
    physicalProgressPct: 79,
    contractor: 'Tata Projects Ltd',
    targetDate: '30 Sep 2026',
    status: 'On Track',
    corridor: 'Rural Agricultural Belt · Villianur to Bahour',
    milestones: [
      { title: 'GPS Survey & Customer Tagging', completed: true, date: '12 Feb 2025' },
      { title: '25kVA Small DTR Pole Erections (320 Nos)', completed: true, date: '28 Nov 2025' },
      { title: 'AB Cable Stringing on PCC Poles', completed: true, date: '15 Feb 2026' },
      { title: 'LT Line Dismantling & Final Charging', completed: false, date: '15 Aug 2026' },
    ],
  },
  {
    id: 'rdss-ami-03',
    schemeCode: 'RDSS-PUDU-AMI-03',
    title: 'Advanced Metering Infrastructure (AMI Smart Prepaid Meters)',
    category: 'Smart Metering',
    scopeMetric: '125,000 Consumer Smart Meters',
    sanctionedBudgetCr: 68.00,
    expenditureCr: 48.90,
    physicalProgressPct: 72,
    contractor: 'Genus Power Infrastructures',
    targetDate: '31 Mar 2027',
    status: 'In Progress',
    corridor: 'Urban Commercial & Domestic Consumers · Puducherry & Karaikal',
    milestones: [
      { title: 'Head-End System (HES) & MDMS Cloud Commissioned', completed: true, date: '01 Jun 2025' },
      { title: 'RF Mesh / Cellular Gateway Installation', completed: true, date: '18 Dec 2025' },
      { title: 'Consumer Meter Replacement (Phase 1: 50,000 meters)', completed: true, date: '20 Jan 2026' },
      { title: 'Consumer Prepaid Billing Integration & App Go-Live', completed: false, date: '15 Dec 2026' },
    ],
  },
  {
    id: 'rdss-ss-04',
    schemeCode: 'RDSS-PUDU-SS-04',
    title: '110/22kV Substation Capacity Augmentation & Gas Insulated Bay',
    category: 'Substation Augmentation',
    scopeMetric: '2x80MVA PTR Augmentation + GIS Bay',
    sanctionedBudgetCr: 35.00,
    expenditureCr: 14.50,
    physicalProgressPct: 41,
    contractor: 'KEC International Ltd',
    targetDate: '30 Jun 2027',
    status: 'Delayed',
    corridor: 'Marapalam & Sorapet 110kV Substations',
    milestones: [
      { title: 'Civil Foundation for 80MVA PTR', completed: true, date: '15 Jul 2025' },
      { title: 'Factory Acceptance Test (FAT) for 80MVA Power Transformer', completed: true, date: '22 Dec 2025' },
      { title: 'Gas Insulated Switchgear (GIS) Delivery & Erection', completed: false, date: '15 May 2026' },
      { title: 'SCADA IEC-61850 Substation Automation Integration', completed: false, date: '30 Nov 2026' },
    ],
  },
];

export const CapitalProjectsRDSS: React.FC = () => {
  const { user } = useAuth();
  const [isSimActive, setIsSimActive] = useState<boolean>(assetService.isSimulatorMode());
  const [schemes, setSchemes] = useState<RDSSScheme[]>(assetService.isSimulatorMode() ? INITIAL_SCHEMES : []);
  const [selectedScheme, setSelectedScheme] = useState<RDSSScheme | null>(assetService.isSimulatorMode() ? INITIAL_SCHEMES[0] : null);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      const active = assetService.isSimulatorMode();
      setIsSimActive(active);
      const list = active ? INITIAL_SCHEMES : [];
      setSchemes(list);
      setSelectedScheme(list[0] || null);
    });
    return unsub;
  }, []);

  // Aggregate stats
  const totalSanctionedCr = schemes.reduce((sum, s) => sum + s.sanctionedBudgetCr, 0);
  const totalExpenditureCr = schemes.reduce((sum, s) => sum + s.expenditureCr, 0);
  const avgPhysicalProgress = schemes.length > 0
    ? Math.round(schemes.reduce((sum, s) => sum + s.physicalProgressPct, 0) / schemes.length)
    : 0;
  const financialProgressPct = totalSanctionedCr > 0
    ? Math.round((totalExpenditureCr / totalSanctionedCr) * 100)
    : 0;

  const toggleMilestone = (schemeId: string, milestoneIndex: number) => {
    if (!selectedScheme) return;
    // Only administrators, SE, EE can update milestones
    if (!['super_admin', 'se', 'ee', 'contractor'].includes(user.role)) {
      alert('Milestone sign-off requires Executive Engineer or Contractor Project Manager role.');
      return;
    }

    setSchemes(prev =>
      prev.map(s => {
        if (s.id !== schemeId) return s;
        const updatedMilestones = [...s.milestones];
        updatedMilestones[milestoneIndex] = {
          ...updatedMilestones[milestoneIndex],
          completed: !updatedMilestones[milestoneIndex].completed,
        };
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

        const updated = {
          ...s,
          milestones: updatedMilestones,
          physicalProgressPct: newProgress,
          status: (newProgress === 100 ? 'Completed' : newProgress >= 60 ? 'In Progress' : 'Delayed') as any,
        };

        if (selectedScheme.id === schemeId) {
          setSelectedScheme(updated);
        }
        return updated;
      })
    );
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 text-neutral-900 select-none">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-600 to-cyan-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-teal-500/20 flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                Capital Schemes & RDSS Reforms Tracker
              </h1>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                REVAMPED DISTRIBUTION SECTOR SCHEME
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Government Infrastructure Modernization · Physical Progress (%) vs Financial Expenditure (₹ Cr)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono self-start sm:self-auto">
          <span className="px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold">
            Active Packages: <strong className="text-teal-700">{schemes.length} Schemes</strong>
          </span>
        </div>
      </div>

      {/* Aggregate Financial & Physical Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sanctioned Outlay */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-mono text-neutral-500">Total Sanctioned Outlay</div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-neutral-950 mt-1">
            ₹{totalSanctionedCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">MoP Approved Grant & Loan</div>
        </div>

        {/* Total Expenditure Booked */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-mono text-neutral-500">Cumulative Expenditure</div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
            ₹{totalExpenditureCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-emerald-700 font-mono mt-0.5 font-semibold">
            {financialProgressPct}% Financial Burn Rate
          </div>
        </div>

        {/* Average Physical Progress */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-mono text-neutral-500">Average Physical Progress</div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-sky-600 mt-1">
            {avgPhysicalProgress}%
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${avgPhysicalProgress}%` }} />
          </div>
        </div>

        {/* Schemes Status Breakdown */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-mono text-neutral-500">Package Execution Status</div>
          <div className="flex items-center space-x-2 mt-1.5">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
              3 On Track
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
              1 Delayed
            </span>
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1.5">Monitored under SE Capital Schemes</div>
        </div>
      </div>

      {/* Main Grid: Schemes List + Detailed Progress Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Schemes List Column */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
              Capital Schemes ({schemes.length})
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">Puducherry UT</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {schemes.length === 0 && (
              <div className="p-8 text-center text-slate-500 font-sans">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <p className="font-semibold text-xs text-slate-700">0 Capital Projects in Scope</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Operating in clean operational mode (0 simulated schemes). Turn ON the Simulator in the header to view simulated RDSS capital works packages.
                </p>
              </div>
            )}

            {schemes.map(s => {
              const isSelected = selectedScheme ? selectedScheme.id === s.id : false;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedScheme(s)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-50 border-neutral-900 shadow-xs ring-1 ring-neutral-900'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-950">{s.schemeCode}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${
                        s.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : s.status === 'Delayed'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-sky-50 text-sky-800 border-sky-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-neutral-900 mt-1 leading-snug">
                    {s.title}
                  </div>

                  {/* Dual Progress Bars */}
                  <div className="mt-2.5 space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between text-neutral-500">
                      <span>Physical: <strong className="text-neutral-900">{s.physicalProgressPct}%</strong></span>
                      <span>Budget: <strong className="text-neutral-900">₹{s.expenditureCr} / {s.sanctionedBudgetCr} Cr</strong></span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${s.physicalProgressPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Scheme Deep-Dive Column */}
        <div className="lg:col-span-2 space-y-4">
          {selectedScheme ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-extrabold text-sm sm:text-base text-neutral-950">
                    {selectedScheme.schemeCode}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                    {selectedScheme.category}
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-neutral-800 mt-1">
                  {selectedScheme.title}
                </h2>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-neutral-400" />
                  <span>{selectedScheme.corridor}</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 self-start sm:self-auto font-mono text-xs">
                <div className="text-[10px] text-neutral-500">Completion Target:</div>
                <div className="font-bold text-neutral-900 flex items-center space-x-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                  <span>{selectedScheme.targetDate}</span>
                </div>
              </div>
            </div>

            {/* Contractor & Scope Pill Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] text-neutral-500">Assigned EPC Contractor:</div>
                <div className="font-bold text-neutral-900 mt-0.5 truncate flex items-center space-x-1">
                  <HardHat className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="truncate">{selectedScheme.contractor}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] text-neutral-500">Work Scope Quantity:</div>
                <div className="font-bold text-neutral-900 mt-0.5">{selectedScheme.scopeMetric}</div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] text-neutral-500">Financial Expenditure:</div>
                <div className="font-bold text-emerald-700 mt-0.5">
                  ₹{selectedScheme.expenditureCr} Cr ({Math.round((selectedScheme.expenditureCr / selectedScheme.sanctionedBudgetCr) * 100)}%)
                </div>
              </div>
            </div>

            {/* Comparative Visual Dual Meter */}
            <div className="p-4 rounded-xl bg-slate-50 border border-neutral-200 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between font-bold text-neutral-900">
                <span>Physical Progress vs Financial Progress:</span>
                <span className="text-[11px] text-neutral-500">Target Benchmark: 100%</span>
              </div>

              {/* Physical meter */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-neutral-700">Physical Milestone Completion</span>
                  <span className="font-bold text-sky-700">{selectedScheme.physicalProgressPct}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-sky-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${selectedScheme.physicalProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Financial meter */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-neutral-700">Financial Fund Disbursement</span>
                  <span className="font-bold text-emerald-700">
                    {Math.round((selectedScheme.expenditureCr / selectedScheme.sanctionedBudgetCr) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((selectedScheme.expenditureCr / selectedScheme.sanctionedBudgetCr) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Milestone Checklist Tracker */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900 font-mono flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Execution Milestones & Quality Sign-Off ({selectedScheme.milestones.length})</span>
                </h4>
                <span className="text-[10px] text-neutral-400 font-mono">Click checkbox to sign-off</span>
              </div>

              <div className="space-y-2">
                {selectedScheme.milestones.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleMilestone(selectedScheme.id, idx)}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                      m.completed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center font-bold text-xs ${
                          m.completed
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-neutral-100 text-neutral-400 border-neutral-300'
                        }`}
                      >
                        {m.completed ? '✓' : idx + 1}
                      </div>
                      <span className={`font-medium ${m.completed ? 'line-through text-neutral-500' : 'text-neutral-900'}`}>
                        {m.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-[10px]">
                      <span className="text-neutral-500">{m.date}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold border ${
                          m.completed
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                        }`}
                      >
                        {m.completed ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <HardHat className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Clean Operational Mode Active</h3>
              <p className="text-xs text-slate-500 max-w-md">
                0 simulated capital projects are loaded. When the Simulator is OFF, all test/dummy RDSS schemes are hidden. Turn ON the Simulator via the header toolbar to view and test simulated schemes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
