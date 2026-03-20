import React, { useRef, useState } from 'react';
import { FileUpload as FileUploadType } from '../types';

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
      const reader = new FileReader();

      const promise = new Promise<void>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) {
            const base64Data = (e.target.result as string).split(',')[1];
            processedFiles.push({
              name: file.name,
              type: file.type || 'text/plain', // Default to text if unknown
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

    onFilesSelected(processedFiles);
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
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden
          ${dragActive ? 'border-[#caca20] bg-[#caca20]/10' : 'border-[#e5e5e5] bg-[#fafafa]/50 hover:border-[#d4d4d4] hover:bg-[#fafafa]'}
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
          accept=".pdf,.txt,.json,.md,.csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        
        <div className="z-10 flex flex-col items-center text-center p-6">
          <div className="p-4 bg-[#f5f5f5] rounded-full mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#115054]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="mb-2 text-lg font-medium text-[#141414]">
            {isLoading ? "Processing files..." : "Upload Research Data"}
          </p>
          <p className="text-sm text-[#525252] max-w-sm">
            Drag & drop PDF, TXT, or JSON files here, or click to browse.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="px-2 py-1 bg-[#f5f5f5]/50 rounded text-xs text-[#525252]">.PDF</span>
            <span className="px-2 py-1 bg-[#f5f5f5]/50 rounded text-xs text-[#525252]">.TXT</span>
            <span className="px-2 py-1 bg-[#f5f5f5]/50 rounded text-xs text-[#525252]">.JSON</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
