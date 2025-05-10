from azure.ai.inference.models import SystemMessage, UserMessage
from typing import Dict

# def get_system_prompt() -> SystemMessage:
#     return SystemMessage(
#         content="""You are an market research analyst specialized in analyzing social media discussions, 
#         Your task is to extract valuable market insights and user sentiment from Reddit conversations."""
#     )

def get_openai_generate_topic_prompt(top_words_list: list, example_sentences: list, keywords: str = None) -> str:
    """
    Generates a prompt for summarizing topics based on keywords and example sentences.
    
    Args:
        top_words_list (list): List of top words for the topic
        example_sentences (list): List of example sentences from documents
        keywords (str, optional): Search keywords that the topic is based on
        
    Returns:
        str: The prompt for generating topic summaries
    """
    # Start with the base prompt
    prompt = "You are a helpful assistant tasked with summarizing Reddit discussion topics.\n"
    
    # Add keyword context if provided
    if keywords:
        prompt += f"All information are based on searching keywords: {keywords}, summary should be based on the keywords.\n"
    
    # Add the common part of the prompt with keywords
    prompt += f"""Given the following information about a topic:
- Top keywords: {', '.join(top_words_list)}
- Example posts:
"""

    # Add example sentences, up to 10 max for reasonable prompt size
    max_examples = min(30, len(example_sentences))
    for i in range(max_examples):
        prompt += f"{i+1}. {example_sentences[i]}\n"
    
    # Continue with the rest of the prompt
    prompt += """
Please provide three summaries of this topic:
1. A long summary that:
   - Incorporates the most relevant keywords
   - States the main topic directly without mentioning Reddit users
   - Captures the main theme or discussion point
   - Uses neutral, objective language
   - Be general and not specific to the example sentences

2. A one-sentence summary that:
   - Distills the entire topic into a single clear sentence
   - Captures the essential theme concisely
   - Uses the most relevant keywords
   - Is direct and informative
   - Be general and not specific to the example sentences

3. An ultra-short summary that:
   - Captures the core concept in 4 words or less
   - Uses the most essential keywords
   - Is clear and meaningful
   - Be general and not specific to the example sentences
Return your response as a JSON object with the following format:
{"long_summary": "Your main topic summary here", "one_sentence_summary": "Your single sentence summary here", "short_summary": "Your core concept summary here"}

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

