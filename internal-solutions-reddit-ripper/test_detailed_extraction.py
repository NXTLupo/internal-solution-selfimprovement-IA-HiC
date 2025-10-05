"""Test detailed extraction of TrustPilot review structure"""
import requests
from bs4 import BeautifulSoup

url = "https://www.trustpilot.com/review/spotify.com"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

print(f"Fetching: {url}")
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.content, 'html.parser')

# Find first review article
review = soup.select_one('article[class*="reviewCard"]')

if review:
    print("FIRST REVIEW STRUCTURE:")
    print("=" * 60)

    # Show all text content in the review
    print("\nAll text in review:")
    texts = [t.strip() for t in review.stripped_strings if t.strip()]
    for i, text in enumerate(texts):
        print(f"{i}: {text[:100]}")

    print("\n" + "=" * 60)
    print("SEARCHING FOR SPECIFIC ELEMENTS:")

    # Look for rating
    print("\nRating elements:")
    # Check data attributes
    for elem in review.find_all(attrs={"data-service-review-rating": True}):
        print(f"  Found rating: {elem.get('data-service-review-rating')}")

    # Check img alt text
    star_imgs = review.find_all('img', alt=True)
    for img in star_imgs:
        if 'star' in img.get('alt', '').lower() or 'rated' in img.get('alt', '').lower():
            print(f"  Star img alt: {img.get('alt')}")

    # Look for title/headline
    print("\nTitle/Headline elements:")
    # Check h2
    h2_elems = review.find_all('h2')
    for h2 in h2_elems:
        print(f"  H2: {h2.get_text(strip=True)[:100]}")

    # Check links with title-like classes
    title_links = review.select('a[class*="link"], a[class*="title"]')
    for link in title_links:
        text = link.get_text(strip=True)
        if text and len(text) > 5:  # Skip very short text
            print(f"  Link text: {text[:100]}")

    # Look for body text
    print("\nBody/Content elements:")
    # Check paragraphs
    paragraphs = review.find_all('p')
    for p in paragraphs:
        text = p.get_text(strip=True)
        if text and len(text) > 20:  # Skip short text
            print(f"  P text: {text[:200]}")
            print(f"    Classes: {p.get('class', [])}")

    # Check divs with text content
    text_divs = review.select('div[class*="text"], div[class*="body"], div[class*="content"]')
    for div in text_divs:
        text = div.get_text(strip=True)
        if text and len(text) > 20 and not any(child.name == 'p' for child in div.children):
            print(f"  Div text: {text[:200]}")

    # Look for author
    print("\nAuthor elements:")
    # Check consumer/name elements
    author_elems = review.select('[data-consumer-name], [class*="consumer"] span, [class*="name"] span')
    for elem in author_elems:
        text = elem.get_text(strip=True)
        if text and len(text) > 1:
            print(f"  Author: {text}")
            if elem.get('data-consumer-name'):
                print(f"    Data attr: {elem.get('data-consumer-name')}")

    # Look for date
    print("\nDate elements:")
    time_elems = review.find_all('time')
    for time_elem in time_elems:
        print(f"  Time: {time_elem.get('datetime', 'No datetime attr')}")
        print(f"  Text: {time_elem.get_text(strip=True)}")

else:
    print("No review found!")