import React from 'react';
import { PageHeader } from './PageHeader';

const groups = [
  { name: 'Common labels', description: 'Shared operational labels, navigation names and terminology belong in src/commons/labels.ts.' },
  { name: 'Common text', description: 'Reusable explanatory text and user-facing copy belong in src/commons/texts.ts.' },
  { name: 'Common values', description: 'Shared enumerations, defaults and non-presentation constants belong in src/commons/values.ts.' },
  { name: 'Common validators', description: 'Cross-module validation rules belong in src/commons/validators.ts.' },
  { name: 'Common presentation facade', description: 'Legacy presentation imports remain available through src/commons/theme.ts, but new UI styling must use src/styles/.' },
];

export const CommonPage: React.FC = () => (
  <div className="min-h-full bg-neutral-50">
    <PageHeader title="Common" section="System" description="Shared business content and reusable domain conventions. Presentation styles are maintained separately in Styles." />
    <div className="mx-auto grid max-w-7xl gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
      {groups.map(group => (
        <section key={group.name} className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-bold text-neutral-950">{group.name}</h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">{group.description}</p>
        </section>
      ))}
    </div>
  </div>
);
