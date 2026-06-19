import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, ToolExecution, Attachment } from '../types';

type AgentStatus = 'idle' | 'waiting' | 'streaming' | 'tool_running';

interface UseAgentWebSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isStreaming: boolean;
  status: AgentStatus;
  sendMessage: (text: string, attachments?: Attachment[]) => void;
}

export function useAgentWebSocket(slug: string, sessionId: string): UseAgentWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const currentAssistantRef = useRef<string | null>(null);
  const currentToolsRef = useRef<ToolExecution[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://localhost:8201/api/agents/ws/${slug}/${sessionId}`);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsStreaming(false);
      setStatus('idle');
      // Attempt reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'text_delta': {
            setIsStreaming(true);
            setStatus('streaming');
            if (currentAssistantRef.current === null) {
              // Start new assistant message
              const msgId = `assistant-${Date.now()}`;
              currentAssistantRef.current = msgId;
              currentToolsRef.current = [];
              setMessages((prev) => [
                ...prev,
                {
                  id: msgId,
                  role: 'assistant',
                  content: data.content || '',
                  timestamp: new Date(),
                  toolCalls: [],
                },
              ]);
            } else {
              // Append to existing assistant message
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === currentAssistantRef.current
                    ? { ...msg, content: msg.content + (data.content || '') }
                    : msg
                )
              );
            }
            break;
          }

          case 'tool_start': {
            setIsStreaming(true);
            setStatus('tool_running');
            const toolExec: ToolExecution = {
              tool: data.tool || data.name || 'unknown',
              params: data.params || data.input || {},
              status: 'running',
            };
            currentToolsRef.current = [...currentToolsRef.current, toolExec];

            if (currentAssistantRef.current === null) {
              const msgId = `assistant-${Date.now()}`;
              currentAssistantRef.current = msgId;
              currentToolsRef.current = [toolExec];
              setMessages((prev) => [
                ...prev,
                {
                  id: msgId,
                  role: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  toolCalls: [toolExec],
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === currentAssistantRef.current
                    ? { ...msg, toolCalls: [...currentToolsRef.current] }
                    : msg
                )
              );
            }
            break;
          }

          case 'tool_result': {
            const toolName = data.tool || data.name || 'unknown';
            currentToolsRef.current = currentToolsRef.current.map((t) =>
              t.tool === toolName && t.status === 'running'
                ? {
                    ...t,
                    result: data.result || data.output,
                    error: data.error,
                    status: data.error ? 'error' : 'completed',
                  }
                : t
            );

            if (currentAssistantRef.current) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === currentAssistantRef.current
                    ? { ...msg, toolCalls: [...currentToolsRef.current] }
                    : msg
                )
              );
            }
            break;
          }

          case 'thinking': {
            setStatus('waiting');
            break;
          }

          case 'done': {
            setIsStreaming(false);
            setStatus('idle');
            currentAssistantRef.current = null;
            currentToolsRef.current = [];
            break;
          }

          case 'error': {
            setIsStreaming(false);
            setStatus('idle');
            const errorText = data.message || data.error || 'Unknown error';
            if (currentAssistantRef.current) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === currentAssistantRef.current
                    ? { ...msg, content: msg.content + `\n\n**Error:** ${errorText}` }
                    : msg
                )
              );
            } else {
              // No assistant message yet — create one to show the error
              const msgId = `assistant-${Date.now()}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: msgId,
                  role: 'assistant',
                  content: `**Error:** ${errorText}`,
                  timestamp: new Date(),
                  toolCalls: [],
                },
              ]);
            }
            currentAssistantRef.current = null;
            currentToolsRef.current = [];
            break;
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    wsRef.current = ws;
  }, [slug, sessionId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (text: string, attachments?: Attachment[]) => {
      if (!text.trim() && (!attachments || attachments.length === 0)) return;

      // Add user message with attachments for local display
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
        attachments: attachments,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Build WebSocket payload
      const payload: Record<string, unknown> = { message: text };
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments.map((a) => ({
          type: a.type,
          media_type: a.media_type,
          data: a.data,
          filename: a.filename,
        }));
      }

      // Send via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        setStatus('waiting');
      }
    },
    []
  );

  return { messages, isConnected, isStreaming, status, sendMessage };
}
