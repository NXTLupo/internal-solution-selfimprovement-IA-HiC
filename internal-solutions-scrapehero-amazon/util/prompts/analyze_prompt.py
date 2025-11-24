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
    
    prompt = f"""You are a senior retail intelligence analyst specializing in Amazon marketplace strategy, competitive analysis, and consumer insights. Your role is to transform raw product data into actionable strategic intelligence for retail brands.

MARKET RESEARCH BRIEF:
Category/Query: "{query}"
Sample Size: {len(product_data)} products
Analysis Type: Comprehensive Market Intelligence Report

PRODUCT DATA:
{product_list}

REQUIRED ANALYSIS DIMENSIONS:

1. COMPETITIVE LANDSCAPE ANALYSIS
   - Market structure (oligopoly, fragmented, monopolistic competition)
   - Brand concentration metrics (HHI index indicators, top-3 share, long tail analysis)
   - Competitive positioning clusters (premium, value, budget segments)
   - Entry barriers and market accessibility

2. PRICING STRATEGY INTELLIGENCE
   - Price architecture (EDLP vs promotional pricing patterns)
   - Price-pack architecture opportunities
   - Good-better-best strategy presence
   - Price gaps and whitespace opportunities
   - Psychological pricing tactics (charm pricing, prestige pricing)
   - Price elasticity indicators from rating-price relationship

3. PRODUCT PORTFOLIO INSIGHTS
   - SKU proliferation vs rationalization patterns
   - Feature bundling strategies
   - Product differentiation vectors
   - Line extension opportunities
   - Cannibalization risks

4. CONSUMER BEHAVIOR INDICATORS
   - Purchase drivers (price vs quality vs features)
   - Review sentiment and satisfaction patterns
   - Value perception (rating-to-price ratio analysis)
   - Decision complexity and consideration set dynamics
   - Trust signals (review volume as social proof)

5. MARKET OPPORTUNITY ASSESSMENT
   - Underserved price points or segments
   - Feature gaps in current offerings
   - Quality-price optimization opportunities
   - Private label opportunities
   - Innovation whitespace

6. TRENDING & VELOCITY INDICATORS
   - Sales momentum patterns (if trending data available)
   - Market growth indicators
   - New entrant activity
   - Category maturity signals

7. STRATEGIC RECOMMENDATIONS
   - Market entry strategy for new brands
   - Portfolio optimization for existing players
   - Pricing positioning recommendations
   - Feature development priorities
   - Competitive response strategies

OUTPUT FORMAT:
Provide a structured intelligence report with:
- Executive Summary (3-4 key findings)
- Detailed analysis for each dimension above
- Data-driven metrics (use percentages, ratios, specific numbers)
- Actionable strategic recommendations
- Confidence level for each insight (High/Medium/Low based on data quality)

Use professional retail intelligence terminology. Quantify everything. Think like a category manager preparing for an assortment review or a brand manager planning market entry.
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
    
    prompt = f"""You are a senior retail intelligence analyst with expertise in Amazon marketplace dynamics, competitive positioning, and consumer behavior analysis.

MARKET CONTEXT:
Search Query: "{query}"
Product Sample: {len(product_data)} products

PRODUCT DATA:
{product_list}

USER QUESTION: {user_query}

ANALYTICAL FRAMEWORK:
As a retail intelligence professional, analyze this question through multiple lenses:

1. COMPETITIVE INTELLIGENCE: Consider brand positioning, market share indicators, and competitive dynamics
2. PRICING STRATEGY: Evaluate pricing tiers, value propositions, and price-quality relationships
3. CONSUMER INSIGHTS: Assess review patterns, purchase signals, and satisfaction indicators
4. MARKET OPPORTUNITIES: Identify gaps, whitespace, and emerging trends
5. STRATEGIC RECOMMENDATIONS: Provide actionable insights for market entry, positioning, or optimization

RESPONSE GUIDELINES:
- Use retail intelligence terminology (market share, SKU rationalization, price elasticity, etc.)
- Quantify insights with specific data points and percentages
- Compare against category benchmarks where applicable
- Identify strategic implications and business opportunities
- Support conclusions with data-driven evidence
- Flag any data limitations that impact analysis confidence

If the available data is insufficient to answer comprehensively, specify what additional data points would be needed (e.g., historical pricing, inventory velocity, customer demographics, seasonal trends).
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
    
    prompt = f"""You are a senior retail intelligence analyst creating a structured market intelligence dashboard for retail executives.

CATEGORY: "{query}"
SAMPLE: {len(product_data)} products

DATA:
{product_list}

Generate a comprehensive JSON intelligence report with the following structure:

```json
{{
  "executiveSummary": {{
    "categoryOverview": "2-3 sentence market snapshot",
    "keyFindings": ["finding 1", "finding 2", "finding 3"],
    "strategicPriority": "HIGH/MEDIUM/LOW market attractiveness",
    "dataConfidence": "confidence level assessment"
  }},
  "marketStructure": {{
    "concentration": "oligopoly/fragmented/monopolistic competition",
    "topBrandShare": "percentage of market held by top brand",
    "brandCount": "number of unique brands",
    "herfindahlIndex": "concentration metric (0-10000 scale)",
    "competitiveIntensity": "HIGH/MEDIUM/LOW"
  }},
  "pricingIntelligence": {{
    "priceRange": {{"min": 0, "max": 0, "spread": 0}},
    "pricePointClusters": [{{"tier": "budget", "range": "$X-$Y", "productCount": 0, "marketShare": "X%"}}, ...],
    "averagePrice": 0,
    "medianPrice": 0,
    "priceGaps": ["$X-$Y gap with N products", ...],
    "pricingStrategy": "EDLP/High-Low/Premium/Value",
    "psychologicalPricing": "charm pricing prevalence percentage",
    "priceElasticity": "estimated HIGH/MEDIUM/LOW from price-rating correlation"
  }},
  "qualityMetrics": {{
    "averageRating": 0,
    "ratingDistribution": {{"5star": 0, "4star": 0, "3star": 0, "2star": 0, "1star": 0}},
    "qualityConsistency": "variance in ratings",
    "premiumQualityGap": "rating difference between premium and budget",
    "reviewVolume": {{"average": 0, "median": 0, "topProduct": 0}},
    "trustSignals": "percentage with 100+ reviews"
  }},
  "competitivePositioning": {{
    "segments": [
      {{"name": "Premium", "priceRange": "$X-$Y", "avgRating": 0, "productCount": 0, "marketShare": "X%"}},
      {{"name": "Mid-Range", "priceRange": "$X-$Y", "avgRating": 0, "productCount": 0, "marketShare": "X%"}},
      {{"name": "Budget", "priceRange": "$X-$Y", "avgRating": 0, "productCount": 0, "marketShare": "X%"}}
    ],
    "valueLeaders": [{{"title": "...", "valueScore": "rating/priceRank ratio"}}, ...],
    "premiumLeaders": [{{"title": "...", "rating": 0, "price": 0}}, ...],
    "marketGaps": ["underserved price point $X-$Y", "feature gap: ...", ...]
  }},
  "consumerInsights": {{
    "purchaseDrivers": "price/quality/features - ordered by importance",
    "valuePerception": "price-to-quality ratio analysis",
    "satisfactionLevel": "HIGH/MEDIUM/LOW based on ratings",
    "decisionComplexity": "number of viable alternatives at each price point",
    "brandLoyalty": "estimated from brand concentration"
  }},
  "trendingSignals": {{
    "velocityIndicators": "sales momentum if data available",
    "emergingBrands": ["new entrants with growth potential"],
    "categoryMaturity": "growth/mature/declining signals",
    "seasonalIndicators": "any seasonal patterns detected"
  }},
  "opportunities": {{
    "whitespace": ["specific underserved segments or price points"],
    "featureGaps": ["missing features that could differentiate"],
    "privateLabel": "viability assessment for store brands",
    "premiumization": "opportunity to trade consumers up",
    "valueEngineering": "opportunity to offer better value"
  }},
  "strategicRecommendations": {{
    "newEntrants": ["strategic recommendation 1", "strategic recommendation 2"],
    "existingPlayers": ["portfolio optimization advice 1", "advice 2"],
    "pricingStrategy": "optimal positioning recommendation",
    "productDevelopment": ["feature priorities based on gaps"],
    "riskFactors": ["competitive threats or market risks"]
  }},
  "dataQuality": {{
    "sampleSize": {len(product_data)},
    "coverage": "percentage of category captured",
    "limitations": ["data gaps that impact confidence"],
    "additionalDataNeeded": ["historical pricing", "inventory levels", etc.]
  }}
}}
```

CRITICAL REQUIREMENTS:
- Use ACTUAL numbers from the data (not placeholders)
- Calculate all percentages and ratios accurately
- Identify SPECIFIC brands, price points, and products
- Flag any data quality issues
- Provide ACTIONABLE insights, not generic observations
- Use retail intelligence terminology throughout
"""
    return prompt