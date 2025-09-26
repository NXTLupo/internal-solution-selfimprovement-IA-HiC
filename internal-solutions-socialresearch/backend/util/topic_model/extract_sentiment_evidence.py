import json
import os
import gc
from util.prompts.topic_prompt import get_sentiment_evidence_prompt
from util.llm_models.openai import get_openai_completion
from util.topic_model.BertTopic import analyze_topic_sentiment


def extract_sentiment_evidence(topic_docs, topic_posts, post_ids, temp_dir, max_sample_docs=30):
    """
    Extracts positive and negative evidence points from a sample of topic documents.
    
    Args:
        topic_docs (list): List of document texts for this topic
        topic_posts (list): List of post data for this topic
        post_ids (list): List of post IDs for the documents
        temp_dir (str): Directory to save temp files
        max_sample_docs (int): Maximum number of documents to sample for evidence extraction
        
    Returns:
        dict: Dictionary containing positive and negative evidence points with post references
    """
    # Use temp_dir instead of trying to construct log_dir with undefined variables
    log_dir = temp_dir
    os.makedirs(log_dir, exist_ok=True)
    try:
        # Sample a reasonable number of documents to analyze for evidence
        # Use documents with the strongest sentiment signals
        sample_docs = []
        sample_post_refs = []
        
        # Create a mapping of post IDs to their original post data
        post_id_to_data = {}
        for post in topic_posts:
            post_id_to_data[post['id']] = post
        
        # Sample posts, prioritizing those with content
        for i, (doc, post_id) in enumerate(zip(topic_docs, post_ids)):
            if i >= max_sample_docs:
                break
            # Use the original post ID instead of a sequential number
            sample_docs.append(doc[:2000])
            sample_post_refs.append(f"Post {post_id}")
            
        if not sample_docs:
            return {"positive": [], "negative": []}
            
        # Format the documents for the prompt
        formatted_docs = ""
        total_chars = 0
        max_formatted_chars = 35000
        
        for i, (doc, post_ref) in enumerate(zip(sample_docs, sample_post_refs)):
            doc_formatted = f"{post_ref}:\n{doc.strip()}\n\n"
            # Check if adding this document would exceed the character limit
            if total_chars + len(doc_formatted) > max_formatted_chars:
                # Stop adding more documents if we would exceed the limit
                break
            formatted_docs += doc_formatted
            total_chars += len(doc_formatted)
            
        if not formatted_docs:
            return {"positive": [], "negative": []}
        
        # Generate the prompt using the prompt module
        analysis_prompt = get_sentiment_evidence_prompt(formatted_docs)
        
        # Log the prompt for debugging
        os.makedirs(log_dir, exist_ok=True)
        prompt_file_path = os.path.join(log_dir, f'sentiment_evidence_prompt_{hash(str(post_ids))}.txt')
        with open(prompt_file_path, 'w', encoding='utf-8') as f:
            f.write(analysis_prompt)
        
        print(f"[extract_sentiment_evidence.py] Extracting sentiment evidence from {len(sample_docs)} documents")
        print(f"[extract_sentiment_evidence.py] Generated prompt : {analysis_prompt}")
        
        # Call the OpenAI API with JSON parsing
        message = [{"role": "user", "content": analysis_prompt}]

        evidence_response = get_openai_completion(message, temperature=0.1)
        
        # Log the response for debugging
        response_file_path = os.path.join(log_dir, f'sentiment_evidence_response_{hash(str(post_ids))}.txt')
        with open(response_file_path, 'w', encoding='utf-8') as f:
            f.write(evidence_response)
            
        print(f"[extract_sentiment_evidence.py] Extracted evidence: {evidence_response}")

        # Clean the response before parsing - handle markdown code blocks and line breaks
        evidence_text = evidence_response.strip()
        
        # Check if the response is wrapped in markdown code blocks and extract just the JSON part
        if evidence_text.startswith("```json") and "```" in evidence_text[7:]:
            # Extract the content between the markdown tags
            json_start = evidence_text.find("```json") + 7
            json_end = evidence_text.find("```", json_start)
            evidence_text = evidence_text[json_start:json_end].strip()
        elif evidence_text.startswith("```") and evidence_text.endswith("```"):
            # Handle generic code blocks
            evidence_text = evidence_text[3:-3].strip()
            
        # Parse the cleaned JSON response
        try:
            evidence = json.loads(evidence_text)
        except json.JSONDecodeError as e:
            print(f"[extract_sentiment_evidence.py] Error parsing JSON response: {e}")
            print(f"[extract_sentiment_evidence.py] Problematic JSON text: {evidence_text[:100]}...")
            evidence = {"positive": [], "negative": []}
            
        # Ensure the result has the expected structure
        if not isinstance(evidence, dict):
            evidence = {"positive": [], "negative": []}
        if "positive" not in evidence:
            evidence["positive"] = []
        if "negative" not in evidence:
            evidence["negative"] = []
            
        # Clean up resources
        del sample_docs
        del sample_post_refs
        del post_id_to_data
        del formatted_docs
        del analysis_prompt
        del message
        del evidence_response
        del evidence_text
        
        # Force garbage collection
        gc.collect()
            
        return evidence
        
    except Exception as e:
        print(f"[extract_sentiment_evidence.py] Error extracting sentiment evidence: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        # Clean up any resources that might have been allocated in case of error
        for var_name in ['sample_docs', 'sample_post_refs', 'post_id_to_data', 
                         'formatted_docs', 'analysis_prompt', 'message', 
                         'evidence_response', 'evidence_text']:
            if var_name in locals():
                del locals()[var_name]
        
        # Force garbage collection
        gc.collect()
        
        return {"positive": [], "negative": []}


def analyze_post_sentiment(doc, temp_dir):
    """
    Analyze sentiment of a single post/document
    
    Args:
        doc (str): The document text to analyze
        temp_dir (str): Directory to save debug information
        
    Returns:
        tuple: (sentiment_category, sentiment_score)
    """
    try:
        # Use the existing function but with a list containing just this document
        sentiment_result = analyze_topic_sentiment([doc], "post_level", temp_dir)
        
        # Force garbage collection
        gc.collect()
        
        return sentiment_result
    except Exception as e:
        print(f"[extract_sentiment_evidence.py] Error analyzing post sentiment: {str(e)}")
        # Force garbage collection
        gc.collect()
        return "neutral", 0.0
