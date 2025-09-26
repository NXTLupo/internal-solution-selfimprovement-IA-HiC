import { SearchParams, SentimentAnalysisResponse, AISummaryResponse } from '../services/llmAnalyzer';

export interface AnalysisState {
  analysis: SentimentAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  rawResponse: string | object | null;
  streamedReasoning: string;
  streamedJson: string;
  isThinking: boolean;
}

export interface AnalysisFormData {
  subreddit: string;
  applicationName: string;
  postLimit: number;
  sort: SearchParams['sort'];
  timeFilter: SearchParams['time'];
  filterType: 'cluster' | 'absa';
  keyword: string;
  mergeMethod: 'deepseek' | 'sbert' | 'openai';
  chunkSize: number;
  analysisModel: 'deepseek-r1' | 'openai-4';
  maxWorkers: number;
}

export interface Reply {
  body: string;
  score?: number;
  created_utc?: string;
}

export interface Comment {
  body: string;
  score?: number;
  created_utc?: string;
  replies?: Reply[];
}

export interface Post {
  id: string | number;
  title: string;
  selftext?: string;
  created_utc: string;
  comments?: Comment[];
  score?: number;
}

export interface Point {
  point: string;
  frequency: number;
  evidence: {
    [postId: string]: string[];
  };
}

export interface Category {
  category: string;
  points: Point[];
}

export interface AnalysisDisplayProps {
  rawResponse: string | null;
  streamedJson: string | null;
  loading: boolean;
  isThinking?: boolean;
  analysis: AnalysisData | null;
  streamedReasoning?: string | null;
  isPolling?: boolean;
}

export interface AnalysisData {
  merged_result: {
    positive: Category[];
    negative: Category[];
  };
  formatted_data: {
    results: Post[];
    [key: string]: Post[] | string | number | boolean | object;
  };
  analysis_id?: string;
  ai_summary?: AISummaryResponse | null;
  startDate?: string;
  endDate?: string;
}

export interface AISummaryBoxProps {
  analysisData?: {
    positive: Category[];
    negative: Category[];
  };
  isPlaceholder?: boolean;
  aiSummary?: AISummaryResponse | null;
  loading?: boolean;
  error?: string | null;
  skipFetch?: boolean;
  dateRange?: {
    fromYear: string | null;
    fromMonth: string | null;
    toYear: string | null;
    toMonth: string | null;
  };
  analysis?: AnalysisData;
  onRefresh?: () => void;
}

export interface SummaryVisualizationProps {
  analysisData: {
    positive: Category[];
    negative: Category[];
  };
  filteredData?: {
    positive: Category[];
    negative: Category[];
  };
} 