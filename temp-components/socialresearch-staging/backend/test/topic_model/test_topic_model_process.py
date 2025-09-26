# write a test to test BertTopic.py with dummy data from /dummy_data/reddit_data.json
# the test should siumilar to main function in bertopic.py

import os
import sys
import json
import shutil
import pytest

# Add the parent directory to the path so we can import the BertTopic module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the functions from BertTopic.py
from util.topic_model.BertTopic import (
    analyze_topics,
    summarize_topics,
    analyze_topic_sentiment,
    calculate_topic_similarities
)

def test_bertopic_with_dummy_data():
    """
    Test the BertTopic functionality using dummy data from reddit_data.json
    This test follows the same flow as the main function in BertTopic.py
    """
    # Load dummy reddit data from the json file
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                           "dummy_data", "reddit_data.json")
    
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Extract documents, post_ids, and scores from the loaded data
    documents = []
    post_ids = []
    scores = []
    
    for post_id, post_content in data.items():
        documents.append(post_content)
        post_ids.append(post_id)
        scores.append(1)  # Default score if not available in the data
    
    # Create temp directory for test outputs
    test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_output")
    temp_dir = os.path.join(test_dir, "temp")
    log_dir = os.path.join(test_dir, "log_topic")
    
    # Set environment variable for logs
    os.environ['TOPIC_LOG_DIR'] = log_dir
    
    # Create directories
    os.makedirs(log_dir, exist_ok=True)
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Step 1: Analyze topics with BERTopic
        print("Step 1: Analyzing topics with BERTopic...")
        topic_model, topics, docs = analyze_topics(documents, post_ids, scores)
        
        # Step 2: Save topic information
        print("Step 2: Saving topic information...")
        topic_info = topic_model.get_topic_info()
        topic_info.to_csv(os.path.join(temp_dir, "topic_info.csv"), index=False)
        
        # Save topic words
        with open(os.path.join(temp_dir, "topic_words.txt"), 'w', encoding='utf-8') as f:
            for topic_id in topic_info['Topic'].unique():
                if topic_id != -1:  # Skip outlier topic
                    words = topic_model.get_topic(topic_id)
                    f.write(f"Topic {topic_id}:\n")
                    for word, weight in words:
                        f.write(f"  {word}: {weight:.4f}\n")
                    f.write("\n")
        
        # Step 3: Calculate topic similarities
        print("Step 3: Calculating topic similarities...")
        similarities = calculate_topic_similarities(topic_model, topic_info)
        with open(os.path.join(temp_dir, "topic_similarities.json"), 'w', encoding='utf-8') as f:
            json.dump(similarities, f, indent=2)
        
        # Step 4: Generate topic summaries (limit to 2 topics for test efficiency)
        print("Step 4: Generating topic summaries...")
        # Use a small limit to avoid too many API calls during testing
        topic_summaries = summarize_topics(topic_model, topics, docs, summary_limit=2)
        
        # Save topic summaries
        with open(os.path.join(temp_dir, "topic_summaries.json"), 'w', encoding='utf-8') as f:
            json.dump(topic_summaries, f, indent=2)
        
        # Step 5: Analyze sentiment for each topic
        print("Step 5: Analyzing topic sentiment...")
        topic_sentiments = {}
        for topic_id in list(topic_summaries.keys())[:2]:  # Limit to first 2 topics for efficiency
            # Get documents for this topic
            topic_docs = [doc for doc, t in zip(docs, topics) if t == topic_id]
            if topic_docs:
                print(f"  Analyzing sentiment for Topic {topic_id} ({len(topic_docs)} documents)...")
                sentiment_label, sentiment_score = analyze_topic_sentiment(topic_docs, topic_id, temp_dir)
                topic_sentiments[topic_id] = {
                    "label": sentiment_label,
                    "score": sentiment_score
                }
        
        # Save topic sentiments
        with open(os.path.join(temp_dir, "topic_sentiments.json"), 'w', encoding='utf-8') as f:
            json.dump(topic_sentiments, f, indent=2)
        
        # Basic assertions to verify the test worked
        assert topic_model is not None, "Topic model should not be None"
        assert len(topics) == len(documents), "Number of topics should match number of documents"
        assert not topic_info.empty, "Topic info should not be empty"
        
        # Print summary of results
        print("\nTest Results Summary:")
        print(f"- Documents processed: {len(documents)}")
        print(f"- Topics found: {len(topic_info[topic_info['Topic'] != -1])}")
        print(f"- Topic similarities calculated: {len(similarities)}")
        print(f"- Topic summaries generated: {len(topic_summaries)}")
        print(f"- Topic sentiments analyzed: {len(topic_sentiments)}")
        print(f"- Results saved to: {temp_dir}")
        
    finally:
        # Clean up after test (uncomment to keep the output files for inspection)
        # if os.path.exists(test_dir):
        #     shutil.rmtree(test_dir)
        pass

if __name__ == "__main__":
    # Run the test directly when the script is executed
    test_bertopic_with_dummy_data()