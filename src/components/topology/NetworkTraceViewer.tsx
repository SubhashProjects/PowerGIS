import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, CheckCircle2, GitFork, Network, Search, ShieldAlert, Zap } from 'lucide-react';
import { assetService } from '../../services/assetService';
import { analyzeNetwork, type NetworkFindingSeverity } from '../../services/networkIntelligenceService';
import { summarizePhaseCoverage, traceNetwork } from '../../services/networkModelService';
import type { NetworkPhase } from '../../types/assets';

const severityRank: Record<NetworkFindingSeverity, number> = { critical: 0, warning: 1, info: 2 };

export const NetworkTraceViewer: React.FC = () => {
  const [revision, setRevision] = useState(0);
  const [selectedFeederId, setSelectedFeederId] = useState('');
  const [direction, setDirection] = useState<'downstream' | 'upstream'>('downstream');
  const [findingFilter, setFindingFilter] = useState<'all' | NetworkFindingSeverity>('all');
  const [search, setSearch] = useState('');
  const [selectedPoleId, setSelectedPoleId] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<NetworkPhase | 'all'>('all');

  useEffect(() => {
    void assetService.loadFromSupabase().catch(() => undefined);
    return assetService.subscribe(() => setRevision(value => value + 1));
  }, []);

  const analysis = useMemo(() => analyzeNetwork({
    substations: assetService.getSubstations(),
    feeders: assetService.getFeeders(),
    transformers: assetService.getTransformers(),
    poles: assetService.getPoles(),
    conductors: assetService.getConductors(),
    consumers: assetService.getConsumers(),
  }), [revision]);
  const feeders = analysis.summaries.map(item => item.feeder);
  useEffect(() => {
    if (feeders.length && !feeders.some(feeder => feeder.id === selectedFeederId)) setSelectedFeederId(feeders[0].id);
  }, [feeders.map(feeder => feeder.id).join('|'), selectedFeederId]);

  const current = analysis.summaries.find(item => item.feeder.id === selectedFeederId) || analysis.summaries[0];
  const findings = analysis.findings
    .filter(item => findingFilter === 'all' || item.severity === findingFilter)
    .filter(item => `${item.title} ${item.detail} ${item.assetCode || ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const criticalCount = analysis.findings.filter(item => item.severity === 'critical').length;
  const warningCount = analysis.findings.filter(item => item.severity === 'warning').length;
  const allActiveConsumers = current?.consumers.filter(item => item.status === 'active') || [];
  const traceStartPole = current?.poles.find(pole => pole.id === selectedPoleId) || current?.poles[0];
  const networkTrace = current && traceStartPole ? traceNetwork({ startPoleId: traceStartPole.id, poles: current.poles, conductors: current.conductors, phase: selectedPhase === 'all' ? undefined : selectedPhase }) : undefined;
  const phaseCoverage = summarizePhaseCoverage(current?.conductors || []);

  const badge = (severity: NetworkFindingSeverity) => severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Warning' : 'Info';
  const badgeClass = (severity: NetworkFindingSeverity) => severity === 'critical'
    ? 'border-neutral-900 bg-neutral-900 text-white'
    : severity === 'warning' ? 'border-neutral-400 bg-neutral-100 text-neutral-900' : 'border-neutral-200 bg-white text-neutral-600';

  if (!feeders.length) {
    return <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6 text-neutral-900">
      <header className="rounded-md border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-3"><GitFork className="h-6 w-6" /><div><h1 className="text-lg font-bold">Network Intelligence & Topology</h1><p className="text-xs text-neutral-600">Electrical connectivity analysis and supply tracing</p></div></div>
      </header>
      <section className="rounded-md border border-neutral-200 bg-white p-8 text-center">
        <Network className="mx-auto mb-3 h-8 w-8 text-neutral-500" />
        <h2 className="font-semibold">No feeder records available</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-600">Load authorized network assets or enable the simulator in a development environment. The analysis does not create or assume network records.</p>
        <button type="button" onClick={() => assetService.toggleSimulatorMode()} className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Enable simulator</button>
      </section>
    </div>;
  }

  return <main className="mx-auto max-w-7xl space-y-4 p-3 text-neutral-900 sm:space-y-5 sm:p-6">
    <header className="flex flex-col justify-between gap-3 rounded-md border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-center gap-3"><div className="rounded-md border border-neutral-300 bg-neutral-100 p-2"><GitFork className="h-5 w-5" /></div><div><h1 className="text-lg font-bold">Network Intelligence & Topology</h1><p className="text-xs text-neutral-600">Connectivity validation, feeder tracing and operational risk indicators</p></div></div>
      <span className="w-fit rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold">Computed from currently loaded assets</span>
    </header>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Feeders analyzed" value={analysis.summaries.length} detail="Loaded feeder records" />
      <Metric label="Critical findings" value={criticalCount} detail="Requires investigation" />
      <Metric label="Warnings" value={warningCount} detail="Connectivity or quality" />
      <Metric label="Active consumers" value={assetService.getConsumers().filter(item => item.status === 'active').length} detail="Loaded customer records" />
    </section>

    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="block min-w-0 flex-1 text-xs font-semibold">Selected feeder
          <select value={current?.feeder.id || ''} onChange={event => setSelectedFeederId(event.target.value)} className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal">
            {analysis.summaries.map(item => <option key={item.feeder.id} value={item.feeder.id}>{item.feeder.code} — {item.feeder.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDirection('upstream')} aria-pressed={direction === 'upstream'} className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${direction === 'upstream' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white'}`}><ArrowUp className="h-4 w-4" /> Trace upstream</button>
          <button type="button" onClick={() => setDirection('downstream')} aria-pressed={direction === 'downstream'} className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${direction === 'downstream' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white'}`}><ArrowDown className="h-4 w-4" /> Trace downstream</button>
        </div>
      </div>
      {current && <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-4">
        <Metric label="Feeder utilization" value={`${current.utilizationPct}%`} detail={`${current.feeder.peakLoadAmps} A / ${current.feeder.ratedCapacityAmps} A`} />
        <Metric label="Transformers" value={current.transformers.length} detail="Assigned to feeder" />
        <Metric label="Poles / nodes" value={current.poles.length} detail={`${current.disconnectedPoleIds.length} disconnected candidates`} />
        <Metric label="Affected consumers" value={current.affectedConsumerCount} detail="Active linked premises" />
      </div>}
    </section>

    {current && <section className="rounded-md border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h2 className="font-bold">Phase-aware network trace</h2><p className="mt-1 text-xs text-neutral-600">Connected component from a selected pole using recorded conductor phase membership</p></div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[22rem]">
          <label className="text-xs font-semibold">Start pole<select value={traceStartPole?.id || ''} onChange={event => setSelectedPoleId(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm font-normal">{current.poles.map(pole => <option key={pole.id} value={pole.id}>{pole.code}</option>)}</select></label>
          <label className="text-xs font-semibold">Phase<select value={selectedPhase} onChange={event => setSelectedPhase(event.target.value as NetworkPhase | 'all')} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm font-normal"><option value="all">All recorded</option><option value="R">R phase</option><option value="Y">Y phase</option><option value="B">B phase</option><option value="N">Neutral</option></select></label>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Reachable poles" value={networkTrace?.visitedPoleIds.length || 0} detail="Within recorded component" />
        <Metric label="Traversed conductors" value={networkTrace?.traversedConductorIds.length || 0} detail="Energized flag not false" />
        <Metric label="Phase data gaps" value={networkTrace?.missingPhaseDataConductorIds.length || 0} detail="Conductor phase unknown" />
        <Metric label="Disconnected candidates" value={Math.max(0, current.poles.length - (networkTrace?.visitedPoleIds.length || 0))} detail="Not reached from start pole" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">{phaseCoverage.map(item => <div key={item.phase} className="rounded-md border border-neutral-200 p-3"><div className="flex items-center justify-between"><span className="text-sm font-bold">{item.phase} phase</span><span className="text-[10px] font-semibold uppercase text-neutral-600">{item.status.replace('_', ' ')}</span></div><p className="mt-1 text-xs text-neutral-600">{item.knownConductorCount} known conductors · {item.poleCount} poles</p><p className="text-[11px] text-neutral-500">{item.unknownConductorCount} conductors without phase data</p></div>)}</div>
      {!!networkTrace?.blockedSwitchIds.length && <p className="mt-3 text-xs text-neutral-700">Open switch edges block traversal: {networkTrace.blockedSwitchIds.join(', ')}</p>}
      {!!networkTrace?.unknownSwitchIds.length && <p className="mt-1 text-xs text-neutral-700">Unknown switch state — traversal withheld: {networkTrace.unknownSwitchIds.join(', ')}</p>}
      <p className="mt-3 text-[11px] text-neutral-500">Phase analysis uses only explicitly recorded phase attributes. Missing phase membership is unknown, not inferred. Switch edges are supported by the network model but must be supplied from an authorized, current source before use.</p>
    </section>}

    {current && <section className="rounded-md border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">{direction === 'upstream' ? 'Upstream supply path' : 'Downstream supply impact'}</h2><p className="mt-1 text-xs text-neutral-600">{direction === 'upstream' ? 'Consumer / distribution network → feeder → source substation' : 'Source substation → feeder → transformers → poles → consumers'}</p></div><Activity className="h-5 w-5" /></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(direction === 'upstream' ? [
          { title: 'Active consumers', value: String(current.affectedConsumerCount), note: 'Premises linked to this feeder' },
          { title: 'Distribution transformers', value: String(current.transformers.length), note: 'Feeder assignment' },
          { title: 'Feeder', value: current.feeder.code, note: current.feeder.name },
          { title: 'Source substation', value: current.source?.code || 'Missing', note: current.source?.name || 'Source reference unresolved' },
        ] : [
          { title: 'Source substation', value: current.source?.code || 'Missing', note: current.source?.name || 'Source reference unresolved' },
          { title: 'Feeder', value: current.feeder.code, note: current.feeder.name },
          { title: 'Distribution transformers', value: String(current.transformers.length), note: 'Assigned downstream assets' },
          { title: 'Active consumers', value: String(current.affectedConsumerCount), note: 'Estimated linked premises' },
        ]).map((item, index) => <div key={item.title} className="rounded-md border border-neutral-200 bg-neutral-50 p-3"><p className="text-[11px] font-semibold text-neutral-600">{index + 1}. {item.title}</p><p className="mt-1 break-words text-sm font-bold">{item.value}</p><p className="mt-1 text-[11px] text-neutral-600">{item.note}</p></div>)}
      </div>
      <p className="mt-3 text-[11px] text-neutral-500">This is a relationship-based trace using loaded asset references. It is not a live electrical state estimator or a validated protection / switching instruction.</p>
    </section>}

    <section className="rounded-md border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-bold">Topology integrity & operational findings</h2><p className="mt-1 text-xs text-neutral-600">Duplicate identifiers, broken asset references, conductor graph gaps and capacity exceptions</p></div><div className="flex flex-wrap gap-2">{(['all', 'critical', 'warning', 'info'] as const).map(value => <button key={value} type="button" onClick={() => setFindingFilter(value)} aria-pressed={findingFilter === value} className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold capitalize ${findingFilter === value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white'}`}>{value}</button>)}</div></div>
      <label className="mt-4 flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2"><Search className="h-4 w-4 text-neutral-500" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search findings, asset code or detail" className="w-full bg-transparent text-sm outline-none" /></label>
      {findings.length ? <div className="mt-3 divide-y divide-neutral-100">{findings.map(item => <article key={item.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${badgeClass(item.severity)}`}>{badge(item.severity)}</span><h3 className="text-sm font-semibold">{item.title}</h3></div><p className="mt-1 text-xs leading-5 text-neutral-600">{item.detail}</p></div><span className="shrink-0 text-[11px] text-neutral-500">{item.assetCode || item.feederId || 'Network'}</span></article>)}</div> : <div className="py-8 text-center text-sm text-neutral-600"><CheckCircle2 className="mx-auto mb-2 h-6 w-6" />No findings match the selected filters.</div>}
    </section>

    {current && <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border border-neutral-200 bg-white p-4"><h2 className="font-bold">Transformer condition & loading</h2><div className="mt-3 space-y-3">{current.transformers.map(item => <div key={item.id} className="border-b border-neutral-100 pb-3 last:border-0"><div className="flex justify-between gap-2 text-sm"><span className="font-semibold">{item.code} — {item.name}</span><span className="shrink-0">{item.loadPercentage}%</span></div><div className="mt-1 h-2 overflow-hidden rounded bg-neutral-100"><div className="h-full bg-neutral-700" style={{ width: `${Math.min(Math.max(item.loadPercentage, 0), 100)}%` }} /></div><p className="mt-1 text-[11px] text-neutral-600">{item.capacityKVA} kVA · phase imbalance {item.phaseImbalancePct}% · oil {item.oilLevelPct}%</p></div>)}{!current.transformers.length && <p className="text-sm text-neutral-500">No transformers assigned to this feeder.</p>}</div></div>
      <div className="rounded-md border border-neutral-200 bg-white p-4"><h2 className="font-bold">Active consumer impact list</h2><div className="mt-3 max-h-72 overflow-auto">{allActiveConsumers.map(item => <div key={item.id} className="border-b border-neutral-100 py-2 last:border-0"><p className="text-sm font-semibold">{item.consumerNumber} — {item.name}</p><p className="text-xs text-neutral-600">{item.address || 'Address not supplied'} · {item.category}</p></div>)}{!allActiveConsumers.length && <p className="text-sm text-neutral-500">No active consumers are linked to this feeder.</p>}</div></div>
    </section>}

    <div className="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>Topology findings are advisory data-quality and planning signals. Validate network records, field conditions, SCADA state and approved operating procedures before switching, isolation or outage decisions.</p></div>
  </main>;
};

const Metric: React.FC<{ label: string; value: string | number; detail: string }> = ({ label, value, detail }) => <div className="rounded-md border border-neutral-200 bg-white p-3"><p className="text-[11px] font-semibold text-neutral-600">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p><p className="mt-1 text-[11px] text-neutral-500">{detail}</p></div>;
