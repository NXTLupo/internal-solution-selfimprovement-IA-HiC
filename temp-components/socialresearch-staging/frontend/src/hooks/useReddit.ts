// This is hook file for reddit

import { useState, useEffect, useCallback } from 'react';
import { DatabaseSubreddit, SubredditDetail } from '../types/reddit';
import { redditService } from '../services/reddit';

export const useReddit = () => {
  const [subreddits, setSubreddits] = useState<DatabaseSubreddit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubreddits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await redditService.getSubreddits();
      setSubreddits(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subreddits';
      setError(errorMessage);
      console.error('Error fetching subreddits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubreddits();
  }, []);

  return {
    subreddits,
    loading,
    error,
    refetch: fetchSubreddits
  };
};

export const useSubredditDetail = (subredditName: string | null) => {
  const [subredditDetail, setSubredditDetail] = useState<SubredditDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubredditDetail = useCallback(async () => {
    if (!subredditName) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await redditService.getSubredditDetail(subredditName);
      setSubredditDetail(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subreddit details';
      setError(errorMessage);
      console.error('Error fetching subreddit details:', err);
    } finally {
      setLoading(false);
    }
  }, [subredditName]);

  useEffect(() => {
    if (subredditName) {
      fetchSubredditDetail();
    }
  }, [subredditName, fetchSubredditDetail]);

  return {
    subredditDetail,
    loading,
    error,
    refetch: fetchSubredditDetail
  };
};