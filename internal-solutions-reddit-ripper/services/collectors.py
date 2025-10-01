"""Unified data collection interface for multiple sources"""
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import praw
import json
import uuid
from datetime import datetime
import logging

from models.trustpilot import CollectionJob, TrustPilotReview
from services.trustpilot_scraper import TrustPilotScraper

logger = logging.getLogger(__name__)


class DataCollector(ABC):
    """Abstract base class for data collectors"""

    @abstractmethod
    def collect(self, target: str, params: Dict[str, Any], progress_callback: Optional[callable] = None) -> Dict:
        """
        Collect data from the source

        Args:
            target: Target identifier (subreddit name, company URL, etc.)
            params: Collection parameters specific to the source
            progress_callback: Optional callback for progress updates

        Returns:
            Dictionary with collected data in unified format
        """
        pass

    @abstractmethod
    def validate_params(self, params: Dict[str, Any]) -> tuple[bool, str]:
        """
        Validate collection parameters

        Returns:
            Tuple of (is_valid, error_message)
        """
        pass

    def create_unified_output(self, items: List[Dict]) -> Dict:
        """Create unified output format for all collectors"""
        return {
            'source': self.source_name,
            'collected_at': datetime.now().isoformat(),
            'item_count': len(items),
            'items': items
        }


class RedditCollector(DataCollector):
    """Reddit data collector using PRAW"""

    source_name = "reddit"

    def __init__(self):
        """Initialize Reddit collector with PRAW instance"""
        self.reddit = praw.Reddit(
            client_id="REDACTED",
            client_secret="REDACTED",
            user_agent="web:social_research_posts:v0.0.1 (by u/mike_nxt_humans)",
            check_for_async=False,
            ratelimit_seconds=10
        )

    def collect(self, target: str, params: Dict[str, Any], progress_callback: Optional[callable] = None) -> Dict:
        """
        Collect posts and comments from a subreddit

        Args:
            target: Subreddit name
            params: {
                'post_count': int,
                'time_filter': str ('day', 'week', 'month', 'year', 'all'),
                'comments_per_post': int
            }
        """
        subreddit = target
        post_count = params.get('post_count', 100)
        time_filter = params.get('time_filter', 'year')
        comments_per_post = params.get('comments_per_post', 5)

        items = []

        try:
            # Get submissions
            if time_filter == 'all':
                submissions = self.reddit.subreddit(subreddit).top(limit=post_count)
            else:
                submissions = self.reddit.subreddit(subreddit).top(limit=post_count, time_filter=time_filter)

            for idx, submission in enumerate(submissions):
                # Extract post data
                post_data = {
                    'id': submission.id,
                    'title': submission.title,
                    'selftext': submission.selftext,
                    'score': submission.score,
                    'num_comments': submission.num_comments,
                    'created': submission.created,
                    'author': submission.author.name if submission.author else '[deleted]',
                    'url': submission.url,
                    'permalink': f"https://reddit.com{submission.permalink}",
                    'subreddit': submission.subreddit.display_name,
                    'comments': []
                }

                # Get comments
                submission.comment_sort = "top"
                submission.comments.replace_more(limit=0)
                all_comments = submission.comments.list()
                first_n_comments = all_comments[:comments_per_post]

                for comment in first_n_comments:
                    if hasattr(comment, 'author') and comment.author:
                        post_data['comments'].append({
                            'id': comment.id,
                            'author': comment.author.name,
                            'body': comment.body,
                            'score': comment.score,
                            'created': comment.created
                        })

                items.append(post_data)

                # Update progress
                if progress_callback:
                    progress_callback(idx + 1, post_count)

        except Exception as e:
            logger.error(f"Error collecting Reddit data: {str(e)}")
            raise

        return self.create_unified_output(items)

    def validate_params(self, params: Dict[str, Any]) -> tuple[bool, str]:
        """Validate Reddit collection parameters"""
        post_count = params.get('post_count')
        if not post_count or post_count < 1 or post_count > 1000:
            return False, "Post count must be between 1 and 1000"

        time_filter = params.get('time_filter')
        valid_filters = ['day', 'week', 'month', 'year', 'all']
        if time_filter and time_filter not in valid_filters:
            return False, f"Time filter must be one of: {', '.join(valid_filters)}"

        comments_per_post = params.get('comments_per_post')
        if comments_per_post is not None and (comments_per_post < 0 or comments_per_post > 50):
            return False, "Comments per post must be between 0 and 50"

        return True, ""


class TrustPilotCollector(DataCollector):
    """TrustPilot review collector"""

    source_name = "trustpilot"

    def __init__(self):
        """Initialize TrustPilot collector"""
        self.scraper = TrustPilotScraper(rate_limit_seconds=2.0)

    def collect(self, target: str, params: Dict[str, Any], progress_callback: Optional[callable] = None) -> Dict:
        """
        Collect reviews from TrustPilot

        Args:
            target: Company URL or name
            params: {
                'review_count': int,
                'sort_by': str ('recency', 'rating'),
                'min_rating': int (optional, 1-5)
            }
        """
        review_count = params.get('review_count', 100)
        sort_by = params.get('sort_by', 'recency')
        min_rating = params.get('min_rating', 1)

        try:
            # Scrape reviews
            company_info, reviews = self.scraper.scrape_reviews(
                company_url=target,
                max_reviews=review_count,
                sort_by=sort_by,
                progress_callback=progress_callback
            )

            # Filter by minimum rating if specified
            if min_rating > 1:
                reviews = [r for r in reviews if r.rating >= min_rating]

            # Convert to unified format (Reddit-like structure for compatibility)
            items = []
            for review in reviews:
                items.append(review.to_reddit_format())

            result = self.create_unified_output(items)

            # Add company info to metadata
            if company_info:
                result['metadata'] = company_info.to_dict()

            return result

        except Exception as e:
            logger.error(f"Error collecting TrustPilot data: {str(e)}")
            raise

    def validate_params(self, params: Dict[str, Any]) -> tuple[bool, str]:
        """Validate TrustPilot collection parameters"""
        review_count = params.get('review_count')
        if not review_count or review_count < 1 or review_count > 1000:
            return False, "Review count must be between 1 and 1000"

        sort_by = params.get('sort_by')
        valid_sorts = ['recency', 'rating']
        if sort_by and sort_by not in valid_sorts:
            return False, f"Sort must be one of: {', '.join(valid_sorts)}"

        min_rating = params.get('min_rating')
        if min_rating is not None and (min_rating < 1 or min_rating > 5):
            return False, "Minimum rating must be between 1 and 5"

        return True, ""


class CollectorFactory:
    """Factory class to create appropriate collector instances"""

    _collectors = {
        'reddit': RedditCollector,
        'trustpilot': TrustPilotCollector
    }

    @classmethod
    def create_collector(cls, source: str) -> DataCollector:
        """
        Create a collector instance for the specified source

        Args:
            source: Data source name ('reddit' or 'trustpilot')

        Returns:
            DataCollector instance

        Raises:
            ValueError: If source is not supported
        """
        collector_class = cls._collectors.get(source.lower())
        if not collector_class:
            raise ValueError(f"Unsupported data source: {source}")

        return collector_class()

    @classmethod
    def get_supported_sources(cls) -> List[str]:
        """Get list of supported data sources"""
        return list(cls._collectors.keys())

    @classmethod
    def get_source_params(cls, source: str) -> Dict[str, Any]:
        """Get parameter schema for a data source"""
        schemas = {
            'reddit': {
                'target': {
                    'type': 'string',
                    'label': 'Subreddit Name',
                    'placeholder': 'Enter subreddit name (without r/)',
                    'required': True
                },
                'post_count': {
                    'type': 'number',
                    'label': 'Number of Posts',
                    'default': 100,
                    'min': 1,
                    'max': 1000
                },
                'time_filter': {
                    'type': 'select',
                    'label': 'Time Filter',
                    'options': [
                        {'value': 'day', 'label': 'Past Day'},
                        {'value': 'week', 'label': 'Past Week'},
                        {'value': 'month', 'label': 'Past Month'},
                        {'value': 'year', 'label': 'Past Year'},
                        {'value': 'all', 'label': 'All Time'}
                    ],
                    'default': 'year'
                },
                'comments_per_post': {
                    'type': 'number',
                    'label': 'Comments Per Post',
                    'default': 5,
                    'min': 0,
                    'max': 50
                }
            },
            'trustpilot': {
                'target': {
                    'type': 'string',
                    'label': 'Company URL or Name',
                    'placeholder': 'e.g., amazon.com or https://trustpilot.com/review/amazon.com',
                    'required': True
                },
                'review_count': {
                    'type': 'number',
                    'label': 'Number of Reviews',
                    'default': 100,
                    'min': 1,
                    'max': 1000
                },
                'sort_by': {
                    'type': 'select',
                    'label': 'Sort By',
                    'options': [
                        {'value': 'recency', 'label': 'Most Recent'},
                        {'value': 'rating', 'label': 'Rating'}
                    ],
                    'default': 'recency'
                },
                'min_rating': {
                    'type': 'select',
                    'label': 'Minimum Rating',
                    'options': [
                        {'value': 1, 'label': 'All Ratings'},
                        {'value': 2, 'label': '2+ Stars'},
                        {'value': 3, 'label': '3+ Stars'},
                        {'value': 4, 'label': '4+ Stars'},
                        {'value': 5, 'label': '5 Stars Only'}
                    ],
                    'default': 1
                }
            }
        }

        return schemas.get(source.lower(), {})