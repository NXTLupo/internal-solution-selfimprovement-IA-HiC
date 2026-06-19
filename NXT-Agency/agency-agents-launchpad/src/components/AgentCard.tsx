import type { Agent } from '../types';
import { resolveColor, colorWithAlpha } from '../utils';

interface AgentCardProps {
  agent: Agent;
  onClick: (agent: Agent) => void;
  index: number;
}

function getTier(agent: Agent): number {
  if (agent.mission && agent.mission.length > 200) return 1;
  if (agent.mission && agent.mission.length > 50) return 2;
  if (agent.prompts.length >= 3) return 3;
  return 4;
}

export function AgentCard({ agent, onClick, index }: AgentCardProps) {
  const color = resolveColor(agent.color);
  const tier = getTier(agent);

  return (
    <button
      onClick={() => onClick(agent)}
      className="agent-card glass-card glass-card-hover text-left w-full rounded-[4px] p-5
                 cursor-pointer group slide-up"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      role="listitem"
      aria-label={`${agent.name} - ${agent.category} agent. ${agent.prompts.length} example prompts. Click to view details.`}
      tabIndex={0}
    >
      <div className="flex items-start gap-3.5 mb-3">
        <div
          className="w-11 h-11 rounded-[4px] flex items-center justify-center text-xl shrink-0
                     group-hover:scale-110 transition-transform"
          style={{ background: '#f5f5f5', border: '1px solid #e5e5e5' }}
          aria-hidden="true"
        >
          {agent.emoji || '\uD83E\uDD16'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-medium text-nxt-text truncate leading-tight">
              {agent.name}
            </h3>
            <span
              className="shrink-0 px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: tier <= 2 ? 'rgba(202, 202, 32, 0.15)' : '#f5f5f5',
                color: tier <= 2 ? '#115054' : '#acacac',
              }}
            >
              T{tier}
            </span>
          </div>
          <span
            className="inline-block mt-1 px-2 py-0.5 rounded-[2px] text-[11px] font-medium uppercase tracking-wider"
            style={{
              background: colorWithAlpha(agent.color, 0.08),
              color: color,
            }}
          >
            {agent.category}
          </span>
        </div>
      </div>

      <p className="text-[13px] text-nxt-text-secondary leading-relaxed line-clamp-2 mb-3 font-light">
        {agent.vibe || agent.description}
      </p>

      <div className="flex items-center gap-1.5 text-[12px] text-nxt-text-muted font-light">
        <span
          className="w-2 h-2 rounded-full status-pulse"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span>{agent.prompts.length} example prompts</span>
      </div>
    </button>
  );
}
