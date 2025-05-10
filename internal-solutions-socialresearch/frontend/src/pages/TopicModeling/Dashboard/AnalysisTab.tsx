import React from 'react';
import { Topic, TopicData } from '../../../types/TopicModeling';
import TopicCardsGrid from './TopicCardsGrid';

interface AnalysisTabProps {
  topicData: TopicData;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ topicData }) => {
  // Convert the API topic data into the format expected by the TopicCardsGrid component
  const formatTopicsForGrid = (): Topic[] => {
    const formattedTopics: Topic[] = [];
    
    // Format positive topics
    if (topicData.topics.positive && topicData.topics.positive.topics) {
      topicData.topics.positive.topics.forEach(topic => {
        formattedTopics.push({
          id: topic.id,
          topic: topic.terms?.[0]?.term || `Topic ${topic.id}`,
          count: topic.count,
          score: topic.score,
          sentiment: 'positive',
          relatedTerms: (topic.terms || []).slice(0, 7).map(t => t.term),
          related_terms: (topic.terms || []).slice(0, 7).map(t => t.term),
          description: typeof topic.summary === 'string' ? topic.summary : (topic.summary?.summary || ''),
          short_summary: topic.short_summary || '',
          one_sentence_summary: topic.one_sentence_summary || '',
          terms: topic.terms || [],
          post_ids: topic.post_ids || [],
          post_sentiments: topic.post_sentiments || {},
          sentiment_evidence: topic.sentiment_evidence || {},
          engagement: topic.engagement
        });
      });
    }
    
    // Format neutral topics
    if (topicData.topics.neutral && topicData.topics.neutral.topics) {
      topicData.topics.neutral.topics.forEach(topic => {
        formattedTopics.push({
          id: topic.id,
          topic: topic.terms?.[0]?.term || `Topic ${topic.id}`,
          count: topic.count,
          score: topic.score,
          sentiment: 'neutral',
          relatedTerms: (topic.terms || []).slice(0, 7).map(t => t.term),
          related_terms: (topic.terms || []).slice(0, 7).map(t => t.term),
          description: typeof topic.summary === 'string' ? topic.summary : (topic.summary?.summary || ''),
          short_summary: topic.short_summary || '',
          one_sentence_summary: topic.one_sentence_summary || '',
          terms: topic.terms || [],
          post_ids: topic.post_ids || [],
          post_sentiments: topic.post_sentiments || {},
          sentiment_evidence: topic.sentiment_evidence || {},
          engagement: topic.engagement
        });
      });
    }
    
    // Format negative topics
    if (topicData.topics.negative && topicData.topics.negative.topics) {
      topicData.topics.negative.topics.forEach(topic => {
        formattedTopics.push({
          id: topic.id,
          topic: topic.terms?.[0]?.term || `Topic ${topic.id}`,
          count: topic.count,
          score: topic.score,
          sentiment: 'negative',
          relatedTerms: (topic.terms || []).slice(0, 7).map(t => t.term),
          related_terms: (topic.terms || []).slice(0, 7).map(t => t.term),
          description: typeof topic.summary === 'string' ? topic.summary : (topic.summary?.summary || ''),
          short_summary: topic.short_summary || '',
          one_sentence_summary: topic.one_sentence_summary || '',
          terms: topic.terms || [],
          post_ids: topic.post_ids || [],
          post_sentiments: topic.post_sentiments || {},
          sentiment_evidence: topic.sentiment_evidence || {},
          engagement: topic.engagement
        });
      });
    }
    
    return formattedTopics;
  };
  
  return (
    <div>
      <TopicCardsGrid topics={formatTopicsForGrid()} />
    </div>
  );
};

