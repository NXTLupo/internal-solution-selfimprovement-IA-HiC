export interface Agent {
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
  category: string;
  mission: string;
  prompts: string[];
  filename: string;
  // Agent capabilities (from backend API)
  slug?: string;
  model?: string;
  tier?: number;
  tools?: string[];
  supports_vision?: boolean;
}

export interface CategoryMeta {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export interface Attachment {
  type: 'image' | 'file';
  media_type: string;
  data: string; // base64
  filename: string;
  preview?: string; // data URL for local preview
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolExecution[];
  attachments?: Attachment[];
}

export interface ToolExecution {
  tool: string;
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'running' | 'completed' | 'error';
}
