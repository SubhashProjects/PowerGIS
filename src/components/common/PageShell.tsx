import React from 'react';
import { PageHeader } from './PageHeader';

interface PageShellProps { title: string; description?: string; section?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; }
export const PageShell: React.FC<PageShellProps> = ({ title, description, section, actions, children, className = '' }) => (
  <section className={`pg-module-page min-w-0 ${className}`}>
    <PageHeader title={title} description={description} section={section} actions={actions} />
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5 lg:px-6">{children}</div>
  </section>
);
