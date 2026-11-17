import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ErrorState: React.FC<{ title?: string; message: string; onRetry?: () => void }> = ({ title = 'Unable to load data', message, onRetry }) => (
  <div className="border border-neutral-300 bg-neutral-50 p-4" role="alert">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-700" aria-hidden="true" />
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-neutral-950">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-neutral-700">{message}</p>
        {onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded-md bg-neutral-900 px-3 py-2 text-xs font-bold text-white hover:bg-neutral-800">Retry</button>}
      </div>
    </div>
  </div>
);
