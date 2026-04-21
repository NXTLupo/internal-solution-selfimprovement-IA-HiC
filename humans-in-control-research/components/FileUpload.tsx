
import React, { useRef, useState } from 'react';
import mammoth from 'mammoth';
import { FileUpload as FileUploadType } from '../types';

/**
 * Background pass that POSTs every uploaded file to /api/parse-upload and
 * re-invokes onFilesSelected with the resulting text attached as
 * `parsedText`. Provider-agnostic: once this completes, chat (Claude /
 * OpenAI / Gemini) all see the uploaded PDF/DOCX/etc. body as plain text
 * via ChatContext.uploadedFileContents. Wiki archive and corpus ingestion
 * pick it up the same way.
 */
async function parseFilesInBackground(
    files: FileUploadType[],
    onFilesSelected: (files: FileUploadType[]) => void,
): Promise<void> {
    const PROXY = 'http://localhost:5012';
    const results = await Promise.all(files.map(async (f) => {
        // Skip re-parsing text files the FileReader already decoded into
        // UTF-8-safe base64 (they decode losslessly in the chat callback).
        const ext = (f.name.split('.').pop() || '').toLowerCase();
        const isAlreadyText = ext === 'txt' || ext === 'md' || ext === 'json' || ext === 'csv' || f.type === 'text/plain';
        if (isAlreadyText) return f;
        try {
            const resp = await fetch(`${PROXY}/api/parse-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: f.name, base64: f.data, mimeType: f.type }),
                signal: AbortSignal.timeout(45_000),
            });
            if (!resp.ok) return f;
            const data = await resp.json();
            if (data.text && typeof data.text === 'string' && data.text.length >= 40) {
                console.log(`[FileUpload] Parsed ${f.name} → ${data.text.length} chars via ${data.method} (${data.pages ? data.pages + ' pages' : ''})`);
                return {
                    ...f,
                    parsedText: data.text,
                    parsedPages: data.pages,
                    parseMethod: data.method,
                } as FileUploadType;
            }
        } catch (e) {
            console.warn(`[FileUpload] Parse failed for ${f.name}:`, e);
        }
        return f;
    }));
    // Push the enriched array back to the parent so downstream callers
    // (chat context, wiki archive, corpus ingestion) see parsedText.
    onFilesSelected(results);
}

interface Props {
  onFilesSelected: (files: FileUploadType[]) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<Props> = ({ onFilesSelected, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const processedFiles: FileUploadType[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();

      // DOCX files: convert to plaintext using mammoth before upload
      // This ensures the AI can read the full content, not garbled binary
      if (ext === 'docx' || ext === 'doc') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const textContent = result.value;
          if (textContent && textContent.trim().length > 50) {
            const base64Text = btoa(unescape(encodeURIComponent(
              `[CONVERTED FROM ${file.name}]\n\n${textContent}`
            )));
            processedFiles.push({
              name: file.name.replace(/\.docx?$/i, '.txt'),
              type: 'text/plain',
              size: textContent.length,
              data: base64Text
            });
            continue;
          }
        } catch (e) {
          console.warn(`Mammoth DOCX extraction failed for ${file.name}, falling back to binary:`, e);
        }
      }

      // All other files (PDF, TXT, JSON, CSV, etc.): standard Base64 encoding
      const reader = new FileReader();

      const promise = new Promise<void>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) {
            const base64Data = (e.target.result as string).split(',')[1];
            processedFiles.push({
              name: file.name,
              type: file.type || 'text/plain',
              size: file.size,
              data: base64Data
            });
            resolve();
          }
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(file);
      await promise;
    }

    // Auto-parse every file to text via the proxy so every downstream
    // surface (chat regardless of provider, wiki archive, slide
    // generation, corpus ingestion) can read the body without provider-
    // specific multimodal hacks. Non-blocking UX: files are handed off
    // to the parent immediately with parsedText undefined, then a
    // post-parse pass updates each entry when the proxy responds.
    onFilesSelected(processedFiles);
    parseFilesInBackground(processedFiles, onFilesSelected).catch(() => {});
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div 
        className={`relative flex flex-col items-center justify-center w-full h-64 border rounded transition-all duration-300 ease-in-out cursor-pointer overflow-hidden backdrop-blur-md shadow-sm
          ${dragActive ? 'border-[var(--nxt-lime)] bg-indigo-500/10' : 'border-[var(--border-primary)] bg-[var(--card-bg)] hover:border-[var(--nxt-lime)] hover:bg-[var(--bg-secondary)]'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.json,.md,.csv,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        
        <div className="z-10 flex flex-col items-center text-center p-6">
          <div className={`p-4 rounded-full mb-4 shadow-none transition-colors ${dragActive ? 'bg-[var(--nxt-lime)] text-white' : 'bg-[var(--bg-tertiary)]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${dragActive ? 'text-white' : 'text-[var(--nxt-teal)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="mb-2 text-lg font-bold text-[var(--text-primary)]">
            {isLoading ? "Processing files..." : "Upload Research Data"}
          </p>
          <p className="text-sm text-[var(--text-tertiary)] max-w-sm">
            Drag & drop PDF, TXT, JSON, DOC or CSV files here.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-tertiary)] uppercase tracking-wide">.PDF</span>
            <span className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-tertiary)] uppercase tracking-wide">.TXT</span>
            <span className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-tertiary)] uppercase tracking-wide">.JSON</span>
            <span className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-xs text-[var(--text-tertiary)] uppercase tracking-wide">.DOCX</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
