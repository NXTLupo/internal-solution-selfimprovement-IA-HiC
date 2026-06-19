import { useState } from 'react';
import { X, Copy, Check, Terminal, Sparkles, MessageSquare } from 'lucide-react';
import type { Agent } from '../types';
import { resolveColor, colorWithAlpha, getCategoryLabel, getCategoryIcon, copyToClipboard } from '../utils';

interface AgentDetailProps {
  agent: Agent;
  onClose: () => void;
  onLaunchChat: (agent: Agent) => void;
}

export function AgentDetail({ agent, onClose, onLaunchChat }: AgentDetailProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const color = resolveColor(agent.color);

  const handleCopy = async (text: string, index: number) => {
    await copyToClipboard(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${agent.name} agent details`}
    >
      <div className="absolute inset-0 bg-black/30" />

      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-[4px]
                   overflow-hidden flex flex-col slide-up border border-nxt-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-8 pt-8 pb-6"
          style={{
            background: '#ffffff',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-nxt-bg-tertiary flex items-center justify-center
                       hover:bg-nxt-lime hover:text-nxt-teal transition-colors border border-nxt-border"
            aria-label="Close agent details"
          >
            <X size={16} className="text-nxt-text-secondary" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl shrink-0"
              style={{ background: '#f5f5f5', border: '1px solid #e5e5e5' }}
              aria-hidden="true"
            >
              {agent.emoji || '\uD83E\uDD16'}
            </div>
            <div>
              <h2 className="text-2xl font-extralight text-nxt-text">{agent.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="px-2.5 py-0.5 rounded-[2px] text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: colorWithAlpha(agent.color, 0.1),
                    color: color,
                  }}
                >
                  {getCategoryIcon(agent.category) && <span aria-hidden="true">{getCategoryIcon(agent.category)}</span>}{getCategoryLabel(agent.category)}
                </span>
                <span
                  className="w-2 h-2 rounded-full status-pulse"
                  style={{ background: color }}
                  aria-label="Agent status: active"
                />
              </div>
            </div>
          </div>

          {/* Launch Agent Button -- lime CTA */}
          <button
            onClick={() => onLaunchChat(agent)}
            className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-[2px]
                       bg-nxt-lime hover:bg-nxt-lime-hover text-nxt-teal font-bold text-xs uppercase tracking-wider
                       transition-all cursor-pointer"
            aria-label={`Launch chat with ${agent.name}`}
          >
            <MessageSquare size={18} aria-hidden="true" />
            Launch Agent
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Vibe */}
          {agent.vibe && (
            <div className="flex items-start gap-3 p-4 rounded-[4px] bg-nxt-bg-tertiary border border-nxt-border">
              <Sparkles size={18} className="text-nxt-teal mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm text-nxt-text-secondary italic leading-relaxed font-light">
                "{agent.vibe}"
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-nxt-text-muted mb-2">
              About this agent
            </h4>
            <p className="text-sm text-nxt-text-secondary leading-relaxed font-light">
              {agent.description}
            </p>
          </div>

          {/* Mission */}
          {agent.mission && (
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-nxt-text-muted mb-2">
                Core Mission
              </h4>
              <div className="text-sm text-nxt-text-secondary leading-relaxed font-light whitespace-pre-line">
                {agent.mission}
              </div>
            </div>
          )}

          {/* Example Prompts */}
          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-nxt-text-muted mb-3 flex items-center gap-1.5">
              <Terminal size={14} aria-hidden="true" />
              Example Prompts -- click to copy
            </h4>
            <div className="space-y-2.5">
              {agent.prompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleCopy(prompt, i)}
                  className="prompt-chip w-full text-left p-3.5 rounded-[4px] border border-nxt-border
                             bg-nxt-bg-secondary hover:bg-nxt-bg-tertiary group transition-all"
                  aria-label={`Copy prompt: ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 shrink-0 w-5 h-5 rounded-[2px] flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: colorWithAlpha(agent.color, 0.1),
                        color: color,
                      }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <p className="text-[13px] text-nxt-text-secondary leading-relaxed flex-1 font-mono font-normal">
                      {prompt}
                    </p>
                    <span className="shrink-0 mt-0.5" aria-hidden="true">
                      {copiedIndex === i ? (
                        <Check size={15} className="text-nxt-green" />
                      ) : (
                        <Copy size={15} className="text-nxt-text-muted group-hover:text-nxt-teal" />
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Launch prompt */}
          <div className="p-4 rounded-[4px] border border-nxt-lime/20 bg-nxt-lime-10">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-nxt-teal mb-2">
              Real-time conversation
            </h4>
            <p className="text-[13px] text-nxt-text-secondary leading-relaxed font-light">
              Launch this agent to start a real-time conversation powered by AI.
              The agent will use its specialized knowledge and tools to assist you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
