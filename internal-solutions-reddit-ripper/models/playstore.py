"""Data models for Google Play Store reviews"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass
class PlayStoreReview:
    """Google Play Store review model"""
    id: str
    app_name: str
    package_name: str
    content: str
    rating: int  # 1-5 stars
    author: str
    author_image: Optional[str] = None
    thumbs_up: int = 0
    version: Optional[str] = None
    date: Optional[datetime] = None
    reply_content: Optional[str] = None
    reply_date: Optional[datetime] = None

    def to_reddit_format(self) -> Dict[str, Any]:
        """Convert Play Store review to Reddit-like format for unified processing"""
        comments = []
        if self.reply_content:
            # Add developer reply as a comment
            comments.append({
                'id': f"{self.id}_reply",
                'author': f"{self.app_name} Developer",
                'body': self.reply_content,
                'score': 0,
                'created': self.reply_date.timestamp() if self.reply_date else 0
            })

        return {
            'id': self.id,
            'title': f"{self.rating}⭐ - {self.content[:100]}..." if len(self.content) > 100 else f"{self.rating}⭐ - {self.content}",
            'selftext': self.content,
            'score': self.thumbs_up,  # Use thumbs up as score
            'num_comments': 1 if self.reply_content else 0,
            'created': self.date.timestamp() if self.date else 0,
            'author': self.author,
            'subreddit': f"playstore_{self.app_name.replace(' ', '_').lower()}",
            'comments': comments,
            'metadata': {
                'version': self.version,
                'author_image': self.author_image,
                'source': 'playstore'
            }
        }


@dataclass
class AppInfo:
    """App information from Google Play Store"""
    name: str
    app_id: str  # Package name for Play Store
    developer: str
    average_rating: float
    total_ratings: int
    current_version: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    store_url: Optional[str] = None
    category: Optional[str] = None
    price: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'name': self.name,
            'app_id': self.app_id,
            'developer': self.developer,
            'average_rating': self.average_rating,
            'total_ratings': self.total_ratings,
            'current_version': self.current_version,
            'description': self.description,
            'icon_url': self.icon_url,
            'store_url': self.store_url,
            'category': self.category,
            'price': self.price
        }