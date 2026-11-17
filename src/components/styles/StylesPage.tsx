import React from 'react';
import { COLORS } from '../../styles/colors';
import { FONTS } from '../../styles/fonts';
import { UI } from '../../styles/ui';
import { DataTable } from '../common/DataTable';
import { PageHeader } from '../common/PageHeader';

const demoRows = [
  { id: 'PG-001', asset: 'DTR Mara', status: 'Operational', scope: 'Section 01' },
  { id: 'PG-002', asset: 'Feeder Main', status: 'Available', scope: 'Section 02' },
];

export const StylesPage: React.FC = () => (
  <div className="min-h-full bg-neutral-50">
    <PageHeader title="Styles" section="System" description="Single source of truth for application presentation. GIS operational symbology remains owned by the GIS module." />
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <section className="pg-common-card p-4">
        <h2 className="text-sm font-bold text-neutral-950">Typography</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-neutral-200 p-3"><div className="text-xs text-neutral-600">Normal</div><div className="mt-1 text-sm">PowerGIS Enterprise</div></div>
          <div className="rounded-md border border-neutral-200 p-3"><div className="text-xs text-neutral-600">Bold</div><div className="mt-1 text-sm font-bold">PowerGIS Enterprise</div></div>
          <div className="rounded-md border border-neutral-200 p-3"><div className="text-xs text-neutral-600">Underline</div><div className="mt-1 text-sm underline">PowerGIS Enterprise</div></div>
        </div>
        <p className="mt-3 text-xs text-neutral-600">Family: {FONTS.family}. Allowed emphasis: normal, bold and underline. Letter spacing: normal.</p>
      </section>

      <section className="pg-common-card p-4">
        <h2 className="text-sm font-bold text-neutral-950">Neutral color tokens</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(COLORS).filter(([, value]) => typeof value === 'string').map(([name, value]) => (
            <div key={name} className="rounded-md border border-neutral-200 p-2">
              <div className="h-8 rounded border border-neutral-300" style={{ backgroundColor: String(value) }} />
              <div className="mt-2 text-xs font-bold">{name}</div>
              <div className="mt-0.5 text-[10px] text-neutral-600">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="pg-common-card p-4">
        <h2 className="text-sm font-bold text-neutral-950">Controls</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-bold text-white hover:bg-neutral-800">Primary</button>
          <button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-50">Secondary</button>
          <button className="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">Quiet</button>
        </div>
      </section>

      <section className="pg-common-card p-4">
        <h2 className="text-sm font-bold text-neutral-950">Data table</h2>
        <p className="mt-1 mb-3 text-xs text-neutral-600">Stable table sizing, fixed row rhythm and horizontal scrolling on narrow screens.</p>
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'asset', label: 'Asset' },
            { key: 'status', label: 'Status' },
            { key: 'scope', label: 'Scope' },
          ]}
          rows={demoRows}
          rowKey={row => row.id}
        />
      </section>

      <section className="pg-common-card p-4">
        <h2 className="text-sm font-bold text-neutral-950">Layout tokens</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>Radius: {UI.radius.md}</div>
          <div>Page spacing: {UI.spacing.page}</div>
          <div>Focus ring: neutral</div>
          <div>Table row: {UI.table.rowHeight}</div>
        </div>
      </section>

      <section className="pg-common-card p-4">
        <h2 className="text-sm font-bold text-neutral-950">GIS exception</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">GIS Master Map retains its operational colors and symbology. No global grayscale filter, color interception, or application-wide SVG/canvas color override is used.</p>
      </section>
    </div>
  </div>
);
