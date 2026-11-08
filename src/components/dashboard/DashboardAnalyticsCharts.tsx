// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// VISUAL ANALYTICS & TELEMETRY CHARTS: ROLE-BASED TAILORED DASHBOARDS
// GRAPHS, PIES, BARS & CAPACITY GAUGES - PURE WHITE THEME & VIBRANT PALETTE
// ============================================================================

import React, { useState } from 'react';
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
  Sparkles,
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
  { name: 'Utility Poles (HT/LT)', count: 24, percentage: 38, color: '#8B5CF6' },      // Violet
  { name: 'Distribution Transformers', count: 7, percentage: 22, color: '#10B981' },   // Emerald
  { name: '11kV/22kV Feeders', count: 8, percentage: 18, color: '#0EA5E9' },           // Sky Blue
  { name: 'Primary Substations', count: 8, percentage: 14, color: '#F59E0B' },         // Amber
  { name: 'Smart Meters (AMI)', count: 85, percentage: 8, color: '#EC4899' },          // Rose
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
  { name: 'FDR-MARA-01: Boulevard 11kV', loadPct: 74, currentA: 245, maxA: 330, status: 'Normal', gradient: 'from-cyan-500 to-blue-600' },
  { name: 'FDR-HERI-02: Heritage Quarter 11kV', loadPct: 52, currentA: 156, maxA: 300, status: 'Optimal', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'FDR-VILL-03: Villianur Rural 22kV', loadPct: 88, currentA: 298, maxA: 340, status: 'High Load', gradient: 'from-amber-500 to-orange-600' },
  { name: 'FDR-LAWS-04: Lawspet Express 11kV', loadPct: 41, currentA: 122, maxA: 300, status: 'Optimal', gradient: 'from-indigo-500 to-purple-600' },
];

// 5. Consumer Category Breakdown Cards
const consumerCategories = [
  { label: 'Domestic / Residential', consumers: '78,450', share: '62%', growth: '+2.4%', color: 'border-blue-500 text-blue-600 bg-blue-50/70', badgeBg: 'bg-blue-600' },
  { label: 'Commercial & Retail', consumers: '29,820', share: '24%', growth: '+4.1%', color: 'border-amber-500 text-amber-600 bg-amber-50/70', badgeBg: 'bg-amber-600' },
  { label: 'Industrial & HT Power', consumers: '13,240', share: '11%', growth: '+1.8%', color: 'border-purple-500 text-purple-600 bg-purple-50/70', badgeBg: 'bg-purple-600' },
  { label: 'Agricultural & Civic', consumers: '3,890', share: '3%', growth: '0.0%', color: 'border-emerald-500 text-emerald-600 bg-emerald-50/70', badgeBg: 'bg-emerald-600' },
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
  { name: 'RTK Sub-Meter (±0.2m)', count: 88, percentage: 55, color: '#10B981' },
  { name: 'DGPS Differential (±1.0m)', count: 52, percentage: 32, color: '#0EA5E9' },
  { name: 'Autonomous GPS (±2.5m)', count: 20, percentage: 13, color: '#F59E0B' },
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
  { name: 'LT Distribution Poles (9m)', count: 18, percentage: 56, color: '#4F46E5' },
  { name: 'HT Utility Poles (11m)', count: 6, percentage: 19, color: '#8B5CF6' },
  { name: 'Distribution Transformers', count: 4, percentage: 13, color: '#10B981' },
  { name: 'Overhead Conductors', count: 4, percentage: 12, color: '#06B6D4' },
];

interface DashboardAnalyticsChartsProps {
  role?: OfficialRole;
}

export const DashboardAnalyticsCharts: React.FC<DashboardAnalyticsChartsProps> = ({ role = 'super_admin' }) => {
  const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // ==========================================================================
  // VIEW 1: CONTRACTOR / SURVEY AGENCY PORTAL
  // Strictly scoped to EPC GPS field operations, accuracy & staging pipeline
  // ==========================================================================
  if (role === 'contractor') {
    return (
      <div className="space-y-6">
        {/* Contractor Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-pink-500/20 flex-shrink-0">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                  EPC Field Survey Analytics & Geolocation QA
                </h2>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-xs">
                  GPS QA Stream
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Differential GPS Fixes • Staged Asset Pipeline • Field Survey Accuracy
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200 text-xs font-mono text-pink-800 flex items-center space-x-2">
            <Crosshair className="w-3.5 h-3.5 text-pink-600" />
            <span className="font-bold">Offline Staging Ready</span>
          </div>
        </div>

        {/* Contractor Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Survey Cadence Bar Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-pink-600" />
                  <h3 className="text-sm font-bold text-slate-950">Daily Field Survey Cadence (Poles & DTs Mapped)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison of Assets Surveyed vs Verified by JE Field Staff
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="flex items-center space-x-1 text-pink-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block"></span>
                  <span>Surveyed</span>
                </span>
                <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>JE Verified</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractorDailyCadence} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xl font-mono text-xs space-y-1">
                            <div className="font-bold text-slate-950 border-b border-slate-100 pb-1">
                              Day: {label}
                            </div>
                            <div className="text-pink-700 font-semibold flex justify-between space-x-4">
                              <span>Surveyed:</span>
                              <span className="font-bold">{payload[0].value} assets</span>
                            </div>
                            <div className="text-emerald-700 font-semibold flex justify-between space-x-4">
                              <span>JE Verified:</span>
                              <span className="font-bold">{payload[1]?.value} assets</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="completed" name="Surveyed" fill="#EC4899" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="verified" name="Verified" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GPS Accuracy Tier Donut (1 col) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-950">GPS Precision Fix Tier</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                DGPS Accuracy
              </span>
            </div>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractorAccuracyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
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
                <span className="text-lg font-black font-mono text-slate-950">160</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
                  Points QA'd
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              {contractorAccuracyData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-mono">
                  <span className="flex items-center space-x-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </span>
                  <span className="font-bold text-slate-950 ml-2">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contractor Field Staging Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-t-4 border-t-pink-500 border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Poles Geotagged</div>
            <div className="text-2xl font-black font-mono mt-1 text-slate-950">142 / 150</div>
            <div className="text-[11px] text-pink-700 font-semibold mt-2">94.6% Ward Target Reached</div>
          </div>
          <div className="bg-white border-t-4 border-t-cyan-500 border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Conductor Spans Mapped</div>
            <div className="text-2xl font-black font-mono mt-1 text-slate-950">12.4 km</div>
            <div className="text-[11px] text-cyan-700 font-semibold mt-2">Rabbit & Dog ACSR</div>
          </div>
          <div className="bg-white border-t-4 border-t-amber-500 border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Awaiting JE Verification</div>
            <div className="text-2xl font-black font-mono mt-1 text-slate-950">6 Assets</div>
            <div className="text-[11px] text-amber-700 font-semibold mt-2">Staged in Review Queue</div>
          </div>
          <div className="bg-white border-t-4 border-t-emerald-500 border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Live PostGIS Promotion</div>
            <div className="text-2xl font-black font-mono mt-1 text-slate-950">136 Assets</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-2">AE Approved & Published</div>
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
    return (
      <div className="space-y-6">
        {/* JE Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20 flex-shrink-0">
              <Wrench className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                  Ward Jurisdiction Telemetry & Restoration Analytics
                </h2>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                  Ward Command
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Marapalam Commercial Ward • Breakdown Tickets • Section Asset Health
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-mono text-blue-800 flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold">Ward Patrol Online</span>
          </div>
        </div>

        {/* JE Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Breakdown Restoration Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-950">Ward Faults Reported vs Restored (Weekly)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Line Patrol breakdown response time & restoration rate
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="flex items-center space-x-1 text-rose-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span>Reported</span>
                </span>
                <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Restored</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jeWeeklyBreakdowns} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="reported" name="Reported" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="restored" name="Restored" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ward Assets Donut */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-950">Ward Asset Inventory</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                Ward Count
              </span>
            </div>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jeWardAssetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
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
                <span className="text-lg font-black font-mono text-slate-950">32</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
                  Ward Assets
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              {jeWardAssetData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-mono">
                  <span className="flex items-center space-x-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </span>
                  <span className="font-bold text-slate-950 ml-2">{item.count}</span>
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
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20 flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                  Section Feeder Loading & Substation Telemetry
                </h2>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                  Section Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Marapalam O&M Section • Feeder Thermal Amperage • Safety PTW Authorizations
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 24h Area Demand */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-950">Section Feeder 24h Demand Profile (MW)</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Peak: 38.4 MW
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyDemandData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAE" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit="MW" />
                  <Tooltip />
                  <Area type="monotone" dataKey="demandMW" name="Demand (MW)" stroke="#059669" strokeWidth={2.5} fill="url(#colorAE)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feeder Thermal Loading Progress Gauges */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-950">Feeder Capacity & Thermal Amperage</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                SCADA Telemetry
              </span>
            </div>

            <div className="space-y-4 my-auto">
              {feederUtilization.map((fdr, idx) => (
                <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate">{fdr.name}</span>
                    <div className="flex items-center space-x-2 font-mono text-[11px]">
                      <span className="text-slate-500">{fdr.currentA}A / {fdr.maxA}A</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          fdr.loadPct > 80
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {fdr.loadPct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${fdr.gradient}`}
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
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950">Statutory & Regulatory Audit Telemetry</h2>
              <p className="text-xs text-slate-500 font-mono">JERC Compliance Standards • IEEE 1366 Reliability Indices</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-950 mb-1">Monthly IEEE 1366 Reliability (SAIDI vs 45min SLA)</h3>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReliabilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit="m" />
                  <Tooltip />
                  <Bar dataKey="saidiMin" name="SAIDI (Mins)" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-950 mb-1">Spatial Asset Register Audit</h3>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetDistributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="percentage">
                    {assetDistributionData.map((e, idx) => (
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
  // Full comprehensive utility macro overview
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Executive Analytics Header & Time Switcher */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20 flex-shrink-0">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                Live Enterprise Grid Analytics & Telemetry
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs">
                Utility Wide
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              SCADA Peak Demand Curves • Network Asset Donut • IEEE 1366 Indices
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono self-start sm:self-auto">
          {(['24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setActiveTimeRange(range)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTimeRange === range
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: 24h Demand Curve + Asset Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-950">24-Hour Grid Load Profile & Solar Injection</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Composite MW Demand Curve Across 8 Primary Distribution Substations
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="flex items-center space-x-1 text-cyan-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span>
                <span>Peak: 38.4 MW</span>
              </span>
              <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Solar: 11.8 MW</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyDemandData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit="MW" />
                <Tooltip />
                <Area type="monotone" dataKey="demandMW" name="Grid Demand (MW)" stroke="#0284C7" strokeWidth={2.5} fill="url(#colorDemand)" />
                <Area type="monotone" dataKey="solarMW" name="Solar Feed (MW)" stroke="#059669" strokeWidth={2} fill="url(#colorSolar)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-950">Asset Class Distribution</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
              PostGIS Layer Mix
            </span>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={assetDistributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="percentage">
                  {assetDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-extrabold font-mono text-slate-950">1,420</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
                Total Assets
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2">
            {assetDistributionData.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-mono">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-slate-700 font-medium">{item.name.split(' ')[0]}</span>
                <span className="font-bold text-slate-900 ml-auto">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Reliability Bar Chart + Feeder Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-950">Monthly IEEE 1366 Reliability Indices (SAIDI / SAIFI)</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Average Outage Duration per Consumer (Minutes)</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold">
              JERC Compliant (&lt;45 min)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReliabilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit="m" />
                <Tooltip />
                <Bar dataKey="saidiMin" name="SAIDI (Minutes)" fill="#6366F1" radius={[8, 8, 0, 0]}>
                  {monthlyReliabilityData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.saidiMin <= 45 ? '#4F46E5' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-950">Feeder Capacity & Thermal Loading</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
              SCADA Feeds
            </span>
          </div>

          <div className="space-y-4 my-auto">
            {feederUtilization.map((fdr, idx) => (
              <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 truncate">{fdr.name}</span>
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-slate-500">{fdr.currentA}A / {fdr.maxA}A</span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        fdr.loadPct > 80
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {fdr.loadPct}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${fdr.gradient} transition-all duration-500`}
                    style={{ width: `${fdr.loadPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Thermal Threshold Limit: 90%</span>
            <span className="text-emerald-700 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All 8 Feeders Operating Within Safe Limits</span>
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Consumer Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {consumerCategories.map((cat, idx) => (
          <div key={idx} className={`border rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md ${cat.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-700">
                {cat.label}
              </span>
              <span className={`text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded-full ${cat.badgeBg}`}>
                {cat.share}
              </span>
            </div>

            <div className="text-2xl font-black font-mono mt-2 tracking-tight text-slate-950">
              {cat.consumers}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Active Meters</span>
              <span className="font-semibold text-emerald-700">{cat.growth} YoY</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
