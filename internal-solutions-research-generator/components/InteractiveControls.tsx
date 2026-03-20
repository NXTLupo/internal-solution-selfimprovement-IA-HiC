import React, { useState } from 'react';

interface Checkpoint {
  id: string;
  name: string;
  description: string;
  stage: string;
  status: string;
}

interface InteractiveControlsProps {
  checkpoint?: Checkpoint;
  onApprove: (feedback?: string) => void;
  onRevise: (feedback: string) => void;
}

export const InteractiveControls: React.FC<InteractiveControlsProps> = ({
  checkpoint,
  onApprove,
  onRevise
}) => {
  const [feedback, setFeedback] = useState('');
  const [showRevision, setShowRevision] = useState(false);

  if (!checkpoint) {
    return (
      <div className="text-center text-xs text-[#acacac] py-4">
        Analysis proceeding...
      </div>
    );
  }

  const handleApprove = () => {
    onApprove(feedback || undefined);
    setFeedback('');
  };

  const handleRevise = () => {
    if (feedback.trim()) {
      onRevise(feedback);
      setFeedback('');
      setShowRevision(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Checkpoint Info */}
      <div className="text-center">
        <h4 className="text-sm font-medium text-yellow-400 mb-1">{checkpoint.name}</h4>
        <p className="text-xs text-[#525252]">{checkpoint.description}</p>
      </div>

      {/* Quick Actions */}
      {!showRevision ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            className="flex-1 px-3 py-2 text-xs bg-green-600/20 text-green-400 border border-green-500/50 rounded-md hover:bg-green-600/30 transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setShowRevision(true)}
            className="flex-1 px-3 py-2 text-xs bg-[#fd8e2e]/20 text-[#fd8e2e] border border-[#fd8e2e]/50 rounded-md hover:bg-[#fd8e2e]/30 transition-colors"
          >
            ✎ Revise
          </button>
        </div>
      ) : (
        /* Revision Interface */
        <div className="space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should the AI focus on or change?"
            className="w-full px-3 py-2 text-xs bg-[#fafafa] border border-[#e5e5e5] rounded-md text-[#525252] placeholder-[#acacac] resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleRevise}
              disabled={!feedback.trim()}
              className="flex-1 px-3 py-2 text-xs bg-[#fd8e2e]/20 text-[#fd8e2e] border border-[#fd8e2e]/50 rounded-md hover:bg-[#fd8e2e]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Instructions
            </button>
            <button
              onClick={() => {
                setShowRevision(false);
                setFeedback('');
              }}
              className="px-3 py-2 text-xs bg-[#f5f5f5] text-[#525252] border border-[#e5e5e5] rounded-md hover:bg-[#e5e5e5] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Optional Feedback */}
      {!showRevision && (
        <div className="text-center">
          <button
            onClick={handleApprove}
            className="text-[10px] text-[#acacac] hover:text-[#525252] transition-colors"
          >
            Continue without feedback →
          </button>
        </div>
      )}
    </div>
  );
};