import React, { useState } from 'react';

export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  stage: 'data_ingestion' | 'pattern_detection' | 'persona_synthesis' | 'evidence_mapping' | 'final_output';
  status: 'pending' | 'active' | 'awaiting_approval' | 'approved' | 'revised' | 'skipped';
  data?: any;
  feedback?: string;
  timestamp?: number;
  requiredActions?: string[];
}

interface CheckpointManagerProps {
  checkpoints: Checkpoint[];
  onApprove: (checkpointId: string, feedback?: string) => void;
  onRevise: (checkpointId: string, feedback: string, data?: any) => void;
  onSkip: (checkpointId: string) => void;
  onRollback: (checkpointId: string) => void;
  isProcessing: boolean;
}

const STAGE_ICONS = {
  data_ingestion: '📥',
  pattern_detection: '🔍',
  persona_synthesis: '👥',
  evidence_mapping: '📌',
  final_output: '✅'
};

const STATUS_COLORS = {
  pending: 'bg-[#fafafa] text-[#acacac]',
  active: 'bg-blue-600/20 text-blue-400 animate-pulse',
  awaiting_approval: 'bg-yellow-600/20 text-yellow-400',
  approved: 'bg-green-600/20 text-green-400',
  revised: 'bg-orange-600/20 text-orange-400',
  skipped: 'bg-[#fafafa] text-[#acacac]'
};

export const CheckpointManager: React.FC<CheckpointManagerProps> = ({
  checkpoints,
  onApprove,
  onRevise,
  onSkip,
  onRollback,
  isProcessing
}) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);

  const getStatusIcon = (status: Checkpoint['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth="2" />
          </svg>
        );
      case 'active':
        return (
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'awaiting_approval':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'approved':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'revised':
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'skipped':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const handleApprove = (checkpoint: Checkpoint) => {
    onApprove(checkpoint.id, feedback);
    setFeedback('');
    setSelectedCheckpoint(null);
  };

  const handleRevise = (checkpoint: Checkpoint) => {
    if (feedback.trim()) {
      onRevise(checkpoint.id, feedback);
      setFeedback('');
      setShowRevisionDialog(false);
      setSelectedCheckpoint(null);
    }
  };

  const currentCheckpoint = checkpoints.find(c => c.status === 'awaiting_approval');

  return (
    <div className="bg-white rounded-lg border border-[#e5e5e5]">
      <div className="p-4 border-b border-[#e5e5e5]">
        <h3 className="text-lg font-semibold text-[#141414] flex items-center gap-2">
          <svg className="w-5 h-5 text-[#115054]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Analysis Checkpoints
        </h3>
        {isProcessing && (
          <p className="text-sm text-[#525252] mt-1">
            Analysis in progress - you can intervene at any checkpoint
          </p>
        )}
      </div>

      <div className="p-4">
        {/* Progress Bar */}
        <div className="relative mb-6">
          <div className="absolute top-5 left-0 right-0 h-1 bg-[#e5e5e5]">
            <div 
              className="h-full bg-[#caca20] transition-all duration-500"
              style={{
                width: `${(checkpoints.filter(c => 
                  ['approved', 'revised', 'skipped'].includes(c.status)
                ).length / checkpoints.length) * 100}%`
              }}
            />
          </div>
          
          <div className="relative flex justify-between">
            {checkpoints.map((checkpoint, index) => (
              <div
                key={checkpoint.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => setSelectedCheckpoint(checkpoint.id)}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${checkpoint.status === 'active' ? 'ring-4 ring-blue-200' : ''}
                  ${checkpoint.status === 'awaiting_approval' ? 'ring-4 ring-yellow-200' : ''}
                  ${STATUS_COLORS[checkpoint.status]}
                `}>
                  <span className="text-lg">{STAGE_ICONS[checkpoint.stage]}</span>
                </div>
                <span className="text-xs mt-2 text-center max-w-[80px]">
                  {checkpoint.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Checkpoint Details */}
        {currentCheckpoint && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  {getStatusIcon(currentCheckpoint.status)}
                  {currentCheckpoint.name}
                </h4>
                <p className="text-sm text-[#525252] mt-1">
                  {currentCheckpoint.description}
                </p>
              </div>
            </div>

            {currentCheckpoint.requiredActions && (
              <div className="mb-3">
                <h5 className="text-sm font-medium mb-1">Required Actions:</h5>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {currentCheckpoint.requiredActions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentCheckpoint.data && (
              <div className="mb-3 p-3 bg-white rounded border border-yellow-100">
                <h5 className="text-sm font-medium mb-2">Preview:</h5>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(currentCheckpoint.data, null, 2).slice(0, 500)}
                  {JSON.stringify(currentCheckpoint.data).length > 500 && '...'}
                </pre>
              </div>
            )}

            <div className="space-y-2">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add feedback or instructions (optional)"
                className="w-full px-3 py-2 text-sm border rounded-md"
                rows={3}
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(currentCheckpoint)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve & Continue
                </button>
                <button
                  onClick={() => setShowRevisionDialog(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => onSkip(currentCheckpoint.id)}
                  className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                >
                  Skip Checkpoint
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Checkpoint Details */}
        {selectedCheckpoint && selectedCheckpoint !== currentCheckpoint?.id && (
          <div className="bg-gray-50 border rounded-lg p-4">
            {(() => {
              const checkpoint = checkpoints.find(c => c.id === selectedCheckpoint);
              if (!checkpoint) return null;
              
              return (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {getStatusIcon(checkpoint.status)}
                        {checkpoint.name}
                      </h4>
                      <p className="text-sm text-[#525252] mt-1">
                        {checkpoint.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCheckpoint(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  {checkpoint.feedback && (
                    <div className="mb-3 p-3 bg-white rounded">
                      <h5 className="text-sm font-medium mb-1">Feedback:</h5>
                      <p className="text-sm text-gray-600">{checkpoint.feedback}</p>
                    </div>
                  )}

                  {checkpoint.timestamp && (
                    <p className="text-xs text-gray-500">
                      Processed at {new Date(checkpoint.timestamp).toLocaleString()}
                    </p>
                  )}

                  {['approved', 'revised'].includes(checkpoint.status) && (
                    <button
                      onClick={() => onRollback(checkpoint.id)}
                      className="mt-3 px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Rollback to this checkpoint
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Revision Dialog */}
        {showRevisionDialog && currentCheckpoint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-3">Request Revision</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide specific instructions for what needs to be revised at this checkpoint.
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe what needs to be changed..."
                className="w-full px-3 py-2 border rounded-md mb-4"
                rows={5}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleRevise(currentCheckpoint)}
                  disabled={!feedback.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  Submit Revision Request
                </button>
                <button
                  onClick={() => {
                    setShowRevisionDialog(false);
                    setFeedback('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkpoint History */}
      <div className="p-4 border-t bg-gray-50">
        <h4 className="text-sm font-medium mb-2">Checkpoint History</h4>
        <div className="space-y-1">
          {checkpoints
            .filter(c => c.timestamp)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 3)
            .map(checkpoint => (
              <div key={checkpoint.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  {getStatusIcon(checkpoint.status)}
                  {checkpoint.name}
                </span>
                <span className="text-gray-500">
                  {new Date(checkpoint.timestamp!).toLocaleTimeString()}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};