"""Google Play Store review collector"""
import logging
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
from google_play_scraper import app, reviews, Sort

from services.collectors import DataCollector
from models.playstore import PlayStoreReview, AppInfo

logger = logging.getLogger(__name__)


class PlayStoreCollector(DataCollector):
    """Google Play Store review collector using google-play-scraper"""

    source_name = "playstore"

    def __init__(self):
        """Initialize Play Store collector"""
        pass

    def collect(self, target: str, params: Dict[str, Any], progress_callback: Optional[callable] = None) -> Dict:
        """
        Collect reviews from Google Play Store

        Args:
            target: Package name (e.g., "com.spotify.music")
            params: {
                'review_count': int,
                'language': str (e.g., 'en', 'es', 'fr'),
                'country': str (e.g., 'us', 'gb', 'ca'),
                'sort_by': str ('newest', 'rating', 'helpful')
            }
        """
        review_count = params.get('review_count', 100)
        language = params.get('language', 'en')
        country = params.get('country', 'us')
        sort_by = params.get('sort_by', 'newest')

        try:
            # Get app details first
            logger.info(f"Fetching app details for: {target}")
            app_info = self._get_app_info(target, language, country)

            # Map sort parameter to google_play_scraper Sort enum
            sort_order = Sort.NEWEST
            if sort_by == 'rating':
                sort_order = Sort.RATING
            elif sort_by == 'helpful':
                sort_order = Sort.MOST_RELEVANT

            # Fetch reviews
            logger.info(f"Fetching {review_count} reviews from Play Store")

            # google-play-scraper fetches reviews in batches
            # It returns a tuple: (reviews_list, continuation_token)
            result, _ = reviews(
                target,  # package name
                lang=language,
                country=country,
                sort=sort_order,
                count=review_count
            )

            # Convert reviews to our format
            items = []
            for idx, review_data in enumerate(result[:review_count]):
                review = self._parse_review(review_data, app_info)
                if review:
                    items.append(review.to_reddit_format())

                # Update progress
                if progress_callback:
                    progress_callback(idx + 1, review_count)

            output = self.create_unified_output(items)

            # Add app info to metadata
            if app_info:
                output['metadata'] = app_info.to_dict()

            logger.info(f"Successfully collected {len(items)} reviews")
            return output

        except Exception as e:
            logger.error(f"Error collecting Play Store data: {str(e)}")
            raise

    def _get_app_info(self, package_name: str, language: str, country: str) -> Optional[AppInfo]:
        """Extract app information from Play Store"""
        try:
            # Get app details
            details = app(
                package_name,
                lang=language,
                country=country
            )

            if not details:
                return None

            return AppInfo(
                name=details.get('title', 'Unknown'),
                app_id=package_name,
                developer=details.get('developer', 'Unknown'),
                average_rating=float(details.get('score', 0)),
                total_ratings=int(details.get('ratings', 0)),
                current_version=details.get('version', 'Unknown'),
                description=details.get('description', ''),
                icon_url=details.get('icon', ''),
                store_url=details.get('url', f"https://play.google.com/store/apps/details?id={package_name}"),
                category=details.get('genre', ''),
                price=details.get('price', 0) if details.get('price') else 'Free'
            )
        except Exception as e:
            logger.error(f"Error extracting app info: {str(e)}")
            return None

    def _parse_review(self, review_data: Dict, app_info: AppInfo) -> Optional[PlayStoreReview]:
        """Parse a single review from google-play-scraper format"""
        try:
            # Generate unique ID
            review_id = review_data.get('reviewId', str(uuid.uuid4()))

            # Parse date
            review_date = review_data.get('at')
            if not isinstance(review_date, datetime) and review_date:
                try:
                    review_date = datetime.fromisoformat(str(review_date).replace('Z', '+00:00'))
                except:
                    review_date = None

            # Parse reply date if exists
            reply_date = review_data.get('repliedAt')
            if not isinstance(reply_date, datetime) and reply_date:
                try:
                    reply_date = datetime.fromisoformat(str(reply_date).replace('Z', '+00:00'))
                except:
                    reply_date = None

            return PlayStoreReview(
                id=review_id,
                app_name=app_info.name if app_info else "Unknown",
                package_name=app_info.app_id if app_info else "",
                content=review_data.get('content', ''),
                rating=int(review_data.get('score', 0)),
                author=review_data.get('userName', 'Anonymous'),
                author_image=review_data.get('userImage'),
                thumbs_up=int(review_data.get('thumbsUpCount', 0)),
                version=review_data.get('reviewCreatedVersion'),
                date=review_date,
                reply_content=review_data.get('replyContent'),
                reply_date=reply_date
            )

        except Exception as e:
            logger.error(f"Error parsing review: {str(e)}")
            return None

    def validate_params(self, params: Dict[str, Any]) -> tuple[bool, str]:
        """Validate Play Store collection parameters"""
        review_count = params.get('review_count')
        if not review_count or review_count < 1 or review_count > 1000:
            return False, "Review count must be between 1 and 1000"

        language = params.get('language')
        # Common language codes
        valid_languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'hi', 'ar']
        if language and language not in valid_languages:
            return False, f"Language must be a valid language code (e.g., 'en', 'es', 'fr')"

        country = params.get('country')
        # Common country codes
        valid_countries = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp', 'kr', 'cn', 'br', 'mx', 'in']
        if country and country not in valid_countries:
            return False, f"Country must be a valid country code (e.g., 'us', 'gb', 'ca')"

        sort_by = params.get('sort_by')
        valid_sorts = ['newest', 'rating', 'helpful']
        if sort_by and sort_by not in valid_sorts:
            return False, f"Sort must be one of: {', '.join(valid_sorts)}"

        return True, ""