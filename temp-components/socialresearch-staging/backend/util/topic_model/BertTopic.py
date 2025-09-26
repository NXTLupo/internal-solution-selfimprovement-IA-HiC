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
from nltk.stem import WordNetLemmatizer
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
    Selects the most relevant content from documents based on similarity to topic keywords.
    Instead of individual sentences, extracts meaningful paragraphs or post sections
    to provide better context for topic summarization.
    """
    # Download NLTK punkt if not already downloaded
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    
    model = SentenceTransformer('all-mpnet-base-v2')  
    
    topic_embedding = model.encode(' '.join(top_words), convert_to_tensor=True)
    
    selected_content = []
    total_chars = 0
    max_chars = 30000  # Increased to 30,000 characters total
    min_content_length = 100  # Minimum length for a meaningful paragraph
    
    # Process each document to extract meaningful chunks
    doc_chunks = []
    doc_similarities = []
    
    for doc in documents:
        # Skip empty documents
        if not doc or len(doc.strip()) < 20:
            continue
            
        # Split into paragraphs first (better context than sentences)
        paragraphs = [p.strip() for p in doc.split('\n\n') if p.strip()]
        
        # If no clear paragraphs, fall back to sentences but group them
        if not paragraphs or all(len(p) < min_content_length for p in paragraphs):
            sentences = sent_tokenize(doc)
            
            # Group sentences into meaningful chunks (3-5 sentences per chunk)
            if len(sentences) <= 5:
                # If few sentences, keep as one chunk
                paragraphs = [' '.join(sentences)]
            else:
                # Group sentences into chunks of 3-5
                paragraphs = []
                for i in range(0, len(sentences), 4):
                    chunk = ' '.join(sentences[i:i+4])
                    if len(chunk) >= min_content_length:
                        paragraphs.append(chunk)
        
        # Calculate similarity for each paragraph
        for paragraph in paragraphs:
            if len(paragraph) < min_content_length:
                continue
                
            # Get embedding for this paragraph
            para_embedding = model.encode(paragraph, convert_to_tensor=True)
            
            # Calculate similarity to topic
            similarity = util.cos_sim(para_embedding, topic_embedding).item()
            
            # Store paragraph and its similarity score
            doc_chunks.append(paragraph)
            doc_similarities.append(similarity)
    
    # If no content found
    if not doc_chunks:
        return ["No relevant content found for this topic."]
    
    # Sort content by similarity
    combined = list(zip(doc_chunks, doc_similarities))
    combined.sort(key=lambda x: x[1], reverse=True)
    
    # Take top chunks until reaching character limit
    for content, _ in combined:
        content_len = len(content)
        if total_chars + content_len <= max_chars:
            # Only add if it adds meaningful new information
            if not any(similar_content(content, existing, 0.7) for existing in selected_content):
                selected_content.append(content)
                total_chars += content_len
                
                # Limit to reasonable number of examples - increased from 10 to 25
                if len(selected_content) >= 25:
                    break
        else:
            # If we can't add any more full chunks, stop
            break
    
    # If no content was selected (maybe all are too long), take the first most relevant one
    if not selected_content and combined:
        selected_content = [combined[0][0]]
    
    return selected_content

def similar_content(text1, text2, threshold=0.7):
    """
    Check if two text chunks are similar to avoid redundancy.
    Uses simple Jaccard similarity on word sets.
    """
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return False
        
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    jaccard = len(intersection) / len(union)
    return jaccard > threshold

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
        # Filter out redundant keywords before using them for summaries
        filtered_top_words = filter_redundant_keywords(top_words, max_words=7)
        top_words_list = [word[0] for word in filtered_top_words]  # Take filtered words

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
                    example_content = select_relevant_sentences(similar_docs, top_words_list)
                    
                    if not example_content or all(s == "No relevant content found for this topic." for s in example_content):
                        with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'a', encoding='utf-8') as f:
                            f.write(f"\nNo relevant content found in similar documents for topic {topic_id}. Using top words only.")
                        example_content = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
                except Exception as e:
                    with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'a', encoding='utf-8') as f:
                        f.write(f"\nError finding similar documents for topic {topic_id}: {e}. Using top words only.")
                    example_content = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
                
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
                example_content = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
        else:
            example_content = select_relevant_sentences(rep_docs, top_words_list)
            if not example_content or all(s == "No relevant content found for this topic." for s in example_content):
                with open(os.path.join(log_dir, f'error_topic_{topic_id}.txt'), 'w', encoding='utf-8') as f:
                    f.write(f"No relevant content found for topic {topic_id}. Using top words only.")
                example_content = [f"Keywords related to this topic include: {', '.join(top_words_list)}."]
        
        # Log sample of content for debugging
        with open(os.path.join(log_dir, f'topic_{topic_id}_content_sample.txt'), 'w', encoding='utf-8') as f:
            f.write(f"Topic {topic_id} - Content Sample\n")
            f.write(f"Number of content items: {len(example_content)}\n")
            f.write(f"Top words: {', '.join(top_words_list)}\n\n")
            
            # Log first few content pieces
            for idx, content in enumerate(example_content[:3]):
                f.write(f"Content {idx+1} (length: {len(content)} chars):\n")
                f.write(f"{content}\n\n")
        
        # Generate a structured sentence using the LLM
        prompt = get_openai_generate_topic_prompt(top_words_list, example_content, keyword)
        with open(os.path.join(log_dir, f'summary_prompt_topic_{topic_id}.txt'), 'w', encoding='utf-8') as f:
            f.write(prompt)

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        try:
            topic_summary = get_claude_completion_with_json(messages, temperature=0.1)
            with open(os.path.join(log_dir, f'summary_topic_{topic_id}.txt'), 'w', encoding='utf-8') as f:
                f.write(topic_summary)
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
        del example_content
        gc.collect()

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
        
        # Initialize sentiment analyzer
        debug_file.write("Initializing sentiment analyzer...\n")
        model1 = "CardiffNLP/twitter-roberta-base-sentiment"
        sentiment_analyzer = pipeline("sentiment-analysis", model=model1)
        debug_file.write("Sentiment analyzer initialized successfully\n\n")
        
        # Analyze sentiment for each document (limited to first 512 tokens due to BERT limitations)
        sentiments = []
        # Analyze all documents without sampling
        docs_to_analyze = topic_docs
        
        for i, doc in enumerate(docs_to_analyze):
            debug_file.write(f"Document {i+1}:\n")
            debug_file.write(f"Original length: {len(doc)} characters\n")
            
            try:
                # Clean the document by removing Content:, Comments:, and Score: labels
                cleaned_doc = doc
                for label in ["Content:", "Comments:", "Score:", "Title:"]:
                    cleaned_doc = cleaned_doc.replace(label, "")
                
                # Split document into chunks of approximately 1600 characters each (≈450 tokens, well under 512 token limit)
                chunk_size = 1600
                max_chunks = 4
                
                # Create chunks by splitting the document
                chunks = []
                for j in range(0, len(cleaned_doc), chunk_size):
                    chunk = cleaned_doc[j:j + chunk_size]
                    if chunk.strip():  # Only add non-empty chunks
                        chunks.append(chunk)
                    if len(chunks) >= max_chunks:
                        break
                
                debug_file.write(f"Split into {len(chunks)} chunks (max {max_chunks})\n")
                
                # Analyze sentiment for each chunk
                chunk_sentiments = []
                for chunk_idx, chunk in enumerate(chunks):
                    debug_file.write(f"  Chunk {chunk_idx + 1} (length: {len(chunk)} characters):\n")
                    debug_file.write(f"  Content preview: {chunk[:100]}...\n")
                    
                    # Analyze sentiment for this chunk
                    debug_file.write(f"  Analyzing sentiment for chunk {chunk_idx + 1}...\n")
                    result = sentiment_analyzer(chunk)[0]
                    debug_file.write(f"  Raw result: {result}\n")
                    
                    # Map the label to a score
                    # CardiffNLP model returns labels like 'LABEL_0' (negative), 'LABEL_1' (neutral), 'LABEL_2' (positive)
                    label = result['label']
                    confidence = result['score']  # This is the confidence score from the model
                    debug_file.write(f"  Label: {label}\n")
                    debug_file.write(f"  Confidence: {confidence}\n")
                    
                    # Convert to a normalized score between -1 and 1
                    if label == 'LABEL_0':  # Negative
                        normalized_score = -1.0 * confidence
                    elif label == 'LABEL_1':  # Neutral
                        normalized_score = 0.0  # Neutral is always 0 regardless of confidence
                    elif label == 'LABEL_2':  # Positive
                        normalized_score = 1.0 * confidence
                    else:
                        normalized_score = 0.0  # Default to neutral for unknown labels
                    
                    debug_file.write(f"  Normalized score (-1 to 1): {normalized_score}\n")
                    chunk_sentiments.append(normalized_score)
                
                # Calculate average sentiment for this document across all chunks
                if chunk_sentiments:
                    doc_avg_sentiment = mean(chunk_sentiments)
                    debug_file.write(f"Document {i+1} chunk sentiments: {chunk_sentiments}\n")
                    debug_file.write(f"Document {i+1} average sentiment: {doc_avg_sentiment}\n\n")
                    sentiments.append(doc_avg_sentiment)
                else:
                    debug_file.write(f"No valid chunks found for document {i+1}\n\n")
                    
            except Exception as e:
                debug_file.write(f"Error analyzing sentiment for document {i+1}: {str(e)}\n\n")
                continue
        
        if not sentiments:
            debug_file.write("No valid sentiment scores found. Returning neutral (0.0)\n")
            
            # Clean up resources
            del sentiment_analyzer
            gc.collect()
            
            return "neutral", 0.0
        
        # Calculate average sentiment score across all documents
        avg_score = mean(sentiments)
        debug_file.write(f"All document sentiment scores: {sentiments}\n")
        debug_file.write(f"Final average sentiment score: {avg_score}\n")
        
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
        # Get top words for the topic and filter them
        raw_topic_words = topic_model.get_topic(topic_id)
        filtered_topic_words = filter_redundant_keywords(raw_topic_words, max_words=10)
        top_words = [word for word, _ in filtered_topic_words]  # Use filtered words
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

def filter_redundant_keywords(topic_words, max_words=10):
    """
    Filter out redundant keywords where individual words are part of longer meaningful phrases,
    and also handle plural/singular forms and similar word variations using lemmatization.
    
    Args:
        topic_words: List of tuples (word, weight) from BERTopic
        max_words: Maximum number of words to return after filtering
    
    Returns:
        List of tuples (word, weight) with redundant keywords removed
    """
    if not topic_words:
        return topic_words
    
    # Sort by weight (importance) descending
    sorted_words = sorted(topic_words, key=lambda x: x[1], reverse=True)
    
    # Keep track of words to include and words to exclude
    filtered_words = []
    excluded_words = set()
    
    # Initialize lemmatizer
    try:
        # Download required NLTK data if not already present
        try:
            nltk.data.find('corpora/wordnet')
        except LookupError:
            nltk.download('wordnet', quiet=True)
        
        try:
            nltk.data.find('corpora/omw-1.4')
        except LookupError:
            nltk.download('omw-1.4', quiet=True)
            
        lemmatizer = WordNetLemmatizer()
    except Exception as e:
        print(f"Warning: Could not initialize lemmatizer: {e}. Falling back to basic filtering.")
        lemmatizer = None
    
    # Helper function to check if two words are the same after lemmatization
    def are_same_lemma(word1, word2):
        """Check if two words have the same lemma (base form)"""
        if not lemmatizer:
            return False
            
        w1, w2 = word1.lower().strip(), word2.lower().strip()
        
        # Skip if words are too short or identical
        if len(w1) < 3 or len(w2) < 3 or w1 == w2:
            return False
        
        try:
            # Try lemmatizing as noun first (most common for topics), then verb
            lemma1_noun = lemmatizer.lemmatize(w1, pos='n')
            lemma2_noun = lemmatizer.lemmatize(w2, pos='n')
            
            if lemma1_noun == lemma2_noun:
                return True
                
            # Also try as verb in case they're action words
            lemma1_verb = lemmatizer.lemmatize(w1, pos='v')
            lemma2_verb = lemmatizer.lemmatize(w2, pos='v')
            
            if lemma1_verb == lemma2_verb:
                return True
                
        except Exception:
            # If lemmatization fails, fall back to False
            pass
            
        return False
    
    # Helper function to check if two words are similar variations
    def are_similar_variations(word1, word2):
        """Check if two words are similar variations (like analyze/analysis)"""
        w1, w2 = word1.lower(), word2.lower()
        
        # Skip if words are too short or too different in length
        if len(w1) < 4 or len(w2) < 4 or abs(len(w1) - len(w2)) > 4:
            return False
            
        # Check if one word is contained in another with similar stem
        if len(w1) >= 4 and len(w2) >= 4:
            # Get stems (first 3-4 characters)
            stem1 = w1[:4] if len(w1) > 4 else w1[:3]
            stem2 = w2[:4] if len(w2) > 4 else w2[:3]
            
            # If stems are very similar and one word contains the other's stem
            if stem1 == stem2:
                return True
                
        return False
    
    # First pass: identify longer phrases and mark their component words for potential exclusion
    longer_phrases = []
    individual_words = []
    
    for word, weight in sorted_words:
        if ' ' in word.strip():  # Multi-word phrase
            longer_phrases.append((word, weight))
        else:  # Individual word
            individual_words.append((word, weight))
    
    # Second pass: mark individual words that are part of longer phrases
    for phrase, phrase_weight in longer_phrases:
        phrase_words = phrase.lower().split()
        for individual_word, individual_weight in individual_words:
            # If the individual word is part of the phrase and the phrase has higher or similar weight
            if (individual_word.lower() in phrase_words and 
                phrase_weight >= individual_weight * 0.8):  # Allow some tolerance
                excluded_words.add(individual_word)
    
    # Third pass: handle plural/singular and similar word variations among individual words
    for i, (word1, weight1) in enumerate(individual_words):
        if word1 in excluded_words:
            continue
            
        for j, (word2, weight2) in enumerate(individual_words[i+1:], i+1):
            if word2 in excluded_words:
                continue
                
            # Check if they are the same lemma (handles irregular plurals) or similar variations
            if are_same_lemma(word1, word2) or are_similar_variations(word1, word2):
                # Keep the one with higher weight, or prefer longer/more specific forms
                if weight1 > weight2:
                    excluded_words.add(word2)
                elif weight2 > weight1:
                    excluded_words.add(word1)
                else:
                    # If weights are equal, prefer the longer word (usually more specific)
                    if len(word2) > len(word1):
                        excluded_words.add(word1)
                    else:
                        excluded_words.add(word2)
    
    # Fourth pass: build the final filtered list
    for word, weight in sorted_words:
        if word not in excluded_words:
            filtered_words.append((word, weight))
            
            # Stop when we have enough words
            if len(filtered_words) >= max_words:
                break
    
    return filtered_words[:max_words]

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
            
        # For extremely small datasets, use only essential CountVectorizer parameters
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
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
            
        # Custom vectorizer for very small datasets
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
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
        print("Using hyperparameters for small dataset (100-200 documents)")
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Using hyperparameters for small dataset (100-200 documents)\n")
        
        # Custom vectorizer for small datasets
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
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
    elif num_documents <= 600:
        print("Using hyperparameters for large dataset (<=600 documents)")
        with open(os.path.join(log_dir, 'analyze_topics_log.txt'), 'a', encoding='utf-8') as f:
            f.write("Using hyperparameters for large dataset (≥600 documents)\n")
            
        # Vectorizer for large datasets
        vectorizer_model = CountVectorizer(
            stop_words=all_stop_words,
            token_pattern=r"(?u)\b\w\w+\b",
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
            min_cluster_size=5,     # Minimum docs per topic (smaller = more topics)
            min_samples=3,           # How tight clusters must be (smaller = more topics)
            metric='euclidean',      # Distance metric
            cluster_selection_method='eom',  # Excess of Mass method - better for detecting varied density clusters
            prediction_data=True     # Required for soft clustering
        )
        
        topic_model = BERTopic(
            min_topic_size=6,       # Minimum size of topics
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
            min_cluster_size=7,     # Balanced minimum docs per topic
            min_samples=2,           # Balanced samples parameter
            metric='euclidean',      # Distance metric
            cluster_selection_method='eom',  # Excess of Mass method
            prediction_data=True     # Required for soft clustering
        )
        
        topic_model = BERTopic(
            min_topic_size=8,       # Balanced minimum size of topics
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
                f.write(f"Number of documents: {num_documents}\n")
                
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
                
                # Raise a more descriptive error
                raise ValueError(f"Topic modeling failed: max_df is too restrictive compared to min_df. Try adjusting vectorizer parameters for your dataset size ({num_documents} documents).") from e
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
    # Load data from post_data.json in the current directory
    data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "post_data.json")
    
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
    