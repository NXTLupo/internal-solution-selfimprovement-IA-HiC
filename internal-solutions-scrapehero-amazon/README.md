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

### Market Insights (Coming Soon)
- AI-powered market analysis
- Identify common customer pain points and preferences
- Competitive brand analysis
- Feature analysis across similar products
- Trend detection and forecasting

## Technical Details

### Architecture
- Flask web application with modern UI
- Selectorlib for efficient HTML parsing
- Rate limiting and robust error handling
- Category crawling with intelligent pagination
- Consistent with NXT HUMANS Intelligence Augmentation design patterns

### Installation and Usage

1. Ensure the service is enabled in the `docker-compose-all.yml` file
2. Start the platform using the standard launchpad
3. Access the UI at: `http://localhost:[PORT]`

### API Endpoints

- `POST /scrape` - Extract data for a single product
  - Accepts: product name, ASIN, or URL in any of these fields: `url`, `product`, `query`, `search`, `term`, `asin`, `q`
  - Example: `{"product": "AirPods Pro"}` or `{"asin": "B07PXGQC1Q"}` or `{"url": "https://amazon.com/dp/B07PXGQC1Q"}`

- `POST /api/category` - Extract multiple products from a category or search term
  - Accepts: category name, brand name, search term, or URL in any of these fields: `query`, `search`, `term`, `url`, `category`, `keyword`, `product`, `brand`, `q`
  - Example: `{"category": "gaming laptops"}` or `{"search": "sony headphones"}`

- `GET /api/scrape` - Legacy endpoint for review scraping
- `GET /health` - Health check endpoint

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