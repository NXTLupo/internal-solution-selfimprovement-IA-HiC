import { useState, useEffect, useRef } from 'react';
import { DatabasePost } from '../../../types/reddit';
import CommentThread from './CommentThread.tsx';

interface PostCardProps {
  post: DatabasePost;
  showComments?: boolean;
}

function PostCard({ post, showComments = false }: PostCardProps) {
  const [showCommentsState, setShowCommentsState] = useState(showComments);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const postRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setShowCommentsState(showComments);
  }, [showComments]);

  // Check if content is truncated and needs expand button
  useEffect(() => {
    if (contentRef.current && post.content) {
      const element = contentRef.current;
      const isOverflowing = element.scrollHeight > element.clientHeight;
      setShowExpandButton(isOverflowing);
    }
  }, [post.content, isExpanded]);

  useEffect(() => {
    const handleScroll = () => {
      if (!postRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Check if user has scrolled to bottom (within 100px threshold)
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 100;
      
      // Check if this post is currently visible in the viewport
      const rect = postRef.current.getBoundingClientRect();
      const isVisible = rect.top < windowHeight && rect.bottom > 0;
      
      // Auto-expand if near bottom and post is visible
      if (isNearBottom && isVisible && !isExpanded) {
        setIsExpanded(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isExpanded]);

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

  // Count total comments including replies
  const countTotalComments = (comments: typeof post.comments): number => {
    return comments.reduce((total, comment) => {
      return total + 1 + countTotalComments(comment.replies || []);
    }, 0);
  };

  const totalComments = countTotalComments(post.comments || []);

  return (
    <div ref={postRef} className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
      {/* Post Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-[#141414] mb-2 leading-tight">
              {post.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-[#525252]">
              <span>u/{post.author || 'Unknown'}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.created_utc)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            <div className="flex items-center text-sm text-[#525252]">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {formatNumber(post.score)}
            </div>
            <div className="flex items-center text-sm text-[#525252]">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.003 8.003 0 01-7.799-6.778c0-.001 0-.001 0-.002L4 12h.01c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
              {formatNumber(totalComments)}
            </div>
          </div>
        </div>

        {/* Post Content */}
        {post.content && (
          <div className="mb-4">
            <div 
              ref={contentRef}
              className={`text-[#525252] leading-relaxed ${
                !isExpanded 
                  ? 'line-clamp-6 overflow-hidden' 
                  : ''
              }`}
              style={{
                display: !isExpanded ? '-webkit-box' : 'block',
                WebkitLineClamp: !isExpanded ? 6 : 'unset',
                WebkitBoxOrient: 'vertical' as const,
                overflow: !isExpanded ? 'hidden' : 'visible'
              }}
            >
              {post.content}
            </div>
            {showExpandButton && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[#115054] hover:text-[#115054] text-sm mt-2 transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t border-[#e5e5e5]">
          <button
            onClick={() => setShowCommentsState(!showCommentsState)}
            className="flex items-center gap-2 text-[#525252] hover:text-[#141414] transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.003 8.003 0 01-7.799-6.778c0-.001 0-.001 0-.002L4 12h.01c0-4.418 3.582 8-8s8 3.582 8 8z" />
            </svg>
            {showCommentsState ? 'Hide Comments' : `Show Comments (${totalComments})`}
          </button>
          
          {post.permalink && (
            <a
              href={`https://reddit.com${post.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#525252] hover:text-[#141414] transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Reddit
            </a>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showCommentsState && (
        <div className="border-t border-[#e5e5e5] bg-[#fafafa]">
          <div className="p-6">
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[#141414] mb-4">
                  Comments ({totalComments})
                </h3>
                {post.comments.map((comment) => (
                  <CommentThread key={comment.id} comment={comment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#525252]">
                No comments found for this post.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PostCard; 