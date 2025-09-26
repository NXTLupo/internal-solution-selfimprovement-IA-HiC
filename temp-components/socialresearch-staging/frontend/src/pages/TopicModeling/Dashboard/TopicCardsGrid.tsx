import React from 'react';
import { MessageSquare, TrendingUp, ThumbsUp, ThumbsDown, Tag } from 'lucide-react';
import { useAppDispatch } from '../../../store/hooks';
import { setSelectedTopic } from '../../../store/topicSlice';
import { Topic } from '../../../types/TopicModeling';

interface TopicCardProps {
  topic: Topic;
  onClick: (topic: Topic) => void;
}

interface TopicCardsGridProps {
  topics: Topic[];
}

/**
 * Individual Topic Card component that displays a single topic with its metadata
 */
const TopicCard: React.FC<TopicCardProps> = ({ topic, onClick }) => {
  // Determine styling based on sentiment
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'border-green-500 bg-gradient-to-r from-green-900/20 to-green-700/10';
      case 'negative':
        return 'border-red-500 bg-gradient-to-r from-red-900/50 to-red-700/30';
      default:
        return 'border-blue-500 bg-gradient-to-r from-blue-900/20 to-blue-700/10';
    }
  };

  // Create sentiment badge with appropriate icon
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/40 text-green-400">
            <ThumbsUp className="w-3 h-3 mr-1" />
            Positive
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/40 text-red-400">
            <ThumbsDown className="w-3 h-3 mr-1" />
            Negative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/40 text-blue-400">
            <Tag className="w-3 h-3 mr-1" />
            Neutral
          </span>
        );
    }
  };

  return (
    <div 
      className={`border-l-4 rounded-lg p-4 shadow hover:shadow-lg transition-all cursor-pointer relative overflow-hidden ${getSentimentColor(topic.sentiment)}`}
      onClick={() => onClick(topic)}
    >
      <div className={` inset-0 rounded-lg${
        topic.sentiment === 'negative' ? 'bg-gradient-to-r from-red-900/50 to-red-700/30' : ''
      }`}></div>
      
      <div className="relative">
        <div className="text-sm mb-3">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-white">{topic.short_summary}</h3>
            {getSentimentBadge(topic.sentiment)}
          </div>
          <div className="flex items-center mt-1">
            <MessageSquare className="w-4 h-4 mr-1 text-gray-400" />
            <span className="text-gray-400">{topic.count} mentions</span>
            
            <span className="mx-2 text-gray-400">•</span>
            
            <span className="font-medium text-gray-300">
              Score: {topic.score.toFixed(2)}
            </span>
          </div>
          
          {topic.one_sentence_summary || topic.short_summary || topic.topic && (
            <div className="mt-2 text-gray-300">
              {topic.one_sentence_summary || topic.short_summary || topic.topic}
            </div>
          )}
        </div>
        
        {/* Support both naming conventions for backward compatibility */}
        {(topic.relatedTerms || topic.related_terms) && (
          (topic.relatedTerms && topic.relatedTerms.length > 0) || 
          (topic.related_terms && topic.related_terms.length > 0)
        ) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(topic.relatedTerms || topic.related_terms || []).slice(0, 3).map((term, i) => (
              <span 
                key={i} 
                className="inline-block px-2 py-1 text-xs rounded-md bg-gray-800 text-gray-300"
              >
                {term}
              </span>
            ))}
            {((topic.relatedTerms && topic.relatedTerms.length > 3) || 
              (topic.related_terms && topic.related_terms.length > 3)) && (
              <span className="inline-block px-2 py-1 text-xs rounded-md bg-gray-800 text-gray-300">
                +{Math.max(
                  (topic.relatedTerms ? topic.relatedTerms.length : 0), 
                  (topic.related_terms ? topic.related_terms.length : 0)
                ) - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Grid of topic cards grouped by sentiment
 */
const TopicCardsGrid: React.FC<TopicCardsGridProps> = ({ topics = [] }) => {
  const dispatch = useAppDispatch();
  
  // Handle topic selection by dispatching to Redux
  const handleTopicSelect = (topic: Topic) => {
    dispatch(setSelectedTopic(topic));
  };

  const groupedTopics = {
    positive: topics.filter(t => t.sentiment === 'positive'),
    neutral: topics.filter(t => t.sentiment === 'neutral'),
    negative: topics.filter(t => t.sentiment === 'negative')
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
        Topic Analysis
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positive Topics */}
        <div>
          <div className="flex items-center mb-3">
            <ThumbsUp className="w-4 h-4 text-green-500 mr-2" />
            <h3 className="text-lg font-medium text-green-400">Positive Topics</h3>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-900/40 text-green-400">
              {groupedTopics.positive.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {groupedTopics.positive.map((topic, index) => (
              <TopicCard key={`positive-${index}`} topic={topic} onClick={handleTopicSelect} />
            ))}
            {groupedTopics.positive.length === 0 && (
              <div className="text-center py-6 bg-gray-800/50 rounded-lg border border-gray-700 text-gray-400">
                No positive topics found
              </div>
            )}
          </div>
        </div>
        
        {/* Neutral Topics */}
        <div>
          <div className="flex items-center mb-3">
            <Tag className="w-4 h-4 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium text-blue-400">Neutral Topics</h3>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-900/40 text-blue-400">
              {groupedTopics.neutral.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {groupedTopics.neutral.map((topic, index) => (
              <TopicCard key={`neutral-${index}`} topic={topic} onClick={handleTopicSelect} />
            ))}
            {groupedTopics.neutral.length === 0 && (
              <div className="text-center py-6 bg-gray-800/50 rounded-lg border border-gray-700 text-gray-400">
                No neutral topics found
              </div>
            )}
          </div>
        </div>
        
        {/* Negative Topics */}
        <div>
          <div className="flex items-center mb-3">
            <ThumbsDown className="w-4 h-4 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-400">Negative Topics</h3>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-900/40 text-red-400">
              {groupedTopics.negative.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {groupedTopics.negative.map((topic, index) => (
              <TopicCard key={`negative-${index}`} topic={topic} onClick={handleTopicSelect} />
            ))}
            {groupedTopics.negative.length === 0 && (
              <div className="text-center py-6 bg-gray-800/50 rounded-lg border border-gray-700 text-gray-400">
                No negative topics found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicCardsGrid; 