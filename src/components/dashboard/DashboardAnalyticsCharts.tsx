// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// VISUAL ANALYTICS & TELEMETRY CHARTS: ROLE-BASED TAILORED DASHBOARDS
// HIGH-CRAFT MINIMALIST SWISS UTILITY INTERFACE - BLOBLESS, ZERO-GRADIENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Activity,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Zap,
  Gauge,
  Layers,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Crosshair,
  Wrench,
  Clock,
  Compass,
} from 'lucide-react';
import { OfficialRole } from '../../types/auth';

// ----------------------------------------------------------------------------
// DATASETS SCOPED PER ROLE CATEGORY
// ----------------------------------------------------------------------------

// 1. Enterprise 24-Hour Grid Demand & Substation Load Curve
const hourlyDemandData = [
  { time: '00:00', demandMW: 18.2, solarMW: 0.0, frequencyHz: 50.02 },
  { time: '02:00', demandMW: 15.6, solarMW: 0.0, frequencyHz: 50.01 },
  { time: '04:00', demandMW: 14.8, solarMW: 0.0, frequencyHz: 50.03 },
  { time: '06:00', demandMW: 19.4, solarMW: 1.2, frequencyHz: 50.00 },
  { time: '08:00', demandMW: 26.8, solarMW: 5.8, frequencyHz: 49.98 },
  { time: '10:00', demandMW: 32.5, solarMW: 9.4, frequencyHz: 49.95 },
  { time: '12:00', demandMW: 35.1, solarMW: 11.8, frequencyHz: 49.97 },
  { time: '14:00', demandMW: 34.2, solarMW: 10.6, frequencyHz: 49.99 },
  { time: '16:00', demandMW: 31.8, solarMW: 6.2, frequencyHz: 50.01 },
  { time: '18:00', demandMW: 36.9, solarMW: 1.1, frequencyHz: 49.96 },
  { time: '20:00', demandMW: 38.4, solarMW: 0.0, frequencyHz: 49.92 }, // Peak
  { time: '22:00', demandMW: 28.5, solarMW: 0.0, frequencyHz: 49.99 },
];

// 2. Spatial Network Asset Distribution Pie / Donut
const assetDistributionData = [
  { name: 'Utility Poles (HT/LT)', count: 24, percentage: 38, color: '#09090B' },
  { name: 'Distribution Transformers', count: 7, percentage: 22, color: '#2563EB' },
  { name: '11kV/22kV Feeders', count: 8, percentage: 18, color: '#059669' },
  { name: 'Primary Substations', count: 8, percentage: 14, color: '#D97706' },
  { name: 'Smart Meters (AMI)', count: 85, percentage: 8, color: '#71717A' },
];

// 3. Monthly IEEE 1366 Reliability Metrics (SAIDI & SAIFI Bar Chart)
const monthlyReliabilityData = [
  { month: 'Jun', saidiMin: 48.2, saifiCount: 1.34, targetMin: 45 },
  { month: 'Jul', saidiMin: 45.1, saifiCount: 1.28, targetMin: 45 },
  { month: 'Aug', saidiMin: 52.4, saifiCount: 1.42, targetMin: 45 },
  { month: 'Sep', saidiMin: 44.8, saifiCount: 1.19, targetMin: 45 },
  { month: 'Oct', saidiMin: 41.5, saifiCount: 1.12, targetMin: 45 },
  { month: 'Nov (Live)', saidiMin: 38.6, saifiCount: 1.05, targetMin: 45 },
];

// 4. Feeder Capacity Utilization Progress Meters
const feederUtilization = [
  { name: 'FDR-MARA-01: Boulevard 11kV', loadPct: 74, currentA: 245, maxA: 330, status: 'Normal' },
  { name: 'FDR-HERI-02: Heritage Quarter 11kV', loadPct: 52, currentA: 156, maxA: 300, status: 'Optimal' },
  { name: 'FDR-VILL-03: Villianur Rural 22kV', loadPct: 88, currentA: 298, maxA: 340, status: 'High Load' },
  { name: 'FDR-LAWS-04: Lawspet Express 11kV', loadPct: 41, currentA: 122, maxA: 300, status: 'Optimal' },
];

// 5. Consumer Category Breakdown Cards
const consumerCategories = [
  { label: 'Domestic / Residential', consumers: '78,450', share: '62%', growth: '+2.4%' },
  { label: 'Commercial & Retail', consumers: '29,820', share: '24%', growth: '+4.1%' },
  { label: 'Industrial & HT Power', consumers: '13,240', share: '11%', growth: '+1.8%' },
  { label: 'Agricultural & Civic', consumers: '3,890', share: '3%', growth: '0.0%' },
];

// 6. CONTRACTOR-SPECIFIC: Daily Field Survey Cadence & Accuracy
const contractorDailyCadence = [
  { day: 'Mon', completed: 18, verified: 15, target: 20 },
  { day: 'Tue', completed: 24, verified: 22, target: 20 },
  { day: 'Wed', completed: 32, verified: 28, target: 25 },
  { day: 'Thu', completed: 29, verified: 26, target: 25 },
  { day: 'Fri', completed: 35, verified: 31, target: 30 },
  { day: 'Sat', completed: 22, verified: 20, target: 20 },
];

const contractorAccuracyData = [
  { name: 'RTK Sub-Meter (±0.2m)', count: 88, percentage: 55, color: '#09090B' },
  { name: 'DGPS Differential (±1.0m)', count: 52, percentage: 32, color: '#2563EB' },
  { name: 'Autonomous GPS (±2.5m)', count: 20, percentage: 13, color: '#71717A' },
];

// 7. JE-SPECIFIC: Ward Breakdown Restoration & Local Assets
const jeWeeklyBreakdowns = [
  { day: 'Mon', reported: 4, restored: 4 },
  { day: 'Tue', reported: 6, restored: 5 },
  { day: 'Wed', reported: 3, restored: 3 },
  { day: 'Thu', reported: 5, restored: 4 },
  { day: 'Fri', reported: 2, restored: 2 },
  { day: 'Sat', reported: 3, restored: 3 },
];

const jeWardAssetData = [
  { name: 'LT Distribution Poles (9m)', count: 18, percentage: 56, color: '#09090B' },
  { name: 'HT Utility Poles (11m)', count: 6, percentage: 19, color: '#2563EB' },
  { name: 'Distribution Transformers', count: 4, percentage: 13, color: '#059669' },
  { name: 'Overhead Conductors', count: 4, percentage: 12, color: '#71717A' },
];

interface DashboardAnalyticsChartsProps {
  role?: OfficialRole;
}

export const DashboardAnalyticsCharts: React.FC<DashboardAnalyticsChartsProps> = ({ role = 'super_admin' }) => {
  const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const isSim = assetService.isSimulatorMode();
  const poles = assetService.getPoles();
  const dts = assetService.getTransformers();
  const feeders = assetService.getFeeders();
  const subs = assetService.getSubstations();
  const consumers = assetService.getConsumers();

  const totalAssets = poles.length + dts.length + feeders.length + subs.length + consumers.length;

  const currentAssetDist = isSim ? assetDistributionData : (
    totalAssets === 0 ? [
      { name: 'Clean Standby Mode', count: 0, percentage: 100, color: '#94A3B8' }
    ] : [
      { name: 'Utility Poles', count: poles.length, percentage: Math.round((poles.length / totalAssets) * 100) || 1, color: '#8B5CF6' },
      { name: 'Distribution Transformers', count: dts.length, percentage: Math.round((dts.length / totalAssets) * 100) || 1, color: '#10B981' },
      { name: 'Feeders', count: feeders.length, percentage: Math.round((feeders.length / totalAssets) * 100) || 1, color: '#0EA5E9' },
      { name: 'Substations', count: subs.length, percentage: Math.round((subs.length / totalAssets) * 100) || 1, color: '#F59E0B' },
      { name: 'Consumers', count: consumers.length, percentage: Math.round((consumers.length / totalAssets) * 100) || 1, color: '#EC4899' },
    ].filter(a => a.count > 0)
  );

  // ==========================================================================
  // VIEW 1: CONTRACTOR / SURVEY AGENCY PORTAL
  // Strictly scoped to EPC GPS field operations, accuracy & staging pipeline
  // ==========================================================================
  if (role === 'contractor') {
    if (!isSim) {
      return (
        <div className="space-y-3.5">
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-base flex-shrink-0 border border-zinc-200">
                <Compass className="w-4 h-4 text-zinc-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
                    EPC Field Survey Analytics & Geolocation QA
                  </h2>
                  <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                    Standby (Empty)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Clean Operational Mode Active • Field GPS Cadence Standby
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-md bg-white border border-zinc-200 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#09090B]">No Active Field Survey Benchmarks</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Contractor daily survey cadences and DGPS precision test points have been moved to the Simulator. Turn ON the Simulator to stream simulated field survey operations.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => assetService.setSimulatorMode(true)}
                className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Turn ON Survey Simulator</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {/* Contractor Header */}
        <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-base border border-zinc-800 flex-shrink-0">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
                  EPC Field Survey Analytics & Geolocation QA
                </h2>
                <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                  GPS QA
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Differential GPS Fixes • Staged Asset Pipeline • Field Survey Accuracy
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-[11px] font-mono text-zinc-800 flex items-center space-x-1.5 self-start sm:self-auto">
            <Crosshair className="w-3.5 h-3.5 text-zinc-600" />
            <span className="font-semibold">Offline Staging Ready</span>
          </div>
        </div>

        {/* Contractor Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Daily Survey Cadence Bar Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
              <div>
                <div className="flex items-center space-x-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-zinc-700" />
                  <h3 className="text-xs font-semibold text-[#09090B]">Daily Field Survey Cadence (Poles & DTs Mapped)</h3>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-mono">
                <span className="flex items-center space-x-1 text-zinc-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#09090B] inline-block"></span>
                  <span>Surveyed</span>
                </span>
                <span className="flex items-center space-x-1 text-blue-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                  <span>JE Verified</span>
                </span>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractorDailyCadence} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="day" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="completed" name="Surveyed" fill="#09090B" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="verified" name="Verified" fill="#2563EB" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GPS Accuracy Tier Donut (1 col) */}
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="pb-2 mb-2 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Crosshair className="w-3.5 h-3.5 text-zinc-700" />
                <h3 className="text-xs font-semibold text-[#09090B]">GPS Precision Fix Tier</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 font-medium bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                DGPS
              </span>
            </div>

            <div className="h-38 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractorAccuracyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="percentage"
                  >
                    {contractorAccuracyData.map((entry, index) => (
                      <Cell key={`acc-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold font-mono text-[#09090B]">160</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                  Points
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1.5">
              {contractorAccuracyData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 rounded bg-zinc-50 border border-zinc-100 text-[10px] font-mono">
                  <span className="flex items-center space-x-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-700 truncate">{item.name}</span>
                  </span>
                  <span className="font-semibold text-[#09090B] ml-2">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contractor Field Staging Progress Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-white border border-zinc-200 rounded-md p-3">
            <div className="text-[10px] font-mono font-medium uppercase text-zinc-500">Poles Geotagged</div>
            <div className="text-lg font-bold font-mono mt-0.5 text-[#09090B]">142 / 150</div>
            <div className="text-[10px] text-zinc-600 font-medium mt-1">94.6% Target</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-md p-3">
            <div className="text-[10px] font-mono font-medium uppercase text-zinc-500">Conductors Digitized</div>
            <div className="text-lg font-bold font-mono mt-0.5 text-[#09090B]">12.4 km</div>
            <div className="text-[10px] text-zinc-600 font-medium mt-1">ACSR Spans</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-md p-3">
            <div className="text-[10px] font-mono font-medium uppercase text-zinc-500">Awaiting JE Verify</div>
            <div className="text-lg font-bold font-mono mt-0.5 text-[#09090B]">6 Assets</div>
            <div className="text-[10px] text-amber-700 font-medium mt-1">In Queue</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-md p-3">
            <div className="text-[10px] font-mono font-medium uppercase text-zinc-500">Live PostGIS</div>
            <div className="text-lg font-bold font-mono mt-0.5 text-[#09090B]">136 Assets</div>
            <div className="text-[10px] text-emerald-700 font-medium mt-1">Published</div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: JUNIOR ENGINEER (JE) PORTAL
  // Ward operations, breakdown ticket restorations & local distribution assets
  // ==========================================================================
  if (role === 'je') {
    if (!isSim) {
      return (
        <div className="space-y-3.5">
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-base flex-shrink-0 border border-zinc-200">
                <Wrench className="w-4 h-4 text-zinc-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
                    Ward Jurisdiction Telemetry & Restoration Analytics
                  </h2>
                  <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                    Standby (Empty)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Clean Operational Mode Active • Ward Breakdown Telemetry Standby
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-md bg-white border border-zinc-200 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#09090B]">No Active Ward Breakdown Tickets</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Ward breakdown restoration logs and simulated distribution assets have been moved to the Simulator. Turn ON the Simulator to stream test ward outages and asset verifications.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => assetService.setSimulatorMode(true)}
                className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Turn ON Ward Simulator</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {/* JE Header */}
        <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-base border border-zinc-800 flex-shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
                  Ward Jurisdiction Telemetry & Restoration Analytics
                </h2>
                <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                  Ward Command
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Marapalam Commercial Ward • Breakdown Tickets • Section Asset Health
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-[11px] font-mono text-zinc-800 flex items-center space-x-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
            <span className="font-semibold">Ward Patrol Online</span>
          </div>
        </div>

        {/* JE Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Breakdown Restoration Chart */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
              <div className="flex items-center space-x-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-zinc-700" />
                <h3 className="text-xs font-semibold text-[#09090B]">Ward Faults Reported vs Restored (Weekly)</h3>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-mono">
                <span className="flex items-center space-x-1 text-red-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                  <span>Reported</span>
                </span>
                <span className="flex items-center space-x-1 text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  <span>Restored</span>
                </span>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jeWeeklyBreakdowns} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="day" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="reported" name="Reported" fill="#DC2626" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="restored" name="Restored" fill="#16A34A" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ward Assets Donut */}
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="pb-2 mb-2 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <PieIcon className="w-3.5 h-3.5 text-zinc-700" />
                <h3 className="text-xs font-semibold text-[#09090B]">Ward Asset Inventory</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 font-medium bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                Ward Count
              </span>
            </div>

            <div className="h-38 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jeWardAssetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="percentage"
                  >
                    {jeWardAssetData.map((entry, index) => (
                      <Cell key={`je-asset-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold font-mono text-[#09090B]">32</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                  Ward Assets
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1.5">
              {jeWardAssetData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 rounded bg-zinc-50 border border-zinc-100 text-[10px] font-mono">
                  <span className="flex items-center space-x-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-700 truncate">{item.name}</span>
                  </span>
                  <span className="font-semibold text-[#09090B] ml-2">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  // ==========================================================================
  // VIEW 3: ASSISTANT ENGINEER (AE) & AEE
  // Section Operations, Feeder capacity loading & safety PTW monitoring
  // ==========================================================================
  if (role === 'ae' || role === 'aee') {
    if (!isSim) {
      return (
        <div className="space-y-3.5">
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-base flex-shrink-0 border border-zinc-200">
                <Zap className="w-4 h-4 text-zinc-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
                    Section Feeder Loading & Substation Telemetry
                  </h2>
                  <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                    Standby (Empty)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Clean Operational Mode Active • SCADA Feeder Telemetry Standby
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-md bg-white border border-zinc-200 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#09090B]">No Active Feeder Telemetry Streams</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Section feeder loading and substation telemetry data have been moved to the SCADA Simulator. Turn ON the Simulator to stream live feeder amperage and demand curves.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => assetService.setSimulatorMode(true)}
                className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Turn ON SCADA Simulator Telemetry</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-base border border-zinc-800 flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
                  Section Feeder Loading & Substation Telemetry
                </h2>
                <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                  Section Dispatch (Simulated)
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Marapalam O&M Section • Feeder Thermal Amperage • Safety PTW Clearances
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Section 24h Area Demand */}
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="pb-2 mb-2 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-700" />
                <h3 className="text-xs font-semibold text-[#09090B]">Section Feeder 24h Demand Profile (MW)</h3>
              </div>
              <span className="text-[10px] font-mono font-medium text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                Peak: 38.4 MW
              </span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyDemandData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="time" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} unit="MW" />
                  <Tooltip />
                  <Area type="monotone" dataKey="demandMW" name="Demand (MW)" stroke="#09090B" strokeWidth={1.5} fill="#F4F4F5" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feeder Thermal Loading Progress Gauges */}
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
              <div className="flex items-center space-x-1.5">
                <Gauge className="w-3.5 h-3.5 text-zinc-700" />
                <h3 className="text-xs font-semibold text-[#09090B]">Feeder Capacity & Thermal Amperage</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 font-medium bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                SCADA Feeds
              </span>
            </div>

            <div className="space-y-2.5 my-auto">
              {feederUtilization.map((fdr, idx) => (
                <div key={idx} className="space-y-1 p-2 rounded bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-900 truncate text-[11px]">{fdr.name}</span>
                    <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                      <span className="text-zinc-500">{fdr.currentA}A</span>
                      <span
                        className={`font-semibold px-1 py-0.5 rounded text-[9px] ${
                          fdr.loadPct > 80
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                        }`}
                      >
                        {fdr.loadPct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fdr.loadPct > 80 ? 'bg-amber-600' : 'bg-[#09090B]'}`}
                      style={{ width: `${fdr.loadPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 4: AUDITOR PORTAL
  // Regulatory compliance, IEEE 1366 reliability indices & asset health
  // ==========================================================================
  if (role === 'auditor') {
    if (!isSim) {
      return (
        <div className="space-y-3.5">
          <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-base border border-zinc-200 flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-zinc-600" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#09090B]">Statutory & Regulatory Audit Telemetry</h2>
                <p className="text-[11px] text-zinc-500 font-mono">Clean Operational Mode Active • Regulatory Reliability Standby</p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
              Clean Standby
            </span>
          </div>

          <div className="p-8 rounded-md bg-white border border-zinc-200 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#09090B]">0 Regulatory Outage Violations</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                No statutory IEEE 1366 reliability breaches logged in clean operational mode. Simulated audit telemetry and SAIDI/SAIFI historical charts are active only when the Simulator is ON.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => assetService.setSimulatorMode(true)}
                className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Turn ON Audit Simulator</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-base border border-zinc-800 flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#09090B]">Statutory & Regulatory Audit Telemetry</h2>
              <p className="text-[11px] text-zinc-500 font-mono">JERC Compliance Standards • IEEE 1366 Reliability Indices</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <div className="bg-white border border-zinc-200 rounded-md p-3.5">
            <h3 className="text-xs font-semibold text-[#09090B] mb-1">Monthly IEEE 1366 Reliability (SAIDI vs 45min SLA)</h3>
            <div className="h-52 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReliabilityData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} unit="m" />
                  <Tooltip />
                  <Bar dataKey="saidiMin" name="SAIDI (Mins)" fill="#09090B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-md p-3.5">
            <h3 className="text-xs font-semibold text-[#09090B] mb-1">Spatial Asset Register Audit</h3>
            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentAssetDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="percentage">
                    {currentAssetDist.map((e, idx) => (
                      <Cell key={idx} fill={e.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // ==========================================================================
  // VIEW 5: EXECUTIVE & SYSTEM ADMINISTRATION (EE, SE, SUPER ADMIN, GIS ADMIN)
  // Full comprehensive utility macro overview (Minimalist Swiss Precision)
  // ==========================================================================
  return (
    <div className="space-y-3.5">
      {/* Executive Analytics Header & Time Switcher */}
      <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-base border border-zinc-800 flex-shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold text-[#09090B] tracking-tight">
                Live Enterprise Grid Analytics & Telemetry
              </h2>
              <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                Utility Wide
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              SCADA Demand Curves • Network Asset Donut • IEEE 1366 Indices
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-zinc-100 p-0.5 rounded border border-zinc-200 text-[10px] font-mono self-start sm:self-auto">
          {(['24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setActiveTimeRange(range)}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                activeTimeRange === range
                  ? 'bg-[#09090B] text-white'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: 24h Demand Curve + Asset Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2 border-b border-zinc-100">
            <div>
              <div className="flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-700" />
                <h3 className="text-xs font-semibold text-[#09090B]">24-Hour Grid Load Profile & Solar Injection</h3>
              </div>
              <p className="text-[11px] text-zinc-500">
                Composite MW Demand Curve Across 8 Primary Distribution Substations
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <span className="flex items-center space-x-1 text-zinc-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#09090B] inline-block"></span>
                <span>Peak: {isSim ? '38.4 MW' : '0.0 MW'}</span>
              </span>
              <span className="flex items-center space-x-1 text-blue-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                <span>Solar: {isSim ? '11.8 MW' : '0.0 MW'}</span>
              </span>
            </div>
          </div>

          {isSim ? (
            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyDemandData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="time" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} unit="MW" />
                  <Tooltip />
                  <Area type="monotone" dataKey="demandMW" name="Grid Demand (MW)" stroke="#09090B" strokeWidth={1.5} fill="#F4F4F5" fillOpacity={0.8} />
                  <Area type="monotone" dataKey="solarMW" name="Solar Feed (MW)" stroke="#2563EB" strokeWidth={1.5} fill="#EFF6FF" fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 w-full flex flex-col items-center justify-center p-4 text-center rounded-md bg-zinc-50 border border-zinc-200">
              <TrendingUp className="w-7 h-7 text-zinc-400 mb-2" />
              <span className="text-xs font-semibold text-[#09090B]">Grid Demand Standby (0.0 MW)</span>
              <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                Dynamic telemetry demand profile is isolated. Turn ON the SCADA Simulator to stream live multi-substation demand.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="pb-2 mb-2 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <PieIcon className="w-3.5 h-3.5 text-zinc-700" />
              <h3 className="text-xs font-semibold text-[#09090B]">Asset Class Mix</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 font-medium bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
              PostGIS
            </span>
          </div>

          <div className="h-42 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={currentAssetDist} cx="50%" cy="50%" innerRadius={44} outerRadius={66} paddingAngle={3} dataKey="percentage">
                  {currentAssetDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-bold font-mono text-[#09090B]">
                {isSim ? '1,420' : totalAssets}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                Assets
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 pt-1.5">
            {currentAssetDist.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-1 p-1 rounded bg-zinc-50 border border-zinc-100 text-[10px] font-mono">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-zinc-700">{item.name.split(' ')[0]}</span>
                <span className="font-semibold text-zinc-950 ml-auto">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Reliability Bar Chart + Feeder Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2 border-b border-zinc-100">
            <div>
              <div className="flex items-center space-x-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-zinc-700" />
                <h3 className="text-xs font-semibold text-[#09090B]">Monthly IEEE 1366 Indices (SAIDI / SAIFI)</h3>
              </div>
              <p className="text-[11px] text-zinc-500">Average Outage Duration per Consumer (Minutes)</p>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] font-mono font-medium">
              {isSim ? 'JERC Compliant (<45 min)' : 'Clean Standby'}
            </span>
          </div>

          {isSim ? (
            <div className="h-50 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReliabilityData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} unit="m" />
                  <Tooltip />
                  <Bar dataKey="saidiMin" name="SAIDI (Minutes)" fill="#09090B" radius={[2, 2, 0, 0]}>
                    {monthlyReliabilityData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.saidiMin <= 45 ? '#09090B' : '#DC2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-50 w-full flex flex-col items-center justify-center p-4 text-center rounded-md bg-zinc-50 border border-zinc-200 my-auto">
              <BarChart3 className="w-7 h-7 text-zinc-400 mb-2" />
              <span className="text-xs font-semibold text-[#09090B]">0 Reliability Outages Logged</span>
              <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                IEEE 1366 SAIFI/SAIDI trends are in clean standby. Turn ON Simulator to view historical monthly benchmark curves.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-md p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
            <div className="flex items-center space-x-1.5">
              <Gauge className="w-3.5 h-3.5 text-zinc-700" />
              <h3 className="text-xs font-semibold text-[#09090B]">Feeder Capacity & Thermal Loading</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 font-medium bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
              SCADA Feeds
            </span>
          </div>

          {isSim ? (
            <div className="space-y-2.5 my-auto">
              {feederUtilization.map((fdr, idx) => (
                <div key={idx} className="space-y-1 p-2 rounded bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-900 truncate text-[11px]">{fdr.name}</span>
                    <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                      <span className="text-zinc-500">{fdr.currentA}A</span>
                      <span
                        className={`font-semibold px-1 py-0.5 rounded text-[9px] ${
                          fdr.loadPct > 80
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                        }`}
                      >
                        {fdr.loadPct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fdr.loadPct > 80 ? 'bg-amber-600' : 'bg-[#09090B]'}`}
                      style={{ width: `${fdr.loadPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-50 w-full flex flex-col items-center justify-center p-4 text-center rounded-md bg-zinc-50 border border-zinc-200 my-auto">
              <Gauge className="w-7 h-7 text-zinc-400 mb-2" />
              <span className="text-xs font-semibold text-[#09090B]">No Feeder Telemetry Streams</span>
              <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                Section feeder loading streams are empty in clean mode. Turn ON SCADA Simulator to view live thermal loading.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>Thermal Limit: 90%</span>
            <span className="text-emerald-700 font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>All Feeders Normal</span>
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Consumer Category Breakdown Cards */}
      {isSim ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {consumerCategories.map((cat, idx) => (
            <div key={idx} className="bg-white border border-zinc-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold font-mono text-zinc-600">
                  {cat.label.split(' ')[0]}
                </span>
                <span className="text-[10px] font-mono font-semibold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                  {cat.share}
                </span>
              </div>

              <div className="text-lg font-bold font-mono mt-1 tracking-tight text-[#09090B]">
                {cat.consumers}
              </div>

              <div className="mt-2 pt-1 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-500">Meters</span>
                <span className="font-semibold text-emerald-700">{cat.growth}</span>
              </div>
            </div>
          ))}
        </div>
      ) : consumers.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { label: 'Domestic / Residential', count: consumers.filter(c => c.category?.toLowerCase().includes('dom')).length },
            { label: 'Commercial & Retail', count: consumers.filter(c => c.category?.toLowerCase().includes('com')).length },
            { label: 'Industrial & HT Power', count: consumers.filter(c => c.category?.toLowerCase().includes('ind')).length },
            { label: 'Agricultural & Civic', count: consumers.filter(c => c.category?.toLowerCase().includes('agr')).length },
          ].map((cat, idx) => {
            const share = consumers.length > 0 ? `${Math.round((cat.count / consumers.length) * 100)}%` : '0%';
            return (
              <div key={idx} className="bg-white border border-zinc-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold font-mono text-zinc-600">
                    {cat.label.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                    {share}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono mt-1 tracking-tight text-[#09090B]">
                  {cat.count}
                </div>
                <div className="mt-2 pt-1 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Meters</span>
                  <span className="font-semibold text-emerald-700">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3.5 rounded-md bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 flex-shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#09090B]">Consumer Meter Telemetry Inactive (Clean Mode)</div>
              <div className="text-[11px] text-zinc-500 font-mono">
                0 meters in operational database. 125,400 test meters have been moved to the Simulator.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => assetService.setSimulatorMode(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#09090B] hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-900 transition-colors flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer flex-shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Turn ON Simulator</span>
          </button>
        </div>
      )}
    </div>
  );
};

