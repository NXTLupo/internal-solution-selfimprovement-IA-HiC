from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import statistics
import json
import os
from config import Config
import gc  # Add garbage collection

# Create a singleton analyzer to avoid recreating it for each document
_vader_analyzer = None

def get_sentiment_score(text):
    """Calculate sentiment score for a piece of text using VADER"""
    global _vader_analyzer
    
    # Initialize the analyzer only once
    if _vader_analyzer is None:
        _vader_analyzer = SentimentIntensityAnalyzer()
    
    try:
        # Clean the text - remove any problematic characters
        text = str(text).strip()
        if not text:
            return 0
            
        scores = _vader_analyzer.polarity_scores(text)
        return scores['compound']  # Returns a score between -1 and 1
    except Exception as e:
        print(f"Error in sentiment analysis: {str(e)}")
        return 0

def categorize_sentiment(score):
    """Categorize sentiment score into positive, negative, or neutral"""
    if score > 0.05:
        return "positive", score
    elif score < -0.05:
        return "negative", score
    else:
        return "neutral", score

def analyze_topic_sentiment(topic_docs):
    """Analyze sentiment for a collection of documents"""
    try:
        # Calculate sentiment scores for each document
        sentiment_scores = []
        for doc in topic_docs:
            score = get_sentiment_score(doc)
            sentiment_scores.append(score)
        
        # Calculate average sentiment score
        avg_score = statistics.mean(sentiment_scores) if sentiment_scores else 0
        
        # Get sentiment category and final score
        sentiment_category, final_score = categorize_sentiment(avg_score)
        
        # Calculate sentiment distribution
        sentiment_distribution = {
            "positive": len([s for s in sentiment_scores if s > 0.05]),
            "neutral": len([s for s in sentiment_scores if -0.05 <= s <= 0.05]),
            "negative": len([s for s in sentiment_scores if s < -0.05])
        }
        
        result = {
            "category": sentiment_category,
            "score": final_score,
            "distribution": sentiment_distribution,
            "raw_scores": sentiment_scores
        }
        
        return result
    finally:
        # Force garbage collection when done processing many documents
        if len(topic_docs) > 100:
            gc.collect()

def analyze_topics_sentiment(topic_model, topics, documents):
    """Analyze sentiments for all topics"""
    try:
        topic_sentiments = {}
        topic_info = topic_model.get_topic_info()
        
        # Process topics
        analyzed_topics = topic_info[topic_info['Topic'] != -1]
        for topic in analyzed_topics.itertuples():
            # Get documents for this topic
            topic_docs = [doc for doc, t in zip(documents, topics) if t == topic.Topic]
            
            # Analyze sentiment for this topic
            sentiment_results = analyze_topic_sentiment(topic_docs)
            topic_sentiments[str(topic.Topic)] = sentiment_results
            
            # Clean up topic specific resources after each iteration
            del topic_docs
            gc.collect()
        
        # Save sentiment results to a separate file
        sentiment_output_path = os.path.join(Config.TOPIC_MODEL_DIR, 'topic_sentiments.json')
        with open(sentiment_output_path, 'w') as f:
            json.dump(topic_sentiments, f, indent=2)
        
        return topic_sentiments
    finally:
        # Ensure resources are cleaned up
        if '_vader_analyzer' in globals():
            global _vader_analyzer
            _vader_analyzer = None
        gc.collect()

# Add a cleanup function that can be called externally
def cleanup_sentiment_analyzer():
    """Manually cleanup the sentiment analyzer resources"""
    global _vader_analyzer
    _vader_analyzer = None
    gc.collect() 