from util.data_store import get_reddit_data

def create_reddit_analysis_prompt(user_prompt, subreddit, date_range=None, keywords=None):
    """
    Creates a prompt for analyzing Reddit data from a specific subreddit.
    
    Args:
        user_prompt (str): The user's question or request
        subreddit (str): The subreddit name
        date_range (str, optional): The date range for the data
        keywords (str, optional): Keywords to filter the data by
        
    Returns:
        str: A formatted prompt for the Mistral model
    """
    # Parse keywords if provided
    keyword_list = None
    if keywords:
        # Clean up the keywords string and split by commas
        keyword_list = [k.strip() for k in keywords.split(',') if k.strip()]
        print(f"[mistral_prompt] Using keywords for filtering: {keyword_list}")

    # Get cached Reddit data
    reddit_data = get_reddit_data(subreddit)
    
    # Filter the data based on keywords if provided
    filtered_posts = []
    
    if reddit_data and 'raw_data' in reddit_data and keyword_list:
        posts = reddit_data['raw_data']
        print(f"[mistral_prompt] Filtering {len(posts)} posts for keywords: {keyword_list}")
        
        import re
        # Compile regex patterns for each keyword for more efficient searching
        patterns = [re.compile(r'\b' + re.escape(kw) + r'\b', re.IGNORECASE) for kw in keyword_list]
        
        # Filter posts that contain any of the keywords
        for post in posts:
            # Combine title and content for searching
            post_text = f"{post.get('title', '')} {post.get('content', '')}"
            
            # Check comments for keywords too
            comment_matches = []
            for comment in post.get('comments', []):
                comment_text = comment.get('body', '')
                if any(pattern.search(comment_text) for pattern in patterns):
                    comment_matches.append(comment)
                post_text += f" {comment_text}"
            
            # If any keyword matches in the post text or comments
            if any(pattern.search(post_text) for pattern in patterns):
                # If we found matching comments, only include those
                if comment_matches and len(comment_matches) < len(post.get('comments', [])):
                    filtered_post = post.copy()
                    filtered_post['comments'] = comment_matches
                    filtered_posts.append(filtered_post)
                else:
                    # Otherwise include the whole post
                    filtered_posts.append(post)
        
        print(f"[mistral_prompt] Found {len(filtered_posts)} posts matching keywords")
    else:
        # If no keywords or no data, use all posts
        filtered_posts = reddit_data.get('raw_data', []) if reddit_data else []
    
    # Create a context-aware prompt
    context = f"You are analyzing Reddit data from r/{subreddit}"
    if date_range:
        context += f" for the period {date_range}"
    
    if keyword_list:
        context += f". The data has been filtered to focus on posts related to: {', '.join(keyword_list)}"
    
    # Add data context if available
    data_context = ""
    if filtered_posts:
        
        # Include a sample of posts (up to 10)
        sample_size = len(filtered_posts)
        data_context += f"Here are {sample_size} sample posts:\n\n"
        
        for i, post in enumerate(filtered_posts[:sample_size]):
            title = post.get('title', 'No title')
            content_preview = post.get('content', '')[:200] + "..." if len(post.get('content', '')) > 200 else post.get('content', '')
            score = post.get('score', 0)
            
            data_context += f"Post {i+1}:\n"
            data_context += f"Title: {title}\n"
            data_context += f"Score: {score}\n"
            if content_preview:
                data_context += f"Content: {content_preview}\n"
            
            # Include comments
            comments = post.get('comments', [])
            if comments:
                comment_sample = comments[:3]  # Limit to 3 comments per post
                data_context += f"Top {len(comment_sample)} comments:\n"
                for j, comment in enumerate(comment_sample):
                    comment_text = comment.get('body', '')[:150] + "..." if len(comment.get('body', '')) > 150 else comment.get('body', '')
                    data_context += f"  - {comment_text}\n"
            
            data_context += "\n"
    else:
        data_context = "No posts were found matching your query criteria.\n\n"
    
    full_prompt = f"""{context}.

{data_context}

Based on the Reddit data described above, please answer the following question:

{user_prompt}

Provide a detailed and insightful response based on the Reddit data analysis. 
Include specific examples from posts or comments when relevant.
Organize your response with clear sections if the answer covers multiple aspects.
If you're unsure about something, acknowledge the limitations of the data rather than making assumptions.
"""
    
    return full_prompt

def extract_keywords_from_prompt(user_prompt):
    extraction_prompt = f"""
Extract 1-3 keywords or phrases from this question: "{user_prompt}"

Focus on specific and distinctive terms that would appear in relevant social media posts.
Return ONLY the keywords as a simple comma-separated list, with no punctuation, formatting, or explanations.

Examples:
Question: "What do users think about battery life?"
battery life

Question: "Are people having issues with the student hub features?"
student hub

Question: "What's the opinion on the new mexican food?"
mexican food, taco
"""
    
    return extraction_prompt



def create_synthetic_customer_prompt(user_prompt, product_info=None):
    """
    Creates a prompt for generating synthetic customer feedback or questions.
    
    Args:
        user_prompt (str): The user's request for synthetic content
        product_info (dict, optional): Information about the product
        
    Returns:
        str: A formatted prompt for the Mistral model
    """
    context = "You are a helpful AI assistant that can generate realistic customer feedback and questions."
    
    if product_info:
        product_context = f"""
Product Name: {product_info.get('name', 'Unknown')}
Product Category: {product_info.get('category', 'Unknown')}
Target Audience: {product_info.get('audience', 'General consumers')}
"""
        context += f"\n\nYou are generating content related to the following product:\n{product_context}"
    
    full_prompt = f"""{context}

Please respond to the following request:

{user_prompt}

Generate content that is realistic, diverse, and representative of actual customer behavior.
Include both positive and negative perspectives where appropriate.
Use natural language that real customers would use.
"""
    
    return full_prompt


def create_topic_modeling_prompt(user_prompt, topics, document_count):
    """
    Creates a prompt for explaining topic modeling results.
    
    Args:
        user_prompt (str): The user's question about the topics
        topics (list): List of topics with their keywords
        document_count (int): Number of documents analyzed
        
    Returns:
        str: A formatted prompt for the Mistral model
    """
    topics_str = "\n".join([f"Topic {i+1}: {', '.join(topic)}" for i, topic in enumerate(topics)])
    
    context = f"""You are analyzing the results of topic modeling performed on {document_count} documents.
The following topics were identified:

{topics_str}
"""
    
    full_prompt = f"""{context}

Based on these topic modeling results, please answer the following question:

{user_prompt}

Provide insights about what each topic might represent.
Suggest possible labels or names for the topics based on the keywords.
Explain relationships between topics if they appear to be related.
"""
    
    return full_prompt

def exetract_keywords_from_prompt(user_prompt):
    """
    Extracts the keywords from the user's prompt. only return 1 keyword
    """
    return extract_keywords_from_prompt(user_prompt)


