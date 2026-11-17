import React from 'react';

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div className="flex min-h-40 items-center justify-center border border-neutral-200 bg-white p-6 text-center" role="status" aria-live="polite">
    <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" aria-hidden="true" />
      <span>{label}</span>
    </div>
  </div>
);
