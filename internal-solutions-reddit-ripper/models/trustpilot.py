"""TrustPilot data models for review collection and processing"""
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime


@dataclass
class TrustPilotReview:
    """Model for a TrustPilot review"""
    id: str  # Unique review identifier
    company_name: str
    company_url: str
    title: str
    body: str
    rating: int  # 1-5 stars
    author: str
    location: Optional[str] = None
    date_published: Optional[datetime] = None
    verified_purchase: bool = False
    helpful_count: int = 0
    company_replied: bool = False
    reply_text: Optional[str] = None

    def to_dict(self):
        """Convert review to dictionary format"""
        return {
            'id': self.id,
            'company_name': self.company_name,
            'company_url': self.company_url,
            'title': self.title,
            'body': self.body,
            'rating': self.rating,
            'author': self.author,
            'location': self.location,
            'date_published': self.date_published.isoformat() if self.date_published else None,
            'verified_purchase': self.verified_purchase,
            'helpful_count': self.helpful_count,
            'company_replied': self.company_replied,
            'reply_text': self.reply_text
        }

    def to_reddit_format(self):
        """Convert TrustPilot review to Reddit-like format for unified processing"""
        return {
            'id': self.id,
            'title': f"{self.rating}⭐ - {self.title}",
            'selftext': self.body,
            'score': self.helpful_count,  # Map helpful votes to Reddit score
            'num_comments': 1 if self.company_replied else 0,
            'created': self.date_published.timestamp() if self.date_published else 0,
            'author': self.author,
            'subreddit': self.company_name.replace(' ', '_'),  # Treat company as subreddit
            'comments': [
                {
                    'author': f'{self.company_name} Support',
                    'body': self.reply_text,
                    'score': 0
                }
            ] if self.company_replied and self.reply_text else []
        }


@dataclass
class TrustPilotCompany:
    """Model for TrustPilot company metadata"""
    name: str
    url: str
    domain: Optional[str] = None
    total_reviews: int = 0
    average_rating: float = 0.0
    rating_distribution: dict = None  # {1: count, 2: count, ..., 5: count}
    trust_score: Optional[float] = None
    category: Optional[str] = None
    verified_company: bool = False

    def __post_init__(self):
        if self.rating_distribution is None:
            self.rating_distribution = {i: 0 for i in range(1, 6)}

    def to_dict(self):
        """Convert company info to dictionary"""
        return {
            'name': self.name,
            'url': self.url,
            'domain': self.domain,
            'total_reviews': self.total_reviews,
            'average_rating': self.average_rating,
            'rating_distribution': self.rating_distribution,
            'trust_score': self.trust_score,
            'category': self.category,
            'verified_company': self.verified_company
        }

    def calculate_metrics(self, reviews: List[TrustPilotReview]):
        """Calculate aggregate metrics from reviews"""
        if not reviews:
            return

        self.total_reviews = len(reviews)

        # Calculate rating distribution and average
        for review in reviews:
            if 1 <= review.rating <= 5:
                self.rating_distribution[review.rating] += 1

        total_rating_points = sum(rating * count for rating, count in self.rating_distribution.items())
        self.average_rating = round(total_rating_points / self.total_reviews, 2) if self.total_reviews > 0 else 0.0


@dataclass
class CollectionJob:
    """Unified model for data collection jobs"""
    job_id: str
    source: str  # 'reddit' or 'trustpilot'
    target: str  # subreddit name or company URL
    status: str  # 'pending', 'running', 'completed', 'error'
    progress: int = 0  # 0-100
    total_items: int = 0
    collected_items: int = 0
    error_message: Optional[str] = None
    files: List[str] = None
    created_at: datetime = None
    completed_at: Optional[datetime] = None

    def __post_init__(self):
        if self.files is None:
            self.files = []
        if self.created_at is None:
            self.created_at = datetime.now()

    def to_dict(self):
        """Convert job to dictionary for JSON response"""
        return {
            'job_id': self.job_id,
            'source': self.source,
            'target': self.target,
            'status': self.status,
            'progress': self.progress,
            'total': self.total_items,
            'collected': self.collected_items,
            'error': self.error_message,
            'files': self.files,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }