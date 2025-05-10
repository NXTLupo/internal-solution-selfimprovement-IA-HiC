#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import time  # Added for sleep
from bertopic import BERTopic
from sklearn.feature_extraction.text import CountVectorizer
import numpy as np
from umap import UMAP
import praw
import sys
import os
from sentence_transformers import SentenceTransformer, util
from transformers import pipeline
from statistics import mean
import shutil
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
import nltk
from nltk.tokenize import sent_tokenize
from hdbscan import HDBSCAN
from nltk.corpus import stopwords
import random  # Added for random document selection
import gc  # For garbage collection

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from util.prompts.topic_prompt import get_openai_generate_topic_prompt
from util.llm_models.openai import get_openai_completion
from util.llm_models.claude import get_claude_completion_with_json



def get_all_comments(comment):
    """Recursively get all comments and their replies"""
    comments_text = ""
    if hasattr(comment, 'body'):
        comments_text += f"{comment.body}\n"
    
    # Get replies if they exist
    if hasattr(comment, 'replies'):
        for reply in comment.replies:
            comments_text += get_all_comments(reply)
    
    return comments_text

def load_reddit_posts():
    # Initialize Reddit client using os.getenv instead of Config
    reddit = praw.Reddit(
        client_id=os.getenv('REDDIT_CLIENT_ID', ''),
        client_secret=os.getenv('REDDIT_CLIENT_SECRET', ''),
        user_agent=os.getenv('REDDIT_USER_AGENT', ''),
    )

    # Get the NEU subreddit
    subreddit = reddit.subreddit('ouraring')
    
    # Initialize lists to store data
    documents = []
    post_ids = []
    scores = []
    
    # Fetch posts
    for submission in subreddit.new(limit=100):
        # Combine title and content
        title = submission.title
        content = submission.selftext if hasattr(submission, 'selftext') else ''
        
        # Fetch ALL comments including nested ones
        submission.comments.replace_more(limit=None)  # Get all MoreComments
        comments_text = ""
        for comment in submission.comments:
            comments_text += get_all_comments(comment)
        
        # Only include non-empty posts
        if title or content or comments_text:
            documents.append(f"{title} {content} {comments_text}".strip())
            post_ids.append(submission.id)
            scores.append(submission.score)
    
    return documents, post_ids, scores

def select_relevant_sentences(documents, top_words, max_sentences=5):
    """
    Selects the most relevant sentences from a list of documents based on similarity to topic keywords.
    Collects more sentences until reaching a character limit of 20,000.
    """
    # Download NLTK punkt if not already downloaded
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    
    model = SentenceTransformer('all-mpnet-base-v2')  
    
    topic_embedding = model.encode(' '.join(top_words), convert_to_tensor=True)
    
    selected_sentences = []
    total_chars = 0
    max_chars = 20000  # Maximum 20,000 characters total
    
    # Get all sentences from all documents and their similarities
    all_sentences = []
    all_similarities = []
    
    for doc in documents:
        sentences = sent_tokenize(doc)
        if not sentences:
            continue
            
        sentence_embeddings = model.encode(sentences, convert_to_tensor=True)
        
        # Compute cosine similarity between each sentence and topic
        similarities = util.cos_sim(sentence_embeddings, topic_embedding)
        
        # Process based on whether we have a single sentence or multiple
        if len(sentences) == 1:
            all_sentences.append(sentences[0])
            all_similarities.append(similarities.item())
        else:
            # For multiple sentences
            similarities = similarities.squeeze()
            for i, sentence in enumerate(sentences):
                all_sentences.append(sentence)
                all_similarities.append(similarities[i].item())
    
    # No sentences found
    if not all_sentences:
        return ["No relevant sentences found."]
    
    # Sort all sentences by similarity
    combined = list(zip(all_sentences, all_similarities))
    combined.sort(key=lambda x: x[1], reverse=True)
    
    # Take the most relevant sentences until reaching character limit
    for sentence, _ in combined:
        sentence_len = len(sentence)
        if total_chars + sentence_len <= max_chars:
            selected_sentences.append(sentence)
            total_chars += sentence_len
        else:
            # If we can't add any more full sentences, stop
            break
    
    # If no sentences were selected (maybe all are too long), take the first most relevant one
    if not selected_sentences and combined:
        selected_sentences = [combined[0][0]]
    
    return selected_sentences

def summarize_topics(topic_model, topics, documents, summary_limit, keyword=None ):
    log_dir = os.path.join(os.getenv('TOPIC_LOG_DIR', './log_topic'))
    os.makedirs(log_dir, exist_ok=True)

    topic_summaries = {}
    topic_info = topic_model.get_topic_info()
    valid_topics = topic_info[topic_info['Topic'] != -1].sort_values('Count', ascending=False)
    
    # Fix for handling None or non-integer summary_limit
    if summary_limit is not None and isinstance(summary_limit, int):
        top_topics_to_summarize = valid_topics['Topic'].tolist()[:summary_limit]
        with open(os.path.join(log_dir, 'topic_summarization_log.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Starting summarization for top {summary_limit} topics...\n")
        # Safe string for progress update and final message
        limit_str = str(summary_limit)
    else:
        top_topics_to_summarize = valid_topics['Topic'].tolist()
        with open(os.path.join(log_dir, 'topic_summarization_log.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Starting summarization for all {len(top_topics_to_summarize)} topics...\n")
        # Safe string for progress update and final message
        limit_str = "all"

    # Initialize model just once outside the loop
    model = SentenceTransformer('all-mpnet-base-v2')
    
    for i, topic_id in enumerate(top_topics_to_summarize, start=1):
        if topic_id == -1:
            continue

        with open(os.path.join(log_dir, 'topic_summarization_log.txt'), 'a', encoding='utf-8') as f:
            f.write(f"Processing topic {topic_id} ({i}/{limit_str})...\n")

        # Get top words for the topic
        top_words = topic_model.get_topic(topic_id)
        if not top_words:
            with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'w', encoding='utf-8') as f:
                f.write(f"No words found for topic {topic_id}. Skipping.")
            continue
        top_words_list = [word[0] for word in top_words[:7]]  # Take top 7 words

        # Extract representative sentences for this topic
        rep_docs = topic_model.get_representative_docs(topic_id)

        if not rep_docs:
            with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'w', encoding='utf-8') as f:
                f.write(f"No representative documents found for topic {topic_id}.")
                
            # Get all documents for this topic
            topic_docs = [doc for doc, t in zip(documents, topics) if t == topic_id]
            if topic_docs and len(topic_docs) > 0:
                # Use semantic similarity to find the most representative documents
                try:
                    # Create a topic embedding from the top words
                    topic_text = ' '.join(top_words_list)
                    topic_embedding = model.encode(topic_text, convert_to_tensor=True)
                    
                    # Get document embeddings
                    doc_embeddings = model.encode(topic_docs, convert_to_tensor=True)
                    similarities = util.cos_sim(doc_embeddings, topic_embedding)
                    
                    # Get the indices of the top 20 most similar documents
                    top_indices = similarities.argsort(descending=True)[:20].cpu().numpy()
                    
                    # Get the most similar documents
                    similar_docs = [topic_docs[idx] for idx in top_indices]
                    
                    with open(os.path.join(log_dir, f'topic_{topic_id}_log.txt'), 'w', encoding='utf-8') as f:
                        f.write(f"Found {len(similar_docs)} semantically similar documents for topic {topic_id}.\n")
                    example_sentences = select_relevant_sentences(similar_docs, top_words_list)
                    
                    if not example_sentences or all(s == "No relevant sentences found." for s in example_sentences):
                        with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'a', encoding='utf-8') as f:
                            f.write(f"\nNo relevant sentences found in similar documents for topic {topic_id}. Using top words only.")
                        example_sentences = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
                except Exception as e:
                    with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'a', encoding='utf-8') as f:
                        f.write(f"\nError finding similar documents for topic {topic_id}: {e}. Using top words only.")
                    example_sentences = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
                
                # Clear memory
                del doc_embeddings
                if 'similarities' in locals():
                    del similarities
                if 'topic_embedding' in locals():
                    del topic_embedding
                if 'similar_docs' in locals():
                    del similar_docs
                gc.collect()
            else:
                with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'a', encoding='utf-8') as f:
                    f.write(f"\nNo documents found for topic {topic_id}. Using top words only.")
                example_sentences = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
        else:
            example_sentences = select_relevant_sentences(rep_docs, top_words_list)
            if not example_sentences or all(s == "No relevant sentences found." for s in example_sentences):
                with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'w', encoding='utf-8') as f:
                    f.write(f"No relevant sentences found for topic {topic_id}. Using top words only.")
                example_sentences = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
        
        # Generate a structured sentence using the LLM
        prompt = get_openai_generate_topic_prompt(top_words_list, example_sentences, keyword)
        with open(os.path.join(log_dir, f'summary_prompt_topic_{topic_id}.txt'), 'w', encoding='utf-8') as f:
            f.write(prompt)

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        try:
            topic_summary = get_claude_completion_with_json(messages)
            topic_summaries[topic_id] = topic_summary
        except Exception as e:
            with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'a', encoding='utf-8') as f:
                f.write(f"\nError generating summary for topic {topic_id}: {e}")
            topic_summaries[topic_id] = {"short_summary": f"Error: {e}", "long_summary": f"Error generating summary for topic {topic_id}. Keywords: {', '.join(top_words_list)}"} # Add error message

        # Clean up topic-specific resources
        del top_words
        del top_words_list
        if 'topic_docs' in locals():
            del topic_docs
        if 'rep_docs' in locals():
            del rep_docs
        del example_sentences
        gc.collect()

        # ---  API rate delay due to API rate limits, delete this line in the future --- 
        with open(os.path.join(log_dir, 'topic_summarization_log.txt'), 'a', encoding='utf-8') as f:
            f.write(f"Waiting 5 seconds before next topic...\n")
        time.sleep(5) 
        # ---------------------------------

    # Use the already defined limit_str variable to display the appropriate message
    with open(os.path.join(log_dir, 'topic_summarization_log.txt'), 'a', encoding='utf-8') as f:
        f.write(f"Finished generating summaries for {limit_str} topics.\n")
    
    # Clean up the model
    del model
    gc.collect()
    
    return topic_summaries

def analyze_topic_sentiment(topic_docs, topic_id, temp_dir):
    """
    Analyze sentiment of topic documents using BERT-based sentiment analyzer
    Returns: sentiment_label (str), sentiment_score (float)
    """
    # Create a debug file for this topic
    debug_file_path = os.path.join(temp_dir, f"topic_{topic_id}_sentiment_debug.txt")
    with open(debug_file_path, 'w', encoding='utf-8') as debug_file:
        debug_file.write(f"Sentiment Analysis Debug for Topic {topic_id}\n")
        debug_file.write(f"Number of documents to analyze: {len(topic_docs)}\n")
        
        # Determine how many documents to analyze based on the total count
        doc_count = len(topic_docs)
        if doc_count < 150:
            # For very small datasets, analyze all documents
            max_docs_to_analyze = doc_count
            debug_file.write(f"Small dataset detected - will analyze all {max_docs_to_analyze} documents\n\n")
        else:
            # For larger datasets, limit to 20 documents
            max_docs_to_analyze = min(20, doc_count)
            debug_file.write(f"Will analyze up to {max_docs_to_analyze} documents\n\n")
        
        # Initialize sentiment analyzer
        debug_file.write("Initializing sentiment analyzer...\n")
        model1 = "CardiffNLP/twitter-roberta-base-sentiment"
        sentiment_analyzer = pipeline("sentiment-analysis", model=model1)
        debug_file.write("Sentiment analyzer initialized successfully\n\n")
        
        # Analyze sentiment for each document (limited to first 512 tokens due to BERT limitations)
        sentiments = []
        # If we have more documents than our limit, select a random sample to analyze
        docs_to_analyze = topic_docs[:max_docs_to_analyze] if doc_count <= max_docs_to_analyze else random.sample(topic_docs, max_docs_to_analyze)
        
        for i, doc in enumerate(docs_to_analyze):
            debug_file.write(f"Document {i+1}:\n")
            debug_file.write(f"Original length: {len(doc)} characters\n")
            
            try:
                # Clean the document by removing Content:, Comments:, and Score: labels
                cleaned_doc = doc
                for label in ["Content:", "Comments:", "Score:", "Title:"]:
                    cleaned_doc = cleaned_doc.replace(label, "")
                
                # Truncate long documents to prevent memory issues
                truncated_doc = cleaned_doc[:1200]
                debug_file.write(f"Truncated to: {len(truncated_doc)} characters\n")
                debug_file.write(f"final_Content: {truncated_doc}\n\n")
                
                # Analyze sentiment
                debug_file.write("Analyzing sentiment...\n")
                result = sentiment_analyzer(truncated_doc)[0]
                debug_file.write(f"Raw result: {result}\n")
                
                # Map the label to a score
                # CardiffNLP model returns labels like 'LABEL_0' (negative), 'LABEL_1' (neutral), 'LABEL_2' (positive)
                label = result['label']
                confidence = result['score']  # This is the confidence score from the model
                debug_file.write(f"Label: {label}\n")
                debug_file.write(f"Confidence: {confidence}\n")
                
                # Convert to a normalized score between -1 and 1
                if label == 'LABEL_0':  # Negative
                    normalized_score = -1.0 * confidence
                elif label == 'LABEL_1':  # Neutral
                    normalized_score = 0.0  # Neutral is always 0 regardless of confidence
                elif label == 'LABEL_2':  # Positive
                    normalized_score = 1.0 * confidence
                else:
                    normalized_score = 0.0  # Default to neutral for unknown labels
                
                debug_file.write(f"Normalized score (-1 to 1): {normalized_score}\n\n")
                sentiments.append(normalized_score)
            except Exception as e:
                debug_file.write(f"Error analyzing sentiment: {str(e)}\n\n")
                continue
        
        if not sentiments:
            debug_file.write("No valid sentiment scores found. Returning neutral (0.0)\n")
            
            # Clean up resources
            del sentiment_analyzer
            gc.collect()
            
            return "neutral", 0.0
        
        # Calculate average sentiment score
        avg_score = mean(sentiments)
        debug_file.write(f"All sentiment scores: {sentiments}\n")
        debug_file.write(f"Average sentiment score: {avg_score}\n")
        
        # Categorize sentiment
        if avg_score > 0.25:
            category = "positive"
        elif avg_score < -0.25:
            category = "negative"
        else:
            category = "neutral"
        
        debug_file.write(f"Final sentiment category: {category}\n")
        debug_file.write(f"Final sentiment score: {avg_score}\n")
    
    # Clean up resources
    del sentiment_analyzer
    gc.collect()
    
    return category, avg_score

def calculate_topic_similarities(topic_model, topic_info):
    """
    Calculate similarities between topics using BERT embeddings
    Returns a list of topic pairs with their similarity scores
    """
    log_dir = os.path.join(os.getenv('TOPIC_LOG_DIR', './log_topic'))
    os.makedirs(log_dir, exist_ok=True)
    
    # Initialize BERT model
    bert_model = SentenceTransformer('all-mpnet-base-v2')
    
    # Get non-outlier topics
    valid_topics = topic_info[topic_info['Topic'] != -1]['Topic'].tolist()
    
    # Create topic representations
    topic_vectors = []
    topic_ids = []
    topic_words_dict = {}  # Store top words for each topic
    
    with open(os.path.join(log_dir, 'topic_similarities_log.txt'), 'w', encoding='utf-8') as f:
        f.write("Calculating topic similarities...\n")
    
    for topic_id in valid_topics:
        # Get top words for the topic
        top_words = [word for word, _ in topic_model.get_topic(topic_id)][:10]  # Use top 10 words
        # Create topic text representation
        topic_text = ' '.join(top_words)
        with open(os.path.join(log_dir, 'topic_similarities_log.txt'), 'a', encoding='utf-8') as f:
            f.write(f"Topic {topic_id} top words: {top_words}\n")
        # Get BERT embedding
        topic_vector = bert_model.encode(topic_text)
        topic_vectors.append(topic_vector)
        topic_ids.append(topic_id)
        topic_words_dict[topic_id] = set(top_words)  # Store as set for easier intersection
    
    # Convert to numpy array
    topic_vectors = np.array(topic_vectors)
    
    # Calculate cosine similarity matrix
    similarity_matrix = cosine_similarity(topic_vectors)
    
    # Convert similarity matrix to list of pairs
    similarities = []
    for i in range(len(topic_ids)):
        for j in range(i + 1, len(topic_ids)):  # Only upper triangle
            # Calculate word overlap bonus
            topic_i_id = topic_ids[i]
            topic_j_id = topic_ids[j]
            
            # Find overlapping words
            overlapping_words = topic_words_dict[topic_i_id].intersection(topic_words_dict[topic_j_id])
            overlap_count = len(overlapping_words)
            
            # Calculate bonus based on overlap (0.05 per overlapping word)
            overlap_bonus = min(0.3, overlap_count * 0.12)  # Cap at 0.3 to avoid dominating similarity
            
            # Combine BERT similarity with overlap bonus
            combined_similarity = min(1.0, similarity_matrix[i][j] + overlap_bonus)
            
            similarities.append({
                'source': int(topic_ids[i]),
                'target': int(topic_ids[j]),
                'weight': float(combined_similarity),
                'overlapping_words': list(overlapping_words),
                'overlap_count': overlap_count
            })
    
    with open(os.path.join(log_dir, 'topic_similarities_log.txt'), 'a', encoding='utf-8') as f:
        f.write(f"Found {len(similarities)} topic similarity pairs\n")
    
    # Clean up resources
    del bert_model
    del topic_vectors
    del similarity_matrix
    del topic_words_dict
    gc.collect()
    
    return similarities

def analyze_topics(documents, post_ids, scores):
    """
    Analyze topics in the given documents with finer granularity using custom HDBSCAN parameters
    
    Args:
        documents (list): List of document texts
        post_ids (list): List of post IDs
        scores (list): List of post scores
    
    Returns:
        tuple: (topic_model, topics, documents)
        
    Note:
        This function now includes specialized hyperparameters for very small datasets (<150 documents),
        featuring more permissive clustering parameters, increased UMAP epochs, and reduced dimensionality
        to extract meaningful topics even with limited data.
    """
    num_documents = len(documents)
    log_dir = os.path.join(os.getenv('TOPIC_LOG_DIR', './log_topic'))
    os.makedirs(log_dir, exist_ok=True)
    
    with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'w', encoding='utf-8') as f:
        f.write(f"Analyzing {num_documents} documents\n")
        
        # Add diagnostic information about document lengths
        if num_documents == 0:
            f.write("ERROR: Empty document list provided. Cannot perform topic modeling with 0 documents.\n")
            raise ValueError("Cannot perform topic modeling on an empty document list.")
            
        # Log document lengths to help diagnose issues
        doc_lengths = [len(doc) for doc in documents]
        f.write(f"Document length statistics:\n")
        f.write(f"  Min length: {min(doc_lengths) if doc_lengths else 0} characters\n")
        f.write(f"  Max length: {max(doc_lengths) if doc_lengths else 0} characters\n")
        f.write(f"  Average length: {sum(doc_lengths)/len(doc_lengths) if doc_lengths else 0:.2f} characters\n")
        
        # Count documents that are potentially too short
        short_docs = sum(1 for length in doc_lengths if length < 20)
        if short_docs > 0:
            f.write(f"WARNING: {short_docs} documents are very short (less than 20 characters)\n")
        
        # Filter out extremely short documents if they exist
        if short_docs > 0:
            original_count = len(documents)
            # Only keep documents with reasonable length (at least 10 characters)
            filtered_docs_indices = [i for i, doc in enumerate(documents) if len(doc) >= 10]
            documents = [documents[i] for i in filtered_docs_indices]
            post_ids = [post_ids[i] for i in filtered_docs_indices] if post_ids else []
            scores = [scores[i] for i in filtered_docs_indices] if scores else []
            num_documents = len(documents)
            f.write(f"Filtered out {original_count - num_documents} extremely short documents\n")
            f.write(f"Proceeding with {num_documents} documents\n")
            
        if num_documents < 5:
            f.write(f"WARNING: Very few documents ({num_documents}) for topic modeling. Results may not be meaningful.\n")
    
    # Download NLTK stopwords if not already downloaded
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
    
    # Get English stopwords from NLTK
    nltk_stopwords = set(stopwords.words('english'))
    
    # Define custom stop words to filter out structural terms and domain-specific common words
    custom_stop_words = [
        "title", "content", "comments", "https", "com", "www",
        # Add domain-specific common words that don't add meaning to topics
        "like", "just", "get", "know", "don", "really", "think", "going", 
        "want", "got", "would", "one", "also", "even", "much", "way",
        "make", "see", "need", "well", "lot", "time", "good", "people"
    ]

    # Create stop words by combining NLTK stopwords, scikit-learn stopwords, and custom ones
    all_stop_words = list(nltk_stopwords) + list(ENGLISH_STOP_WORDS) + custom_stop_words

    # Use a stronger embedding model - same for all dataset sizes
    sentence_transformer = SentenceTransformer("all-mpnet-base-v2")
    
    # Choose hyperparameters based on dataset size
    if num_documents < 10:
        # Special case for extremely small datasets (fewer than 10 documents)
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Using special hyperparameters for extremely small dataset (<10 documents)\n")
            
        # For extremely small datasets, use absolute counts instead of proportions
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
            min_df=1,         # Accept terms appearing in at least 1 document
            max_df=num_documents,  # No upper limit (use absolute count)
            ngram_range=(1, 3)  # Consider 1-grams, 2-grams, and 3-grams
        )

        umap_model = UMAP(
            n_neighbors=min(3, num_documents-1) if num_documents > 1 else 1,  # Adjust based on dataset size
            n_components=2,    # Minimum dimensionality for structure
            min_dist=0.1,      # Standard min_dist
            metric='cosine',
            low_memory=True, 
            n_epochs=200,      # More epochs for better embeddings
            random_state=42    # Fixed random state for reproducibility
        )
        
        # HDBSCAN parameters for extremely small datasets
        custom_hdbscan = HDBSCAN(
            min_cluster_size=min(2, num_documents),  # Minimum possible clustering
            min_samples=1,             # Most permissive clustering
            metric='euclidean',        # Distance metric
            cluster_selection_method='eom',
            prediction_data=True       # Required for soft clustering
        )
        
        # BERTopic parameters for extremely small datasets
        topic_model = BERTopic(
            min_topic_size=min(2, num_documents),  # Allow very small topics
            n_gram_range=(1, 3),       # Use unigrams, bigrams and trigrams
            top_n_words=10,            # Number of words to represent each topic
            calculate_probabilities=True,
            verbose=True,
            nr_topics="auto",          # Let the algorithm determine the optimal number
            vectorizer_model=vectorizer_model,
            embedding_model=sentence_transformer,
            umap_model=umap_model,    
            hdbscan_model=custom_hdbscan,
        )
    elif num_documents < 100:
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Using specialized hyperparameters for very small dataset (<100 documents)\n")
            
        # Custom vectorizer for very small datasets - more permissive
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
            max_df=0.99,      # Less restrictive upper bound for small datasets
            min_df=1,         # Only require terms to appear in at least 1 document
            ngram_range=(1, 3)  # Consider 1-grams, 2-grams, and 3-grams
        )
            
        # UMAP parameters for very small datasets - even smaller neighborhood size but more connections
        umap_model = UMAP(
            n_neighbors=3,       # Very small neighborhood for highly localized connections
            n_components=3,      # Further reduced dimensionality for simpler structure
            min_dist=0.15,       # Increased min_dist to further space points in tiny datasets
            metric='cosine',
            low_memory=True,     # Optimize for small memory footprint
            n_epochs=300,        # Increase epochs for better embedding quality with small datasets
            random_state=42      # Fixed random state for reproducibility
        )
        
        # HDBSCAN parameters for very small datasets - even smaller clusters allowed
        custom_hdbscan = HDBSCAN(
            min_cluster_size=3,        # Allow very small topics (3 docs minimum)
            min_samples=1,             # Most permissive clustering possible
            metric='euclidean',        # Distance metric
            cluster_selection_method='eom',  # Excess of Mass method
            prediction_data=True,      # Required for soft clustering
            alpha=1.0                  # Conservative alpha for better defined small clusters
        )
        
        # BERTopic parameters optimized for very small datasets
        topic_model = BERTopic(
            min_topic_size=3,          # Allow very small topics
            n_gram_range=(1, 3),       # Use unigrams, bigrams and trigrams
            top_n_words=10,            # Number of words to represent each topic
            calculate_probabilities=True,
            verbose=True,
            nr_topics="auto",          # Let the algorithm determine the optimal number based on data
            vectorizer_model=vectorizer_model,
            embedding_model=sentence_transformer,
            umap_model=umap_model,    
            hdbscan_model=custom_hdbscan,
        )
    elif num_documents < 201:
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Using hyperparameters for small dataset (100-200 documents)\n")
            
        # Custom vectorizer for small datasets
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
            max_df=0.9,       # More permissive with term frequency
            min_df=2,         # Require terms to appear in at least 2 documents
            ngram_range=(1, 3)  # Consider 1-grams, 2-grams, and 3-grams
        )
        
        # UMAP parameters for small datasets - increase neighborhood size
        umap_model = UMAP(
            n_neighbors=8,     # Increased neighborhood size for better connections in small datasets
            n_components=5,     # Reduced dimensionality for simpler structure
            min_dist=0.07,       # Increased min_dist to create more space between points
            metric='cosine',
            random_state=42     # Fixed random state for reproducibility
        )
        
        # HDBSCAN parameters for small datasets - smaller clusters allowed
        custom_hdbscan = HDBSCAN(
            min_cluster_size=8,       # Smaller minimum docs per topic for small datasets
            min_samples=1,            # Lower value to allow more flexible clustering
            metric='euclidean',       # Distance metric
            cluster_selection_method='eom',  # Excess of Mass method
            prediction_data=True      # Required for soft clustering
        )
        
        # BERTopic parameters for small datasets
        topic_model = BERTopic(
            min_topic_size=5,        # Smaller minimum size of topics for small datasets
            n_gram_range=(1, 3),     # Use unigrams, bigrams and trigrams
            top_n_words=10,          # Number of words to represent each topic
            calculate_probabilities=True,
            verbose=True,
            vectorizer_model=vectorizer_model,
            embedding_model=sentence_transformer,
            umap_model=umap_model,    
            hdbscan_model=custom_hdbscan
        )
    elif num_documents >= 600:
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Using hyperparameters for large dataset (≥600 documents)\n")
            
        # Vectorizer for large datasets
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
            max_df=0.9,       # More permissive with very common terms
            min_df=5,         # Require terms to appear in at least 5 documents
            ngram_range=(1, 3)  # Consider 1-grams, 2-grams, and 3-grams
        )
        
        # Use current hyperparameters for large datasets
        umap_model = UMAP(
            n_neighbors=10,    # Reduced from 15 to create more local neighborhoods
            n_components=5,
            min_dist=0.05,
            metric='cosine',
            random_state=42    # Fixed random state for reproducibility
        )
        
        custom_hdbscan = HDBSCAN(
            min_cluster_size=15,     # Minimum docs per topic (smaller = more topics)
            min_samples=3,           # How tight clusters must be (smaller = more topics)
            metric='euclidean',      # Distance metric
            cluster_selection_method='eom',  # Excess of Mass method - better for detecting varied density clusters
            prediction_data=True     # Required for soft clustering
        )
        
        topic_model = BERTopic(
            min_topic_size=15,       # Minimum size of topics
            n_gram_range=(1, 3),     # Use unigrams and bigrams
            top_n_words=10,          # Number of words to represent each topic
            calculate_probabilities=True,
            verbose=True,
            vectorizer_model=vectorizer_model,
            embedding_model=sentence_transformer,
            umap_model=umap_model,   # Use our custom UMAP model with fixed random state
            hdbscan_model=custom_hdbscan  # Use our custom HDBSCAN model
        )
    else:
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Using hyperparameters for medium dataset (200-599 documents)\n")
            
        # Vectorizer for medium datasets
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
            max_df=0.9,      # More permissive setting for term frequency
            min_df=3,         # Require terms to appear in at least 3 documents
            ngram_range=(1, 3)  # Consider 1-grams, 2-grams, and 3-grams
        )
        
        # Medium dataset hyperparameters - balanced between small and large
        umap_model = UMAP(
            n_neighbors=12,     # Balanced neighborhood size
            n_components=4,     # Balanced dimensionality
            min_dist=0.05,      # Balanced min_dist
            metric='cosine',
            random_state=42     # Fixed random state for reproducibility
        )
        
        custom_hdbscan = HDBSCAN(
            min_cluster_size=10,     # Balanced minimum docs per topic
            min_samples=2,           # Balanced samples parameter
            metric='euclidean',      # Distance metric
            cluster_selection_method='eom',  # Excess of Mass method
            prediction_data=True     # Required for soft clustering
        )
        
        topic_model = BERTopic(
            min_topic_size=10,       # Balanced minimum size of topics
            n_gram_range=(1, 3),     # Use unigrams, bigrams and trigrams
            top_n_words=10,          # Number of words to represent each topic
            calculate_probabilities=True,
            verbose=True,
            vectorizer_model=vectorizer_model,
            embedding_model=sentence_transformer,
            umap_model=umap_model,
            hdbscan_model=custom_hdbscan
        )
    
    # Fit the model and transform the documents
    try:
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Fitting BERTopic model to documents...\n")
        topics, probs = topic_model.fit_transform(documents)
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Successfully fit BERTopic model and transformed documents\n")
    except ValueError as e:
        with open(os.path.join(log_dir, 'analyze_topics_error.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Error in BERTopic.fit_transform: {str(e)}\n")
            
            if "max_df corresponds to < documents than min_df" in str(e):
                f.write("\nThis error occurs when max_df is too restrictive compared to min_df.\n")
                f.write(f"Current settings: max_df={vectorizer_model.max_df}, min_df={vectorizer_model.min_df}\n")
                f.write(f"Number of documents: {num_documents}\n\n")
                
                # Try to recover by creating a more permissive vectorizer
                f.write("Attempting recovery with more permissive vectorizer settings...\n")
                backup_vectorizer = CountVectorizer(
                    stop_words=all_stop_words,
                    token_pattern=r"(?u)\b\w\w+\b",
                    max_df=1.0,  # Accept all terms regardless of frequency
                    min_df=1,    # Accept terms appearing in at least 1 document
                    ngram_range=(1, 3)
                )
                
                # Update the model's vectorizer
                topic_model.vectorizer_model = backup_vectorizer
                
                try:
                    # Try again with the new vectorizer
                    topics, probs = topic_model.fit_transform(documents)
                    f.write("Recovery successful! Used backup vectorizer settings.\n")
                except Exception as recovery_error:
                    f.write(f"Recovery attempt failed: {str(recovery_error)}\n")
                    
                    # Clean up resources
                    del sentence_transformer
                    del topic_model
                    if 'backup_vectorizer' in locals():
                        del backup_vectorizer
                    if 'vectorizer_model' in locals():
                        del vectorizer_model
                    if 'umap_model' in locals():
                        del umap_model
                    if 'custom_hdbscan' in locals():
                        del custom_hdbscan
                    gc.collect()
                    
                    raise ValueError(f"Topic modeling failed, even with recovery attempt: {str(recovery_error)}") from e
            else:
                # Clean up resources
                del sentence_transformer
                del topic_model
                if 'vectorizer_model' in locals():
                    del vectorizer_model
                if 'umap_model' in locals():
                    del umap_model
                if 'custom_hdbscan' in locals():
                    del custom_hdbscan
                gc.collect()
                
                # Re-raise the original error
                raise
    except Exception as e:
        with open(os.path.join(log_dir, 'analyze_topics_error.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Unexpected error in BERTopic.fit_transform: {str(e)}\n")
        
        # Clean up resources
        del sentence_transformer
        del topic_model
        if 'vectorizer_model' in locals():
            del vectorizer_model
        if 'umap_model' in locals():
            del umap_model
        if 'custom_hdbscan' in locals():
            del custom_hdbscan
        gc.collect()
        
        raise
    
    # Force garbage collection after model creation
    if 'vectorizer_model' in locals():
        del vectorizer_model
    if 'umap_model' in locals():
        del umap_model
    if 'custom_hdbscan' in locals():
        del custom_hdbscan
    del sentence_transformer
    del all_stop_words
    del nltk_stopwords
    gc.collect()
    
    return topic_model, topics, documents

if __name__ == "__main__":
    # Load data from data_topic_model.json in the current directory
    data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_topic_model.json")
    
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
    
    # Create temp directory if it doesn't exist
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
    log_dir = os.path.join(os.getenv('TOPIC_LOG_DIR', './log_topic'))
    os.makedirs(log_dir, exist_ok=True)
    
    # Delete everything in temp directory if it exists
    if os.path.exists(temp_dir):
        with open(os.path.join(log_dir, 'main_process_log.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Clearing existing temp directory: {temp_dir}\n")
        shutil.rmtree(temp_dir)
    
    # Create fresh temp directory
    os.makedirs(temp_dir, exist_ok=True)
    with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
        f.write(f"Created temp directory: {temp_dir}\n")
    
    # Analyze topics using the original BERTopic
    with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
        f.write("Step 1: Analyzing topics with BERTopic...\n")
    topic_model, topics, documents = analyze_topics(documents, post_ids, scores)
    with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
        f.write(f"Found {len(topic_model.get_topic_info())} topics\n")
    
    # Save topic model results to temp directory
    with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
        f.write("Step 2: Saving topic information...\n")
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
    
    # Summarize topics
    with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
        f.write("Step 3: Generating topic summaries...\n")
    topic_summaries = summarize_topics(topic_model, topics, documents, keyword=None, summary_limit=5)
    
    # Save topic summaries
    with open(os.path.join(temp_dir, "topic_summaries.txt"), 'w', encoding='utf-8') as f:
        for topic_id, summary in topic_summaries.items():
            f.write(f"Topic {topic_id} Summary:\n")
            f.write(f"{summary}\n\n")
    
    # Analyze sentiment for each topic
    with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
        f.write("Step 4: Analyzing topic sentiment...\n")
    topic_sentiments = {}
    for topic_id in topic_summaries.keys():
        # Get documents for this topic
        topic_docs = [doc for doc, t in zip(documents, topics) if t == topic_id]
        if topic_docs:
            with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
                f.write(f"  Analyzing sentiment for Topic {topic_id} ({len(topic_docs)} documents)...\n")
            sentiment_label, sentiment_score = analyze_topic_sentiment(topic_docs, topic_id, temp_dir)
            topic_sentiments[topic_id] = {
                "label": sentiment_label,
                "score": sentiment_score
            }
    
    # Save topic sentiments
    with open(os.path.join(temp_dir, "topic_sentiments.json"), 'w', encoding='utf-8') as f:
        json.dump(topic_sentiments, f, indent=2)

    
    with open(os.path.join(log_dir, 'main_process_log.txt'), 'a', encoding='utf-8') as f:
        f.write(f"All results saved to {temp_dir}\n")
    