import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalCount,
  loading,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50 text-xs text-slate-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
      <div>
        Page <span className="font-semibold text-slate-900 dark:text-zinc-100">{page}</span> of{' '}
        <span className="font-semibold text-slate-900 dark:text-zinc-100">{totalPages}</span> (
        {totalCount} total items)
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || loading}
          className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 transition"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || loading}
          className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
};

