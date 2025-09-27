from flask import Flask, request, jsonify, render_template
import os
import requests
import json

app = Flask(__name__)

# Simple version of the app that doesn't rely on LLM integrations
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/category', methods=['POST'])
def search_category():
    try:
        data = request.json
        query = data.get('query', '')
        
        # Return a simplified response with minimal product data
        products = []
        for i in range(10):
            products.append({
                "title": f"Example Product {i+1} for '{query}'",
                "price": f"${(i+1) * 9.99:.2f}",
                "rating": 4.5,
                "review_count": (i+1) * 10,
                "asin": f"B0{i}XX{i}YY{i}Z",
                "trending_score": (i+1) * 5,
                "trending_rank": i+1
            })
        
        return jsonify({
            "success": True,
            "products": products,
            "query": query
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        products = data.get('products', [])
        query = data.get('query', '')
        
        # Generate a simple response without using LLMs
        analysis = f"""
        Analysis for {query} (found {len(products)} products):
        
        Based on the provided product data, here are some insights:
        
        1. Average price point: The products range from budget to premium options.
        2. Customer satisfaction: Most products have good ratings.
        3. Popular features: Products with higher reviews tend to have better features.
        4. Trending items: Several products are trending in this category.
        5. Recommendation: Consider products with higher trending scores for better value.
        """
        
        return jsonify({
            "success": True,
            "analysis": analysis
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/analyze/structured', methods=['POST'])
def structured_analysis():
    try:
        data = request.json
        products = data.get('products', [])
        query = data.get('query', '')
        
        # Generate a structured response without using LLMs
        structured = {
            "category_overview": {
                "name": query,
                "product_count": len(products),
                "price_range": {
                    "min": "$9.99",
                    "max": "$99.99",
                    "average": "$49.99"
                },
                "rating_summary": {
                    "average": 4.5,
                    "count": sum([p.get("review_count", 0) for p in products])
                }
            },
            "trending_analysis": {
                "top_trending": [p.get("title") for p in products[:3]],
                "trend_factors": ["Price", "Features", "Brand reputation", "Reviews"]
            },
            "recommendations": {
                "best_value": products[0].get("title") if products else "N/A",
                "premium_pick": products[-1].get("title") if products else "N/A",
                "rising_star": products[len(products)//2].get("title") if products else "N/A"
            }
        }
        
        return jsonify({
            "success": True,
            "structured_analysis": structured
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/analyze/question', methods=['POST'])
def answer_question():
    try:
        data = request.json
        products = data.get('products', [])
        query = data.get('query', '')
        question = data.get('question', '')
        
        # Generate a simple answer without using LLMs
        answer = f"""
        Question: {question}
        
        Answer: Based on the available data for {len(products)} products in the '{query}' category, 
        the answer would depend on specific product attributes. The data shows a range of prices, 
        ratings, and trending scores. For more specific information, please refine your question
        or check individual product details.
        """
        
        return jsonify({
            "success": True,
            "answer": answer
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/llm-providers', methods=['GET'])
def get_llm_providers():
    """Return available LLM providers and their status."""
    # Check for API keys to determine which providers are available
    providers = [
        {
            "id": "claude",
            "name": "Claude 3.5 Sonnet",
            "available": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "description": "Anthropic's Claude 3.5 Sonnet model"
        },
        {
            "id": "openai",
            "name": "GPT-4o",
            "available": bool(os.environ.get("OPENAI_API_KEY")),
            "description": "OpenAI's GPT-4o model"
        },
        {
            "id": "gemini",
            "name": "Gemini 1.5 Pro",
            "available": bool(os.environ.get("GEMINI_API_KEY")),
            "description": "Google's Gemini 1.5 Pro model"
        }
    ]
    
    return jsonify({
        "success": True,
        "providers": providers
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)