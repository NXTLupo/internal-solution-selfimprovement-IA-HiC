"""TrustPilot scraper service for collecting company reviews"""
import requests
from bs4 import BeautifulSoup
import time
import re
import uuid
from datetime import datetime
from typing import List, Optional, Dict
from urllib.parse import urlparse, urljoin
import logging

from models.trustpilot import TrustPilotReview, TrustPilotCompany

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TrustPilotScraper:
    """Scraper for TrustPilot reviews with rate limiting and error handling"""

    BASE_URL = "https://www.trustpilot.com"
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    }

    def __init__(self, rate_limit_seconds: float = 2.0):
        """
        Initialize TrustPilot scraper

        Args:
            rate_limit_seconds: Delay between requests to be respectful
        """
        self.rate_limit = rate_limit_seconds
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)

    def extract_company_url(self, input_url: str) -> str:
        """
        Extract or construct the TrustPilot company URL

        Args:
            input_url: User input (company name or full URL)

        Returns:
            Normalized TrustPilot company URL
        """
        # If it's already a trustpilot URL, normalize it
        if 'trustpilot.com' in input_url.lower():
            # Extract the company identifier
            match = re.search(r'review/([^/?]+)', input_url)
            if match:
                company_id = match.group(1)
                return f"{self.BASE_URL}/review/{company_id}"

        # Otherwise, treat as company domain/name
        # Clean the input
        company = input_url.lower().strip()
        company = re.sub(r'^https?://', '', company)  # Remove protocol
        company = re.sub(r'^www\.', '', company)  # Remove www
        company = company.split('/')[0]  # Take only domain part

        return f"{self.BASE_URL}/review/{company}"

    def scrape_reviews(
        self,
        company_url: str,
        max_reviews: int = 100,
        sort_by: str = "recency",
        progress_callback: Optional[callable] = None
    ) -> tuple[TrustPilotCompany, List[TrustPilotReview]]:
        """
        Scrape reviews from a TrustPilot company page

        Args:
            company_url: TrustPilot company URL or company name
            max_reviews: Maximum number of reviews to collect
            sort_by: Sort order ('recency', 'rating')
            progress_callback: Optional callback for progress updates

        Returns:
            Tuple of (company_info, list_of_reviews)
        """
        # Normalize company URL
        url = self.extract_company_url(company_url)

        # Add sort parameter
        if sort_by == "rating":
            url += "?sort=rating"

        company_info = None
        all_reviews = []
        page = 1

        while len(all_reviews) < max_reviews:
            try:
                # Construct page URL
                page_url = f"{url}?page={page}" if page > 1 else url

                # Rate limiting
                time.sleep(self.rate_limit)

                # Fetch page
                logger.info(f"Fetching page {page} from {page_url}")
                response = self.session.get(page_url)
                response.raise_for_status()

                soup = BeautifulSoup(response.content, 'html.parser')

                # Extract company info on first page
                if page == 1:
                    company_info = self._extract_company_info(soup, url)

                # Extract reviews from page
                reviews = self._extract_reviews_from_page(soup, company_info.name if company_info else "Unknown")

                if not reviews:
                    logger.info("No more reviews found")
                    break

                all_reviews.extend(reviews)

                # Update progress
                if progress_callback:
                    progress_callback(len(all_reviews), max_reviews)

                # Check if we have enough reviews
                if len(all_reviews) >= max_reviews:
                    all_reviews = all_reviews[:max_reviews]
                    break

                # Check for next page
                if not self._has_next_page(soup):
                    logger.info("No more pages available")
                    break

                page += 1

            except Exception as e:
                logger.error(f"Error scraping page {page}: {str(e)}")
                break

        # Calculate company metrics if we have reviews
        if company_info and all_reviews:
            company_info.calculate_metrics(all_reviews)

        return company_info, all_reviews

    def _extract_company_info(self, soup: BeautifulSoup, url: str) -> TrustPilotCompany:
        """Extract company information from the page"""
        company = TrustPilotCompany(name="Unknown", url=url)

        try:
            # Extract company name - try multiple selectors
            name_elem = soup.find('h1')
            if not name_elem:
                name_elem = soup.find('span', class_='title_displayName__TtDDM')
            if not name_elem:
                # Try to extract from URL as fallback
                import re
                match = re.search(r'/review/([^/?]+)', url)
                if match:
                    company.name = match.group(1).replace('.com', '').title()
            else:
                # Clean up company name - remove "Reviews" and numbers
                raw_name = name_elem.text.strip()
                # Remove "Reviews" and any following text
                if 'Reviews' in raw_name:
                    company.name = raw_name.split('Reviews')[0].strip()
                else:
                    company.name = raw_name

            # Extract domain
            domain_elem = soup.find('a', {'data-company-url-domain': True})
            if domain_elem:
                company.domain = domain_elem.text.strip()

            # Extract average rating
            rating_elem = soup.find('span', class_='typography_heading-m__T_L_X')
            if not rating_elem:
                rating_elem = soup.find('p', {'data-rating-summary': True})
            if rating_elem:
                try:
                    company.average_rating = float(rating_elem.text.strip())
                except ValueError:
                    pass

            # Extract total reviews
            reviews_elem = soup.find('span', class_='typography_body-l__KUYFJ')
            if reviews_elem and 'reviews' in reviews_elem.text.lower():
                match = re.search(r'([\d,]+)\s*reviews?', reviews_elem.text.lower())
                if match:
                    company.total_reviews = int(match.group(1).replace(',', ''))

            # Check if verified
            verified_elem = soup.find('div', {'data-verified-company-badge': True})
            company.verified_company = verified_elem is not None

        except Exception as e:
            logger.error(f"Error extracting company info: {str(e)}")

        return company

    def _extract_reviews_from_page(self, soup: BeautifulSoup, company_name: str) -> List[TrustPilotReview]:
        """Extract all reviews from a page"""
        reviews = []

        # Find review containers - Updated selectors based on current TrustPilot HTML
        # Try article tags with review classes first (most reliable)
        review_cards = soup.select('article[class*="reviewCard"]')
        if not review_cards:
            # Try div with reviewCard classes
            review_cards = soup.select('div[class*="reviewCard"]')
        if not review_cards:
            # Fallback to any article tags
            review_cards = soup.find_all('article')

        for card in review_cards:
            try:
                review = self._parse_review_card(card, company_name)
                if review:
                    reviews.append(review)
            except Exception as e:
                logger.error(f"Error parsing review card: {str(e)}")
                continue

        return reviews

    def _parse_review_card(self, card: BeautifulSoup, company_name: str) -> Optional[TrustPilotReview]:
        """Parse a single review card"""
        try:
            # Generate unique ID
            review_id = str(uuid.uuid4())

            # Extract rating - look for star rating in img alt text
            rating = 0
            # First try data attribute
            rating_elem = card.find('div', {'data-service-review-rating': True})
            if rating_elem:
                rating = int(rating_elem.get('data-service-review-rating', 0))
            else:
                # Look for img with "Rated X out of 5 stars" alt text
                star_imgs = card.find_all('img', alt=re.compile(r'Rated \d+ out of 5 stars'))
                if star_imgs:
                    # Extract rating from alt text
                    alt_text = star_imgs[0].get('alt', '')
                    match = re.search(r'Rated (\d+) out of 5 stars', alt_text)
                    if match:
                        rating = int(match.group(1))
                else:
                    # Fallback: count filled stars
                    star_container = card.find('div', class_='star-rating')
                    if star_container:
                        filled_stars = star_container.find_all('img', alt=re.compile(r'Rated \d'))
                        if filled_stars:
                            rating = len(filled_stars)

            # Extract title - TrustPilot often doesn't have explicit titles
            # Use first line of body as title if no explicit title found
            title = ""

            # Try to find an explicit title in h2 or data attributes
            title_elem = card.find(attrs={'data-review-title': True})
            if title_elem:
                title = title_elem.get('data-review-title', '').strip()

            # If no explicit title, we'll use first line of body later

            # Extract body - look for p tags with CDS_Typography classes
            body = ""
            # First try p tags with CDS_Typography_body classes (current TrustPilot structure)
            body_paragraphs = card.find_all('p')
            for p in body_paragraphs:
                classes = p.get('class', [])
                # Check if any class contains 'CDS_Typography' and 'body'
                if any('CDS_Typography' in cls and 'body' in cls for cls in classes):
                    body = p.get_text(strip=True)
                    break

            # If not found, try other body selectors
            if not body:
                body_elem = card.find('p', class_=lambda x: x and 'body' in str(x).lower())
                if not body_elem:
                    body_elem = card.find('p', class_='review-content__text')
                if not body_elem:
                    body_elem = card.find('div', {'data-service-review-text': True})
                if body_elem:
                    body = body_elem.text.strip()

            # Extract author
            author = "Anonymous"
            # Look for span with data-consumer-name-typography attribute
            author_elem = card.find('span', {'data-consumer-name-typography': True})
            if not author_elem:
                author_elem = card.find('div', class_='consumer-information__name')
            if author_elem:
                author = author_elem.text.strip()

            # Extract location
            location = None
            location_elem = card.find('div', {'data-consumer-country': True})
            if not location_elem:
                location_elem = card.find('div', class_='consumer-information__location')
            if location_elem:
                location_text = location_elem.text.strip()
                # Extract country code or name
                if location_text:
                    location = location_text

            # If no explicit title found, use first sentence or line of body
            if not title and body:
                # Take first sentence (up to period) or first 100 chars
                first_sentence = body.split('.')[0] if '.' in body else body[:100]
                title = first_sentence[:100] if len(first_sentence) > 100 else first_sentence
                # Clean up any "See more" text
                title = title.replace('...See more', '').replace('See more', '').strip()

            # Extract date
            date_published = None
            date_elem = card.find('time')
            if date_elem and date_elem.get('datetime'):
                try:
                    date_published = datetime.fromisoformat(date_elem['datetime'].replace('Z', '+00:00'))
                except:
                    pass

            # Check for verified purchase
            verified = False
            verified_elem = card.find('div', {'data-review-verified': True})
            if not verified_elem:
                verified_elem = card.find('div', class_='review-verification')
            verified = verified_elem is not None

            # Check for company reply
            has_reply = False
            reply_text = None
            reply_section = card.find('div', class_='brand-reply')
            if not reply_section:
                reply_section = card.find('div', {'data-company-reply': True})
            if reply_section:
                has_reply = True
                reply_body = reply_section.find('p')
                if reply_body:
                    reply_text = reply_body.text.strip()

            return TrustPilotReview(
                id=review_id,
                company_name=company_name,
                company_url=self.BASE_URL,
                title=title,
                body=body,
                rating=rating,
                author=author,
                location=location,
                date_published=date_published,
                verified_purchase=verified,
                helpful_count=0,  # Not easily extractable
                company_replied=has_reply,
                reply_text=reply_text
            )

        except Exception as e:
            logger.error(f"Error parsing review: {str(e)}")
            return None

    def _has_next_page(self, soup: BeautifulSoup) -> bool:
        """Check if there's a next page of reviews"""
        # Look for next page button
        next_button = soup.find('a', {'aria-label': 'Next page'})
        if not next_button:
            next_button = soup.find('button', {'name': 'pagination-next'})
        if not next_button:
            # Check pagination list
            pagination = soup.find('nav', {'role': 'navigation', 'aria-label': 'Pagination'})
            if pagination:
                # Check if current page is not the last
                current = pagination.find('a', {'aria-current': 'page'})
                if current:
                    next_sibling = current.find_next_sibling('a')
                    return next_sibling is not None

        return next_button is not None and not next_button.get('disabled')


class TrustPilotAPI:
    """
    Alternative approach using TrustPilot's internal API endpoints
    This is more reliable but undocumented
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        })

    def get_reviews_json(self, company_id: str, page: int = 1) -> Dict:
        """
        Attempt to get reviews via JSON endpoint
        Note: This may require additional reverse engineering
        """
        # TrustPilot may use internal APIs like:
        # https://www.trustpilot.com/api/reviews/{company_id}
        # This would need to be discovered through network inspection
        pass