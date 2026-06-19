import { useState, useMemo } from 'react';
import agentsData from './data/agents.json';
import type { Agent, CategoryMeta } from './types';
import { getCategoryLabel, getCategoryIcon } from './utils';
import { SearchBar } from './components/SearchBar';
import { CategoryFilter } from './components/CategoryFilter';
import { AgentCard } from './components/AgentCard';
import { AgentDetail } from './components/AgentDetail';
import { AgentChat } from './components/AgentChat';
import { DesignSystem } from './components/DesignSystem';
import { StatsBar } from './components/StatsBar';

const agents: Agent[] = agentsData as Agent[];

function App() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatAgent, setChatAgent] = useState<Agent | null>(null);
  const [showDesignSystem, setShowDesignSystem] = useState(false);

  const categories = useMemo<CategoryMeta[]>(() => {
    const catMap = new Map<string, number>();
    for (const agent of agents) {
      catMap.set(agent.category, (catMap.get(agent.category) ?? 0) + 1);
    }
    return Array.from(catMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => ({
        id,
        label: getCategoryLabel(id),
        icon: getCategoryIcon(id),
        count,
      }));
  }, []);

  const filteredAgents = useMemo(() => {
    let result = agents;

    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.vibe.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [search, selectedCategory]);

  const groupedAgents = useMemo(() => {
    const groups = new Map<string, Agent[]>();
    for (const agent of filteredAgents) {
      const cat = agent.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(agent);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAgents]);

  const handleLaunchChat = (agent: Agent) => {
    setSelectedAgent(null);
    setChatAgent(agent);
  };

  // Design system page
  if (showDesignSystem) {
    return <DesignSystem onClose={() => setShowDesignSystem(false)} />;
  }

  // If chat is active, show the chat panel
  if (chatAgent) {
    return (
      <AgentChat
        agent={chatAgent}
        onClose={() => setChatAgent(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-nxt-bg">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(17,80,84,0.3) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-6 pb-10">
          {/* Top bar: logo + badge — hidden by IA header in index.html */}
          <div className="text-center mb-8 slide-up">
            <div data-hero-branding="" className="flex items-center justify-center gap-3 mb-6">
              <img
                src="/nxt-humans-logo.png"
                alt="NXT Humans logo"
                className="h-8 w-auto"
              />
              <h1 className="font-display text-4xl tracking-tight text-nxt-text">
                NXT Agency
              </h1>
              <span className="px-3 py-1 rounded-[2px] text-[10px] font-bold uppercase tracking-wider
                             bg-nxt-lime/15 text-nxt-teal border border-nxt-lime/20">
                {agents.length} Agents
              </span>
            </div>

            <p data-hero-branding="" className="text-base text-nxt-text-muted max-w-xl mx-auto mb-6 leading-relaxed font-light">
              AI specialist agents powered by Claude, GPT, and Gemini
            </p>

            <button
              onClick={() => setShowDesignSystem(true)}
              className="px-4 py-2 rounded-[2px] text-[11px] font-bold uppercase tracking-wider
                         bg-nxt-bg-tertiary text-nxt-teal border border-nxt-border
                         hover:bg-nxt-border hover:border-nxt-border-hover transition-all mb-6 cursor-pointer"
              aria-label="View the NXT Humans 2026 design system reference"
            >
              View Design System
            </button>

            <StatsBar totalAgents={agents.length} categories={categories} />
          </div>

          <div className="mb-8">
            <SearchBar
              value={search}
              onChange={setSearch}
              resultCount={filteredAgents.length}
              totalCount={agents.length}
            />
          </div>

          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      </header>

      {/* Agent Grid */}
      <main className="max-w-6xl mx-auto px-6 py-10" role="main" aria-label="Agent directory">
        {groupedAgents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4" aria-hidden="true">&#x1F50D;</p>
            <p className="text-lg text-nxt-text-muted font-light">No agents match your search.</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory(null); }}
              className="mt-4 text-nxt-teal hover:text-nxt-lime text-xs font-bold uppercase tracking-wider cursor-pointer"
              aria-label="Clear all search filters"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedAgents.map(([category, categoryAgents]) => (
              <section key={category} aria-label={`${getCategoryLabel(category)} agents`}>
                <div className="flex items-center gap-3 mb-5">
                  {getCategoryIcon(category) && <span className="text-xl" aria-hidden="true">{getCategoryIcon(category)}</span>}
                  <h2 className="text-xl font-extralight text-nxt-text">
                    {getCategoryLabel(category)}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-[2px] bg-nxt-bg-secondary text-[10px] font-bold text-nxt-text-muted border border-nxt-border uppercase tracking-wider">
                    {categoryAgents.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label={`${getCategoryLabel(category)} agent cards`}>
                  {categoryAgents.map((agent, i) => (
                    <AgentCard
                      key={agent.filename}
                      agent={agent}
                      onClick={setSelectedAgent}
                      index={i}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-nxt-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-nxt-text-muted font-light">
          <div className="flex items-center gap-2">
            <img src="/nxt-humans-logo.png" alt="NXT Humans logo" className="h-5 w-auto opacity-60" />
            <p>Powered by <strong className="text-nxt-text-secondary font-medium">NXT Humans</strong></p>
          </div>
          <p className="text-xs text-nxt-text-muted">
            {agents.length} specialist agents across {categories.length} categories
          </p>
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onLaunchChat={handleLaunchChat}
        />
      )}
    </div>
  );
}

export default App;
