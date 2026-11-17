import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  section?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, section, actions }) => (
  <header className="pg-page-header border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
    <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1 text-[10px] text-neutral-500">
          {section && <span>{section}</span>}
          {section && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
          <span className="font-bold text-neutral-800">{title}</span>
        </div>
        <h1 className="text-base font-bold text-neutral-950 sm:text-lg">{title}</h1>
        {description && <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-neutral-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </header>
);
