// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// VISUAL ANALYTICS & TELEMETRY CHARTS: GRAPHS, PIES, BARS & CAPACITY GAUGES
// VIBRANT, AESTHETIC, HIGH-CONTRAST COLORFUL UI
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
  Legend,
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
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

// 1. 24-Hour Grid Demand & Substation Load Curve
const hourlyDemandData = [
  { time: '00:00', demandMW: 18.2, solarMW: 0.0, frequencyHz: 50.02, powerFactor: 0.98 },
  { time: '02:00', demandMW: 15.6, solarMW: 0.0, frequencyHz: 50.01, powerFactor: 0.98 },
  { time: '04:00', demandMW: 14.8, solarMW: 0.0, frequencyHz: 50.03, powerFactor: 0.99 },
  { time: '06:00', demandMW: 19.4, solarMW: 1.2, frequencyHz: 50.00, powerFactor: 0.97 },
  { time: '08:00', demandMW: 26.8, solarMW: 5.8, frequencyHz: 49.98, powerFactor: 0.96 },
  { time: '10:00', demandMW: 32.5, solarMW: 9.4, frequencyHz: 49.95, powerFactor: 0.95 },
  { time: '12:00', demandMW: 35.1, solarMW: 11.8, frequencyHz: 49.97, powerFactor: 0.94 },
  { time: '14:00', solarMW: 10.6, demandMW: 34.2, frequencyHz: 49.99, powerFactor: 0.95 },
  { time: '16:00', solarMW: 6.2, demandMW: 31.8, frequencyHz: 50.01, powerFactor: 0.96 },
  { time: '18:00', solarMW: 1.1, demandMW: 36.9, frequencyHz: 49.96, powerFactor: 0.95 },
  { time: '20:00', solarMW: 0.0, demandMW: 38.4, frequencyHz: 49.92, powerFactor: 0.94 }, // Peak
  { time: '22:00', solarMW: 0.0, demandMW: 28.5, frequencyHz: 49.99, powerFactor: 0.97 },
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
  { month: 'Aug', saidiMin: 52.4, saifiCount: 1.42, targetMin: 45 }, // Monsoon spike
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

export const DashboardAnalyticsCharts: React.FC = () => {
  const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [hoveredAssetIndex, setHoveredAssetIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Visual Analytics Header & Tab Selector */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20 flex-shrink-0">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Live Distribution Grid Analytics & Telemetry
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs">
                Real-Time Feeds
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">
              SCADA Peak Demand Curves • Network Asset Donut • IEEE 1366 Indices
            </p>
          </div>
        </div>

        {/* Time Window Switcher */}
        <div className="flex items-center space-x-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-mono self-start sm:self-auto">
          {(['24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setActiveTimeRange(range)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTimeRange === range
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Chart Row: 24h Area Graph + Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 24-Hour Grid Demand & Substation Load Curve */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-3 border-b border-neutral-100">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-neutral-950">24-Hour Grid Load Profile & Solar Injection</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
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

          {/* Area Chart Container */}
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
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-neutral-200 shadow-xl font-mono text-xs space-y-1">
                          <div className="font-bold text-neutral-900 border-b border-neutral-100 pb-1 flex justify-between">
                            <span>Time: {label} IST</span>
                            <span className="text-cyan-600 font-bold">Grid Telemetry</span>
                          </div>
                          <div className="flex items-center justify-between space-x-4 text-cyan-700 font-semibold">
                            <span>Grid Load:</span>
                            <span className="font-bold text-sm">{payload[0].value} MW</span>
                          </div>
                          {payload[1] && (
                            <div className="flex items-center justify-between space-x-4 text-emerald-700 font-semibold">
                              <span>Solar Feed:</span>
                              <span className="font-bold text-sm">{payload[1].value} MW</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="demandMW"
                  name="Grid Demand (MW)"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorDemand)"
                />
                <Area
                  type="monotone"
                  dataKey="solarMW"
                  name="Solar Rooftop Feed (MW)"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSolar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Asset Distribution Donut Chart */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="pb-3 mb-2 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-neutral-950">Asset Class Distribution</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 font-bold bg-neutral-100 px-2 py-0.5 rounded-full">
              PostGIS Layer Mix
            </span>
          </div>

          {/* Donut Chart Container */}
          <div className="h-52 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="percentage"
                  onMouseEnter={(_, index) => setHoveredAssetIndex(index)}
                  onMouseLeave={() => setHoveredAssetIndex(null)}
                >
                  {assetDistributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-neutral-200 shadow-xl font-mono text-xs">
                          <div className="font-bold text-neutral-900">{data.name}</div>
                          <div className="text-neutral-600 mt-0.5">
                            Share: <span className="font-bold text-neutral-950">{data.percentage}%</span>
                          </div>
                          <div className="text-neutral-500 text-[10px]">
                            Mapped Units: <span className="font-bold">{data.count}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-extrabold font-mono text-neutral-950">1,420</span>
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold font-mono">
                Total Assets
              </span>
            </div>
          </div>

          {/* Donut Color Legend Pills */}
          <div className="grid grid-cols-2 gap-1.5 pt-2">
            {assetDistributionData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-neutral-50 border border-neutral-100 text-[10px] font-mono"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-neutral-700 font-medium">{item.name.split(' ')[0]}</span>
                <span className="font-bold text-neutral-900 ml-auto">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Chart Row: Monthly Reliability Bar Chart + Feeder Capacity Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Monthly IEEE 1366 SAIDI & SAIFI Reliability Trends */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-3 border-b border-neutral-100">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-neutral-950">Monthly IEEE 1366 Reliability Indices (SAIDI / SAIFI)</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Average Outage Duration per Consumer (Minutes) Across 6 Months
              </p>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                JERC Compliant (&lt;45 min)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReliabilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit="m" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-neutral-200 shadow-xl font-mono text-xs space-y-1">
                          <div className="font-bold text-neutral-950 border-b border-neutral-100 pb-1">
                            Month: {label}
                          </div>
                          <div className="text-indigo-700 font-semibold flex justify-between space-x-3">
                            <span>SAIDI (Duration):</span>
                            <span className="font-bold">{payload[0].value} mins</span>
                          </div>
                          <div className="text-purple-700 font-semibold flex justify-between space-x-3">
                            <span>SAIFI (Frequency):</span>
                            <span className="font-bold">{payload[0].payload.saifiCount} / yr</span>
                          </div>
                          <div className="text-emerald-700 text-[10px] pt-1">
                            Target Threshold: 45.0 mins
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="saidiMin"
                  name="SAIDI (Minutes)"
                  fill="#6366F1"
                  radius={[8, 8, 0, 0]}
                >
                  {monthlyReliabilityData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.saidiMin <= 45 ? '#4F46E5' : '#F43F5E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Live Feeder Capacity Loading & Amperage Gauges */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-neutral-950">Feeder Capacity & Thermal Loading</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 font-bold bg-neutral-100 px-2 py-0.5 rounded-full">
              Real-Time SCADA
            </span>
          </div>

          <div className="space-y-4 my-auto">
            {feederUtilization.map((fdr, idx) => (
              <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-neutral-50/70 border border-neutral-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-900 truncate">{fdr.name}</span>
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-neutral-500">{fdr.currentA}A / {fdr.maxA}A</span>
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

                {/* Progress Bar with vibrant gradient fill */}
                <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${fdr.gradient} transition-all duration-500`}
                    style={{ width: `${fdr.loadPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Thermal Threshold Limit: 90%</span>
            <span className="text-emerald-700 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All 8 Feeders Operating Within Safe Limits</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tertiary Row: Colorful Consumer Segment & Revenue Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {consumerCategories.map((cat, idx) => (
          <div
            key={idx}
            className={`border rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md ${cat.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-neutral-700">
                {cat.label}
              </span>
              <span className={`text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded-full ${cat.badgeBg}`}>
                {cat.share}
              </span>
            </div>

            <div className="text-2xl font-black font-mono mt-2 tracking-tight text-neutral-950">
              {cat.consumers}
            </div>

            <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-500">Active Meters</span>
              <span className="font-semibold text-emerald-700">{cat.growth} YoY</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
