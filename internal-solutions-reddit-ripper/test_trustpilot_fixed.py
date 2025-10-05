"""Test TrustPilot scraper after fixing selectors"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.trustpilot_scraper import TrustPilotScraper
import json

def test_fixed_scraper():
    """Test the fixed TrustPilot scraper"""
    print("Testing TrustPilot scraper with fixed selectors...")
    print("=" * 60)

    scraper = TrustPilotScraper(rate_limit_seconds=1.0)

    # Test with Spotify
    company_info, reviews = scraper.scrape_reviews(
        company_url="spotify.com",
        max_reviews=5,
        sort_by="recency"
    )

    print(f"\nCompany: {company_info.name if company_info else 'Unknown'}")
    print(f"Total Reviews Found: {len(reviews)}")
    print("-" * 60)

    # Show details of each review
    for i, review in enumerate(reviews, 1):
        print(f"\nReview {i}:")
        print(f"  Rating: {'*' * review.rating} ({review.rating}/5)")
        print(f"  Author: {review.author}")
        print(f"  Date: {review.date_published}")
        print(f"  Title: {review.title[:100] if review.title else 'No title'}")
        print(f"  Body: {review.body[:200] if review.body else 'No body'}...")
        print(f"  Verified: {review.verified_purchase}")

    # Save to JSON for inspection
    output = {
        "company": {
            "name": company_info.name if company_info else "Unknown",
            "url": company_info.url if company_info else "",
            "average_rating": company_info.average_rating if company_info else 0,
            "total_reviews": company_info.total_reviews if company_info else 0
        },
        "reviews": [
            {
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "author": r.author,
                "date": str(r.date_published) if r.date_published else None,
                "verified": r.verified_purchase
            }
            for r in reviews
        ]
    }

    with open('trustpilot_test_output.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"Test complete! Results saved to trustpilot_test_output.json")
    print(f"Reviews extracted: {len(reviews)}")
    print(f"Reviews with body text: {sum(1 for r in reviews if r.body)}")
    print(f"Reviews with titles: {sum(1 for r in reviews if r.title)}")

    return len(reviews) > 0 and any(r.body for r in reviews)

if __name__ == "__main__":
    success = test_fixed_scraper()
    if success:
        print("\n✅ SUCCESS: Scraper is extracting reviews with content!")
    else:
        print("\n❌ FAILED: Reviews still not extracting properly")