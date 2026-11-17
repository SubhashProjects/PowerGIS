import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Network, AlertTriangle, Wrench, ShieldCheck, Power, ExternalLink } from 'lucide-react';
import { assetService } from '../../services/assetService';
import { faultRepository } from '../../repositories/domain/FaultRepository';
import { workOrderRepository } from '../../repositories/domain/WorkOrderRepository';
import { outageRepository } from '../../repositories/domain/OutageRepository';
import { ptwRepository } from '../../repositories/domain/PtwRepository';
import type { NavTabId } from '../../config/navigationConfig';

type Props = { asset: any; onClose: () => void; onNavigate: (tab: NavTabId) => void };
type RelatedItem = { label: string; value: string; target: NavTabId; description: string };

function classify(asset: any): { type: string; target: NavTabId; relationships: Record<string, string> } {
  if ('capacityMVA' in asset) return { type: 'Substation', target: 'assets', relationships: { feeders: 'substationId' } };
  if ('peakLoadAmps' in asset) return { type: 'Feeder', target: 'assets', relationships: { transformers: 'feederId', poles: 'feederId', consumers: 'feederId' } };
  if ('capacityKVA' in asset) return { type: 'Transformer', target: 'assets', relationships: { poles: 'transformerId', consumers: 'transformerId' } };
  if ('poleNumber' in asset) return { type: 'Pole', target: 'assets', relationships: { consumers: 'poleId' } };
  if ('consumerNumber' in asset) return { type: 'Consumer', target: 'assets', relationships: {} };
  if ('conductorType' in asset && 'startPoleId' in asset) return { type: 'Conductor', target: 'assets', relationships: {} };
  return { type: 'Network asset', target: 'assets', relationships: {} };
}

export const OperationalRecordDrawer: React.FC<Props> = ({ asset, onClose, onNavigate }) => {
  const meta = useMemo(() => classify(asset), [asset]);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const code = asset.code || asset.consumerNumber || asset.poleNumber || asset.id;
  const title = asset.name || `${meta.type} ${code}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [faults, workOrders, outages, permits] = await Promise.all([
          faultRepository.list(), workOrderRepository.list(), outageRepository.list(), ptwRepository.list(),
        ]);
        const allAssets: Record<string, any[]> = {
          substations: assetService.getSubstations(), feeders: assetService.getFeeders(),
          transformers: assetService.getTransformers(), poles: assetService.getPoles(), consumers: assetService.getConsumers(),
        };
        const relationships: RelatedItem[] = [];
        for (const [label, foreignKey] of Object.entries(meta.relationships)) {
          const records = allAssets[label] || [];
          const count = records.filter((r: any) => String(r[foreignKey]) === String(asset.id)).length;
          relationships.push({ label: label[0].toUpperCase() + label.slice(1), value: String(count), target: 'assets', description: `Related ${label}` });
        }
        const matches = (rows: any[], keys: string[]) => rows.filter(row => keys.some(key => row[key] != null && [asset.id, asset.code, asset.sectionId, asset.feederId].filter(Boolean).some(value => String(row[key]) === String(value))));
        const faultCount = matches(faults as any[], ['asset_id', 'assetId', 'feeder_id', 'feederId', 'section_id', 'sectionId']).length;
        const workCount = matches(workOrders as any[], ['asset_id', 'assetId', 'feeder_id', 'feederId', 'section_id', 'sectionId']).length;
        const outageCount = matches(outages as any[], ['asset_id', 'assetId', 'feeder_id', 'feederId', 'section_id', 'sectionId']).length;
        const permitCount = matches(permits as any[], ['feederId', 'feeder_id', 'sectionId', 'section_id']).length;
        relationships.push(
          { label: 'Faults', value: String(faultCount), target: 'faults', description: 'Fault and restoration records' },
          { label: 'Work orders', value: String(workCount), target: 'work_orders', description: 'Maintenance and field assignments' },
          { label: 'Outages', value: String(outageCount), target: 'outages', description: 'Outage and restoration events' },
          { label: 'Safety permits', value: String(permitCount), target: 'safety_ptw', description: 'Permits associated with this network area' },
        );
        if (active) setRelated(relationships);
      } catch {
        if (active) setRelated([]);
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [asset, meta.relationships]);

  const fields = Object.entries(asset).filter(([key, value]) => !['coordinates', 'geom', 'id'].includes(key) && value !== undefined && value !== null && typeof value !== 'object').slice(0, 16);
  const coordinates = Array.isArray(asset.coordinates) && asset.coordinates.length === 2 && typeof asset.coordinates[0] === 'number'
    ? `${asset.coordinates[0].toFixed(6)}, ${asset.coordinates[1].toFixed(6)}` : 'Not available';

  return <div className="fixed inset-0 z-[1000] flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label={`${meta.type} record`}>
    <button className="absolute inset-0 cursor-default" aria-label="Close record details" onClick={onClose} />
    <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-neutral-200 bg-white shadow-xl">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4">
        <div className="min-w-0"><div className="text-xs font-bold">{meta.type} · GIS RECORD</div><h2 className="mt-1 truncate text-lg font-bold">{title}</h2><p className="mt-1 text-xs">{code} · {asset.status || asset.condition || 'Status not recorded'}</p></div>
        <button onClick={onClose} className="rounded-md border border-neutral-200 p-2" aria-label="Close"><X className="h-4 w-4" /></button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <section className="rounded-md border border-neutral-200 p-3"><div className="mb-2 flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4" /> Geographic reference</div><p className="text-xs">{coordinates}</p><p className="mt-2 text-xs">Region: {asset.regionId || 'Not assigned'} · Division: {asset.divisionId || 'Not assigned'} · Section: {asset.sectionId || 'Not assigned'}</p></section>
        <section className="rounded-md border border-neutral-200 p-3"><h3 className="mb-3 text-sm font-bold">Record attributes</h3><dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">{fields.map(([key, value]) => <div key={key} className="min-w-0 border-b border-neutral-100 pb-2"><dt className="text-xs">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</dt><dd className="mt-0.5 break-words text-xs font-bold">{String(value)}</dd></div>)}</dl></section>
        <section className="rounded-md border border-neutral-200 p-3"><div className="mb-3 flex items-center gap-2 text-sm font-bold"><Network className="h-4 w-4" /> Operational relationships</div>{loading ? <p className="text-xs">Loading linked records…</p> : <div className="grid grid-cols-2 gap-2">{related.map(item => <button key={item.label} onClick={() => { onClose(); onNavigate(item.target); }} className="rounded-md border border-neutral-200 p-3 text-left hover:bg-neutral-50"><span className="block text-xs">{item.label}</span><span className="mt-1 block text-xl font-bold">{item.value}</span><span className="mt-1 block text-[11px]">{item.description}</span></button>)}</div>}</section>
        <section className="rounded-md border border-neutral-200 p-3"><h3 className="mb-2 text-sm font-bold">Available actions</h3><div className="grid grid-cols-2 gap-2"><button onClick={() => { onClose(); onNavigate('assets'); }} className="flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-xs font-bold"><ExternalLink className="h-3.5 w-3.5" /> Asset register</button><button onClick={() => { onClose(); onNavigate('gis_map'); }} className="flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-xs font-bold"><MapPin className="h-3.5 w-3.5" /> Return to map</button></div><p className="mt-2 text-[11px]">Related counts are derived from records currently returned by the configured repositories. They are not proof of a live SCADA state.</p></section>
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-neutral-200 p-3"><button onClick={() => { onClose(); onNavigate('faults'); }} className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-xs font-bold"><AlertTriangle className="h-3.5 w-3.5" /> Faults</button><button onClick={() => { onClose(); onNavigate('work_orders'); }} className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-xs font-bold"><Wrench className="h-3.5 w-3.5" /> Work orders</button><button onClick={() => { onClose(); onNavigate('safety_ptw'); }} className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-xs font-bold"><ShieldCheck className="h-3.5 w-3.5" /> PTW</button><button onClick={() => { onClose(); onNavigate('outages'); }} className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-xs font-bold"><Power className="h-3.5 w-3.5" /> Outages</button></footer>
    </aside>
  </div>;
};
