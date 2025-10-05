"""Simple test to extract TrustPilot reviews using updated selectors"""
import requests
from bs4 import BeautifulSoup
import json

def test_trustpilot():
    url = "https://www.trustpilot.com/review/spotify.com"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }

    print(f"Fetching: {url}")
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')

    # Find reviews using article tags
    reviews = soup.select('article[class*="reviewCard"]')

    print(f"Found {len(reviews)} reviews")

    extracted_reviews = []

    for i, review_elem in enumerate(reviews[:5], 1):  # Get first 5 reviews
        print(f"\n--- Review {i} ---")

        # Extract rating - look for star rating indicators
        rating = 0
        # Try different rating selectors
        rating_elem = review_elem.select_one('[data-service-review-rating]')
        if rating_elem:
            rating = rating_elem.get('data-service-review-rating', '0')
        else:
            # Count star images
            star_imgs = review_elem.select('img[alt*="Rated"]')
            if star_imgs:
                rating = len(star_imgs)
            else:
                # Try to find rating in class names or data attributes
                for elem in review_elem.select('*[class*="star"], *[data-rating]'):
                    class_str = ' '.join(elem.get('class', []))
                    if 'star-rating' in class_str.lower():
                        # Try to extract number
                        import re
                        match = re.search(r'(\d)', str(elem))
                        if match:
                            rating = match.group(1)
                            break

        # Extract title/headline
        title = ""
        title_elem = review_elem.select_one('h2, [class*="title"], a[class*="link"]')
        if title_elem:
            title = title_elem.get_text(strip=True)

        # Extract review body
        body = ""
        body_elem = review_elem.select_one('p[class*="body"], p[class*="text"], div[class*="body"], div[class*="text"]')
        if body_elem:
            body = body_elem.get_text(strip=True)

        # Extract author
        author = ""
        author_elem = review_elem.select_one('[data-consumer-name], [class*="consumer"] span, [class*="name"]')
        if author_elem:
            author = author_elem.get_text(strip=True)

        # Extract date
        date = ""
        time_elem = review_elem.select_one('time')
        if time_elem:
            date = time_elem.get('datetime', '')

        print(f"Rating: {rating}")
        print(f"Title: {title[:50]}...")
        print(f"Author: {author}")
        print(f"Date: {date}")
        print(f"Body: {body[:100]}...")

        extracted_reviews.append({
            'rating': rating,
            'title': title,
            'author': author,
            'date': date,
            'body': body
        })

    # Save to JSON
    with open('extracted_reviews.json', 'w', encoding='utf-8') as f:
        json.dump(extracted_reviews, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(extracted_reviews)} reviews to extracted_reviews.json")

if __name__ == "__main__":
    test_trustpilot()