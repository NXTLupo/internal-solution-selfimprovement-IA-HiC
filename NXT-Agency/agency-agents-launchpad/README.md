# Agency Agents Launchpad

Searchable catalog and activation interface for 172 agency-agent specialists, built for Claude Code inside VS Code.

**Stack**: React 19 + TypeScript + Vite + TailwindCSS 4 + Lucide Icons
**Port**: `5050` (hardcoded in `vite.config.ts` — avoids all NXT Humans workbench ports)

## Startup

### Prerequisites

- Node.js >= 18
- npm

### Install & Run

```bash
cd d:\NXT-Agency\agency-agents-launchpad
npm install
npm run dev
```

Open **http://localhost:5050** in your browser.

### Production Build

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

## Port Policy

This app runs on **port 5050**. The following ports are reserved by the NXT Humans AI CX Workbench and must never be used:

| Port | Service |
|------|---------|
| 3000 | Social Research UI |
| 5001 | Reddit Data Collector |
| 5002 | Video Analyzer |
| 5003 | LinkedIn Generator |
| 5004 | Miro Generator |
| 5005 | Accessibility Image Captioner |
| 5006 | Flux LoRA Studio |
| 5007 | Presentation Generator |
| 5008 | Amazon Market Intelligence Collector |
| 5009 | Soundtrack Generator |
| 5010 | Consistent Character Generator |
| 8000 | Launchpad Hub |
| 8080 | Journey Mapper (Claude 3.7) |
| 8081 | Social Research API |
| 8095 | Journey Mapper (Claude 4) |
| 8500 | Agent Orchestrator |
| 8501 | Reddit MCP |
| 8502 | Social MCP |
| 8503 | Journey MCP |
| 8504 | Video MCP |
| 8506 | Claude 4 Journey MCP |

## How It Works

1. **Agent data** is extracted from `d:\agency-agents\` markdown files into `src/data/agents.json` (156 agents with metadata)
2. **172 agent files** are installed to `%USERPROFILE%\.claude\agents\` across 14 categories
3. The launchpad provides a searchable UI to browse agents, read descriptions, and **copy example prompts** directly into Claude Code

## Using Agents in Claude Code

1. Open any project in VS Code with the Claude Code extension
2. Browse the launchpad to find the right specialist
3. Click an example prompt to copy it
4. Paste into Claude Code chat — Claude adopts that agent's expertise

## Project Structure

```
agency-agents-launchpad/
├── src/
│   ├── components/
│   │   ├── AgentCard.tsx        # Card with emoji, color, vibe
│   │   ├── AgentDetail.tsx      # Modal with prompts (click to copy)
│   │   ├── CategoryFilter.tsx   # Category pill filters
│   │   ├── SearchBar.tsx        # Full-text search
│   │   └── StatsBar.tsx         # Agent/category counters
│   ├── data/
│   │   └── agents.json          # Extracted agent metadata
│   ├── App.tsx                  # Main layout with hero, grid, modal
│   ├── types.ts                 # Agent & CategoryMeta interfaces
│   ├── utils.ts                 # Color resolution, category labels, clipboard
│   ├── index.css                # Tailwind 4 config + custom components
│   └── main.tsx                 # React entry point
├── vite.config.ts               # Port 5050, strict
├── postcss.config.js            # TailwindCSS 4 PostCSS plugin
└── package.json
```

## Reference

- Agent source repo: `d:\agency-agents\`
- Installed agents: `%USERPROFILE%\.claude\agents\`
- NXT Humans research: https://nxthumans.sharepoint.com/sites/Research
