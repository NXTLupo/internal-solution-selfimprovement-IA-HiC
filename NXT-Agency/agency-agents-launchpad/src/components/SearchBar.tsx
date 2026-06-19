import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}

export function SearchBar({ value, onChange, resultCount, totalCount }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto" role="search" aria-label="Search agents">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-nxt-text-muted"
          size={20}
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search agents by name, role, or category..."
          aria-label="Search agents by name, role, or category"
          className="w-full pl-12 pr-12 py-3.5 rounded-[2px]
                     bg-white border border-nxt-border
                     text-nxt-text placeholder-nxt-text-muted
                     focus:outline-none focus:ring-2 focus:ring-nxt-teal/20 focus:border-nxt-teal/40
                     transition-all text-[15px] font-light"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-nxt-text-muted
                       hover:text-nxt-text transition-colors"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {value && (
        <p className="text-sm text-nxt-text-muted mt-2 text-center font-light" aria-live="polite">
          {resultCount} of {totalCount} agents
        </p>
      )}
    </div>
  );
}
