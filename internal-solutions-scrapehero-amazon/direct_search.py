"""
Direct Amazon Search Module
Provides a more reliable way to search Amazon products by direct HTML extraction
"""

import logging
import requests
import re
import random
import time
import json
import math
import datetime
from typing import List, Dict, Any, Optional, Tuple

# Configure logging
logger = logging.getLogger(__name__)

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

def direct_amazon_search(search_term: str, max_products: int = 50, max_attempts: int = 3, use_fallback: bool = False, sort_by: str = 'default', trending_range: int = 30) -> List[Dict[str, Any]]:
    """
    Perform a direct Amazon search with more reliable extraction
    
    Args:
        search_term: The product to search for
        max_products: Maximum number of products to return
        max_attempts: Maximum number of attempts to make
        use_fallback: Whether to use fallback mock data if no results found (disabled by default)
        sort_by: Sorting method ('default', 'trending', 'rating', 'price_high', 'price_low')
        trending_range: Number of days to consider for trending calculation (7, 30, 90, 365)
        
    Returns:
        List of product dictionaries
    """
    logger.info(f"Performing direct Amazon search for: {search_term}")
    
    # No test mode or mock data - only real Amazon search results
        
    # Clean the search term and create the search URL
    # Make sure we decode first in case it's already encoded
    try:
        import urllib.parse
        decoded_term = urllib.parse.unquote(search_term.strip())
        clean_term = urllib.parse.quote_plus(decoded_term)
    except Exception as e:
        logger.warning(f"URL encoding error: {str(e)}, falling back to simple replace")
        clean_term = search_term.strip().replace(' ', '+')
    
    # Try different Amazon domains to avoid regional restrictions
    search_urls = [
        f"https://www.amazon.com/s?k={clean_term}&ref=nb_sb_noss",
        f"https://www.amazon.co.uk/s?k={clean_term}&ref=nb_sb_noss", 
        f"https://www.amazon.ca/s?k={clean_term}&ref=nb_sb_noss"
    ]
    
    # Log the primary search URL
    logger.info(f"Using primary search URL: {search_urls[0]}")
    
    attempts = 0
    for search_url in search_urls:
        while attempts < max_attempts:
            try:
                # Add a small delay to avoid rate limits
                time.sleep(random.uniform(1, 2))
                
                # Make the request with a randomized user agent
                headers = get_headers()
                logger.info(f"Attempt {attempts + 1}: Requesting {search_url}")
                try:
                    # Use a session with keep-alive and additional headers to appear more like a real browser
                    session = requests.Session()
                    session.headers.update(headers)
                    # Add cookies and referrers to appear more like a real browser session
                    session.cookies.update({
                        'session-id': f"{random.randint(100000000, 999999999)}",
                        'session-token': f"{random.randint(100000000, 999999999)}-{random.randint(1000000, 9999999)}"
                    })
                    
                    response = session.get(
                        search_url, 
                        headers=headers, 
                        timeout=15,
                        allow_redirects=True
                    )
                    
                    # Save a copy of the response for debugging
                    with open(f"amazon_response_{attempts}.html", "w", encoding="utf-8") as f:
                        f.write(response.text[:2000])  # Only save the first 2000 chars for debugging
                    
                    if response.status_code != 200:
                        logger.error(f"Failed to fetch search results from {search_url}: Status code {response.status_code}")
                        attempts += 1
                        continue
                except requests.exceptions.RequestException as req_err:
                    logger.error(f"Request error on attempt {attempts+1} for {search_url}: {str(req_err)}")
                    attempts += 1
                    continue
                
                # Extract product data using regex - more reliable than CSS selectors
                # for direct product extraction
                html_content = response.text
                
                # First check if we can extract JSON data directly
                json_match = re.search(r'data-components-state="([^"]+)"', html_content)
            
                if json_match:
                    try:
                        # Get the JSON data and decode it
                        json_data = json_match.group(1)
                        json_data = json_data.replace('&quot;', '"').replace('&amp;', '&')
                        data = json.loads(json_data)
                        
                        # Try to extract product information from the JSON
                        products = extract_from_json(data)
                        if products:
                            return products
                    except Exception as e:
                        logger.warning(f"JSON extraction failed: {str(e)}")
                
                # Fallback to regex extraction if JSON extraction failed
                products = extract_with_regex(html_content, max_products=max_products)
                
                # If we found products, return them
                if products:
                    # Apply trending scores if requested
                    if sort_by == 'trending':
                        products = calculate_trending_scores(products, trending_range)
                    elif products and len(products) > 1:
                        # Apply other sorting methods
                        if sort_by == 'rating':
                            # Sort by rating (high to low)
                            products.sort(key=lambda p: float(p.get('rating', 0)) if p.get('rating') else 0, reverse=True)
                        elif sort_by == 'price_high':
                            # Sort by price (high to low)
                            products.sort(key=lambda p: float(re.sub(r'[^\d.]', '', p.get('price', '0'))) if p.get('price') else 0, reverse=True)
                        elif sort_by == 'price_low':
                            # Sort by price (low to high)
                            products.sort(key=lambda p: float(re.sub(r'[^\d.]', '', p.get('price', '0'))) if p.get('price') else float('inf'))
                    
                    return products
                    
                # If we didn't find products, try again
                logger.warning(f"No products found in attempt {attempts + 1}")
                attempts += 1
            
            except Exception as e:
                logger.error(f"Error in search attempt {attempts + 1}: {str(e)}")
                attempts += 1
    
    # If we get here, all attempts failed
    logger.error(f"All {max_attempts} search attempts failed for {search_term}")
        
    # No fallback to mock data, just return an empty list
    return []

def calculate_trending_scores(products: List[Dict[str, Any]], trending_range: int = 30) -> List[Dict[str, Any]]:
    """
    Calculate trending scores for products based on reviews, ratings, and estimated sales
    
    Args:
        products: List of product dictionaries
        trending_range: Number of days to consider for trending (7, 30, 90, 365)
        
    Returns:
        List of products with added trending scores
    """
    if not products:
        return products
        
    # Create a copy of the products to avoid modifying the original
    trending_products = products.copy()
    
    # Calculate base trending scores
    for product in trending_products:
        # Base score starts at 1
        trending_score = 1.0
        
        # Factor 1: Review count - More reviews generally means more sales
        review_count = 0
        if product.get('review_count'):
            try:
                if isinstance(product['review_count'], str):
                    review_count = int(product['review_count'].replace(',', ''))
                else:
                    review_count = int(product['review_count'])
                    
                # Logarithmic scaling for review count (to prevent extremely popular products from dominating)
                if review_count > 0:
                    trending_score *= (1 + math.log10(min(review_count, 10000)))
            except (ValueError, TypeError):
                pass
                
        # Factor 2: Rating - Higher rated products tend to sell better
        if product.get('rating'):
            try:
                rating = float(product['rating']) if isinstance(product['rating'], (int, float)) else float(re.search(r'([0-9.]+)', str(product['rating'])).group(1))
                # Rating factor (1-5 scale, converted to 0.5-1.5 multiplier)
                rating_factor = 0.5 + (rating / 5.0)
                trending_score *= rating_factor
            except (ValueError, TypeError, AttributeError):
                pass
                
        # Factor 3: Price - Used to estimate sales volume (inverse relationship with price)
        price_value = None
        if product.get('price'):
            try:
                price_str = product['price']
                # Remove currency symbols and commas
                price_str = re.sub(r'[^\d.,]', '', price_str)
                # Handle different decimal/thousand separators
                if ',' in price_str and '.' in price_str:
                    if price_str.find(',') > price_str.find('.'):
                        price_str = price_str.replace('.', '').replace(',', '.')
                    else:
                        price_str = price_str.replace(',', '')
                elif ',' in price_str:
                    # Assume comma is decimal separator if it's near the end
                    if len(price_str) - price_str.rfind(',') <= 3:
                        price_str = price_str.replace(',', '.')
                    else:
                        price_str = price_str.replace(',', '')
                price_value = float(price_str)
                
                # Price factor (inverse relationship with price)
                # Higher priced items sell less, lower priced items sell more
                if price_value > 0:
                    price_factor = 1.0 / math.sqrt(price_value)
                    trending_score *= min(price_factor * 10, 2.0)  # Cap the price influence
            except (ValueError, TypeError):
                pass
                
        # Factor 4: Recency bonus - we don't have actual timestamps, so this is approximate
        # We'll use a random factor here as proxy for recent sales
        recency_bonus = 1.0
        if trending_range <= 7:
            # For very short ranges, recency matters more (higher variance)
            recency_bonus = random.uniform(0.5, 2.0)
        elif trending_range <= 30:
            recency_bonus = random.uniform(0.7, 1.7)
        else:
            # For longer ranges, recency matters less
            recency_bonus = random.uniform(0.8, 1.3)
            
        trending_score *= recency_bonus
        
        # Save the trending score
        product['trending_score'] = round(trending_score, 2)
        
        # Estimate sales based on trending score, reviews, and price
        sales_estimate = 0
        if review_count > 0 and price_value:
            # Rough estimate: For every review, there are X purchases
            # This varies by product category and price point
            review_to_purchase_ratio = 20  # Assume 1 review per 20 purchases
            base_sales = review_count * review_to_purchase_ratio
            
            # Adjust for price (higher priced items get reviewed more often)
            if price_value < 20:
                review_to_purchase_ratio = 30  # Lower priced items get fewer reviews per purchase
            elif price_value > 100:
                review_to_purchase_ratio = 10  # Higher priced items get more reviews per purchase
                
            # Calculate estimated monthly sales 
            monthly_factor = 30 / trending_range if trending_range > 0 else 1
            estimated_monthly_sales = base_sales * monthly_factor
            
            # Format the sales estimate
            if estimated_monthly_sales > 1000:
                product['sales_estimate'] = f"{round(estimated_monthly_sales/1000, 1)}K/month"
            else:
                product['sales_estimate'] = f"{int(estimated_monthly_sales)}/month"
    
    # Sort products by trending score if we have more than one
    if len(trending_products) > 1:
        trending_products.sort(key=lambda x: x.get('trending_score', 0), reverse=True)
        
        # Add trending rank
        for i, product in enumerate(trending_products):
            product['trending_rank'] = i + 1
    
    return trending_products

def extract_with_regex(html_content: str, max_products: int = 50) -> List[Dict[str, Any]]:
    """
    Extract product information using regex patterns
    
    Args:
        html_content: HTML content from Amazon search
        max_products: Maximum number of products to extract
        
    Returns:
        List of product dictionaries
    """
    products = []
    
    try:
        # Extract ASIN product IDs
        asin_pattern = r'data-asin="([A-Z0-9]{10})"'
        asin_matches = re.findall(asin_pattern, html_content)
        
        if not asin_matches:
            logger.warning("No ASIN matches found")
            return []
            
        # Deduplicate ASINs
        unique_asins = list(set(asin_matches))
        logger.info(f"Found {len(unique_asins)} unique ASINs: {unique_asins[:5]}...")
        
        # For each ASIN, try to extract the product details
        for asin in unique_asins[:max_products]:  # Use the requested limit
            product = {
                'asin': asin,
                'url': f"https://www.amazon.com/dp/{asin}",
                'title': None,
                'image': None,
                'price': None,
                'rating': None,
                'review_count': None
            }
            
            # Find the section that contains this ASIN
            asin_block_pattern = rf'<div[^>]*data-asin="{asin}"[^>]*>(.*?)</div>\s*</div>\s*</div>\s*</div>\s*</div>'
            asin_block_match = re.search(asin_block_pattern, html_content, re.DOTALL)
            
            if not asin_block_match:
                # Try a more permissive pattern
                asin_block_pattern = rf'data-asin="{asin}"[^>]*>(.*?)data-asin='
                asin_block_match = re.search(asin_block_pattern, html_content, re.DOTALL)
            
            if asin_block_match:
                block_content = asin_block_match.group(1)
                
                # Extract title
                title_pattern = r'<span class="a-size-[^"]*"[^>]*>([^<]+)</span>'
                title_match = re.search(title_pattern, block_content)
                if title_match:
                    product['title'] = title_match.group(1).strip()
                
                # Extract image - try to find high-quality images using more specific patterns first
                # Try to match the high-res Amazon image pattern
                hi_res_img_pattern = r'<img[^>]*src="(https://m\.media-amazon\.com/images/I/[A-Za-z0-9%-._]+)"[^>]*>'
                hi_res_match = re.search(hi_res_img_pattern, block_content)
                if hi_res_match:
                    img_url = hi_res_match.group(1)
                    # Ensure we get the largest version of the image
                    img_url = re.sub(r'\._[A-Z0-9]+_\.', '._AC_SL1500_.', img_url)
                    product['image'] = img_url
                else:
                    # Fallback to any image
                    image_pattern = r'<img[^>]*src="([^"]+)"[^>]*>'
                    image_match = re.search(image_pattern, block_content)
                    if image_match:
                        product['image'] = image_match.group(1)
                
                # Extract price
                price_pattern = r'<span class="a-price"[^>]*><span[^>]*>([^<]+)</span>'
                price_match = re.search(price_pattern, block_content)
                if price_match:
                    product['price'] = price_match.group(1).strip()
                
                # Extract rating
                rating_pattern = r'<span class="a-icon-alt">([0-9.]+) out of 5 stars</span>'
                rating_match = re.search(rating_pattern, block_content)
                if rating_match:
                    product['rating'] = float(rating_match.group(1))
                
                # Extract review count
                review_pattern = r'>([0-9,]+) ratings?<'
                review_match = re.search(review_pattern, block_content)
                if review_match:
                    product['review_count'] = review_match.group(1).replace(',', '')
            
            # Only add products with at least a title
            if product.get('title'):
                products.append(product)
    
    except Exception as e:
        logger.error(f"Error in regex extraction: {str(e)}")
    
    return products

def extract_from_json(json_data: Dict) -> List[Dict[str, Any]]:
    """
    Extract product information from Amazon's JSON data
    
    Args:
        json_data: JSON data from Amazon search page
        
    Returns:
        List of product dictionaries
    """
    products = []
    
    try:
        # Log the top-level keys to better understand the structure
        logger.info(f"Top-level JSON keys: {list(json_data.keys())[:10]}...")
        
        # Navigate through the complex JSON structure
        for key, component in json_data.items():
            if isinstance(component, dict) and 'results' in component:
                results = component.get('results', [])
                logger.info(f"Found {len(results)} results in component '{key}'")
                
                for result in results:
                    if not isinstance(result, dict):
                        continue
                    
                    # Log the first result's structure to help understand the data format
                    if len(products) == 0 and result:
                        logger.info(f"Sample result keys: {list(result.keys())[:10]}...")
                        
                    asin = result.get('asin')
                    if not asin:
                        continue
                    
                    # Create a base product dictionary
                    product = {
                        'asin': asin,
                        'url': f"https://www.amazon.com/dp/{asin}",
                        'title': None,
                        'image': None,
                        'price': None,
                        'rating': None,
                        'review_count': None
                    }
                    
                    # Extract title - handle different JSON structures
                    if 'title' in result:
                        if isinstance(result['title'], str):
                            product['title'] = result['title']
                        elif isinstance(result['title'], dict) and 'text' in result['title']:
                            product['title'] = result['title']['text']
                        elif isinstance(result['title'], dict) and 'value' in result['title']:
                            product['title'] = result['title']['value']
                    
                    # Extract image URLs with fallbacks for different JSON structures
                    if 'image' in result:
                        if isinstance(result['image'], str):
                            product['image'] = result['image']
                        elif isinstance(result['image'], dict):
                            # Try common image URL fields
                            for field in ['src', 'url', 'large', 'hiRes']:
                                if field in result['image'] and result['image'][field]:
                                    product['image'] = result['image'][field]
                                    break
                    
                    # Look for images in nested structures
                    if not product['image'] and 'images' in result:
                        if isinstance(result['images'], list) and len(result['images']) > 0:
                            # Take the first image from the list
                            img = result['images'][0]
                            if isinstance(img, str):
                                product['image'] = img
                            elif isinstance(img, dict) and 'url' in img:
                                product['image'] = img['url']
                        elif isinstance(result['images'], dict):
                            # Try common image types in order of preference
                            for img_type in ['hiRes', 'large', 'medium', 'thumb', 'small']:
                                if img_type in result['images'] and result['images'][img_type]:
                                    product['image'] = result['images'][img_type]
                                    break
                    
                    # If still no image, try ASIN-based URL construction as last resort
                    if not product['image'] or not isinstance(product['image'], str):
                        # Construct a likely Amazon image URL based on ASIN
                        product['image'] = f"https://m.media-amazon.com/images/I/{asin}._AC_SL1500_.jpg"
                    
                    # Extract price with fallbacks
                    if 'price' in result:
                        price_data = result['price']
                        if isinstance(price_data, str):
                            product['price'] = price_data
                        elif isinstance(price_data, dict):
                            # Try common price fields
                            for field in ['displayString', 'formatted', 'value', 'whole', 'amount']:
                                if field in price_data and price_data[field]:
                                    price_value = price_data[field]
                                    if isinstance(price_value, (int, float)):
                                        product['price'] = f"${price_value}"
                                    else:
                                        product['price'] = price_value
                                    break
                    
                    # Extract rating with fallbacks
                    if 'rating' in result:
                        rating_data = result['rating']
                        if isinstance(rating_data, (int, float)):
                            product['rating'] = float(rating_data)
                        elif isinstance(rating_data, str) and rating_data.replace('.', '', 1).isdigit():
                            product['rating'] = float(rating_data)
                        elif isinstance(rating_data, dict):
                            # Try common rating fields
                            for field in ['rating', 'value', 'average', 'score']:
                                if field in rating_data and rating_data[field]:
                                    try:
                                        product['rating'] = float(rating_data[field])
                                        break
                                    except (ValueError, TypeError):
                                        pass
                    
                    # Extract review count with fallbacks
                    if 'review_count' in result and result['review_count']:
                        product['review_count'] = result['review_count']
                    elif 'reviews' in result:
                        if isinstance(result['reviews'], dict) and 'count' in result['reviews']:
                            product['review_count'] = result['reviews']['count']
                        elif isinstance(result['reviews'], dict) and 'total' in result['reviews']:
                            product['review_count'] = result['reviews']['total']
                    elif 'rating' in result and isinstance(result['rating'], dict):
                        if 'count' in result['rating']:
                            product['review_count'] = result['rating']['count']
                        elif 'reviewCount' in result['rating']:
                            product['review_count'] = result['rating']['reviewCount']
                    
                    # Only add products with at least a title or ASIN
                    if product.get('title') or product.get('asin'):
                        # Make sure product has a title even if it wasn't found
                        if not product['title']:
                            product['title'] = f"Amazon Product {asin}"
                        products.append(product)
                        
                # If we have found at least 5 products, consider it a success
                if len(products) >= 5:
                    break
    
    except Exception as e:
        logger.error(f"Error in JSON extraction: {str(e)}")
    
    return products

def generate_mock_products(count: int = 10, search_term: str = "product") -> List[Dict[str, Any]]:
    """
    Generate mock product data when real search fails
    
    Args:
        count: Number of mock products to generate
        search_term: Search term to use in mock product titles
        
    Returns:
        List of mock product dictionaries
    """
    products = []
    price_range_min = 19.99
    price_range_max = 99.99
    
    # Common brands for products
    brands = ["TechPro", "NextGen", "UltraCore", "MaxQuality", "OptimaPrime", "EliteTech", "ProSeries", "MegaBrand", "SmartChoice"]
    
    # Capitalize the search term for better appearance
    capitalized_term = search_term.title()
    
    # Real Amazon product image URLs for different categories
    amazon_images = {
        # Electronics category
        "electronics": [
            "https://m.media-amazon.com/images/I/71NTi82uBEL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71TPda7cwUL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/7120GgUKj3L._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/61PnHlc0HCL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71zZiQGzc5L._AC_UL320_.jpg"
        ],
        # Home category
        "home": [
            "https://m.media-amazon.com/images/I/71VR6c3j2bL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/81-eQZLl-KL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/714KZvWjE6L._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71XPTrlqvhL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71irJiM6MaL._AC_UL320_.jpg"
        ],
        # Toys category
        "toys": [
            "https://m.media-amazon.com/images/I/81a5KHEkwQL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/61afWtorEeL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71X25HBQURL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71gGPRRlyTL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/91hhCe0O3RL._AC_UL320_.jpg"
        ],
        # Hologram specific
        "hologram": [
            "https://m.media-amazon.com/images/I/71uZW4kBaFL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/81+wxMwfUFL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71eJiVhQK+L._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/718aLu98bNL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/716neMnDXpL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/715LcrwisIL._AC_UL320_.jpg"
        ],
        # Robot specific
        "robot": [
            "https://m.media-amazon.com/images/I/61KBB8K1wDL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/61AmS8BeCrL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/716aOihDxeL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/61RbW3VpQPL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71LciupP8bL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71JB4dAxtuL._AC_UL320_.jpg"
        ],
        # General/default images
        "default": [
            "https://m.media-amazon.com/images/I/81Yjw0F5KmL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/61GJBfEkzjL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/61iM47vFGvL._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/71gXFQq8I3L._AC_UL320_.jpg",
            "https://m.media-amazon.com/images/I/81c+Z61zcQL._AC_UL320_.jpg"
        ]
    }
    
    # Get the appropriate image category
    search_term_lower = search_term.lower()
    image_category = "default"
    
    # Try to match the search term with a category
    for category in amazon_images.keys():
        if category in search_term_lower or search_term_lower in category:
            image_category = category
            break
    
    # If no match found but search term contains these words, use electronics category
    if image_category == "default" and any(word in search_term_lower for word in ["phone", "laptop", "computer", "headphone", "tablet", "tv", "camera"]):
        image_category = "electronics"
    # If search term contains home-related words
    elif image_category == "default" and any(word in search_term_lower for word in ["kitchen", "furniture", "decor", "bed", "bath", "sofa", "chair"]):
        image_category = "home"
    # If search term contains toy-related words
    elif image_category == "default" and any(word in search_term_lower for word in ["toy", "game", "puzzle", "doll", "lego", "action figure"]):
        image_category = "toys"
    
    for i in range(count):
        # Create a randomized product
        brand = random.choice(brands)
        model = f"{chr(65 + (i % 26))}{random.randint(100, 999)}"
        price = round(random.uniform(price_range_min, price_range_max), 2)
        rating = round(random.uniform(3.5, 5.0), 1)
        reviews = random.randint(10, 1000)
        
        # Generate features
        features = [
            "Wireless",
            "Bluetooth",
            "Advanced Technology",
            "Smart Features",
            "Premium Quality",
            "Enhanced Performance",
            "Ergonomic Design",
            "Energy Efficient",
            "Water Resistant"
        ]
        
        # Pick 2-3 random features
        selected_features = random.sample(features, random.randint(2, 3))
        feature_text = ", ".join(selected_features)
        
        # Create the product title
        title = f"{brand} {capitalized_term} {model} - {feature_text}"
        
        # Generate a fake ASIN (Amazon Standard Identification Number)
        asin = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=10))
        
        # Select a real Amazon image URL from the appropriate category
        image_url = random.choice(amazon_images[image_category])
        
        # Create a mock product object
        product = {
            "title": title,
            "asin": asin,
            "url": f"https://www.amazon.com/dp/{asin}",
            "price": f"${price:.2f}",
            "rating": rating,
            "review_count": reviews,
            "image": image_url,
            "is_mock": True  # Flag to indicate this is mock data
        }
        
        products.append(product)
    
    return products

def get_product_direct(search_term: str, limit: int = 1, use_fallback: bool = False, sort_by: str = 'default', trending_range: int = 30) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Get a specific product by search term
    
    Args:
        search_term: The product to search for
        limit: Maximum number of products to return
        use_fallback: Whether to use fallback mock data if no results found (disabled by default)
        sort_by: Sorting method ('default', 'trending', 'rating', 'price_high', 'price_low')
        trending_range: Number of days to consider for trending calculation (7, 30, 90, 365)
        
    Returns:
        Tuple of (product dictionary, error message)
    """
    try:
        # No test mode or mock data - only real Amazon search results
            
        # Get the search results
        products = direct_amazon_search(search_term, max_products=limit, use_fallback=False,
                                     sort_by=sort_by, trending_range=trending_range)
        
        if not products:
            return {}, f"No products found for: {search_term}"
        
        # Return the first product
        return products[0], None
    
    except Exception as e:
        logger.error(f"Error getting direct product: {str(e)}")
        return {}, f"Error: {str(e)}"