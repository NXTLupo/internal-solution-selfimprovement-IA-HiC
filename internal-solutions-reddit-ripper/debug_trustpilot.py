"""Debug script to test TrustPilot scraping and identify HTML structure"""
import requests
from bs4 import BeautifulSoup
import json

def debug_trustpilot(company_url="spotify.com"):
    """Debug TrustPilot HTML structure"""

    # Build URL
    if 'trustpilot.com' not in company_url:
        url = f"https://www.trustpilot.com/review/{company_url}"
    else:
        url = company_url

    print(f"Fetching: {url}")

    # Headers to avoid blocking
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
    }

    # Fetch page
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Length: {len(response.text)} characters")

    if response.status_code != 200:
        print(f"Error: {response.text[:500]}")
        return

    # Parse HTML
    soup = BeautifulSoup(response.content, 'html.parser')

    # Save HTML for inspection
    with open('trustpilot_debug.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify()[:50000])  # First 50k chars
    print("Saved HTML to trustpilot_debug.html for inspection")

    # Try different selectors for reviews
    selectors_to_try = [
        ('div[class*="reviewCard"]', "Review card with class containing 'reviewCard'"),
        ('article[class*="review"]', "Article with class containing 'review'"),
        ('div[data-service-review-card]', "Div with data-service-review-card attribute"),
        ('div[class*="paper_paper"]', "Paper card elements"),
        ('div[class*="styles_card"]', "Styles card elements"),
        ('section[class*="review"]', "Section with review class"),
        ('div[class*="review-card"]', "Review-card class"),
        ('article', "All article elements"),
        ('div[data-review-id]', "Div with data-review-id"),
        ('div.review', "Div with exact class 'review'"),
    ]

    print("\n" + "="*60)
    print("SEARCHING FOR REVIEW ELEMENTS:")
    print("="*60)

    found_reviews = False
    for selector, description in selectors_to_try:
        elements = soup.select(selector)
        if elements:
            print(f"[FOUND] {len(elements)} elements: {description}")
            print(f"  Selector: {selector}")
            found_reviews = True

            # Show first element's structure
            if elements[0]:
                print(f"  First element classes: {elements[0].get('class', [])}")
                print(f"  First element HTML (truncated):")
                print(f"  {str(elements[0])[:200]}...")
        else:
            print(f"[NOT FOUND] {description}")

    if not found_reviews:
        print("\nNo review elements found with common selectors!")
        print("Searching for any text containing 'review' in class names...")

        # Find all elements with 'review' in class
        all_with_review = soup.find_all(attrs={'class': lambda x: x and 'review' in ' '.join(x).lower() if isinstance(x, list) else x and 'review' in x.lower()})
        if all_with_review:
            print(f"Found {len(all_with_review)} elements with 'review' in class name")
            for i, elem in enumerate(all_with_review[:3]):
                print(f"\nElement {i+1}:")
                print(f"  Tag: {elem.name}")
                print(f"  Classes: {elem.get('class', [])}")
                print(f"  Text preview: {elem.get_text()[:100].strip()}...")

    # Check for company info
    print("\n" + "="*60)
    print("COMPANY INFO:")
    print("="*60)

    # Company name
    company_name = None
    name_selectors = ['h1', 'span[class*="title"]', 'div[class*="businessTitle"]']
    for sel in name_selectors:
        elem = soup.select_one(sel)
        if elem and elem.get_text().strip():
            company_name = elem.get_text().strip()
            print(f"Company Name: {company_name}")
            break

    # Rating
    rating_elem = soup.select_one('span[class*="ratingValue"], p[data-rating]')
    if rating_elem:
        print(f"Rating Element: {rating_elem.get_text().strip()}")

    # Check if page might be using JavaScript rendering
    print("\n" + "="*60)
    print("JAVASCRIPT CHECK:")
    print("="*60)

    script_tags = soup.find_all('script')
    react_found = any('react' in str(script).lower() for script in script_tags)
    next_found = any('next' in str(script).lower() or '_next' in str(script) for script in script_tags)

    if react_found or next_found:
        print("[WARNING] Page appears to use React/Next.js - may need JavaScript rendering!")
        print("   The page might be loading reviews dynamically via JavaScript.")
        print("   Consider using Selenium or Playwright for JavaScript-rendered content.")

    # Look for API endpoints in scripts
    for script in script_tags:
        script_text = str(script)
        if 'api' in script_text.lower() and ('review' in script_text.lower() or 'rating' in script_text.lower()):
            print("\nFound potential API endpoint in script:")
            # Extract potential URLs
            import re
            urls = re.findall(r'["\'](/api/[^"\']+)["\']', script_text)
            for url in urls[:3]:
                print(f"  {url}")

if __name__ == "__main__":
    import sys
    company = sys.argv[1] if len(sys.argv) > 1 else "spotify.com"
    debug_trustpilot(company)