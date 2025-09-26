"""
Amazon Category Crawler - Enhanced product data extraction module
Part of the NXT HUMANS Intelligence Augmentation Suite
"""

import requests
import logging
import time
import re
import random
import urllib.parse
from selectorlib import Extractor
from typing import List, Dict, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load the category selectors
category_extractor = Extractor.from_yaml_file('category_selectors.yml')

# Browser headers
def get_headers() -> Dict[str, str]:
    """Generate realistic browser headers with randomized User-Agent"""
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ]
    
    return {
        'User-Agent': random.choice(user_agents),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    }

def is_valid_amazon_url(url: str) -> bool:
    """Validate if the URL is an Amazon category or search URL"""
    # If it's already a URL
    if url.startswith('http'):
        if 'amazon.' not in url.lower():
            return False
        
        # Check if this is likely a category or search URL
        indicators = ['/s?', '/b?', '/b/', '/gp/browse', '/s?k=', '/s/ref=']
        return any(indicator in url for indicator in indicators)
    
    # If it's not a URL, it's probably a search term, which is valid
    return True

def normalize_url(url: str) -> str:
    """Normalize Amazon category URL or convert search term to URL"""
    # If it's not a URL, convert it to an Amazon search URL
    if not url.startswith('http'):
        # Clean and encode the search term
        search_term = url.strip()
        encoded_term = urllib.parse.quote_plus(search_term)
        return f"https://www.amazon.com/s?k={encoded_term}"
    
    # For actual URLs, normalize them
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    
    # Keep only essential query parameters
    essential_params = ['k', 'i', 'rh', 'node', 'ref', 'page']
    filtered_query = {k: v for k, v in query.items() if k in essential_params}
    
    # Rebuild the URL with only essential parameters
    clean_query = urllib.parse.urlencode(filtered_query, doseq=True)
    clean_url = urllib.parse.urlunparse((
        parsed.scheme, 
        parsed.netloc, 
        parsed.path,
        parsed.params,
        clean_query,
        ''  # No fragment
    ))
    
    return clean_url

def extract_products_from_page(html: str) -> List[Dict[str, Any]]:
    """Extract product listings from a category page HTML"""
    # Safety check for input
    if not html or not isinstance(html, str):
        logger.error(f"Invalid HTML content type: {type(html)}")
        return []
        
    try:
        data = category_extractor.extract(html)
        
        if not data or not data.get('products'):
            logger.warning("No products found in the HTML")
            return []
    except Exception as e:
        logger.error(f"Error extracting data from HTML: {str(e)}")
        return []
    
    products = []
    for product in data['products']:
        # Skip empty products or those without ASINs
        if not product or not product.get('asin'):
            continue
            
        # Process product data
        processed_product = {
            'asin': product.get('asin', ''),
            'title': product.get('title', '').strip() if product.get('title') else '',
            'image': product.get('image', ''),
            'price': None,
            'rating': None,
            'review_count': None,
            'url': ''
        }
        
        # Process URL
        if product.get('url'):
            url = product['url']
            if not url.startswith('http'):
                # Handle relative URLs
                url = f"https://www.amazon.com{url}"
            processed_product['url'] = url
            
        # Process price (extract numbers only)
        if product.get('price') and isinstance(product.get('price'), str):
            price_text = product['price']
            try:
                price_match = re.search(r'([\d.,]+)', price_text)
                if price_match:
                    processed_product['price'] = price_match.group(1)
            except Exception as e:
                logger.warning(f"Error processing price: {e}")
                
        # Process rating (extract the number from "4.5 out of 5 stars")
        if product.get('rating') and isinstance(product.get('rating'), str):
            rating_text = product['rating']
            try:
                rating_match = re.search(r'([\d.]+)', rating_text)
                if rating_match:
                    processed_product['rating'] = float(rating_match.group(1))
            except Exception as e:
                logger.warning(f"Error processing rating: {e}")
                
        # Process review count (extract number from "1,234 ratings")
        if product.get('review_count') and isinstance(product.get('review_count'), str):
            review_text = product['review_count']
            try:
                review_match = re.search(r'([\d,]+)', review_text)
                if review_match:
                    processed_product['review_count'] = int(review_match.group(1).replace(',', ''))
            except Exception as e:
                logger.warning(f"Error processing review count: {e}")
        
        # Add to products list
        products.append(processed_product)
    
    return products

def get_next_page_url(html: str, current_url: str) -> Optional[str]:
    """Extract the next page URL from pagination"""
    data = category_extractor.extract(html)
    
    if not data or not data.get('pagination'):
        return None
        
    # Look for "Next" or ">" link in pagination
    for page in data['pagination']:
        text = page.get('text', '').strip().lower()
        url = page.get('url')
        
        if text in ['next', 'next page', '>'] and url:
            if not url.startswith('http'):
                # Handle relative URLs
                parsed = urllib.parse.urlparse(current_url)
                base = f"{parsed.scheme}://{parsed.netloc}"
                return f"{base}{url}"
            return url
    
    return None

def crawl_category(url: str, max_products: int = 50, max_pages: int = 5) -> List[Dict[str, Any]]:
    """
    Crawl an Amazon category page and extract products.
    
    Args:
        url: The Amazon category URL to crawl
        max_products: Maximum number of products to extract
        max_pages: Maximum number of pages to crawl
        
    Returns:
        List of product dictionaries
    """
    if not is_valid_amazon_url(url):
        logger.error(f"Invalid Amazon category URL or search term: {url}")
        return []
    
    # Normalize the URL
    current_url = normalize_url(url)
    
    all_products = []
    page_count = 0
    
    while current_url and page_count < max_pages and len(all_products) < max_products:
        logger.info(f"Crawling page {page_count + 1}: {current_url}")
        
        try:
            # Get the page with a random delay to avoid detection
            time.sleep(random.uniform(1, 3))  # Random delay between 1-3 seconds
            response = requests.get(current_url, headers=get_headers(), timeout=15)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch page {page_count + 1}: Status code {response.status_code}")
                break
                
            # Safety check for response content and extract products
            try:
                if hasattr(response, 'text') and response.text:
                    html_content = response.text
                    products = extract_products_from_page(html_content)
                else:
                    logger.warning("Response does not contain text content")
                    products = []
            except Exception as ex:
                logger.error(f"Error extracting products from page: {str(ex)}")
                products = []
            
            if not products:
                logger.warning(f"No products found on page {page_count + 1}")
                break
                
            # Add products to the list (up to max_products)
            remaining = max_products - len(all_products)
            all_products.extend(products[:remaining])
            
            # Stop if we've reached the maximum number of products
            if len(all_products) >= max_products:
                break
                
            # Get the URL of the next page
            current_url = get_next_page_url(response.text, current_url)
            page_count += 1
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching page {page_count + 1}: {str(e)}")
            break
        except Exception as e:
            logger.error(f"Unexpected error on page {page_count + 1}: {str(e)}")
            break
    
    logger.info(f"Crawling completed. Extracted {len(all_products)} products from {page_count + 1} pages.")
    return all_products

def get_category_products(url: str, limit: int = 50) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Get products from an Amazon category page or search term with error handling.
    
    Args:
        url: The Amazon category URL or search term
        limit: Maximum number of products to return
        
    Returns:
        Tuple of (products list, error message)
    """
    try:
        if not url or not isinstance(url, str):
            return [], "Invalid search term or URL provided"
            
        if not is_valid_amazon_url(url):
            return [], "Input doesn't appear to be a valid Amazon search term or URL"
            
        products = crawl_category(url, max_products=limit)
        
        if not products:
            return [], f"No products found for: {url}"
            
        return products, None
    except Exception as e:
        logger.error(f"Error extracting products: {str(e)}")
        return [], f"Error: {str(e)}"