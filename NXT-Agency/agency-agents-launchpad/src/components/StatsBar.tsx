import { Users, FolderOpen, Zap } from 'lucide-react';
import type { CategoryMeta } from '../types';

interface StatsBarProps {
  totalAgents: number;
  categories: CategoryMeta[];
}

export function StatsBar({ totalAgents, categories }: StatsBarProps) {
  return (
    <div className="flex justify-center gap-8 text-sm text-nxt-text-muted font-light" aria-label="Platform statistics">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-nxt-teal" aria-hidden="true" />
        <span><strong className="text-nxt-text font-medium">{totalAgents}</strong> Agents</span>
      </div>
      <div className="flex items-center gap-2">
        <FolderOpen size={16} className="text-nxt-teal" aria-hidden="true" />
        <span><strong className="text-nxt-text font-medium">{categories.length}</strong> Categories</span>
      </div>
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-nxt-teal" aria-hidden="true" />
        <span>Powered by <strong className="text-nxt-text font-medium">Claude, GPT & Gemini</strong></span>
      </div>
    </div>
  );
}
