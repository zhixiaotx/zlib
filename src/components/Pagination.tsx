import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [4, 6, 8, 12, 20],
  onPageChange,
  onPageSizeChange,
  itemLabel = '条'
}) => {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safeCurrent - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrent * pageSize, totalItems);

  // Build visible page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis-left' | 'ellipsis-right')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [1];

    if (safeCurrent > 3) {
      pages.push('ellipsis-left');
    }

    const start = Math.max(2, safeCurrent - 1);
    const end = Math.min(totalPages - 1, safeCurrent + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safeCurrent < totalPages - 2) {
      pages.push('ellipsis-right');
    }

    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 sm:px-5 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
      {/* Left: Record summary & Page Size selector */}
      <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
        <span className="font-mono">
          第 <strong className="text-slate-900 dark:text-white">{startItem}-{endItem}</strong> {itemLabel} / 共 <strong className="text-slate-900 dark:text-white">{totalItems}</strong> {itemLabel}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">每页显示:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} {itemLabel}/页
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrent <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors hidden sm:inline-flex"
          title="首页"
        >
          <ChevronsLeft size={15} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrent - 1)}
          disabled={safeCurrent <= 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
          title="上一页"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">上一页</span>
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((item, idx) =>
            typeof item === 'string' ? (
              <span key={`${item}-${idx}`} className="px-1.5 text-slate-400 font-mono">
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`min-w-[30px] h-[30px] px-2 rounded-lg font-mono font-semibold transition-all ${
                  item === safeCurrent
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrent + 1)}
          disabled={safeCurrent >= totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
          title="下一页"
        >
          <span className="hidden sm:inline">下一页</span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrent >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors hidden sm:inline-flex"
          title="末页"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};
