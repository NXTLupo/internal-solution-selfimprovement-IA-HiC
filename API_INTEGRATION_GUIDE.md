# API Integration Guide for NXT Humans AI CX Workbench

This document provides an overview of the various third-party APIs integrated into the NXT Humans AI CX Workbench, along with their documentation links, authentication methods, rate limits, and potential use cases. This information is crucial for understanding the system's capabilities and for future development or troubleshooting.

**Note:** API keys are sensitive information and should be handled securely. They are loaded from `.env.local` files and should **NEVER** be committed to version control.

---

## Integrated APIs Overview

### 1. Google Gemini API
*   **Documentation URL**: `https://ai.google.dev/docs`
*   **Key Endpoints/Authentication**: REST APIs, streaming APIs. Authentication via API key (usually in headers or query parameters).
*   **Rate Limits/Notes**: Varies by project and usage tier. Check Google Cloud Vertex AI pricing and quotas for specifics.
*   **Value/Best-fit Templates**: Generative AI tasks, natural language processing, content generation, summarization, chatbots, image generation (native).

### 2. Anthropic Claude API
*   **Documentation URL**: `https://docs.claude.com/en/api/overview`
*   **Key Endpoints/Authentication**: REST API. Authentication via API key in headers (`x-api-key`).
*   **Rate Limits/Notes**: Varies by plan and model (e.g., Claude 3.7 Sonnet, Claude Sonnet 4). Check Anthropic's pricing page for details.
*   **Value/Best-fit Templates**: Advanced conversational AI, complex reasoning, content creation, summarization, code generation, creative writing.

### 3. OpenAI API
*   **Documentation URL**: `https://platform.openai.com/docs/api-reference`
*   **Key Endpoints/Authentication**: REST API, streaming API. Authentication via API key in headers (`Authorization: Bearer YOUR_API_KEY`).
*   **Rate Limits/Notes**: Varies by model and usage tier. Check OpenAI's pricing and rate limit pages.
*   **Value/Best-fit Templates**: Generative AI, natural language understanding, image generation (DALL-E), code completion, embeddings, fine-tuning.

### 4. NewsAPI
*   **Documentation URL**: `https://newsapi.org/docs`
*   **Key Endpoints/Authentication**: HTTP REST API. Authentication via API key in query parameters (`apiKey`) or headers.
*   **Rate Limits/Notes**: Free tier: 100 requests/day. Commercial plans offer higher limits.
*   **Value/Best-fit Templates**: Real-time news headlines, article search, trend analysis, content aggregation.

### 5. Alpha Vantage API
*   **Documentation URL**: `https://www.alphavantage.co/documentation/`
*   **Key Endpoints/Authentication**: REST API. Authentication via API key in query parameters (`apikey`).
*   **Rate Limits/Notes**: Free tier: 5 requests/minute, 500 requests/day.
*   **Value/Best-fit Templates**: Stock market data, cryptocurrency data, technical indicators, economic data, forex rates.

### 6. U.S. Census Data API
*   **Documentation URL**: `https://www.census.gov/data/developers/guidance/api-user-guide.html`
*   **Key Endpoints/Authentication**: REST API. API key required.
*   **Rate Limits/Notes**: Varies by dataset; usage policies apply.
*   **Value/Best-fit Templates**: Demographics enrichment, market sizing, location strategy, social and economic research.

### 7. BLS Public Data API (Bureau of Labor Statistics)
*   **Documentation URL**: `https://www.bls.gov/developers/home.htm`
*   **Key Endpoints/Authentication**: REST API. API key (v2) for higher limits.
*   **Rate Limits/Notes**: v2 enables higher limits; v1 has lower limits.
*   **Value/Best-fit Templates**: Labor market analysis, wage trends, economic indicators.

### 8. FRED / ALFRED API (Federal Reserve Economic Data)
*   **Documentation URL**: `https://fred.stlouisfed.org/docs/api/fred/`
*   **Key Endpoints/Authentication**: REST API. API key required.
*   **Rate Limits/Notes**: Per-key request limits; fair use policy.
*   **Value/Best-fit Templates**: Economic signals, macro forecasting, financial market analysis.

### 9. EIA API (U.S. Energy Information Administration)
*   **Documentation URL**: `https://www.eia.gov/opendata/documentation.php`
*   **Key Endpoints/Authentication**: REST API (APIv2). API key required.
*   **Rate Limits/Notes**: Max 5,000 rows per request. Pagination required for more data.
*   **Value/Best-fit Templates**: Energy data, statistics, forecasts, market analysis.

### 10. OpenWeatherMap API
*   **Documentation URL**: `https://openweathermap.org/api/`
*   **Key Endpoints/Authentication**: REST API. API key in query parameters (`appid`).
*   **Rate Limits/Notes**: Free tier: 1,000 calls/day.
*   **Value/Best-fit Templates**: Current weather data, forecasts, historical weather, geographical data.

### 11. Browserless API
*   **Documentation URL**: `https://www.browserless.io/docs/`
*   **Key Endpoints/Authentication**: REST APIs, BrowserQL (GraphQL), Browsers as a Service. API token in headers or query parameters.
*   **Rate Limits/Notes**: Varies by plan.
*   **Value/Best-fit Templates**: Headless browser automation, web scraping, PDF generation, screenshotting, AI integrations.

### 12. Replicate API
*   **Documentation URL**: `https://replicate.com/docs/api`
*   **Key Endpoints/Authentication**: REST API. API token in headers (`Authorization: Token YOUR_API_TOKEN`).
*   **Rate Limits/Notes**: Varies by model and usage.
*   **Value/Best-fit Templates**: Running open-source AI models (image generation, text generation, audio processing), custom model deployment.

### 13. ElevenLabs API
*   **Documentation URL**: `https://elevenlabs.io/docs/api-reference/introduction`
*   **Key Endpoints/Authentication**: HTTP/WebSocket API. API key in headers (`xi-api-key`).
*   **Rate Limits/Notes**: Varies by plan and usage.
*   **Value/Best-fit Templates**: High-quality text-to-speech, voice cloning, audio generation, podcast creation.

### 14. RunPod API
*   **Documentation URL**: `https://docs.runpod.io/docs/overview`
*   **Key Endpoints/Authentication**: REST API. API key in headers (`Authorization: Bearer YOUR_API_KEY`).
*   **Rate Limits/Notes**: Varies by usage and resource availability.
*   **Value/Best-fit Templates**: Cloud GPU platform, running custom AI models, serverless GPU, machine learning inference.

### 15. Hugging Face API
*   **Documentation URL**: `https://huggingface.co/docs/api-reference/overview`
*   **Key Endpoints/Authentication**: REST API. API token in headers (`Authorization: Bearer YOUR_API_TOKEN`).
*   **Rate Limits/Notes**: Varies by model and usage.
*   **Value/Best-fit Templates**: Accessing a vast library of pre-trained AI models, natural language processing, computer vision, audio, model deployment.

### 16. Together API
*   **Documentation URL**: `https://docs.together.ai/`
*   **Key Endpoints/Authentication**: REST API. API key in headers (`Authorization: Bearer YOUR_API_KEY`).
*   **Rate Limits/Notes**: Varies by model and usage.
*   **Value/Best-fit Templates**: Accessing open-source generative AI models, fine-tuning, inference, large language models.

### 17. Figma API
*   **Documentation URL**: `https://www.figma.com/developers/api`
*   **Key Endpoints/Authentication**: REST API. Personal access tokens or OAuth2.
*   **Rate Limits/Notes**: Standard API rate limits apply. Read-only access for most data.
*   **Value/Best-fit Templates**: Automating design workflows, integrating with design tools, extracting design data, generating design assets.

### 18. Luma AI API
*   **Documentation URL**: `https://lumalabs.ai/docs`
*   **Key Endpoints/Authentication**: API key.
*   **Rate Limits/Notes**: Specific to Luma AI services and products (e.g., Dream Machine API).
*   **Value/Best-fit Templates**: 3D capture, photogrammetry, generating 3D assets from images/videos, AI-powered video generation.

### 19. Miro Access Token (Miro API)
*   **Documentation URL**: `https://developers.miro.com/docs/`
*   **Key Endpoints/Authentication**: REST API. OAuth 2.0 for authorization. Access token in headers.
*   **Rate Limits/Notes**: Varies by plan.
*   **Value/Best-fit Templates**: Integrating with Miro boards, automating board creation, managing board content, collaborative tools.

### 20. ComfyUI API
*   **Documentation URL**: `https://viewcomfy.com/docs/api`
*   **Key Endpoints/Authentication**: WebSocket for real-time updates, HTTP for queuing workflows. API key might be required for remote access.
*   **Rate Limits/Notes**: Depends on local setup or hosting.
*   **Value/Best-fit Templates**: Node-based Stable Diffusion UI, custom workflows for image generation, automation of generative AI tasks.

### 21. Azure DeepSeek Key (DeepSeek AI)
*   **Documentation URL**: `https://api-docs.deepseek.com/api/create-chat-completion` and Microsoft Azure documentation for Azure integration.
*   **Key Endpoints/Authentication**: API key.
*   **Rate Limits/Notes**: Varies by Azure subscription and DeepSeek model.
*   **Value/Best-fit Templates**: Accessing DeepSeek's advanced AI models for various tasks, chat completion, code generation.

### 22. Reddit API
*   **Documentation URL**: `https://www.reddit.com/dev/api`
*   **Key Endpoints/Authentication**: REST API. OAuth2 (Client ID, Client Secret, User Agent, Username, Password for script apps).
*   **Rate Limits/Notes**: Strict rate limits (e.g., 60 requests/minute for OAuth clients). Unique User-Agent required.
*   **Value/Best-fit Templates**: Data collection from Reddit, social listening, content analysis, community engagement.

### 23. SERP API (Google Search API)
*   **Documentation URL**: `https://serpapi.com/search-api`
*   **Key Endpoints/Authentication**: REST API. API key in query parameters.
*   **Rate Limits/Notes**: Varies by plan and provider.
*   **Value/Best-fit Templates**: Real-time search results from Google, local search, image search, news search, competitive analysis.
