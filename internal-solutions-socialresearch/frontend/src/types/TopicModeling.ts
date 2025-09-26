// Define the time filter options
export type TimeFilter = 'all' | 'hour' | 'day' | 'week' | 'month' | 'year';

// Define the sort options
export type SortOption = 'relevance' | 'new' | 'hot';

// Define the analysis form data structure
export interface AnalysisFormData {
  subreddit: string;
  timeFilter: TimeFilter;
  sort: SortOption;
  startDate?: string;
  endDate?: string;
  project_id?: string;
  numPosts?: number;
  maxComments?: number;
  workers?: number;
  limit?: number;
  keyword?: string;
  // Add any other fields that might be in the form
}

// Define search parameters
export interface SearchParams {
  subreddit: string;
  query?: string;
  limit?: number;
  sort?: SortOption;
  time?: TimeFilter;
  keyword?: string;
}

// Define topic term structure
export interface TopicTerm {
  term: string;
  weight: number;
}

// Define topic engagement metrics
export interface TopicEngagement {
  post_count: number;
  total_comments: number;
  total_score: number;
  avg_comments_per_post: number;
  avg_score_per_post: number;
}

// Define topic summary structure
export interface TopicSummary {
  summary?: string;
  sentiment_distribution?: Record<string, number>;
  key_points?: string[];
}

// Define source structure for topics
export interface Source {
  sentiment: string;
  sentiment_score: number;
  created_utc?: number;
  title?: string;
  text: string;
  comments?: {
    author?: string;
    created_utc?: number;
    score: number;
    body: string;
  }[];
}

// Define sentiment evidence point structure
export interface SentimentEvidencePoint {
  point: string;
  post_refs: string[];
}

// Define sentiment evidence structure
export interface SentimentEvidence {
  positive?: SentimentEvidencePoint[];
  negative?: SentimentEvidencePoint[];
}

// Define unified topic structure (merging Topic and FormattedTopic)
export interface Topic {
  id: number;
  topic: string;
  count: number;
  score: number;
  sentiment: string;
  terms: TopicTerm[];
  // Support both naming conventions for backward compatibility
  relatedTerms?: string[];
  related_terms?: string[];
  // Support both summary and description
  description?: string;
  summary?: TopicSummary | string;
  engagement?: TopicEngagement;
  sources?: Source[];
  short_summary?: string;
  one_sentence_summary?: string;
  post_ids?: string[];
  keyword_filter?: string;
  highlight_terms?: string[];
  theme_words?: string[];
  post_sentiments?: {
    [post_id: string]: {
      sentiment_category: string;
      sentiment_score: number;
    }
  };
  sentiment_evidence?: SentimentEvidence;
}

// Define topic category structure
export interface TopicCategory {
  count: number;
  topics: Topic[];
}

// Define engagement metrics structure
export interface EngagementMetrics {
  total_posts: number;
  total_comments: number;
  total_score: number;
  avg_comments_per_post: number;
  avg_score_per_post: number;
}

// Define topic similarity structure
export interface TopicSimilarity {
  source: number;
  target: number;
  weight: number;
}

// Define overall topic data structure
export interface TopicData {
  total_documents: number;
  total_topics: number;
  topics: {
    positive: TopicCategory;
    negative: TopicCategory;
    neutral: TopicCategory;
  };
  engagement_metrics: EngagementMetrics;
  topic_engagement_metrics: Record<string, TopicEngagement>;
  analysis_id?: string;
  keyword?: string;
  topic_similarities?: TopicSimilarity[];
  subreddit?: string;
  startDate?: string;
  endDate?: string;
}