import type { CategoryMeta } from '../types';

interface CategoryFilterProps {
  categories: CategoryMeta[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <nav className="flex flex-wrap justify-center gap-2" role="navigation" aria-label="Filter agents by category">
      <button
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={`px-4 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all
          ${selected === null
            ? 'bg-nxt-lime text-nxt-teal'
            : 'bg-white text-nxt-text-muted border border-nxt-border hover:border-nxt-border-hover hover:text-nxt-text'
          }`}
      >
        All ({categories.reduce((s, c) => s + c.count, 0)})
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(selected === cat.id ? null : cat.id)}
          aria-pressed={selected === cat.id}
          aria-label={`Filter by ${cat.label}, ${cat.count} agents`}
          className={`px-4 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all
            ${selected === cat.id
              ? 'bg-nxt-lime text-nxt-teal'
              : 'bg-white text-nxt-text-muted border border-nxt-border hover:border-nxt-border-hover hover:text-nxt-text'
            }`}
        >
          {cat.icon && <span aria-hidden="true">{cat.icon}</span>} {cat.label} ({cat.count})
        </button>
      ))}
    </nav>
  );
}
