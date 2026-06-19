from typing import Dict

# def get_system_prompt() -> SystemMessage:
#     return SystemMessage(
#         content="""You are an market research analyst specialized in analyzing social media discussions, 
#         Your task is to extract valuable market insights and user sentiment from Reddit conversations."""
#     )

def get_openai_generate_topic_prompt(top_words_list: list, example_sentences: list, keywords: str = None) -> str:
    """
    Generates a prompt for summarizing topics based on keywords and example paragraphs.
    
    Args:
        top_words_list (list): List of top words for the topic
        example_sentences (list): List of example paragraphs or content excerpts from documents
        keywords (str, optional): Search keywords that the topic is based on
        
    Returns:
        str: The prompt for generating topic summaries
    """
    # Start with the base prompt
    prompt = "You are a helpful assistant tasked with summarizing Reddit discussion topics for topic modeling analysis.\n"
    
    # Add keyword context if provided
    if keywords:
        prompt += f"All information is based on searching keywords: {keywords}, summary should be based on the keywords.\n"
    
    # Add the common part of the prompt with keywords
    prompt += f"""Given the following information about a topic discovered through topic modeling:
- Top keywords: {', '.join(top_words_list)}
- Example posts and discussions (longer excerpts to provide better context):
"""

    # Add example content, limiting to preserve reasonable prompt size
    # But allow for longer, more informative excerpts
    max_examples = min(25, len(example_sentences))  # Increased from 15 to 25 to match the select_relevant_sentences change
    max_chars_per_example = 600  # Slightly reduced per-example length to accommodate more examples
    
    for i in range(max_examples):
        # Truncate very long examples but preserve enough context
        example = example_sentences[i]
        if len(example) > max_chars_per_example:
            # Try to truncate at a sentence boundary if possible
            truncated = example[:max_chars_per_example]
            last_period = truncated.rfind('.')
            if last_period > max_chars_per_example * 0.7:  # If we can find a reasonable sentence break
                example = truncated[:last_period+1] + " [...]"
            else:
                example = truncated + " [...]"
                
        # Format the example with a clear numbering and spacing
        prompt += f"\nEXAMPLE {i+1}:\n{example}\n"
    
    # Continue with the rest of the prompt
    prompt += """
Your goal is to create meaningful topic summaries for topic modeling results. Based on these examples, please provide three summaries of this topic:

1. A long summary that:
   - Incorporates the most relevant keywords
   - States the main topic at a broader category level (e.g., "discussions about university majors" rather than focusing on "computer science")
   - Primarily focuses on the general theme with a very broad perspective
   - Captures the key points, concerns, or perspectives shared in the examples at a categorical level
   - Uses neutral, objective language with broad, generalized terms
   - Emphasizes overarching patterns and trends rather than specific cases
   - Begins with the general conclusion and broad categorical description
   - May include specific examples (names, brands, products, individual instances) as supplementary information AFTER establishing the general conclusion to illustrate the broader point
   - Avoids mentioning Reddit users

2. A one-sentence summary that:
   - Focuses on the overarching theme or category rather than specific individuals, products, or cases
   - Avoids mentioning specific names, brands, or individual instances
   - Captures the general type of discussion or concern at a high level
   - Uses broad, categorical language (e.g., "player injuries" instead of "Aaron Nesmith's injury")
   - Emphasizes the general pattern or trend being discussed
   - Is direct and informative about the broader topic

3. A short topic HEADLINE (this becomes the card TITLE, so write it like a sharp analyst's finding) that:
   - Names WHAT THE EVIDENCE SHOWS IS TRUE about this theme - the specific finding, tension, or recurring concern - in 4 to 8 words. Good: "Water damage claims drag on unresolved", "Geico quotes jump at renewal", "Roof and HOA disputes stall repairs", "Totaled-car payouts feel lowballed".
   - Is NEVER a bare keyword ("water", "insurance") and NEVER a comma-separated TERM LIST ("Water, Claim, Damage"). A term list is the cluster's raw keywords, NOT a finding, and is an automatic FAILURE.
   - Uses the top keywords + the example posts as anchors, but states the PATTERN the discussion reveals (the problem, friction, or sentiment), not just the nouns.
   - Stays at the theme level (a recurring pattern many posts share), not one person, brand, or single post.

Return your response as a JSON object with the following format:
{"long_summary": "Your main topic summary here", "one_sentence_summary": "Your single sentence summary here", "short_summary": "A 4-8 word finding headline - what the evidence shows, never a keyword/term list"}

Provide ONLY the JSON object, without any additional explanation or formatting."""
    
    return prompt


def get_sentiment_evidence_prompt(formatted_docs: str) -> str:
    """
    Generates a prompt for extracting positive and negative evidence points from topic documents.
    
    Args:
        formatted_docs (str): Formatted document texts with post references
        
    Returns:
        str: The prompt for extracting sentiment evidence
    """
    prompt = f"""
    I have documents from a specific topic in a Reddit discussion. Please identify:
    1. The most significant POSITIVE points/evidence from these documents (what people appreciate or are excited about)
    2. The most significant NEGATIVE points/evidence from these documents (complaints, concerns, frustrations)

    For each point, include:
    - A concise description of the point
    - Which post number(s) it comes from (e.g., "1k40gcu")
    
    Here are the documents:
    
    {formatted_docs}
    
    Output format (as JSON):
    {{
        "positive": [
            {{"point": "Description of positive point 1", "post_refs": ["1k40gcu"]}},
            {{"point": "Description of positive point 2", "post_refs": ["1k20gcu"]}}
        ],
        "negative": [
            {{"point": "Description of negative point 1", "post_refs": ["1k40gcu"]}},
            {{"point": "Description of negative point 2", "post_refs": ["1k20gcu"]}}
        ]
    }}
    
    Extract as many points as possible for each category. If there are insufficient points in a category, include fewer.
    """
    return prompt


def get_image_description_prompt() -> str:
    """
    Generates a prompt for concise image description using GPT-4o vision.
    
    Returns:
        str: The prompt for generating concise image descriptions
    """
    return "Describe what you see in this image. Focus on the key elements and any visible text. Be direct and concise, starts directly with what you see, under 3 sentences."

