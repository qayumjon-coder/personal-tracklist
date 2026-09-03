import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className={`flex items-center justify-center space-x-1.5 sm:space-x-2 ${className ?? 'mt-6 mb-4'}`}>
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="p-1.5 sm:p-2 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
        aria-label="Previous Page"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div className="flex items-center space-x-1 sm:space-x-1.5">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <div key={`ellipsis-${index}`} className="px-1.5 text-white/50">
                <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            );
          }

          const isCurrent = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-xs font-mono font-medium transition-all shrink-0 ${isCurrent
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="p-1.5 sm:p-2 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
        aria-label="Next Page"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
}
