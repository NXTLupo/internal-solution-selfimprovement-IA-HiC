"""Test script for TrustPilot data collection"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.trustpilot_scraper import TrustPilotScraper
from services.collectors import TrustPilotCollector, RedditCollector, CollectorFactory
import json


def test_trustpilot_scraper():
    """Test basic TrustPilot scraping functionality"""
    print("Testing TrustPilot Scraper...")
    print("=" * 50)

    scraper = TrustPilotScraper(rate_limit_seconds=1.0)

    # Test URL extraction
    test_urls = [
        "amazon.com",
        "https://www.trustpilot.com/review/amazon.com",
        "www.netflix.com",
        "trustpilot.com/review/spotify.com"
    ]

    print("\nURL Extraction Tests:")
    for url in test_urls:
        extracted = scraper.extract_company_url(url)
        print(f"  Input: {url}")
        print(f"  Output: {extracted}")
        print()

    # Test actual scraping (limited to 5 reviews for testing)
    print("\nTesting actual scraping (5 reviews from Amazon)...")
    try:
        company_info, reviews = scraper.scrape_reviews(
            company_url="amazon.com",
            max_reviews=5,
            sort_by="recency"
        )

        if company_info:
            print(f"\nCompany Info:")
            print(f"  Name: {company_info.name}")
            print(f"  Average Rating: {company_info.average_rating}")
            print(f"  Total Reviews Found: {company_info.total_reviews}")
            print(f"  Verified Company: {company_info.verified_company}")

        if reviews:
            print(f"\nCollected {len(reviews)} reviews:")
            for i, review in enumerate(reviews[:3], 1):  # Show first 3
                print(f"\n  Review {i}:")
                print(f"    Title: {review.title[:50]}...")
                print(f"    Rating: {review.rating}/5")
                print(f"    Author: {review.author}")
                print(f"    Body: {review.body[:100]}..." if review.body else "    Body: N/A")

            # Test conversion to Reddit format
            print("\n\nTesting Reddit format conversion:")
            reddit_format = reviews[0].to_reddit_format()
            print(json.dumps(reddit_format, indent=2)[:500] + "...")

    except Exception as e:
        print(f"Error during scraping test: {str(e)}")


def test_trustpilot_collector():
    """Test TrustPilot collector with unified interface"""
    print("\n\nTesting TrustPilot Collector Interface...")
    print("=" * 50)

    collector = TrustPilotCollector()

    # Test parameter validation
    print("\nParameter Validation Tests:")

    test_params = [
        {'review_count': 100, 'sort_by': 'recency', 'min_rating': 1},
        {'review_count': 0, 'sort_by': 'recency'},  # Invalid
        {'review_count': 100, 'sort_by': 'invalid'},  # Invalid
        {'review_count': 100, 'min_rating': 6},  # Invalid
    ]

    for params in test_params:
        is_valid, error = collector.validate_params(params)
        print(f"  Params: {params}")
        print(f"  Valid: {is_valid}")
        if error:
            print(f"  Error: {error}")
        print()

    # Test actual collection
    print("\nTesting actual collection (3 reviews)...")
    try:
        result = collector.collect(
            target="spotify.com",
            params={
                'review_count': 3,
                'sort_by': 'recency',
                'min_rating': 1
            }
        )

        print(f"Source: {result['source']}")
        print(f"Items collected: {result['item_count']}")
        print(f"Collected at: {result['collected_at']}")

        if result.get('metadata'):
            print(f"Company metadata available: {result['metadata']['name']}")

        if result['items']:
            print(f"\nFirst item preview:")
            print(json.dumps(result['items'][0], indent=2)[:500] + "...")

    except Exception as e:
        print(f"Error during collection test: {str(e)}")


def test_collector_factory():
    """Test the collector factory"""
    print("\n\nTesting Collector Factory...")
    print("=" * 50)

    # Test supported sources
    sources = CollectorFactory.get_supported_sources()
    print(f"Supported sources: {sources}")

    # Test creating collectors
    for source in sources:
        try:
            collector = CollectorFactory.create_collector(source)
            print(f"✓ Created {source} collector: {collector.__class__.__name__}")
        except Exception as e:
            print(f"✗ Failed to create {source} collector: {str(e)}")

    # Test parameter schemas
    print("\nParameter Schemas:")
    for source in sources:
        schema = CollectorFactory.get_source_params(source)
        print(f"\n{source.upper()} Parameters:")
        for param_name, param_info in schema.items():
            print(f"  {param_name}:")
            print(f"    Type: {param_info.get('type')}")
            print(f"    Label: {param_info.get('label')}")
            if 'default' in param_info:
                print(f"    Default: {param_info['default']}")


def test_comparison():
    """Compare Reddit and TrustPilot data formats"""
    print("\n\nComparing Data Formats...")
    print("=" * 50)

    # Create sample data
    reddit_sample = {
        'id': 'abc123',
        'title': 'Great product discussion',
        'selftext': 'I love this product...',
        'score': 42,
        'num_comments': 5,
        'created': 1234567890,
        'author': 'reddit_user',
        'subreddit': 'products',
        'comments': [
            {'author': 'commenter1', 'body': 'I agree!', 'score': 10}
        ]
    }

    trustpilot_sample = {
        'id': 'xyz789',
        'title': '5⭐ - Excellent service',
        'selftext': 'The customer service was outstanding...',
        'score': 3,  # Helpful votes
        'num_comments': 1,  # Company replied
        'created': 1234567890,
        'author': 'John D.',
        'subreddit': 'Amazon_Inc',  # Company name as subreddit
        'comments': [
            {'author': 'Amazon Inc Support', 'body': 'Thank you for your feedback!', 'score': 0}
        ]
    }

    print("Reddit Format:")
    print(json.dumps(reddit_sample, indent=2))

    print("\nTrustPilot Format (converted to Reddit-like):")
    print(json.dumps(trustpilot_sample, indent=2))

    print("\nKey Mappings:")
    print("  TrustPilot → Reddit")
    print("  -----------------")
    print("  Review Title → Post Title (with rating)")
    print("  Review Body → Post Body")
    print("  Helpful Votes → Score")
    print("  Company Reply → Comments")
    print("  Company Name → Subreddit")


if __name__ == "__main__":
    print("TrustPilot Integration Test Suite")
    print("=================================\n")

    # Run tests
    test_trustpilot_scraper()
    test_trustpilot_collector()
    test_collector_factory()
    test_comparison()

    print("\n\nAll tests completed!")
    print("\nNote: Some tests may fail if TrustPilot's HTML structure has changed.")
    print("The scraper may need updates based on actual HTML inspection.")