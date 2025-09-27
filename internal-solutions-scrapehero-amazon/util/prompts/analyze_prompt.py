"""
Prompts for analyzing product search data
"""

def get_analysis_prompt(product_data, query):
    """
    Generate a prompt for analyzing product search results.
    
    Args:
        product_data: List of product dictionaries
        query: Original search query
        
    Returns:
        Formatted prompt string for the LLM
    """
    # Build a condensed product data representation
    product_list = ""
    for i, product in enumerate(product_data, 1):
        title = product.get('title', 'Unknown')
        price = product.get('price', 'N/A')
        rating = product.get('rating', 'N/A')
        review_count = product.get('review_count', 'N/A')
        asin = product.get('asin', 'N/A')
        trending_score = product.get('trending_score', 'N/A')
        trending_rank = product.get('trending_rank', 'N/A')
        sales_estimate = product.get('sales_estimate', 'N/A')
        
        product_list += f"Product {i}:\n"
        product_list += f"  Title: {title}\n"
        product_list += f"  ASIN: {asin}\n"
        product_list += f"  Price: {price}\n"
        product_list += f"  Rating: {rating}\n"
        product_list += f"  Review Count: {review_count}\n"
        
        if trending_score != 'N/A':
            product_list += f"  Trending Score: {trending_score}\n"
        if trending_rank != 'N/A':
            product_list += f"  Trending Rank: {trending_rank}\n"
        if sales_estimate != 'N/A':
            product_list += f"  Sales Estimate: {sales_estimate}\n"
            
        product_list += "\n"
    
    prompt = f"""You are an AI assistant that analyzes Amazon product search results to provide insights.

Here are the search results for the query: "{query}"

{product_list}

Please analyze this data and provide insights about these products. Consider:
1. Price ranges and patterns
2. Rating distribution
3. Popular features or patterns in product titles
4. Any trending information if available
5. Recommendations for consumers based on this data

Provide a comprehensive but concise analysis.
"""
    return prompt

def get_chat_prompt(product_data, query, user_query):
    """
    Generate a prompt for answering user questions about product data.
    
    Args:
        product_data: List of product dictionaries
        query: Original search query
        user_query: User's specific question about the data
        
    Returns:
        Formatted prompt string for the LLM
    """
    # Build a condensed product data representation
    product_list = ""
    for i, product in enumerate(product_data, 1):
        title = product.get('title', 'Unknown')
        price = product.get('price', 'N/A')
        rating = product.get('rating', 'N/A')
        review_count = product.get('review_count', 'N/A')
        asin = product.get('asin', 'N/A')
        trending_score = product.get('trending_score', 'N/A')
        trending_rank = product.get('trending_rank', 'N/A')
        sales_estimate = product.get('sales_estimate', 'N/A')
        
        product_list += f"Product {i}:\n"
        product_list += f"  Title: {title}\n"
        product_list += f"  ASIN: {asin}\n"
        product_list += f"  Price: {price}\n"
        product_list += f"  Rating: {rating}\n"
        product_list += f"  Review Count: {review_count}\n"
        
        if trending_score != 'N/A':
            product_list += f"  Trending Score: {trending_score}\n"
        if trending_rank != 'N/A':
            product_list += f"  Trending Rank: {trending_rank}\n"
        if sales_estimate != 'N/A':
            product_list += f"  Sales Estimate: {sales_estimate}\n"
            
        product_list += "\n"
    
    prompt = f"""You are an AI assistant that analyzes Amazon product search results and answers questions about them.

Here are the search results for the query: "{query}"

{product_list}

User question: {user_query}

Please answer the user's question thoughtfully and accurately based on the product data above. If the question cannot be answered using the available data, please state that clearly.
"""
    return prompt

def get_analysis_prompt_json(product_data, query):
    """
    Generate a prompt for analyzing product search results with JSON output.
    
    Args:
        product_data: List of product dictionaries
        query: Original search query
        
    Returns:
        Formatted prompt string for the LLM with JSON format requirements
    """
    # Build a condensed product data representation
    product_list = ""
    for i, product in enumerate(product_data, 1):
        title = product.get('title', 'Unknown')
        price = product.get('price', 'N/A')
        rating = product.get('rating', 'N/A')
        review_count = product.get('review_count', 'N/A')
        asin = product.get('asin', 'N/A')
        trending_score = product.get('trending_score', 'N/A')
        trending_rank = product.get('trending_rank', 'N/A')
        sales_estimate = product.get('sales_estimate', 'N/A')
        
        product_list += f"Product {i}:\n"
        product_list += f"  Title: {title}\n"
        product_list += f"  ASIN: {asin}\n"
        product_list += f"  Price: {price}\n"
        product_list += f"  Rating: {rating}\n"
        product_list += f"  Review Count: {review_count}\n"
        
        if trending_score != 'N/A':
            product_list += f"  Trending Score: {trending_score}\n"
        if trending_rank != 'N/A':
            product_list += f"  Trending Rank: {trending_rank}\n"
        if sales_estimate != 'N/A':
            product_list += f"  Sales Estimate: {sales_estimate}\n"
            
        product_list += "\n"
    
    prompt = f"""You are an AI assistant that analyzes Amazon product search results to provide insights.

Here are the search results for the query: "{query}"

{product_list}

Please analyze this data and provide insights about these products in JSON format with the following structure:

```json
{{
  "summary": "A concise summary of the product search results",
  "priceRange": {{
    "min": "minimum price",
    "max": "maximum price", 
    "average": "average price",
    "insight": "insight about the price distribution"
  }},
  "ratings": {{
    "min": "minimum rating",
    "max": "maximum rating",
    "average": "average rating",
    "insight": "insight about the ratings"
  }},
  "trendingInsights": "insights about trending products if data available",
  "commonFeatures": ["list", "of", "common", "features"],
  "recommendations": [
    "recommendation 1",
    "recommendation 2",
    "recommendation 3"
  ]
}}
```

Ensure you extract numbers from price strings correctly and provide accurate insights.
"""
    return prompt