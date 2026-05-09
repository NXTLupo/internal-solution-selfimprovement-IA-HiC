// ChatAttachmentDropzone.tsx
//
// 2026-05-08 — Shared attachment input for both AI Analyst chat
// (CorpusChatPanel) and Designer chat (DesignDeskChat).
//
// Supports:
//   - Paperclip button (always rendered)
//   - Drag-and-drop overlay (covers parent container when active)
//   - Multi-file selection
//   - Per-file parse via /api/parse-upload (PDF, DOCX, PPTX, TXT, JSON,
//     and image placeholders)
//   - Progress feedback per file
//
// On parse complete, calls onAttachmentsAdded with a ChatAttachment[]
// containing the parsed text and metadata. Parents own the lifecycle
// of the attachments after that (corpus injection, wiki persistence,
// chip rendering, send-time clearing).

import React, { useCallback, useEffect, useRef, useState } from 'react';

const PROXY_BASE = 'http://localhost:5012';
const PARSE_TIMEOUT_MS = 60_000;

export interface ChatAttachment {
    id: string;
    filename: string;
    mimeType: string;
    parsedText: string;
    charCount: number;
    pageCount?: number;
    slideCount?: number;
    isImage?: boolean;
    parseMethod?: string;
    /** Set after the wiki-write side-effect resolves (parent's responsibility). */
    wikiPath?: string;
    /** Raw bytes — preserved for Phase 3 multimodal image upload. */
    bytesLength?: number;
}

interface UploadProgress {
    id: string;
    filename: string;
    status: 'reading' | 'parsing' | 'done' | 'error';
    error?: string;
}

interface Props {
    /** Required: emits parsed attachments back to the parent. */
    onAttachmentsAdded: (attachments: ChatAttachment[]) => void;
    /** Optional: when set, the dropzone overlay covers this element on drag. */
    dropTargetRef?: React.RefObject<HTMLElement>;
    /** Disable the button (e.g. while a chat send is in flight). */
    disabled?: boolean;
    /** Variant: 'button' renders only the paperclip; 'both' adds drag-drop. */
    variant?: 'button' | 'both';
    /** Max attachments per session (defaults to 8). */
    maxFiles?: number;
    /** Max single-file size in MB (defaults to 25). */
    maxFileSizeMb?: number;
    /** Brand accent color override. */
    accentColor?: string;
}

const ACCEPTED_EXTS = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.md,.csv,.json,.xml,.png,.jpg,.jpeg,.gif,.webp,.bmp';

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] ?? '';
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });
}

/** Text-based extensions handled CLIENT-SIDE via FileReader.readAsText.
 *  Avoids the base64 → JSON-body → proxy round-trip that fails on large
 *  files (a multi-MB Reddit JSON dump becomes ~14MB of base64 in a JSON
 *  request body, which trips request-size limits and produces "Failed
 *  to fetch" with no useful diagnostic). 2026-05-08. */
const CLIENT_SIDE_TEXT_EXTS = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log', 'tsv', 'yaml', 'yml']);
const CLIENT_SIDE_TEXT_MIMES = new Set(['application/json', 'application/xml', 'text/csv']);

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        // UTF-8 first; the user's data is overwhelmingly UTF-8.
        reader.readAsText(file, 'utf-8');
    });
}

async function parseUploadedFile(file: File): Promise<ChatAttachment> {
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();

    // Fast path: text-based formats (JSON, TXT, CSV, MD, XML, etc.) read
    // entirely client-side. No proxy round-trip, no base64, no size cap
    // beyond the 25MB the dropzone already enforces.
    if (CLIENT_SIDE_TEXT_EXTS.has(ext) || mime.startsWith('text/') || CLIENT_SIDE_TEXT_MIMES.has(mime)) {
        const text = await readFileAsText(file);
        return {
            id,
            filename: file.name,
            mimeType: file.type || 'text/plain',
            parsedText: text,
            charCount: text.length,
            parseMethod: 'client-text',
            bytesLength: file.size,
        };
    }

    // Binary path: PDF, DOCX, PPTX, images — needs server-side extraction.
    const base64 = await fileToBase64(file);
    const resp = await fetch(`${PROXY_BASE}/api/parse-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: file.name,
            base64,
            mimeType: file.type || 'application/octet-stream',
        }),
        signal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
    });

    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`parse-upload ${resp.status}: ${errText.slice(0, 160)}`);
    }
    const data = await resp.json();

    const parsedText = typeof data.text === 'string' ? data.text : '';
    return {
        id,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        parsedText,
        charCount: parsedText.length,
        pageCount: typeof data.pages === 'number' ? data.pages : undefined,
        slideCount: typeof data.slideCount === 'number' ? data.slideCount : undefined,
        isImage: !!data.isImage,
        parseMethod: typeof data.method === 'string' ? data.method : undefined,
        bytesLength: typeof data.bytes === 'number' ? data.bytes : file.size,
    };
}

const ChatAttachmentDropzone: React.FC<Props> = ({
    onAttachmentsAdded,
    dropTargetRef,
    disabled,
    variant = 'both',
    maxFiles = 8,
    maxFileSizeMb = 25,
    accentColor = '#B8B800',
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<UploadProgress[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const dragDepthRef = useRef(0);

    const handleFiles = useCallback(async (fileList: FileList | File[]) => {
        const files = Array.from(fileList).slice(0, maxFiles);
        if (files.length === 0) return;

        const initialProgress: UploadProgress[] = files.map(f => ({
            id: `prog_${Date.now()}_${f.name}`,
            filename: f.name,
            status: 'reading',
        }));
        setProgress(prev => [...prev, ...initialProgress]);

        const results: ChatAttachment[] = [];
        await Promise.all(files.map(async (file, idx) => {
            const progId = initialProgress[idx].id;
            try {
                if (file.size > maxFileSizeMb * 1024 * 1024) {
                    throw new Error(`File exceeds ${maxFileSizeMb}MB limit`);
                }
                setProgress(prev => prev.map(p => p.id === progId ? { ...p, status: 'parsing' } : p));
                const att = await parseUploadedFile(file);
                results.push(att);
                setProgress(prev => prev.map(p => p.id === progId ? { ...p, status: 'done' } : p));
            } catch (e: any) {
                console.warn(`[ChatAttachmentDropzone] Failed to parse ${file.name}:`, e);
                setProgress(prev => prev.map(p => p.id === progId ? { ...p, status: 'error', error: e?.message || String(e) } : p));
            }
        }));

        if (results.length > 0) {
            onAttachmentsAdded(results);
        }

        // Auto-clear successful progress entries after 1.5s; keep errors visible
        setTimeout(() => {
            setProgress(prev => prev.filter(p => p.status === 'error'));
        }, 1500);
    }, [maxFiles, maxFileSizeMb, onAttachmentsAdded]);

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
        // Reset so the same file can be re-picked
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const openPicker = () => {
        if (disabled) return;
        fileInputRef.current?.click();
    };

    // Drag-drop wiring on the supplied target element. Uses a counter so
    // dragenter/dragleave on child elements doesn't flicker the overlay.
    useEffect(() => {
        if (variant !== 'both') return;
        const target = dropTargetRef?.current ?? null;
        if (!target) return;

        const onDragEnter = (e: DragEvent) => {
            if (!e.dataTransfer?.types?.includes('Files')) return;
            e.preventDefault();
            dragDepthRef.current += 1;
            setDragOver(true);
        };
        const onDragLeave = (e: DragEvent) => {
            e.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setDragOver(false);
        };
        const onDragOver = (e: DragEvent) => {
            if (!e.dataTransfer?.types?.includes('Files')) return;
            e.preventDefault();
        };
        const onDrop = (e: DragEvent) => {
            e.preventDefault();
            dragDepthRef.current = 0;
            setDragOver(false);
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) handleFiles(files);
        };

        target.addEventListener('dragenter', onDragEnter);
        target.addEventListener('dragleave', onDragLeave);
        target.addEventListener('dragover', onDragOver);
        target.addEventListener('drop', onDrop);
        return () => {
            target.removeEventListener('dragenter', onDragEnter);
            target.removeEventListener('dragleave', onDragLeave);
            target.removeEventListener('dragover', onDragOver);
            target.removeEventListener('drop', onDrop);
        };
    }, [dropTargetRef, variant, handleFiles]);

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_EXTS}
                style={{ display: 'none' }}
                onChange={handlePickerChange}
            />
            <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                title="Attach files (PDF, DOCX, PPTX, TXT, JSON, images)"
                aria-label="Attach files"
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: 6,
                    color: disabled ? '#888' : accentColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                {/* Paperclip icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
            </button>

            {/* Drag-drop overlay — only visible while a drag is in progress */}
            {variant === 'both' && dragOver && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(13, 13, 13, 0.85)',
                        border: `3px dashed ${accentColor}`,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        color: accentColor,
                        fontFamily: "'Bebas Neue', sans-serif",
                    }}
                >
                    <div style={{ fontSize: 36, letterSpacing: 4, marginBottom: 8 }}>DROP TO ATTACH</div>
                    <div style={{ fontSize: 12, color: '#FFFFFF', letterSpacing: 1.5, fontFamily: 'Archivo, sans-serif', fontWeight: 400 }}>
                        PDF, DOCX, PPTX, TXT, JSON, IMAGES
                    </div>
                </div>
            )}

            {/* Inline progress strip — only visible while uploads are pending */}
            {progress.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 60,
                        left: 12,
                        right: 12,
                        zIndex: 50,
                        background: 'rgba(13, 13, 13, 0.92)',
                        border: `1px solid ${accentColor}`,
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#FFFFFF',
                    }}
                >
                    {progress.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.filename}</span>
                            <span style={{
                                color: p.status === 'error' ? '#CC6644'
                                    : p.status === 'done' ? accentColor
                                    : '#00B7C3',
                                fontWeight: 700,
                                letterSpacing: 1,
                            }}>
                                {p.status === 'reading' ? 'READING'
                                    : p.status === 'parsing' ? 'PARSING'
                                    : p.status === 'done' ? 'DONE'
                                    : `ERROR: ${p.error?.slice(0, 60) || 'failed'}`}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default ChatAttachmentDropzone;
