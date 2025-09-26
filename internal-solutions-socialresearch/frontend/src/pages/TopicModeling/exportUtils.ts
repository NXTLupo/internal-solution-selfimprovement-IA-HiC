import { TopicData, Topic, TopicTerm } from '../../types/TopicModeling';

export interface TopicExportData {
  topicData: TopicData;
  subreddit: string;
}

interface EngagementMetrics {
  post_count?: number;
  total_comments?: number;
  total_score?: number;
  avg_comments_per_post?: number;
  avg_score_per_post?: number;
}

// Helper function to format topic terms
const formatTopicTerms = (terms: TopicTerm[]): string => {
  if (!terms || terms.length === 0) return 'No terms available';
  
  return terms
    .slice(0, 10) // Limit to top 10 terms
    .map((term, index) => `${index + 1}. ${term.term} (weight: ${term.weight.toFixed(3)})`)
    .join('\n    ');
};

// Helper function to format related terms
const formatRelatedTerms = (topic: Topic): string => {
  const relatedTerms = topic.related_terms || topic.relatedTerms || [];
  if (relatedTerms.length === 0) return 'No related terms available';
  
  return relatedTerms
    .slice(0, 10) // Limit to top 10 related terms
    .map((term, index) => `${index + 1}. ${term}`)
    .join('\n    ');
};

// Helper function to format sentiment evidence
const formatSentimentEvidence = (topic: Topic): string => {
  if (!topic.sentiment_evidence) return 'No sentiment evidence available';
  
  let evidenceText = '';
  
  if (topic.sentiment_evidence.positive && topic.sentiment_evidence.positive.length > 0) {
    evidenceText += '  Positive Evidence:\n';
    topic.sentiment_evidence.positive.forEach((evidence, index) => {
      evidenceText += `    ${index + 1}. ${evidence.point}\n`;
      evidenceText += `       Referenced in ${evidence.post_refs.length} post(s)\n`;
    });
    evidenceText += '\n';
  }
  
  if (topic.sentiment_evidence.negative && topic.sentiment_evidence.negative.length > 0) {
    evidenceText += '  Negative Evidence:\n';
    topic.sentiment_evidence.negative.forEach((evidence, index) => {
      evidenceText += `    ${index + 1}. ${evidence.point}\n`;
      evidenceText += `       Referenced in ${evidence.post_refs.length} post(s)\n`;
    });
  }
  
  return evidenceText || 'No sentiment evidence available';
};

// Helper function to format engagement metrics
const formatEngagementMetrics = (engagement?: EngagementMetrics): string => {
  if (!engagement) return 'No engagement data available';
  
  return `Post Count: ${engagement.post_count || 0}
    Total Comments: ${engagement.total_comments || 0}
    Total Score: ${engagement.total_score || 0}
    Avg Comments/Post: ${engagement.avg_comments_per_post?.toFixed(2) || 0}
    Avg Score/Post: ${engagement.avg_score_per_post?.toFixed(2) || 0}`;
};

// Helper function to format topic summary
const formatTopicSummary = (topic: Topic): string => {
  let summaryText = '';
  
  if (topic.short_summary) {
    summaryText += `Short Summary: ${topic.short_summary}\n`;
  }
  
  if (topic.one_sentence_summary) {
    summaryText += `One Sentence Summary: ${topic.one_sentence_summary}\n`;
  }
  
  if (topic.summary) {
    if (typeof topic.summary === 'string') {
      summaryText += `Summary: ${topic.summary}\n`;
    } else if (topic.summary.summary) {
      summaryText += `Summary: ${topic.summary.summary}\n`;
      
      if (topic.summary.key_points && topic.summary.key_points.length > 0) {
        summaryText += `Key Points:\n`;
        topic.summary.key_points.forEach((point, index) => {
          summaryText += `    ${index + 1}. ${point}\n`;
        });
      }
    }
  }
  
  if (topic.description) {
    summaryText += `Description: ${topic.description}\n`;
  }
  
  return summaryText || 'No summary available';
};

// Helper function to format post sentiments
const formatPostSentiments = (topic: Topic): string => {
  if (!topic.post_sentiments || Object.keys(topic.post_sentiments).length === 0) return 'No post sentiment data available';
  
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  
  try {
    Object.values(topic.post_sentiments).forEach(sentiment => {
      if (sentiment && sentiment.sentiment_category) {
        const category = sentiment.sentiment_category.toLowerCase();
        if (category in sentimentCounts) {
          sentimentCounts[category as keyof typeof sentimentCounts]++;
        }
      }
    });
    
    const total = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
    
    if (total === 0) return 'No valid sentiment data available';
    
    return `Post Sentiment Distribution (${total} posts):
    Positive: ${sentimentCounts.positive} (${((sentimentCounts.positive / total) * 100).toFixed(1)}%)
    Negative: ${sentimentCounts.negative} (${((sentimentCounts.negative / total) * 100).toFixed(1)}%)
    Neutral: ${sentimentCounts.neutral} (${((sentimentCounts.neutral / total) * 100).toFixed(1)}%)`;
  } catch {
    return 'Error processing sentiment data';
  }
};

// Function to format a single topic
const formatTopic = (topic: Topic, index: number): string => {
  const topicName = topic.topic || `Topic ${index + 1}`;
  const topicId = topic.id || `topic_${index + 1}`;
  
  let topicText = `\n${'='.repeat(80)}\n`;
  topicText += `TOPIC ${index + 1}: ${topicName.toUpperCase()}\n`;
  topicText += `${'='.repeat(80)}\n`;
  topicText += `Topic ID: ${topicId}\n`;
  topicText += `Main Topic: ${topicName}\n`;
  topicText += `Post Count: ${topic.count || 0}\n`;
  topicText += `Sentiment Score: ${topic.score?.toFixed(3) || 'N/A'}\n`;
  topicText += `Overall Sentiment: ${topic.sentiment || 'Unknown'}\n`;
  topicText += `${'-'.repeat(80)}\n`;
  
  // Topic Terms
  topicText += `\nTOP TERMS:\n`;
  topicText += `    ${formatTopicTerms(topic.terms || [])}\n`;
  
  // Related Terms
  topicText += `\nRELATED TERMS:\n`;
  topicText += `    ${formatRelatedTerms(topic)}\n`;
  
  // Summary
  topicText += `\nSUMMARY:\n`;
  topicText += `${formatTopicSummary(topic)}\n`;
  
  // Engagement Metrics
  if (topic.engagement) {
    topicText += `\nENGAGEMENT METRICS:\n`;
    topicText += `    ${formatEngagementMetrics(topic.engagement)}\n`;
  }
  
  // Post Sentiments
  topicText += `\nPOST SENTIMENTS:\n`;
  topicText += `    ${formatPostSentiments(topic)}\n`;
  
  // Sentiment Evidence
  topicText += `\nSENTIMENT EVIDENCE:\n`;
  topicText += `${formatSentimentEvidence(topic)}\n`;
  
  // Post IDs (if available)
  if (topic.post_ids && topic.post_ids.length > 0) {
    topicText += `\nRELATED POSTS:\n`;
    topicText += `    Total Posts: ${topic.post_ids.length}\n`;
    topicText += `    Post IDs: ${topic.post_ids.slice(0, 10).join(', ')}`;
    if (topic.post_ids.length > 10) {
      topicText += ` ... and ${topic.post_ids.length - 10} more`;
    }
    topicText += `\n`;
  }
  
  return topicText;
};

// Function to format topic category summary
const formatCategoryHeader = (categoryName: string, topics: Topic[]): string => {
  if (!topics || topics.length === 0) return '';
  
  const totalPosts = topics.reduce((sum, topic) => sum + (topic.count || 0), 0);
  const avgScore = topics.reduce((sum, topic) => sum + (topic.score || 0), 0) / topics.length;
  
  let categoryText = `\n${'#'.repeat(80)}\n`;
  categoryText += `${(categoryName || 'UNKNOWN').toUpperCase()} TOPICS SECTION\n`;
  categoryText += `${'#'.repeat(80)}\n`;
  categoryText += `Total Topics: ${topics.length}\n`;
  categoryText += `Total Posts: ${totalPosts}\n`;
  categoryText += `Average Sentiment Score: ${avgScore.toFixed(3)}\n`;
  categoryText += `${'#'.repeat(80)}\n`;
  
  return categoryText;
};

// Main export function for topic modeling results as TXT
export const exportTopicModelingAsTXT = ({ topicData, subreddit }: TopicExportData) => {
  if (!topicData || !topicData.topics) {
    alert('No topic data to export');
    return;
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleString();
  };

  // Generate the complete text content
  let exportContent = `REDDIT TOPIC MODELING ANALYSIS EXPORT\n`;
  exportContent += `${'='.repeat(80)}\n`;
  exportContent += `Subreddit: r/${subreddit}\n`;
  exportContent += `Export Date: ${new Date().toLocaleString()}\n`;
  exportContent += `Analysis ID: ${topicData.analysis_id || 'N/A'}\n`;
  exportContent += `Analysis Period: ${formatDate(topicData.startDate)} to ${formatDate(topicData.endDate)}\n`;
  exportContent += `Keyword Filter: ${topicData.keyword || 'None'}\n`;
  exportContent += `${'='.repeat(80)}\n`;
  
  // Overall Statistics
  exportContent += `\nOVERALL ANALYSIS STATISTICS\n`;
  exportContent += `${'-'.repeat(50)}\n`;
  exportContent += `Total Documents Analyzed: ${topicData.total_documents || 0}\n`;
  exportContent += `Total Topics Discovered: ${topicData.total_topics || 0}\n`;
  exportContent += `Positive Topics: ${topicData.topics?.positive?.topics?.length || 0}\n`;
  exportContent += `Neutral Topics: ${topicData.topics?.neutral?.topics?.length || 0}\n`;
  exportContent += `Negative Topics: ${topicData.topics?.negative?.topics?.length || 0}\n`;
  
  // Overall Engagement Metrics
  if (topicData.engagement_metrics) {
    exportContent += `\nOVERALL ENGAGEMENT METRICS\n`;
    exportContent += `${'-'.repeat(50)}\n`;
    exportContent += `Total Posts: ${topicData.engagement_metrics.total_posts || 0}\n`;
    exportContent += `Total Comments: ${topicData.engagement_metrics.total_comments || 0}\n`;
    exportContent += `Total Score: ${topicData.engagement_metrics.total_score || 0}\n`;
    exportContent += `Average Comments per Post: ${topicData.engagement_metrics.avg_comments_per_post?.toFixed(2) || 'N/A'}\n`;
    exportContent += `Average Score per Post: ${topicData.engagement_metrics.avg_score_per_post?.toFixed(2) || 'N/A'}\n`;
  }
  
  // Topic Similarities Summary
  if (topicData.topic_similarities && topicData.topic_similarities.length > 0) {
    exportContent += `\nTOPIC SIMILARITIES\n`;
    exportContent += `${'-'.repeat(50)}\n`;
    exportContent += `Total Topic Relationships: ${topicData.topic_similarities.length}\n`;
    exportContent += `Top 10 Similar Topic Pairs:\n`;
    
    const sortedSimilarities = [...topicData.topic_similarities]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 10);
    
    sortedSimilarities.forEach((similarity, index) => {
      exportContent += `    ${index + 1}. Topic ${similarity.source || 'Unknown'} ↔ Topic ${similarity.target || 'Unknown'} (similarity: ${similarity.weight?.toFixed(3) || 'N/A'})\n`;
    });
  }
  
  // Positive Topics
  if (topicData.topics?.positive?.topics?.length > 0) {
    exportContent += formatCategoryHeader('POSITIVE', topicData.topics.positive.topics);
    topicData.topics.positive.topics.forEach((topic, index) => {
      exportContent += formatTopic(topic, index);
    });
  }
  
  // Neutral Topics
  if (topicData.topics?.neutral?.topics?.length > 0) {
    exportContent += formatCategoryHeader('NEUTRAL', topicData.topics.neutral.topics);
    topicData.topics.neutral.topics.forEach((topic, index) => {
      exportContent += formatTopic(topic, index);
    });
  }
  
  // Negative Topics
  if (topicData.topics?.negative?.topics?.length > 0) {
    exportContent += formatCategoryHeader('NEGATIVE', topicData.topics.negative.topics);
    topicData.topics.negative.topics.forEach((topic, index) => {
      exportContent += formatTopic(topic, index);
    });
  }
  
  // Footer
  exportContent += `\n${'='.repeat(80)}\n`;
  exportContent += `END OF TOPIC MODELING ANALYSIS EXPORT\n`;
  exportContent += `Generated by NXT Humans Topic Modeling Tool\n`;
  exportContent += `Export Date: ${new Date().toLocaleString()}\n`;
  exportContent += `${'='.repeat(80)}\n`;

  // Create and download the file
  const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `topic_modeling_r_${subreddit}_${topicData.analysis_id || 'analysis'}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export function for topic modeling results as JSON
export const exportTopicModelingAsJSON = ({ topicData, subreddit }: TopicExportData) => {
  if (!topicData || !topicData.topics) {
    alert('No topic data to export');
    return;
  }

  // Create a comprehensive JSON export with all data
  const exportData = {
    metadata: {
      export_date: new Date().toISOString(),
      export_format: 'json',
      subreddit: subreddit,
      analysis_id: topicData.analysis_id || null,
      analysis_period: {
        start_date: topicData.startDate || null,
        end_date: topicData.endDate || null
      },
      keyword_filter: topicData.keyword || null,
      generated_by: 'NXT Humans Topic Modeling Tool'
    },
    statistics: {
      total_documents_analyzed: topicData.total_documents || 0,
      total_topics_discovered: topicData.total_topics || 0,
      positive_topics_count: topicData.topics?.positive?.topics?.length || 0,
      neutral_topics_count: topicData.topics?.neutral?.topics?.length || 0,
      negative_topics_count: topicData.topics?.negative?.topics?.length || 0
    },
    engagement_metrics: topicData.engagement_metrics || null,
    topic_similarities: topicData.topic_similarities || [],
    topics: {
      positive: topicData.topics?.positive?.topics || [],
      neutral: topicData.topics?.neutral?.topics || [],
      negative: topicData.topics?.negative?.topics || []
    }
  };

  // Create and download the JSON file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `topic_modeling_r_${subreddit}_${topicData.analysis_id || 'analysis'}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export function for topic modeling results as Markdown
export const exportTopicModelingAsMarkdown = ({ topicData, subreddit }: TopicExportData) => {
  if (!topicData || !topicData.topics) {
    alert('No topic data to export');
    return;
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleString();
  };

  // Helper function to format topic for markdown
  const formatTopicMarkdown = (topic: Topic, index: number): string => {
    const topicName = topic.topic || `Topic ${index + 1}`;
    let topicText = `\n## ${index + 1}. ${topicName}\n\n`;
    
    // Basic info table
    topicText += `| Field | Value |\n`;
    topicText += `|-------|-------|\n`;
    topicText += `| **Topic ID** | ${topic.id || `topic_${index + 1}`} |\n`;
    topicText += `| **Post Count** | ${topic.count || 0} |\n`;
    topicText += `| **Sentiment Score** | ${topic.score?.toFixed(3) || 'N/A'} |\n`;
    topicText += `| **Overall Sentiment** | ${topic.sentiment || 'Unknown'} |\n\n`;
    
    // Top terms
    if (topic.terms && topic.terms.length > 0) {
      topicText += `### Top Terms\n\n`;
      topic.terms.slice(0, 10).forEach((term, idx) => {
        topicText += `${idx + 1}. **${term.term}** (weight: ${term.weight.toFixed(3)})\n`;
      });
      topicText += `\n`;
    }
    
    // Related terms
    const relatedTerms = topic.related_terms || topic.relatedTerms || [];
    if (relatedTerms.length > 0) {
      topicText += `### Related Terms\n\n`;
      relatedTerms.slice(0, 10).forEach((term, idx) => {
        topicText += `${idx + 1}. ${term}\n`;
      });
      topicText += `\n`;
    }
    
    // Summary
    topicText += `### Summary\n\n`;
    if (topic.short_summary) {
      topicText += `**Short Summary:** ${topic.short_summary}\n\n`;
    }
    if (topic.one_sentence_summary) {
      topicText += `**One Sentence Summary:** ${topic.one_sentence_summary}\n\n`;
    }
    if (topic.summary) {
      if (typeof topic.summary === 'string') {
        topicText += `**Summary:** ${topic.summary}\n\n`;
      } else if (topic.summary.summary) {
        topicText += `**Summary:** ${topic.summary.summary}\n\n`;
        if (topic.summary.key_points && topic.summary.key_points.length > 0) {
          topicText += `**Key Points:**\n`;
          topic.summary.key_points.forEach((point, idx) => {
            topicText += `${idx + 1}. ${point}\n`;
          });
          topicText += `\n`;
        }
      }
    }
    if (topic.description) {
      topicText += `**Description:** ${topic.description}\n\n`;
    }
    
    // Engagement metrics
    if (topic.engagement) {
      topicText += `### Engagement Metrics\n\n`;
      topicText += `- **Post Count:** ${topic.engagement.post_count || 0}\n`;
      topicText += `- **Total Comments:** ${topic.engagement.total_comments || 0}\n`;
      topicText += `- **Total Score:** ${topic.engagement.total_score || 0}\n`;
      topicText += `- **Avg Comments/Post:** ${topic.engagement.avg_comments_per_post?.toFixed(2) || 0}\n`;
      topicText += `- **Avg Score/Post:** ${topic.engagement.avg_score_per_post?.toFixed(2) || 0}\n\n`;
    }
    
    // Post sentiments
    if (topic.post_sentiments && Object.keys(topic.post_sentiments).length > 0) {
      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      Object.values(topic.post_sentiments).forEach(sentiment => {
        if (sentiment && sentiment.sentiment_category) {
          const category = sentiment.sentiment_category.toLowerCase();
          if (category in sentimentCounts) {
            sentimentCounts[category as keyof typeof sentimentCounts]++;
          }
        }
      });
      
      const total = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
      if (total > 0) {
        topicText += `### Post Sentiment Distribution (${total} posts)\n\n`;
        topicText += `- **Positive:** ${sentimentCounts.positive} (${((sentimentCounts.positive / total) * 100).toFixed(1)}%)\n`;
        topicText += `- **Negative:** ${sentimentCounts.negative} (${((sentimentCounts.negative / total) * 100).toFixed(1)}%)\n`;
        topicText += `- **Neutral:** ${sentimentCounts.neutral} (${((sentimentCounts.neutral / total) * 100).toFixed(1)}%)\n\n`;
      }
    }
    
    // Sentiment evidence
    if (topic.sentiment_evidence) {
      topicText += `### Sentiment Evidence\n\n`;
      
      if (topic.sentiment_evidence.positive && topic.sentiment_evidence.positive.length > 0) {
        topicText += `#### Positive Evidence\n\n`;
        topic.sentiment_evidence.positive.forEach((evidence, idx) => {
          topicText += `${idx + 1}. ${evidence.point} *(Referenced in ${evidence.post_refs.length} post(s))*\n`;
        });
        topicText += `\n`;
      }
      
      if (topic.sentiment_evidence.negative && topic.sentiment_evidence.negative.length > 0) {
        topicText += `#### Negative Evidence\n\n`;
        topic.sentiment_evidence.negative.forEach((evidence, idx) => {
          topicText += `${idx + 1}. ${evidence.point} *(Referenced in ${evidence.post_refs.length} post(s))*\n`;
        });
        topicText += `\n`;
      }
    }
    
    // Related posts
    if (topic.post_ids && topic.post_ids.length > 0) {
      topicText += `### Related Posts\n\n`;
      topicText += `**Total Posts:** ${topic.post_ids.length}\n\n`;
      topicText += `**Post IDs:** ${topic.post_ids.slice(0, 10).join(', ')}`;
      if (topic.post_ids.length > 10) {
        topicText += ` ... and ${topic.post_ids.length - 10} more`;
      }
      topicText += `\n\n`;
    }
    
    topicText += `---\n`;
    return topicText;
  };

  // Generate the complete markdown content
  let exportContent = `# Reddit Topic Modeling Analysis Export\n\n`;
  exportContent += `**Subreddit:** r/${subreddit}\n`;
  exportContent += `**Export Date:** ${new Date().toLocaleString()}\n`;
  exportContent += `**Analysis ID:** ${topicData.analysis_id || 'N/A'}\n`;
  exportContent += `**Analysis Period:** ${formatDate(topicData.startDate)} to ${formatDate(topicData.endDate)}\n`;
  exportContent += `**Keyword Filter:** ${topicData.keyword || 'None'}\n\n`;
  
  // Overall statistics
  exportContent += `## Overall Analysis Statistics\n\n`;
  exportContent += `- **Total Documents Analyzed:** ${topicData.total_documents || 0}\n`;
  exportContent += `- **Total Topics Discovered:** ${topicData.total_topics || 0}\n`;
  exportContent += `- **Positive Topics:** ${topicData.topics?.positive?.topics?.length || 0}\n`;
  exportContent += `- **Neutral Topics:** ${topicData.topics?.neutral?.topics?.length || 0}\n`;
  exportContent += `- **Negative Topics:** ${topicData.topics?.negative?.topics?.length || 0}\n\n`;
  
  // Overall engagement metrics
  if (topicData.engagement_metrics) {
    exportContent += `## Overall Engagement Metrics\n\n`;
    exportContent += `- **Total Posts:** ${topicData.engagement_metrics.total_posts || 0}\n`;
    exportContent += `- **Total Comments:** ${topicData.engagement_metrics.total_comments || 0}\n`;
    exportContent += `- **Total Score:** ${topicData.engagement_metrics.total_score || 0}\n`;
    exportContent += `- **Average Comments per Post:** ${topicData.engagement_metrics.avg_comments_per_post?.toFixed(2) || 'N/A'}\n`;
    exportContent += `- **Average Score per Post:** ${topicData.engagement_metrics.avg_score_per_post?.toFixed(2) || 'N/A'}\n\n`;
  }
  
  // Topic similarities
  if (topicData.topic_similarities && topicData.topic_similarities.length > 0) {
    exportContent += `## Topic Similarities\n\n`;
    exportContent += `**Total Topic Relationships:** ${topicData.topic_similarities.length}\n\n`;
    exportContent += `### Top 10 Similar Topic Pairs\n\n`;
    
    const sortedSimilarities = [...topicData.topic_similarities]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 10);
    
    sortedSimilarities.forEach((similarity, index) => {
      exportContent += `${index + 1}. **Topic ${similarity.source || 'Unknown'}** ↔ **Topic ${similarity.target || 'Unknown'}** (similarity: ${similarity.weight?.toFixed(3) || 'N/A'})\n`;
    });
    exportContent += `\n`;
  }
  
  // Positive topics
  if (topicData.topics?.positive?.topics?.length > 0) {
    exportContent += `# Positive Topics\n\n`;
    exportContent += `**Total Topics:** ${topicData.topics.positive.topics.length}\n`;
    exportContent += `**Total Posts:** ${topicData.topics.positive.topics.reduce((sum, topic) => sum + (topic.count || 0), 0)}\n`;
    exportContent += `**Average Sentiment Score:** ${(topicData.topics.positive.topics.reduce((sum, topic) => sum + (topic.score || 0), 0) / topicData.topics.positive.topics.length).toFixed(3)}\n\n`;
    
    topicData.topics.positive.topics.forEach((topic, index) => {
      exportContent += formatTopicMarkdown(topic, index);
    });
  }
  
  // Neutral topics
  if (topicData.topics?.neutral?.topics?.length > 0) {
    exportContent += `# Neutral Topics\n\n`;
    exportContent += `**Total Topics:** ${topicData.topics.neutral.topics.length}\n`;
    exportContent += `**Total Posts:** ${topicData.topics.neutral.topics.reduce((sum, topic) => sum + (topic.count || 0), 0)}\n`;
    exportContent += `**Average Sentiment Score:** ${(topicData.topics.neutral.topics.reduce((sum, topic) => sum + (topic.score || 0), 0) / topicData.topics.neutral.topics.length).toFixed(3)}\n\n`;
    
    topicData.topics.neutral.topics.forEach((topic, index) => {
      exportContent += formatTopicMarkdown(topic, index);
    });
  }
  
  // Negative topics
  if (topicData.topics?.negative?.topics?.length > 0) {
    exportContent += `# Negative Topics\n\n`;
    exportContent += `**Total Topics:** ${topicData.topics.negative.topics.length}\n`;
    exportContent += `**Total Posts:** ${topicData.topics.negative.topics.reduce((sum, topic) => sum + (topic.count || 0), 0)}\n`;
    exportContent += `**Average Sentiment Score:** ${(topicData.topics.negative.topics.reduce((sum, topic) => sum + (topic.score || 0), 0) / topicData.topics.negative.topics.length).toFixed(3)}\n\n`;
    
    topicData.topics.negative.topics.forEach((topic, index) => {
      exportContent += formatTopicMarkdown(topic, index);
    });
  }
  
  // Footer
  exportContent += `---\n\n`;
  exportContent += `*Generated by NXT Humans Topic Modeling Tool on ${new Date().toLocaleString()}*\n`;

  // Create and download the file
  const blob = new Blob([exportContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `topic_modeling_r_${subreddit}_${topicData.analysis_id || 'analysis'}_${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export function for topic modeling results as XML
export const exportTopicModelingAsXML = ({ topicData, subreddit }: TopicExportData) => {
  if (!topicData || !topicData.topics) {
    alert('No topic data to export');
    return;
  }

  const escapeXml = (unsafe: string): string => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toISOString();
  };

  // Helper function to format topic terms as XML
  const formatTopicTermsXML = (terms: TopicTerm[]): string => {
    if (!terms || terms.length === 0) return '<terms></terms>';
    
    let termsXml = '<terms>\n';
    terms.slice(0, 10).forEach((term, index) => {
      termsXml += `      <term rank="${index + 1}">\n`;
      termsXml += `        <word>${escapeXml(term.term)}</word>\n`;
      termsXml += `        <weight>${term.weight.toFixed(3)}</weight>\n`;
      termsXml += `      </term>\n`;
    });
    termsXml += '    </terms>';
    return termsXml;
  };

  // Helper function to format related terms as XML
  const formatRelatedTermsXML = (topic: Topic): string => {
    const relatedTerms = topic.related_terms || topic.relatedTerms || [];
    if (relatedTerms.length === 0) return '<related_terms></related_terms>';
    
    let relatedXml = '<related_terms>\n';
    relatedTerms.slice(0, 10).forEach((term, index) => {
      relatedXml += `      <term rank="${index + 1}">${escapeXml(term)}</term>\n`;
    });
    relatedXml += '    </related_terms>';
    return relatedXml;
  };

  // Helper function to format sentiment evidence as XML
  const formatSentimentEvidenceXML = (topic: Topic): string => {
    if (!topic.sentiment_evidence) return '<sentiment_evidence></sentiment_evidence>';
    
    let evidenceXml = '<sentiment_evidence>\n';
    
    if (topic.sentiment_evidence.positive && topic.sentiment_evidence.positive.length > 0) {
      evidenceXml += '      <positive_evidence>\n';
      topic.sentiment_evidence.positive.forEach((evidence, index) => {
        evidenceXml += `        <evidence id="${index + 1}">\n`;
        evidenceXml += `          <point>${escapeXml(evidence.point)}</point>\n`;
        evidenceXml += `          <post_references_count>${evidence.post_refs.length}</post_references_count>\n`;
        evidenceXml += `          <post_references>\n`;
        evidence.post_refs.forEach(ref => {
          evidenceXml += `            <post_ref>${escapeXml(ref)}</post_ref>\n`;
        });
        evidenceXml += `          </post_references>\n`;
        evidenceXml += `        </evidence>\n`;
      });
      evidenceXml += '      </positive_evidence>\n';
    }
    
    if (topic.sentiment_evidence.negative && topic.sentiment_evidence.negative.length > 0) {
      evidenceXml += '      <negative_evidence>\n';
      topic.sentiment_evidence.negative.forEach((evidence, index) => {
        evidenceXml += `        <evidence id="${index + 1}">\n`;
        evidenceXml += `          <point>${escapeXml(evidence.point)}</point>\n`;
        evidenceXml += `          <post_references_count>${evidence.post_refs.length}</post_references_count>\n`;
        evidenceXml += `          <post_references>\n`;
        evidence.post_refs.forEach(ref => {
          evidenceXml += `            <post_ref>${escapeXml(ref)}</post_ref>\n`;
        });
        evidenceXml += `          </post_references>\n`;
        evidenceXml += `        </evidence>\n`;
      });
      evidenceXml += '      </negative_evidence>\n';
    }
    
    evidenceXml += '    </sentiment_evidence>';
    return evidenceXml;
  };

  // Helper function to format post sentiments as XML
  const formatPostSentimentsXML = (topic: Topic): string => {
    if (!topic.post_sentiments || Object.keys(topic.post_sentiments).length === 0) {
      return '<post_sentiments></post_sentiments>';
    }
    
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    
    try {
      Object.values(topic.post_sentiments).forEach(sentiment => {
        if (sentiment && sentiment.sentiment_category) {
          const category = sentiment.sentiment_category.toLowerCase();
          if (category in sentimentCounts) {
            sentimentCounts[category as keyof typeof sentimentCounts]++;
          }
        }
      });
      
      const total = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
      
      if (total === 0) return '<post_sentiments></post_sentiments>';
      
      let sentimentsXml = '<post_sentiments>\n';
      sentimentsXml += `      <total_posts>${total}</total_posts>\n`;
      sentimentsXml += `      <positive_count>${sentimentCounts.positive}</positive_count>\n`;
      sentimentsXml += `      <positive_percentage>${((sentimentCounts.positive / total) * 100).toFixed(1)}</positive_percentage>\n`;
      sentimentsXml += `      <negative_count>${sentimentCounts.negative}</negative_count>\n`;
      sentimentsXml += `      <negative_percentage>${((sentimentCounts.negative / total) * 100).toFixed(1)}</negative_percentage>\n`;
      sentimentsXml += `      <neutral_count>${sentimentCounts.neutral}</neutral_count>\n`;
      sentimentsXml += `      <neutral_percentage>${((sentimentCounts.neutral / total) * 100).toFixed(1)}</neutral_percentage>\n`;
      sentimentsXml += '    </post_sentiments>';
      
      return sentimentsXml;
    } catch {
      return '<post_sentiments><error>Error processing sentiment data</error></post_sentiments>';
    }
  };

  // Helper function to format a single topic as XML
  const formatTopicXML = (topic: Topic, index: number): string => {
    const topicName = topic.topic || `Topic ${index + 1}`;
    const topicId = topic.id || `topic_${index + 1}`;
    
    let topicXml = `  <topic id="${topicId}" rank="${index + 1}">\n`;
    topicXml += `    <name>${escapeXml(topicName)}</name>\n`;
    topicXml += `    <post_count>${topic.count || 0}</post_count>\n`;
    topicXml += `    <sentiment_score>${topic.score?.toFixed(3) || 'N/A'}</sentiment_score>\n`;
    topicXml += `    <overall_sentiment>${escapeXml(topic.sentiment || 'Unknown')}</overall_sentiment>\n`;
    
    // Terms
    topicXml += `    ${formatTopicTermsXML(topic.terms || [])}\n`;
    
    // Related terms
    topicXml += `    ${formatRelatedTermsXML(topic)}\n`;
    
    // Summary
    topicXml += `    <summary>\n`;
    if (topic.short_summary) {
      topicXml += `      <short_summary>${escapeXml(topic.short_summary)}</short_summary>\n`;
    }
    if (topic.one_sentence_summary) {
      topicXml += `      <one_sentence_summary>${escapeXml(topic.one_sentence_summary)}</one_sentence_summary>\n`;
    }
    if (topic.summary) {
      if (typeof topic.summary === 'string') {
        topicXml += `      <detailed_summary>${escapeXml(topic.summary)}</detailed_summary>\n`;
      } else if (topic.summary.summary) {
        topicXml += `      <detailed_summary>${escapeXml(topic.summary.summary)}</detailed_summary>\n`;
        if (topic.summary.key_points && topic.summary.key_points.length > 0) {
          topicXml += `      <key_points>\n`;
          topic.summary.key_points.forEach((point, idx) => {
            topicXml += `        <point id="${idx + 1}">${escapeXml(point)}</point>\n`;
          });
          topicXml += `      </key_points>\n`;
        }
      }
    }
    if (topic.description) {
      topicXml += `      <description>${escapeXml(topic.description)}</description>\n`;
    }
    topicXml += `    </summary>\n`;
    
    // Engagement metrics
    if (topic.engagement) {
      topicXml += `    <engagement_metrics>\n`;
      topicXml += `      <post_count>${topic.engagement.post_count || 0}</post_count>\n`;
      topicXml += `      <total_comments>${topic.engagement.total_comments || 0}</total_comments>\n`;
      topicXml += `      <total_score>${topic.engagement.total_score || 0}</total_score>\n`;
      topicXml += `      <avg_comments_per_post>${topic.engagement.avg_comments_per_post?.toFixed(2) || 0}</avg_comments_per_post>\n`;
      topicXml += `      <avg_score_per_post>${topic.engagement.avg_score_per_post?.toFixed(2) || 0}</avg_score_per_post>\n`;
      topicXml += `    </engagement_metrics>\n`;
    }
    
    // Post sentiments
    topicXml += `    ${formatPostSentimentsXML(topic)}\n`;
    
    // Sentiment evidence
    topicXml += `    ${formatSentimentEvidenceXML(topic)}\n`;
    
    // Post IDs
    if (topic.post_ids && topic.post_ids.length > 0) {
      topicXml += `    <related_posts>\n`;
      topicXml += `      <total_posts>${topic.post_ids.length}</total_posts>\n`;
      topicXml += `      <post_ids>\n`;
      topic.post_ids.forEach(postId => {
        topicXml += `        <post_id>${escapeXml(postId)}</post_id>\n`;
      });
      topicXml += `      </post_ids>\n`;
      topicXml += `    </related_posts>\n`;
    }
    
    topicXml += `  </topic>\n`;
    return topicXml;
  };

  // Generate the complete XML content
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xmlContent += '<reddit_topic_modeling_analysis>\n';
  xmlContent += '  <metadata>\n';
  xmlContent += `    <subreddit>${escapeXml(subreddit)}</subreddit>\n`;
  xmlContent += `    <export_date>${formatDate(new Date().toISOString())}</export_date>\n`;
  xmlContent += `    <analysis_id>${escapeXml(topicData.analysis_id || 'N/A')}</analysis_id>\n`;
  xmlContent += `    <analysis_period>\n`;
  xmlContent += `      <start_date>${formatDate(topicData.startDate)}</start_date>\n`;
  xmlContent += `      <end_date>${formatDate(topicData.endDate)}</end_date>\n`;
  xmlContent += `    </analysis_period>\n`;
  xmlContent += `    <keyword_filter>${escapeXml(topicData.keyword || 'None')}</keyword_filter>\n`;
  xmlContent += `    <generated_by>NXT Humans Topic Modeling Tool</generated_by>\n`;
  xmlContent += '  </metadata>\n';
  
  // Overall statistics
  xmlContent += '  <statistics>\n';
  xmlContent += `    <total_documents_analyzed>${topicData.total_documents || 0}</total_documents_analyzed>\n`;
  xmlContent += `    <total_topics_discovered>${topicData.total_topics || 0}</total_topics_discovered>\n`;
  xmlContent += `    <positive_topics_count>${topicData.topics?.positive?.topics?.length || 0}</positive_topics_count>\n`;
  xmlContent += `    <neutral_topics_count>${topicData.topics?.neutral?.topics?.length || 0}</neutral_topics_count>\n`;
  xmlContent += `    <negative_topics_count>${topicData.topics?.negative?.topics?.length || 0}</negative_topics_count>\n`;
  xmlContent += '  </statistics>\n';
  
  // Overall engagement metrics
  if (topicData.engagement_metrics) {
    xmlContent += '  <overall_engagement_metrics>\n';
    xmlContent += `    <total_posts>${topicData.engagement_metrics.total_posts || 0}</total_posts>\n`;
    xmlContent += `    <total_comments>${topicData.engagement_metrics.total_comments || 0}</total_comments>\n`;
    xmlContent += `    <total_score>${topicData.engagement_metrics.total_score || 0}</total_score>\n`;
    xmlContent += `    <avg_comments_per_post>${topicData.engagement_metrics.avg_comments_per_post?.toFixed(2) || 'N/A'}</avg_comments_per_post>\n`;
    xmlContent += `    <avg_score_per_post>${topicData.engagement_metrics.avg_score_per_post?.toFixed(2) || 'N/A'}</avg_score_per_post>\n`;
    xmlContent += '  </overall_engagement_metrics>\n';
  }
  
  // Topic similarities
  if (topicData.topic_similarities && topicData.topic_similarities.length > 0) {
    xmlContent += '  <topic_similarities>\n';
    xmlContent += `    <total_relationships>${topicData.topic_similarities.length}</total_relationships>\n`;
    xmlContent += '    <similarities>\n';
    
    const sortedSimilarities = [...topicData.topic_similarities]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));
    
    sortedSimilarities.forEach((similarity, index) => {
      xmlContent += `      <similarity rank="${index + 1}">\n`;
      xmlContent += `        <source_topic>${escapeXml(String(similarity.source || 'Unknown'))}</source_topic>\n`;
      xmlContent += `        <target_topic>${escapeXml(String(similarity.target || 'Unknown'))}</target_topic>\n`;
      xmlContent += `        <weight>${similarity.weight?.toFixed(3) || 'N/A'}</weight>\n`;
      xmlContent += `      </similarity>\n`;
    });
    xmlContent += '    </similarities>\n';
    xmlContent += '  </topic_similarities>\n';
  }
  
  // Positive topics
  if (topicData.topics?.positive?.topics?.length > 0) {
    xmlContent += '  <positive_topics>\n';
    xmlContent += `    <total_topics>${topicData.topics.positive.topics.length}</total_topics>\n`;
    xmlContent += `    <total_posts>${topicData.topics.positive.topics.reduce((sum, topic) => sum + (topic.count || 0), 0)}</total_posts>\n`;
    xmlContent += `    <average_sentiment_score>${(topicData.topics.positive.topics.reduce((sum, topic) => sum + (topic.score || 0), 0) / topicData.topics.positive.topics.length).toFixed(3)}</average_sentiment_score>\n`;
    topicData.topics.positive.topics.forEach((topic, index) => {
      xmlContent += formatTopicXML(topic, index);
    });
    xmlContent += '  </positive_topics>\n';
  }
  
  // Neutral topics
  if (topicData.topics?.neutral?.topics?.length > 0) {
    xmlContent += '  <neutral_topics>\n';
    xmlContent += `    <total_topics>${topicData.topics.neutral.topics.length}</total_topics>\n`;
    xmlContent += `    <total_posts>${topicData.topics.neutral.topics.reduce((sum, topic) => sum + (topic.count || 0), 0)}</total_posts>\n`;
    xmlContent += `    <average_sentiment_score>${(topicData.topics.neutral.topics.reduce((sum, topic) => sum + (topic.score || 0), 0) / topicData.topics.neutral.topics.length).toFixed(3)}</average_sentiment_score>\n`;
    topicData.topics.neutral.topics.forEach((topic, index) => {
      xmlContent += formatTopicXML(topic, index);
    });
    xmlContent += '  </neutral_topics>\n';
  }
  
  // Negative topics
  if (topicData.topics?.negative?.topics?.length > 0) {
    xmlContent += '  <negative_topics>\n';
    xmlContent += `    <total_topics>${topicData.topics.negative.topics.length}</total_topics>\n`;
    xmlContent += `    <total_posts>${topicData.topics.negative.topics.reduce((sum, topic) => sum + (topic.count || 0), 0)}</total_posts>\n`;
    xmlContent += `    <average_sentiment_score>${(topicData.topics.negative.topics.reduce((sum, topic) => sum + (topic.score || 0), 0) / topicData.topics.negative.topics.length).toFixed(3)}</average_sentiment_score>\n`;
    topicData.topics.negative.topics.forEach((topic, index) => {
      xmlContent += formatTopicXML(topic, index);
    });
    xmlContent += '  </negative_topics>\n';
  }
  
  xmlContent += '</reddit_topic_modeling_analysis>\n';

  // Create and download the file
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `topic_modeling_r_${subreddit}_${topicData.analysis_id || 'analysis'}_${new Date().toISOString().split('T')[0]}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 