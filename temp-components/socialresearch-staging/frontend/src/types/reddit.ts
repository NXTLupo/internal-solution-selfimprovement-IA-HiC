// This is reddit type file for reddit

export interface DatabaseSubreddit {
  id: string;
  name: string;
  postCount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  subreddit: string;
  url: string;
}

export interface MonitoredSubreddit {
  name: string;
  isActive: boolean;
  newPostsCount: number;
  lastChecked: Date | null;
  posts: RedditPost[];
}

// Database models for subreddit detail page
export interface DatabasePost {
  id: string;
  search_id: string;
  subreddit: string;
  title: string;
  content: string | null;
  score: number | null;
  created_utc: number | null;
  url: string | null;
  permalink: string | null;
  num_comments: number | null;
  author: string | null;
  comments: DatabaseComment[];
}

export interface DatabaseComment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string | null;
  score: number | null;
  created_utc: number | null;
  author: string | null;
  replies: DatabaseComment[];
}

export interface SubredditDetail {
  subreddit: string;
  totalPosts: number;
  totalComments: number;
  posts: DatabasePost[];
}