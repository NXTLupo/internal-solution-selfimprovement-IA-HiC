// This is service file for reddit

import { DatabaseSubreddit, SubredditDetail } from '../types/reddit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Types for Reddit API responses
interface RedditPost {
  id: string;
  title: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  subreddit: string;
  url: string;
}

interface RedditApiPostData {
  id: string;
  title: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  subreddit: string;
  permalink: string;
}

interface RedditApiChild {
  data: RedditApiPostData;
}

interface RedditApiResponse {
  data: {
    children: RedditApiChild[];
  };
}

export const redditService = {
  // Fetch all subreddits from database
  async getSubreddits(): Promise<DatabaseSubreddit[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reddit/subreddits`);
      if (!response.ok) {
        throw new Error(`Failed to fetch subreddits: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching subreddits:', error);
      // Return empty array if API fails
      return [];
    }
  },

  // Fetch subreddit details with posts and comments (no pagination)
  async getSubredditDetail(subredditName: string): Promise<SubredditDetail> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reddit/subreddit/${subredditName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch subreddit details: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching subreddit details:', error);
      throw error;
    }
  },

  // Fetch posts from Reddit API (external API, not from database)
  async fetchSubredditPosts(subredditName: string, limit: number = 25): Promise<RedditPost[]> {
    try {
      const response = await fetch(`https://www.reddit.com/r/${subredditName}/new.json?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch posts from r/${subredditName}`);
      }
      
      const data: RedditApiResponse = await response.json();
      return data.data.children.map((child: RedditApiChild) => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        created_utc: child.data.created_utc,
        score: child.data.score,
        num_comments: child.data.num_comments,
        subreddit: child.data.subreddit,
        url: `https://reddit.com${child.data.permalink}`,
      }));
    } catch (error) {
      console.error(`Error fetching posts from r/${subredditName}:`, error);
      return [];
    }
  }
};