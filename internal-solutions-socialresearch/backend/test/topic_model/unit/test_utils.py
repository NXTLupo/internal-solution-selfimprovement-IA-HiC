"""
Unit tests for utility functions in the topic model API.
"""
import pytest
from unittest.mock import patch, MagicMock
import os
import datetime

# Import the function to test
from app.routes.api_topic_model import fetch_reddit_posts


class TestFetchRedditPosts:
    """Unit tests for the fetch_reddit_posts function."""
    
    @patch('app.routes.api_topic_model.reddit')
    def test_fetch_reddit_posts_basic(self, mock_reddit):
        """Test basic functionality of fetch_reddit_posts."""
        # Setup mock subreddit and submissions
        mock_subreddit = MagicMock()
        mock_submissions = []
        
        # Create 5 mock submissions
        for i in range(5):
            mock_submission = MagicMock()
            mock_submission.id = f"submission_{i}"
            mock_submission.title = f"Test Submission {i}"
            mock_submission.selftext = f"Test content {i}"
            mock_submission.author.name = f"user_{i}"
            mock_submission.created_utc = 1620000000 + (i * 3600)
            mock_submission.score = 10 + i
            
            # Mock comments
            mock_comments = MagicMock()
            mock_comments.list.return_value = []
            mock_submission.comments = mock_comments
            
            mock_submissions.append(mock_submission)
        
        # Set up the mock Reddit API response
        mock_subreddit.new.return_value = mock_submissions
        mock_reddit.subreddit.return_value = mock_subreddit
        
        # Call the function
        log_dir = "test_log_dir"
        with patch('os.makedirs'), patch('builtins.open', create=True), patch('json.dump'):
            result = fetch_reddit_posts(
                subreddit="python",
                num_posts=5,
                max_comments_per_post=2,
                log_dir=log_dir,
                sort="new"
            )
        
        # Verify the results
        assert len(result) == 5
        assert result[0]['id'] == "submission_0"
        assert result[0]['title'] == "Test Submission 0"
        assert 'comments' in result[0]
        
        # Verify that the Reddit API was called correctly
        mock_reddit.subreddit.assert_called_once_with("python")
        mock_subreddit.new.assert_called_once()
    
    @patch('app.routes.api_topic_model.reddit')
    def test_fetch_reddit_posts_with_date_filter(self, mock_reddit):
        """Test fetch_reddit_posts with date filtering."""
        # Setup mock submissions
        mock_subreddit = MagicMock()
        mock_submissions = []
        
        # Create mock submissions with different dates
        for i in range(10):
            mock_submission = MagicMock()
            mock_submission.id = f"submission_{i}"
            mock_submission.title = f"Test Submission {i}"
            mock_submission.selftext = f"Test content {i}"
            mock_submission.author.name = f"user_{i}"
            
            # Set different timestamps (1 day apart)
            days_ago = 10 - i
            created_date = datetime.datetime.now() - datetime.timedelta(days=days_ago)
            mock_submission.created_utc = created_date.timestamp()
            
            mock_submission.score = 10 + i
            
            # Mock comments
            mock_comments = MagicMock()
            mock_comments.list.return_value = []
            mock_submission.comments = mock_comments
            
            mock_submissions.append(mock_submission)
        
        # Set up the mock Reddit API response
        mock_subreddit.new.return_value = mock_submissions
        mock_reddit.subreddit.return_value = mock_subreddit
        
        # Set date filters (last 5 days)
        end_date = datetime.datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.datetime.now() - datetime.timedelta(days=5)).strftime('%Y-%m-%d')
        
        # Call the function with date filters
        log_dir = "test_log_dir"
        with patch('os.makedirs'), patch('builtins.open', create=True), patch('json.dump'):
            result = fetch_reddit_posts(
                subreddit="python",
                num_posts=10,
                max_comments_per_post=0,  # No comments to speed up the test
                log_dir=log_dir,
                sort="new",
                startDate=start_date,
                endDate=end_date
            )
        
        # Verify the results - should only return posts from the last 5 days
        assert len(result) <= 6  # 6 or fewer posts (0 to 5 days ago)
        
        # Verify each post's timestamp is within the date range
        start_timestamp = datetime.datetime.strptime(start_date, '%Y-%m-%d').timestamp()
        end_timestamp = datetime.datetime.strptime(end_date, '%Y-%m-%d').timestamp() + 86400  # Add 1 day in seconds
        
        for post in result:
            assert post['created_utc'] >= start_timestamp
            assert post['created_utc'] <= end_timestamp
    
    @patch('app.routes.api_topic_model.reddit')
    def test_fetch_reddit_posts_handles_exceptions(self, mock_reddit):
        """Test fetch_reddit_posts handles exceptions gracefully."""
        # Setup mock to raise an exception
        mock_reddit.subreddit.side_effect = Exception("API Error")
        
        # Call the function
        log_dir = "test_log_dir"
        with patch('os.makedirs'), patch('builtins.open', create=True), patch('json.dump'):
            result = fetch_reddit_posts(
                subreddit="python",
                num_posts=5,
                max_comments_per_post=2,
                log_dir=log_dir,
                sort="new"
            )
        
        # Verify that an empty list is returned on error
        assert result == [] 