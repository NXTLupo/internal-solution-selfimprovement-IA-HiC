from flask import Flask, jsonify, request, render_template, abort, url_for
from category_crawler import get_category_products
from direct_search import get_product_direct, direct_amazon_search
from market_insights import analyze_search_term
from llm_analyzer import analyze_product_data, get_structured_analysis, answer_question
from util.llm_models import LLM_PROVIDERS
import os
from selectorlib import Extractor
import requests
from dateutil import parser as dateparser
import time
import logging
import re
import random
import html
import urllib.parse
from functools import wraps

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create an Extractor by reading from the YAML file
e = Extractor.from_yaml_file('selectors.yml')

# Rate limiting - Store the last request time for each IP
request_history = {}

# Flask app configuration
app.static_folder = 'static'
app.template_folder = 'templates'

# Make url_for available in templates
app.jinja_env.globals.update(url_for=url_for)

# Old HTML template (no longer used)
'''
<!DOCTYPE html>
<html>
<head>
    <title>Amazon Review Collector</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        h1 {
            color: #232f3e; /* Amazon dark blue */
            margin-bottom: 20px;
        }
        .container {
            background-color: #fff;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            padding: 20px;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="url"] {
            width: 100%;
            padding: 8px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .btn {
            background-color: #ff9900; /* Amazon orange */
            color: #fff;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        .btn:hover {
            background-color: #e88a00;
        }
        .examples {
            margin-top: 20px;
            font-size: 0.9em;
            color: #666;
        }
        .example-link {
            color: #0066c0;
            text-decoration: none;
        }
        .example-link:hover {
            text-decoration: underline;
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background-color: #f0f7fb;
            border-left: 5px solid #0066c0;
            color: #444;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Amazon Review Collector</h1>
        <form action="/api/scrape" method="get" id="scrapeForm">
            <div class="form-group">
                <label for="url">Amazon Product URL:</label>
                <input type="url" id="url" name="url" placeholder="https://www.amazon.com/product-name/dp/PRODUCT_ID" required>
            </div>
            <button type="submit" class="btn">Scrape Reviews</button>
        </form>
        
        <div class="examples">
            <p>Examples:</p>
            <ul>
                <li><a href="#" class="example-link" data-url="https://www.amazon.com/dp/B08N5KWB9H">Amazon Echo Show 5</a></li>
                <li><a href="#" class="example-link" data-url="https://www.amazon.com/dp/B08NGSXT38">Echo Dot (4th Gen)</a></li>
                <li><a href="#" class="example-link" data-url="https://www.amazon.com/dp/B07PVCVBN7">Amazon Echo Buds</a></li>
            </ul>
        </div>
        
        <div class="info">
            <p><strong>Note:</strong> This tool scrapes publicly available Amazon product reviews. Please use responsibly and in accordance with Amazon's Terms of Service. Rate limiting is in place to prevent overloading Amazon's servers.</p>
            <p>The data extracted includes product title, reviews, ratings, review dates, and more.</p>
        </div>
    </div>
    
    <script>
        // Set example URLs when clicked
        document.querySelectorAll('.example-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('url').value = this.getAttribute('data-url');
            });
        });
        
        // Form submission handling
        document.getElementById('scrapeForm').addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Scraping...'; 
            submitBtn.disabled = true;
        });
    </script>
</body>
</html>
''' # End of old HTML template (kept for reference)

# Rate limit decorator
def rate_limit(min_interval=3):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            ip = request.remote_addr
            current_time = time.time()
            
            # Check if this IP has made a request before
            if ip in request_history:
                last_request_time = request_history[ip]
                # Calculate time since last request
                time_since_last = current_time - last_request_time
                
                # If request is too soon, add some jitter
                if time_since_last < min_interval:
                    # Add random delay between 1-3 seconds
                    delay = min_interval - time_since_last + random.uniform(1, 3)
                    logger.info(f"Rate limiting IP {ip}. Sleeping for {delay:.2f} seconds")
                    time.sleep(delay)
            
            # Update the last request time
            request_history[ip] = time.time()
            return f(*args, **kwargs)
        return wrapped
    return decorator

def validate_amazon_url(url):
    """Validate that the URL is an Amazon product URL"""
    # More permissive check for Amazon domains
    if 'amazon.' not in url.lower():
        return False
        
    # Check for common product identifiers in the URL
    product_identifiers = ['/dp/', '/gp/product/', '/product/', '/B0', '?pd_rd_w=']
    return any(identifier in url for identifier in product_identifiers)

def scrape(url):
    """Scrape Amazon product reviews"""
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36'
        ),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
    }
    
    # Validate URL first
    if not url or not isinstance(url, str):
        logger.error("Invalid URL provided: empty or not a string")
        return None
        
    try:
        # Clean the URL by removing unnecessary parameters
        clean_url = url.split('?')[0] if '?' in url else url
        clean_url = clean_url.split('#')[0] if '#' in clean_url else clean_url
        
        # Add review-specific URL parameter if not already a review page
        if '/reviews/' not in clean_url and 'customerReviews' not in clean_url:
            review_url = clean_url.rstrip('/') + '/reviews/'
        else:
            review_url = clean_url
            
        logger.info(f"Scraping reviews from: {review_url}")
        try:
            response = requests.get(review_url, headers=headers, timeout=15)
            
            # Check for successful status code
            if response.status_code != 200:
                logger.error(f"Failed to fetch URL: {review_url} (Status code: {response.status_code})")
                return None
                
            # Extract data using selectorlib
            data = e.extract(response.text)
            if not data or not any(data.values()):
                logger.warning(f"No data extracted from {review_url}")
                # Try a different URL format as fallback
                if '/reviews/' in review_url:
                    alternative_url = clean_url.rstrip('/') + '/product-reviews/'
                    logger.info(f"Trying alternative URL: {alternative_url}")
                    response = requests.get(alternative_url, headers=headers, timeout=15)
                    if response.status_code == 200:
                        data = e.extract(response.text)
            return data
        except requests.exceptions.Timeout:
            logger.error(f"Request timed out for URL: {review_url}")
            return None
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error for URL: {review_url}")
            return None
        except requests.exceptions.RequestException as ex:
            logger.error(f"Request error: {str(ex)}")
            return None
    except Exception as ex:
        logger.error(f"Error scraping {url}: {str(ex)}")
        return None

# Homepage - HTML interface
@app.route('/')
def index():
    return render_template('index.html')

# API endpoint for category-based crawling
@app.route('/api/category', methods=['POST', 'GET'])
@rate_limit(min_interval=3)  # Apply rate limiting
def crawl_category():
    # Enhanced debug logging
    logger.info(f"Category crawl request received. Method: {request.method}")
    logger.info(f"Request headers: {dict(request.headers)}")
    logger.info(f"Request data: {request.data}")
    logger.info(f"Request form: {request.form}")
    logger.info(f"Request args: {request.args}")
    
    # Handle different request methods
    if request.method == 'GET':
        data = request.args.to_dict()
        logger.info(f"GET request with args: {data}")
    elif request.is_json:
        try:
            data = request.json
            logger.info(f"JSON data: {data}")
        except Exception as e:
            logger.error(f"Error parsing JSON: {str(e)}")
            return jsonify({'error': f'Invalid JSON data: {str(e)}'}), 400
    else:
        data = request.form.to_dict()
        logger.info(f"Form data: {data}")
        
    # Add more debug logging
    logger.info(f"Processed data: {data}")
    
    if not data:
        return jsonify({'error': 'Missing request data'}), 400
        
    # Check for search term in any of these fields with sanitization
    search_term = None
    for field in ['query', 'search', 'term', 'url', 'category', 'keyword', 'product', 'brand']:
        if data.get(field):
            # Get the value and sanitize it
            value = data.get(field)
            if isinstance(value, str):
                # Decode URL-encoded values and strip whitespace
                search_term = html.unescape(urllib.parse.unquote(value)).strip()
                logger.info(f"Found search term in field '{field}': {search_term}")
                break
            
    # If no search term found, check if there's a generic 'q' parameter
    if not search_term and data.get('q'):
        q_value = data.get('q')
        if isinstance(q_value, str):
            search_term = html.unescape(urllib.parse.unquote(q_value)).strip()
    
    limit = int(data.get('limit', 50))  # Default to 50 products
    
    # Validate limit
    if limit < 1:
        limit = 1
    elif limit > 100:
        limit = 100  # Increased cap to 100 for more comprehensive analysis
    
    if not search_term:
        return jsonify({'error': 'Please provide a search term, product name, category, or URL'}), 400
    
    # Try direct search first (more reliable) - with no fallbacks to mock data
    try:
        # Extract sort type and trending range
        sort_by = data.get('sort', 'default')
        trending_range = int(data.get('trending_range', 30))
        
        logger.info(f"Trying direct Amazon search for category: {search_term} with sort={sort_by}, trending_range={trending_range}")
        products = direct_amazon_search(search_term, max_attempts=5, use_fallback=False, 
                                       sort_by=sort_by, trending_range=trending_range)
        
        if products:
            logger.info(f"Direct search found {len(products)} products")
        else:
            # Fall back to category crawler if direct search fails
            logger.warning("Direct search failed, falling back to category crawler")
            products, error = get_category_products(search_term, limit)
            
            if error:
                logger.error(f"Category crawler error: {error}")
                return jsonify({'error': f"No products found for: {search_term}. {error}"}), 404
                
        if not products or len(products) == 0:
            logger.warning(f"No products found for: {search_term}")
            return jsonify({'error': f"No products found for: {search_term}"}), 404
    except Exception as e:
        logger.error(f"Error in search methods: {str(e)}")
        return jsonify({'error': f'Error searching: {str(e)}'}), 500
    
    # Determine what type of search was performed
    search_type = "URL" if search_term.startswith('http') else "Product/Category"
    
    # Generate market insights
    try:
        logger.info(f"Generating market insights for {len(products)} products")
        insights = analyze_search_term(search_term, products)
    except Exception as e:
        logger.error(f"Error generating market insights: {str(e)}")
        insights = {"error": f"Could not generate market insights: {str(e)}"}
        
    # Return the products with insights
    return jsonify({
        'products': products,
        'count': len(products),
        'search_term': search_term,
        'search_type': search_type,
        'insights': insights
    })

# API endpoint for market insights
@app.route('/api/insights', methods=['POST', 'GET'])
@rate_limit(min_interval=3)  # Apply rate limiting
def get_market_insights():
    # Enhanced debug logging
    logger.info(f"Market insights request received. Method: {request.method}")
    logger.info(f"Request headers: {dict(request.headers)}")
    logger.info(f"Request data: {request.data}")
    logger.info(f"Request form: {request.form}")
    logger.info(f"Request args: {request.args}")
    
    # Handle different request methods
    if request.method == 'GET':
        data = request.args.to_dict()
        logger.info(f"GET request with args: {data}")
    elif request.is_json:
        try:
            data = request.json
            logger.info(f"JSON data: {data}")
        except Exception as e:
            logger.error(f"Error parsing JSON: {str(e)}")
            return jsonify({'error': f'Invalid JSON data: {str(e)}'}), 400
    else:
        data = request.form.to_dict()
        logger.info(f"Form data: {data}")
        
    # Add more debug logging
    logger.info(f"Processed data: {data}")
    
    if not data:
        return jsonify({'error': 'Missing request data'}), 400
        
    # Check for search term in any of these fields with sanitization
    search_term = None
    for field in ['query', 'search', 'term', 'url', 'category', 'keyword', 'product', 'brand']:
        if data.get(field):
            # Get the value and sanitize it
            value = data.get(field)
            if isinstance(value, str):
                # Decode URL-encoded values and strip whitespace
                search_term = html.unescape(urllib.parse.unquote(value)).strip()
                logger.info(f"Found search term in field '{field}': {search_term}")
                break
            
    # If no search term found, check if there's a generic 'q' parameter
    if not search_term and data.get('q'):
        q_value = data.get('q')
        if isinstance(q_value, str):
            search_term = html.unescape(urllib.parse.unquote(q_value)).strip()
    
    limit = int(data.get('limit', 50))  # Default to 50 products
    
    # Validate limit
    if limit < 1:
        limit = 1
    elif limit > 100:
        limit = 100  # Increased cap to 100 for more comprehensive analysis
    
    if not search_term:
        return jsonify({'error': 'Please provide a search term, product name, category, or URL'}), 400
    
    logger.info(f"Final search_term after processing: '{search_term}'")
    
    # No special test or mock data handling - we only work with real data

    # Try direct search first (more reliable for a larger dataset) - with no fallbacks to mock data
    try:
        logger.info(f"Performing direct search for insights on: {search_term}")
        
        try:
            # Extract sort type and trending range
            sort_by = data.get('sort', 'default')
            trending_range = int(data.get('trending_range', 30))
            
            # Increase max_attempts for better reliability but disable fallback to mock data
            products = direct_amazon_search(search_term, max_products=limit, max_attempts=5, use_fallback=False,
                                          sort_by=sort_by, trending_range=trending_range)
            logger.info(f"Direct search found {len(products) if products else 0} products")
        except Exception as direct_search_error:
            logger.error(f"Direct search error: {str(direct_search_error)}")
            products = []
        
        if not products:
            # Fall back to category crawler if direct search fails
            logger.warning(f"Direct search failed, falling back to category crawler for insights")
            try:
                products, error = get_category_products(search_term, limit)
                if error:
                    logger.error(f"Category crawler error: {error}")
                    return jsonify({'error': f"No products found for: {search_term}. {error}"}), 404
            except Exception as category_error:
                logger.error(f"Category crawler exception: {str(category_error)}")
                return jsonify({'error': f"Unable to find products: {str(category_error)}"}), 404
                
        if not products or len(products) == 0:
            logger.warning(f"No products found for: {search_term}")
            return jsonify({'error': f"No products found for: {search_term}"}), 404
            
        # Generate insights
        logger.info(f"Generating market insights for {len(products)} products")
        insights = analyze_search_term(search_term, products)
        
        return jsonify(insights)
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        return jsonify({'error': f'Error generating insights: {str(e)}'}), 500

# API endpoint for scraping reviews
@app.route('/api/scrape')
@rate_limit(min_interval=3)  # Apply rate limiting
def scrape_amazon_reviews():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'Missing URL parameter'}), 400
        
    # Validate the URL is an Amazon product page
    if not validate_amazon_url(url):
        return jsonify({'error': 'Invalid Amazon product URL'}), 400

    data = scrape(url)
    if data is None:
        return jsonify({'error': 'Failed to scrape reviews'}), 500
        
    # Process the reviews
    reviews = []
    if data and 'reviews' in data and data['reviews']:
        for review in data['reviews']:
            if review and 'date' in review:
                try:
                    # Clean and parse date
                    # Example: 'Reviewed in the United States on November 22, 2022'
                    date_str = review['date']
                    if 'on ' in date_str:
                        date_str = date_str.split('on ')[-1]
                    parsed_date = dateparser.parse(date_str)
                    if parsed_date:
                        review['date'] = parsed_date.strftime('%d %b %Y')
                except Exception as ex:
                    # Fallback to original string if parsing fails
                    logger.warning(f"Date parsing error: {str(ex)}")
            # Keep only non-empty reviews
            if review and any(review.values()):
                reviews.append(review)
        data['reviews'] = reviews
        data['review_count'] = len(reviews)
    else:
        data = data or {}
        data['reviews'] = []
        data['review_count'] = 0
        data['error'] = 'No reviews found'
    
    return jsonify(data)

# API endpoint for scraping product details
@app.route('/scrape', methods=['POST', 'GET'])
@rate_limit(min_interval=2)  # Apply rate limiting
def scrape_product():
    # Debug logging to see what's being received
    logger.info(f"Product scrape request: {request.data}")
    
    # Handle different request methods
    if request.method == 'GET':
        data = request.args.to_dict()
        logger.info(f"GET request with args: {data}")
    elif request.is_json:
        data = request.json
        logger.info(f"JSON data: {data}")
    else:
        data = request.form.to_dict()
        logger.info(f"Form data: {data}")
    
    # Add more debug logging
    logger.info(f"Processed data: {data}")
    
    # Check for product identifier in any of these fields
    product_term = None
    for field in ['url', 'product', 'query', 'search', 'term', 'asin', 'q']:
        if data and data.get(field):
            product_term = data.get(field).strip()
            logger.info(f"Found product term in field '{field}': {product_term}")
            break
    
    if not product_term:
        return jsonify({'error': 'Please provide a product name, URL, or ASIN'}), 400
        
    # If it's not a URL, convert it to one
    if not product_term.startswith('http'):
        # Check if it looks like an ASIN (10 characters, alphanumeric)
        if re.match(r'^[A-Z0-9]{10}$', product_term.upper()):
            url = f"https://www.amazon.com/dp/{product_term.upper()}"
        else:
            # Try direct product search first (more reliable)
            try:
                logger.info(f"Trying direct Amazon search for: {product_term}")
                product_data, error = get_product_direct(product_term)
                
                if not error and product_data:
                    # We got product data directly, return it
                    return jsonify(product_data)
                    
                logger.warning(f"Direct search failed: {error}, falling back to category search")
                    
                # Fall back to category search if direct search fails
                products, error = get_category_products(product_term, limit=1)
                if error or not products:
                    return jsonify({'error': f'Could not find product: {product_term}'}), 400
                    
                # Use the URL of the first product
                url = products[0].get('url')
                if not url:
                    return jsonify({'error': 'Found product but could not get URL'}), 400
            except Exception as e:
                logger.error(f"All search methods failed: {str(e)}")
                return jsonify({'error': f'Error searching for product: {str(e)}'}), 500
    else:
        url = product_term
        
    # Validate the URL is an Amazon product page
    if not validate_amazon_url(url):
        return jsonify({'error': 'Invalid Amazon product URL'}), 400
    
    try:
        # Enhanced headers for product pages
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.google.com/',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Clean the URL by removing unnecessary parameters
        clean_url = url.split('?')[0] if '?' in url else url
        clean_url = clean_url.split('#')[0] if '#' in clean_url else clean_url
        
        logger.info(f"Scraping product details from: {clean_url}")
        response = requests.get(clean_url, headers=headers, timeout=15)
        
        # Check for successful status code
        if response.status_code != 200:
            logger.error(f"Failed to fetch URL: {clean_url} (Status code: {response.status_code})")
            return jsonify({'error': f'Failed to fetch product page (Status code: {response.status_code})'}), 500
        
        # Create a YAML selector for product details
        product_selectors = {
            'title': {'css': '#productTitle, .product-title', 'type': 'Text'},
            'rating': {'css': '.a-icon-star-small .a-icon-alt, #acrPopover .a-icon-alt, .a-icon-star .a-icon-alt', 'type': 'Text'},
            'review_count': {'css': '#acrCustomerReviewText, .totalReviewCount', 'type': 'Text'},
            'price': {'css': '.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice', 'type': 'Text'},
            'discounted_price': {'css': '.a-price.a-text-price .a-offscreen, .priceBlockStrikePriceString', 'type': 'Text'},
            'availability': {'css': '#availability, #deliveryMessageRuleBased_feature_div', 'type': 'Text'},
            'description': {'css': '#productDescription p, #feature-bullets .a-list-item', 'type': 'Text'},
            'image': {'css': '#landingImage, #imgTagWrapperId img', 'type': 'Attribute', 'attribute': 'src'},
            'category': {'css': '.a-breadcrumb .a-list-item:not(:last-child), #wayfinding-breadcrumbs_feature_div li:not(:last-child)', 'type': 'Text'}
        }
        
        product_extractor = Extractor(product_selectors)
        product_data = product_extractor.extract(response.text)
        
        # Process the data
        if not product_data or not any(product_data.values()):
            return jsonify({'error': 'Failed to extract product data'}), 500
            
        # Process rating (convert "4.5 out of 5 stars" to 4.5)
        if product_data.get('rating'):
            try:
                rating_text = product_data['rating']
                rating_match = re.search(r'([\d.]+)', rating_text)
                if rating_match:
                    product_data['rating'] = float(rating_match.group(1))
            except Exception as ex:
                logger.warning(f"Rating parsing error: {str(ex)}")
        
        # Process review count (convert "1,234 ratings" to 1234)
        if product_data.get('review_count'):
            try:
                review_count_text = product_data['review_count']
                review_count_match = re.search(r'([\d,]+)', review_count_text)
                if review_count_match:
                    product_data['review_count'] = int(review_count_match.group(1).replace(',', ''))
            except Exception as ex:
                logger.warning(f"Review count parsing error: {str(ex)}")
        
        # Process price (ensure we have a clean price format)
        if product_data.get('price'):
            try:
                price_text = product_data['price']
                # Remove non-digit characters except for . and ,
                price_text = re.sub(r'[^\d.,]', '', price_text)
                product_data['price'] = price_text
            except Exception as ex:
                logger.warning(f"Price parsing error: {str(ex)}")
                
        # Clean up availability text
        if product_data.get('availability'):
            product_data['availability'] = product_data['availability'].strip()
        
        return jsonify(product_data)
    except Exception as ex:
        logger.error(f"Error scraping product details from {url}: {str(ex)}")
        return jsonify({'error': f'Error: {str(ex)}'}), 500

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'service': 'scrapehero-amazon'})

# LLM analysis endpoint
@app.route('/api/analyze', methods=['POST'])
def analyze_products():
    try:
        # Get data from request
        data = request.get_json()
        
        # Validate request data
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request data'}), 400
            
        # Extract products and query from request
        products = data.get('products', [])
        query = data.get('query', '')
        llm_provider = data.get('llm_provider', 'claude')
        
        # Validate products
        if not products or not isinstance(products, list):
            return jsonify({'error': 'No products provided'}), 400
            
        # Validate LLM provider
        if llm_provider not in LLM_PROVIDERS:
            return jsonify({
                'error': f'Unknown LLM provider: {llm_provider}',
                'available_providers': list(LLM_PROVIDERS.keys())
            }), 400
            
        # Call the LLM analyzer
        analysis_result = analyze_product_data(products, query, llm_provider)
        
        # Return the result
        return jsonify(analysis_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Structured analysis endpoint
@app.route('/api/analyze/structured', methods=['POST'])
def analyze_products_structured():
    try:
        # Get data from request
        data = request.get_json()
        
        # Validate request data
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request data'}), 400
            
        # Extract products and query from request
        products = data.get('products', [])
        query = data.get('query', '')
        llm_provider = data.get('llm_provider', 'claude')
        
        # Validate products
        if not products or not isinstance(products, list):
            return jsonify({'error': 'No products provided'}), 400
            
        # Validate LLM provider
        if llm_provider not in LLM_PROVIDERS:
            return jsonify({
                'error': f'Unknown LLM provider: {llm_provider}',
                'available_providers': list(LLM_PROVIDERS.keys())
            }), 400
            
        # Call the LLM analyzer for structured analysis
        analysis_result = get_structured_analysis(products, query, llm_provider)
        
        # Return the result
        return jsonify(analysis_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Question answering endpoint
@app.route('/api/analyze/question', methods=['POST'])
def answer_product_question():
    try:
        # Get data from request
        data = request.get_json()
        
        # Validate request data
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request data'}), 400
            
        # Extract products, query, and question from request
        products = data.get('products', [])
        query = data.get('query', '')
        question = data.get('question', '')
        llm_provider = data.get('llm_provider', 'claude')
        
        # Validate products and question
        if not products or not isinstance(products, list):
            return jsonify({'error': 'No products provided'}), 400
            
        if not question:
            return jsonify({'error': 'No question provided'}), 400
            
        # Validate LLM provider
        if llm_provider not in LLM_PROVIDERS:
            return jsonify({
                'error': f'Unknown LLM provider: {llm_provider}',
                'available_providers': list(LLM_PROVIDERS.keys())
            }), 400
            
        # Call the question answering function
        answer_result = answer_question(products, query, question, llm_provider)
        
        # Return the result
        return jsonify(answer_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get available LLM providers
@app.route('/api/llm-providers', methods=['GET'])
def get_llm_providers():
    providers = {}
    for key, provider in LLM_PROVIDERS.items():
        providers[key] = {
            'name': provider['name'],
            'model': provider['model'],
            'available': bool(os.getenv(provider['env_var']))
        }
    return jsonify(providers)

# Route for favicon.ico
@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('favicon.ico')

# Error handler for 404
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

# Error handler for 500
@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Server error'}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
