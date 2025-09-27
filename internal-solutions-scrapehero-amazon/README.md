# Amazon Market Intelligence Platform

Part of the NXT HUMANS Intelligence Augmentation Suite, the Amazon Market Intelligence platform transforms simple product data extraction into actionable market insights. This advanced tool helps marketing analysts and product researchers understand competitive landscapes, identify trends, and make data-driven decisions.

## Key Features

### Intelligent Product Extraction
- Extract detailed product information using just product names or ASINs - no URLs required
- Natural language search capabilities for finding products without Amazon links
- Analyze pricing, ratings, reviews, availability and descriptions
- Visual display of product details with sentiment analysis

### Intelligent Category Analysis
- Analyze products by category name, brand, or any search term
- No need for complex Amazon URLs - just type what you're looking for
- Compare products across key metrics (price, ratings, reviews)
- Identify top-performing products in each category
- Price range analysis and competitive positioning

### Market Insights & AI Analysis
- AI-powered market analysis with multiple LLMs (Claude 4, OpenAI o3, Gemini 2.5)
- "Talk to your data" functionality to ask questions about products
- Structured insights about price ranges, ratings, and common features
- Identify common customer pain points and preferences
- Competitive brand analysis and recommendations
- Feature analysis across similar products
- Trend detection based on user-defined time ranges

## Technical Details

### Architecture
- Flask web application with modern responsive UI
- Selectorlib for efficient HTML parsing
- Rate limiting and robust error handling
- Category crawling with intelligent pagination
- LLM integration with Anthropic Claude 4, OpenAI o3, and Google Gemini 2.5
- Environment variable handling for secure API key management
- Consistent with NXT HUMANS Intelligence Augmentation design patterns

### Installation and Usage

1. Ensure the service is enabled in the `docker-compose-all.yml` file
2. Install required dependencies:
   ```bash
   cd internal-solutions-scrapehero-amazon
   pip install -r requirements.txt
   ```
3. Ensure API keys are set in the `.env` file or environment variables:
   ```
   ANTHROPIC_API_KEY=your_anthropic_key_here  # For Claude 4 analysis
   OPENAI_API_KEY=your_openai_key_here        # For OpenAI o3 analysis
   GEMINI_API_KEY=your_gemini_key_here        # For Gemini 2.5 analysis
   ```
4. Run the dependency test to verify your setup:
   ```bash
   python test_dependencies.py
   ```
5. Start the platform using the standard launchpad or run locally:
   ```bash
   # Using Docker:
   docker-compose up -d
   # OR locally:
   flask run --host=0.0.0.0 --port=5000
   ```
6. Access the UI at: `http://localhost:5008` (default port)

### API Endpoints

#### Product Endpoints
- `POST /scrape` - Extract data for a single product
  - Accepts: product name, ASIN, or URL in any of these fields: `url`, `product`, `query`, `search`, `term`, `asin`, `q`
  - Example: `{"product": "AirPods Pro"}` or `{"asin": "B07PXGQC1Q"}` or `{"url": "https://amazon.com/dp/B07PXGQC1Q"}`

- `POST /api/category` - Extract multiple products from a category or search term
  - Accepts: category name, brand name, search term, or URL in any of these fields: `query`, `search`, `term`, `url`, `category`, `keyword`, `product`, `brand`, `q`
  - Parameters: `limit` (max products), `sort` (sorting method), `trending_range` (days for trending calculation)
  - Example: `{"category": "gaming laptops", "limit": 50, "sort": "trending", "trending_range": 30}`

- `GET /api/scrape` - Legacy endpoint for review scraping
- `GET /health` - Health check endpoint

#### LLM Analysis Endpoints
- `GET /api/llm-providers` - Get available LLM providers and their status
  - Returns: List of available providers with their names, models, and availability

- `POST /api/analyze` - Analyze product data using specified LLM provider
  - Parameters: `products` (array of product data), `query` (original search term), `llm_provider` ("claude", "openai", or "gemini")
  - Returns: General analysis of the products

- `POST /api/analyze/structured` - Get structured insights in JSON format
  - Parameters: Same as `/api/analyze`
  - Returns: Structured JSON with price analysis, ratings analysis, common features, and recommendations

- `POST /api/analyze/question` - Answer a specific question about the product data
  - Parameters: `products`, `query`, `llm_provider`, and `question` (user's specific question)
  - Returns: LLM-generated answer to the question

## Integration with the Workbench

This service is fully integrated with the NXT HUMANS AI CX Workbench architecture and can be used alongside other Intelligence Augmentation tools. Data extracted using this platform can be further analyzed using:

- Social Research Analysis Tool
- AI Journey Mapper
- Presentation Generator

## Future Enhancements

- Sentiment analysis using Claude 3.7 or 4
- Competitive brand mapping
- Price trend monitoring
- Review sentiment clustering
- Integration with pgvector for semantic search
- PDF/Excel report generation

## Technical Limitations

- Rate limiting is enforced to prevent excessive requests
- Amazon may implement anti-scraping measures that require adapting selectors
- Large-scale data collection should be scheduled during off-peak hours
- Image analysis currently limited to product thumbnails only