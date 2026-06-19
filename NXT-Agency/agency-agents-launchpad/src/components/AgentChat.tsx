import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Wifi, WifiOff, ChevronDown, ChevronRight, Loader2, Bot, User, Paperclip, Image, Cpu, Eye, Wrench, XCircle, FileText, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Agent, ToolExecution, Attachment } from '../types';
import { useAgentWebSocket } from '../hooks/useAgentWebSocket';

interface AgentChatProps {
  agent: Agent;
  onClose: () => void;
}

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function agentSlug(agent: Agent): string {
  return agent.slug || agent.filename.replace(/\.md$/, '');
}

/** Human-readable model display name */
function modelDisplayName(model?: string): string {
  if (!model) return 'AI';
  const map: Record<string, string> = {
    'claude-opus': 'Claude Opus',
    'claude-sonnet': 'Claude Sonnet',
    'claude-haiku': 'Claude Haiku',
    'gpt-5': 'GPT-5',
    'gpt-4o': 'GPT-4o',
    'gpt-4.1': 'GPT-4.1',
    'gemini-pro': 'Gemini Pro',
    'gemini-flash': 'Gemini Flash',
  };
  return map[model] || model;
}

/** Tier display badge */
function TierBadge({ tier }: { tier?: number }) {
  if (!tier || tier < 2) return null;
  const labels: Record<number, string> = {
    2: 'Tools',
    3: 'Code + Tools',
    4: 'Orchestrator',
  };
  const colors: Record<number, string> = {
    2: 'bg-nxt-teal/10 text-nxt-teal border-nxt-teal/20',
    3: 'bg-blue-50 text-blue-700 border-blue-200',
    4: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border ${colors[tier] || ''}`}>
      {labels[tier] || `Tier ${tier}`}
    </span>
  );
}

function ToolCard({ tool }: { tool: ToolExecution }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[4px] border border-nxt-border bg-nxt-bg-tertiary overflow-hidden mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nxt-text-secondary hover:bg-nxt-border/30 transition-colors"
        aria-expanded={expanded}
        aria-label={`Tool: ${tool.tool}, status: ${tool.status}`}
      >
        {tool.status === 'running' ? (
          <Loader2 size={12} className="animate-spin text-nxt-teal" />
        ) : tool.status === 'error' ? (
          <span className="w-3 h-3 rounded-full bg-nxt-red/20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-nxt-red" />
          </span>
        ) : (
          <span className="w-3 h-3 rounded-full bg-nxt-green/20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-nxt-green" />
          </span>
        )}
        <span className="font-mono font-medium">{tool.tool}</span>
        <span className="ml-auto" aria-hidden="true">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-nxt-border text-[11px] font-mono text-nxt-text-secondary space-y-2 max-h-48 overflow-auto">
          {Object.keys(tool.params).length > 0 && (
            <div>
              <p className="text-nxt-text mb-1 font-sans text-[10px] uppercase tracking-wider font-bold">Params</p>
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(tool.params, null, 2)}</pre>
            </div>
          )}
          {tool.result && (
            <div>
              <p className="text-nxt-text mb-1 font-sans text-[10px] uppercase tracking-wider font-bold">Result</p>
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(tool.result, null, 2)}</pre>
            </div>
          )}
          {tool.error && (
            <div>
              <p className="text-nxt-red mb-1 font-sans text-[10px] uppercase tracking-wider font-bold">Error</p>
              <pre className="whitespace-pre-wrap break-all text-nxt-red">{tool.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Renders an HTML prototype preview in a sandboxed iframe */
function PrototypePreview({ html, filename }: { html: string; filename?: string }) {
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const blob = useMemo(() => new Blob([html], { type: 'text/html' }), [html]);
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <div className={`mt-3 rounded-[4px] border border-nxt-teal/30 overflow-hidden ${expanded ? 'fixed inset-4 z-[70] bg-white' : ''}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-nxt-bg-tertiary border-b border-nxt-border">
        <span className="text-[11px] text-nxt-teal font-bold uppercase tracking-wider">
          {filename || 'Prototype Preview'}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-nxt-text-muted hover:text-nxt-teal transition-colors"
          >
            Open in tab
          </a>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-nxt-text-muted hover:text-nxt-teal transition-colors"
            aria-label={expanded ? 'Minimize prototype preview' : 'Maximize prototype preview'}
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src={url}
        sandbox="allow-scripts"
        className={`w-full bg-white ${expanded ? 'flex-1 h-[calc(100%-32px)]' : 'h-[400px]'}`}
        title={filename || 'Prototype'}
      />
    </div>
  );
}

/** Extracts prototype HTML from tool results */
function getPrototypeHtml(tool: ToolExecution): string | null {
  if (tool.tool !== 'generate_prototype' || tool.status !== 'completed') return null;
  const result = tool.result as Record<string, unknown> | undefined;
  if (!result) return null;
  const html = result.html as string | undefined;
  return html && html.length > 50 ? html : null;
}

function ThinkingIndicator({ status, startTime }: { status: 'waiting' | 'streaming' | 'tool_running'; startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 200);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  const labels: Record<string, string> = {
    waiting: 'Thinking',
    streaming: 'Responding',
    tool_running: 'Running tool',
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2" role="status" aria-live="polite">
      <Loader2 size={14} className="animate-spin text-nxt-teal" aria-hidden="true" />
      <span className="text-xs text-nxt-text-muted font-light">
        {labels[status] || 'Processing'}
      </span>
      {elapsed > 0 && (
        <span className="text-[10px] text-nxt-text-muted/50 font-mono tabular-nums">
          {formatElapsed(elapsed)}
        </span>
      )}
    </div>
  );
}

/** Renders attachments (images + documents) inline in a message bubble */
function AttachmentGallery({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((att, i) => (
        <div key={i} className="relative rounded-[4px] overflow-hidden border border-nxt-border">
          {isImageType(att.media_type) ? (
            <img
              src={att.preview || `data:${att.media_type};base64,${att.data}`}
              alt={att.filename || 'Attached image'}
              className="max-w-[280px] max-h-[220px] object-contain bg-nxt-bg-secondary"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-nxt-bg-secondary min-w-[140px]">
              <FileText size={16} className="text-nxt-teal shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-nxt-text truncate max-w-[180px]">{att.filename || 'document'}</p>
                <p className="text-[10px] text-nxt-text-muted">{fileExtension(att.filename || '')}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Staging area showing pending attachments before sending */
function AttachmentPreview({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (i: number) => void }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-nxt-border bg-nxt-bg-tertiary">
      <span className="text-[11px] text-nxt-text-muted font-light self-center mr-1">Attachments:</span>
      {attachments.map((att, i) => (
        <div key={i} className="relative group">
          {isImageType(att.media_type) ? (
            <img
              src={att.preview || `data:${att.media_type};base64,${att.data}`}
              alt={att.filename || 'Pending attachment'}
              className="w-16 h-16 object-cover rounded-[4px] border border-nxt-border"
            />
          ) : (
            <div className="h-16 px-3 rounded-[4px] border border-nxt-border bg-nxt-bg-secondary flex items-center gap-2">
              <FileText size={16} className="text-nxt-teal shrink-0" aria-hidden="true" />
              <div className="min-w-0 max-w-[100px]">
                <p className="text-[11px] text-nxt-text truncate">{att.filename}</p>
                <p className="text-[9px] text-nxt-text-muted">{fileExtension(att.filename || '')}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-nxt-red/90 text-white flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Remove attachment ${att.filename || 'file'}`}
          >
            <XCircle size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Markdown renderer for assistant messages */
function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`prose prose-sm max-w-none ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-medium text-nxt-text mt-3 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-medium text-nxt-text mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-medium text-nxt-text-secondary mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed text-nxt-text-secondary font-light mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="text-sm text-nxt-text-secondary font-light list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="text-sm text-nxt-text-secondary font-light list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-nxt-text">{children}</strong>,
          em: ({ children }) => <em className="text-nxt-text-secondary italic">{children}</em>,
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return <code className="px-1.5 py-0.5 rounded-[2px] bg-nxt-bg-tertiary text-nxt-teal text-xs font-mono">{children}</code>;
            }
            return <code className={codeClassName}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="rounded-[4px] bg-nxt-bg-tertiary border border-nxt-border p-3 overflow-x-auto text-xs font-mono text-nxt-text-secondary mb-2">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="text-xs border-collapse w-full">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="text-left px-3 py-1.5 border border-nxt-border bg-nxt-bg-tertiary text-nxt-text font-medium">{children}</th>,
          td: ({ children }) => <td className="px-3 py-1.5 border border-nxt-border text-nxt-text-secondary">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-nxt-teal/40 pl-3 text-sm text-nxt-text-muted italic mb-2">{children}</blockquote>
          ),
          hr: () => <hr className="border-nxt-border my-3" />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-nxt-teal hover:text-nxt-lime underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/** Infer MIME type from file extension when browser returns empty or generic type */
function inferMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    md: 'text/markdown', markdown: 'text/markdown',
    txt: 'text/plain', text: 'text/plain',
    csv: 'text/csv',
    html: 'text/html', htm: 'text/html',
    json: 'application/json',
    xml: 'application/xml',
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    yaml: 'text/yaml', yml: 'text/yaml',
    py: 'text/x-python', js: 'text/javascript', ts: 'text/typescript',
    css: 'text/css', sql: 'text/x-sql', sh: 'text/x-shellscript',
    log: 'text/plain', env: 'text/plain', cfg: 'text/plain', ini: 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

function isImageType(mime: string): boolean {
  return IMAGE_TYPES.has(mime) || mime.startsWith('image/');
}

function fileExtension(filename: string): string {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
}

export function AgentChat({ agent, onClose }: AgentChatProps) {
  const sessionId = useMemo(() => generateSessionId(), []);
  const slug = agentSlug(agent);
  const { messages, isConnected, isStreaming, status, sendMessage } = useAgentWebSocket(slug, sessionId);
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [thinkStartTime, setThinkStartTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // When input changes (e.g. from suggested prompt), auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) continue;

      const mime = inferMimeType(file);
      const base64 = await fileToBase64(file);

      newAttachments.push({
        type: isImageType(mime) ? 'image' : 'file',
        media_type: mime,
        data: base64,
        filename: file.name,
        preview: isImageType(mime) ? URL.createObjectURL(file) : undefined,
      });
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    inputRef.current?.focus();
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const att = prev[index];
      if (att.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isStreaming || status === 'waiting') return;
    sendMessage(input.trim(), pendingAttachments.length > 0 ? pendingAttachments : undefined);
    setThinkStartTime(Date.now());
    setInput('');
    setPendingAttachments([]);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  /** Suggested prompt -> fill input instead of sending, so user can attach files */
  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files.length) return;

    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) continue;

      const mime = inferMimeType(file);
      const base64 = await fileToBase64(file);

      newAttachments.push({
        type: isImageType(mime) ? 'image' : 'file',
        media_type: mime,
        data: base64,
        filename: file.name,
        preview: isImageType(mime) ? URL.createObjectURL(file) : undefined,
      });
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    inputRef.current?.focus();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newAttachments: Attachment[] = [];

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const base64 = await fileToBase64(file);
        newAttachments.push({
          type: 'image',
          media_type: file.type,
          data: base64,
          filename: `pasted-image.${file.type.split('/')[1] || 'png'}`,
          preview: URL.createObjectURL(file),
        });
      }
    }

    if (newAttachments.length > 0) {
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const hasInput = input.trim().length > 0 || pendingAttachments.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white fade-in"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${agent.name}`}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[60] bg-nxt-teal/5 border-2 border-dashed border-nxt-teal/40 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-nxt-teal">
            <Image size={48} aria-hidden="true" />
            <p className="text-lg font-medium">Drop files here</p>
            <p className="text-sm font-light text-nxt-text-muted">Images, PDFs, documents, and more</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-nxt-border bg-white shrink-0">
        <div className="w-10 h-10 rounded-[4px] flex items-center justify-center text-xl"
          style={{ background: `rgba(17, 80, 84, 0.08)` }}
          aria-hidden="true"
        >
          {agent.emoji || '\uD83E\uDD16'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-nxt-text truncate">{agent.name}</h2>
            <TierBadge tier={agent.tier} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {isConnected ? (
              <span className="flex items-center gap-1 text-[11px] text-nxt-green font-light">
                <Wifi size={10} aria-hidden="true" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-nxt-red font-light">
                <WifiOff size={10} aria-hidden="true" />
                Disconnected
              </span>
            )}
            {agent.model && (
              <span className="flex items-center gap-1 text-[11px] text-nxt-text-muted font-light">
                <Cpu size={9} aria-hidden="true" />
                {modelDisplayName(agent.model)}
              </span>
            )}
            {agent.supports_vision && (
              <span className="flex items-center gap-1 text-[11px] text-nxt-text-muted font-light">
                <Eye size={9} aria-hidden="true" />
                Vision
              </span>
            )}
            {agent.tools && agent.tools.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-nxt-text-muted font-light">
                <Wrench size={9} aria-hidden="true" />
                {agent.tools.length} tools
              </span>
            )}
            <span className="text-[11px] text-nxt-text-muted font-light">
              {agent.category}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[2px] flex items-center justify-center
                     bg-nxt-bg-tertiary hover:bg-nxt-lime hover:text-nxt-teal border border-nxt-border
                     transition-colors"
          aria-label="Close chat"
        >
          <X size={16} className="text-nxt-text-secondary" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6" role="log" aria-label="Chat messages" aria-live="polite">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl mb-4"
                style={{ background: 'rgba(17, 80, 84, 0.08)' }}
                aria-hidden="true"
              >
                {agent.emoji || '\uD83E\uDD16'}
              </div>
              <h3 className="text-lg font-medium text-nxt-text mb-2">
                Chat with {agent.name}
              </h3>
              <p className="text-sm text-nxt-text-muted max-w-md mb-2 font-light">
                {agent.vibe || agent.description}
              </p>

              {/* Agent capabilities summary */}
              {agent.tools && agent.tools.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6 mt-2">
                  {agent.tools.map((tool) => (
                    <span key={tool} className="px-2 py-0.5 rounded-[2px] text-[10px] bg-nxt-bg-tertiary border border-nxt-border text-nxt-text-muted">
                      {tool}
                    </span>
                  ))}
                  {agent.supports_vision && (
                    <span className="px-2 py-0.5 rounded-[2px] text-[10px] bg-nxt-teal/10 border border-nxt-teal/20 text-nxt-teal">
                      Vision
                    </span>
                  )}
                </div>
              )}

              {/* Suggested prompts */}
              <div className="w-full max-w-lg space-y-2">
                <p className="text-[11px] text-nxt-text-muted uppercase tracking-wider font-bold mb-2">Try a prompt</p>
                {agent.prompts.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="w-full text-left px-4 py-3 rounded-[4px] bg-nxt-bg-secondary border border-nxt-border
                               hover:border-nxt-border-hover hover:bg-nxt-bg-tertiary transition-all
                               text-[13px] text-nxt-text-secondary font-light line-clamp-2"
                    aria-label={`Use suggested prompt: ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}`}
                  >
                    {prompt}
                  </button>
                ))}
                {/* Figma URL hint for design agents */}
                {agent.tools?.includes('Figma') && (
                  <div className="mt-4 p-3 rounded-[4px] bg-nxt-teal/5 border border-nxt-teal/15 w-full max-w-lg">
                    <p className="text-[11px] text-nxt-teal font-bold uppercase tracking-wider mb-1">Figma Integration</p>
                    <p className="text-[11px] text-nxt-text-muted font-light">
                      Paste any Figma URL to inspect components, extract design tokens, and generate matching prototypes.
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-nxt-text-muted mt-3 font-light">
                  Attach images, PDFs, or documents -- paste, drag & drop, or use the <Paperclip size={11} className="inline" aria-hidden="true" /> button
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 w-7 h-7 rounded-[2px] flex items-center justify-center bg-nxt-bg-tertiary border border-nxt-border mt-1" aria-hidden="true">
                  <Bot size={14} className="text-nxt-teal" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-[4px] px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-nxt-teal/8 border border-nxt-teal/15'
                    : 'bg-nxt-bg-secondary border border-nxt-border'
                }`}
              >
                {/* Render attached images for user messages */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <AttachmentGallery attachments={msg.attachments} />
                )}

                {/* Render content */}
                {msg.role === 'assistant' ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-light text-nxt-text">
                    {msg.content}
                  </p>
                )}

                {/* Tool calls */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.toolCalls.map((tool, i) => (
                      <ToolCard key={`${tool.tool}-${i}`} tool={tool} />
                    ))}
                  </div>
                )}

                {/* Prototype previews from generate_prototype tool */}
                {msg.toolCalls && msg.toolCalls.map((tool, i) => {
                  const html = getPrototypeHtml(tool);
                  if (!html) return null;
                  const result = tool.result as Record<string, unknown> | undefined;
                  return (
                    <PrototypePreview
                      key={`proto-${i}`}
                      html={html}
                      filename={result?.filename as string | undefined}
                    />
                  );
                })}
              </div>
              {msg.role === 'user' && (
                <div className="shrink-0 w-7 h-7 rounded-[2px] flex items-center justify-center bg-nxt-lime/15 border border-nxt-lime/20 mt-1" aria-hidden="true">
                  <User size={14} className="text-nxt-teal" />
                </div>
              )}
            </div>
          ))}

          {/* Thinking / streaming / tool indicator */}
          {status !== 'idle' && status !== 'streaming' && messages.length > 0 && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 w-7 h-7 rounded-[2px] flex items-center justify-center bg-nxt-bg-tertiary border border-nxt-border mt-1" aria-hidden="true">
                <Bot size={14} className="text-nxt-teal" />
              </div>
              <div className="bg-nxt-bg-secondary border border-nxt-border rounded-[4px] px-4 py-2">
                <ThinkingIndicator status={status} startTime={thinkStartTime} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-nxt-border bg-white">
        {/* Attachment preview strip */}
        <AttachmentPreview attachments={pendingAttachments} onRemove={removeAttachment} />

        <div className="px-4 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              {/* Attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!isConnected}
                className="shrink-0 w-11 h-11 rounded-[2px] flex items-center justify-center
                           bg-nxt-bg-tertiary hover:bg-nxt-border border border-nxt-border
                           text-nxt-text-muted hover:text-nxt-teal
                           transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Attach files (images, PDFs, documents)"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.csv,.json,.md,.html,.docx,.xlsx,.pptx"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                aria-hidden="true"
              />

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isConnected ? (agent.tools?.includes('Figma') ? 'Type a message, paste a Figma URL, or attach files...' : 'Type a message or paste an image...') : 'Connecting...'}
                  disabled={!isConnected}
                  rows={1}
                  aria-label="Type your message"
                  className="w-full px-4 py-3 rounded-[2px] bg-white border border-nxt-border
                             text-nxt-text placeholder-nxt-text-muted text-sm font-light
                             focus:outline-none focus:ring-2 focus:ring-nxt-teal/20 focus:border-nxt-teal/40
                             transition-all resize-none disabled:opacity-50"
                  style={{ minHeight: '44px', maxHeight: '160px' }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!hasInput || status !== 'idle' || !isConnected}
                className="shrink-0 w-11 h-11 rounded-[2px] flex items-center justify-center
                           bg-nxt-lime hover:bg-nxt-lime-hover text-nxt-teal
                           transition-all disabled:opacity-30 disabled:cursor-not-allowed
                           cursor-pointer"
                aria-label="Send message"
              >
                {status !== 'idle' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <p className="text-[11px] text-nxt-text-muted mt-2 text-center font-light">
              Enter to send -- Shift+Enter for new line -- Paste, drop, or attach files
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility: convert File to base64 string (without the data: prefix)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:image/png;base64," prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
