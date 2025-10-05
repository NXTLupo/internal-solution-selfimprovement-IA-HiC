"""Analyze structure to improve author and title extraction"""
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

# Find first review
review = soup.select_one('article[class*="reviewCard"]')

if review:
    print("ANALYZING REVIEW STRUCTURE FOR BETTER EXTRACTION:")
    print("=" * 60)

    # Look for author/consumer info
    print("\n1. AUTHOR/CONSUMER INFO:")
    # Check spans with consumer data
    consumer_spans = review.find_all('span')
    for span in consumer_spans[:20]:  # First 20 spans
        text = span.get_text(strip=True)
        if text and len(text) > 1 and len(text) < 50:
            classes = span.get('class', [])
            data_attrs = {k: v for k, v in span.attrs.items() if k.startswith('data-')}
            if not any(char.isdigit() for char in text):  # Avoid dates
                print(f"  Text: '{text}'")
                if classes:
                    print(f"    Classes: {classes}")
                if data_attrs:
                    print(f"    Data attrs: {data_attrs}")

    print("\n2. TITLE/HEADLINE SEARCH:")
    # Look for actual review titles (not author+date)
    # Check all h2 elements
    h2_elements = review.find_all('h2')
    for h2 in h2_elements:
        text = h2.get_text(strip=True)
        print(f"  H2 text: '{text}'")
        print(f"    Classes: {h2.get('class', [])}")

    # Check for data attributes that might contain title
    title_attrs = review.find_all(attrs={'data-review-title': True})
    for elem in title_attrs:
        print(f"  Found data-review-title: {elem.get('data-review-title')}")

    # Check first paragraph for potential title
    first_p = review.find('p')
    if first_p:
        first_line = first_p.get_text().split('\n')[0][:100]
        print(f"  First line of body (potential title): '{first_line}'")

    print("\n3. DIVS WITH CONSUMER/AUTHOR INFO:")
    consumer_divs = review.select('div[class*="consumer"], div[class*="Consumer"]')
    for div in consumer_divs[:5]:
        text = div.get_text(strip=True)[:100]
        print(f"  Div text: '{text}'")
        print(f"    Classes: {div.get('class', [])}")
        # Look for child spans
        child_spans = div.find_all('span', recursive=False)
        for span in child_spans:
            print(f"      Child span: '{span.get_text(strip=True)}'")

else:
    print("No review found!")