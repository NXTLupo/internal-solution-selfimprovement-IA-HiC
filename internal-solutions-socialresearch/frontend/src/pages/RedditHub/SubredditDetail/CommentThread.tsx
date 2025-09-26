import { useState } from 'react';
import { DatabaseComment } from '../../../types/reddit';

interface CommentThreadProps {
  comment: DatabaseComment;
  depth?: number;
}

function CommentThread({ comment, depth = 0 }: CommentThreadProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const truncateContent = (content: string | null, maxLength: number = 200) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Count total replies recursively
  const countReplies = (replies: DatabaseComment[]): number => {
    return replies.reduce((total, reply) => {
      return total + 1 + countReplies(reply.replies || []);
    }, 0);
  };

  const totalReplies = countReplies(comment.replies || []);
  const maxDepth = 6; // Limit nesting depth for readability
  const shouldShowReplies = depth < maxDepth;

  // Color coding for different depths
  const getBorderColor = (depth: number) => {
    const colors = [
      'border-l-blue-500',
      'border-l-green-500', 
      'border-l-yellow-500',
      'border-l-red-500',
      'border-l-purple-500',
      'border-l-pink-500',
      'border-l-gray-500'
    ];
    return colors[Math.min(depth, colors.length - 1)];
  };

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)} pl-4 border-l-2 ${getBorderColor(depth)}` : '';

  return (
    <div className={`${indentClass} ${depth > 0 ? 'mt-3' : ''}`}>
      <div className="bg-gray-700 rounded-lg p-4">
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg 
                className={`w-3 h-3 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="font-medium">u/{comment.author || 'Unknown'}</span>
            <span>•</span>
            <span>{formatTimeAgo(comment.created_utc)}</span>
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {formatNumber(comment.score)}
            </div>
            {totalReplies > 0 && (
              <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        </div>

        {/* Comment Content */}
        {!isCollapsed && comment.body && (
          <div className="mb-3">
            <div className="text-gray-300 text-sm leading-relaxed">
              {isExpanded ? comment.body : truncateContent(comment.body)}
            </div>
            {comment.body.length > 200 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-400 hover:text-blue-300 text-xs mt-1 transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Collapsed indicator */}
        {isCollapsed && totalReplies > 0 && (
          <div className="text-xs text-gray-500">
            [{totalReplies + 1} comment{totalReplies > 0 ? 's' : ''} collapsed]
          </div>
        )}
      </div>

      {/* Replies */}
      {!isCollapsed && shouldShowReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentThread 
              key={reply.id} 
              comment={reply} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}

      {/* Max depth indicator */}
      {!isCollapsed && !shouldShowReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 ml-4">
          <div className="text-xs text-gray-500 bg-gray-800 rounded px-3 py-2 border border-gray-600">
            <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {totalReplies} more {totalReplies === 1 ? 'reply' : 'replies'} (max depth reached)
          </div>
        </div>
      )}
    </div>
  );
}

export default CommentThread; 