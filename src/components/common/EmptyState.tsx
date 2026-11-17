import React from 'react';
import { SearchX } from 'lucide-react';

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="flex min-h-40 items-center justify-center border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
    <div className="max-w-sm">
      <SearchX className="mx-auto mb-2 h-5 w-5 text-neutral-500" aria-hidden="true" />
      <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed text-neutral-600">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  </div>
);
