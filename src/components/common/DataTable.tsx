import React from 'react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  density?: 'comfortable' | 'compact';
}

export function DataTable<T>({ columns, rows, rowKey, emptyTitle = 'No records found', emptyDescription = 'There are no records matching the current filters.', density = 'comfortable' }: DataTableProps<T>) {
  const rowHeight = density === 'compact' ? 'h-10' : 'h-12';
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[680px] table-fixed border-collapse text-left text-xs">
          <thead className="bg-neutral-50">
            <tr className="h-10 border-b border-neutral-200">
              {columns.map(column => (
                <th key={column.key} scope="col" className={`px-3 py-2 font-bold text-neutral-800 ${column.className || ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={rowKey(row, index)} className={`${rowHeight} border-b border-neutral-100 last:border-0 hover:bg-neutral-50`}>
                {columns.map(column => (
                  <td key={column.key} className={`max-w-0 truncate px-3 py-2 text-neutral-700 ${column.className || ''}`}>
                    {column.render ? column.render(row) : String((row as any)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="border-t border-neutral-100 bg-white p-6 text-center">
          <div className="text-sm font-bold text-neutral-900">{emptyTitle}</div>
          <div className="mt-1 text-xs text-neutral-600">{emptyDescription}</div>
        </div>
      )}
    </div>
  );
}
