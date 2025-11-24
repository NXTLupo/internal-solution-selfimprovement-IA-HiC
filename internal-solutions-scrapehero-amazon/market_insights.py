"""
Market Insights Module - Provides analytical capabilities for Amazon product data
"""

import logging
import statistics
import re
from collections import Counter
from typing import List, Dict, Any, Tuple, Optional

# Configure logging
logger = logging.getLogger(__name__)

def extract_price_value(price_str: str) -> Optional[float]:
    """Extract a numeric price value from a price string"""
    if not price_str:
        return None
    
    try:
        # Remove currency symbols and commas
        price_str = re.sub(r'[^\d.,]', '', price_str)
        # Handle different decimal/thousand separators
        if ',' in price_str and '.' in price_str:
            if price_str.find(',') > price_str.find('.'):
                # Format: 1.234,56
                price_str = price_str.replace('.', '').replace(',', '.')
            else:
                # Format: 1,234.56
                price_str = price_str.replace(',', '')
        elif ',' in price_str:
            # Assume comma is decimal separator if it's near the end
            if len(price_str) - price_str.rfind(',') <= 3:
                price_str = price_str.replace(',', '.')
            else:
                price_str = price_str.replace(',', '')
                
        return float(price_str)
    except (ValueError, TypeError) as e:
        logger.warning(f"Error parsing price '{price_str}': {str(e)}")
        return None

def analyze_products(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze a list of products to extract market insights
    
    Args:
        products: List of product dictionaries
        
    Returns:
        Dictionary containing market insights
    """
    if not products:
        return {
            "error": "No products to analyze"
        }
        
    logger.info(f"Analyzing {len(products)} products for market insights")
    
    # Basic metrics
    product_count = len(products)
    
    # Price analysis
    prices = []
    for product in products:
        price = product.get('price')
        if price:
            price_value = extract_price_value(price)
            if price_value:
                prices.append(price_value)
    
    price_metrics = {}
    if prices:
        price_metrics = {
            "min_price": min(prices),
            "max_price": max(prices),
            "avg_price": sum(prices) / len(prices),
            "median_price": statistics.median(prices) if len(prices) > 0 else None,
            "price_range": max(prices) - min(prices) if len(prices) > 0 else 0,
            "count": len(prices)
        }
        
        # Price distribution
        if len(prices) >= 3:
            price_range = max(prices) - min(prices)
            bucket_size = price_range / 5 if price_range > 0 else 1
            buckets = [0, 0, 0, 0, 0]
            
            for price in prices:
                bucket_index = min(int((price - min(prices)) / bucket_size), 4)
                buckets[bucket_index] += 1
                
            price_metrics["distribution"] = {
                "buckets": buckets,
                "bucket_labels": [
                    f"${min(prices):.2f} - ${min(prices) + bucket_size:.2f}",
                    f"${min(prices) + bucket_size:.2f} - ${min(prices) + 2*bucket_size:.2f}",
                    f"${min(prices) + 2*bucket_size:.2f} - ${min(prices) + 3*bucket_size:.2f}",
                    f"${min(prices) + 3*bucket_size:.2f} - ${min(prices) + 4*bucket_size:.2f}",
                    f"${min(prices) + 4*bucket_size:.2f} - ${max(prices):.2f}"
                ]
            }
    
    # Rating analysis
    ratings = []
    for product in products:
        rating = product.get('rating')
        if rating is not None:
            try:
                if isinstance(rating, str):
                    # Try to extract numeric rating from string
                    rating_match = re.search(r'([0-9.]+)', rating)
                    if rating_match:
                        ratings.append(float(rating_match.group(1)))
                else:
                    ratings.append(float(rating))
            except (ValueError, TypeError):
                pass
    
    rating_metrics = {}
    if ratings:
        rating_metrics = {
            "min_rating": min(ratings),
            "max_rating": max(ratings),
            "avg_rating": sum(ratings) / len(ratings),
            "median_rating": statistics.median(ratings) if len(ratings) > 0 else None,
            "count": len(ratings)
        }
        
        # Rating distribution
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for rating in ratings:
            # Round to nearest whole number for distribution
            rounded = min(max(round(rating), 1), 5)
            rating_distribution[rounded] += 1
            
        rating_metrics["distribution"] = rating_distribution
    
    # Brand analysis
    brands = []
    for product in products:
        title = product.get('title', '')
        if title:
            # Try to extract brand from beginning of title (common pattern)
            brand_match = re.match(r'^([A-Za-z0-9\-]+)', title)
            if brand_match:
                brands.append(brand_match.group(1).strip())
    
    brand_metrics = {}
    if brands:
        brand_counter = Counter(brands)
        brand_metrics = {
            "top_brands": brand_counter.most_common(5),
            "brand_count": len(brand_counter)
        }
    
    # Feature analysis (extract key features from titles)
    features = []
    for product in products:
        title = product.get('title', '')
        if title:
            # Extract common feature indicators
            feature_matches = re.findall(r'(?:with|featuring|includes|[0-9]+[A-Za-z]+)\s([A-Za-z0-9\-]+)', title, re.IGNORECASE)
            features.extend([f.strip().lower() for f in feature_matches if len(f.strip()) > 3])
            
            # Extract dimensions, sizes, etc.
            dimension_matches = re.findall(r'([0-9]+(?:\.[0-9]+)?\s*(?:in|inch|ft|cm|mm|oz|pound|lb))', title, re.IGNORECASE)
            features.extend([d.strip().lower() for d in dimension_matches])
    
    feature_metrics = {}
    if features:
        feature_counter = Counter(features)
        feature_metrics = {
            "top_features": feature_counter.most_common(10),
            "feature_count": len(feature_counter)
        }
    
    # Insights generation
    insights = []
    
    # Price insights
    if price_metrics:
        price_range = price_metrics.get("price_range", 0)
        if price_range > 0:
            insights.append({
                "type": "price",
                "text": f"Price range is ${price_metrics.get('min_price', 0):.2f} to ${price_metrics.get('max_price', 0):.2f} with an average of ${price_metrics.get('avg_price', 0):.2f}."
            })
            
            if price_range > price_metrics.get("avg_price", 0) * 0.5:
                insights.append({
                    "type": "price_spread",
                    "text": "There is a wide price spread in this category, indicating potential for different market segments or feature differentiation."
                })
    
    # Rating insights
    if rating_metrics:
        avg_rating = rating_metrics.get("avg_rating", 0)
        insights.append({
            "type": "rating",
            "text": f"Average rating is {avg_rating:.1f} out of 5.0 across {rating_metrics.get('count', 0)} products."
        })
        
        if avg_rating >= 4.5:
            insights.append({
                "type": "high_rating",
                "text": "Products in this category are very highly rated, suggesting strong customer satisfaction."
            })
        elif avg_rating <= 3.5:
            insights.append({
                "type": "low_rating",
                "text": "Lower average ratings in this category may indicate customer satisfaction issues or opportunities for improvement."
            })
    
    # Brand insights
    if brand_metrics and brand_metrics.get("top_brands"):
        top_brand, top_count = brand_metrics["top_brands"][0]
        brand_share = top_count / product_count
        insights.append({
            "type": "brand",
            "text": f"The most common brand is {top_brand} with {top_count} products ({brand_share:.0%} market share)."
        })
        
        if brand_share > 0.5:
            insights.append({
                "type": "dominant_brand",
                "text": f"{top_brand} appears to be the dominant brand in this category with over 50% market share."
            })
        elif brand_metrics.get("brand_count", 0) > 10:
            insights.append({
                "type": "fragmented",
                "text": f"This category is highly fragmented with {brand_metrics.get('brand_count')} different brands competing."
            })
    
    # Feature insights
    if feature_metrics and feature_metrics.get("top_features"):
        top_features = [f[0] for f in feature_metrics["top_features"][:3]]
        insights.append({
            "type": "features",
            "text": f"The most common features are: {', '.join(top_features)}."
        })
    
    return {
        "product_count": product_count,
        "price_metrics": price_metrics,
        "rating_metrics": rating_metrics,
        "brand_metrics": brand_metrics,
        "feature_metrics": feature_metrics,
        "insights": insights
    }

def generate_competitive_analysis(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate competitive analysis for a product category
    
    Args:
        products: List of product dictionaries
        
    Returns:
        Dictionary containing competitive analysis
    """
    if not products:
        return {"error": "No products for competitive analysis"}
        
    # Basic market structure analysis
    analysis = analyze_products(products)
    
    # Competitive positioning analysis
    if len(products) >= 3:
        # For each product, determine its positioning relative to others
        for product in products:
            if not product.get('price'):
                continue
                
            price_value = extract_price_value(product.get('price', '0'))
            if not price_value:
                continue
                
            # Price positioning
            avg_price = analysis.get('price_metrics', {}).get('avg_price', 0)
            if avg_price > 0:
                relative_price = price_value / avg_price
                if relative_price < 0.8:
                    product['price_position'] = 'budget'
                elif relative_price > 1.2:
                    product['price_position'] = 'premium'
                else:
                    product['price_position'] = 'mid-range'
            
            # Rating positioning
            if product.get('rating'):
                try:
                    rating = float(product['rating']) if isinstance(product['rating'], (int, float)) else float(re.search(r'([0-9.]+)', str(product['rating'])).group(1))
                    avg_rating = analysis.get('rating_metrics', {}).get('avg_rating', 0)
                    
                    if avg_rating > 0:
                        if rating > avg_rating + 0.5:
                            product['rating_position'] = 'top-rated'
                        elif rating < avg_rating - 0.5:
                            product['rating_position'] = 'lower-rated'
                        else:
                            product['rating_position'] = 'average-rated'
                except (ValueError, AttributeError):
                    pass
    
    # Market segmentation
    segments = {
        'budget': [],
        'mid-range': [],
        'premium': []
    }
    
    for product in products:
        if product.get('price_position'):
            segments[product['price_position']].append(product)
    
    segment_analysis = {}
    for segment, segment_products in segments.items():
        if segment_products:
            # Calculate segment metrics
            segment_analysis[segment] = {
                'count': len(segment_products),
                'percentage': len(segment_products) / len(products) * 100
            }
            
            # Calculate average rating for each segment
            ratings = []
            for product in segment_products:
                if product.get('rating'):
                    try:
                        rating = float(product['rating']) if isinstance(product['rating'], (int, float)) else float(re.search(r'([0-9.]+)', str(product['rating'])).group(1))
                        ratings.append(rating)
                    except (ValueError, AttributeError):
                        pass
            
            if ratings:
                segment_analysis[segment]['avg_rating'] = sum(ratings) / len(ratings)
    
    # Add segment analysis to results
    analysis['segments'] = segment_analysis
    
    # Generate competitive insights
    competitive_insights = []
    
    # Price-quality relationship
    price_quality_correlation = 0
    price_rating_pairs = []
    
    for product in products:
        price_value = extract_price_value(product.get('price', '0'))
        if not price_value:
            continue
            
        try:
            rating = product.get('rating')
            if rating:
                rating = float(rating) if isinstance(rating, (int, float)) else float(re.search(r'([0-9.]+)', str(rating)).group(1))
                price_rating_pairs.append((price_value, rating))
        except (ValueError, AttributeError):
            pass
    
    if price_rating_pairs:
        # Calculate correlation coefficient
        if len(price_rating_pairs) > 1:
            prices = [p[0] for p in price_rating_pairs]
            ratings = [p[1] for p in price_rating_pairs]
            
            try:
                mean_price = sum(prices) / len(prices)
                mean_rating = sum(ratings) / len(ratings)
                
                num = sum((p - mean_price) * (r - mean_rating) for p, r in price_rating_pairs)
                den = (sum((p - mean_price) ** 2 for p in prices) * sum((r - mean_rating) ** 2 for r in ratings)) ** 0.5
                
                if den != 0:
                    price_quality_correlation = num / den
            except (ZeroDivisionError, ValueError) as e:
                logger.warning(f"Error calculating correlation: {str(e)}")
        
        # Generate insights based on correlation
        if price_quality_correlation > 0.5:
            competitive_insights.append({
                "type": "price_quality",
                "text": "Strong positive correlation between price and ratings suggests premium products deliver better quality."
            })
        elif price_quality_correlation < -0.3:
            competitive_insights.append({
                "type": "price_quality_inverse",
                "text": "Negative correlation between price and ratings suggests lower-priced products may offer better value."
            })
        elif abs(price_quality_correlation) < 0.2:
            competitive_insights.append({
                "type": "price_quality_weak",
                "text": "Weak correlation between price and ratings suggests price may not be a reliable indicator of quality."
            })
    
    # Market concentration
    if analysis.get('brand_metrics', {}).get('top_brands'):
        top_5_brands = analysis['brand_metrics']['top_brands'][:5]
        top_5_share = sum(count for _, count in top_5_brands) / len(products)
        
        if top_5_share > 0.8:
            competitive_insights.append({
                "type": "concentration_high",
                "text": f"Market is highly concentrated with top 5 brands controlling {top_5_share:.0%} of products."
            })
        elif top_5_share < 0.4:
            competitive_insights.append({
                "type": "concentration_low",
                "text": f"Market is highly fragmented with top 5 brands controlling only {top_5_share:.0%} of products."
            })
    
    # Segment insights
    if segment_analysis.get('premium', {}).get('avg_rating') and segment_analysis.get('budget', {}).get('avg_rating'):
        premium_rating = segment_analysis['premium']['avg_rating']
        budget_rating = segment_analysis['budget']['avg_rating']
        
        if premium_rating - budget_rating > 0.7:
            competitive_insights.append({
                "type": "segment_quality",
                "text": f"Premium products ({premium_rating:.1f}/5) are rated significantly higher than budget products ({budget_rating:.1f}/5)."
            })
        elif abs(premium_rating - budget_rating) < 0.3:
            competitive_insights.append({
                "type": "segment_value",
                "text": f"Budget products ({budget_rating:.1f}/5) are rated similarly to premium products ({premium_rating:.1f}/5), suggesting good value in the lower price range."
            })
    
    analysis['competitive_insights'] = competitive_insights
    return analysis

def analyze_search_term(search_term: str, products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate market insights for a search term and products

    Args:
        search_term: The search term or category name
        products: List of product dictionaries

    Returns:
        Dictionary containing market insights
    """
    # Basic analysis
    analysis = analyze_products(products)

    # Add competitive analysis
    competitive = generate_competitive_analysis(products)
    analysis['competitive'] = competitive.get('competitive_insights', [])
    analysis['segments'] = competitive.get('segments', {})

    # Calculate advanced retail intelligence metrics
    advanced_metrics = calculate_advanced_retail_metrics(products, analysis)
    analysis['advanced_metrics'] = advanced_metrics

    # Add search term analysis
    analysis['search_term'] = search_term

    # Format for UI display
    formatted = format_insights_for_display(analysis)

    return formatted

def calculate_advanced_retail_metrics(products: List[Dict[str, Any]], analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate advanced retail intelligence metrics for professional market research

    Args:
        products: List of product dictionaries
        analysis: Basic analysis results

    Returns:
        Dictionary with advanced retail metrics
    """
    advanced_metrics = {}

    # 1. HERFINDAHL-HIRSCHMAN INDEX (Market Concentration)
    brand_metrics = analysis.get('brand_metrics', {})
    if brand_metrics.get('top_brands'):
        total_products = len(products)
        hhi = 0
        for brand, count in brand_metrics['top_brands']:
            market_share = (count / total_products) * 100
            hhi += market_share ** 2

        advanced_metrics['herfindahl_index'] = round(hhi, 2)
        advanced_metrics['market_concentration'] = (
            'Highly Concentrated (Oligopoly)' if hhi > 2500 else
            'Moderately Concentrated' if hhi > 1500 else
            'Competitive/Fragmented'
        )

    # 2. REVIEW VELOCITY SCORE (Engagement & Momentum Indicator)
    review_counts = []
    for product in products:
        try:
            review_count = product.get('review_count', 0)
            if isinstance(review_count, str):
                review_count = int(review_count.replace(',', '').replace('+', ''))
            review_counts.append(int(review_count))
        except (ValueError, TypeError):
            pass

    if review_counts:
        avg_reviews = sum(review_counts) / len(review_counts)
        median_reviews = sorted(review_counts)[len(review_counts) // 2]
        max_reviews = max(review_counts)

        advanced_metrics['review_velocity'] = {
            'average': round(avg_reviews, 1),
            'median': median_reviews,
            'top_product': max_reviews,
            'engagement_level': (
                'Very High' if avg_reviews > 1000 else
                'High' if avg_reviews > 500 else
                'Moderate' if avg_reviews > 100 else
                'Low'
            )
        }

        # Social proof strength
        high_review_count = sum(1 for rc in review_counts if rc >= 100)
        advanced_metrics['social_proof_strength'] = {
            'products_with_strong_proof': high_review_count,
            'percentage': round((high_review_count / len(products)) * 100, 1)
        }

    # 3. VALUE SCORE RANKING (Quality per Dollar)
    value_scores = []
    for product in products:
        price_value = extract_price_value(product.get('price', '0'))
        try:
            rating = product.get('rating')
            if price_value and rating and price_value > 0:
                rating = float(rating) if isinstance(rating, (int, float)) else float(re.search(r'([0-9.]+)', str(rating)).group(1))
                value_score = rating / (price_value ** 0.5)  # Diminishing returns on price
                value_scores.append({
                    'title': product.get('title', 'Unknown')[:50],
                    'price': price_value,
                    'rating': rating,
                    'value_score': round(value_score, 3)
                })
        except (ValueError, AttributeError):
            pass

    if value_scores:
        value_scores_sorted = sorted(value_scores, key=lambda x: x['value_score'], reverse=True)
        advanced_metrics['value_leaders'] = value_scores_sorted[:5]

    # 4. MARKET GAP ANALYSIS (Price Point Opportunities)
    price_metrics = analysis.get('price_metrics', {})
    if price_metrics and price_metrics.get('min_price') and price_metrics.get('max_price'):
        price_range = price_metrics['max_price'] - price_metrics['min_price']
        prices = []
        for product in products:
            price_value = extract_price_value(product.get('price', '0'))
            if price_value:
                prices.append(price_value)

        if len(prices) >= 5:
            sorted_prices = sorted(prices)
            gaps = []
            for i in range(len(sorted_prices) - 1):
                gap = sorted_prices[i + 1] - sorted_prices[i]
                if gap > price_range * 0.15:  # Significant gap (>15% of range)
                    gaps.append({
                        'lower_bound': sorted_prices[i],
                        'upper_bound': sorted_prices[i + 1],
                        'gap_size': round(gap, 2),
                        'opportunity': f"Price gap ${sorted_prices[i]:.2f} - ${sorted_prices[i + 1]:.2f}"
                    })

            advanced_metrics['price_gaps'] = gaps[:3]  # Top 3 gaps

    # 5. CATEGORY MATURITY INDICATORS
    rating_metrics = analysis.get('rating_metrics', {})
    if rating_metrics:
        avg_rating = rating_metrics.get('avg_rating', 0)
        rating_variance = 0
        if len(products) > 1:
            ratings = []
            for product in products:
                try:
                    rating = product.get('rating')
                    if rating:
                        rating = float(rating) if isinstance(rating, (int, float)) else float(re.search(r'([0-9.]+)', str(rating)).group(1))
                        ratings.append(rating)
                except (ValueError, AttributeError):
                    pass

            if ratings:
                mean_rating = sum(ratings) / len(ratings)
                rating_variance = sum((r - mean_rating) ** 2 for r in ratings) / len(ratings)

        advanced_metrics['category_maturity'] = {
            'average_quality': avg_rating,
            'quality_variance': round(rating_variance, 3),
            'maturity_signal': (
                'Mature (High quality, low variance)' if avg_rating > 4.3 and rating_variance < 0.5 else
                'Growth (High quality, high variance)' if avg_rating > 4.0 and rating_variance >= 0.5 else
                'Emerging (Moderate quality, high variance)' if rating_variance >= 0.5 else
                'Declining (Low quality or saturation)'
            )
        }

    # 6. PREMIUM VS VALUE POSITIONING
    segments = analysis.get('segments', {})
    if segments:
        premium_data = segments.get('premium', {})
        budget_data = segments.get('budget', {})
        midrange_data = segments.get('mid-range', {})

        advanced_metrics['segment_dynamics'] = {
            'premium_share': premium_data.get('percentage', 0),
            'value_share': budget_data.get('percentage', 0),
            'midmarket_share': midrange_data.get('percentage', 0),
            'premiumization_opportunity': premium_data.get('percentage', 0) < 30,
            'value_competition_intensity': budget_data.get('percentage', 0) > 40
        }

    return advanced_metrics

def format_insights_for_display(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Format analysis results for UI display"""
    display = {
        "metrics": [],
        "charts": {},
        "insights": [],
        "advanced_metrics": {}
    }
    
    # Core metrics
    if analysis.get('product_count'):
        display["metrics"].append({
            "title": "Products Analyzed",
            "value": analysis['product_count'],
            "icon": "box",
            "trend": None
        })
        
    if analysis.get('price_metrics', {}).get('avg_price'):
        display["metrics"].append({
            "title": "Average Price",
            "value": f"${analysis['price_metrics']['avg_price']:.2f}",
            "icon": "tag",
            "trend": None
        })
        
    if analysis.get('rating_metrics', {}).get('avg_rating'):
        display["metrics"].append({
            "title": "Average Rating",
            "value": f"{analysis['rating_metrics']['avg_rating']:.1f}",
            "icon": "star",
            "trend": None
        })
        
    if analysis.get('brand_metrics', {}).get('brand_count'):
        display["metrics"].append({
            "title": "Brands",
            "value": analysis['brand_metrics']['brand_count'],
            "icon": "copyright",
            "trend": None
        })
    
    # Charts data
    if analysis.get('price_metrics', {}).get('distribution'):
        display["charts"]["price_distribution"] = {
            "labels": analysis['price_metrics']['distribution']['bucket_labels'],
            "data": analysis['price_metrics']['distribution']['buckets']
        }
        
    if analysis.get('rating_metrics', {}).get('distribution'):
        display["charts"]["rating_distribution"] = {
            "labels": ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"],
            "data": [
                analysis['rating_metrics']['distribution'].get(1, 0),
                analysis['rating_metrics']['distribution'].get(2, 0),
                analysis['rating_metrics']['distribution'].get(3, 0),
                analysis['rating_metrics']['distribution'].get(4, 0),
                analysis['rating_metrics']['distribution'].get(5, 0)
            ]
        }
        
    if analysis.get('brand_metrics', {}).get('top_brands'):
        display["charts"]["brand_distribution"] = {
            "labels": [brand for brand, _ in analysis['brand_metrics']['top_brands'][:5]],
            "data": [count for _, count in analysis['brand_metrics']['top_brands'][:5]]
        }
    
    # All insights
    all_insights = []

    if analysis.get('insights'):
        all_insights.extend(analysis['insights'])

    if analysis.get('competitive'):
        all_insights.extend(analysis['competitive'])

    display["insights"] = all_insights

    # Advanced metrics for professional retail intelligence
    advanced_metrics = analysis.get('advanced_metrics', {})
    if advanced_metrics:
        display["advanced_metrics"] = advanced_metrics

        # Add insights from advanced metrics
        if advanced_metrics.get('herfindahl_index'):
            display["insights"].append({
                "type": "market_concentration",
                "text": f"Market Concentration (HHI): {advanced_metrics['herfindahl_index']} - {advanced_metrics['market_concentration']}"
            })

        if advanced_metrics.get('review_velocity'):
            rv = advanced_metrics['review_velocity']
            display["insights"].append({
                "type": "engagement",
                "text": f"Category Engagement Level: {rv['engagement_level']} (Avg: {rv['average']} reviews/product)"
            })

        if advanced_metrics.get('social_proof_strength'):
            sps = advanced_metrics['social_proof_strength']
            display["insights"].append({
                "type": "social_proof",
                "text": f"Social Proof: {sps['percentage']}% of products have 100+ reviews, indicating strong category trust"
            })

        if advanced_metrics.get('category_maturity'):
            cm = advanced_metrics['category_maturity']
            display["insights"].append({
                "type": "maturity",
                "text": f"Category Maturity: {cm['maturity_signal']}"
            })

        if advanced_metrics.get('price_gaps') and len(advanced_metrics['price_gaps']) > 0:
            display["insights"].append({
                "type": "opportunity",
                "text": f"Market Opportunity: {len(advanced_metrics['price_gaps'])} significant price gaps identified for potential market entry"
            })

        if advanced_metrics.get('segment_dynamics'):
            sd = advanced_metrics['segment_dynamics']
            if sd.get('premiumization_opportunity'):
                display["insights"].append({
                    "type": "strategy",
                    "text": f"Premiumization Opportunity: Premium segment represents only {sd.get('premium_share', 0):.1f}% - potential to trade consumers up"
                })
            if sd.get('value_competition_intensity'):
                display["insights"].append({
                    "type": "competitive",
                    "text": f"High Value Competition: {sd.get('value_share', 0):.1f}% of products in budget segment - intense price competition"
                })

    return display